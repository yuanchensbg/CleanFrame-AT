// Ambilight-Steuerung über Philips JointSpace API
// TV-IP hier eintragen (findest du in deinen Router-Einstellungen)
const PHILIPS_TV_IP = '192.168.1.100';  // <-- ANPASSEN
const PHILIPS_PORT = 1925;

let ambilightOn = true;

async function setAmbilight(on) {
  try {
    const url = `http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`;
    const body = JSON.stringify({ power: on ? 'On' : 'Off' });
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
  } catch (e) {
    // TV nicht erreichbar — kein Fehler anzeigen
    console.log('Ambilight nicht erreichbar:', e.message);
  }
}

function toggleAmbilight() {
  ambilightOn = !ambilightOn;

  const toggle = document.getElementById('ambi-toggle');
  const dot = document.getElementById('ambi-dot');

  toggle.classList.toggle('on', ambilightOn);
  dot.classList.toggle('off', !ambilightOn);

  setAmbilight(ambilightOn);
}

// Beim Start: Ambilight-Status holen
async function getAmbilightStatus() {
  try {
    const url = `http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`;
    const res = await fetch(url);
    const data = await res.json();
    ambilightOn = data.power === 'On';

    const toggle = document.getElementById('ambi-toggle');
    const dot = document.getElementById('ambi-dot');
    toggle.classList.toggle('on', ambilightOn);
    dot.classList.toggle('off', !ambilightOn);
  } catch (e) {
    // Standardmäßig: an
    document.getElementById('ambi-toggle').classList.add('on');
  }
}

getAmbilightStatus();
