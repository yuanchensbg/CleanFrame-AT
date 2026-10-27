// Mediathek: Sendungen aus ORF ON, ARD, ZDF, 3sat, arte, SRF … über das freie Verzeichnis MediathekView
const MV_API = 'https://mediathekviewweb.de/api/query';
const CHANNELS = [
  { id: '', name: 'Alle' },
  { id: 'ORF', name: 'ORF' },
  { id: 'ARD', name: 'ARD' },
  { id: 'ZDF', name: 'ZDF' },
  { id: '3Sat', name: '3sat' },
  { id: 'ARTE.DE', name: 'arte' },
  { id: 'SRF', name: 'SRF' },
  { id: 'KiKA', name: 'KiKA' },
];
const PAGE = 24;
// Zusatzfassungen derselben Sendung ausblenden
const VARIANT = /gebärdensprache|audiodeskription|hörfassung|\((ad|dgs|ut|ögs)\)|mit untertitel/i;

const media = { channel: '', search: '', offset: 0, results: [] };

async function mvQuery({ search = '', channel = '', offset = 0, size = PAGE, durationMin = 300 }) {
  const queries = [];
  if (search) queries.push({ fields: ['title', 'topic'], query: search });
  if (channel) queries.push({ fields: ['channel'], query: channel });
  const res = await fetch(MV_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ queries, sortBy: 'timestamp', sortOrder: 'desc', future: false, offset, size, duration_min: durationMin }),
  });
  const data = await res.json();
  return data.result ? data.result.results : [];
}

