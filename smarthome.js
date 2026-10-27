// Smart Home: Shelly (lokal) und Govee (Cloud-API), Geräte in smarthome.json
let smarthomeData = null;
let activeRoom = 0;

const ICONS = {
  plug: '<svg viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
};

async function initSmartHome() {
  try {
    const res = await fetch('smarthome.json');
    smarthomeData = await res.json();
    renderRooms();
    renderDevices();
  } catch (e) {
    console.log('Smart Home nicht geladen:', e.message);
  }
}

function goveeReady() {
  return smarthomeData.goveeApiKey && smarthomeData.goveeApiKey !== 'HIER_API_KEY_EINTRAGEN';
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

function deviceState(device) {
  if (device.type === 'govee' && !goveeReady()) return 'API-Key fehlt';
  if (!device.on) return 'Aus';
  return device.type === 'govee' ? `An · ${Math.round(device.brightness)} %` : 'An';
}

function renderDevices() {
  const list = document.getElementById('sh-devices');
  const room = smarthomeData.rooms[activeRoom];
  list.innerHTML = '';

  room.devices.forEach(device => {
    const row = document.createElement('div');
    row.className = 'sh-device' + (device.on ? ' is-on' : '');
    row.dataset.nav = '';
    row.innerHTML = `
      <div class="row-icon">${device.type === 'shelly' ? ICONS.plug : ICONS.bulb}</div>
      <div class="row-text">
        <div class="row-name">${device.name}</div>
        <div class="row-state">${deviceState(device)}</div>
        ${device.type === 'govee' && device.on ? `<div class="bright-bar"><div class="bright-fill" style="width:${device.brightness}%"></div></div>` : ''}
      </div>
      <div class="toggle${device.on ? ' on' : ''}"><div class="toggle-knob"></div></div>
    `;
    row.addEventListener('click', () => toggleDevice(device, row));
    list.appendChild(row);
  });
}

async function toggleDevice(device, row) {
  if (device.type === 'govee' && !goveeReady()) return;
  device.on = !device.on;
  row.classList.toggle('is-on', device.on);
  row.querySelector('.toggle').classList.toggle('on', device.on);
  row.querySelector('.row-state').textContent = deviceState(device);

  try {
    if (device.type === 'shelly') {
      await fetch(`http://${device.ip}/relay/0?turn=${device.on ? 'on' : 'off'}`, { mode: 'no-cors' });
    } else if (device.type === 'govee') {
      await fetch('https://developer-api.govee.com/v1/devices/control', {
        method: 'PUT',
        headers: { 'Govee-API-Key': smarthomeData.goveeApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: device.deviceId, model: device.model, cmd: { name: 'turn', value: device.on ? 'on' : 'off' } }),
      });
    }
  } catch (_) { /* Gerät nicht erreichbar */ }
}

initSmartHome();
