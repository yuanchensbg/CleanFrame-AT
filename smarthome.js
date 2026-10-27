let smarthomeData = null;
let activeRoom = 0;

async function initSmartHome() {
  try {
    const res = await fetch('smarthome.json');
    smarthomeData = await res.json();
    renderRooms();
    renderDevices(0);
  } catch (e) {
    console.log('Smart Home nicht geladen:', e.message);
  }
}

function renderRooms() {
  const tabBar = document.getElementById('sh-tabs');
  if (!tabBar || !smarthomeData) return;
  tabBar.innerHTML = '';
  smarthomeData.rooms.forEach((room, i) => {
    const btn = document.createElement('button');
    btn.className = 'sh-tab' + (i === 0 ? ' active' : '');
    btn.textContent = room.name;
    btn.tabIndex = 0;
    btn.addEventListener('click', () => selectRoom(i));
    tabBar.appendChild(btn);
  });
}

function selectRoom(index) {
  activeRoom = index;
  document.querySelectorAll('.sh-tab').forEach((t, i) => t.classList.toggle('active', i === index));
  renderDevices(index);
}

function renderDevices(roomIndex) {
  const grid = document.getElementById('sh-devices');
  if (!grid || !smarthomeData) return;
  const room = smarthomeData.rooms[roomIndex];
  grid.innerHTML = '';

  room.devices.forEach(device => {
    const card = document.createElement('div');
    card.className = 'sh-device' + (device.on ? ' on' : '');
    card.tabIndex = 0;
    card.dataset.id = device.id;

    if (device.type === 'shelly') {
      card.innerHTML = `
        <div class="sh-device-icon">🔌</div>
        <div class="sh-device-name">${device.name}</div>
        <div class="sh-device-status">${device.on ? 'An' : 'Aus'}</div>
      `;
      card.addEventListener('click', () => toggleShelly(device, card));
    } else if (device.type === 'govee') {
      const isConfigured = smarthomeData.goveeApiKey !== 'HIER_API_KEY_EINTRAGEN';
      card.innerHTML = `
        <div class="sh-device-icon">${device.on ? '💡' : '🔦'}</div>
        <div class="sh-device-name">${device.name}</div>
        <div class="sh-device-status">${!isConfigured ? 'API Key fehlt' : device.on ? Math.round(device.brightness) + '%' : 'Aus'}</div>
        ${device.on && isConfigured ? `<div class="sh-brightness-bar"><div class="sh-brightness-fill" style="width:${device.brightness}%"></div></div>` : ''}
      `;
      if (isConfigured) card.addEventListener('click', () => toggleGovee(device, card));
    }

    card.addEventListener('keydown', e => e.key === 'Enter' && card.click());
    grid.appendChild(card);
  });
}

// ── Shelly (lokal, kein Cloud nötig) ────────────────────────────────────
async function toggleShelly(device, card) {
  device.on = !device.on;
  const action = device.on ? 'on' : 'off';
  try {
    await fetch(`http://${device.ip}/relay/0?turn=${action}`, { mode: 'no-cors' });
  } catch (_) {}
  renderDevices(activeRoom);
}

// ── Govee (Cloud API) ────────────────────────────────────────────────────
async function toggleGovee(device, card) {
  device.on = !device.on;
  try {
    await fetch('https://developer-api.govee.com/v1/devices/control', {
      method: 'PUT',
      headers: {
        'Govee-API-Key': smarthomeData.goveeApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device: device.deviceId,
        model: device.model,
        cmd: { name: 'turn', value: device.on ? 'on' : 'off' },
      }),
    });
  } catch (_) {}
  renderDevices(activeRoom);
}

function alexaCommand(cmd) {
  if (window.Android && window.Android.alexaCommand) window.Android.alexaCommand(cmd);
}

initSmartHome();
