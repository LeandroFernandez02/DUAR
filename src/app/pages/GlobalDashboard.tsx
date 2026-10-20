import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { LayoutDashboard, Radio, AlertTriangle, Users, UserX, Clock, Flag, Building2, Stethoscope, Map as MapaIcono, CalendarRange, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OPERATIVOS_PANEL_MOCK } from '../data/panelGeneralMock';
import {
  calcularPanel, agruparPorciones, formatoDuracion, opcionesDe, ETIQUETA_RESULTADO, ETIQUETA_ESTADO, DIAS_LARGO,
  type FiltrosPanel, type EstadoOperativoPanel, type DatosPanel,
} from '../utils/panelGeneral';
import { Torta, BarrasHorizontales, OperativosPorMes, SERIES_CLARO, SERIES_OSCURO } from './panel/Graficos';
import MapaCalor from './panel/MapaCalor';
import MapaProvincia from './panel/MapaProvincia';

/**
 * Panel general (CU-42): estadísticas de todos los operativos, para el
 * administrador y los coordinadores. Qué muestra lo decidió el equipo en el doc
 * «Panel general de operativos — propuesta de datos».
 *
 * Por ahora con DATOS DE EJEMPLO (data/panelGeneralMock.ts) para acordar la
 * pantalla antes de construir la API; las cifras se calculan en
 * utils/panelGeneral.ts, que después recibe los datos reales con la misma forma.
 */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function filtrosIniciales(): FiltrosPanel {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
  return { desde: iso(desde), hasta: iso(hoy), estado: '', localidad: '', institucion: '' };
}

const estiloTarjeta = { background: 'var(--card)', boxShadow: 'var(--elevation-sm)' } as const;
const campo = {
  background: 'var(--input-background, var(--card))', border: '1px solid var(--border)', color: 'var(--foreground)',
  fontSize: 'var(--text-label)', borderRadius: 'var(--radius-button)', padding: '7px 10px', fontFamily: 'var(--font-family-primary)',
} as const;

