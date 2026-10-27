// Smart Home: Shelly (lokal) und Govee (Cloud-API), Geräte in smarthome.json
let smarthomeData = null;
let activeRoom = 0;

const GOVEE = 'https://openapi.api.govee.com/router/api/v1';
const ICONS = {
  plug: '<svg viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
};

// Anfragen laufen über die Android-App, im normalen Browser blockieren Shelly und Govee sie (CORS)
const pendingHttp = {};
window.__bridgeHttpDone = (id, text) => { pendingHttp[id]?.(text); delete pendingHttp[id]; };

function http(method, url, headers = {}, body = '') {
  const bridge = window.Android;
  if (bridge && bridge.http) {
    return new Promise(resolve => {
      const id = Math.random().toString(36).slice(2);
      pendingHttp[id] = resolve;
      bridge.http(id, method, url, JSON.stringify(headers), body);
    });
  }
  return fetch(url, { method, headers, body: body || undefined })
    .then(r => r.text())
    .catch(() => fetch(url, { method, mode: 'no-cors' }).then(() => '', () => ''));
}

function parse(text) { try { return JSON.parse(text); } catch (_) { return null; } }

function goveeHeaders() {
  return { 'Govee-API-Key': smarthomeData.goveeApiKey, 'Content-Type': 'application/json' };
}

function goveeReady() {
  return smarthomeData.goveeApiKey && smarthomeData.goveeApiKey !== 'HIER_API_KEY_EINTRAGEN';
}

function allDevices() {
  return smarthomeData.rooms.flatMap(r => r.devices);
}

async function initSmartHome() {
  try {
    smarthomeData = await (await fetch('smarthome.json')).json();
  } catch (e) {
    console.log('Smart Home nicht geladen:', e.message);
    return;
  }
  renderRooms();
  renderDevices();
  await Promise.all([loadShellyStates(), loadGoveeDevices()]);
  renderDevices();
}

async function loadShellyStates() {
  await Promise.all(allDevices().filter(d => d.type === 'shelly-dimmer').map(async d => {
    const s = parse(await http('GET', `http://${d.ip}/light/0`));
    if (s) { d.on = s.ison; d.brightness = s.brightness; d.reachable = true; }
  }));
}

// Govee-Geräte werden über das Modell (z.B. H6006) automatisch zugeordnet
async function loadGoveeDevices() {
  if (!goveeReady()) return;
  const res = parse(await http('GET', `${GOVEE}/user/devices`, goveeHeaders()));
  if (!res || !Array.isArray(res.data)) return;
  const unused = [...res.data];
  for (const d of allDevices().filter(x => x.type === 'govee')) {
    const i = unused.findIndex(g => g.sku === d.model);
    if (i === -1) continue;
    const g = unused.splice(i, 1)[0];
    d.deviceId = g.device;
    if (g.deviceName) d.name = g.deviceName;
    const st = parse(await http('POST', `${GOVEE}/device/state`, goveeHeaders(),
      JSON.stringify({ requestId: String(Date.now()), payload: { sku: d.model, device: d.deviceId } })));
    const power = st?.payload?.capabilities?.find(c => c.instance === 'powerSwitch');
    if (power) d.on = power.state?.value === 1;
    d.reachable = true;
  }
}

function renderRooms() {
  const bar = document.getElementById('sh-tabs');
  bar.innerHTML = '';
  if (smarthomeData.rooms.length < 2) return;
  smarthomeData.rooms.forEach((room, i) => {
    const btn = document.createElement('button');
    btn.className = 'sh-tab' + (i === activeRoom ? ' active' : '');
    btn.textContent = room.name;
    btn.dataset.nav = '';
    btn.addEventListener('click', () => { activeRoom = i; renderRooms(); renderDevices(); });
    bar.appendChild(btn);
  });
}

function deviceState(d) {
  if (d.type === 'govee' && !goveeReady()) return 'API-Key fehlt';
  if (d.type === 'govee' && !d.deviceId) return 'Nicht gefunden';
  if (!d.on) return 'Aus';
  return d.type === 'shelly-dimmer' && d.brightness ? `An · ${d.brightness} %` : 'An';
}

function renderDevices() {
  const list = document.getElementById('sh-devices');
  const room = smarthomeData.rooms[activeRoom];
  const focusedId = typeof focused !== 'undefined' && focused?.dataset.device;
  list.innerHTML = '';

  room.devices.forEach(d => {
    const row = document.createElement('div');
    row.className = 'sh-device' + (d.on ? ' is-on' : '');
    row.dataset.nav = '';
    row.dataset.device = d.id;
    row.innerHTML = `
      <div class="row-icon">${d.type === 'shelly' ? ICONS.plug : ICONS.bulb}</div>
      <div class="row-text"><div class="row-name"></div><div class="row-state">${deviceState(d)}</div></div>
      <div class="toggle${d.on ? ' on' : ''}"><div class="toggle-knob"></div></div>
    `;
    row.querySelector('.row-name').textContent = d.name;
    row.addEventListener('click', () => toggleDevice(d, row));
    list.appendChild(row);
    if (focusedId === d.id) setFocus(row, true);
  });
}

async function toggleDevice(d, row) {
  if (d.type === 'govee' && (!goveeReady() || !d.deviceId)) return;
  d.on = !d.on;
  row.classList.toggle('is-on', d.on);
  row.querySelector('.toggle').classList.toggle('on', d.on);
  row.querySelector('.row-state').textContent = deviceState(d);

  if (d.type === 'shelly-dimmer') {
    await http('GET', `http://${d.ip}/light/0?turn=${d.on ? 'on' : 'off'}`);
  } else if (d.type === 'shelly') {
    await http('GET', `http://${d.ip}/relay/0?turn=${d.on ? 'on' : 'off'}`);
  } else if (d.type === 'govee') {
    await http('POST', `${GOVEE}/device/control`, goveeHeaders(), JSON.stringify({
      requestId: String(Date.now()),
      payload: { sku: d.model, device: d.deviceId, capability: { type: 'devices.capabilities.on_off', instance: 'powerSwitch', value: d.on ? 1 : 0 } },
    }));
  }
}

initSmartHome();
