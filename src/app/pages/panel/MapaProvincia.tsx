import { useState } from 'react';
import { Flame, Radio, Users, UserCheck, CalendarDays, Target, AlertTriangle, MapPin, Flag, Clock } from 'lucide-react';
import { CONTORNO_CORDOBA } from '../../data/contornoCordoba';
import type { OperativoPanel } from '../../utils/panelGeneral';
import { ETIQUETA_ESTADO, ETIQUETA_RESULTADO, formatoDuracion } from '../../utils/panelGeneral';

/**
 * Mapa ilustrado de la provincia de Córdoba (panel general, versión 2). No usa mapa
 * de fondo: es el contorno de la provincia (IGN) dibujado en SVG, con algunas ciudades
 * de referencia, y dos vistas:
 *  · Mapa de calor: cada operativo del historial suma un halo rojo en su zona; donde
 *    se repiten búsquedas el color se intensifica (un solo tono, escala secuencial).
 *  · Operativos en curso: el Punto Cero de cada operativo activo; al tocarlo se ven
 *    sus datos al costado (agentes, coordinador a cargo, inicio, qué se busca…).
 */

// Proyección simple (equirrectangular corregida por la latitud media): alcanza para una provincia.
const lons = CONTORNO_CORDOBA.map(p => p[0]);
const lats = CONTORNO_CORDOBA.map(p => p[1]);
const MIN_LON = Math.min(...lons), MAX_LON = Math.max(...lons);
const MIN_LAT = Math.min(...lats), MAX_LAT = Math.max(...lats);
const K = Math.cos(((MIN_LAT + MAX_LAT) / 2) * Math.PI / 180);
const ESCALA = 112;          // px por grado de latitud
const PAD = 14;
const W = Math.round((MAX_LON - MIN_LON) * K * ESCALA + PAD * 2);
const H = Math.round((MAX_LAT - MIN_LAT) * ESCALA + PAD * 2);
const xy = (lat: number, lon: number): [number, number] => [PAD + (lon - MIN_LON) * K * ESCALA, PAD + (MAX_LAT - lat) * ESCALA];
const CONTORNO = CONTORNO_CORDOBA.map(([lon, lat], i) => `${i ? 'L' : 'M'}${xy(lat, lon).map(n => n.toFixed(1)).join(' ')}`).join(' ') + ' Z';

const CIUDADES: { nombre: string; lat: number; lon: number; ancla?: 'start' | 'end' }[] = [
  { nombre: 'Córdoba', lat: -31.417, lon: -64.183 },
  { nombre: 'Río Cuarto', lat: -33.13, lon: -64.35 },
  { nombre: 'Villa María', lat: -32.41, lon: -63.24 },
  { nombre: 'San Francisco', lat: -31.43, lon: -62.08, ancla: 'end' },
  { nombre: 'Villa Dolores', lat: -31.95, lon: -65.19, ancla: 'end' },
  { nombre: 'Cruz del Eje', lat: -30.73, lon: -64.8 },
  { nombre: 'Laboulaye', lat: -34.13, lon: -63.39 },
];

type Vista = 'calor' | 'curso';

/**
 * `puntos`: los operativos que se marcan con su Punto Cero (los en curso si se mira hoy; los del
 * período si se mira un año o un mes). `historial`: los que suman calor. Los elige el panel según
 * la línea de tiempo.
 */
