/**
 * Portal del Agente — «Mi sector» (diseño CALÍVAR, 23/10): el polígono asignado a mi grupo,
 * para ubicarse en el terreno. Nombre, área, notas del coordinador, las coordenadas de los
 * vértices (para cargar en el GPS) y un mapa chico con la forma. Sólo lectura: el polígono
 * lo dibuja y lo asigna el coordinador (CU-29/30). Sin grupo o sin polígono no se muestra.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, List, Map as MapaIcono, Pentagon } from 'lucide-react';
import { portalApi, type MiSectorApi } from '../../services/api';
import { tarjetaBase } from '../shared/Listados';
import { rotuloPortal } from './PanelTactico';

const INTERVALO_MS = 30_000;

/** Vértices [lat, lng] sin el punto de cierre que repite el primero. */
function vertices(s: MiSectorApi): [number, number][] {
  const anillo = s.geometria.coordinates[0] ?? [];
  const pts = anillo.map(([lng, lat]) => [lat, lng] as [number, number]);
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}

const area = (m2: number) => (m2 >= 1e6
  ? `${(m2 / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km²`
  : `${(m2 / 1e4).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ha`);

function MapaSector({ pts }: { pts: [number, number][] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current || pts.length < 3) return;
    const mapa = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imágenes &copy; Esri', maxZoom: 19 }).addTo(mapa);
    const forma = L.polygon(pts, { color: '#00c2b3', weight: 2.5, fillOpacity: 0.18 }).addTo(mapa);
    mapa.fitBounds(forma.getBounds(), { padding: [16, 16] });
    return () => { mapa.remove(); };
  }, [pts]);
  return <div ref={el} style={{ height: 240, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 0 }} aria-label="Mapa del sector" />;
}

function BotonDesplegar({ icono: I, abierto, onClick, children }: { icono: typeof List; abierto: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={abierto} className="flex items-center justify-center gap-2 flex-1"
      style={{ minHeight: 44, borderRadius: 'var(--radius-md)', border: `1px solid ${abierto ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600 }}>
      <I size={14} />{children}{abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

export default function MiSector() {
  const [sector, setSector] = useState<MiSectorApi | null>(null);
  const [ver, setVer] = useState<'coordenadas' | 'mapa' | null>(null);

  const cargar = useCallback(async () => {
    try { setSector((await portalApi.miSector()).sector); } catch { /* sin señal: queda lo último que se vio */ }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Memorizado: el mapa chico se re-arma sólo si cambia la forma, no en cada refresco.
  const clave = sector ? JSON.stringify(sector.geometria.coordinates) : '';
  const pts = useMemo(() => (sector ? vertices(sector) : []), [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sector) return null;

  return (
    <section className="p-4 flex flex-col gap-3" style={tarjetaBase} aria-labelledby="mi-sector-titulo">
      <p id="mi-sector-titulo" style={rotuloPortal}>Mi sector</p>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 min-w-0" style={{ margin: 0, fontSize: 'var(--text-h4)', fontWeight: 700, color: 'var(--foreground)' }}>
          <Pentagon size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} /><span className="truncate">{sector.nombre}</span>
        </p>
        <span style={{ fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{area(sector.areaM2)}</span>
      </div>
      {sector.notas && (
        <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{sector.notas}</p>
      )}
      <div className="flex gap-2">
        <BotonDesplegar icono={List} abierto={ver === 'coordenadas'} onClick={() => setVer(v => (v === 'coordenadas' ? null : 'coordenadas'))}>Ver coordenadas</BotonDesplegar>
        <BotonDesplegar icono={MapaIcono} abierto={ver === 'mapa'} onClick={() => setVer(v => (v === 'mapa' ? null : 'mapa'))}>Ver mapa</BotonDesplegar>
      </div>
      {ver === 'coordenadas' && (
        <ol className="flex flex-col gap-1" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {pts.map(([lat, lng], i) => (
            <li key={i} className="flex items-center gap-3" style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', fontFamily: 'var(--font-family-mono, monospace)', fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--foreground)' }}>
              <span style={{ color: 'var(--muted-foreground)', minWidth: 22 }}>V{i + 1}</span>
              <span>{lat.toFixed(5)}°, {lng.toFixed(5)}°</span>
            </li>
          ))}
        </ol>
      )}
      {ver === 'mapa' && <MapaSector pts={pts} />}
    </section>
  );
}
