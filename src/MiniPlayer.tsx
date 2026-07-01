// MiniPlayer.tsx
//
// Visually similar to the old miniplayer.js card, but rendered by React as a
// sibling of the legacy-page <iframe> — so it survives navigation instead of
// being destroyed and recreated with every page.
//
// Three view states, all driven by plain React state (so they persist across
// SPA navigation automatically, since this component is never remounted):
//   'expanded' - full now-playing card with controls
//   'mini'     - small square w/ sound-wave animation (tap close once)
//   'hidden'   - fully gone (tap close on the mini square)
// A new track always promotes back to 'expanded', no matter which state it
// was in before — so you never miss what just started playing.

import { useEffect, useRef, useState } from 'react';
import type { EngineState } from './musicEngine';
import { musicEngine } from './musicEngine';

function fmtTime(s: number): string {
  const sec = Math.floor(s || 0);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

type Props = {
  onOpenPlaylist: () => void;
};

type ViewMode = 'expanded' | 'mini' | 'hidden';

export default function MiniPlayer({ onOpenPlaylist }: Props) {
  const [state, setState] = useState<EngineState>(() => musicEngine.getState());
  const [view, setView] = useState<ViewMode>('expanded');
  const lastTitleRef = useRef('');
  const miniTapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (miniTapTimerRef.current) window.clearTimeout(miniTapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = musicEngine.subscribe((next) => {
      const title = next.track?.title ?? '';
      if (title && title !== lastTitleRef.current) {
        lastTitleRef.current = title;
        setView('expanded'); // a new song always re-announces itself
      }
      setState(next);
    });
    return unsubscribe;
  }, []);

  const hasTrack = !!state.track;
  if (!hasTrack) return null;

  const pct = state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;

  // First tap on the mini square re-expands the full card. A second tap
  // within 300ms instead jumps straight to the playlist page. Timing-based
  // rather than relying on the browser's dblclick, which touch screens
  // don't always fire consistently.
  function handleMiniTap() {
    if (miniTapTimerRef.current) {
      window.clearTimeout(miniTapTimerRef.current);
      miniTapTimerRef.current = null;
      onOpenPlaylist();
    } else {
      miniTapTimerRef.current = window.setTimeout(() => {
        miniTapTimerRef.current = null;
        setView('expanded');
      }, 300);
    }
  }

  return (
    <>
      {/* ── Full card ── */}
      <div
        className={`ft-miniplayer${view === 'expanded' ? ' ft-mp-visible' : ''}${state.isPlaying ? ' ft-playing' : ''}`}
        style={{ '--ft-progress': `${pct.toFixed(1)}%` } as React.CSSProperties}
      >
        <button type="button" className="ft-mp-open" title="Open Playlist" onClick={onOpenPlaylist}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
        <button type="button" className="ft-mp-close" title="Minimize" onClick={() => setView('mini')}>
          ✕
        </button>

        <div className="ft-mp-top">
          <div className="ft-mp-thumb-wrap">
            <img className="ft-mp-thumb" src={state.track?.thumb ?? ''} alt="" />
            <div className="ft-mp-vinyl" />
          </div>
          <div className="ft-mp-info">
            <div className="ft-mp-title">{state.track?.title || '—'}</div>
            <div className="ft-mp-channel">{state.track?.channel || 'YouTube'}</div>
            <div className="ft-mp-badges">
              <span className={`ft-mp-badge ${state.isPlaying ? 'ft-mp-badge-playing' : 'ft-mp-badge-paused'}`}>
                {state.isPlaying ? '▶ Playing' : '⏸ Paused'}
              </span>
              <span className="ft-mp-badge ft-mp-badge-yt">YouTube</span>
            </div>
          </div>
          <div className="ft-mp-eq">
            <span style={{ height: 4 }} />
            <span style={{ height: 10 }} />
            <span style={{ height: 6 }} />
            <span style={{ height: 12 }} />
            <span style={{ height: 8 }} />
          </div>
        </div>

        <div className="ft-mp-seek-row">
          <span className="ft-mp-time">{fmtTime(state.currentTime)}</span>
          <input
            className="ft-mp-seek"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={pct}
            onChange={(e) => musicEngine.seekToPercent(parseFloat(e.target.value))}
          />
          <span className="ft-mp-time" style={{ textAlign: 'right' }}>
            {fmtTime(state.duration)}
          </span>
        </div>

        <div className="ft-mp-controls">
          <button
            type="button"
            className={`ft-mp-btn${state.isShuffle ? ' ft-mp-active' : ''}`}
            title="Shuffle"
            onClick={() => musicEngine.toggleShuffle()}
          >
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>
          <button type="button" className="ft-mp-btn" title="Previous" onClick={() => musicEngine.prev()}>
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button type="button" className="ft-mp-btn ft-mp-play" title="Play/Pause" onClick={() => musicEngine.togglePlay()}>
            {state.isPlaying ? (
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button type="button" className="ft-mp-btn" title="Next" onClick={() => musicEngine.next()}>
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 4V8l-5.5 4zM16 6h2v12h-2z" /></svg>
          </button>
          <button
            type="button"
            className={`ft-mp-btn${state.isLoop ? ' ft-mp-active' : ''}`}
            title="Loop"
            onClick={() => musicEngine.toggleLoop()}
          >
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>

        <div className="ft-mp-vol-row">
          <span className="ft-mp-vol-icon">🔈</span>
          <input
            className="ft-mp-vol"
            type="range"
            min={0}
            max={100}
            value={state.volume}
            onChange={(e) => musicEngine.setVolume(parseInt(e.target.value, 10))}
          />
          <span className="ft-mp-vol-icon">🔊</span>
        </div>
      </div>

      {/* ── Minimized square (tap → expand, tap again fast → open playlist, ✕ → fully close) ── */}
      <div
        className={`ft-mp-mini${view === 'mini' ? ' ft-mp-mini-visible' : ''}${state.isPlaying ? ' ft-playing' : ''}`}
        role="button"
        tabIndex={view === 'mini' ? 0 : -1}
        title={state.track?.title || 'Now playing'}
        onClick={handleMiniTap}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView('expanded'); }}
      >
        <img className="ft-mp-mini-thumb" src={state.track?.thumb ?? ''} alt="" />
        <span className="ft-mp-mini-eq">
          <span />
          <span />
          <span />
        </span>
        <button
          type="button"
          className="ft-mp-mini-close"
          title="Close"
          aria-label="Close mini player"
          onClick={(e) => {
            e.stopPropagation();
            setView('hidden');
          }}
        >
          ✕
        </button>
      </div>
    </>
  );
}
