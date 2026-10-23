import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Flame, Radio, Users, Calendar, MapPin, RadioTower, ArrowRight, Plus, Minus, Maximize2 } from 'lucide-react';
import { CONTORNO_CORDOBA } from '../../data/contornoCordoba';
import { DEPARTAMENTOS_CORDOBA, LOCALIDADES_CORDOBA } from '../../data/divisionesCordoba';
import type { OperativoPanel, EstadoOperativoPanel } from '../../utils/panelGeneral';
import { ESTADO_BADGE, ETIQUETA_ESTADO } from '../../utils/panelGeneral';
import StatusBadge, { colorDeEstado } from '../../components/shared/StatusBadge';
import { fechaHoraArgentina } from '../../utils/fechaArgentina';

/** Color de cada estado: el mismo del badge y de la tarjeta en la sección Operativos. */
const colorEstado = (e: EstadoOperativoPanel) => colorDeEstado(ESTADO_BADGE[e]);

/**
 * Mapa ilustrado de la provincia de Córdoba (panel general, versión 2). No usa mapa
 * de fondo: es el contorno de la provincia (IGN) dibujado en SVG, con algunas ciudades
 * de referencia, los 26 departamentos y, al acercarse, los radios de cada localidad
 * (municipios y comunas, IGN). Se acerca con la rueda del mouse, doble click o + / −,
 * y se mueve arrastrando. Dos vistas:
 *  · Mapa de calor: cada operativo del historial suma un halo rojo en su zona; donde
 *    se repiten búsquedas el color se intensifica (un solo tono, escala secuencial).
 *  · Operativos en curso: el Punto Cero de cada operativo, del color de su estado; al
 *    tocarlo se ve al costado la misma tarjeta que en la sección Operativos.
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
const trazo = (anillo: [number, number][]) => anillo.map(([lon, lat], i) => `${i ? 'L' : 'M'}${xy(lat, lon).map(n => n.toFixed(2)).join(' ')}`).join(' ') + ' Z';
const CONTORNO = trazo(CONTORNO_CORDOBA as [number, number][]);
const DEPARTAMENTOS = DEPARTAMENTOS_CORDOBA.map(d => ({ nombre: d.nombre, d: d.anillos.map(trazo).join(' ') }));
const LOCALIDADES = LOCALIDADES_CORDOBA.map(l => ({ ...l, d: l.anillos.map(trazo).join(' '), xy: xy(l.centro[1], l.centro[0]) }));

/** Zoom: de 1 (provincia entera) a 16. Desde 3,5 se leen los nombres de los municipios; desde 7, también los de las comunas. */
const ZOOM_MAX = 16;
const ZOOM_MUNICIPIOS = 3.5, ZOOM_COMUNAS = 7;
type Encuadre = { k: number; x: number; y: number };
const ENTERO: Encuadre = { k: 1, x: 0, y: 0 };
/** Acerca o aleja `factor` veces dejando quieto el punto (px, py) del mapa, sin que la provincia se salga del recuadro. */
function acercar(e: Encuadre, factor: number, px = W / 2, py = H / 2): Encuadre {
  const k = Math.min(ZOOM_MAX, Math.max(1, e.k * factor));
  return encuadrar({ k, x: px - (px - e.x) * (k / e.k), y: py - (py - e.y) * (k / e.k) });
}
function encuadrar(e: Encuadre): Encuadre {
  return { k: e.k, x: Math.min(0, Math.max(W * (1 - e.k), e.x)), y: Math.min(0, Math.max(H * (1 - e.k), e.y)) };
}

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
export default function MapaProvincia({ historial, puntos, etiquetaPuntos, isDark, encabezado, apilado = false }: {
  historial: OperativoPanel[]; puntos: OperativoPanel[]; etiquetaPuntos: string; isDark: boolean; encabezado?: React.ReactNode;
  /** Panel angosto (menos de 4 columnas): el mapa arriba, centrado, y la ficha debajo. Ancho: el mapa toma toda la altura y la ficha va al costado. */
  apilado?: boolean;
}) {
  const [vista, setVista] = useState<Vista>('curso');
  const enCurso = puntos;
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [sobre, setSobre] = useState<{ o: OperativoPanel; x: number; y: number } | null>(null);
  const elegido = enCurso.find(o => o.id === elegidoId) ?? enCurso[0] ?? null;

  // Zoom y desplazamiento (en unidades del SVG). La rueda necesita un listener no pasivo para no scrollear la página.
  const [enc, setEnc] = useState<Encuadre>(ENTERO);
  const [arrastrando, setArrastrando] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ cx: number; cy: number; e: Encuadre; movio: boolean } | null>(null);
  const aSvg = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault();
      const p = aSvg(ev.clientX, ev.clientY);
      setEnc(e => acercar(e, ev.deltaY < 0 ? 1.25 : 0.8, p.x, p.y));
    };
    svg.addEventListener('wheel', rueda, { passive: false });
    return () => svg.removeEventListener('wheel', rueda);
  }, []);
  const empezarArrastre = (ev: React.PointerEvent) => {
    if (enc.k === 1) return;
    arrastre.current = { cx: ev.clientX, cy: ev.clientY, e: enc, movio: false };
    setArrastrando(true);
    const mover = (m: PointerEvent) => {
      const a = arrastre.current; if (!a || !svgRef.current) return;
      const escala = W / svgRef.current.getBoundingClientRect().width;
      const dx = (m.clientX - a.cx) * escala, dy = (m.clientY - a.cy) * escala;
      if (Math.abs(dx) + Math.abs(dy) > 3) a.movio = true;
      setEnc(encuadrar({ k: a.e.k, x: a.e.x + dx, y: a.e.y + dy }));
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar);
      setArrastrando(false);
      // El click que llega después de arrastrar no elige un operativo.
      setTimeout(() => { arrastre.current = null; }, 0);
    };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  };
  const recienArrastro = () => !!arrastre.current?.movio;
  // Píxeles de pantalla por unidad del SVG, para que los nombres de las localidades se lean igual en cualquier pantalla.
  const [pxUnidad, setPxUnidad] = useState(1);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const medir = () => setPxUnidad(svg.getBoundingClientRect().width / W || 1);
    medir();
    const ro = new ResizeObserver(medir); ro.observe(svg);
    return () => ro.disconnect();
  }, []);
  const k = enc.k;
  const conNombres = k >= ZOOM_MUNICIPIOS;

  const rojo = isDark ? '#ff6b6b' : '#d63a3a';
  // Tierra, trazos y textos salen del color de texto del tema (claro u oscuro), como en el diseño CALÍVAR.
  const tierra = `color-mix(in srgb, var(--foreground) ${isDark ? 8 : 4}%, var(--card))`;
  const tinta = (a: number) => `color-mix(in srgb, var(--foreground) ${a}%, transparent)`;
  const borde = tinta(35);
  const textoCiudad = tinta(60);

  return (
    <div className={`flex flex-col min-h-0 ${apilado ? '' : 'h-full'}`}>
      {/* Selector de vista en una sola línea, para dejarle la altura al mapa */}
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
      </div>

      <div className={`flex gap-4 min-h-0 ${apilado ? 'flex-col' : 'flex-row flex-1'}`}>
        {/* El mapa toma toda la altura disponible y su ancho sale de la proporción de la provincia */}
        <div className="relative shrink-0" style={apilado
          ? { width: 'min(100%, 360px)', aspectRatio: `${W} / ${H}`, alignSelf: 'center' }
          : { height: '100%', aspectRatio: `${W} / ${H}`, maxWidth: '58%' }}>
          <svg ref={svgRef} viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} className="w-full h-full select-none" role="img"
            onPointerDown={empezarArrastre} onDoubleClick={ev => { const p = aSvg(ev.clientX, ev.clientY); setEnc(e => acercar(e, 2, p.x, p.y)); }}
            style={{ cursor: k > 1 ? (arrastrando ? 'grabbing' : 'grab') : 'zoom-in', touchAction: k > 1 ? 'none' : 'auto' }}
            aria-label={vista === 'calor' ? `Mapa de calor de ${historial.length} operativos en la provincia de Córdoba` : `${enCurso.length} operativos (${etiquetaPuntos.toLowerCase()}) en la provincia de Córdoba`}>
            <defs>
              <clipPath id="recorte-cordoba"><path d={CONTORNO} /></clipPath>
              <radialGradient id="calor">
                <stop offset="0%" stopColor={rojo} stopOpacity={0.55} />
                <stop offset="100%" stopColor={rojo} stopOpacity={0} />
              </radialGradient>
            </defs>
            <g transform={`translate(${enc.x} ${enc.y}) scale(${k})`}>
            <path d={CONTORNO} fill={tierra} stroke="none" />

            {/* Localidades (radios de municipios y comunas) y departamentos; los trazos no engordan con el zoom */}
            <g fill={tinta(7)} stroke={tinta(30)} strokeWidth={0.6}>
              {LOCALIDADES.map(l => (
                <path key={l.nombre + l.centro.join()} d={l.d} vectorEffect="non-scaling-stroke">
                  <title>{`${l.nombre} (${l.tipo.toLowerCase()})`}</title>
                </path>
              ))}
            </g>
            <g fill="none" stroke={tinta(25)} strokeWidth={0.8} strokeDasharray="3 2" pointerEvents="none">
              {DEPARTAMENTOS.map(d => <path key={d.nombre} d={d.d} vectorEffect="non-scaling-stroke" />)}
            </g>
            <path d={CONTORNO} fill="none" stroke={borde} strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />

            {vista === 'calor' && (
              <g clipPath="url(#recorte-cordoba)" style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}>
                {historial.map(o => {
                  const [x, y] = xy(o.puntoCero[0], o.puntoCero[1]);
                  return <circle key={o.id} cx={x} cy={y} r={16} fill="url(#calor)" />;
                })}
              </g>
            )}

            {/* Nombres de las localidades al acercarse (los tamaños se dividen por el zoom para verse siempre iguales) */}
            {conNombres && LOCALIDADES.filter(l => l.tipo === 'Municipio' || k >= ZOOM_COMUNAS).map(l => (
              <text key={'n' + l.nombre + l.centro.join()} x={l.xy[0]} y={l.xy[1]} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                style={{ fontSize: (l.tipo === 'Municipio' ? 11 : 10) / (k * pxUnidad), fill: textoCiudad, fontFamily: 'var(--font-family-primary)', fontWeight: l.tipo === 'Municipio' ? 600 : 400 }}>
                {l.nombre}
              </text>
            ))}

            {!conNombres && CIUDADES.map(c => {
              const [x, y] = xy(c.lat, c.lon);
              return (
                <g key={c.nombre}>
                  <circle cx={x} cy={y} r={2.2 / k} fill={textoCiudad} pointerEvents="none" />
                  <text x={c.ancla === 'end' ? x - 5 / k : x + 5 / k} y={y + 3.5 / k} textAnchor={c.ancla ?? 'start'} pointerEvents="none"
                    style={{ fontSize: 10 / k, fill: textoCiudad, fontFamily: 'var(--font-family-primary)' }}>{c.nombre}</text>
                </g>
              );
            })}

            {vista === 'curso' && enCurso.map(o => {
              const [x, y] = xy(o.puntoCero[0], o.puntoCero[1]);
              const activo = elegido?.id === o.id;
              return (
                <g key={o.id} style={{ cursor: 'pointer' }} onClick={() => { if (!recienArrastro()) setElegidoId(o.id); }}
                  onDoubleClick={ev => ev.stopPropagation()}
                  onMouseEnter={() => setSobre({ o, x, y })} onMouseLeave={() => setSobre(null)}>
                  <circle cx={x} cy={y} r={14 / k} fill="transparent" />
                  {activo && <circle cx={x} cy={y} r={11 / k} fill={colorEstado(o.estado)} opacity={0.22} />}
                  <circle cx={x} cy={y} r={(activo ? 7 : 5.5) / k} fill={colorEstado(o.estado)} stroke="var(--card)" strokeWidth={2 / k} />
                </g>
              );
            })}
            </g>
          </svg>

          {/* Controles de zoom */}
          <div className="absolute top-1 right-1 flex flex-col rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-sm)', zIndex: 4 }}>
            {([[Plus, 'Acercar', () => setEnc(e => acercar(e, 1.6)), k >= ZOOM_MAX],
               [Minus, 'Alejar', () => setEnc(e => acercar(e, 1 / 1.6)), k <= 1],
               [Maximize2, 'Ver la provincia entera', () => setEnc(ENTERO), k <= 1]] as const).map(([I, t, f, off], i) => (
              <button key={t} onClick={f} disabled={off} aria-label={t} title={t} className="p-1.5 disabled:opacity-35"
                style={{ background: 'none', border: 'none', borderTop: i ? '1px solid var(--border)' : 'none', cursor: off ? 'default' : 'pointer', color: 'var(--foreground)' }}>
                <I size={14} />
              </button>
            ))}
          </div>

          {sobre && (
            <div className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg whitespace-nowrap"
              style={{ left: `${((sobre.x * k + enc.x) / W) * 100}%`, top: `${((sobre.y * k + enc.y) / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 12px))', zIndex: 5,
                background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--foreground)' }}>
              <strong>{sobre.o.titulo}</strong><br />{sobre.o.localidad}
            </div>
          )}
        </div>

        {/* «Datos»: la ficha del operativo elegido (en curso) o dónde más se busca (calor). Si no entra, scrollea sola. */}
        <div className={apilado ? 'min-w-0' : 'flex-1 min-w-0 min-h-0 overflow-y-auto'}>
          {vista === 'curso'
            ? (elegido ? <Ficha o={elegido} /> : <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No hay operativos en este período.</p>)
            : <ZonasCalientes historial={historial} />}
        </div>
      </div>
    </div>
  );
}

/**
 * La tarjeta del operativo elegido: la misma información que su tarjeta en la sección Operativos
 * (estado, localidad, inicio, agentes asignados y coordinador a cargo).
 */
function Ficha({ o }: { o: OperativoPanel }) {
  const navigate = useNavigate();
  // Los datos de ejemplo no existen en la base: el botón queda visible pero sin entrar hasta tener la API del panel.
  const deEjemplo = o.id.startsWith('mock-');
  // Igual que mandoDe() en Operativos.tsx: en ámbar sólo si está activo y nadie está a cargo.
  const alerta = !o.coordinador && o.estado === 'ACTIVO';
  const fila = (I: typeof Users, texto: React.ReactNode, color = 'var(--muted-foreground)') => (
    <div className="flex items-center gap-2">
      <I size={13} style={{ color: color === 'var(--muted-foreground)' ? 'var(--primary)' : color, flexShrink: 0 }} />
      <span className="truncate" style={{ fontSize: 'var(--text-label)', color }}>{texto}</span>
    </div>
  );
  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="h-1 w-full" style={{ background: colorEstado(o.estado) }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="leading-snug" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{o.titulo}</p>
          <div className="flex-shrink-0"><StatusBadge estado={ESTADO_BADGE[o.estado]} size="sm" /></div>
        </div>
        <div className="flex flex-col gap-2">
          {fila(MapPin, o.localidad)}
          {fila(Calendar, fechaHoraArgentina(o.inicio))}
          {fila(Users, `${o.agentesAsignados} agente${o.agentesAsignados !== 1 ? 's' : ''} asignado${o.agentesAsignados !== 1 ? 's' : ''}`)}
          {fila(RadioTower, o.coordinador ?? 'Sin coordinador a cargo', alerta ? '#b45309' : 'var(--muted-foreground)')}
        </div>
      </div>
      {/* Acceder al panel del operativo, igual que en su tarjeta de la sección Operativos */}
      <div className="flex justify-end px-4 py-2.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
        <button onClick={() => navigate(`/operativo/${o.id}/dashboard`)} disabled={deEjemplo}
          title={deEjemplo ? 'Operativo de ejemplo: se va a poder entrar cuando el panel use los datos reales' : 'Acceder al panel del operativo'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg disabled:opacity-60"
          style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)',
            fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', cursor: deEjemplo ? 'not-allowed' : 'pointer' }}>
          Panel <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/** En la vista de calor, al costado: las localidades con más operativos. */
function ZonasCalientes({ historial }: { historial: OperativoPanel[] }) {
  const porLocalidad = new Map<string, number>();
  for (const o of historial) porLocalidad.set(o.localidad, (porLocalidad.get(o.localidad) ?? 0) + 1);
  const top = [...porLocalidad].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--muted)' }}>
      <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>Dónde más se busca</p>
      <p className="mb-3" style={{ fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Localidades con más operativos en el período</p>
      <ul className="flex flex-col gap-2.5">
        {top.map(([loc, n]) => (
          <li key={loc}>
            <div className="flex justify-between" style={{ fontSize: 'var(--text-label)' }}>
              <span style={{ color: 'var(--foreground)' }}>{loc.replace(', Córdoba', '')}</span>
              <span className="tabular-nums" style={{ color: 'var(--foreground)', fontWeight: 600 }}>{n}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
