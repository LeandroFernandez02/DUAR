/**
 * Tablero de grupos con arrastrar y soltar (CU-22 paso 6, CU-24, CU-25), diseño CALÍVAR del 23/10.
 *
 * Es sólo la vista: recibe grupos y agentes ya cargados de la API y avisa qué
 * se arrastró adónde. Quien decide si el movimiento vale es el backend
 * (grupo.model.js#moverAgente); acá se anticipan las mismas reglas sólo para
 * que el resaltado no invite a un movimiento que va a rebotar (`veredicto`):
 *  · el Líder no se arrastra (CU-22 6.1 / CU-25 2.1) — se cambia en Editar;
 *  · sólo se arrastra con el grupo En formación (24/09); en el terreno se usa
 *    "Retirar del grupo" (CU-27);
 *  · un recurso especial no entra a un grupo de rastrillaje (26/09), salvo
 *    que vaya de conductor (29/09).
 * El estado del grupo se cambia con los botones de acción de cada tarjeta.
 *
 * Disposición (04 §3.1): escritorio y tablet con «Sin grupo» a la izquierda y los grupos a la
 * derecha, en columnas tipo masonry (cada tarjeta va a la columna más corta, sin huecos); mobile
 * (< 700) en una columna con «Ordenar por». Con mouse se arrastra la fila entera (HTML5); con el
 * dedo, sólo desde el ícono de agarre (pointer events), con aviso, chip flotante y auto-scroll.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  AlertTriangle, Edit2, Trash2, GripVertical, Users, UserMinus, Wand2, History, Plus, Pentagon, ArrowUpDown, Hand,
} from 'lucide-react';
import StatusBadge, { colorDeEstado } from '../../components/shared/StatusBadge';
import AvatarAgente from '../../components/shared/AvatarAgente';
import EstadoAgenteBadge from '../../components/shared/EstadoAgenteBadge';
import FiltroDesplegable from '../../components/shared/FiltroDesplegable';
import { BotonIcono, BotonTextoFiltro, tarjetaBase } from '../../components/shared/Listados';
import { EN_OPERACION, ACCION_INFO, ETIQUETA_ESTADO_GRUPO, accionesPara } from '../../components/shared/grupos/piezas';
import type { AccionGrupo, EstadoGrupoApi, GrupoApi, IntegranteGrupoApi } from '../../services/api';
import type { EstadoOperativoAgente } from '../../data/mockData';
import { haceCuanto, horaExacta } from '../../utils/tiempo';
import { useEsCompacto, useEsTablet } from '../../utils/useAncho';

/** Lo que el tablero necesita de un agente, venga del listado de personal o de un grupo. */
export interface AgenteTablero {
  id: string;              // agentes_operativo.id
  nombre: string;
  apellido: string;
  esDuar: boolean;
  esConductor: boolean;
  especialidadNombre: string | null;
  /** Dotación. Sólo la trae el listado de personal (no los integrantes de un grupo). */
  institucionNombre?: string | null;
  estado: string;
  estadoActualizadoEn: string;
  /** Dron, canes, paramédico, caballería, buzos: sólo entra a grupos especiales (salvo de conductor). */
  esRecursoCritico: boolean;
}

/** Un recurso especial entra a uno de rastrillaje sólo de conductor (espejo de grupo.model.js#entraARastrillaje). */
const entraARastrillaje = (a: { esRecursoCritico: boolean; esConductor: boolean }) => !a.esRecursoCritico || a.esConductor;

/** Lo que se está arrastrando. Vive también fuera de React para que el tablero pause su refresco. */
interface Arrastre { agente: AgenteTablero; desde: string | null }
let enCurso: Arrastre | null = null;
export const hayArrastreEnCurso = () => enCurso !== null;

/** Id de la zona «Sin grupo» en `data-zona` (los grupos usan su propio id). */
const SIN = '__sin_grupo';
const ORDEN_ESTADOS: EstadoGrupoApi[] = ['EN_FORMACION', 'CONFIRMADO', 'ASIGNADO', 'DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA'];

