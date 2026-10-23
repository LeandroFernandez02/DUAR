import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Radio, Users, UserCheck, ShieldAlert, Flag, Building2, Map as MapaIcono, CalendarRange, FilePlus2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OPERATIVOS_PANEL_MOCK, USUARIOS_ACTIVOS_MOCK } from '../data/panelGeneralMock';
import { calcularPanel, agruparPorciones, rangoDe, RECURSOS_CRITICOS, ESTADO_BADGE, type Periodo, type FiltrosPanel } from '../utils/panelGeneral';
import { colorDeEstado } from '../components/shared/StatusBadge';
import { Torta, OperativosPorMes, SERIES } from './panel/Graficos';
import MapaProvincia from './panel/MapaProvincia';
import LineaTiempo from './panel/LineaTiempo';

/**
 * Panel general (CU-42): estadísticas de todos los operativos, para el administrador y los
 * coordinadores. Qué muestra lo decidió el equipo (doc «Panel general de operativos») y el
 * boceto del 21/10: arriba los operativos por estado; abajo el mapa de la provincia con los
 * datos del operativo elegido y, al costado, agentes, usuarios y las tortas; «Operativos por
 * mes» al final. Diseño CALÍVAR (23/10): la grilla depende del ancho del propio panel —4 columnas
 * desde 1100 px (y entonces entra en la pantalla sin scroll), 2 hasta 760 px, 1 más angosto—, así
 * en una notebook con el menú abierto no quedan 4 columnas apretadas.
 *
 * La línea de tiempo del encabezado (22/10) elige el período: hoy (al entrar), un año entero
 * o un mes, y deja pasar de año en año hasta el actual.
 *
 * Por ahora con datos de ejemplo (data/panelGeneralMock.ts); las cifras se calculan en
 * utils/panelGeneral.ts, que después recibe los datos reales con la misma forma.
 */

const estiloTarjeta = { background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--card-border)' } as const;
const sinFiltros = { estado: '', localidad: '', institucion: '' } as const;
const isoDia = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

