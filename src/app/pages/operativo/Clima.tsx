/**
 * Clima.tsx — Módulo climático del operativo DUAR
 * Radar animado de precipitación (RainViewer) + condiciones OWM + pronóstico
 */
import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
  Wind, Droplets, Eye, Thermometer, Gauge, MapPin,
  AlertTriangle, Play, Pause, SkipBack, SkipForward,
  RefreshCw, CloudRain, Cloud, Layers, ChevronRight, Info,
  Navigation, Key,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

import {
  fetchCurrentWeather, fetchForecast, fetchRainViewerData,
  OWMWeather, OWMForecastItem, RadarFrame, RainViewerData, OWMLayer,
  formatFrameTime, windDirLabel, weatherCodeToEmoji, isOWMKeySet,
  mockCurrentWeather, mockForecast,
} from '../../services/weatherService';
import { WeatherRadarMap } from './WeatherRadarMap';

// ─── Types ────────────────────────────────────────────────────────────────────
type AnimSpeed = 'slow' | 'normal' | 'fast';
const SPEED_MS: Record<AnimSpeed, number> = { slow: 1200, normal: 600, fast: 200 };

type FrameWithHost = RadarFrame & { host: string };

// ─── Radar color legend entries ───────────────────────────────────────────────
const RADAR_LEGEND = [
  { color: '#7fffff', label: '< 0.5 mm/h' },
  { color: '#00baff', label: '0.5–1' },
  { color: '#0095ff', label: '1–2' },
  { color: '#0064ff', label: '2–4' },
  { color: '#00c800', label: '4–8' },
  { color: '#00a000', label: '8–16' },
  { color: '#ffff00', label: '16–32' },
  { color: '#ffa000', label: '32–64' },
  { color: '#ff0000', label: '> 64 mm/h' },
];

// ─── OWM Layer options ────────────────────────────────────────────────────────
const OWM_LAYERS: { id: OWMLayer; label: string; icon: React.ReactNode }[] = [
  { id: 'none', label: 'Solo radar', icon: <CloudRain size={13} /> },
  { id: 'clouds_new', label: 'Nubes', icon: <Cloud size={13} /> },
  { id: 'precipitation_new', label: 'Precipitación', icon: <Droplets size={13} /> },
  { id: 'wind_new', label: 'Viento', icon: <Wind size={13} /> },
  { id: 'temp_new', label: 'Temperatura', icon: <Thermometer size={13} /> },
];