/** Por qué no se puede arrastrar en un grupo que no está En formación. */
function motivoComposicionCerrada(estado: GrupoApi['estado']) {
  return EN_OPERACION.includes(estado)
    ? 'El grupo está en el terreno: para sacar a alguien usá "Retirar del grupo".'
    : `El grupo está ${ETIQUETA_ESTADO_GRUPO[estado]}: reabrilo para cambiar su composición.`;
}

/** Avisos de la tarjeta, legibles en los dos temas (en oscuro se aclaran texto y tinte). */
const AVISO_ROJO: CSSProperties = {
  background: 'color-mix(in srgb, var(--destructive) calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)',
  color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #b91c1c)',
  border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)',
};
const AVISO_AMBAR: CSSProperties = {
  background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)',
  color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)',
  border: '1px solid color-mix(in srgb, #d97706 30%, transparent)',
};

function Chip({ children, lider }: { children: ReactNode; lider?: boolean }) {
  return (
    <span style={{
      fontSize: 'calc(9.5px * var(--escala-texto))', fontWeight: 700, padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap',
      background: lider ? 'color-mix(in srgb, var(--primary) 16%, transparent)' : 'var(--card)',
      color: lider ? 'var(--foreground)' : 'var(--muted-foreground)',
    }}>{children}</span>
  );
}

