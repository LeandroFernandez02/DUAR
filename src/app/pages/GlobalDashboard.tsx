import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Siren, Map as MapaIcono, FilePlus2, Users, Radio, CalendarClock, Flag, Building2, Crosshair, CalendarRange, Calendar, ArrowRight, X, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OPERATIVOS_PANEL_MOCK } from '../data/panelGeneralMock';
import { calcularPanel, formatoDuracion, type EstadoOperativoPanel, type OperativoPanel, type Mes } from '../utils/panelGeneral';
import { OperativosPorMes } from './panel/Graficos';
import MapaProvincia from './panel/MapaProvincia';
import { ACENTO, Marco, Segmentado, ScrollFade, chico, globo, tarjeta, tinte, useDemora, useMedida, isoLocal, estiloEspecialidad, ESPECIALIDADES_PANEL, colorInstitucion, sigla } from './panel/comunes';

/**
 * Panel general (CU-43), diseño v2 aprobado (11/11, «handoff-dashboards»): Situación ahora (siempre
 * tiempo real), Dónde estamos operando y quién aporta (mapa + aporte por institución + especialidades)
 * y Operativos por mes. El filtro de período (Hoy / 7 días / Este mes / Personalizado, o arrastrando
 * sobre el gráfico de meses) afecta los finalizados, el mapa de calor, las instituciones y las
 * especialidades.
 *
 * Datos de ejemplo (data/panelGeneralMock.ts) con el catálogo real de instituciones y especialidades;
 * las cifras se calculan en utils/panelGeneral.ts, que después recibe la respuesta de la API.
 */

type Modo = 'hoy' | '7d' | 'mes' | 'rango';
type Filtro = 'plan' | 'proceso' | 'inact' | null;

const COLOR_ESTADO: Record<EstadoOperativoPanel, string> = {
  NUEVO: ACENTO.grisClaro, INICIADO: ACENTO.celeste, EN_PLANIFICACION: ACENTO.ambar, EN_PROCESO: ACENTO.verde, INACTIVO: ACENTO.naranja, FINALIZADO: ACENTO.gris,
};
const FILTROS: Record<Exclude<Filtro, null>, [EstadoOperativoPanel, string]> = {
  plan: ['EN_PLANIFICACION', 'En planificación'], proceso: ['EN_PROCESO', 'En proceso'], inact: ['INACTIVO', 'Inactivos (+48h)'],
};
const EN_MAPA: EstadoOperativoPanel[] = ['INICIADO', 'EN_PLANIFICACION', 'EN_PROCESO', 'INACTIVO'];
const fAr = (s: string) => (s ? s.split('-').reverse().join('/') : 'dd/mm/aaaa');

