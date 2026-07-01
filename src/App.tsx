import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultFilename, legacyPages, type LegacyPage } from './legacyPages';
import { musicEngine } from './musicEngine';
import MiniPlayer from './MiniPlayer';


const byFilename = new Map(legacyPages.map((page) => [page.filename.toLowerCase(), page]));
const byRoute = new Map(legacyPages.map((page) => [page.route, page]));
const routeByFilename = Object.fromEntries(
  legacyPages.map((page) => [page.filename.toLowerCase(), page.route]),
) as Record<string, string>;

const defaultPage = byFilename.get(defaultFilename.toLowerCase()) ?? legacyPages[0];

type NavigationMessage = {
  source?: string;
  type?: string;
  href?: string;
};

const lightModePolish = `
<style id="flametech-light-mode-polish">
  .light-mode {
    --primary: #2563eb !important;
    --secondary: #14b8a6 !important;
    --dark: #ffffff !important;
    --darker: #f8fbff !important;
    --light: #172033 !important;
    --accent: #475569 !important;
    --bg-primary:
      radial-gradient(circle at 10% 0%, rgba(37, 99, 235, 0.1), transparent 32%),
      radial-gradient(circle at 88% 6%, rgba(20, 184, 166, 0.12), transparent 30%),
      linear-gradient(135deg, #ffffff 0%, #f3f8ff 48%, #f5fffc 100%) !important;
    --bg-secondary: rgba(255, 255, 255, 0.84) !important;
    --bg-card: rgba(255, 255, 255, 0.9) !important;
    --bg-card-hover: rgba(255, 255, 255, 0.96) !important;
    --text-primary: #172033 !important;
    --text-secondary: #5b6b7d !important;
    --text-accent: #0f766e !important;
    --border-primary: rgba(37, 99, 235, 0.16) !important;
    --border-secondary: rgba(20, 184, 166, 0.18) !important;
    --shadow-primary: rgba(15, 23, 42, 0.075) !important;
    --shadow-secondary: rgba(37, 99, 235, 0.14) !important;
  }

  body.light-mode {
    background: var(--bg-primary) !important;
    color: var(--text-primary) !important;
  }

  .light-mode body,
  .light-mode .hero::before {
    background: var(--bg-primary) !important;
  }

  .light-mode header {
    top: 0px !important;
    width: 100% !important;
    background: rgba(255, 255, 255, 0.84) !important;
    border: 1px solid rgba(255, 255, 255, 0.9) !important;
    border-bottom: 1px solid rgba(37, 99, 235, 0.12) !important;
    border-radius: 22px !important;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08) !important;
  }

  .light-mode .logo {
    color: var(--primary) !important;
    text-shadow: none !important;
  }

  .light-mode .logo i,
  .light-mode .section-title,
  .light-mode .resource-link,
  .light-mode .footer-column h3 {
    color: var(--secondary) !important;
  }

  .light-mode .nav-links a,
  .light-mode p,
  .light-mode li,
  .light-mode label,
  .light-mode .copyright {
    color: var(--text-secondary) !important;
  }

  .light-mode .nav-links a:hover,
  .light-mode .footer-column ul li a:hover {
    color: var(--primary) !important;
  }

  .light-mode .hero h1,
  .light-mode .section-title {
    text-shadow: none !important;
  }

  .light-mode .hero p {
    color: #516277 !important;
  }

  .light-mode .search-box {
    background: rgba(255, 255, 255, 0.82) !important;
    border: 1px solid rgba(37, 99, 235, 0.13) !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 8px 22px rgba(15, 23, 42, 0.045) !important;
  }

  .light-mode input,
  .light-mode textarea,
  .light-mode select {
    background: rgba(255, 255, 255, 0.9) !important;
    border-color: rgba(37, 99, 235, 0.14) !important;
    color: #172033 !important;
  }

  .light-mode input::placeholder,
  .light-mode textarea::placeholder {
    color: #94a3b8 !important;
  }

  .light-mode .ai-card,
  .light-mode .language-card,
  .light-mode .platform-card,
  .light-mode .resource-card,
  .light-mode .shortcut-card,
  .light-mode .add-shortcut-btn,
  .light-mode .contribution-info,
  .light-mode .contribution-form,
  .light-mode .faq-item,
  .light-mode .tool-card,
  .light-mode .feature-card,
  .light-mode .task-card,
  .light-mode .goal-card,
  .light-mode .settings-card,
  .light-mode .modal-content {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.9)) !important;
    border: 1px solid rgba(37, 99, 235, 0.1) !important;
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07) !important;
    color: var(--text-primary) !important;
  }

  .light-mode .ai-card:hover,
  .light-mode .language-card:hover,
  .light-mode .platform-card:hover,
  .light-mode .resource-card:hover,
  .light-mode .shortcut-card:hover,
  .light-mode .tool-card:hover,
  .light-mode .feature-card:hover {
    border-color: rgba(20, 184, 166, 0.28) !important;
    box-shadow: 0 20px 46px rgba(37, 99, 235, 0.1) !important;
  }

  .light-mode .ai-info h3,
  .light-mode .language-card h3,
  .light-mode .resource-card h3,
  .light-mode .platform-card h3,
  .light-mode .shortcut-name,
  .light-mode .faq-question,
  .light-mode .highlight {
    color: #1d4ed8 !important;
  }

  .light-mode .ai-info p,
  .light-mode .language-card p,
  .light-mode .resource-card p,
  .light-mode .platform-card p,
  .light-mode .shortcut-url,
  .light-mode .comparison-feature p {
    color: #617185 !important;
  }

  .light-mode .ai-category,
  .light-mode .category-tab {
    background: rgba(20, 184, 166, 0.09) !important;
    border-color: rgba(20, 184, 166, 0.18) !important;
    color: #0f766e !important;
  }

  .light-mode .btn,
  .light-mode .ai-link,
  .light-mode .submit-btn,
  .light-mode .compare-btn,
  .light-mode .modal-btn.btn-save {
    background: linear-gradient(135deg, #2563eb, #14b8a6) !important;
    border-color: transparent !important;
    color: #ffffff !important;
    box-shadow: 0 12px 26px rgba(37, 99, 235, 0.18) !important;
  }

  .light-mode .btn-secondary,
  .light-mode .btn-cancel {
    background: rgba(255, 255, 255, 0.78) !important;
    border-color: rgba(37, 99, 235, 0.2) !important;
    color: #1d4ed8 !important;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.055) !important;
  }

  .light-mode .theme-toggle {
    background: linear-gradient(135deg, #ffffff, #edf7ff) !important;
    border: 1px solid rgba(37, 99, 235, 0.14) !important;
    color: #2563eb !important;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1) !important;
  }

  .light-mode footer {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), #eef7ff) !important;
    border-top: 1px solid rgba(37, 99, 235, 0.12) !important;
  }

  .light-mode .social-links a {
    background: #ffffff !important;
    color: #1d4ed8 !important;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06) !important;
  }

  .light-mode .social-links a:hover {
    background: var(--primary) !important;
    color: #ffffff !important;
  }

  @media (max-width: 768px) {
    .light-mode header {
      top: 8px !important;
      width: calc(100% - 16px) !important;
      margin: 0 8px !important;
      border-radius: 18px !important;
    }

    .light-mode .nav-links.active {
      background: rgba(255, 255, 255, 0.96) !important;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12) !important;
    }
  }
</style>
<link rel="stylesheet" href="/flametech-dark-mode.css" />
<link rel="stylesheet" href="/flametech-light-mode.css" />`;


