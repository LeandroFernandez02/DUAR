import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Radio, Users, UserCheck, UserPlus, Footprints, ShieldAlert, Flag, Building2, Map as MapaIcono, CalendarRange, FilePlus2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OPERATIVOS_PANEL_MOCK, USUARIOS_EN_LINEA_MOCK, AGENTES_REGISTRADOS_MOCK } from '../data/panelGeneralMock';
import { calcularPanel, agruparPorciones, rangoDe, RECURSOS_CRITICOS, type Periodo, type FiltrosPanel } from '../utils/panelGeneral';
import { Torta, OperativosPorMes, SERIES_CLARO, SERIES_OSCURO } from './panel/Graficos';
import MapaProvincia from './panel/MapaProvincia';
import LineaTiempo from './panel/LineaTiempo';

/**
 * Panel general (CU-42): estadísticas de todos los operativos, para el administrador y los
 * coordinadores. Qué muestra lo decidió el equipo (doc «Panel general de operativos») y el
 * boceto del 21/10: arriba los operativos por estado; abajo el mapa de la provincia con los
 * datos del operativo elegido y, al costado, agentes, usuarios y las tortas; «Operativos por
 * mes» al final, con scroll. 4 columnas en escritorio, 2 en tablet, 1 en celular.
 *
 * La línea de tiempo del encabezado (22/10) elige el período: hoy (al entrar), un año entero
 * o un mes, y deja pasar de año en año hasta el actual.
 *
 * Por ahora con datos de ejemplo (data/panelGeneralMock.ts); las cifras se calculan en
 * utils/panelGeneral.ts, que después recibe los datos reales con la misma forma.
 */

const estiloTarjeta = { background: 'var(--card)', boxShadow: 'var(--elevation-sm)' } as const;
const sinFiltros = { estado: '', localidad: '', institucion: '' } as const;
const isoDia = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

