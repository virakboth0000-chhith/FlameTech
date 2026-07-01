// musicEngine.ts
//
// Owns the ACTUAL YouTube player. This module is imported once by App.tsx and
// lives for the whole lifetime of the app — it is never inside the disposable
// per-page <iframe>, so navigating between pages no longer kills playback.
//
// The track *library* (the user's saved songs) is still just plain data in
// localStorage (key: yt_music_library), same as before — playlist.html still
// reads/writes it directly for the "add / remove song" UI. This engine only
// owns *playback state* (what's currently loaded, playing, volume, etc.) and
// reads the library by index when it needs to actually load a video.

export type Track = {
  videoId: string;
  title: string;
  channel?: string;
  thumb: string;
};

export type EngineState = {
  currentIdx: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isLoop: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  totalTracks: number;
  track: Track | null;
};

const LIBRARY_KEY = 'yt_music_library';

function readLibrary(): Track[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? (JSON.parse(raw) as Track[]) : [];
  } catch {
    return [];
  }
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    musicEngine?: MusicEngine;
  }
}

class MusicEngine {
  private player: any = null;
  private ready = false;
  private targetId = '';
  private progressTimer: number | null = null;
  private listeners = new Set<(state: EngineState) => void>();

  private state: EngineState = {
    currentIdx: -1,
    isPlaying: false,
    isShuffle: false,
    isLoop: false,
    volume: 80,
    currentTime: 0,
    duration: 0,
    totalTracks: 0,
    track: null,
  };

  init(targetId: string) {
    if (this.targetId) return; // already initialized once
    this.targetId = targetId;
    this.state.totalTracks = readLibrary().length;
    this.loadYouTubeApi();
  }

  getState(): EngineState {
    return { ...this.state };
  }

  subscribe(fn: (state: EngineState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      this.createPlayer();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      this.createPlayer();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }

  private createPlayer() {
    const YT = window.YT;
    this.player = new YT.Player(this.targetId, {
      height: '0',
      width: '0',
      playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          this.ready = true;
          try {
            this.player.setVolume(this.state.volume);
          } catch {
            /* ignore */
          }
        },
        onStateChange: (e: any) => {
          const S = YT.PlayerState;
          if (e.data === S.PLAYING) {
            this.state.isPlaying = true;
            this.startProgress();
          } else if (e.data === S.PAUSED) {
            this.state.isPlaying = false;
          } else if (e.data === S.ENDED) {
            this.onTrackEnd();
          }
          this.emit();
        },
      },
    });
  }

  private startProgress() {
    if (this.progressTimer) window.clearInterval(this.progressTimer);
    this.progressTimer = window.setInterval(() => {
      if (!this.player || !this.player.getCurrentTime) return;
      try {
        this.state.currentTime = this.player.getCurrentTime() || 0;
        this.state.duration = this.player.getDuration() || 0;
      } catch {
        /* ignore */
      }
      this.emit();
    }, 1000);
  }

  private onTrackEnd() {
    const lib = readLibrary();
    if (this.state.isLoop) {
      try {
        this.player?.playVideo();
      } catch {
        /* ignore */
      }
      return;
    }
    if (this.state.isShuffle && lib.length > 1) {
      let r: number;
      do {
        r = Math.floor(Math.random() * lib.length);
      } while (r === this.state.currentIdx);
      this.playTrack(r);
      return;
    }
    if (this.state.currentIdx < lib.length - 1) {
      this.playTrack(this.state.currentIdx + 1);
    } else {
      this.state.isPlaying = false;
      this.emit();
    }
  }

  playTrack(idx: number) {
    const lib = readLibrary();
    if (idx < 0 || idx >= lib.length) return;

    this.state.currentIdx = idx;
    this.state.totalTracks = lib.length;
    this.state.track = lib[idx];
    this.state.isPlaying = true;
    this.state.currentTime = 0;
    this.state.duration = 0;
    this.emit();

    const tryLoad = () => {
      if (!this.player || !this.ready) {
        setTimeout(tryLoad, 150);
        return;
      }
      try {
        this.player.loadVideoById(lib[idx].videoId);
        this.player.setVolume(this.state.volume);
        this.player.playVideo();
      } catch {
        /* ignore */
      }
    };
    tryLoad();
  }

  togglePlay() {
    if (this.state.currentIdx < 0) {
      const lib = readLibrary();
      if (lib.length > 0) this.playTrack(0);
      return;
    }
    if (!this.player) return;
    try {
      if (this.state.isPlaying) {
        this.player.pauseVideo();
        this.state.isPlaying = false;
      } else {
        this.player.playVideo();
        this.state.isPlaying = true;
      }
      this.emit();
    } catch {
      /* ignore */
    }
  }

  next() {
    const lib = readLibrary();
    if (this.state.currentIdx < lib.length - 1) {
      this.playTrack(this.state.currentIdx + 1);
    } else if (this.state.isShuffle && lib.length > 0) {
      this.playTrack(Math.floor(Math.random() * lib.length));
    }
  }

  prev() {
    if (this.state.currentIdx > 0) this.playTrack(this.state.currentIdx - 1);
  }

  toggleShuffle() {
    this.state.isShuffle = !this.state.isShuffle;
    this.emit();
  }

  toggleLoop() {
    this.state.isLoop = !this.state.isLoop;
    this.emit();
  }

  seekToPercent(pct: number) {
    if (!this.player) return;
    try {
      const dur = this.player.getDuration() || 0;
      this.player.seekTo((pct / 100) * dur, true);
      this.state.currentTime = (pct / 100) * dur;
      this.emit();
    } catch {
      /* ignore */
    }
  }

  setVolume(vol: number) {
    this.state.volume = vol;
    try {
      this.player?.setVolume(vol);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  /** Called after the user adds a song from the library UI. */
  syncLibrary() {
    this.state.totalTracks = readLibrary().length;
    this.emit();
  }

  /** Called after the user removes track `idx` (pre-splice index) from the library UI. */
  removeTrack(idx: number) {
    if (idx === this.state.currentIdx) {
      try {
        this.player?.stopVideo();
      } catch {
        /* ignore */
      }
      this.state.currentIdx = -1;
      this.state.isPlaying = false;
      this.state.track = null;
    } else if (idx < this.state.currentIdx) {
      this.state.currentIdx -= 1;
    }
    this.state.totalTracks = readLibrary().length;
    this.emit();
  }

  dismissNotice() {
    // no-op hook reserved for future use (e.g. mini-player "X" button telemetry)
  }
}

export const musicEngine = new MusicEngine();

// playlist.html runs inside a same-origin srcDoc <iframe> rendered by App.tsx.
// Same-origin iframes can reach straight into the parent window's globals, so
// its script just calls `window.parent.musicEngine.xxx()` directly — no
// postMessage plumbing needed, and (crucially) this object lives in the
// persistent top-level document, so it survives the iframe being swapped out
// whenever the user navigates to a different page.
if (typeof window !== 'undefined') {
  window.musicEngine = musicEngine;
}
