const Bridge = window.Android || null;
const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ── Uhr ─────────────────────────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = time;
  document.getElementById('art-clock').textContent = time;
  document.getElementById('art-date').textContent = `${DAYS[now.getDay()]}, ${now.getDate()}. ${MONTHS[now.getMonth()]}`;
}
tickClock();
setInterval(tickClock, 5000);

// ── Hintergrund ─────────────────────────────────────────────────────────
const wp = { index: Number(localStorage.getItem('wpIndex')) || 0, front: 'wp-a' };

function wallpaperUrl(id) {
  const w = Math.min(3840, Math.round(window.innerWidth * (window.devicePixelRatio || 1) / 320) * 320 || 1920);
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=82&fit=crop&auto=format`;
}

function showWallpaper(index) {
  const list = CONFIG.wallpapers;
  wp.index = (index + list.length) % list.length;
  localStorage.setItem('wpIndex', wp.index);
  const url = wallpaperUrl(list[wp.index]);
  const img = new Image();
  img.onload = () => {
    const back = wp.front === 'wp-a' ? 'wp-b' : 'wp-a';
    const backEl = document.getElementById(back);
    backEl.style.backgroundImage = `url("${url}")`;
    backEl.classList.add('active');
    document.getElementById(wp.front).classList.remove('active');
    wp.front = back;
    new Image().src = wallpaperUrl(list[(wp.index + 1) % list.length]);
  };
  img.src = url;
}
showWallpaper(wp.index);

// ── Navigationston ──────────────────────────────────────────────────────
let audioCtx = null;
function tick(freq = 1650) {
  if (!CONFIG.sounds) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.045);
  } catch (_) {}
}

// ── Fokus und Fernbedienung ─────────────────────────────────────────────
let focused = null;
const lastInGroup = {};

function scope() {
  if (document.body.classList.contains('apps-open')) return document.getElementById('overlay-apps');
  if (document.body.classList.contains('web-open')) return document.getElementById('overlay-web');
  if (document.body.classList.contains('sheet-open')) return document.getElementById('sheet-smarthome');
  return document.getElementById('home');
}

function groupOf(el) {
  return el.closest('.dock, .actions, .all-apps, .sheet, .glyphs') || document.body;
}

function setFocus(el, silent) {
  if (!el || el === focused) return;
  if (focused) focused.classList.remove('focused');
  focused = el;
  el.classList.add('focused');
  lastInGroup[groupOf(el).className] = el;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  if (!silent) tick();
}

function move(dir) {
  const items = [...scope().querySelectorAll('[data-nav]')];
  if (!focused || !items.includes(focused)) { setFocus(items[0]); return; }

  const r = focused.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const horizontal = dir === 'left' || dir === 'right';
  const ownGroup = groupOf(focused);
  let best = null, bestScore = Infinity;

  for (const el of items) {
    if (el === focused) continue;
    // Links/Rechts bleibt in der eigenen Reihe (Dock, Symbolleiste)
    if (horizontal && ownGroup !== document.body && groupOf(el) !== ownGroup) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
    const along = { left: -dx, right: dx, up: -dy, down: dy }[dir];
    const across = horizontal ? Math.abs(dy) : Math.abs(dx);
    if (along <= 1) continue;
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (!best) return;

  const target = groupOf(best) !== groupOf(focused) ? lastInGroup[groupOf(best).className] || best : best;
  setFocus(items.includes(target) ? target : best);
}

function resetFocus() {
  focused && focused.classList.remove('focused');
  focused = null;
  const sc = scope();
  const remembered = lastInGroup[sc.id === 'home' ? 'dock' : ''];
  setFocus(remembered && sc.contains(remembered) ? remembered : sc.querySelector('[data-nav]'), true);
}

function closeLayers() {
  const layers = ['apps-open', 'sheet-open', 'web-open'];
  const open = layers.some(c => document.body.classList.contains(c));
  document.body.classList.remove(...layers);
  if (open) resetFocus();
  return open;
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

window.addEventListener('keydown', e => {
  if (handleArtKey(e)) return;

  // Beim Tippen in ein Textfeld: Tasten gehören dem Feld, OK/Zurück/Hoch/Runter verlassen es
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      document.activeElement.blur();
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); return; }
    } else {
      return;
    }
  }
  if (e.key === 'Enter' && focused && focused.classList.contains('field')) {
    e.preventDefault();
    focused.querySelector('input').focus();
    return;
  }

  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && focused && 'dimmable' in focused.dataset) {
    e.preventDefault();
    adjustBrightness(focused, e.key === 'ArrowRight' ? 10 : -10);
    tick(e.key === 'ArrowRight' ? 1900 : 1400);
    return;
  }
  if (KEYS[e.key]) { e.preventDefault(); move(KEYS[e.key]); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (focused) { tick(1150); focused.click(); } }
  else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') { e.preventDefault(); closeLayers(); }
});

document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-nav]');
  if (el && scope().contains(el)) setFocus(el, true);
});

// ── Dock ────────────────────────────────────────────────────────────────
function launchApp(pkg) {
  if (Bridge) Bridge.launchApp(pkg);
  else console.log('Starte', pkg);
}

function openUrl(url) {
  if (Bridge && Bridge.openUrl) Bridge.openUrl(url);
  else window.open(url, '_blank');
}

function dockCard(icon, name, onClick) {
  const card = document.createElement('button');
  card.className = 'card';
  card.dataset.nav = '';
  card.innerHTML = `<span class="logo" style="--icon:url('icons/${icon}.svg')"></span><span class="card-name"></span>`;
  card.querySelector('.card-name').textContent = name;
  card.addEventListener('click', onClick);
  return card;
}

function renderDock() {
  const dock = document.getElementById('dock');
  dock.innerHTML = '';
  (window.dockApps || []).forEach(app => dock.appendChild(dockCard(app.icon, app.name, () => launchApp(app.package))));
  loadWebShortcuts().forEach(site => dock.appendChild(dockCard(site.glyph, site.name, () => openUrl(site.url))));
  dock.appendChild(dockCard('glyph-plus', 'Webseite', openWebManager));
}

fetch('apps.json')
  .then(r => r.json())
  .then(apps => {
    window.dockApps = apps;
    renderDock();
    setFocus(document.getElementById('dock').firstElementChild, true);
  });

// ── Eigene Webseiten (im Fire TV gespeichert) ───────────────────────────
const GLYPHS = ['glyph-play', 'glyph-tv', 'glyph-film', 'glyph-music', 'glyph-news', 'glyph-star', 'browser'];
let chosenGlyph = GLYPHS[0];

function loadWebShortcuts() {
  try { return JSON.parse(localStorage.getItem('webShortcuts')) || []; } catch (_) { return []; }
}

function saveWebShortcuts(list) {
  localStorage.setItem('webShortcuts', JSON.stringify(list));
  renderDock();
  renderWebList();
}

function normalizeUrl(raw) {
  let text = raw.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  try {
    const u = new URL(text);
    return u.hostname.includes('.') ? u.href : null;
  } catch (_) { return null; }
}

function renderGlyphs() {
  const box = document.getElementById('web-glyphs');
  box.innerHTML = '';
  GLYPHS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'glyph' + (g === chosenGlyph ? ' selected' : '');
    btn.dataset.nav = '';
    btn.innerHTML = `<span class="logo" style="--icon:url('icons/${g}.svg')"></span>`;
    btn.addEventListener('click', () => {
      chosenGlyph = g;
      box.querySelectorAll('.glyph').forEach(b => b.classList.toggle('selected', b === btn));
    });
    box.appendChild(btn);
  });
}

function renderWebList() {
  const list = document.getElementById('web-list');
  const sites = loadWebShortcuts();
  list.innerHTML = sites.length ? '' : '<div class="web-empty">Noch keine Webseiten gespeichert.</div>';
  sites.forEach((site, i) => {
    const row = document.createElement('div');
    row.className = 'web-item';
    row.innerHTML = `
      <span class="logo" style="--icon:url('icons/${site.glyph}.svg')"></span>
      <div class="web-item-text"><div class="web-item-name"></div><div class="web-item-url"></div></div>
      <button class="remove-btn" data-nav>Entfernen</button>`;
    row.querySelector('.web-item-name').textContent = site.name;
    row.querySelector('.web-item-url').textContent = site.url.replace(/^https?:\/\//, '');
    row.querySelector('.remove-btn').addEventListener('click', () => {
      const next = loadWebShortcuts();
      next.splice(i, 1);
      saveWebShortcuts(next);
      resetFocus();
    });
    list.appendChild(row);
  });
}

function showWebError(text) {
  document.getElementById('web-error').textContent = text;
}

function addWebShortcut() {
  const nameEl = document.getElementById('web-name');
  const urlEl = document.getElementById('web-url');
  const url = normalizeUrl(urlEl.value);
  if (!urlEl.value.trim()) return showWebError('Gib eine Adresse ein.');
  if (!url) return showWebError('Das ist keine gültige Adresse, z.B. news.orf.at');
  const name = nameEl.value.trim() || new URL(url).hostname.replace(/^www\./, '');
  saveWebShortcuts([...loadWebShortcuts(), { name, url, glyph: chosenGlyph }]);
  nameEl.value = '';
  urlEl.value = '';
  showWebError('');
  closeLayers();
  const cards = document.querySelectorAll('#dock .card');
  setFocus(cards[cards.length - 2], true);
}

function openWebManager() {
  renderGlyphs();
  renderWebList();
  showWebError('');
  document.body.classList.add('web-open');
  resetFocus();
}

document.getElementById('web-save').addEventListener('click', addWebShortcut);
['web-name', 'web-url'].forEach(id => document.getElementById(id).addEventListener('input', () => showWebError('')));

// ── Aktionen oben rechts ────────────────────────────────────────────────
const ACTIONS = {
  smarthome() { document.body.classList.add('sheet-open'); resetFocus(); },
  network() { Bridge ? Bridge.openNetworkSettings() : console.log('Netzwerk-Einstellungen'); },
  art() { startArt(); },
  apps() { openAllApps(); },
  settings() { Bridge ? Bridge.openSettings() : console.log('Einstellungen'); },
};
document.querySelectorAll('[data-action]').forEach(btn =>
  btn.addEventListener('click', () => ACTIONS[btn.dataset.action]())
);

const NET_ICONS = {
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r="1" fill="currentColor" stroke="none"/>',
  ethernet: '<rect x="5" y="9" width="14" height="10" rx="1.5"/><path d="M9 9V6h6v3M9 13v2M12 13v2M15 13v2"/>',
  none: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" opacity=".35"/><path d="M4 4l16 16"/>',
};
function updateNetwork() {
  const type = Bridge && Bridge.getNetworkType ? Bridge.getNetworkType() : (navigator.onLine ? 'wifi' : 'none');
  document.getElementById('net-icon').innerHTML = NET_ICONS[type] || NET_ICONS.wifi;
}
updateNetwork();
setInterval(updateNetwork, 30000);

// ── Alle Apps ───────────────────────────────────────────────────────────
function openAllApps() {
  const grid = document.getElementById('all-apps');
  grid.innerHTML = '';
  let apps;
  if (Bridge && Bridge.getInstalledAppsJson) {
    apps = JSON.parse(Bridge.getInstalledAppsJson());
  } else {
    apps = (window.dockApps || []).map(a => ({ label: a.name, pkg: a.package, logo: a.icon }));
  }

  apps.forEach(app => {
    const item = document.createElement('button');
    item.className = 'app-item';
    item.dataset.nav = '';
    const banner = app.image
      ? `<div class="app-banner" style="background-image:url('data:image/png;base64,${app.image}')"></div>`
      : `<div class="app-banner"><span class="logo" style="--icon:url('icons/${app.logo || 'browser'}.svg')"></span></div>`;
    item.innerHTML = `${banner}<div class="app-label"></div>`;
    item.querySelector('.app-label').textContent = app.label;
    item.addEventListener('click', () => { closeLayers(); launchApp(app.pkg); });
    grid.appendChild(item);
  });

  document.body.classList.add('apps-open');
  resetFocus();
}

// ── Art Mode ────────────────────────────────────────────────────────────
let artOn = false, artTimer = null, idleTimer = null;

function startArt() {
  if (artOn) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') { resetIdle(); return; }
  closeLayers();
  artOn = true;
  document.body.classList.add('art');
  document.body.classList.toggle('art-clock-on', CONFIG.artModeShowClock);
  restartArtTimer();
}

function stopArt() {
  artOn = false;
  clearInterval(artTimer);
  document.body.classList.remove('art', 'art-clock-on');
}

function restartArtTimer() {
  clearInterval(artTimer);
  artTimer = setInterval(() => showWallpaper(wp.index + 1), CONFIG.artModeImageSeconds * 1000);
}

// Im Art Mode blättern Links/Rechts durch die Bilder, jede andere Taste führt zurück
function handleArtKey(e) {
  if (!artOn) return false;
  e.preventDefault();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    showWallpaper(wp.index + (e.key === 'ArrowRight' ? 1 : -1));
    restartArtTimer();
  } else {
    stopArt();
  }
  return true;
}

function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(startArt, CONFIG.artModeAfterSeconds * 1000);
}
['keydown', 'mousedown', 'wheel'].forEach(t => window.addEventListener(t, resetIdle, true));
window.addEventListener('mousemove', () => { if (!artOn) resetIdle(); });
window.addEventListener('mousedown', e => { if (artOn) { e.preventDefault(); stopArt(); } }, true);
resetIdle();

// Wird von der Android-App aufgerufen, wenn der Fire TV den Bildschirmschoner starten will
window.enterArtMode = startArt;