function resolvePage(pathname: string): LegacyPage {
  const decodedPath = decodeURIComponent(pathname);
  if (decodedPath === '/' || decodedPath === '') {
    return defaultPage;
  }

  const routeMatch = byRoute.get(decodedPath);
  if (routeMatch) {
    return routeMatch;
  }

  const filename = decodedPath.replace(/^\/+/, '').toLowerCase();
  return byFilename.get(filename) ?? defaultPage;
}

function toAppHref(rawHref: string): string | null {
  if (!rawHref || rawHref.startsWith('#')) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawHref, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) {
    return null;
  }

  const filename = decodeURIComponent(url.pathname.split('/').pop() ?? '').toLowerCase();
  const route = routeByFilename[filename];
  if (!route) {
    return null;
  }

  return `${route}${url.hash}`;
}

function buildSrcDoc(page: LegacyPage, hash: string): string {
  const routeMap = JSON.stringify(routeByFilename);
  const currentHash = JSON.stringify(hash);
  const bridge = `
<script>
(function () {
  var routeMap = ${routeMap};
  function toAppHref(rawHref) {
    if (!rawHref || rawHref.charAt(0) === '#') return null;
    var url;
    try { url = new URL(rawHref, window.location.origin); } catch (error) { return null; }
    if (url.origin !== window.location.origin) return null;
    var parts = url.pathname.split('/');
    var filename = decodeURIComponent(parts[parts.length - 1] || '').toLowerCase();
    var route = routeMap[filename];
    return route ? route + url.hash : null;
  }
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    var target = anchor.getAttribute('target');
    if (target && target !== '_self') return;
    var nextHref = toAppHref(anchor.getAttribute('href'));
    if (!nextHref) return;
    event.preventDefault();
    parent.postMessage({ source: 'flametech-react', type: 'navigate', href: nextHref }, window.location.origin);
  });
  var hash = ${currentHash};
  if (hash) {
    requestAnimationFrame(function () {
      var node = document.getElementById(hash.slice(1));
      if (node && node.scrollIntoView) node.scrollIntoView();
    });
  }
}());
</script>`;

  const withBase = page.html.replace(/<head(.*?)>/i, '<head$1><base href="/">');
  const withLightModePolish = withBase.includes('</head>')
    ? withBase.replace('</head>', `${lightModePolish}</head>`)
    : `${lightModePolish}${withBase}`;

  return withLightModePolish.includes('</body>')
    ? withLightModePolish.replace('</body>', `${bridge}</body>`)
    : `${withLightModePolish}${bridge}`;
}

