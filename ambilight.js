// Ambilight-Steuerung über Philips JointSpace API
// TV-IP hier eintragen (TV: Einstellungen → Netzwerk, oder im Router nachsehen)
const PHILIPS_TV_IP = '192.168.1.100';  // <-- ANPASSEN
const PHILIPS_PORT = 1925;

let ambilightOn = true;

function renderAmbilight() {
  document.getElementById('ambi-toggle').classList.toggle('on', ambilightOn);
  document.getElementById('ambi-row').classList.toggle('is-on', ambilightOn);
  document.getElementById('ambi-state').textContent = ambilightOn ? 'An' : 'Aus';
}

async function setAmbilight(on) {
  try {
    await fetch(`http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ power: on ? 'On' : 'Off' }),
    });
  } catch (e) {
    console.log('Ambilight nicht erreichbar:', e.message);
  }
}

function toggleAmbilight() {
  ambilightOn = !ambilightOn;
  renderAmbilight();
  setAmbilight(ambilightOn);
}

async function getAmbilightStatus() {
  try {
    const res = await fetch(`http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`);
    ambilightOn = (await res.json()).power === 'On';
  } catch (_) { /* TV nicht erreichbar, Anzeige bleibt auf „An“ */ }
  renderAmbilight();
}

getAmbilightStatus();