// ─── Custom tooltip for recharts ─────────────────────────────────────────────
function HourlyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-input)', padding: '8px 12px',
      fontFamily: 'var(--font-family-primary)', fontSize: 12,
      boxShadow: 'var(--elevation-sm)',
    }}>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name === 'temp' ? `${Math.round(p.value)}°C` : `${Math.round(p.value * 100)}% lluvia`}
        </p>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Clima() {
  const { id } = useParams<{ id: string }>();
  const { getOperativo } = useApp();
  const operativo = getOperativo(id!);
  if (!operativo) return null;

  // Unique IDs for SVG defs — prevents recharts duplicate-key warnings
  // when the same static string is used as a React key internally.
  const gradientId = useId().replace(/:/g, '-');

  const puntoCero = operativo.puntos.find(p => p.tipo === 'puntoCero')
    ?? operativo.puntos[0];
  const lat = puntoCero?.lat ?? -31.993;
  const lng = puntoCero?.lng ?? -64.923;
  const locationName = puntoCero?.nombre ?? operativo.ubicacion;

  // ─── Weather state ───────────────────────────────────────────────────────
  const [weather, setWeather] = useState<OWMWeather>(mockCurrentWeather());
  const [forecast, setForecast] = useState<OWMForecastItem[]>(mockForecast());
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ─── Radar state ─────────────────────────────────────────────────────────
  const [rainViewerData, setRainViewerData] = useState<RainViewerData | null>(null);
  const [frames, setFrames] = useState<FrameWithHost[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimSpeed>('normal');
  const [radarOpacity, setRadarOpacity] = useState(0.7);
  const [loadingRadar, setLoadingRadar] = useState(true);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Map overlay ─────────────────────────────────────────────────────────
  const [owmLayer, setOwmLayer] = useState<OWMLayer>('none');

  // ─── Fetch weather data ──────────────────────────────────────────────────
  const loadWeather = useCallback(async () => {
    setLoadingWeather(true);
    const [w, f] = await Promise.all([
      fetchCurrentWeather(lat, lng),
      fetchForecast(lat, lng),
    ]);
    setWeather(w);
    setForecast(f);
    setLastUpdated(new Date());
    setLoadingWeather(false);
  }, [lat, lng]);

  // ─── Fetch RainViewer frames ──────────────────────────────────────────────
  const loadRadar = useCallback(async () => {
    setLoadingRadar(true);
    const data = await fetchRainViewerData();
    setRainViewerData(data);
    if (data) {
      const allFrames: FrameWithHost[] = [
        ...data.radar.past.map(f => ({ ...f, host: data.host })),
        ...data.radar.nowcast.map(f => ({ ...f, host: data.host, isNowcast: true })),
      ];
      setFrames(allFrames);
      // Start at the last "past" frame (most recent before nowcast)
      setCurrentFrameIdx(data.radar.past.length - 1);
    }
    setLoadingRadar(false);
  }, []);

  useEffect(() => {
    loadWeather();
    loadRadar();
  }, [loadWeather, loadRadar]);

  // ─── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (isPlaying && frames.length > 0) {
      animRef.current = setInterval(() => {
        setCurrentFrameIdx(prev => {
          const next = prev + 1;
          if (next >= frames.length) {
            // Pause at end, restart from beginning after a moment
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, SPEED_MS[speed]);
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [isPlaying, speed, frames.length]);

  // ─── Alert logic ─────────────────────────────────────────────────────────
  const maxPop = forecast.reduce((m, f) => Math.max(m, f.pop), 0);
  const alertInfo = maxPop >= 0.7
    ? { msg: 'Probabilidad alta de lluvias en las próximas horas. Evaluar continuidad del operativo.', color: '#dc2626', bg: '#fee2e2', icon: '🔴' }
    : maxPop >= 0.45
    ? { msg: 'Lluvias moderadas previstas. Preparar equipo impermeable.', color: '#ca8a04', bg: '#fef9c3', icon: '🟡' }
    : null;

  // ─── Hourly chart data ────────────────────────────────────────────────────
  const hourlyData = forecast.slice(0, 8).map((f, idx) => ({
    dt: f.dt,
    hora: new Date(f.dt * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    horaKey: `${idx}-${f.dt}`,
    temp: Math.round(f.main.temp),
    pop: f.pop,
    icono: weatherCodeToEmoji(f.weather[0]?.id ?? 800),
  }));

  // Lookup map: horaKey → hora display string (used as tickFormatter in charts)
  const horaKeyLabel = Object.fromEntries(hourlyData.map(d => [d.horaKey, d.hora]));

  // ─── 5-day forecast (group by day) ───────────────────────────────────────
  const diasPronostico = (() => {
    const byDay: Record<string, OWMForecastItem[]> = {};
    forecast.forEach(f => {
      const key = new Date(f.dt * 1000).toLocaleDateString('es-AR', { weekday: 'short' });
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(f);
    });
    return Object.entries(byDay).slice(0, 5).map(([dia, items]) => ({
      dia: dia.charAt(0).toUpperCase() + dia.slice(1),
      max: Math.round(Math.max(...items.map(i => i.main.temp))),
      min: Math.round(Math.min(...items.map(i => i.main.temp))),
      pop: Math.round(Math.max(...items.map(i => i.pop)) * 100),
      desc: items[Math.floor(items.length / 2)]?.weather[0]?.description ?? '',
      icono: weatherCodeToEmoji(items[Math.floor(items.length / 2)]?.weather[0]?.id ?? 800),
    }));
  })();

  // ─── Current conditions cards ─────────────────────────────────────────────
  const condCards = [
    { label: 'Temperatura', value: `${Math.round(weather.temp)}°C`, icon: <Thermometer size={16} />, color: '#E54B4B' },
    { label: 'Sensación Térmica', value: `${Math.round(weather.feels_like)}°C`, icon: <Thermometer size={16} />, color: '#ca8a04' },
    { label: 'Humedad', value: `${weather.humidity}%`, icon: <Droplets size={16} />, color: '#2563eb' },
    { label: 'Viento', value: `${Math.round(weather.wind_speed * 3.6)} km/h ${windDirLabel(weather.wind_deg)}`, icon: <Wind size={16} />, color: '#FFA987' },
    { label: 'Visibilidad', value: `${(weather.visibility / 1000).toFixed(1)} km`, icon: <Eye size={16} />, color: '#16a34a' },
    { label: 'Presión', value: `${weather.pressure} hPa`, icon: <Gauge size={16} />, color: 'var(--muted-foreground)' },
  ];

  const nowcastStart = rainViewerData ? rainViewerData.radar.past.length : -1;

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'var(--font-family-primary)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', marginBottom: 4 }}>
            Condiciones Climáticas
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} style={{ color: 'var(--muted-foreground)' }} />
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              {locationName} · {lat.toFixed(3)}, {lng.toFixed(3)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
            Actualizado: {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            onClick={loadWeather}
            disabled={loadingWeather}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 'var(--radius-button)',
              background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
              opacity: loadingWeather ? 0.7 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: loadingWeather ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── API key notice ──────────────────────────────────────────────────── */}
      {!isOWMKeySet() && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 'var(--radius-input)', marginBottom: 16,
          background: 'rgba(255,169,135,0.15)', border: '1px solid rgba(255,169,135,0.4)',
        }}>
          <Key size={14} style={{ color: '#FFA987', flexShrink: 0 }} />
          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', margin: 0 }}>
            <strong>Modo demo:</strong> Mostrando datos simulados. Para datos reales, reemplazá{' '}
            <code style={{ background: 'var(--muted)', padding: '1px 5px', borderRadius: 4 }}>YOUR_OWM_API_KEY</code>{' '}
            en <code style={{ background: 'var(--muted)', padding: '1px 5px', borderRadius: 4 }}>src/app/services/weatherService.ts</code>.
            El radar de precipitación usa RainViewer (siempre activo, sin API key).
          </p>
        </div>
      )}

      {/* ── Alert banner ────────────────────────────────────────────────────── */}
      {alertInfo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 'var(--radius-card)', marginBottom: 20,
          background: alertInfo.bg, border: `1px solid ${alertInfo.color}40`,
        }}>
          <AlertTriangle size={16} style={{ color: alertInfo.color, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: alertInfo.color, marginBottom: 2 }}>
              {alertInfo.icon} Alerta Meteorológica
            </p>
            <p style={{ fontSize: 'var(--text-label)', color: alertInfo.color, margin: 0 }}>{alertInfo.msg}</p>
          </div>
        </div>
      )}

      {/* ── Radar Map Section ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)', marginBottom: 20, overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudRain size={16} style={{ color: 'var(--primary)' }} />
            <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
              Radar de Precipitación
            </h3>
            {loadingRadar && (
              <span style={{
                fontSize: 11, color: 'var(--muted-foreground)',
                background: 'var(--muted)', borderRadius: 999, padding: '2px 8px',
              }}>
                Cargando radar…
              </span>
            )}
            {!loadingRadar && frames.length > 0 && (
              <span style={{
                fontSize: 11, color: '#16a34a',
                background: 'rgba(22,163,74,0.1)', borderRadius: 999, padding: '2px 8px',
              }}>
                ● En vivo · {frames.length} frames
              </span>
            )}
          </div>

          {/* OWM layer selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Layers size={13} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginRight: 2 }}>Capa:</span>
            {OWM_LAYERS.map(l => (
              <button
                key={l.id}
                onClick={() => setOwmLayer(l.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 999,
                  border: owmLayer === l.id ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  background: owmLayer === l.id ? 'rgba(229,75,75,0.08)' : 'var(--background)',
                  color: owmLayer === l.id ? 'var(--primary)' : 'var(--muted-foreground)',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-family-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                  transition: 'all 0.13s',
                }}
              >
                {l.icon}
                {l.label}
                {l.id !== 'none' && !isOWMKeySet() && (
                  <Key size={9} style={{ opacity: 0.5 }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ padding: '0' }}>
          <WeatherRadarMap
            lat={lat}
            lng={lng}
            locationName={locationName}
            frames={frames}
            currentFrameIdx={currentFrameIdx}
            radarOpacity={radarOpacity}
            owmLayer={owmLayer}
            zoom={8}
          />
        </div>

        {/* ── Timeline controls ─────────────────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>

          {/* Time label row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                padding: '3px 10px', borderRadius: 999,
                background: frames[currentFrameIdx]?.isNowcast
                  ? 'rgba(37,99,235,0.12)' : 'rgba(229,75,75,0.1)',
                color: frames[currentFrameIdx]?.isNowcast ? '#2563eb' : 'var(--primary)',
                fontSize: 11, fontWeight: 'var(--font-weight-semibold)',
              }}>
                {frames[currentFrameIdx]?.isNowcast ? '🔮 Pronóstico' : '📡 Pasado'}
              </div>
              <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                {frames[currentFrameIdx] ? formatFrameTime(frames[currentFrameIdx].time) : '—'}
              </span>
              {frames[currentFrameIdx] && (
                <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>
                  {new Date(frames[currentFrameIdx].time * 1000).toLocaleString('es-AR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            {/* Speed + Opacity controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Opacidad</span>
                <input
                  type="range" min={0.2} max={1} step={0.1}
                  value={radarOpacity}
                  onChange={e => setRadarOpacity(Number(e.target.value))}
                  style={{ width: 70, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Vel:</span>
                {(['slow', 'normal', 'fast'] as AnimSpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      padding: '3px 8px', borderRadius: 999,
                      border: speed === s ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                      background: speed === s ? 'rgba(229,75,75,0.1)' : 'transparent',
                      color: speed === s ? 'var(--primary)' : 'var(--muted-foreground)',
                      cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-family-primary)',
                    }}
                  >
                    {s === 'slow' ? 'Lenta' : s === 'normal' ? 'Normal' : 'Rápida'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrubber */}
          {frames.length > 0 && (
            <div style={{ marginBottom: 10, position: 'relative' }}>
              {/* Nowcast divider line */}
              {nowcastStart > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${(nowcastStart / frames.length) * 100}%`,
                  top: 0, bottom: 0, width: 2,
                  background: 'rgba(37,99,235,0.4)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }} />
              )}
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={currentFrameIdx}
                onChange={e => {
                  setCurrentFrameIdx(Number(e.target.value));
                  setIsPlaying(false);
                }}
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', height: 6 }}
              />
              {/* Time labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                  {frames[0] ? formatFrameTime(frames[0].time) : ''}
                </span>
                {nowcastStart > 0 && (
                  <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 'var(--font-weight-semibold)' }}>
                    ↑ Pronóstico
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                  {frames[frames.length - 1] ? formatFrameTime(frames[frames.length - 1].time) : ''}
                </span>
              </div>
            </div>
          )}

          {/* Playback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setCurrentFrameIdx(0); setIsPlaying(false); }}
              style={btnStyle}
            >
              <SkipBack size={15} />
            </button>
            <button
              onClick={() => setCurrentFrameIdx(i => Math.max(0, i - 1))}
              style={btnStyle}
            >
              <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              disabled={frames.length === 0}
              style={{
                ...btnStyle,
                background: isPlaying ? 'var(--primary)' : 'var(--foreground)',
                color: '#fff',
                padding: '7px 18px',
                gap: 6,
                opacity: frames.length === 0 ? 0.5 : 1,
              }}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </button>
            <button
              onClick={() => setCurrentFrameIdx(i => Math.min(frames.length - 1, i + 1))}
              style={btnStyle}
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => { setCurrentFrameIdx(frames.length - 1); setIsPlaying(false); }}
              style={btnStyle}
            >
              <SkipForward size={15} />
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={loadRadar}
              style={{ ...btnStyle, gap: 5, fontSize: 11, color: 'var(--muted-foreground)' }}
            >
              <RefreshCw size={12} />
              Refrescar radar
            </button>
          </div>

          {/* Radar color legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 14,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginRight: 4 }}>
              <Info size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              Intensidad:
            </span>
            {RADAR_LEGEND.map(e => (
              <div key={e.color} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: e.color, border: '1px solid rgba(0,0,0,0.15)' }} />
                <span style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Current conditions grid ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)', padding: '20px', marginBottom: 20,
      }}>
        {/* Big temp + description */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 52, lineHeight: 1 }}>
              {weatherCodeToEmoji(weather.weather[0]?.id ?? 800)}
            </span>
            <div>
              <p style={{ color: 'var(--foreground)', fontSize: 48, fontWeight: 'var(--font-weight-bold)', lineHeight: 1, fontFamily: 'var(--font-family-primary)' }}>
                {Math.round(weather.temp)}°
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', textTransform: 'capitalize' }}>
                {weather.weather[0]?.description ?? 'despejado'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 16px', borderRadius: 'var(--radius-input)',
              background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.2)',
            }}>
              <p style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', marginBottom: 2 }}>
                Recomendación operativa
              </p>
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>
                {weather.temp < 5 ? '🧥 Equipo de abrigo obligatorio' :
                 weather.temp < 12 ? '🧥 Abrigo recomendado' :
                 weather.temp > 32 ? '💧 Hidratación frecuente' :
                 maxPop > 0.6 ? '☔ Impermeables y botas de lluvia' :
                 '✅ Condiciones favorables'}
              </p>
            </div>
            {/* Wind compass */}
            <div style={{
              padding: '10px 16px', borderRadius: 'var(--radius-input)',
              background: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Navigation
                size={22}
                style={{ color: 'var(--primary)', transform: `rotate(${weather.wind_deg}deg)`, transition: 'transform 0.5s' }}
              />
              <div>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {Math.round(weather.wind_speed * 3.6)} km/h {windDirLabel(weather.wind_deg)}
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>Dirección del viento</p>
              </div>
            </div>
          </div>
        </div>

        {/* 6 metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {condCards.map(card => (
            <div key={card.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 'var(--radius-input)',
              background: 'var(--muted)',
            }}>
              <div style={{ color: card.color, flexShrink: 0 }}>{card.icon}</div>
              <div>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.2 }}>
                  {card.value}
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 10, marginTop: 1 }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hourly forecast chart ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)', padding: '20px', marginBottom: 20,
      }}>
        <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 16 }}>
          Pronóstico por horas
        </h3>

        {/* Temperature area chart */}
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart key="clima-area-temp" data={hourlyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E54B4B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E54B4B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="horaKey"
              tick={false}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}°`}
              width={32}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entry = hourlyData.find(d => d.horaKey === label);
                const horaStr = entry?.hora ?? label;
                return (
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)', padding: '8px 12px',
                    fontFamily: 'var(--font-family-primary)', fontSize: 12,
                    boxShadow: 'var(--elevation-sm)',
                  }}>
                    <p style={{ color: 'var(--muted-foreground)', marginBottom: 2 }}>{horaStr}</p>
                    <p style={{ color: '#E54B4B' }}>{Math.round(payload[0].value as number)}°C</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="temp"
              name="temperatura"
              stroke="#E54B4B"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: '#E54B4B', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Precipitation probability bar chart */}
        <ResponsiveContainer width="100%" height={60}>
          <BarChart key="clima-bar-pop" data={hourlyData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={18}>
            <XAxis
              dataKey="horaKey"
              tickFormatter={(v: string) => horaKeyLabel[v] ?? v}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={[0, 1]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)', padding: '8px 12px',
                    fontFamily: 'var(--font-family-primary)', fontSize: 12,
                    boxShadow: 'var(--elevation-sm)',
                  }}>
                    <p style={{ color: 'var(--muted-foreground)', marginBottom: 2 }}>{label}</p>
                    <p style={{ color: '#2563eb' }}>{Math.round((payload[0].value as number) * 100)}% lluvia</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="pop"
              name="precipitacion"
              fill="#2563eb"
              opacity={0.3}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: '#E54B4B' }} />
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Temperatura</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(37,99,235,0.3)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Prob. lluvia</span>
          </div>
        </div>
      </div>

      {/* ── 5-day forecast ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)', padding: '20px',
      }}>
        <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 16 }}>
          Pronóstico 5 días
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {diasPronostico.map((d, i) => (
            <div key={`${d.dia}-${i}`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 8px', borderRadius: 'var(--radius-input)',
              background: i === 0 ? 'rgba(229,75,75,0.06)' : 'var(--muted)',
              border: i === 0 ? '1.5px solid rgba(229,75,75,0.3)' : '1.5px solid transparent',
            }}>
              <p style={{
                color: i === 0 ? 'var(--primary)' : 'var(--muted-foreground)',
                fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
              }}>
                {i === 0 ? 'Hoy' : d.dia}
              </p>
              <span style={{ fontSize: 26 }}>{d.icono}</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                  {d.max}°
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{d.min}°</p>
              </div>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10,
                    color: d.pop >= 60 ? '#dc2626' : d.pop >= 30 ? '#ca8a04' : '#16a34a',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}>
                    🌧️ {d.pop}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'var(--border)' }}>
                  <div style={{
                    height: 4, borderRadius: 999,
                    width: `${d.pop}%`,
                    background: d.pop >= 60 ? '#dc2626' : d.pop >= 30 ? '#ca8a04' : '#16a34a',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 9, textAlign: 'center', textTransform: 'capitalize', lineHeight: 1.3 }}>
                {d.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attribution ──────────────────────────────────────────────────────── */}
      <p style={{ marginTop: 16, color: 'var(--muted-foreground)', fontSize: 11, textAlign: 'right' }}>
        Radar: © <a href="https://rainviewer.com" target="_blank" rel="noreferrer" style={{ color: 'var(--muted-foreground)' }}>RainViewer</a>
        {isOWMKeySet() && (
          <> · Clima: © <a href="https://openweathermap.org" target="_blank" rel="noreferrer" style={{ color: 'var(--muted-foreground)' }}>OpenWeatherMap</a></>
        )}
        {' '}· Mapa: © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'var(--muted-foreground)' }}>OpenStreetMap</a>
      </p>
    </div>
  );
}

// ─── Shared button style ──────────────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  padding: '7px 10px', borderRadius: 'var(--radius-button)',
  border: '1.5px solid var(--border)', background: 'var(--background)',
  color: 'var(--foreground)', cursor: 'pointer',
  fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)',
  fontWeight: 'var(--font-weight-semibold)',
  transition: 'background 0.13s',
};