function Seccion({ titulo, icono: Icono, aclaracion, children, className = '' }: {
  titulo: string; icono: typeof Radio; aclaracion?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-[var(--radius-card)] p-5 ${className}`} style={estiloTarjeta}>
      <div className="flex items-baseline gap-2 mb-4 flex-wrap">
        <Icono size={16} style={{ color: 'var(--primary)', alignSelf: 'center' }} />
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{titulo}</h2>
        {aclaracion && <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{aclaracion}</span>}
      </div>
      {children}
    </section>
  );
}

function Cifra({ valor, etiqueta, detalle }: { valor: ReactNode; etiqueta: string; detalle?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--muted)' }}>
      <p className="tabular-nums" style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, color: 'var(--foreground)' }}>{valor}</p>
      <p className="mt-1" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{etiqueta}</p>
      {detalle && <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{detalle}</p>}
    </div>
  );
}


/** Cifras de la situación actual: operativos activos y agentes por fase. Las usan las dos versiones. */
function CifrasActuales({ d, series }: { d: DatosPanel; series: string[] }) {
  const { terreno, base, noDisponible } = d.actual.agentes;
  const totalAgentes = terreno + base + noDisponible;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Cifra valor={d.actual.activos} etiqueta="Operativos activos"
        detalle={d.actual.sinActivar ? `${d.actual.sinActivar} más sin activar (nuevos o en planificación)` : 'Ninguno sin activar'} />
      <div className="sm:col-span-1 xl:col-span-3 rounded-[var(--radius-card)] p-4" style={{ background: 'var(--muted)' }}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="tabular-nums" style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, color: 'var(--foreground)' }}>{totalAgentes}</p>
          <p style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>agentes en los operativos activos</p>
        </div>
        {/* Una barra apilada: cuántos en el terreno, en la base y no disponibles. */}
        <div className="flex gap-0.5 mt-3 h-3 rounded-full overflow-hidden" role="img"
          aria-label={`En el terreno ${terreno}, en la base ${base}, no disponibles ${noDisponible}`}>
          {[{ n: terreno, c: series[0] }, { n: base, c: series[2] }, { n: noDisponible, c: 'var(--muted-foreground)' }].map((s, i) => s.n > 0 && (
            <div key={i} style={{ flexGrow: s.n, background: s.c }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { n: terreno, t: 'En el terreno', s: 'desplegados, rastrillando o replegando', c: series[0] },
            { n: base, t: 'En la base', s: 'disponibles, agrupados o en espera', c: series[2] },
            { n: noDisponible, t: 'No disponibles', s: '', c: 'var(--muted-foreground)' },
          ].map(x => (
            <div key={x.t} className="flex gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c, marginTop: 5, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)' }}><strong className="tabular-nums">{x.n}</strong> {x.t}</p>
                {x.s && <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{x.s}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ESTADOS_FILTRO: EstadoOperativoPanel[] = ['ACTIVO', 'EN_PROCESO', 'FINALIZADO', 'NUEVO', 'EN_PLANIFICACION', 'INACTIVO'];

/**
 * Dos versiones del panel para compararlas con el equipo de tesis (20/10). La 2 saca las
 * alertas, los filtros, la duración y el resultado, y cambia el mapa por una ilustración
 * de la provincia con dos vistas (calor y operativos en curso). Se elige con ?v=1 / ?v=2.
 */
export default function GlobalDashboard() {
  const { isDark } = useApp();
  const [params, setParams] = useSearchParams();
  const version = params.get('v') === '1' ? '1' : '2';
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6" style={{ fontFamily: 'var(--font-family-primary)' }}>
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>Panel de Control</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>Estadísticas de todos los operativos</p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="inline-flex p-1 rounded-[var(--radius-button)]" style={{ background: 'var(--muted)' }} role="tablist" aria-label="Versión del panel">
            {(['1', '2'] as const).map(v => (
              <button key={v} role="tab" aria-selected={version === v} onClick={() => setParams({ v }, { replace: true })}
                className="px-3 py-1.5 rounded-[var(--radius-button)]"
                style={{ background: version === v ? 'var(--card)' : 'transparent', boxShadow: version === v ? 'var(--elevation-sm)' : 'none',
                  color: version === v ? 'var(--foreground)' : 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Versión {v}
              </button>
            ))}
          </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          title="Las cifras son de ejemplo, para acordar la pantalla. Todavía no salen de la base."
          style={{ background: 'rgba(217,119,6,0.12)', color: isDark ? '#fbbf24' : '#92400e', fontSize: 'var(--text-label)', fontWeight: 600 }}>
          <FlaskConical size={14} /> Datos de ejemplo
        </span>
        </div>
      </div>
      {version === '1' ? <PanelV1 /> : <PanelV2 />}
    </div>
  );
}

function PanelV1() {
  const { isDark } = useApp();
  const series = isDark ? SERIES_OSCURO : SERIES_CLARO;
  const todos = OPERATIVOS_PANEL_MOCK;
  const [f, setF] = useState<FiltrosPanel>(filtrosIniciales);
  const d = useMemo(() => calcularPanel(todos, f), [todos, f]);
  const opciones = useMemo(() => opcionesDe(todos), [todos]);
  const hayFiltros = f.estado || f.localidad || f.institucion || JSON.stringify(f) !== JSON.stringify(filtrosIniciales());
  const fechaCorta = (s: string) => new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1 · Situación actual: siempre ahora y de todos los operativos ── */}
      <Seccion titulo="Situación actual" icono={Radio} aclaracion="Ahora, en todos los operativos (no usa los filtros)">
        <CifrasActuales d={d} series={series} />

        {(d.actual.sinCoordinador.length > 0 || d.actual.largos.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            {d.actual.sinCoordinador.length > 0 && (
              <Alerta titulo={`${d.actual.sinCoordinador.length} ${d.actual.sinCoordinador.length === 1 ? 'operativo activo sin' : 'operativos activos sin'} coordinador a cargo`}
                items={d.actual.sinCoordinador.map(o => ({ k: o.id, t: o.titulo, s: `Desde ${fechaCorta(o.inicio)}` }))} />
            )}
            {d.actual.largos.length > 0 && (
              <Alerta titulo={`${d.actual.largos.length} ${d.actual.largos.length === 1 ? 'operativo abierto' : 'operativos abiertos'} hace más de ${DIAS_LARGO} días`}
                detalle="Revisar si se finaliza o se suspende."
                items={d.actual.largos.map(x => ({ k: x.op.id, t: x.op.titulo, s: `${x.dias} días` }))} />
            )}
          </div>
        )}
      </Seccion>

      {/* ── Filtros: valen para todo lo de abajo ── */}
      <div className="rounded-[var(--radius-card)] p-4 flex flex-wrap items-end gap-3" style={estiloTarjeta}>
        <Filtro etiqueta="Desde"><input type="date" value={f.desde} max={f.hasta} onChange={e => e.target.value && setF({ ...f, desde: e.target.value })} style={campo} /></Filtro>
        <Filtro etiqueta="Hasta"><input type="date" value={f.hasta} min={f.desde} onChange={e => e.target.value && setF({ ...f, hasta: e.target.value })} style={campo} /></Filtro>
        <Filtro etiqueta="Estado">
          <select value={f.estado} onChange={e => setF({ ...f, estado: e.target.value as FiltrosPanel['estado'] })} style={campo}>
            <option value="">Todos</option>
            {ESTADOS_FILTRO.map(s => <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>)}
          </select>
        </Filtro>
        <Filtro etiqueta="Localidad">
          <select value={f.localidad} onChange={e => setF({ ...f, localidad: e.target.value })} style={campo}>
            <option value="">Todas</option>
            {opciones.localidades.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Filtro>
        <Filtro etiqueta="Institución">
          <select value={f.institucion} onChange={e => setF({ ...f, institucion: e.target.value })} style={campo}>
            <option value="">Todas</option>
            {opciones.instituciones.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Filtro>
        <div className="ml-auto flex items-center gap-3" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
          <span><strong style={{ color: 'var(--foreground)' }}>{d.filtrados.length}</strong> operativos en el período</span>
          {hayFiltros && (
            <button onClick={() => setF(filtrosIniciales())} style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── 2 · Resultados ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Seccion titulo="Duración de los operativos" icono={Clock} aclaracion={d.duracion ? `${d.duracion.finalizados} finalizados, del inicio al fin` : undefined}>
          {d.duracion ? (
            <div className="grid grid-cols-2 gap-3">
              <Cifra valor={formatoDuracion(d.duracion.promedioH)} etiqueta="Promedio" />
              <Cifra valor={formatoDuracion(d.duracion.medianaH)} etiqueta="Mediana" detalle="La mitad dura menos que esto" />
              <Cifra valor={formatoDuracion(d.duracion.corto)} etiqueta="El más corto" detalle={d.duracion.masCorto?.titulo} />
              <Cifra valor={formatoDuracion(d.duracion.largo)} etiqueta="El más largo" detalle={d.duracion.masLargo?.titulo} />
            </div>
          ) : <Vacio />}
        </Seccion>

        <Seccion titulo="Resultado de los operativos" icono={Flag} aclaracion="Se elige al finalizar (dato nuevo)">
          {d.tasaResolucion !== null ? (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <p className="tabular-nums" style={{ fontSize: 30, fontWeight: 700, color: 'var(--foreground)' }}>{Math.round(d.tasaResolucion * 100)} %</p>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>resueltos: persona u objeto hallado</p>
              </div>
              <BarrasHorizontales color={series[0]} datos={d.resultados.map(x => ({ nombre: ETIQUETA_RESULTADO[x.resultado], valor: x.n }))} />
            </>
          ) : <Vacio texto="Ningún operativo finalizado en el período." />}
        </Seccion>
      </div>

      {/* ── 4 · Instituciones y especialidades ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Seccion titulo="Participación por institución" icono={Building2} aclaracion="En cuántos operativos intervino cada una">
          <Torta datos={agruparPorciones(d.instituciones)} colores={series} unidad="participaciones" />
        </Seccion>
        <Seccion titulo="Participación por especialidad" icono={Stethoscope} aclaracion="En cuántos operativos intervino cada una">
          <Torta datos={agruparPorciones(d.especialidades)} colores={series} unidad="participaciones" />
        </Seccion>
      </div>

      {/* ── 5 · Mapa de calor ── */}
      <Seccion titulo="Dónde se busca" icono={MapaIcono} aclaracion="Áreas de búsqueda de los operativos del período: más intenso = más operativos en la zona">
        <MapaCalor ops={d.filtrados} isDark={isDark} />
      </Seccion>

      {/* ── 6 · Evolución ── */}
      <Seccion titulo="Operativos por mes" icono={CalendarRange}>
        <OperativosPorMes meses={d.meses} colorBarras={series[0]} colorLinea={series[1]} />
      </Seccion>
    </div>
  );
}

/**
 * Versión 2 (20/10, boceto del usuario del 21/10). Al entrar se ve todo hasta el mapa y las
 * dos tortas sin scrollear: arriba los operativos por estado; abajo, a la izquierda, el mapa
 * de la provincia con los datos del operativo elegido y, a la derecha, los agentes y las
 * tortas. «Operativos por mes» queda debajo y se llega scrolleando. En pantallas angostas
 * todo se apila en una columna.
 */
function PanelV2() {
  const { isDark } = useApp();
  const series = isDark ? SERIES_OSCURO : SERIES_CLARO;
  const todos = OPERATIVOS_PANEL_MOCK;
  // Todo es de AHORA (pedido del 21/10): los operativos abiertos en algún momento de hoy. Más adelante
  // cada tarjeta va a tener su propio selector de fecha; hoy es el valor por defecto.
  const hoy = useMemo(() => {
    const d = iso(new Date());
    return calcularPanel(todos, { desde: d, hasta: d, estado: '', localidad: '', institucion: '' });
  }, [todos]);
  const ultimoAnio = useMemo(() => calcularPanel(todos, filtrosIniciales()), [todos]);
  const { porEstado, agentes } = hoy.actual;
  const finalizadosHoy = hoy.filtrados.filter(o => o.estado === 'FINALIZADO').length;
  // Las tortas crecen con la altura de la pantalla: en una notebook entran chicas, en un monitor grande no quedan perdidas.
  const [alto, setAlto] = useState(() => window.innerHeight);
  useEffect(() => {
    const f = () => setAlto(window.innerHeight);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const diametro = alto >= 1000 ? 150 : alto >= 860 ? 124 : 92;

  // Una sola grilla: 4 columnas en escritorio, 2 en tablet, 1 en celular. El mapa ocupa dos columnas
  // (el ancho de «Operativos activos» + «Operativos nuevos») y las tres filas de la derecha.
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador valor={porEstado.ACTIVO} etiqueta="Operativos activos" icono={Radio} />
        <Indicador valor={porEstado.NUEVO + porEstado.EN_PLANIFICACION} etiqueta="Operativos nuevos" detalle="Todavía sin activar" icono={FlaskConical} />
        <Indicador valor={porEstado.EN_PROCESO} etiqueta="Operativos en proceso" icono={CalendarRange} />
        <Indicador valor={finalizadosHoy} etiqueta="Operativos finalizados" detalle="Hoy" icono={Flag} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[380px]">
        <section className="md:col-span-2 lg:row-span-3 rounded-[var(--radius-card)] p-4 flex flex-col min-h-0" style={estiloTarjeta}>
          <div className="lg:flex-1 lg:min-h-0">
            <MapaProvincia historial={hoy.filtrados} todos={todos} isDark={isDark}
              encabezado={<div className="mr-auto -mb-2"><TituloTarjeta icono={MapaIcono} titulo="Mapa de la provincia" /></div>} />
          </div>
        </section>

        <Indicador valor={agentes.terreno + agentes.base} etiqueta="Agentes trabajando"
          detalle={`${agentes.terreno} en el terreno · ${agentes.base} en la base`} icono={Users} />
        <Indicador valor={agentes.noDisponible} etiqueta="Agentes no disponibles" icono={UserX} />

        <section className="lg:col-span-2 rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-h-0" style={estiloTarjeta}>
          <TituloTarjeta icono={Building2} titulo="Participación por institución" aclaracion="en los operativos de hoy" />
          <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
            <Torta datos={agruparPorciones(hoy.instituciones, 5)} colores={series} unidad="operativos" diametro={diametro} compacta />
          </div>
        </section>
        <section className="lg:col-span-2 rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-h-0" style={estiloTarjeta}>
          <TituloTarjeta icono={Stethoscope} titulo="Participación por especialidad" aclaracion="en los operativos de hoy" />
          <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
            <Torta datos={agruparPorciones(hoy.especialidades, 5)} colores={series} unidad="operativos" diametro={diametro} compacta />
          </div>
        </section>
      </div>

      {/* Debajo de la primera pantalla: se llega scrolleando */}
      <Seccion titulo="Operativos por mes" icono={CalendarRange} aclaracion="Últimos 12 meses, hasta hoy">
        <OperativosPorMes meses={ultimoAnio.meses} colorBarras={series[0]} colorLinea={series[1]} />
      </Seccion>
    </div>
  );
}

function TituloTarjeta({ icono: I, titulo, aclaracion }: { icono: typeof Radio; titulo: string; aclaracion?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
      <I size={15} style={{ color: 'var(--primary)', alignSelf: 'center' }} />
      <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{titulo}</h2>
      {aclaracion && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{aclaracion}</span>}
    </div>
  );
}

/** Tarjeta chica con una cifra (fila de estados y agentes de la versión 2). */
function Indicador({ valor, etiqueta, detalle, icono: I }: { valor: number; etiqueta: string; detalle?: string; icono: typeof Radio }) {
  return (
    <div className="rounded-[var(--radius-card)] px-4 py-2.5 flex items-center gap-3" style={estiloTarjeta}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(229,75,75,0.1)' }}>
        <I size={17} style={{ color: 'var(--primary)' }} />
      </div>
      <div className="min-w-0">
        <p className="tabular-nums" style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 700, color: 'var(--foreground)' }}>{valor}</p>
        <p className="leading-tight" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{etiqueta}</p>
        {detalle && <p className="leading-tight" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{detalle}</p>}
      </div>
    </div>
  );
}

function Filtro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
      {etiqueta}
      {children}
    </label>
  );
}

function Alerta({ titulo, detalle, items }: { titulo: string; detalle?: string; items: { k: string; t: string; s: string }[] }) {
  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}>
      <p className="flex items-center gap-2" style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>
        <AlertTriangle size={15} style={{ color: '#d97706' }} /> {titulo}
      </p>
      {detalle && <p className="mt-0.5 ml-6" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{detalle}</p>}
      <ul className="mt-2 ml-6 flex flex-col gap-1">
        {items.map(i => (
          <li key={i.k} className="flex gap-2" style={{ fontSize: 'var(--text-label)' }}>
            <span className="truncate" style={{ color: 'var(--foreground)' }}>{i.t}</span>
            <span className="ml-auto shrink-0" style={{ color: 'var(--muted-foreground)' }}>{i.s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Vacio({ texto = 'Sin datos para los filtros elegidos.' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center py-8" style={{ color: 'var(--muted-foreground)' }}>
      <LayoutDashboard size={24} style={{ opacity: 0.4 }} />
      <p className="mt-2" style={{ fontSize: 'var(--text-label)' }}>{texto}</p>
    </div>
  );
}

