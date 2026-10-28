// Nuki Türschloss über die Nuki Web API. Der Token bleibt nur auf dem Fire TV.
// Zusperren geht direkt, Aufsperren braucht ein zweites OK innerhalb weniger Sekunden.
const NUKI_API = 'https://api.nuki.io';
const NUKI_STATES = {
  0: 'Nicht kalibriert', 1: 'Zugesperrt', 2: 'Sperrt auf …', 3: 'Aufgesperrt', 4: 'Sperrt zu …',
  5: 'Falle gezogen', 6: 'Aufgesperrt', 7: 'Öffnet …', 254: 'Motor blockiert',
};
const LOCK_ICONS = {
  closed: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2"/></svg>',
  open: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7M12 14.5v2"/></svg>',
};

const nuki = { locks: [], busy: {}, confirmUntil: {}, error: '' };

function nukiToken() { return localStorage.getItem('nukiToken') || ''; }
function nukiHeaders() { return { Authorization: 'Bearer ' + nukiToken(), Accept: 'application/json' }; }
function isLocked(lock) { return lock.state && lock.state.state === 1; }

async function loadLocks() {
  if (!nukiToken()) { nuki.locks = []; nuki.error = ''; renderLocks(); return false; }
  const data = parse(await http('GET', `${NUKI_API}/smartlock`, nukiHeaders()));
  if (Array.isArray(data)) {
    nuki.locks = data;
    nuki.error = data.length ? '' : 'Mit diesem Token ist kein Schloss verbunden.';
  } else {
    nuki.error = data ? 'Der Token wurde abgelehnt. Erzeuge auf web.nuki.io einen neuen.' : 'Nuki ist gerade nicht erreichbar.';
  }
  renderLocks();
  return Array.isArray(data) && data.length > 0;
}

function lockState(lock) {
  const id = lock.smartlockId;
  if (nuki.confirmUntil[id] > Date.now()) return 'Nochmal OK drücken zum Aufsperren';
  if (nuki.busy[id]) return nuki.busy[id];
  const s = lock.state || {};
  const parts = [NUKI_STATES[s.state] || 'Unbekannt'];
  if (s.doorState === 2) parts.push('Tür zu');
  if (s.doorState === 3) parts.push('Tür offen');
  if (typeof s.batteryCharge === 'number') parts.push(`Batterie ${s.batteryCharge} %`);
  else if (s.batteryCritical) parts.push('Batterie fast leer');
  return parts.join(' · ');
}

function renderLocks() {
  const box = document.getElementById('nuki-locks');
  const focusedId = typeof focused !== 'undefined' && focused?.dataset.lock;
  box.innerHTML = '';

  if (!nukiToken() || nuki.error) {
    const hint = document.createElement('div');
    hint.className = 'web-empty';
    hint.textContent = nuki.error || 'Unten bei „Verbindungen“ den Nuki-Token eingeben.';
    box.appendChild(hint);
    return;
  }

  nuki.locks.forEach(lock => {
    const locked = isLocked(lock);
    const row = document.createElement('div');
    row.className = 'sh-device lock-row' + (locked ? ' is-locked' : ' is-open');
    if (nuki.confirmUntil[lock.smartlockId] > Date.now()) row.classList.add('confirm');
    row.dataset.nav = '';
    row.dataset.lock = lock.smartlockId;
    row.innerHTML = `
      <div class="row-icon">${locked ? LOCK_ICONS.closed : LOCK_ICONS.open}</div>
      <div class="row-text"><div class="row-name"></div><div class="row-state"></div></div>
      <div class="lock-badge">${locked ? 'Zu' : 'Offen'}</div>`;
    row.querySelector('.row-name').textContent = lock.name;
    row.querySelector('.row-state').textContent = lockState(lock);
    row.addEventListener('click', () => onLockPress(lock));
    box.appendChild(row);
    if (String(focusedId) === String(lock.smartlockId)) setFocus(row, true);
  });
}

function onLockPress(lock) {
  const id = lock.smartlockId;
  if (nuki.busy[id]) return;
  if (!isLocked(lock)) return runLockAction(lock, 'lock');

  if (nuki.confirmUntil[id] > Date.now()) {
    delete nuki.confirmUntil[id];
    return runLockAction(lock, 'unlock');
  }
  nuki.confirmUntil[id] = Date.now() + 4000;
  renderLocks();
  setTimeout(renderLocks, 4100);
}

async function runLockAction(lock, action) {
  const id = lock.smartlockId;
  nuki.busy[id] = action === 'lock' ? 'Sperrt zu …' : 'Sperrt auf …';
  renderLocks();
  await http('POST', `${NUKI_API}/smartlock/${id}/action/${action}`, nukiHeaders());

  // Das Schloss braucht ein paar Sekunden, danach den neuen Zustand holen
  const target = action === 'lock' ? 1 : 3;
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2500));
    await loadLocks();
    const now = nuki.locks.find(l => l.smartlockId === id);
    if (now && now.state && (now.state.state === target || (action === 'unlock' && now.state.state === 5))) break;
  }
  delete nuki.busy[id];
  renderLocks();
}

function renderNukiTokenField() {
  const token = nukiToken();
  const input = document.getElementById('nuki-token');
  input.value = '';
  input.placeholder = token ? `Gespeichert: ••••${token.slice(-4)}  (leer lassen = behalten)` : 'Token von web.nuki.io → API';
  document.getElementById('nuki-token-label').textContent = token ? 'Nuki API-Token ändern' : 'Nuki API-Token';
}

async function saveNukiToken(raw) {
  const token = raw.trim();
  const error = document.getElementById('nuki-error');
  if (!token) return;
  if (token.length < 30 || /\s/.test(token)) {
    error.textContent = 'Das sieht nicht nach einem Nuki-Token aus. Kopiere ihn vollständig von web.nuki.io.';
    return;
  }
  localStorage.setItem('nukiToken', token);
  renderNukiTokenField();
  error.textContent = 'Verbinde mit Nuki …';
  const ok = await loadLocks();
  error.textContent = ok ? '' : nuki.error;
}

document.getElementById('nuki-token').addEventListener('change', e => saveNukiToken(e.target.value));
document.getElementById('nuki-token').addEventListener('input', () => { document.getElementById('nuki-error').textContent = ''; });

renderNukiTokenField();
loadLocks();
// Zustand aktuell halten, solange die Smart-Home-Leiste offen ist
setInterval(() => { if (document.body.classList.contains('sheet-open')) loadLocks(); }, 30000);
