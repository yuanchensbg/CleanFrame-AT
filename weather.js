// Live-Wetter über Open-Meteo (kostenlos, kein API-Key)
const WEATHER_CODES = {
  0: ['Klar', '☀'], 1: ['Überwiegend klar', '🌤'], 2: ['Teilweise bewölkt', '⛅'], 3: ['Bewölkt', '☁'],
  45: ['Nebel', '🌫'], 48: ['Nebel', '🌫'],
  51: ['Nieselregen', '🌦'], 53: ['Nieselregen', '🌦'], 55: ['Nieselregen', '🌦'],
  61: ['Leichter Regen', '🌧'], 63: ['Regen', '🌧'], 65: ['Starker Regen', '🌧'],
  71: ['Leichter Schneefall', '🌨'], 73: ['Schneefall', '🌨'], 75: ['Starker Schneefall', '❄'],
  80: ['Regenschauer', '🌦'], 81: ['Regenschauer', '🌧'], 82: ['Starke Schauer', '⛈'],
  95: ['Gewitter', '⛈'], 96: ['Gewitter mit Hagel', '⛈'], 99: ['Gewitter mit Hagel', '⛈'],
};

let weatherData = null;

async function loadWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}`
    + '&current=temperature_2m,weather_code'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=Europe%2FVienna&forecast_days=1';
  try {
    const res = await fetch(url);
    const d = await res.json();
    const [text, icon] = WEATHER_CODES[d.current.weather_code] || ['', ''];
    weatherData = {
      temp: Math.round(d.current.temperature_2m),
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
      rain: d.daily.precipitation_probability_max[0],
      text, icon,
    };
    renderWeather();
  } catch (e) {
    console.log('Wetter nicht verfügbar:', e.message);
  }
}

function renderWeather() {
  if (!weatherData) return;
  const w = weatherData;
  document.querySelectorAll('[data-weather="temp"]').forEach(el => el.textContent = w.temp + '°');
  document.querySelectorAll('[data-weather="icon"]').forEach(el => el.textContent = w.icon);
  document.querySelectorAll('[data-weather="text"]').forEach(el => el.textContent = w.text);
  document.querySelectorAll('[data-weather="range"]').forEach(el => el.textContent = `H ${w.max}°  T ${w.min}°`);
  document.querySelectorAll('[data-weather="rain"]').forEach(el => el.textContent = `Regen ${w.rain}%`);
  document.querySelectorAll('[data-weather="city"]').forEach(el => el.textContent = CONFIG.city);
  document.querySelectorAll('.weather-widget, .saver-weather').forEach(el => el.classList.add('ready'));
}

loadWeather();
setInterval(loadWeather, 15 * 60 * 1000);