export default function GlobalDashboard() {
  const { isDark } = useApp();
  const series = isDark ? SERIES_OSCURO : SERIES_CLARO;
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

  // Las tortas crecen con la altura de la pantalla: en una notebook entran chicas, en un monitor grande no quedan perdidas.
  const [alto, setAlto] = useState(() => window.innerHeight);
  useEffect(() => {
    const f = () => setAlto(window.innerHeight);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const diametro = alto >= 1000 ? 132 : alto >= 860 ? 108 : alto >= 740 ? 88 : 70;
  const enElPeriodo = esHoy ? 'en los operativos de hoy' : `en los operativos de ${periodo.tipo === 'mes' ? rango.etiqueta.toLowerCase() : rango.etiqueta}`;
  const detalleEstado = esHoy ? 'Ahora' : rango.etiqueta;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-4 lg:h-dvh lg:min-h-[640px]" style={{ fontFamily: 'var(--font-family-primary)' }}>
      <div className="flex items-end gap-x-6 gap-y-3 flex-wrap">
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>Panel de Control</h1>
        </div>
        <div className="lg:ml-auto w-full lg:w-auto">
          <LineaTiempo periodo={periodo} onCambiar={setPeriodo} anioMin={anioMin} iniciadosPorMes={iniciadosPorMes} />
        </div>
      </div>

      {/* Operativos por estado en el período */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador valor={cuenta('ACTIVO')} etiqueta="Operativos activos" detalle={detalleEstado} icono={Radio} />
        <Indicador valor={cuenta('NUEVO', 'EN_PLANIFICACION')} etiqueta="Operativos nuevos" detalle="Todavía sin activar" icono={FilePlus2} />
        <Indicador valor={cuenta('EN_PROCESO')} etiqueta="Operativos en proceso" detalle={detalleEstado} icono={CalendarRange} />
        <Indicador valor={finalizados} etiqueta="Operativos finalizados" detalle={esHoy ? 'Hoy' : rango.etiqueta} icono={Flag} />
      </div>

      {/* Agentes y usuarios: siempre de ahora (no hay registro de cuántos trabajaban o estaban conectados en otra fecha). */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador valor={agentes.terreno + agentes.base} etiqueta="Agentes trabajando"
          detalle={`Ahora · en ${enCurso.length} ${enCurso.length === 1 ? 'operativo' : 'operativos'}`} icono={Users} />
        <Indicador valor={agentes.terreno} etiqueta="Agentes en el terreno" detalle="Ahora · fuera de la base" icono={Footprints} />
        <Indicador valor={Math.max(0, AGENTES_REGISTRADOS_MOCK - (agentes.terreno + agentes.base + agentes.noDisponible))} etiqueta="Agentes para convocar"
          detalle={`Sin operativo · de ${AGENTES_REGISTRADOS_MOCK} activos`} icono={UserPlus} />
        <Indicador valor={USUARIOS_EN_LINEA_MOCK.total} etiqueta="Usuarios conectados"
          detalle={`Ahora · ${USUARIOS_EN_LINEA_MOCK.agentes} agentes`} icono={UserCheck} />
      </div>

      {/* Mapa + datos | tortas y operativos por mes: en escritorio ocupa el resto de la pantalla, sin scroll */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:flex-1 lg:min-h-0">
        <section className="md:col-span-2 lg:row-span-2 rounded-[var(--radius-card)] p-4 flex flex-col min-h-0" style={estiloTarjeta}>
          <div className="lg:flex-1 lg:min-h-0">
            <MapaProvincia historial={enPeriodo} isDark={isDark}
              puntos={esHoy ? enCurso : enPeriodo} etiquetaPuntos={esHoy ? 'Operativos en curso' : 'Operativos del período'}
              encabezado={<div className="mr-auto -mb-2"><TituloTarjeta icono={MapaIcono} titulo="Mapa de la provincia" /></div>} />
          </div>
        </section>

        {/* Dos tortas en una tarjeta: instituciones del período y recursos críticos trabajando ahora */}
        <section className="md:col-span-2 rounded-[var(--radius-card)] px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 min-h-0" style={estiloTarjeta}>
          <div className="flex flex-col min-h-0 min-w-0">
            <TituloTarjeta icono={Building2} titulo="Instituciones" aclaracion={enElPeriodo} unaLinea />
            <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
              <Torta datos={agruparPorciones(d.instituciones, 5)} colores={series} unidad="operativos" diametro={diametro} compacta />
            </div>
          </div>
          <div className="flex flex-col min-h-0 min-w-0">
            <TituloTarjeta icono={ShieldAlert} titulo="Recursos críticos" aclaracion="trabajando ahora" unaLinea />
            <div className="flex-1 min-h-0 flex items-center overflow-y-auto">
              <Torta datos={recursosCriticos} colores={series} unidad="agentes" diametro={diametro} compacta />
            </div>
          </div>
        </section>

        {/* Operativos por mes en lugar de la torta de especialidad (22/10): el panel entra entero, sin scroll. */}
        <section className="md:col-span-2 rounded-[var(--radius-card)] px-4 py-3 flex flex-col min-h-0" style={estiloTarjeta}>
          <TituloTarjeta icono={CalendarRange} titulo="Operativos por mes" aclaracion={esHoy ? 'últimos 12 meses' : `año ${anioElegido}`} />
          <div className="flex-1 min-h-0">
            <OperativosPorMes meses={meses} colorBarras={series[0]} colorLinea={series[1]} compacto />
          </div>
        </section>
      </div>

    </div>
  );
}

function Seccion({ titulo, icono: Icono, aclaracion, children }: { titulo: string; icono: typeof Radio; aclaracion?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] p-5" style={estiloTarjeta}>
      <div className="flex items-baseline gap-2 mb-4 flex-wrap">
        <Icono size={16} style={{ color: 'var(--primary)', alignSelf: 'center' }} />
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{titulo}</h2>
        {aclaracion && <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{aclaracion}</span>}
      </div>
      {children}
    </section>
  );
}

function TituloTarjeta({ icono: I, titulo, aclaracion, unaLinea = false }: { icono: typeof Radio; titulo: string; aclaracion?: string; unaLinea?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 mb-2 min-w-0 ${unaLinea ? 'whitespace-nowrap overflow-hidden' : 'flex-wrap'}`} title={aclaracion ? `${titulo} · ${aclaracion}` : undefined}>
      <I size={15} style={{ color: 'var(--primary)', alignSelf: 'center' }} />
      <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{titulo}</h2>
      {aclaracion && <span className={unaLinea ? 'truncate' : ''} style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{aclaracion}</span>}
    </div>
  );
}

/** Tarjeta chica con una cifra (estados, agentes y usuarios). */
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
