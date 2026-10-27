// Screensaver: blendet das Interface nach Inaktivität aus
let saverActive = false;
let idleTimer = null;
let saverSlideTimer = null;

function startSaver() {
  if (saverActive) return;
  saverActive = true;
  if (document.activeElement) document.activeElement.blur();
  document.body.classList.add('saver-on');
  saverSlideTimer = setInterval(nextSlide, CONFIG.screensaverPhotoSeconds * 1000);
}

function stopSaver() {
  saverActive = false;
  document.body.classList.remove('saver-on');
  clearInterval(saverSlideTimer);
  const first = document.querySelector('.app-tile');
  if (first) first.focus();
}

function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(startSaver, CONFIG.screensaverAfterSeconds * 1000);
}

// Erste Eingabe im Screensaver weckt nur auf und löst keine Aktion aus
function onActivity(e) {
  if (saverActive) {
    e.preventDefault();
    e.stopImmediatePropagation();
    stopSaver();
  }
  resetIdle();
}

['keydown', 'mousedown', 'touchstart', 'wheel'].forEach(type =>
  window.addEventListener(type, onActivity, { capture: true, passive: false })
);
window.addEventListener('mousemove', () => { if (!saverActive) resetIdle(); });

function tickSaverClock() {
  const now = new Date();
  const el = document.getElementById('saver-clock');
  if (el) el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const d = document.getElementById('saver-date');
  const main = document.getElementById('date');
  if (d && main) d.textContent = main.textContent;
}
tickSaverClock();
setInterval(tickSaverClock, 10000);

resetIdle();
