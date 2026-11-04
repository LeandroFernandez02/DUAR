/**
 * Portal del Agente — «Mi sector» (diseño CALÍVAR, 23/10): el polígono asignado a mi grupo,
 * para ubicarse en el terreno. Nombre, área, notas del coordinador, las coordenadas de los
 * vértices (para cargar en el GPS) y un mapa chico con la forma. Sólo lectura: el polígono
 * lo dibuja y lo asigna el coordinador (CU-30/30). Sin grupo o sin polígono no se muestra.
 *
 * El Líder del grupo, además (pedido del 03/11), marca puntos de interés y hallazgos en su sector,
 * con fotos, y ve los que ya hay en el polígono (en la lista y en el mapa). Lo que marcó sin señal
 * queda «Pendiente de envío» hasta que vuelve la conexión. Los demás integrantes no ven esta parte.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ChevronDown, ChevronUp, List, Map as MapaIcono, Pentagon, Plus, CloudOff, AlertCircle, Camera, Check, X, Trash2,
} from 'lucide-react';
import { portalApi, type MarcadorApi, type MiSectorApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { tarjetaBase } from '../shared/Listados';
import { rotuloPortal } from './PanelTactico';
import MarcarPunto, { SumarFotos, CLASE_INFO, FOTOS_MAX } from './MarcarPunto';
import { descartar, enviarPendientes, escucharCola, listarPendientes, type Pendiente } from '../../utils/colaPortal';
import { fechaHoraArgentina } from '../../utils/fechaArgentina';

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

function MapaSector({ pts, marcadores = [] }: { pts: [number, number][]; marcadores?: MarcadorApi[] }) {
  const el = useRef<HTMLDivElement>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!el.current || pts.length < 3) return;
    const mapa = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imágenes &copy; Esri', maxZoom: 19 }).addTo(mapa);
    const forma = L.polygon(pts, { color: '#00c2b3', weight: 2.5, fillOpacity: 0.18 }).addTo(mapa);
    mapa.fitBounds(forma.getBounds(), { padding: [16, 16] });
    capa.current = L.layerGroup().addTo(mapa);
    return () => { mapa.remove(); capa.current = null; };
  }, [pts]);
  // Los puntos del sector (sólo para el Líder): se redibujan los marcadores, no el mapa.
  useEffect(() => {
    const c = capa.current;
    if (!c) return;
    c.clearLayers();
    for (const m of marcadores) {
      const color = CLASE_INFO[m.clase === 'HALLAZGO' ? 'HALLAZGO' : 'POI'].color;
      L.circleMarker([m.lat, m.lng], { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindTooltip(m.nombre).addTo(c);
    }
  }, [marcadores, pts]);
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

const chico = { margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.4 } as const;

function Aviso({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2" aria-live="polite"
      style={{ borderRadius: 'var(--radius-input)', background: 'color-mix(in srgb, #16a34a calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)', border: '1px solid color-mix(in srgb, #16a34a 30%, transparent)', color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)', fontSize: 'calc(11.5px * var(--escala-texto))', lineHeight: 1.45 }}>
      <Check size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span className="flex-1">{texto}</span>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={12} /></button>
    </div>
  );
}

function ChipClase({ clase }: { clase: string }) {
  const c = CLASE_INFO[clase === 'HALLAZGO' ? 'HALLAZGO' : 'POI'];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
      style={{ fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600, color: c.color, background: `color-mix(in srgb, ${c.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c.color} 35%, transparent)` }}>
      <c.icono size={10} />{c.label}
    </span>
  );
}

const fotosTexto = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`;

/** Lo que el Líder marcó y todavía no llegó (o que la API rechazó). */
function FilaPendiente({ p }: { p: Pendiente }) {
  const detalle = p.error
    ? `No se cargó: ${p.error}`
    : p.tipo === 'fotos'
      ? `${fotosTexto(p.fotos.length)} pendientes de envío`
      : `Pendiente de envío · marcado ${fechaHoraArgentina(p.datos?.ocurridoEn ?? p.guardadoEn)}${p.fotos.length ? ` · ${fotosTexto(p.fotos.length)}` : ''}`;
  return (
    <li className="flex items-start gap-2 px-2.5 py-2" style={{ borderRadius: 'var(--radius-input)', background: 'var(--muted)', border: `1px dashed ${p.error ? 'var(--destructive)' : 'var(--border)'}` }}>
      {p.error
        ? <AlertCircle size={14} style={{ color: 'var(--destructive)', flexShrink: 0, marginTop: 2 }} />
        : <CloudOff size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 2 }} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 600 }}>{p.nombre}</span>
          <ChipClase clase={p.clase} />
        </div>
        <p style={chico}>{detalle}</p>
      </div>
      {p.error && (
        <button type="button" aria-label={`Descartar ${p.nombre}`} title="Descartar" onClick={() => descartar(p.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 4 }}><Trash2 size={14} /></button>
      )}
    </li>
  );
}