export default function App() {
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.hash}`);
  const [isLightShell, setIsLightShell] = useState(
    () => (localStorage.getItem('flametech-theme') || 'light') === 'light',
  );

  // Shared by popstate, the iframe-click bridge, and the mini-player's
  // "open playlist" button — moves the SPA to a new route without ever
  // doing a real top-level page load (which would kill the music engine).
  const navigate = useCallback((nextHref: string) => {
    if (`${window.location.pathname}${window.location.hash}` !== nextHref) {
      window.history.pushState(null, '', nextHref);
    }
    setLocationKey(`${window.location.pathname}${window.location.hash}`);
  }, []);

  useEffect(() => {
    // The actual YouTube player lives here, in the persistent shell — never
    // inside the disposable per-page iframe — so it survives navigation.
    musicEngine.init('ft-player-engine-host');
  }, []);

  useEffect(() => {
    const handlePopState = () => setLocationKey(`${window.location.pathname}${window.location.hash}`);
    const handleMessage = (event: MessageEvent<NavigationMessage>) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.source !== 'flametech-react' || event.data.type !== 'navigate' || !event.data.href) {
        return;
      }
      navigate(event.data.href);
    };
    // Legacy pages set/read 'flametech-theme' on their own document's
    // localStorage. The 'storage' event fires on *other* same-origin
    // documents when that happens, so the persistent shell (and the
    // mini-player riding on top of it) can pick up the theme too.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'flametech-theme') {
        setIsLightShell((event.newValue || 'light') === 'light');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [navigate]);

  const currentPage = resolvePage(window.location.pathname);
  const srcDoc = useMemo(() => buildSrcDoc(currentPage, window.location.hash), [currentPage, locationKey]);

  if (!currentPage) {
    return (
      <main className="missing-page">
        <div>
          <h1>Page not found</h1>
          <p>FlameTech could not find that page.</p>
        </div>
      </main>
    );
  }

  return (
    <div className={`app-root${isLightShell ? ' light-mode-shell' : ''}`}>
      <main className="app-shell">
        <iframe key={locationKey} className="legacy-frame" srcDoc={srcDoc} title={currentPage.title} />
      </main>
      {/* Hidden host for the actual YouTube player — kept outside the iframe
          on purpose, so it's never destroyed when the iframe is swapped. */}
      <div id="ft-player-engine-host" style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden' }} />
      <MiniPlayer onOpenPlaylist={() => navigate('/playlist')} />
    </div>
  );
}