export default function GlobalDashboard() {
  const { isDark } = useApp();
  const series = SERIES;
  const todos = OPERATIVOS_PANEL_MOCK;
  const [periodo, setPeriodo] = useState<Periodo>({ tipo: 'hoy' });
  const rango = rangoDe(periodo);
  const esHoy = periodo.tipo === 'hoy';
  const anioElegido = periodo.tipo === 'hoy' ? new Date().getFullYear() : periodo.anio;

  const d = useMemo(() => calcularPanel(todos, { desde: rango.desde, hasta: rango.hasta, ...sinFiltros } as FiltrosPanel), [todos, rango.desde, rango.hasta]);
  const anioMin = useMemo(() => Math.min(...todos.map(o => new Date(o.inicio).getFullYear())), [todos]);

  // Barras de la línea de tiempo: operativos iniciados por mes del año que se está mirando.
  const iniciadosPorMes = (anio: number) => Array.from({ length: 12 }, (_, m) =>
    todos.filter(o => { const f = new Date(o.inicio); return f.getFullYear() === anio && f.getMonth() === m; }).length);

  // «Operativos por mes»: hoy = los últimos 12 meses; un año o un mes = los 12 meses de ese año.
  const meses = useMemo(() => {
    const hoy = new Date();
    const desde = esHoy ? new Date(hoy.getFullYear() - 1, hoy.getMonth() + 1, 1) : new Date(anioElegido, 0, 1);
    const hasta = esHoy ? hoy : new Date(Math.min(new Date(anioElegido, 11, 31).getTime(), hoy.getTime()));
    return calcularPanel(todos, { desde: isoDia(desde), hasta: isoDia(hasta), ...sinFiltros } as FiltrosPanel).meses;
  }, [todos, esHoy, anioElegido]);

  // Operativos por estado en el período. Los finalizados cuentan si terminaron dentro del período.
  const enPeriodo = d.filtrados;
  const cuenta = (...estados: string[]) => enPeriodo.filter(o => estados.includes(o.estado)).length;
  const finalizados = enPeriodo.filter(o => o.estado === 'FINALIZADO' && o.fin
    && isoDia(new Date(o.fin)) >= rango.desde && isoDia(new Date(o.fin)) <= rango.hasta).length;
  const { agentes } = d.actual;
  const enCurso = useMemo(() => todos.filter(o => o.estado === 'ACTIVO' || o.estado === 'EN_PROCESO'), [todos]);
  // Recursos críticos (Canes, Dron, Paramédico, Buzos, Caballería) trabajando ahora en todos los operativos en curso.
  const recursosCriticos = useMemo(() => RECURSOS_CRITICOS
    .map(nombre => ({ nombre, valor: enCurso.reduce((s, o) => s + (o.recursosCriticos?.[nombre] ?? 0), 0) }))
    .filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor), [enCurso]);

  // La grilla y las tortas se adaptan al ancho y al alto del propio panel (no de la ventana).
  const raiz = useRef<HTMLDivElement>(null);
  const [med, setMed] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => {
      const cont = el.parentElement ?? el;
      setMed(m => (m.w === el.clientWidth && m.h === cont.clientHeight ? m : { w: el.clientWidth, h: cont.clientHeight }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);
  const ancho = med.w >= 1100, angosto = med.w < 760;
  const diametro = med.w && med.w < 1300 ? Math.min(88, med.h >= 860 ? 108 : 88) : med.h >= 1000 ? 132 : med.h >= 860 ? 108 : med.h >= 740 ? 88 : 70;
  const columnas = ancho ? 'repeat(4, minmax(0, 1fr))' : angosto ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))';
  /** Lugar en la grilla de 4 columnas; en las angostas cada tarjeta sigue el orden natural. */
  const en = (col: string, fila: string): CSSProperties => (ancho ? { gridColumn: col, gridRow: fila } : {});
  const todoElAncho: CSSProperties = ancho ? {} : { gridColumn: '1 / -1' };

  const enElPeriodo = esHoy ? 'en los operativos de hoy' : `en los operativos de ${periodo.tipo === 'mes' ? rango.etiqueta.toLowerCase() : rango.etiqueta}`;
  const detalleEstado = esHoy ? 'Ahora' : rango.etiqueta;

  return (
    <div ref={raiz} className="p-4 lg:p-6 flex flex-col gap-4"
      style={{ fontFamily: 'var(--font-family-primary)', height: ancho ? '100%' : 'auto', minHeight: ancho ? 640 : 0, visibility: med.w ? 'visible' : 'hidden' }}>
      <div className="pc-cabecera flex items-center gap-x-6 gap-y-3 flex-wrap">
        <div>
          <h1 style={{ margin: '0 0 4px', color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>Panel de Control</h1>
          <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>Estadísticas Generales de Todos los Operativos</p>
        </div>
        <div className="pc-linea ml-auto max-w-full overflow-x-auto">
          <LineaTiempo periodo={periodo} onCambiar={setPeriodo} anioMin={anioMin} iniciadosPorMes={iniciadosPorMes} />
        </div>
      </div>

      {/* Operativos por estado en el período */}
      <div className="grid gap-4" style={{ gridTemplateColumns: columnas }}>
        <Indicador valor={cuenta('ACTIVO')} etiqueta="Operativos activos" detalle={detalleEstado} icono={Radio} color={colorDeEstado(ESTADO_BADGE.ACTIVO)} />
        <Indicador valor={cuenta('NUEVO', 'EN_PLANIFICACION')} etiqueta="Operativos nuevos" detalle="Todavía sin activar" icono={FilePlus2} color={colorDeEstado(ESTADO_BADGE.NUEVO)} />
        <Indicador valor={cuenta('EN_PROCESO')} etiqueta="Operativos en proceso" detalle={detalleEstado} icono={CalendarRange} color={colorDeEstado(ESTADO_BADGE.EN_PROCESO)} />
        <Indicador valor={finalizados} etiqueta="Operativos finalizados" detalle={esHoy ? 'Hoy' : rango.etiqueta} icono={Flag} color={colorDeEstado(ESTADO_BADGE.FINALIZADO)} />
      </div>

      {/* Mapa + datos | agentes, usuarios, tortas y operativos por mes: con 4 columnas ocupa el resto de la pantalla, sin scroll */}
      <div className="grid gap-4 min-h-0"
        style={{ gridTemplateColumns: columnas, gridTemplateRows: ancho ? 'auto minmax(0, 1fr) minmax(0, 1fr)' : 'none', flex: ancho ? 1 : 'none' }}>
        <section className="rounded-[var(--radius-card)] p-4 flex flex-col min-h-0" style={{ ...estiloTarjeta, ...en('1 / span 2', '1 / span 3'), ...todoElAncho }}>
          <MapaProvincia apilado={!ancho} historial={enPeriodo} isDark={isDark}
            puntos={esHoy ? enCurso : enPeriodo} etiquetaPuntos={esHoy ? 'Operativos en curso' : 'Operativos del período'}
            encabezado={<div className="mr-auto -mb-2"><TituloTarjeta icono={MapaIcono} titulo="Mapa de la provincia" /></div>} />
        </section>

        {/* Agentes y usuarios (23/10): sólo dos, siempre de ahora */}
        <Indicador estilo={en('3', '1')} valor={agentes.terreno + agentes.base + agentes.noDisponible} etiqueta="Agentes en operativos"
          detalle={`Ahora · en ${enCurso.length} ${enCurso.length === 1 ? 'operativo' : 'operativos'} en curso`} icono={Users} />
        <Indicador estilo={en('4', '1')} valor={USUARIOS_ACTIVOS_MOCK.total} etiqueta="Usuarios activos"
          detalle={`Cuentas activas · ${USUARIOS_ACTIVOS_MOCK.agentes} agentes`} icono={UserCheck} />

        {/* Cada torta en su tarjeta: instituciones del período y recursos críticos trabajando ahora */}
        <section className="rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-w-0" style={{ ...estiloTarjeta, ...en('3', '2'), minHeight: ancho ? 0 : 170 }}>
          <TituloTarjeta icono={Building2} titulo="Instituciones" aclaracion={enElPeriodo} unaLinea />
          <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
            <Torta datos={agruparPorciones(d.instituciones, 5)} colores={series} unidad="operativos" diametro={ancho ? diametro : 96} compacta />
          </div>
        </section>
        <section className="rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-w-0" style={{ ...estiloTarjeta, ...en('4', '2'), minHeight: ancho ? 0 : 170 }}>
          <TituloTarjeta icono={ShieldAlert} titulo="Recursos críticos" aclaracion="trabajando ahora" unaLinea />
          <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
            <Torta datos={recursosCriticos} colores={series} unidad="agentes" diametro={ancho ? diametro : 96} compacta />
          </div>
        </section>

        {/* Operativos por mes en lugar de la torta de especialidad (22/10) */}
        <section className="rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-h-0"
          style={{ ...estiloTarjeta, ...en('3 / span 2', '3'), ...(ancho ? {} : { gridColumn: '1 / -1', height: 260 }) }}>
          <TituloTarjeta icono={CalendarRange} titulo="Operativos por mes" aclaracion={esHoy ? 'últimos 12 meses' : `año ${anioElegido}`} />
          <div className="flex-1 min-h-0">
            <OperativosPorMes meses={meses} colorBarras={series[0]} colorLinea={series[1]} compacto />
          </div>
        </section>
      </div>
    </div>
  );
}

function TituloTarjeta({ icono: I, titulo, aclaracion, unaLinea = false }: { icono: typeof Radio; titulo: string; aclaracion?: string; unaLinea?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 mb-2 min-w-0 ${unaLinea ? 'whitespace-nowrap overflow-hidden' : 'flex-wrap'}`} title={aclaracion ? `${titulo} · ${aclaracion}` : undefined}>
      <I size={15} style={{ color: 'var(--primary)', alignSelf: 'center' }} />
      <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{titulo}</h2>
      {aclaracion && <span className={unaLinea ? 'truncate' : ''} style={{ fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{aclaracion}</span>}
    </div>
  );
}

/** Tarjeta chica con una cifra (estados, agentes y usuarios). */
/** `color`: el del estado de operativo que cuenta (mismo que el badge y el mapa); sin él, el turquesa del sistema. */
function Indicador({ valor, etiqueta, detalle, icono: I, color, estilo }: {
  valor: number; etiqueta: string; detalle?: string; icono: typeof Radio; color?: string; estilo?: CSSProperties;
}) {
  return (
    <div className="rounded-[var(--radius-card)] flex items-center gap-3"
      style={{ ...estiloTarjeta, padding: '10px 16px', ...(color ? { borderLeft: `4px solid ${color}` } : {}), ...estilo }}>
      <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${color ?? 'var(--primary)'} 12%, transparent)` }}>
        <I size={17} style={{ color: color ?? 'var(--primary)' }} />
      </div>
      <div className="min-w-0">
        <p className="tabular-nums" style={{ fontSize: 'calc(22px * var(--escala-texto))', lineHeight: 1.1, fontWeight: 700, color: 'var(--foreground)' }}>{valor}</p>
        <p className="leading-tight" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{etiqueta}</p>
        {detalle && <p className="leading-tight" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{detalle}</p>}
      </div>
    </div>
  );
}