export default function GlobalDashboard() {
  const { isDark } = useApp();
  const todos = OPERATIVOS_PANEL_MOCK;
  const hoy = new Date();
  const hoyIso = isoLocal(hoy);

  const [modo, setModo] = useState<Modo>('mes');
  const [desde, setDesde] = useState(''), [hasta, setHasta] = useState('');
  const [sel, setSel] = useState<{ a: number; b: number } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>(null);
  const [todasInst, setTodasInst] = useState(false);

  // Rango del período elegido (fechas locales).
  const rango = useMemo(() => {
    if (modo === 'hoy') return { desde: hoyIso, hasta: hoyIso };
    if (modo === '7d') { const d = new Date(); d.setDate(d.getDate() - 6); return { desde: isoLocal(d), hasta: hoyIso }; }
    if (modo === 'mes') return { desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: hoyIso };
    return { desde: desde || hoyIso, hasta: hasta || hoyIso };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, desde, hasta, hoyIso]);
  const sub = modo === 'hoy' ? 'hoy' : modo === '7d' ? 'últimos 7 días' : modo === 'mes' ? 'este mes' : 'período seleccionado';
  const subP = modo === 'rango' ? 'en el período seleccionado' : `en el período: ${sub}`;
  const leyenda = modo === 'hoy' ? `Mostrando: Hoy · datos en tiempo real (${hoy.toLocaleDateString('es-AR')})`
    : modo === '7d' ? `Mostrando: Últimos 7 días (hasta ${hoy.toLocaleDateString('es-AR')})`
    : modo === 'mes' ? `Mostrando: Este mes (${hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })})`
    : `Mostrando: ${fAr(rango.desde)} → ${fAr(rango.hasta)}`;

  const d = useMemo(() => calcularPanel(todos, { ...rango, estado: '', localidad: '', institucion: '' }), [todos, rango]);
  const per = d.filtrados;
  const ahora = (e: EstadoOperativoPanel) => todos.filter(o => o.estado === e).length;
  const finalizados = per.filter(o => o.estado === 'FINALIZADO' && o.fin && isoLocal(new Date(o.fin)) >= rango.desde && isoLocal(new Date(o.fin)) <= rango.hasta);
  const promedio = finalizados.length ? finalizados.reduce((s, o) => s + (new Date(o.fin!).getTime() - new Date(o.inicio).getTime()) / 3.6e6, 0) / finalizados.length : null;

  // Aporte por institución y especialidades del período (agentes, catálogo real).
  const suma = (f: (o: OperativoPanel) => Record<string, number> | undefined) => {
    const m: Record<string, number> = {};
    for (const o of per) for (const [k, v] of Object.entries(f(o) ?? {})) m[k] = (m[k] ?? 0) + v;
    return Object.entries(m).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
  };
  const dependencias: Record<string, { nombre: string; valor: number }[]> = {};
  for (const o of per) for (const [inst, deps] of Object.entries(o.aporteDependencias ?? {})) {
    const lista = dependencias[inst] ?? (dependencias[inst] = []);
    for (const [nombre, valor] of Object.entries(deps)) {
      const x = lista.find(d => d.nombre === nombre);
      if (x) x.valor += valor; else lista.push({ nombre, valor });
    }
  }
  for (const l of Object.values(dependencias)) l.sort((a, b) => b.valor - a.valor);
  const instituciones = suma(o => o.aporte).map(x => ({ ...x, dependencias: dependencias[x.nombre] }));
  const especialidades = ESPECIALIDADES_PANEL.map(e => ({ ...e, valor: per.reduce((s, o) => s + (o.porEspecialidad?.[e.nombre] ?? 0), 0) }));
  const cobertura = { ha: per.reduce((s, o) => s + (o.coberturaHa ?? 0), 0), km: per.reduce((s, o) => s + (o.tracksKm ?? 0), 0) };

  // Operativos por mes: siempre los últimos 12 meses (arrastrar elige un rango).
  const meses: Mes[] = useMemo(() => {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1);
    return calcularPanel(todos, { desde: isoLocal(ini), hasta: hoyIso, estado: '', localidad: '', institucion: '' }).meses.slice(-12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, hoyIso]);
  const elegirMeses = (a: number, b: number) => {
    const [ya, ma] = meses[a].clave.split('-').map(Number), [yb, mb] = meses[b].clave.split('-').map(Number);
    const fin = isoLocal(new Date(yb, mb, 0));
    setSel({ a, b }); setDesde(`${ya}-${String(ma).padStart(2, '0')}-01`); setHasta(fin > hoyIso ? hoyIso : fin); setModo('rango');
  };
  const atajo = (m: Modo) => { setSel(null); setModo(m); };

  const puntos = todos.filter(o => (filtro ? o.estado === FILTROS[filtro][0] : EN_MAPA.includes(o.estado)));
  const alternar = (f: Exclude<Filtro, null>) => setFiltro(x => (x === f ? null : f));

  // Diseño de Centro de Comando desde 1100 px de ancho del propio panel.
  const raiz = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = raiz.current; if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const amplio = ancho >= 1100;

  return (
    <div ref={raiz} className="panel-raiz" style={{ visibility: ancho ? 'visible' : 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px 24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>Panel de Control</h1>
          <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>Estadísticas Generales de Todos los Operativos</p>
        </div>
        <div style={{ marginLeft: 'auto', maxWidth: '100%' }}>
          <FiltroTiempo modo={modo} setModo={atajo} desde={desde} hasta={hasta} hoyIso={hoyIso} leyenda={leyenda}
            setDesde={v => { setSel(null); setDesde(v); if (hasta && v > hasta) setHasta(v); if (!hasta) setHasta(hoyIso); setModo('rango'); }}
            setHasta={v => { setSel(null); setHasta(v > hoyIso ? hoyIso : v); if (!desde) setDesde(v); setModo('rango'); }} />
        </div>
      </div>

      <Marco icono={Siren} titulo="Situación ahora">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <Indicador valor={ahora('INICIADO')} etiqueta="Iniciado" detalle="Pendiente de configurar zona y recursos en el sistema" icono={FilePlus2} color={ACENTO.celeste} />
          <Indicador valor={ahora('EN_PLANIFICACION')} etiqueta="En planificación" detalle="Definiendo grupos de rescate y cuadrículas de búsqueda" icono={Users} color={ACENTO.ambar}
            onClick={() => alternar('plan')} activo={filtro === 'plan'} />
          <Indicador valor={ahora('EN_PROCESO')} etiqueta="En proceso" detalle="Operativos con personal desplegado en terreno en este momento" icono={Radio} color={ACENTO.verde}
            onClick={() => alternar('proceso')} activo={filtro === 'proceso'} />
          <Indicador valor={ahora('INACTIVO')} etiqueta="Inactivos (+48h)" detalle="Operativo sin actualizaciones hace más de 48 horas (Requiere atención o cierre)" icono={CalendarClock}
            color={ACENTO.rojo} alerta={ahora('INACTIVO') > 0} onClick={() => alternar('inact')} activo={filtro === 'inact'} />
          <Indicador valor={finalizados.length} etiqueta="Finalizados" icono={Flag} color={ACENTO.gris}
            detalle={`Acumulado del período seleccionado${promedio !== null ? ` · ⏱ Duración promedio: ${formatoDuracion(promedio)}` : ''}`} />
        </div>
      </Marco>

      <Marco icono={MapaIcono} titulo="Dónde estamos operando y quién aporta">
        <div style={{ display: 'flex', flexWrap: amplio ? 'nowrap' : 'wrap', gap: 16, height: amplio ? 680 : 'auto', alignItems: 'stretch' }}>
          <section style={{ ...tarjeta, padding: 16, display: 'flex', flexDirection: 'column', minHeight: amplio ? 0 : 520, flex: amplio ? '6 1 0' : '1 1 100%', overflow: amplio ? 'hidden' : 'visible' }}>
            <MapaProvincia key={filtro ?? 'todos'} vistaInicial={filtro ? 'curso' : 'calor'} apilado={!amplio} historial={per} isDark={isDark}
              puntos={puntos} etiquetaPuntos="Operativos en curso" colorDe={e => COLOR_ESTADO[e]}
              periodo={{ sub: subP, corta: sub, ha: cobertura.ha, km: cobertura.km }}
              encabezado={<div style={{ marginRight: 'auto' }}>{filtro
                ? <button type="button" onClick={() => setFiltro(null)} style={chip}>Filtrando: {FILTROS[filtro][1]} <X size={12} /></button>
                : <TituloTarjeta icono={MapaIcono} titulo="Mapa de la provincia" />}</div>} />
          </section>
          <div style={{ flex: amplio ? '4 1 0' : '1 1 100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ ...tarjeta, flex: '1 1 0', minHeight: amplio ? 0 : 310, padding: '12px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TituloTarjeta icono={Building2} titulo="Aporte por institución" aclaracion={subP} />
              <Instituciones datos={instituciones} todas={todasInst} setTodas={setTodasInst} />
            </section>
            <section style={{ ...tarjeta, flex: '1 1 0', minHeight: amplio ? 0 : 340, padding: '12px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tinte(ACENTO.naranja) }}><Crosshair size={16} color={ACENTO.naranja} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Especialidades críticas</h2>
                  <p style={{ margin: 0, fontSize: chico, color: 'var(--muted-foreground)' }}>Total en todos los operativos del período</p>
                </div>
              </div>
              <Mosaico datos={especialidades} />
            </section>
          </div>
        </div>
      </Marco>

      <section style={{ ...tarjeta, padding: '12px 20px', display: 'flex', flexDirection: 'column', height: 240, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <TituloTarjeta icono={CalendarRange} titulo="Operativos por mes" aclaracion="últimos 12 meses · arrastrá para filtrar" />
          {sel && <button type="button" onClick={() => { setSel(null); setModo('mes'); setDesde(''); setHasta(''); }} style={{ ...chip, marginBottom: 8 }}>
            {sel.a === sel.b ? meses[sel.a].etiqueta : `${meses[sel.a].etiqueta} → ${meses[sel.b].etiqueta}`} <X size={12} />
          </button>}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <OperativosPorMes meses={meses} colorBarras={ACENTO.verde} colorLinea={isDark ? '#F8FAFC' : '#0B1E2D'} tope={5} paso={5}
            fijo={sel ? undefined : meses.length - 1} seleccion={sel} onSeleccion={elegirMeses} />
        </div>
      </section>
    </div>
  );
}

const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--muted)',
  cursor: 'pointer', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: chico, fontWeight: 600,
} as const;

function TituloTarjeta({ icono: I, titulo, aclaracion }: { icono: LucideIcon; titulo: string; aclaracion?: string }) {
  return (
    <div title={aclaracion ? `${titulo} · ${aclaracion}` : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <I size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
      <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>{titulo}</h2>
      {aclaracion && <span style={{ fontSize: chico, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aclaracion}</span>}
    </div>
  );
}

/** Indicador de «Situación ahora»: ícono 42 px, número y etiqueta; el detalle va en el globo. */
function Indicador({ valor, etiqueta, detalle, icono: I, color, onClick, activo, alerta }: {
  valor: number; etiqueta: string; detalle: string; icono: LucideIcon; color: string; onClick?: () => void; activo?: boolean; alerta?: boolean;
}) {
  const d = useDemora();
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => { setHov(true); d.entrar(); }} onMouseLeave={() => { setHov(false); d.salir(); }} onClick={onClick}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} aria-pressed={onClick ? !!activo : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick(); } : undefined}
      style={{ ...tarjeta, position: 'relative', cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px',
        borderLeft: `4px solid ${color}`, transition: 'transform .15s ease, box-shadow .15s ease',
        ...(hov ? { transform: 'translateY(-2px)', boxShadow: 'var(--elevation-md)' } : {}),
        ...(alerta ? { background: `color-mix(in srgb, ${ACENTO.rojo} 7%, var(--card))`, border: `1px solid color-mix(in srgb, ${ACENTO.rojo} 35%, transparent)`, borderLeft: `4px solid ${ACENTO.rojo}` } : {}),
        ...(activo ? { outline: `2px solid ${color}`, outlineOffset: -1 } : {}) }}>
      <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tinte(color, 12) }}><I size={20} color={color} /></div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'calc(28px * var(--escala-texto, 1))', lineHeight: 1.05, fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{valor}</p>
        <p style={{ margin: '2px 0 0', fontSize: chico, lineHeight: 1.3, fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          {alerta && <TriangleAlert size={12} color={ACENTO.rojoFuerte} />}{etiqueta}
        </p>
      </div>
      {d.ver && <div role="tooltip" style={{ ...globo, left: '50%', top: 'calc(100% + 10px)', transform: 'translateX(-50%)' }}>{detalle}</div>}
    </div>
  );
}

/** Período: Hoy / Últimos 7 días / Este mes / Personalizado (desde → hasta, nunca después de hoy). */
function FiltroTiempo({ modo, setModo, desde, hasta, setDesde, setHasta, leyenda, hoyIso }: {
  modo: Modo; setModo: (m: Modo) => void; desde: string; hasta: string; setDesde: (v: string) => void; setHasta: (v: string) => void; leyenda: string; hoyIso: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const pill = (act: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-button)', cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600, border: act ? '1px solid transparent' : '1px solid var(--border)',
    background: act ? 'var(--primary)' : 'var(--muted)', color: act ? 'var(--primary-foreground)' : 'var(--foreground)',
  }) as const;
  const campo = (lbl: string, v: string, f: (v: string) => void, min?: string, max?: string): ReactNode => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)', background: 'var(--muted)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
      <Calendar size={14} />{lbl}
      <input type="date" value={v} min={min} max={max} onChange={e => e.target.value && f(e.target.value)}
        style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', colorScheme: 'light dark' }} />
    </label>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        <button type="button" onClick={() => setModo('hoy')} style={pill(modo === 'hoy')}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: modo === 'hoy' ? 'currentColor' : ACENTO.rojo }} />Hoy
        </button>
        <button type="button" onClick={() => setModo('7d')} style={pill(modo === '7d')}>Últimos 7 días</button>
        <button type="button" onClick={() => setModo('mes')} style={pill(modo === 'mes')}>Este mes</button>
        <span style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />
        <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto || modo === 'rango'} style={pill(modo === 'rango')}><Calendar size={14} />Personalizado</button>
      </div>
      {(abierto || modo === 'rango') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {campo('Desde', desde, setDesde, undefined, hasta || hoyIso)}
          <ArrowRight size={14} color="var(--muted-foreground)" />
          {campo('Hasta', hasta, setHasta, desde || undefined, hoyIso)}
        </div>
      )}
      <span style={{ fontSize: chico, color: 'var(--muted-foreground)', textAlign: 'right' }}>{leyenda}</span>
      <span style={{ fontSize: 'calc(11px * var(--escala-texto, 1))', color: 'var(--muted-foreground)', textAlign: 'right' }}>
        También podés arrastrar sobre el gráfico "Operativos por mes". Los indicadores de estado siempre son de ahora.
      </span>
    </div>
  );
}