export default function MapaProvincia({ historial, puntos, etiquetaPuntos, isDark, encabezado }: {
  historial: OperativoPanel[]; puntos: OperativoPanel[]; etiquetaPuntos: string; isDark: boolean; encabezado?: React.ReactNode;
}) {
  const [vista, setVista] = useState<Vista>('curso');
  const enCurso = puntos;
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [sobre, setSobre] = useState<{ o: OperativoPanel; x: number; y: number } | null>(null);
  const elegido = enCurso.find(o => o.id === elegidoId) ?? enCurso[0] ?? null;

  const rojo = isDark ? '#ff6b6b' : '#d63a3a';
  const tierra = isDark ? '#2f2b29' : '#f6f1ef';
  const borde = isDark ? 'rgba(247,235,232,0.35)' : 'rgba(68,65,64,0.35)';
  const textoCiudad = isDark ? 'rgba(247,235,232,0.6)' : 'rgba(68,65,64,0.6)';

  return (
    <div className="flex flex-col lg:h-full min-h-0">
      {/* Selector de vista y leyenda en una sola línea, para dejarle la altura al mapa */}
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap mb-3">
        {encabezado}
        <div className="inline-flex p-1 rounded-[var(--radius-button)]" style={{ background: 'var(--muted)' }} role="tablist">
          {([['curso', etiquetaPuntos, Radio], ['calor', 'Mapa de calor', Flame]] as const).map(([v, t, I]) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)]"
              style={{ background: vista === v ? 'var(--card)' : 'transparent', boxShadow: vista === v ? 'var(--elevation-sm)' : 'none',
                color: vista === v ? 'var(--foreground)' : 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <I size={14} /> {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
          {vista === 'calor' ? (
            <span className="inline-flex items-center gap-1.5">
              <span style={{ width: 44, height: 7, borderRadius: 4, background: `linear-gradient(90deg, ${rojo}22, ${rojo})` }} />
              menos → más operativos ({historial.length} en el período)
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5"><span style={{ width: 9, height: 9, borderRadius: 5, background: rojo }} />Punto Cero</span>
              <span className="inline-flex items-center gap-1.5"><span style={{ width: 7, height: 7, borderRadius: 4, background: '#d97706' }} />sin coordinador a cargo</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 lg:flex-1 min-h-0">
        {/* El mapa toma toda la altura disponible y su ancho sale de la proporción de la provincia */}
        <div className="relative mx-auto md:mx-0 shrink-0 w-full md:w-[46%] lg:w-auto lg:h-full" style={{ aspectRatio: `${W} / ${H}`, maxWidth: '100%' }}>
          <svg viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} className="w-full h-full" role="img"
            aria-label={vista === 'calor' ? `Mapa de calor de ${historial.length} operativos en la provincia de Córdoba` : `${enCurso.length} operativos (${etiquetaPuntos.toLowerCase()}) en la provincia de Córdoba`}>
            <defs>
              <clipPath id="recorte-cordoba"><path d={CONTORNO} /></clipPath>
              <radialGradient id="calor">
                <stop offset="0%" stopColor={rojo} stopOpacity={0.55} />
                <stop offset="100%" stopColor={rojo} stopOpacity={0} />
              </radialGradient>
            </defs>
            <path d={CONTORNO} fill={tierra} stroke={borde} strokeWidth={1.4} strokeLinejoin="round" />

            {vista === 'calor' && (
              <g clipPath="url(#recorte-cordoba)" style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}>
                {historial.map(o => {
                  const [x, y] = xy(o.puntoCero[0], o.puntoCero[1]);
                  return <circle key={o.id} cx={x} cy={y} r={16} fill="url(#calor)" />;
                })}
              </g>
            )}

            {CIUDADES.map(c => {
              const [x, y] = xy(c.lat, c.lon);
              return (
                <g key={c.nombre}>
                  <circle cx={x} cy={y} r={2.2} fill={textoCiudad} />
                  <text x={c.ancla === 'end' ? x - 5 : x + 5} y={y + 3.5} textAnchor={c.ancla ?? 'start'}
                    style={{ fontSize: 10, fill: textoCiudad, fontFamily: 'var(--font-family-primary)' }}>{c.nombre}</text>
                </g>
              );
            })}

            {vista === 'curso' && enCurso.map(o => {
              const [x, y] = xy(o.puntoCero[0], o.puntoCero[1]);
              const activo = elegido?.id === o.id;
              return (
                <g key={o.id} style={{ cursor: 'pointer' }} onClick={() => setElegidoId(o.id)}
                  onMouseEnter={() => setSobre({ o, x, y })} onMouseLeave={() => setSobre(null)}>
                  <circle cx={x} cy={y} r={14} fill="transparent" />
                  {activo && <circle cx={x} cy={y} r={11} fill={rojo} opacity={0.18} />}
                  <circle cx={x} cy={y} r={activo ? 7 : 5.5} fill={rojo} stroke={isDark ? '#1c1917' : '#fff'} strokeWidth={2} />
                  {!o.coordinador && o.estado !== 'FINALIZADO' && <circle cx={x + 6} cy={y - 6} r={3} fill="#d97706" stroke={isDark ? '#1c1917' : '#fff'} strokeWidth={1.2} />}
                </g>
              );
            })}
          </svg>

          {sobre && (
            <div className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg whitespace-nowrap"
              style={{ left: `${(sobre.x / W) * 100}%`, top: `${(sobre.y / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 12px))', zIndex: 5,
                background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontSize: 12, color: 'var(--foreground)' }}>
              <strong>{sobre.o.titulo}</strong><br />{sobre.o.localidad}
            </div>
          )}
        </div>

        {/* «Datos»: la ficha del operativo elegido (en curso) o dónde más se busca (calor). Si no entra, scrollea sola. */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {vista === 'curso'
            ? (elegido ? <Ficha o={elegido} /> : <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No hay operativos en este período.</p>)
            : <ZonasCalientes historial={historial} />}
        </div>
      </div>
    </div>
  );
}

function Dato({ icono: I, etiqueta, children }: { icono: typeof Users; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <I size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0">
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{etiqueta}</p>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)' }}>{children}</div>
      </div>
    </div>
  );
}

function Ficha({ o }: { o: OperativoPanel }) {
  const inicio = new Date(o.inicio);
  const dia = Math.floor((Date.now() - inicio.getTime()) / 86_400_000) + 1;
  const total = o.agentes.terreno + o.agentes.base + o.agentes.noDisponible;
  const fecha = (d: Date) => `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  if (o.estado === 'FINALIZADO' && o.fin) {
    const fin = new Date(o.fin);
    return (
      <div className="rounded-[var(--radius-card)] p-4 flex flex-col gap-3.5" style={{ background: 'var(--muted)' }}>
        <div>
          <p style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{o.titulo}</p>
          <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
            <MapPin size={12} /> {o.localidad} · Finalizado
          </p>
        </div>
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5">
          <Dato icono={Flag} etiqueta="Resultado">{o.resultado ? ETIQUETA_RESULTADO[o.resultado] : 'Sin dato'}</Dato>
          <Dato icono={CalendarDays} etiqueta="Inicio">{fecha(inicio)}</Dato>
          <Dato icono={CalendarDays} etiqueta="Fin">{fecha(fin)}</Dato>
          <Dato icono={Clock} etiqueta="Duración">{formatoDuracion((fin.getTime() - inicio.getTime()) / 3_600_000)}</Dato>
          <Dato icono={Target} etiqueta={o.objetivo?.tipo === 'objeto' ? 'Objeto buscado' : 'Persona buscada'}>
            {o.objetivo?.descripcion ?? <span style={{ color: 'var(--muted-foreground)' }}>Sin ficha cargada</span>}
          </Dato>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-card)] p-4 flex flex-col gap-3.5" style={{ background: 'var(--muted)' }}>
      <div>
        <p style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{o.titulo}</p>
        <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
          <MapPin size={12} /> {o.localidad} · {ETIQUETA_ESTADO[o.estado]} · Día {dia}
        </p>
      </div>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5">
        <Dato icono={UserCheck} etiqueta="Coordinador a cargo">
          {o.coordinador ?? <span className="inline-flex items-center gap-1" style={{ color: '#b45309' }}><AlertTriangle size={13} /> Sin coordinador a cargo</span>}
        </Dato>
        <Dato icono={CalendarDays} etiqueta="Inicio">
          {fecha(inicio)}
        </Dato>
        <Dato icono={Users} etiqueta="Agentes en el operativo">
          <strong>{total}</strong>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}> · {o.agentes.terreno} en el terreno, {o.agentes.base} en la base{o.agentes.noDisponible ? `, ${o.agentes.noDisponible} no disponibles` : ''}</span>
        </Dato>
        <Dato icono={Radio} etiqueta="Grupos">
          {o.grupos.total} <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>· {o.grupos.enTerreno} en el terreno</span>
        </Dato>
        <Dato icono={Target} etiqueta={o.objetivo?.tipo === 'objeto' ? 'Objeto buscado' : 'Persona buscada'}>
          {o.objetivo?.descripcion ?? <span style={{ color: 'var(--muted-foreground)' }}>Sin ficha cargada</span>}
        </Dato>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Con datos reales, desde acá se va a poder entrar al panel del operativo.</p>
    </div>
  );
}

/** En la vista de calor, al costado: las localidades con más operativos. */
function ZonasCalientes({ historial }: { historial: OperativoPanel[] }) {
  const porLocalidad = new Map<string, number>();
  for (const o of historial) porLocalidad.set(o.localidad, (porLocalidad.get(o.localidad) ?? 0) + 1);
  const top = [...porLocalidad].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...top.map(t => t[1]));
  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--muted)' }}>
      <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>Dónde más se busca</p>
      <p className="mb-3" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Localidades con más operativos en el período</p>
      <ul className="flex flex-col gap-2.5">
        {top.map(([loc, n]) => (
          <li key={loc}>
            <div className="flex justify-between mb-1" style={{ fontSize: 'var(--text-label)' }}>
              <span style={{ color: 'var(--foreground)' }}>{loc.replace(', Córdoba', '')}</span>
              <span className="tabular-nums" style={{ color: 'var(--foreground)', fontWeight: 600 }}>{n}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--card)' }}>
              <div style={{ width: `${(n / max) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--primary)' }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
