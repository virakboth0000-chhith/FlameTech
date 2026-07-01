/**
 * FlameTech Global Mini-Player
 * Reads music state from localStorage (key: ft_miniplayer)
 * and renders a floating Spotify-style card on every page EXCEPT playlist.html.
 */
(function () {
  'use strict';

  const STATE_KEY   = 'ft_miniplayer';
  const HIDDEN_KEY  = 'ft_miniplayer_hidden'; // user manually collapsed it

  /* ── Don't mount on the playlist page itself ── */
  if (location.pathname.endsWith('playlist.html')) return;

  /* ── Inject CSS once ── */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Mini-player card ── */
    #ft-miniplayer {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      z-index: 9999;
      width: min(420px, calc(100vw - 32px));
      background: rgba(10, 8, 20, 0.82);
      backdrop-filter: blur(22px) saturate(1.6);
      -webkit-backdrop-filter: blur(22px) saturate(1.6);
      border: 1px solid rgba(255, 42, 109, 0.25);
      border-radius: 20px;
      box-shadow:
        0 8px 32px rgba(0,0,0,0.6),
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 0 60px rgba(255, 42, 109, 0.08);
      padding: 14px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.35s ease;
      opacity: 0;
      pointer-events: none;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #ft-miniplayer.ft-mp-visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* Progress glow bar behind the card */
    #ft-miniplayer::before {
      content: '';
      position: absolute;
      bottom: 0; left: 0;
      height: 3px;
      width: var(--ft-progress, 0%);
      background: linear-gradient(90deg, #ff2a6d, #05d9e8);
      border-radius: 0 0 20px 20px;
      transition: width 0.5s linear;
    }

    /* ── Top row: thumb + info + close ── */
    .ft-mp-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ft-mp-thumb-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .ft-mp-thumb {
      width: 52px;
      height: 52px;
      border-radius: 10px;
      object-fit: cover;
      background: #1a1a2e;
      display: block;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .ft-mp-vinyl {
      position: absolute;
      inset: 0;
      border-radius: 10px;
      background: conic-gradient(
        from 0deg,
        rgba(255,42,109,0.3) 0%,
        transparent 30%,
        rgba(5,217,232,0.3) 60%,
        transparent 90%
      );
      animation: ft-spin 4s linear infinite;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #ft-miniplayer.ft-playing .ft-mp-vinyl { opacity: 1; }
    @keyframes ft-spin { to { transform: rotate(360deg); } }

    .ft-mp-info {
      flex: 1;
      min-width: 0;
    }
    .ft-mp-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }
    .ft-mp-channel {
      font-size: 11.5px;
      color: #a0aec0;
    }

    /* Badges row */
    .ft-mp-badges {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 4px;
    }
    .ft-mp-badge {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 20px;
    }
    .ft-mp-badge-playing {
      background: rgba(29, 185, 84, 0.18);
      color: #1DB954;
      border: 1px solid rgba(29,185,84,0.4);
    }
    .ft-mp-badge-paused {
      background: rgba(255,42,109,0.12);
      color: #ff6b9d;
      border: 1px solid rgba(255,42,109,0.3);
    }
    .ft-mp-badge-yt {
      background: rgba(5,217,232,0.1);
      color: #05d9e8;
      border: 1px solid rgba(5,217,232,0.25);
    }

    .ft-mp-close {
      background: rgba(255,255,255,0.06);
      border: none;
      color: #718096;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .ft-mp-close:hover { background: rgba(255,42,109,0.2); color: #ff2a6d; }

    /* ── Seek bar ── */
    .ft-mp-seek-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ft-mp-time {
      font-size: 10px;
      color: #718096;
      min-width: 30px;
      font-variant-numeric: tabular-nums;
    }
    .ft-mp-seek {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.12);
      outline: none;
      cursor: pointer;
      position: relative;
    }
    .ft-mp-seek::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #ff2a6d;
      box-shadow: 0 0 6px rgba(255,42,109,0.7);
      cursor: pointer;
    }
    .ft-mp-seek::-moz-range-thumb {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #ff2a6d;
      border: none;
      cursor: pointer;
    }

    /* ── Controls row ── */
    .ft-mp-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .ft-mp-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #a0aec0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 7px;
      border-radius: 50%;
      transition: color 0.15s, background 0.15s, transform 0.1s;
      font-size: 16px;
    }
    .ft-mp-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.08);
      transform: scale(1.1);
    }
    .ft-mp-btn.ft-mp-play {
      background: linear-gradient(135deg, #ff2a6d, #c4005a);
      color: #fff;
      font-size: 22px;
      padding: 10px;
      box-shadow: 0 4px 16px rgba(255,42,109,0.5);
    }
    .ft-mp-btn.ft-mp-play:hover {
      background: linear-gradient(135deg, #ff4d85, #e5006a);
      transform: scale(1.12);
    }
    .ft-mp-btn.ft-mp-active { color: #05d9e8; }

    /* Open playlist link */
    .ft-mp-open {
      position: absolute;
      top: 14px;
      right: 46px;
      background: rgba(255,255,255,0.05);
      border: none;
      color: #718096;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: background 0.15s, color 0.15s;
      text-decoration: none;
    }
    .ft-mp-open:hover { background: rgba(5,217,232,0.15); color: #05d9e8; }

    /* Equaliser animation */
    .ft-mp-eq {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 14px;
      flex-shrink: 0;
    }
    .ft-mp-eq span {
      width: 3px;
      border-radius: 2px;
      background: #1DB954;
      transform-origin: bottom;
    }
    .ft-mp-eq span:nth-child(1) { animation: ft-eq1 0.8s ease-in-out infinite; }
    .ft-mp-eq span:nth-child(2) { animation: ft-eq2 0.8s ease-in-out infinite 0.15s; }
    .ft-mp-eq span:nth-child(3) { animation: ft-eq3 0.8s ease-in-out infinite 0.3s; }
    .ft-mp-eq span:nth-child(4) { animation: ft-eq4 0.8s ease-in-out infinite 0.1s; }
    @keyframes ft-eq1 { 0%,100%{height:4px} 50%{height:12px} }
    @keyframes ft-eq2 { 0%,100%{height:10px} 50%{height:4px} }
    @keyframes ft-eq3 { 0%,100%{height:6px} 50%{height:14px} }
    @keyframes ft-eq4 { 0%,100%{height:12px} 50%{height:6px} }
    #ft-miniplayer:not(.ft-playing) .ft-mp-eq span { animation-play-state: paused; }

    /* Volume mini */
    .ft-mp-vol-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px;
    }
    .ft-mp-vol-icon { color: #718096; font-size: 11px; }
    .ft-mp-vol {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 3px;
      border-radius: 2px;
      background: rgba(255,255,255,0.1);
      outline: none;
      cursor: pointer;
    }
    .ft-mp-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #05d9e8;
      cursor: pointer;
    }

    /* Light mode overrides */
    .light-mode #ft-miniplayer {
      background: rgba(255,255,255,0.88);
      border-color: rgba(255,42,109,0.18);
      box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,42,109,0.08) inset;
    }
    .light-mode .ft-mp-title { color: #1a1a2e; }
    .light-mode .ft-mp-channel { color: #64748b; }
    .light-mode .ft-mp-time { color: #94a3b8; }
    .light-mode .ft-mp-seek { background: rgba(0,0,0,0.1); }
    .light-mode .ft-mp-btn { color: #64748b; }
    .light-mode .ft-mp-btn:hover { color: #1a1a2e; background: rgba(0,0,0,0.06); }
    .light-mode .ft-mp-close { color: #94a3b8; }
    .light-mode .ft-mp-open  { color: #94a3b8; }
    .light-mode .ft-mp-vol { background: rgba(0,0,0,0.1); }
  `;
  document.head.appendChild(style);

  /* ── Build HTML ── */
  const mp = document.createElement('div');
  mp.id = 'ft-miniplayer';
  mp.innerHTML = `
    <a class="ft-mp-open" href="playlist.html" title="Open Playlist">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
    <button class="ft-mp-close" id="ft-mp-close" title="Dismiss">✕</button>

    <div class="ft-mp-top">
      <div class="ft-mp-thumb-wrap">
        <img class="ft-mp-thumb" id="ft-mp-thumb" src="" alt="">
        <div class="ft-mp-vinyl"></div>
      </div>
      <div class="ft-mp-info">
        <div class="ft-mp-title" id="ft-mp-title">—</div>
        <div class="ft-mp-channel" id="ft-mp-channel">YouTube</div>
        <div class="ft-mp-badges">
          <span class="ft-mp-badge ft-mp-badge-playing" id="ft-mp-status-badge">▶ Playing</span>
          <span class="ft-mp-badge ft-mp-badge-yt">YouTube</span>
        </div>
      </div>
      <div class="ft-mp-eq" id="ft-mp-eq">
        <span style="height:4px"></span>
        <span style="height:10px"></span>
        <span style="height:6px"></span>
        <span style="height:12px"></span>
        <span style="height:8px"></span>
        
      </div>
    </div>

    <div class="ft-mp-seek-row">
      <span class="ft-mp-time" id="ft-mp-cur">0:00</span>
      <input class="ft-mp-seek" type="range" id="ft-mp-seek" min="0" max="100" step="0.1" value="0">
      <span class="ft-mp-time" id="ft-mp-dur" style="text-align:right">0:00</span>
    </div>

    <div class="ft-mp-controls">
      <button class="ft-mp-btn" id="ft-mp-shuffle" title="Shuffle">
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
        </svg>
      </button>
      <button class="ft-mp-btn" id="ft-mp-prev" title="Previous">
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
      </button>
      <button class="ft-mp-btn ft-mp-play" id="ft-mp-play" title="Play/Pause">
        <svg id="ft-mp-play-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <button class="ft-mp-btn" id="ft-mp-next" title="Next">
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 4V8l-5.5 4zM16 6h2v12h-2z"/></svg>
      </button>
      <button class="ft-mp-btn" id="ft-mp-loop" title="Loop">
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      </button>
    </div>

    <div class="ft-mp-vol-row">
      <span class="ft-mp-vol-icon">🔈</span>
      <input class="ft-mp-vol" type="range" id="ft-mp-vol" min="0" max="100" value="80">
      <span class="ft-mp-vol-icon">🔊</span>
    </div>
  `;

  /* ── State ── */
  let visible = false;
  let dismissed = false;
  let state = null;       // last known ft_miniplayer state
  let tickInterval = null;
  let localProgress = 0;  // seconds, estimated locally
  let localDuration  = 0;

  // playlist.html only exists (and only actually plays audio) while that tab/page
  // is open. It rebroadcasts its state at least every 1.5s while alive. If we stop
  // hearing from it, the song has actually stopped (page closed/navigated away) —
  // so we must not keep showing "Playing" from old leftover localStorage data.
  const STALE_MS = 4000;
  function isFresh(s) {
    return !!s && typeof s.ts === 'number' && (Date.now() - s.ts) < STALE_MS;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch(_) { return null; }
  }
  function writeCmd(cmd) {
    // Write a command object; playlist.html polls this
    localStorage.setItem('ft_mp_cmd', JSON.stringify({ cmd, ts: Date.now() }));
  }

  /* ── Show / Hide ── */
  function show() {
    if (visible) return;
    visible = true;
    mp.classList.add('ft-mp-visible');
  }
  function hide() {
    if (!visible) return;
    visible = false;
    mp.classList.remove('ft-mp-visible');
  }

  /* ── Update UI from state object ── */
  function applyState(s) {
    if (!s) return;
    state = s;

    mp.querySelector('#ft-mp-title').textContent   = s.title   || '—';
    mp.querySelector('#ft-mp-channel').textContent = s.channel || 'YouTube';
    mp.querySelector('#ft-mp-thumb').src           = s.thumb   || '';

    localDuration = s.duration || 0;
    localProgress = s.currentTime || 0;
    updateProgress();

    // Volume
    mp.querySelector('#ft-mp-vol').value = s.volume ?? 80;

    // Play/pause icon
    const icon = mp.querySelector('#ft-mp-play-icon');
    const badge = mp.querySelector('#ft-mp-status-badge');
    if (s.isPlaying) {
      icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      mp.classList.add('ft-playing');
      badge.textContent = '▶ Playing';
      badge.className = 'ft-mp-badge ft-mp-badge-playing';
    } else {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      mp.classList.remove('ft-playing');
      badge.textContent = '⏸ Paused';
      badge.className = 'ft-mp-badge ft-mp-badge-paused';
    }

    // Active toggles
    mp.querySelector('#ft-mp-shuffle').classList.toggle('ft-mp-active', !!s.isShuffle);
    mp.querySelector('#ft-mp-loop').classList.toggle('ft-mp-active',    !!s.isLoop);

    // Show if there's an active track and user hasn't dismissed
    if (s.title && !dismissed) show();
  }

  function fmtTime(s) {
    s = Math.floor(s || 0);
    return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }

  function updateProgress() {
    const pct = localDuration > 0 ? Math.min(100,(localProgress/localDuration)*100) : 0;
    mp.querySelector('#ft-mp-seek').value = pct;
    mp.querySelector('#ft-mp-cur').textContent = fmtTime(localProgress);
    mp.querySelector('#ft-mp-dur').textContent = fmtTime(localDuration);
    mp.style.setProperty('--ft-progress', pct.toFixed(1) + '%');
  }

  /* Re-sync from localStorage every tick, while playlist.html is actually alive */
  function startTick() {
    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      const s = readState();
      if (s && isFresh(s)) {
        localDuration = s.duration || 0;
        localProgress = s.currentTime || 0;
        applyState(s);
      } else {
        // No live broadcast from playlist.html (tab closed/navigated away or
        // never opened) — nothing is actually playing right now, regardless
        // of whatever stale data is still sitting in localStorage.
        if (visible) hide();
      }
    }, 1000);
  }

  /* ── Controls → send commands to playlist.html via localStorage ── */
  mp.querySelector('#ft-mp-play').addEventListener('click', () => {
    writeCmd(state?.isPlaying ? 'pause' : 'play');
  });
  mp.querySelector('#ft-mp-prev').addEventListener('click', () => writeCmd('prev'));
  mp.querySelector('#ft-mp-next').addEventListener('click', () => writeCmd('next'));
  mp.querySelector('#ft-mp-shuffle').addEventListener('click', () => writeCmd('toggleShuffle'));
  mp.querySelector('#ft-mp-loop').addEventListener('click', () => writeCmd('toggleLoop'));
  mp.querySelector('#ft-mp-seek').addEventListener('input', e => {
    writeCmd({ seek: parseFloat(e.target.value) });
    localProgress = (parseFloat(e.target.value) / 100) * localDuration;
    updateProgress();
  });
  mp.querySelector('#ft-mp-vol').addEventListener('input', e => {
    writeCmd({ volume: parseInt(e.target.value) });
  });
  mp.querySelector('#ft-mp-close').addEventListener('click', () => {
    dismissed = true;
    hide();
  });

  /* Re-show when a new song starts even after dismiss */
  let lastTitle = '';

  /* ── Poll localStorage for state changes ── */
  function poll() {
    const s = readState();
    if (!s || !isFresh(s)) {
      if (visible) hide();
      return;
    }
    if (s.title && s.title !== lastTitle) {
      dismissed = false; // new song → re-show
      lastTitle = s.title;
    }
    applyState(s);
  }

  /* ── Mount & start ── */
  function mount() {
    document.body.appendChild(mp);
    startTick();
    poll(); // immediate
    // Also react to storage events from other tabs
    window.addEventListener('storage', e => {
      if (e.key === STATE_KEY) poll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

})();