function FilaMarcador({ m, propio, onSumarFotos }: { m: MarcadorApi; propio: boolean; onSumarFotos: () => void }) {
  return (
    <li className="flex items-start gap-2 px-2.5 py-2" style={{ borderRadius: 'var(--radius-input)', background: 'var(--muted)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 600 }}>{m.nombre}</span>
          <ChipClase clase={m.clase} />
          {m.fueraPoligonoM !== null && <span style={{ ...chico, color: '#b45309', fontWeight: 600 }}>Fuera del polígono</span>}
        </div>
        {m.descripcion && <p style={{ ...chico, color: 'var(--foreground)' }}>{m.descripcion}</p>}
        <p style={chico}>{fechaHoraArgentina(m.ocurridoEn ?? m.creadoEn)} · {m.creadoPor ?? '—'}{m.fotos.length ? ` · ${fotosTexto(m.fotos.length)}` : ''}</p>
        {m.fotos.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 overflow-x-auto">
            {m.fotos.map(f => f.url && (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                <img src={f.url} alt={`Foto de ${m.nombre}`} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
              </a>
            ))}
          </div>
        )}
      </div>
      {propio && m.fotos.length < FOTOS_MAX && (
        <button type="button" onClick={onSumarFotos} aria-label={`Sumar fotos a ${m.nombre}`} title="Sumar fotos"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0 }}>
          <Camera size={15} />
        </button>
      )}
    </li>
  );
}

export default function MiSector() {
  const { usuario } = useApp();
  const [sector, setSector] = useState<MiSectorApi | null>(null);
  const [soyLider, setSoyLider] = useState(false);
  const [ver, setVer] = useState<'coordenadas' | 'mapa' | null>(null);
  const [marcadores, setMarcadores] = useState<MarcadorApi[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [marcar, setMarcar] = useState(false);
  const [sumarA, setSumarA] = useState<MarcadorApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarMarcadores = useCallback(async () => {
    try { setMarcadores((await portalApi.misMarcadores()).marcadores); } catch { /* sin señal: queda la última lista */ }
  }, []);

  const cargar = useCallback(async () => {
    try {
      const r = await portalApi.miSector();
      setSector(r.sector);
      setSoyLider(!!r.soyLider);
      if (r.sector && r.soyLider) await cargarMarcadores();
    } catch { /* sin señal: queda lo último que se vio */ }
  }, [cargarMarcadores]);

  // La cola del celular: se muestra siempre (aunque el grupo ya no tenga el sector, para ver qué no
  // llegó) y se manda al abrir, al volver la señal y en cada refresco.
  const verCola = useCallback(async () => setPendientes(await listarPendientes()), []);
  const mandarCola = useCallback(async () => {
    if ((await enviarPendientes()) > 0) await cargarMarcadores();
  }, [cargarMarcadores]);

  useEffect(() => { cargar(); verCola(); mandarCola(); }, [cargar, verCola, mandarCola]);
  useEffect(() => escucharCola(verCola), [verCola]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') { cargar(); mandarCola(); } }, INTERVALO_MS);
    const alVolver = () => { cargar(); mandarCola(); };
    window.addEventListener('online', alVolver);
    return () => { clearInterval(id); window.removeEventListener('online', alVolver); };
  }, [cargar, mandarCola]);

  // Memorizado: el mapa chico se re-arma sólo si cambia la forma, no en cada refresco.
  const clave = sector ? JSON.stringify(sector.geometria.coordinates) : '';
  const pts = useMemo(() => (sector ? vertices(sector) : []), [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sector) {
    // Sin sector pero con algo sin mandar (el grupo ya volvió a la base): igual se muestra.
    if (!pendientes.length) return null;
    return (
      <section className="p-4 flex flex-col gap-3" style={tarjetaBase} aria-label="Pendientes de envío">
        <p style={rotuloPortal}>Pendientes de envío</p>
        <ul className="flex flex-col gap-1.5" style={{ margin: 0, padding: 0, listStyle: 'none' }}>{pendientes.map(p => <FilaPendiente key={p.id} p={p} />)}</ul>
      </section>
    );
  }

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
      {ver === 'mapa' && <MapaSector pts={pts} marcadores={soyLider ? marcadores : []} />}

      {/* ── Sólo el Líder: puntos de interés y hallazgos del sector (03/11) ── */}
      {(soyLider || pendientes.length > 0) && (
        <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="flex items-center justify-between gap-2">
            <p style={rotuloPortal}>Puntos de interés y hallazgos</p>
            {soyLider && marcadores.length > 0 && <span style={chico}>{marcadores.length}</span>}
          </div>
          {aviso && <Aviso texto={aviso} onCerrar={() => setAviso(null)} />}
          {soyLider && (
            <button type="button" onClick={() => { setAviso(null); setMarcar(true); }}
              className="flex items-center justify-center gap-2"
              style={{ minHeight: 48, borderRadius: 'var(--radius-input)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={16} />Marcar punto o hallazgo
            </button>
          )}
          {pendientes.length > 0 && (
            <ul className="flex flex-col gap-1.5" style={{ margin: 0, padding: 0, listStyle: 'none' }}>{pendientes.map(p => <FilaPendiente key={p.id} p={p} />)}</ul>
          )}
          {soyLider && (marcadores.length === 0 && pendientes.length === 0 ? (
            <p style={chico}>Todavía no hay nada marcado en este sector. Lo que marques lo ve el coordinador en el mapa del operativo.</p>
          ) : (
            <ul className="flex flex-col gap-1.5" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {marcadores.map(m => (
                <FilaMarcador key={m.id} m={m} propio={m.creadoPorId === usuario?.id}
                  onSumarFotos={() => { setAviso(null); setSumarA(m); }} />
              ))}
            </ul>
          ))}
        </div>
      )}

      {marcar && (
        <MarcarPunto sector={sector} onClose={() => setMarcar(false)}
          onGuardado={m => { setMarcar(false); setAviso(m); }} />
      )}
      {sumarA && (
        <SumarFotos marcador={sumarA} onClose={() => setSumarA(null)}
          onGuardado={m => { setSumarA(null); setAviso(m); }} />
      )}
    </section>
  );
}
