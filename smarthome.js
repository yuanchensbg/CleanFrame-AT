// Smart Home Steuerung
// Geräte werden in smarthome.json konfiguriert
// Steuerung über lokale REST-API (Philips Hue kompatibel) oder Alexa

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
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', () => selectRoom(i));
    tabBar.appendChild(btn);
  });
}

function selectRoom(index) {
  activeRoom = index;
  document.querySelectorAll('.sh-tab').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
  renderDevices(index);
}

function renderDevices(roomIndex) {
  const grid = document.getElementById('sh-devices');
  if (!grid || !smarthomeData) return;
  const room = smarthomeData.rooms[roomIndex];
  grid.innerHTML = '';

  room.devices.forEach(device => {
    const card = document.createElement('div');
    card.className = 'sh-device' + (device.on !== false ? ' on' : '');
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-id', device.id);
    card.setAttribute('data-type', device.type);

    if (device.type === 'light') {
      card.innerHTML = `
        <div class="sh-device-icon">${device.on ? '💡' : '🔦'}</div>
        <div class="sh-device-name">${device.name}</div>
        <div class="sh-device-status">${device.on ? Math.round(device.brightness) + '%' : 'Aus'}</div>
        ${device.on ? `<div class="sh-brightness-bar"><div class="sh-brightness-fill" style="width:${device.brightness}%"></div></div>` : ''}
      `;
      card.addEventListener('click', () => toggleLight(device, card));
    } else if (device.type === 'thermostat') {
      card.classList.add('thermostat');
      card.innerHTML = `
        <div class="sh-device-icon">🌡️</div>
        <div class="sh-device-name">${device.name}</div>
        <div class="sh-temp-control">
          <button class="sh-temp-btn" onclick="adjustTemp('${device.id}', -0.5, event)">−</button>
          <span class="sh-temp-value">${device.temp}°</span>
          <button class="sh-temp-btn" onclick="adjustTemp('${device.id}', +0.5, event)">+</button>
        </div>
      `;
    }

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') card.click();
    });

    grid.appendChild(card);
  });
}

async function toggleLight(device, card) {
  device.on = !device.on;
  card.classList.toggle('on', device.on);

  // Lokale API aufrufen (Philips Hue kompatibel)
  try {
    await fetch(`http://${device.ip}/api/lights/1/state`, {
      method: 'PUT',
      body: JSON.stringify({ on: device.on, bri: Math.round(device.brightness * 2.54) }),
    });
  } catch (_) { /* Gerät offline — UI trotzdem aktualisieren */ }

  // UI neu rendern
  renderDevices(activeRoom);
}

async function adjustTemp(deviceId, delta, event) {
  event.stopPropagation();
  const room = smarthomeData.rooms[activeRoom];
  const device = room.devices.find(d => d.id === deviceId);
  if (!device) return;
  device.temp = Math.round((device.temp + delta) * 2) / 2;

  try {
    await fetch(`http://${device.ip}/api/thermostat`, {
      method: 'PUT',
      body: JSON.stringify({ targetTemp: device.temp }),
    });
  } catch (_) { /* offline */ }

  renderDevices(activeRoom);
}

// Alexa-Sprachbefehl über Android-Bridge
function alexaCommand(command) {
  if (window.Android && window.Android.alexaCommand) {
    window.Android.alexaCommand(command);
  }
}

initSmartHome();