// ── Liste ───────────────────────────────────────────────────────────────
function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} Std ${m % 60} Min` : `${m} Min`;
}

function fmtDate(ts) {
  const d = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  const time = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === today.toDateString()) return 'Heute, ' + time;
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern, ' + time;
  return `${d.getDate()}.${d.getMonth() + 1}., ${time}`;
}

function channelName(id) {
  return (CHANNELS.find(c => c.id.toLowerCase() === String(id).toLowerCase()) || { name: id }).name;
}

function mediaCard(item) {
  const card = document.createElement('button');
  card.className = 'media-card';
  card.dataset.nav = '';
  const progress = savedProgress(item);
  card.innerHTML = `
    <div class="media-top"><span class="media-channel"></span><span class="media-date"></span></div>
    <div class="media-title"></div>
    <div class="media-topic"></div>
    <div class="media-bottom"><span class="media-duration"></span></div>
    ${progress ? `<div class="media-progress"><div style="width:${Math.round(progress * 100)}%"></div></div>` : ''}`;
  card.querySelector('.media-channel').textContent = channelName(item.channel);
  card.querySelector('.media-date').textContent = fmtDate(item.timestamp);
  card.querySelector('.media-title').textContent = item.title;
  card.querySelector('.media-topic').textContent = item.topic;
  card.querySelector('.media-duration').textContent = fmtDuration(item.duration);
  card.addEventListener('click', () => playMedia(item));
  return card;
}

function setMediaStatus(text) {
  document.getElementById('media-status').textContent = text;
}

async function loadMedia(append = false) {
  const grid = document.getElementById('media-grid');
  const more = document.getElementById('media-more');
  if (!append) {
    media.offset = 0;
    media.results = [];
    media.seen = new Set();
    grid.innerHTML = '';
  }
  document.getElementById('media-heading').textContent = media.search ? `Suche: „${media.search}“` : 'Neu in den Mediatheken';
  setMediaStatus('Lädt …');
  more.hidden = true;

  let items;
  try {
    items = await mvQuery({ search: media.search, channel: media.channel, offset: media.offset });
  } catch (_) {
    setMediaStatus('Die Mediathek ist gerade nicht erreichbar. Prüfe die Internetverbindung.');
    return;
  }
  media.offset += items.length;
  const fresh = items.filter(i => {
    if (VARIANT.test(i.title)) return false;
    const key = (i.channel + i.topic + i.title).toLowerCase();
    if (media.seen.has(key)) return false;
    media.seen.add(key);
    return true;
  });
  media.results.push(...fresh);
  fresh.forEach(item => grid.appendChild(mediaCard(item)));

  setMediaStatus(media.results.length ? '' : 'Nichts gefunden. Versuch einen anderen Suchbegriff oder Sender.');
  more.hidden = items.length < PAGE;
}

function renderChips() {
  const box = document.getElementById('media-chips');
  box.innerHTML = '';
  CHANNELS.forEach(ch => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (ch.id === media.channel ? ' active' : '');
    chip.dataset.nav = '';
    chip.textContent = ch.name;
    chip.addEventListener('click', () => {
      media.channel = ch.id;
      box.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
      loadMedia();
    });
    box.appendChild(chip);
  });
}

function openMediathek() {
  renderChips();
  document.body.classList.add('media-open');
  resetFocus();
  if (!media.results.length) loadMedia();
}

// ── Link → Video ────────────────────────────────────────────────────────
// Erkennt eine Sendung an der ID im Link (ORF-Nummer, ARD-Kennung) oder an der Adresse selbst
function idSegments(url) {
  try {
    return new URL(url).pathname.split('/').filter(s => /^\d{6,}$/.test(s) || /^[A-Za-z0-9_-]{24,}$/.test(s) && !s.includes('-'));
  } catch (_) { return []; }
}

function normalize(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch (_) { return ''; }
}

function slugWords(url) {
  const parts = new URL(url).pathname.split('/')
    .filter(s => /[a-z]/i.test(s) && s.includes('-'))
    .map(s => s.replace(/\.html?$/, '').split('-').filter(w => w && !/^\d+$/.test(w)).join(' '));
  return parts.slice(-2);
}

function sameEpisode(a, b) {
  if (normalize(a) === normalize(b)) return true;
  const ids = idSegments(a);
  return ids.length > 0 && idSegments(b).some(id => ids.includes(id));
}

async function findByLink(raw) {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch (_) { return { error: 'Das ist keine gültige Adresse.' }; }

  const words = slugWords(url);
  const attempts = [words.join(' '), words[words.length - 1], words[0]].filter((w, i, a) => w && a.indexOf(w) === i);
  if (!attempts.length) return { error: 'Im Link steht kein Sendungsname. Kopiere den Link direkt von der Seite der Sendung.' };

  for (const search of attempts) {
    const items = await mvQuery({ search, size: 50, durationMin: 0 });
    const hit = items.find(i => sameEpisode(url, i.url_website));
    if (hit) return { item: hit };
  }
  return { error: 'Diese Sendung ist nicht im Verzeichnis. Unterstützt werden ORF ON, ARD, ZDF, 3sat, arte, SRF und KiKA.' };
}

async function openLink() {
  const input = document.getElementById('media-link');
  if (!input.value.trim()) return;
  setMediaStatus('Suche die Sendung …');
  let result;
  try { result = await findByLink(input.value); }
  catch (_) { result = { error: 'Die Mediathek ist gerade nicht erreichbar.' }; }
  if (result.item) {
    input.value = '';
    setMediaStatus('');
    playMedia(result.item);
  } else {
    setMediaStatus(result.error);
  }
}

document.getElementById('media-search').addEventListener('change', e => {
  media.search = e.target.value.trim();
  loadMedia();
});
document.getElementById('media-link').addEventListener('change', openLink);
document.getElementById('media-more').addEventListener('click', () => loadMedia(true));

// ── Weiterschauen ───────────────────────────────────────────────────────
function progressKey(item) { return 'pos:' + (item.url_website || item.url_video); }

function savedProgress(item) {
  const pos = Number(localStorage.getItem(progressKey(item)));
  return pos && item.duration ? Math.min(1, pos / item.duration) : 0;
}

// ── Player ──────────────────────────────────────────────────────────────
const player = { item: null, hls: null, hideTimer: null, saveTimer: null };
const video = document.getElementById('video');

function playerOpen() { return document.body.classList.contains('player-open'); }

function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
}

function showPlayerUi() {
  const ui = document.getElementById('player-ui');
  ui.classList.add('visible');
  clearTimeout(player.hideTimer);
  if (!video.paused) player.hideTimer = setTimeout(() => ui.classList.remove('visible'), 3500);
}

function updatePlayerUi() {
  const dur = video.duration || player.item?.duration || 0;
  document.getElementById('player-time').textContent = `${fmtTime(video.currentTime)} / ${fmtTime(dur)}`;
  document.getElementById('player-bar').style.width = dur ? (video.currentTime / dur * 100) + '%' : '0';
  document.getElementById('player-ui').classList.toggle('paused', video.paused);
}

function playMedia(item) {
  player.item = item;
  const src = item.url_video_hd || item.url_video;
  document.getElementById('player-title').textContent = item.title;
  document.getElementById('player-sub').textContent = `${channelName(item.channel)} · ${item.topic}`;
  document.getElementById('player-msg').textContent = 'Lädt …';
  document.body.classList.add('player-open');
  if (window.Android && Android.keepScreenOn) Android.keepScreenOn(true);

  const resume = Number(localStorage.getItem(progressKey(item))) || 0;
  const startAt = resume > 30 && resume < item.duration * 0.95 ? resume : 0;
  const isHls = /\.m3u8(\?|$)/.test(src);

  if (isHls && !video.canPlayType('application/vnd.apple.mpegurl') && window.Hls && Hls.isSupported()) {
    player.hls = new Hls({ startPosition: startAt });
    player.hls.loadSource(src);
    player.hls.attachMedia(video);
  } else {
    video.src = src;
    if (startAt) video.addEventListener('loadedmetadata', () => { video.currentTime = startAt; }, { once: true });
  }
  video.play().catch(() => {});
  showPlayerUi();

  clearInterval(player.saveTimer);
  player.saveTimer = setInterval(saveProgress, 10000);
}

function saveProgress() {
  if (!player.item || !video.currentTime) return;
  const key = progressKey(player.item);
  if (video.duration && video.currentTime > video.duration * 0.95) localStorage.removeItem(key);
  else localStorage.setItem(key, Math.floor(video.currentTime));
}

function closePlayer() {
  saveProgress();
  clearInterval(player.saveTimer);
  video.pause();
  if (player.hls) { player.hls.destroy(); player.hls = null; }
  video.removeAttribute('src');
  video.load();
  document.body.classList.remove('player-open');
  if (window.Android && Android.keepScreenOn) Android.keepScreenOn(false);
  // Fortschrittsbalken in der Liste aktualisieren
  if (document.body.classList.contains('media-open')) {
    const grid = document.getElementById('media-grid');
    const cards = [...grid.children];
    media.results.forEach((item, i) => cards[i] && cards[i].replaceWith(mediaCard(item)));
    const idx = media.results.indexOf(player.item);
    setFocus(grid.children[idx] || grid.firstElementChild, true);
  }
}

function seek(delta) {
  if (!video.duration) return;
  video.currentTime = Math.min(video.duration - 1, Math.max(0, video.currentTime + delta));
  updatePlayerUi();
}

// Fernbedienung im Player: OK = Pause, ◀ ▶ = 10 s (gedrückt halten = 30 s), Zurück = schließen
function handlePlayerKey(e) {
  if (!playerOpen()) return false;
  e.preventDefault();
  showPlayerUi();
  switch (e.key) {
    case 'Enter': case ' ': case 'MediaPlayPause': case 'MediaPlay': case 'MediaPause':
      video.paused ? video.play() : video.pause(); break;
    case 'ArrowLeft': seek(e.repeat ? -30 : -10); break;
    case 'ArrowRight': seek(e.repeat ? 30 : 10); break;
    case 'MediaRewind': seek(-30); break;
    case 'MediaFastForward': seek(30); break;
    case 'Escape': case 'Backspace': case 'GoBack': case 'MediaStop': closePlayer(); break;
  }
  return true;
}

video.addEventListener('timeupdate', updatePlayerUi);
video.addEventListener('play', () => { updatePlayerUi(); showPlayerUi(); });
video.addEventListener('pause', () => { updatePlayerUi(); showPlayerUi(); });
video.addEventListener('playing', () => { document.getElementById('player-msg').textContent = ''; });
video.addEventListener('waiting', () => { document.getElementById('player-msg').textContent = 'Lädt …'; });
video.addEventListener('error', () => {
  if (playerOpen()) document.getElementById('player-msg').textContent = 'Das Video konnte nicht geladen werden. Manche Sendungen sind nur in Deutschland oder nur für kurze Zeit abrufbar.';
});
video.addEventListener('ended', () => { saveProgress(); closePlayer(); });
document.getElementById('player').addEventListener('mousemove', showPlayerUi);
document.getElementById('player').addEventListener('click', () => { video.paused ? video.play() : video.pause(); });