/** Fila de un agente en el tablero. Dentro de un grupo no muestra su estado ni el chip DUAR (sí «Líder»). */
function FilaTablero({ agente, lider, enGrupo, fijo, motivoFijo, tactil, onDragInicio, onDragFin, onTactil, onRetirar }: {
  agente: AgenteTablero;
  lider?: boolean;
  enGrupo?: boolean;
  /** No se puede arrastrar (Líder, grupo fuera de formación u operativo cerrado). */
  fijo: boolean;
  motivoFijo?: string;
  /** Pantalla compacta: se arrastra desde el ícono de agarre y los chips van en una segunda línea. */
  tactil: boolean;
  onDragInicio: () => void;
  onDragFin: () => void;
  onTactil: (e: React.PointerEvent) => void;
  /** CU-27: sólo en grupos en el terreno. */
  onRetirar?: () => void;
}) {
  const [levantada, setLevantada] = useState(false);
  const chips = [
    lider ? <Chip key="l" lider>Líder</Chip> : null,
    agente.esDuar && !enGrupo ? <Chip key="d">DUAR</Chip> : null,
  ].filter(Boolean);
  const estado = !enGrupo && <EstadoAgenteBadge estado={agente.estado.toLowerCase() as EstadoOperativoAgente} size="xs" />;
  const html5 = !fijo && !tactil;

  return (
    <div
      draggable={html5}
      onDragStart={html5 ? e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', agente.id); setLevantada(true); setTimeout(onDragInicio, 0); } : undefined}
      onDragEnd={html5 ? () => { setLevantada(false); onDragFin(); } : undefined}
      // En tablet con mouse también se arrastra desde la fila.
      onPointerDown={tactil && !fijo ? e => { if (e.pointerType === 'mouse' && e.button === 0) onTactil(e); } : undefined}
      title={fijo ? motivoFijo : tactil ? undefined : 'Arrastrar a un grupo'}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, boxSizing: 'border-box',
        padding: tactil ? '6px 4px 6px 10px' : '8px 10px', minHeight: tactil ? 52 : undefined,
        borderRadius: 'var(--radius-md)', background: 'var(--muted)', border: '1px solid transparent',
        cursor: fijo ? 'default' : 'grab', userSelect: 'none', opacity: levantada ? 0.4 : 1,
      }}>
      <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={30} />
      <div style={{ flex: 1, minWidth: 64 }}>
        <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {agente.nombre} {agente.apellido}
        </p>
        <p style={{ margin: 0, fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={enGrupo ? undefined : `Desde ${horaExacta(agente.estadoActualizadoEn)}`}>
          {agente.especialidadNombre || 'Sin especialidad'}{!enGrupo && ` · ${haceCuanto(agente.estadoActualizadoEn)}`}
        </p>
        {tactil && (chips.length > 0 || estado) && (
          <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 4 }}>{chips}{estado}</div>
        )}
      </div>
      {!tactil && <>{chips}{estado}</>}
      {onRetirar && (
        <span className="flex"><BotonIcono icono={UserMinus} tono="peligro" title={`Retirar del grupo a ${agente.nombre} ${agente.apellido} (CU-27)`} onClick={onRetirar} /></span>
      )}
      {tactil && !fijo && (
        <span aria-label={`Arrastrar a ${agente.nombre} ${agente.apellido} a un grupo`} role="button"
          onPointerDown={e => { if (e.pointerType !== 'mouse') { e.preventDefault(); onTactil(e); } }}
          style={{ width: 36, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', touchAction: 'none', cursor: 'grab' }}>
          <GripVertical size={18} />
        </span>
      )}
    </div>
  );
}

/** Rótulo de sección en mayúsculas con contador («AGENTES DE RASTRILLAJE · 3», «CONDUCTOR · 1»). */
function TituloSeccion({ texto, n }: { texto: string; n: number }) {
  return (
    <p style={{ margin: '8px 2px 2px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'calc(10.5px * var(--escala-texto))', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
      {texto}<span style={{ fontWeight: 700, opacity: 0.8 }}>· {n}</span>
    </p>
  );
}

function VacioSeccion({ texto }: { texto: string }) {
  return <p style={{ margin: '0 2px 4px', fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{texto}</p>;
}

/** Fila «Filtrar por:» que va afuera de las tarjetas. */
function FilaFiltro({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
      <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Filtrar por:</span>{children}
    </div>
  );
}

/**
 * Zona de soltado (tarjeta de grupo o «Sin grupo»). Con un arrastre activo muestra borde punteado;
 * con el arrastre encima, la tarjeta mantiene su forma: borde primario, tinte al 5%, contenido a .55
 * y una leyenda centrada de sólo texto. Si las reglas no lo permiten, la leyenda dice por qué.
 */
function ZonaSoltar({ id, activo, sobre, ok, leyenda, onDragSobre, onDragFuera, onSoltar, children, estilo }: {
  id: string; activo: boolean; sobre: boolean; ok: boolean; leyenda: string;
  onDragSobre: () => void; onDragFuera: () => void; onSoltar: () => void;
  children: ReactNode; estilo?: CSSProperties;
}) {
  return (
    <div data-zona={id}
      onDragOver={e => { if (!activo && !hayArrastreEnCurso()) return; e.preventDefault(); e.dataTransfer.dropEffect = ok ? 'move' : 'none'; if (!sobre) onDragSobre(); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragFuera(); }}
      onDrop={e => { e.preventDefault(); onSoltar(); }}
      style={{
        ...tarjetaBase, position: 'relative', overflow: 'hidden', ...estilo,
        outline: activo ? (sobre ? `2px solid ${ok ? 'var(--primary)' : 'var(--destructive)'}` : '2px dashed var(--border)') : 'none', outlineOffset: 2,
        background: sobre ? `color-mix(in srgb, ${ok ? 'var(--primary)' : 'var(--destructive)'} 5%, var(--card))` : 'var(--card)',
        transition: 'background .15s, outline-color .15s',
      }}>
      {sobre && (
        <div aria-hidden="true" style={{
          position: 'absolute', left: 12, right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2, textAlign: 'center', pointerEvents: 'none',
          fontSize: 'calc(13px * var(--escala-texto))', fontWeight: 600, color: ok ? 'var(--foreground)' : 'var(--destructive)',
          textShadow: '0 0 6px var(--card), 0 0 12px var(--card), 0 0 18px var(--card)',
        }}>{leyenda}</div>
      )}
      <div style={{ opacity: sobre ? 0.55 : 1, transition: 'opacity .15s ease' }}>{children}</div>
    </div>
  );
}

interface Props {
  grupos: GrupoApi[];
  sinGrupo: AgenteTablero[];
  editable: boolean;
  onMover: (agente: AgenteTablero, destino: GrupoApi | null) => void;
  onEditar: (grupo: GrupoApi) => void;
  onDisolver: (grupo: GrupoApi) => void;
  onRetirar: (grupo: GrupoApi, integrante: IntegranteGrupoApi) => void;
  onArmadoAutomatico: () => void;
  onAccion: (grupo: GrupoApi, accion: AccionGrupo) => void;
  onLineaTiempo: (grupo: GrupoApi) => void;
  /** Aviso corto abajo (toast): «Soltalo sobre un grupo para asignarlo», motivo de un rechazo. */
  onAviso: (texto: string) => void;
  /** Atajo del panel vacío ("Crear primer grupo"). Sin esto no se ofrece el atajo. */
  onNuevoGrupo?: () => void;
}

type TipoSinGrupo = 'rastrillaje' | 'especiales' | 'conductores';

export default function GruposDnD({
  grupos, sinGrupo, editable, onMover, onEditar, onDisolver, onRetirar, onArmadoAutomatico,
  onAccion, onLineaTiempo, onAviso, onNuevoGrupo,
}: Props) {
  const compacto = useEsCompacto();
  const tablet = useEsTablet();
  const movil = compacto && !tablet;

  const [drag, setDrag] = useState<Arrastre | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  /** Arrastre con el dedo (o mouse en tablet): posición del chip flotante. */
  const [tactil, setTactil] = useState<{ x: number; y: number } | null>(null);
  const [orden, setOrden] = useState<'grupos' | 'disponibles'>('grupos');
  const [fTipo, setFTipo] = useState<TipoSinGrupo[]>([]);
  const [fEstado, setFEstado] = useState<EstadoGrupoApi[]>([]);

  const empezar = (a: Arrastre) => { enCurso = a; setDrag(a); };
  const terminar = () => { enCurso = null; setDrag(null); setSobre(null); setTactil(null); };
  useEffect(() => () => { enCurso = null; }, []);

  /** ¿Se puede soltar `d` en la zona? Mismas reglas que el backend; `motivo` explica un rechazo. */
  const veredicto = (d: Arrastre, zona: string): { ok: boolean; noop: boolean; motivo: string } => {
    if (zona === SIN) {
      if (!d.desde) return { ok: false, noop: true, motivo: '' };
      return { ok: true, noop: false, motivo: '' };
    }
    const g = grupos.find(x => x.id === zona);
    if (!g || d.desde === g.id) return { ok: false, noop: true, motivo: 'Ya está en este grupo' };
    if (g.estado !== 'EN_FORMACION') return { ok: false, noop: false, motivo: motivoComposicionCerrada(g.estado) };
    if (g.clase === 'RASTRILLAJE' && !entraARastrillaje(d.agente)) return { ok: false, noop: false, motivo: 'Los recursos especiales van en un grupo especial (salvo de conductor)' };
    return { ok: true, noop: false, motivo: '' };
  };

  const soltar = (d: Arrastre, zona: string | null) => {
    if (!zona) { onAviso('Soltalo sobre un grupo para asignarlo'); return; }
    const v = veredicto(d, zona);
    if (v.noop) return;
    if (!v.ok) { onAviso(v.motivo); return; }
    onMover(d.agente, zona === SIN ? null : grupos.find(g => g.id === zona) ?? null);
  };
  // El arrastre táctil vive en listeners de la ventana: siempre leen la versión más nueva.
  const soltarRef = useRef(soltar);
  soltarRef.current = soltar;
  const raiz = useRef<HTMLDivElement>(null);

  const iniciarTactil = (a: Arrastre, e: React.PointerEvent) => {
    if (enCurso) return;
    empezar(a);
    navigator.vibrate?.(20);
    const zonaBajo = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-zona]')?.dataset.zona ?? null;
    let ultimo = { x: e.clientX, y: e.clientY };
    setTactil(ultimo);
    let raf = 0;
    // Auto-scroll cerca de los bordes. El contenedor se busca en cada cuadro: puede re-montarse.
    const auto = () => {
      const sc = raiz.current?.closest<HTMLElement>('.scroll-contenido');
      if (sc) {
        const r = sc.getBoundingClientRect(), Z = 150;
        const d = ultimo.y < r.top + Z ? -(Z - Math.max(0, ultimo.y - r.top)) / Z
          : ultimo.y > r.bottom - Z ? (Z - Math.max(0, r.bottom - ultimo.y)) / Z : 0;
        if (d) {
          sc.scrollBy({ top: Math.round(Math.sign(d) * (4 + Math.abs(d) * 18)), behavior: 'instant' as ScrollBehavior });
          setSobre(zonaBajo(ultimo.x, ultimo.y));
        }
      }
      raf = requestAnimationFrame(auto);
    };
    raf = requestAnimationFrame(auto);
    const mov = (ev: PointerEvent) => {
      ev.preventDefault();
      ultimo = { x: ev.clientX, y: ev.clientY };
      setTactil(ultimo);
      setSobre(zonaBajo(ev.clientX, ev.clientY));
    };
    const fin = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      const zona = ev.type === 'pointerup' ? zonaBajo(ev.clientX, ev.clientY) : null;
      terminar();
      if (ev.type === 'pointerup') soltarRef.current(a, zona);
    };
    window.addEventListener('pointermove', mov, { passive: false });
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  };

  const propsZona = (id: string, leyendaOk: string) => {
    const v = drag ? veredicto(drag, id) : { ok: false, noop: true, motivo: '' };
    const encima = !!drag && sobre === id && !v.noop;
    return {
      id, activo: !!drag, sobre: encima, ok: v.ok, leyenda: v.ok ? leyendaOk : v.motivo,
      onDragSobre: () => setSobre(id), onDragFuera: () => setSobre(s => (s === id ? null : s)),
      onSoltar: () => { const d = drag; terminar(); if (d) soltar(d, id); },
    };
  };

  /* ── Columnas masonry: cada tarjeta va a la columna más corta (ResizeObserver) ── */
  // Ref por función: el contenedor se re-monta al pasar de mobile a escritorio y hay que observar el nuevo.
  const [elCols, refCols] = useState<HTMLDivElement | null>(null);
  const [nCols, setNCols] = useState(2);
  useLayoutEffect(() => {
    if (!elCols || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => setNCols(Math.max(1, Math.floor((elCols.clientWidth + 16) / 296))));
    ro.observe(elCols);
    return () => ro.disconnect();
  }, [elCols]);

  /* ── «Sin grupo» ── */
  const deRastrillaje = sinGrupo.filter(a => !a.esConductor && !a.esRecursoCritico);
  const especiales = sinGrupo.filter(a => !a.esConductor && a.esRecursoCritico);
  const conductores = sinGrupo.filter(a => a.esConductor);
  const verTipo = (t: TipoSinGrupo) => !fTipo.length || fTipo.includes(t);
  const filaSinGrupo = (a: AgenteTablero) => (
    <FilaTablero key={a.id} agente={a} fijo={!editable} motivoFijo="El operativo está cerrado" tactil={compacto}
      onDragInicio={() => empezar({ agente: a, desde: null })} onDragFin={terminar}
      onTactil={e => iniciarTactil({ agente: a, desde: null }, e)} />
  );
  const filtroSinGrupo = (
    <FilaFiltro>
      <FiltroDesplegable<TipoSinGrupo> titulo="Tipo" seleccion={fTipo} onCambiar={setFTipo} opciones={[
        { value: 'rastrillaje', label: 'Agentes de rastrillaje', count: deRastrillaje.length },
        { value: 'especiales', label: 'Agentes especiales', count: especiales.length },
        { value: 'conductores', label: 'Conductores', count: conductores.length },
      ]} />
      {fTipo.length > 0 && <BotonTextoFiltro onClick={() => setFTipo([])}>Limpiar</BotonTextoFiltro>}
    </FilaFiltro>
  );
  const cardSinGrupo = (
    <ZonaSoltar {...propsZona(SIN, 'Soltar para sacar del grupo')} estilo={{ padding: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 2, gap: 8 }}>
        <span style={{ fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Sin grupo</span>
        <span className="flex items-center" style={{ gap: 4 }}>
          {editable && <BotonIcono icono={Wand2} title="Asignación automática: arma grupos de rastrillaje con los agentes" onClick={onArmadoAutomatico} />}
          <span style={{ fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{sinGrupo.length}</span>
        </span>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {verTipo('rastrillaje') && <>
          <TituloSeccion texto="Agentes de rastrillaje" n={deRastrillaje.length} />
          {deRastrillaje.length ? deRastrillaje.map(filaSinGrupo) : <VacioSeccion texto="No hay agentes de rastrillaje disponibles sin grupo." />}
        </>}
        {verTipo('especiales') && <>
          <TituloSeccion texto="Agentes especiales" n={especiales.length} />
          {especiales.length ? especiales.map(filaSinGrupo) : <VacioSeccion texto="No hay agentes especiales disponibles sin grupo." />}
        </>}
        {verTipo('conductores') && <>
          <TituloSeccion texto="Conductores" n={conductores.length} />
          {conductores.length ? conductores.map(filaSinGrupo) : <VacioSeccion texto="No hay conductores disponibles sin grupo." />}
        </>}
      </div>
      {compacto && editable && sinGrupo.length > 0 && (
        <p className="flex items-center" style={{ margin: '10px 0 0', gap: 6, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
          <GripVertical size={13} style={{ flexShrink: 0 }} />Mantené y arrastrá desde el ícono para sumar a un grupo.
        </p>
      )}
    </ZonaSoltar>
  );
  const panelSinGrupo = <div className="flex flex-col" style={{ gap: 12 }}>{!tactil && filtroSinGrupo}{cardSinGrupo}</div>;

  /* ── Grupos ── */
  const estadosPresentes = ORDEN_ESTADOS.filter(k => grupos.some(g => g.estado === k) || fEstado.includes(k));
  // Mientras se arrastra, el filtro se ignora: todos los grupos son destino posible.
  const filtrando = !drag && fEstado.length > 0;
  const visibles = filtrando ? grupos.filter(g => fEstado.includes(g.estado)) : grupos;

  const tarjeta = (g: GrupoApi) => {
    const enOperacion = EN_OPERACION.includes(g.estado);
    const enFormacion = g.estado === 'EN_FORMACION';
    const rastrillaje = g.clase === 'RASTRILLAJE';
    // Barra y cuadradito = color del ESTADO; pentágono = color del grupo (el de su polígono en el mapa).
    const color = colorDeEstado(g.estado.toLowerCase());
    const acciones = accionesPara(g.estado);
    const lider = g.integrantes.filter(i => i.id === g.liderId);
    const resto = g.integrantes.filter(i => i.id !== g.liderId);
    const agentes = resto.filter(i => !i.esConductor);
    const conds = resto.filter(i => i.esConductor);
    const fila = (i: IntegranteGrupoApi) => {
      const esLider = i.id === g.liderId;
      const fijo = !editable || esLider || !enFormacion;
      const motivo = !editable ? 'El operativo está cerrado'
        : esLider ? 'El Líder no se mueve arrastrando: cambialo desde Editar grupo.'
        : motivoComposicionCerrada(g.estado);
      return (
        <FilaTablero key={i.id} agente={i} lider={esLider} enGrupo fijo={fijo} motivoFijo={motivo} tactil={compacto}
          onDragInicio={() => empezar({ agente: i, desde: g.id })} onDragFin={terminar}
          onTactil={e => iniciarTactil({ agente: i, desde: g.id }, e)}
          onRetirar={editable && enOperacion ? () => onRetirar(g, i) : undefined} />
      );
    };
    return (
      <ZonaSoltar key={g.id} {...propsZona(g.id, `Soltar para sumar a ${drag?.agente.nombre ?? ''}`)}>
        <div title={ETIQUETA_ESTADO_GRUPO[g.estado]} style={{ height: 4, background: color }} />
        <div style={{ padding: 14 }}>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>{g.nombre}</span>
            <StatusBadge estado={g.estado.toLowerCase()} size="sm" />
          </div>
          <p className="flex items-center flex-wrap" style={{ margin: '0 0 12px 20px', gap: 4, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}
            title={`Desde ${horaExacta(g.estadoActualizadoEn)}`}>
            <Pentagon size={11} style={{ color: g.color || 'var(--muted-foreground)', fill: g.color ? `color-mix(in srgb, ${g.color} 25%, transparent)` : 'none', flexShrink: 0 }} />
            {g.zonaAsignada || 'Sin sector asignado'} · {g.integrantes.length} integrante{g.integrantes.length !== 1 ? 's' : ''} · {haceCuanto(g.estadoActualizadoEn)}
            {!rastrillaje && <span title="Grupo especial: recursos especiales, con agentes de apoyo" style={{ marginLeft: 2 }}><Chip>Especial</Chip></span>}
          </p>

          {/* Binomio mínimo (CU-27): en el terreno con uno solo rastrillando. El grupo sigue; se avisa. */}
          {g.alertaBinomio && (
            <div role="alert" className="flex items-start" style={{ ...AVISO_ROJO, gap: 6, padding: 8, marginBottom: 10, borderRadius: 'var(--radius-md)', fontSize: 'calc(11px * var(--escala-texto))', lineHeight: 1.4, fontWeight: 600 }}>
              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              Una sola persona rastrillando: está sola en el polígono.
            </div>
          )}
          {!g.liderId && (
            <div className="flex items-start" style={{ ...AVISO_AMBAR, gap: 6, padding: 8, marginBottom: 10, borderRadius: 'var(--radius-md)', fontSize: 'calc(11px * var(--escala-texto))', lineHeight: 1.4 }}>
              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              Sin Líder: el anterior dejó el operativo. Editá el grupo para designar {rastrillaje ? 'uno del DUAR' : 'otro'}.
            </div>
          )}

          {g.integrantes.length > 0 ? (
            <div className="flex flex-col" style={{ gap: 6 }}>
              {lider.map(fila)}{agentes.map(fila)}
              {conds.length > 0 && <><TituloSeccion texto={conds.length === 1 ? 'Conductor' : 'Conductores'} n={conds.length} />{conds.map(fila)}</>}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', textAlign: 'center', fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
              Soltar para sumar al grupo
            </div>
          )}

          {/* Acciones: las de estado que corresponden ahora (izquierda) y las del grupo (derecha). */}
          <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            {editable && acciones.map(a => {
              const principal = a !== 'reabrir';
              return (
                <button key={a} type="button" onClick={() => onAccion(g, a)}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-button)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
                    fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 600,
                    border: principal ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    background: principal ? 'var(--primary)' : 'var(--card)',
                    color: principal ? 'var(--primary-foreground)' : 'var(--foreground)',
                  }}>
                  {ACCION_INFO[a].boton}
                </button>
              );
            })}
            <span className="flex items-center" style={{ marginLeft: 'auto', gap: 2 }}>
              <BotonIcono icono={History} title={`Línea de tiempo de ${g.nombre}`} onClick={() => onLineaTiempo(g)} />
              {editable && <BotonIcono icono={Edit2} title={`Editar ${g.nombre}`} onClick={() => onEditar(g)} />}
              {editable && <BotonIcono icono={Trash2} tono="peligro" title={`Disolver ${g.nombre}`} onClick={() => onDisolver(g)} />}
            </span>
          </div>
        </div>
      </ZonaSoltar>
    );
  };

  /** Alto aproximado de una tarjeta, para repartirlas en la columna más corta. */
  const alto = (g: GrupoApi) => 150 + 62 * Math.max(1, g.integrantes.length) + (g.alertaBinomio ? 50 : 0) + (!g.liderId ? 60 : 0);
  const repartir = (lista: GrupoApi[]) => {
    const cols = Array.from({ length: movil ? 1 : nCols }, () => ({ h: 0, items: [] as ReactNode[] }));
    lista.forEach(g => {
      const c = cols.reduce((m, x) => (x.h < m.h ? x : m), cols[0]);
      c.items.push(tarjeta(g));
      c.h += alto(g) + 16;
    });
    return cols.map((c, i) => <div key={i} className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 16 }}>{c.items}</div>);
  };

  const tarjetasGrupos = grupos.length === 0 ? (
    <div className="flex flex-col items-center justify-center text-center gap-1" style={{ ...tarjetaBase, padding: '40px 24px' }}>
      <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 8, background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }}>
        <Users size={22} />
      </div>
      <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--foreground)' }}>Aún no existen grupos cargados</p>
      <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: 340 }}>
        Creá un nuevo grupo para empezar a sumar agentes y organizar el rastreo del operativo.
      </p>
      {onNuevoGrupo && editable && (
        <button type="button" onClick={onNuevoGrupo} className="flex items-center gap-1.5"
          style={{ marginTop: 12, padding: '8px 16px', borderRadius: 'var(--radius-button)', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontSize: 'var(--text-label)', fontWeight: 600, fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}>
          <Plus size={14} /> Crear primer grupo
        </button>
      )}
    </div>
  ) : (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {!tactil && (
        <FilaFiltro>
          <FiltroDesplegable<EstadoGrupoApi> titulo="Estado" seleccion={fEstado} onCambiar={setFEstado}
            opciones={estadosPresentes.map(k => ({ value: k, label: ETIQUETA_ESTADO_GRUPO[k], dot: colorDeEstado(k.toLowerCase()), count: grupos.filter(g => g.estado === k).length }))} />
          {fEstado.length > 0 && <BotonTextoFiltro onClick={() => setFEstado([])}>Limpiar</BotonTextoFiltro>}
        </FilaFiltro>
      )}
      <div ref={refCols} className="flex items-start" style={{ gap: 16 }}>
        {repartir(visibles)}
      </div>
      {filtrando && !visibles.length && <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No hay grupos con ese estado.</p>}
    </div>
  );

  const banner = tactil && drag && (
    <div className="flex items-center" style={{ gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-card)', background: 'color-mix(in srgb, var(--primary) 12%, var(--card))', border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)', fontSize: 'var(--text-label)', color: 'var(--foreground)' }}>
      <Hand size={16} style={{ flexShrink: 0 }} /><span>Soltá a <strong>{drag.agente.nombre} {drag.agente.apellido}</strong> {drag.desde ? 'en otro grupo o en «Sin grupo»' : 'en el grupo que quieras'}</span>
    </div>
  );
  const chipFlotante = tactil && drag && (
    <div aria-hidden="true" className="flex items-center" style={{
      position: 'fixed', left: tactil.x, top: tactil.y, transform: 'translate(-50%, -120%)', zIndex: 3000, pointerEvents: 'none',
      gap: 8, padding: '8px 12px', borderRadius: 999, background: 'var(--card)', border: '1.5px solid var(--primary)', boxShadow: 'var(--elevation-md)',
      fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap',
    }}>
      <AvatarAgente esDuar={drag.agente.esDuar} esConductor={drag.agente.esConductor} esRecursoCritico={drag.agente.esRecursoCritico} tamano={24} />
      {drag.agente.nombre} {drag.agente.apellido}
    </div>
  );

  if (!movil) {
    return (
      <div ref={raiz} className="flex flex-col" style={{ gap: 12, fontFamily: 'var(--font-family-primary)' }}>
        {banner}
        <div className="grid items-start" style={{ gap: 16, gridTemplateColumns: tablet ? 'minmax(300px, 320px) minmax(0, 1fr)' : 'minmax(220px, 280px) minmax(0, 1fr)' }}>
          {panelSinGrupo}
          {tarjetasGrupos}
        </div>
        {chipFlotante}
      </div>
    );
  }

  // Mobile: una columna. Durante un arrastre desde «Sin grupo» se ven sólo los grupos (destinos);
  // si se arrastra desde un grupo, «Sin grupo» queda abajo para poder sacarlo.
  return (
    <div ref={raiz} className="flex flex-col" style={{ gap: 12, fontFamily: 'var(--font-family-primary)' }}>
      {tactil ? banner : (
        <button type="button" onClick={() => setOrden(o => (o === 'grupos' ? 'disponibles' : 'grupos'))}
          aria-label={`Ordenar por: ${orden === 'grupos' ? 'Grupos primero' : 'Disponibles primero'}. Tocá para cambiar`}
          className="inline-flex items-center self-start" style={{ gap: 8, minHeight: 44, padding: '0 4px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}>
          <span style={{ fontSize: 'var(--text-label)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Ordenar por:</span>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>{orden === 'grupos' ? 'Grupos primero' : 'Disponibles primero'}</span>
          <ArrowUpDown size={15} style={{ color: 'var(--muted-foreground)' }} />
        </button>
      )}
      {tactil
        ? <>{tarjetasGrupos}{drag?.desde && cardSinGrupo}</>
        : orden === 'grupos' ? <>{tarjetasGrupos}{panelSinGrupo}</> : <>{panelSinGrupo}{tarjetasGrupos}</>}
      {chipFlotante}
    </div>
  );
}
