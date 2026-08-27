/**
 * weatherService.ts
 * Integración con OpenWeatherMap (condiciones + pronóstico + tiles)
 * y RainViewer (radar animado de precipitación — sin API key)
 *
 * Para activar OWM: reemplazá 'YOUR_OWM_API_KEY' con tu API key real.
 * Plan Free: https://openweathermap.org/api
 */

// ─── Configuración ──────────────────────────────────────────────────────────
export const OWM_API_KEY = 'YOUR_OWM_API_KEY';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

export const isOWMKeySet = () => OWM_API_KEY !== 'YOUR_OWM_API_KEY';

// ─── Tipos OWM ───────────────────────────────────────────────────────────────
export interface OWMWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: { id: number; main: string; description: string; icon: string }[];
  clouds: number;
  dt: number;
  name?: string;
}

export interface OWMForecastItem {
  dt: number;
  main: { temp: number; feels_like: number; humidity: number; pressure: number; temp_min: number; temp_max: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  wind: { speed: number; deg: number };
  clouds: { all: number };
  pop: number;
  dt_txt: string;
}

// ─── Tipos RainViewer ────────────────────────────────────────────────────────
export interface RadarFrame {
  time: number;
  path: string;
  isNowcast?: boolean;
}

export interface RainViewerData {
  host: string;
  radar: { past: RadarFrame[]; nowcast: RadarFrame[] };
}

// ─── Mock data (fallback cuando no hay API key) ───────────────────────────────
const now = () => Math.floor(Date.now() / 1000);

export const mockCurrentWeather = (): OWMWeather => ({
  temp: 18,
  feels_like: 16,
  humidity: 68,
  pressure: 1013,
  visibility: 9000,
  wind_speed: 4.2,
  wind_deg: 270,
  weather: [{ id: 801, main: 'Clouds', description: 'nubes dispersas', icon: '02d' }],
  clouds: 25,
  dt: now(),
  name: 'Córdoba',
});

export const mockForecast = (): OWMForecastItem[] => {
  const base = now();
  const temps = [18, 17, 16, 15, 14, 13, 14, 16, 18, 20, 21, 22, 21, 20, 18, 17];
  const pops  = [0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.55, 0.65, 0.6, 0.45, 0.35, 0.25, 0.15, 0.1];
  const icons = ['01d','01d','02d','02d','03d','03d','04d','10d','10d','10d','09d','10d','04d','03d','02d','01n'];
  return temps.map((t, i) => ({
    dt: base + i * 3 * 3600,
    main: { temp: t, feels_like: t - 2, humidity: 60 + i * 2, pressure: 1013, temp_min: t - 2, temp_max: t + 1 },
    weather: [{ id: 800, main: 'Clear', description: 'despejado', icon: icons[i] }],
    wind: { speed: 3 + Math.sin(i * 0.7) * 2, deg: 260 + i * 5 },
    clouds: { all: 10 + i * 5 },
    pop: pops[i],
    dt_txt: new Date((base + i * 3 * 3600) * 1000).toISOString().replace('T', ' ').slice(0, 19),
  }));
};

// ─── OWM Fetchers ─────────────────────────────────────────────────────────────
export async function fetchCurrentWeather(lat: number, lon: number): Promise<OWMWeather> {
  if (!isOWMKeySet()) return mockCurrentWeather();
  try {
    const res = await fetch(
      `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric&lang=es`
    );
    if (!res.ok) throw new Error(`OWM ${res.status}`);
    const d = await res.json();
    return {
      temp: d.main.temp,
      feels_like: d.main.feels_like,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      visibility: d.visibility ?? 10000,
      wind_speed: d.wind?.speed ?? 0,
      wind_deg: d.wind?.deg ?? 0,
      weather: d.weather,
      clouds: d.clouds?.all ?? 0,
      dt: d.dt,
      name: d.name,
    };
  } catch {
    return mockCurrentWeather();
  }
}

export async function fetchForecast(lat: number, lon: number): Promise<OWMForecastItem[]> {
  if (!isOWMKeySet()) return mockForecast();
  try {
    const res = await fetch(
      `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric&lang=es&cnt=24`
    );
    if (!res.ok) throw new Error(`OWM ${res.status}`);
    const d = await res.json();
    return d.list as OWMForecastItem[];
  } catch {
    return mockForecast();
  }
}

// ─── RainViewer ───────────────────────────────────────────────────────────────
export async function fetchRainViewerData(): Promise<RainViewerData | null> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) throw new Error('RainViewer error');
    const d = await res.json();
    return {
      host: d.host,
      radar: {
        past: (d.radar?.past ?? []).map((f: RadarFrame) => ({ ...f, isNowcast: false })),
        nowcast: (d.radar?.nowcast ?? []).map((f: RadarFrame) => ({ ...f, isNowcast: true })),
      },
    };
  } catch {
    return null;
  }
}

// ─── OWM Tile layers ──────────────────────────────────────────────────────────
export type OWMLayer = 'precipitation_new' | 'clouds_new' | 'wind_new' | 'temp_new' | 'none';

export function getOWMTileUrl(layer: OWMLayer): string {
  if (layer === 'none' || !isOWMKeySet()) return '';
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatFrameTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const now_ = Date.now();
  const diffMin = Math.round((now_ - timestamp * 1000) / 60000);
  if (diffMin <= 0) {
    const ahead = Math.abs(diffMin);
    if (ahead === 0) return 'Ahora';
    return `+${ahead} min`;
  }
  if (diffMin < 60) return `hace ${diffMin} min`;
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function windDirLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function weatherCodeToEmoji(id: number): string {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '🌨️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return '☀️';
  if (id === 801) return '🌤️';
  if (id === 802) return '⛅';
  if (id >= 803) return '☁️';
  return '🌡️';
}
