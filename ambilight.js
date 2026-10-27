// Ambilight über die Philips JointSpace API v1 (Philips 60PFL6008S, 2013)
// v1 kennt kein Ein/Aus: „An“ = Ambilight folgt dem Bild, „Aus“ = manuelle Farbe Schwarz
const PHILIPS_TV_IP = '192.168.178.67';
const AMBI = `http://${PHILIPS_TV_IP}:1925/1/ambilight`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

let ambilightOn = true;

function renderAmbilight() {
  document.getElementById('ambi-toggle').classList.toggle('on', ambilightOn);
  document.getElementById('ambi-row').classList.toggle('is-on', ambilightOn);
  document.getElementById('ambi-state').textContent = ambilightOn ? 'An · folgt dem Bild' : 'Aus';
}

async function setAmbilight(on) {
  if (on) {
    await http('POST', `${AMBI}/mode`, JSON_HEADERS, JSON.stringify({ current: 'internal' }));
  } else {
    await http('POST', `${AMBI}/mode`, JSON_HEADERS, JSON.stringify({ current: 'manual' }));
    await http('POST', `${AMBI}/cached`, JSON_HEADERS, JSON.stringify({ r: 0, g: 0, b: 0 }));
  }
}

function toggleAmbilight() {
  ambilightOn = !ambilightOn;
  renderAmbilight();
  setAmbilight(ambilightOn);
}

async function getAmbilightStatus() {
  const mode = parse(await http('GET', `${AMBI}/mode`));
  if (mode) ambilightOn = mode.current === 'internal';
  renderAmbilight();
}

getAmbilightStatus();