/** Aporte por institución: Top 4 + «Otras» (barra apilada y lista), o todas con scroll interno. */
type FilaInst = { nombre: string; valor: number; dependencias?: { nombre: string; valor: number }[] };

/**
 * Aporte por institución: Top 4 + «Otras» (barra apilada y lista), o todas. Las instituciones con
 * dependencias (Policía) se despliegan al tocarlas y muestran cuánto aportó cada dependencia.
 */
function Instituciones({ datos, todas, setTodas }: { datos: FilaInst[]; todas: boolean; setTodas: (v: boolean) => void }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const total = datos.reduce((s, x) => s + x.valor, 0);
  const top = datos.slice(0, 4), resto = datos.slice(4), sumaResto = resto.reduce((s, x) => s + x.valor, 0);
  type Fila = FilaInst & { c: string; sig: string; otras?: boolean };
  const filas: Fila[] = [...top.map((x, i) => ({ ...x, c: colorInstitucion(i), sig: sigla(x.nombre) })),
    ...(resto.length ? [{ nombre: `+${resto.length} Otras instituciones`, valor: sumaResto, c: ACENTO.grisClaro, sig: `+${resto.length}`, otras: true }] : [])];
  const pct = (v: number, de = total) => (de ? `${Math.round((v / de) * 100)}%` : '0%');
  const pildora = (txt: string, titulo?: string) => (
    <span title={titulo} style={{ minWidth: 40, textAlign: 'center', padding: '1px 6px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto, 1))', fontVariantNumeric: 'tabular-nums' }}>{txt}</span>
  );
  const avatar = (txt: string, c: string) => (
    <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(10px * var(--escala-texto, 1))', fontWeight: 700,
      color: 'var(--foreground)', background: tinte(c, 22), border: `1px solid ${tinte(c, 45)}` }}>{txt}</span>
  );
  const fila = (x: Fila, k: number) => {
    const deps = x.dependencias?.length ? x.dependencias : null;
    const abre = !!deps && abierta === x.nombre;
    const accion = x.otras ? () => setTodas(true) : deps ? () => setAbierta(a => (a === x.nombre ? null : x.nombre)) : undefined;
    const Flecha = abre ? ChevronUp : ChevronDown;
    return (
      <div key={x.nombre} style={{ borderTop: k ? '1px dashed var(--border)' : 'none' }}>
        <div onClick={accion} role={accion ? 'button' : undefined} tabIndex={accion ? 0 : undefined} aria-expanded={deps ? abre : undefined}
          onKeyDown={accion ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accion(); } } : undefined} className={accion ? 'fila-otras' : undefined}
          title={deps ? (abre ? 'Ocultar dependencias' : 'Ver el aporte de cada dependencia') : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 4px', margin: '0 -4px', borderRadius: 'var(--radius-md)', cursor: accion ? 'pointer' : 'default', fontSize: 'var(--text-label)' }}>
          {avatar(x.sig, x.c)}
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--foreground)', fontWeight: 500 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.nombre}</span>
            {x.otras && <span style={{ color: 'var(--muted-foreground)' }}>→</span>}
            {deps && <Flecha size={14} color="var(--muted-foreground)" style={{ flexShrink: 0 }} />}
          </span>
          <strong style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{x.valor}</strong>
          {pildora(pct(x.valor))}
        </div>
        {abre && deps && (
          <div role="list" aria-label={`Dependencias de ${x.nombre}`} style={{ margin: '2px 0 6px 34px', paddingLeft: 10, borderLeft: `2px solid ${tinte(x.c, 45)}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {deps.map(dp => (
              <div key={dp.nombre} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0', fontSize: chico }}>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.nombre}</span>
                <strong style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{dp.valor}</strong>
                {pildora(pct(dp.valor, x.valor), `Porcentaje dentro de ${x.nombre}`)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const lista = todas ? datos.map((x, i) => ({ ...x, c: i < 4 ? colorInstitucion(i) : ACENTO.grisClaro, sig: sigla(x.nombre) })) : filas;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px', flexWrap: 'nowrap', minWidth: 0 }}>
        <span style={{ fontSize: 'calc(28px * var(--escala-texto, 1))', lineHeight: 1, fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{total}</span>
        <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>agentes movilizados</span>
        <div style={{ marginLeft: 'auto' }}>
          <Segmentado redondo etiqueta="Vista de instituciones" valor={todas} onCambiar={setTodas} opciones={[[false, 'Top 4'], [true, `Todas (${datos.length})`]]} />
        </div>
      </div>
      <div role="img" aria-label={`Aporte por institución: ${filas.map(x => `${x.nombre} ${x.valor}`).join(', ')}`} style={{ display: 'flex', gap: 2, height: 12, marginBottom: 10 }}>
        {total ? filas.map(x => <span key={x.nombre} title={`${x.nombre}: ${x.valor}`} style={{ flex: x.valor, minWidth: 0, borderRadius: 6, background: x.c }} />)
          : <span style={{ flex: 1, borderRadius: 6, background: 'var(--muted)' }} />}
      </div>
      {/* Con todo cerrado la lista queda centrada; si algo no entra (Todas o una dependencia abierta) se desplaza sola. */}
      <ScrollFade>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', paddingRight: todas ? 14 : 0 }}>
          <div style={{ margin: todas ? '0 0 auto' : 'auto 0' }}>
            {lista.length ? lista.map(fila) : <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Sin agentes movilizados en el período.</p>}
          </div>
        </div>
      </ScrollFade>
    </>
  );
}

/** Treemap «squarified» de las especialidades del período. */
function mosaico<T extends { v: number }>(items: T[], W: number, H: number) {
  const tot = items.reduce((a, f) => a + f.v, 0) || 1, A = W * H;
  const rem = items.map(f => ({ f, a: (f.v / tot) * A }));
  const out: { f: T; x: number; y: number; w: number; h: number }[] = [];
  let x = 0, y = 0, w = W, h = H;
  const peor = (row: typeof rem, lado: number) => {
    const s = row.reduce((a, r) => a + r.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a));
    return Math.max((lado * lado * mx) / (s * s), (s * s) / (lado * lado * mn));
  };
  while (rem.length) {
    const lado = Math.min(w, h), row = [rem.shift()!];
    while (rem.length && peor([...row, rem[0]], lado) <= peor(row, lado)) row.push(rem.shift()!);
    const s = row.reduce((a, r) => a + r.a, 0);
    if (w >= h) { const cw = s / h; let yy = y; for (const r of row) { const rh = r.a / cw; out.push({ f: r.f, x, y: yy, w: cw, h: rh }); yy += rh; } x += cw; w -= cw; }
    else { const ch = s / w; let xx = x; for (const r of row) { const rw = r.a / ch; out.push({ f: r.f, x: xx, y, w: rw, h: ch }); xx += rw; } y += ch; h -= ch; }
  }
  return out;
}

function Mosaico({ datos }: { datos: { nombre: string; valor: number }[] }) {
  const [ref, med] = useMedida<HTMLDivElement>();
  const filas = datos.filter(x => x.valor > 0).map(x => ({ ...estiloEspecialidad(x.nombre), v: x.valor })).sort((a, b) => b.v - a.v);
  const rects = med.w && med.h && filas.length ? mosaico(filas, med.w, med.h) : [];
  return (
    <div ref={ref} role="img" aria-label={`Especialidades: ${filas.map(f => `${f.nombre} ${f.v}`).join(', ')}`}
      style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {!filas.length && <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Sin agentes en el período.</p>}
      {rects.map(r => {
        const f = r.f, grande = r.w >= 96 && r.h >= 66, medio = r.w >= 46 && r.h >= 42, g = 1.5, I = f.icono;
        return (
          <div key={f.nombre} title={`${f.nombre}: ${f.v} en total`}
            style={{ position: 'absolute', left: r.x + g, top: r.y + g, width: Math.max(0, r.w - 2 * g), height: Math.max(0, r.h - 2 * g), borderRadius: 6, boxSizing: 'border-box',
              background: `color-mix(in srgb, ${f.color} 62%, white)`, color: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', transition: 'all .5s ease' }}>
            {(grande || medio) && <I size={grande ? 18 : 14} color="#0F172A" />}
            <strong style={{ fontSize: grande ? 'calc(22px * var(--escala-texto, 1))' : 'calc(15px * var(--escala-texto, 1))', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{f.v}</strong>
            {grande && <span style={{ fontSize: 'calc(11px * var(--escala-texto, 1))', fontWeight: 600, lineHeight: 1.1, maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</span>}
          </div>
        );
      })}
    </div>
  );
}

