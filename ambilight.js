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

function setAmbilight(on) {
  return http('POST', `http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`,
    { 'Content-Type': 'application/json' }, JSON.stringify({ power: on ? 'On' : 'Off' }));
}

function toggleAmbilight() {
  ambilightOn = !ambilightOn;
  renderAmbilight();
  setAmbilight(ambilightOn);
}

async function getAmbilightStatus() {
  const status = parse(await http('GET', `http://${PHILIPS_TV_IP}:${PHILIPS_PORT}/1/ambilight/power`));
  if (status) ambilightOn = status.power === 'On';
  renderAmbilight();
}

getAmbilightStatus();
