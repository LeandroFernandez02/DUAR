/**
 * Tablero de grupos con Drag & Drop (CU-21 paso 6, CU-23, CU-24).
 *
 * Es sólo la vista: recibe grupos y agentes ya cargados de la API y avisa qué
 * se arrastró adónde. Quien decide si el movimiento vale es el backend
 * (grupo.model.js#moverAgente); acá se anticipan las mismas reglas sólo para
 * que el cursor y el resaltado no inviten a un movimiento que va a rebotar:
 *  · el Líder no se arrastra (CU-21 6.1 / CU-24 2.1) — se cambia en Editar;
 *  · sólo se arrastra con el grupo En formación (24/09); en el terreno se usa
 *    "Retirar del grupo" (CU-26);
 *  · un recurso especial no entra a un grupo de rastrillaje (26/09), salvo
 *    que vaya de conductor (29/09).
 * El estado del grupo se cambia con los botones de acción de cada tarjeta.
 */
import { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Edit2, Trash2, GripVertical, Users, UserX, UserMinus, Wand2, History, MapPin,
  FolderOpen, Plus,
} from 'lucide-react';
import StatusBadge, { colorDeEstado } from '../../components/shared/StatusBadge';
import AvatarAgente from '../../components/shared/AvatarAgente';
import { ESTADO_OP_CONFIG } from '../../components/shared/EditarAgenteModal';
import {
  EN_OPERACION, ACCION_INFO, ETIQUETA_ESTADO_GRUPO, accionesPara,
} from '../../components/shared/grupos/piezas';
import type { AccionGrupo, ClaseGrupoApi, GrupoApi, IntegranteGrupoApi } from '../../services/api';
import type { EstadoOperativoAgente } from '../../data/mockData';
import { haceCuanto, horaExacta } from '../../utils/tiempo';

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

// El arrastre vive fuera de React: HTML5 DnD dispara dragenter/drop en otros
// componentes y no hace falta re-renderizar nada para recordar qué se levantó.
let arrastrando: { agenteId: string; desdeGrupoId: string | null; bloqueado: boolean; esRecursoCritico: boolean; esConductor: boolean } | null = null;
export const hayArrastreEnCurso = () => arrastrando !== null;

/** Texto legible sobre un fondo de color: blanco u oscuro, el que contraste más (WCAG). */
function textoSobre(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  const conBlanco = 1.05 / (l + 0.05);
  const conOscuro = (l + 0.05) / (0.0333 + 0.05); // #1f2937
  return conBlanco >= conOscuro ? '#fff' : '#1f2937';
}

/** `#rrggbb` → `rgba(r,g,b,alpha)`. Con un color inválido cae al rojo primario, que es lo que había antes. */
function conAlfa(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(229,75,75,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function Chip({ agente, desdeGrupoId, esLider = false, colorGrupo, fijo = false, motivoFijo, onRetirar, fondo, detallado = false }: {
  agente: AgenteTablero;
  desdeGrupoId: string | null;
  esLider?: boolean;
  /** El color del grupo, para que el resaltado del Líder no salga siempre rojo. */
  colorGrupo?: string;
  /** No se puede arrastrar (Líder, grupo en operación u operativo cerrado). */
  fijo?: boolean;
  motivoFijo?: string;
  /** CU-26: sólo en grupos en operación. */
  onRetirar?: () => void;
  /** Fondo de la ficha (no líder). Por defecto gris, para contrastar contra un panel blanco.
   *  Dentro de una tarjeta de grupo (que ya es gris) se pasa blanco, para que la ficha no se pierda. */
  fondo?: string;
  /** Estado, dotación y especialidad cada uno en su renglón (panel "Sin grupo"). */
  detallado?: boolean;
}) {
  const [levantado, setLevantado] = useState(false);
  const cfg = ESTADO_OP_CONFIG[agente.estado.toLowerCase() as EstadoOperativoAgente];
  const detalle = [
    esLider ? 'Líder' : agente.esDuar ? 'DUAR' : null,
    agente.especialidadNombre,
  ].filter(Boolean).join(' · ');


  return (
    <div
      draggable={!fijo}
      onDragStart={e => {
        if (fijo) { e.preventDefault(); return; }
        arrastrando = { agenteId: agente.id, desdeGrupoId, bloqueado: false, esRecursoCritico: agente.esRecursoCritico, esConductor: agente.esConductor };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', agente.id);
        setLevantado(true);
      }}
      onDragEnd={() => { setLevantado(false); arrastrando = null; }}
      title={fijo ? motivoFijo : 'Arrastrar a un grupo'}
      style={{
        opacity: levantado ? 0.25 : 1,
        cursor: fijo ? 'default' : 'grab',
        background: esLider ? conAlfa(colorGrupo ?? '#e54b4b', 0.07) : (fondo ?? 'var(--muted)'),
        border: esLider ? `1px dashed ${conAlfa(colorGrupo ?? '#e54b4b', 0.3)}` : '1px solid transparent',
        borderRadius: 'var(--radius-input)',
        padding: '6px 10px',
        display: 'flex', alignItems: 'center', gap: 7,
        userSelect: 'none',
      }}
    >
      {esLider
        ? <ShieldCheck size={12} style={{ color: colorGrupo ?? 'var(--primary)', flexShrink: 0 }} />
        : <GripVertical size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: fijo ? 0.25 : 0.6 }} />}
      <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={detallado ? 30 : 24} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontSize: 11.5, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)',
          fontFamily: 'var(--font-family-primary)', lineHeight: 1.25,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {agente.nombre} {agente.apellido}
        </p>
        {detallado ? (
          <>
            <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.35 }}
              title={`Desde ${horaExacta(agente.estadoActualizadoEn)}`}>
              {cfg && <span style={{ color: cfg.color, fontWeight: 'var(--font-weight-semibold)' }}>● {cfg.label}</span>}
              {' '}{haceCuanto(agente.estadoActualizadoEn)}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.35 }}>
              {agente.institucionNombre ?? 'Sin dotación'}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.35 }}>
              {agente.especialidadNombre ?? 'Sin especialidad'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.3 }}
            title={`Desde ${horaExacta(agente.estadoActualizadoEn)}`}>
            {cfg && <span style={{ color: cfg.color, fontWeight: 'var(--font-weight-semibold)' }}>● {cfg.label}</span>}
            {' '}{haceCuanto(agente.estadoActualizadoEn)}
            {detalle ? ` · ${detalle}` : ''}
          </p>
        )}
      </div>
      {onRetirar && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRetirar(); }}
          title="Retirar del Grupo (CU-26)"
          aria-label={`Retirar del grupo a ${agente.nombre} ${agente.apellido}`}
          style={{ display: 'flex', background: 'none', border: 'none', padding: 3, borderRadius: 4, cursor: 'pointer', color: 'var(--muted-foreground)', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}
        >
          <UserMinus size={13} />
        </button>
      )}
    </div>
  );
}

/** Zona que acepta un soltado. `acepta` decide el resaltado; el backend decide de verdad. */
function useZona(acepta: () => boolean, alSoltar: (agenteId: string) => void) {
  const [encima, setEncima] = useState(false);
  const [valido, setValido] = useState(false);
  return {
    activa: encima && valido,
    rechaza: encima && !valido,
    handlers: {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
      onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setEncima(true); setValido(acepta()); },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) { setEncima(false); setValido(false); }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setEncima(false); setValido(false);
        // `acepta` lee el arrastre en curso: hay que evaluarla ANTES de soltarlo.
        const p = arrastrando;
        const ok = !!p && acepta();
        arrastrando = null;
        if (p && ok) alSoltar(p.agenteId);
      },
    },
  };
}

/** Filtro de un panel: "Todos" y sus dos mitades, cada una con cuántos hay. */
function Filtro<T extends string>({ etiqueta, opciones, valor, onCambiar }: {
  etiqueta: string;
  opciones: { valor: T; texto: string; cantidad: number }[];
  valor: T;
  onCambiar: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-1.5 flex-wrap">
      {opciones.map(o => {
        const sel = o.valor === valor;
        return (
          <button key={o.valor} type="button" role="radio" aria-checked={sel} onClick={() => onCambiar(o.valor)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: sel ? 'rgba(229,75,75,0.08)' : 'transparent',
              color: sel ? 'var(--primary)' : 'var(--muted-foreground)',
              fontSize: 11, fontFamily: 'var(--font-family-primary)', cursor: 'pointer',
              fontWeight: sel ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
            }}>
            {o.texto}
            <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 999, background: sel ? 'rgba(229,75,75,0.15)' : 'var(--muted)' }}>
              {o.cantidad}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Título de una sección dentro de un panel ("Agentes", "Recursos especiales"). */
function TituloSeccion({ texto, cantidad }: { texto: string; cantidad: number }) {
  return (
    <p className="uppercase tracking-wider" style={{
      fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--font-family-primary)', padding: '6px 2px 2px',
    }}>
      {texto} · {cantidad}
    </p>
  );
}

function VacioSeccion({ texto }: { texto: string }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', padding: '6px 4px 8px', opacity: 0.8 }}>
      {texto}
    </p>
  );
}

type FiltroPersonal = 'TODOS' | 'AGENTES' | 'CONDUCTORES' | 'ESPECIALES';

/**
 * Los Disponibles sin grupo, en dos secciones (boceto del 26/09): los agentes,
 * que forman los grupos de rastrillaje y reparte la asignación automática, y
 * los recursos especiales, que se agrupan a mano en grupos especiales.
 */
function PanelSinGrupo({ agentes, noAptos, editable, onSoltar, onArmadoAutomatico, grupos }: {
  agentes: AgenteTablero[];
  noAptos: number;
  editable: boolean;
  grupos: GrupoApi[];
  onSoltar: (agenteId: string) => void;
  onArmadoAutomatico: () => void;
}) {
  const [filtro, setFiltro] = useState<FiltroPersonal>('TODOS');
  const acepta = () => {
    if (!arrastrando?.desdeGrupoId) return false;
    const origen = grupos.find(g => g.id === arrastrando!.desdeGrupoId);
    return !!origen && origen.liderId !== arrastrando!.agenteId && origen.estado === 'EN_FORMACION';
  };
  const zona = useZona(acepta, onSoltar);
  // Tres secciones (29/09). El conductor va en la suya aunque su especialidad sea
  // de recurso especial: en el operativo su papel es manejar, y entra a cualquier grupo.
  const deRastrillaje = agentes.filter(a => !a.esConductor && !a.esRecursoCritico);
  const conductores = agentes.filter(a => a.esConductor);
  const especiales = agentes.filter(a => !a.esConductor && a.esRecursoCritico);
  const chip = (a: AgenteTablero) => (
    <Chip key={a.id} agente={a} desdeGrupoId={null} fijo={!editable} motivoFijo="El operativo está cerrado" detallado />
  );

  return (
    <div {...zona.handlers} style={{
      background: zona.activa ? 'rgba(229,75,75,0.06)' : 'var(--card)',
      borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)',
      border: zona.activa ? '2px dashed var(--primary)' : '2px dashed transparent',
      minHeight: 180, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserX size={15} style={{ color: 'var(--muted-foreground)' }} />
        <p style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
          Sin grupo
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {editable && (
            <button type="button" onClick={onArmadoAutomatico}
              title="Asignación automática: arma grupos de rastrillaje con los agentes"
              aria-label="Asignación automática"
              style={{ display: 'flex', padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,75,75,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Wand2 size={14} />
            </button>
          )}
          <span style={{ fontSize: 10, fontWeight: 'var(--font-weight-semibold)', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 999, padding: '1px 7px' }}>
            {agentes.length}
          </span>
        </div>
      </div>

      <div style={{ padding: '10px 12px 0' }}>
        <Filtro etiqueta="Filtrar personal sin grupo" valor={filtro} onCambiar={setFiltro} opciones={[
          { valor: 'TODOS', texto: 'Todos', cantidad: agentes.length },
          { valor: 'AGENTES', texto: 'Agentes', cantidad: deRastrillaje.length },
          { valor: 'ESPECIALES', texto: 'Recursos especiales', cantidad: especiales.length },
          { valor: 'CONDUCTORES', texto: 'Conductores', cantidad: conductores.length },
        ]} />
      </div>

      <div style={{ padding: '6px 12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {(filtro === 'TODOS' || filtro === 'AGENTES') && (
          <>
            <TituloSeccion texto="Agentes" cantidad={deRastrillaje.length} />
            {deRastrillaje.length === 0 ? <VacioSeccion texto="No hay agentes disponibles sin grupo." /> : deRastrillaje.map(chip)}
          </>
        )}
        {(filtro === 'TODOS' || filtro === 'ESPECIALES') && (
          <>
            <TituloSeccion texto="Recursos especiales" cantidad={especiales.length} />
            {especiales.length === 0 ? <VacioSeccion texto="No hay recursos especiales disponibles sin grupo." /> : especiales.map(chip)}
          </>
        )}
        {(filtro === 'TODOS' || filtro === 'CONDUCTORES') && (
          <>
            <TituloSeccion texto="Conductores" cantidad={conductores.length} />
            {conductores.length === 0 ? <VacioSeccion texto="No hay conductores disponibles sin grupo." /> : conductores.map(chip)}
          </>
        )}
        {zona.activa && (
          <p style={{ marginTop: 4, textAlign: 'center', fontSize: 11, color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
            Soltar para sacar del grupo
          </p>
        )}
        {noAptos > 0 && (
          <p style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10.5, color: 'var(--muted-foreground)', lineHeight: 1.4, fontFamily: 'var(--font-family-primary)' }}>
            {noAptos} sin grupo {noAptos === 1 ? 'no aparece' : 'no aparecen'} por estar No disponible o Replegado (CU-23). Cambiá su estado en la pestaña Agentes para integrarlos.
          </p>
        )}
      </div>
    </div>
  );
}

/** Estado vacío del panel "Grupos del operativo": todavía no se armó ninguno. */
function SinGrupos({ onNuevoGrupo }: { onNuevoGrupo?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1" style={{ padding: '40px 24px' }}>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(229,75,75,0.1)',
        }}>
          <Users size={24} style={{ color: 'var(--primary)' }} />
        </div>
        <div style={{
          position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--card)',
        }}>
          <Plus size={11} />
        </div>
      </div>
      <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
        Aún no existen grupos cargados
      </p>
      <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.5, maxWidth: 340 }}>
        Creá un nuevo grupo para empezar a sumar agentes y organizar el rastreo del operativo.
      </p>
      {onNuevoGrupo && (
        <button type="button" onClick={onNuevoGrupo}
          className="flex items-center gap-1.5 px-4 py-2.5 mt-3 rounded-[var(--radius-button)]"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}>
          <Plus size={14} />
          Crear primer grupo
        </button>
      )}
    </div>
  );
}

/** Por qué no se puede arrastrar en un grupo que no está En formación. */
function motivoComposicionCerrada(estado: GrupoApi['estado']) {
  return EN_OPERACION.includes(estado)
    ? 'El grupo está en el terreno: para sacar a alguien usá "Retirar del grupo".'
    : `El grupo está ${ETIQUETA_ESTADO_GRUPO[estado]}: reabrilo para cambiar su composición.`;
}

function TarjetaGrupo({ grupo, editable, onSoltar, onEditar, onDisolver, onRetirar, onAccion, onLineaTiempo }: {
  grupo: GrupoApi;
  editable: boolean;
  onSoltar: (agenteId: string) => void;
  onEditar: () => void;
  onDisolver: () => void;
  onRetirar: (integrante: IntegranteGrupoApi) => void;
  onAccion: (accion: AccionGrupo) => void;
  onLineaTiempo: () => void;
}) {
  const enOperacion = EN_OPERACION.includes(grupo.estado);
  const enFormacion = grupo.estado === 'EN_FORMACION';
  // Todo lo que tiene color en la tarjeta es el color del ESTADO (29/09): el
  // tablero dice de un vistazo en qué está cada grupo. El color propio del
  // grupo (grupos.color) queda guardado para el mapa (Módulo 5).
  const color = colorDeEstado(grupo.estado.toLowerCase());
  // Sólo se suma gente a un grupo En formación (24/09: no hay "refuerzo" en el terreno),
  // y a uno de rastrillaje no entra un recurso especial (26/09), salvo de conductor (29/09).
  const rastrillaje = grupo.clase === 'RASTRILLAJE';
  const acepta = () => !!arrastrando && arrastrando.desdeGrupoId !== grupo.id && enFormacion
    && !(rastrillaje && !entraARastrillaje(arrastrando));
  const motivoRechazo = () => !enFormacion ? motivoComposicionCerrada(grupo.estado)
    : arrastrando?.desdeGrupoId === grupo.id ? 'Ya está en este grupo'
    : 'Los recursos especiales van en un grupo especial (salvo de conductor)';
  const zona = useZona(acepta, onSoltar);
  const acciones = accionesPara(grupo.estado);
  const conductores = grupo.integrantes.filter(i => i.esConductor && i.id !== grupo.liderId);
  const integrantes = grupo.integrantes.filter(i => !conductores.includes(i));
  const chipDe = (i: IntegranteGrupoApi, marcarConductor = true) => {
    const esLider = i.id === grupo.liderId;
    const fijo = !editable || esLider || !enFormacion;
    const motivo = !editable ? 'El operativo está cerrado'
      : esLider ? 'El Líder no se mueve arrastrando: cambialo desde Editar grupo.'
      : motivoComposicionCerrada(grupo.estado);
    return (
      <Chip key={i.id} agente={i} desdeGrupoId={grupo.id} esLider={esLider} colorGrupo={color} fondo="var(--card)"
        fijo={fijo} motivoFijo={motivo}
        onRetirar={editable && enOperacion ? () => onRetirar(i) : undefined} />
    );
  };

  return (
    <div {...zona.handlers} className="tarjeta-grupo" style={{
      // Gris, no blanco: así se distingue del panel "Grupos del operativo" que la contiene.
      // La sombra vive en theme.css (más marcada en claro, ahí no alcanzaba con --elevation-sm).
      background: 'var(--muted)', borderRadius: 'var(--radius-card)',
      border: zona.activa ? `2px dashed ${color}` : zona.rechaza ? '2px dashed rgba(220,38,38,0.4)' : '2px dashed transparent',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div title={ETIQUETA_ESTADO_GRUPO[grupo.estado]} style={{ height: 4, background: color, flexShrink: 0 }} />
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {grupo.nombre}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <StatusBadge estado={grupo.estado.toLowerCase()} size="sm" />
              {!rastrillaje && (
                <span title="Grupo especial: recursos especiales, con agentes de apoyo"
                  style={{
                    fontSize: 10, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                    padding: '1px 8px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--foreground)',
                  }}>
                  Especial
                </span>
              )}
              <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}
                title={`Desde ${horaExacta(grupo.estadoActualizadoEn)}`}>
                {haceCuanto(grupo.estadoActualizadoEn)} · {grupo.integrantes.length} integrante{grupo.integrantes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button type="button" onClick={onLineaTiempo} title="Línea de tiempo del grupo" aria-label={`Línea de tiempo de ${grupo.nombre}`}
              style={{ padding: 5, borderRadius: 6, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <History size={13} />
            </button>
          {editable && (
            <>
              <button type="button" onClick={onEditar} title="Editar grupo" aria-label={`Editar ${grupo.nombre}`}
                style={{ padding: 5, borderRadius: 6, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Edit2 size={13} />
              </button>
              <button type="button" onClick={onDisolver} title="Disolver grupo" aria-label={`Disolver ${grupo.nombre}`}
                style={{ padding: 5, borderRadius: 6, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
                <Trash2 size={13} />
              </button>
            </>
          )}
          </div>
        </div>

        {/* Binomio mínimo (CU-26): en el terreno con uno solo rastrillando. El grupo sigue; se avisa. */}
        {grupo.alertaBinomio && (
          <div role="alert" className="flex items-start gap-1.5 p-2 rounded-[var(--radius-input)]" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 11, lineHeight: 1.4, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            Una sola persona rastrillando: está sola en el polígono.
          </div>
        )}
        {!grupo.liderId && (
          <div className="flex items-start gap-1.5 p-2 rounded-[var(--radius-input)]" style={{ background: '#fef9c3', color: '#713f12', fontSize: 11, lineHeight: 1.4, fontFamily: 'var(--font-family-primary)' }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            Sin Líder: el anterior dejó el operativo. Editá el grupo para designar {rastrillaje ? 'uno del DUAR' : 'otro'}.
          </div>
        )}
        {grupo.zonaAsignada && grupo.estado !== 'EN_FORMACION' && grupo.estado !== 'CONFIRMADO' && (
          <p className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
            <MapPin size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            {grupo.zonaAsignada}
          </p>
        )}

        {/* Integrantes arriba (el Líder primero) y el conductor en su propio recuadro
            (boceto del 28/09). Si el Líder maneja, sigue arriba: es el Líder. */}
        <div style={{
          flex: 1, minHeight: 60, borderRadius: 'var(--radius-input)', padding: 8,
          border: zona.activa ? `1.5px dashed ${color}` : '1.5px dashed var(--border)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {integrantes.map(i => chipDe(i))}
          {zona.activa && (
            <p style={{ textAlign: 'center', fontSize: 10.5, color, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', paddingTop: 2 }}>
              Soltar para sumar al grupo
            </p>
          )}
          {zona.rechaza && (
            <p style={{ textAlign: 'center', fontSize: 10.5, color: '#dc2626', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', paddingTop: 2 }}>
              {motivoRechazo()}
            </p>
          )}
        </div>

        <div style={{
          borderRadius: 'var(--radius-input)', padding: 8,
          border: zona.activa ? `1.5px dashed ${color}` : '1.5px dashed var(--border)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <p className="uppercase tracking-wider" style={{ fontSize: 9.5, color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', padding: '0 2px' }}>
            Conductor
          </p>
          {conductores.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', padding: '2px 2px 4px', opacity: 0.8 }}>
              Sin conductor
            </p>
          ) : conductores.map(i => chipDe(i, false))}
        </div>

        {/* Acciones de estado: sólo las que corresponden al estado actual. */}
        {editable && acciones.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {acciones.map(a => {
              const principal = a !== 'reabrir';
              return (
                <button key={a} type="button" onClick={() => onAccion(a)}
                  className="px-2.5 py-1.5 rounded-[var(--radius-button)]"
                  style={{
                    border: principal ? 'none' : '1px solid var(--border)',
                    background: principal ? color : 'var(--card)',
                    color: principal ? textoSobre(color) : 'var(--foreground)',
                    fontSize: 11, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer',
                  }}>
                  {ACCION_INFO[a].boton}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  grupos: GrupoApi[];
  sinGrupo: AgenteTablero[];
  noAptosSinGrupo: number;
  editable: boolean;
  onMover: (agenteId: string, destinoGrupoId: string | null) => void;
  onEditar: (grupo: GrupoApi) => void;
  onDisolver: (grupo: GrupoApi) => void;
  onRetirar: (grupo: GrupoApi, integrante: IntegranteGrupoApi) => void;
  onArmadoAutomatico: () => void;
  onAccion: (grupo: GrupoApi, accion: AccionGrupo) => void;
  onLineaTiempo: (grupo: GrupoApi) => void;
  /** Atajo del panel vacío ("Crear primer grupo"). Sin esto no se ofrece el atajo. */
  onNuevoGrupo?: () => void;
}

type FiltroGrupos = 'TODOS' | ClaseGrupoApi;

export default function GruposDnD({
  grupos, sinGrupo, noAptosSinGrupo, editable, onMover, onEditar, onDisolver, onRetirar, onArmadoAutomatico,
  onAccion, onLineaTiempo, onNuevoGrupo,
}: Props) {
  const [filtro, setFiltro] = useState<FiltroGrupos>('TODOS');
  const deRastrillaje = grupos.filter(g => g.clase === 'RASTRILLAJE').length;
  const especiales = grupos.length - deRastrillaje;
  const visibles = filtro === 'TODOS' ? grupos : grupos.filter(g => g.clase === filtro);

  return (
    <div className="flex flex-col gap-2">
      {/* Dos columnas: "Sin grupo" fijo a la izquierda y las tarjetas a la
          derecha. En celular se apilan, con "Sin grupo" arriba. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_1fr] gap-4 items-start">
        <div className="md:sticky md:top-4">
          <PanelSinGrupo agentes={sinGrupo} noAptos={noAptosSinGrupo} editable={editable} grupos={grupos}
            onSoltar={id => onMover(id, null)} onArmadoAutomatico={onArmadoAutomatico} />
        </div>

        <div style={{
          background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)',
          display: 'flex', flexDirection: 'column', minHeight: 180,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={15} style={{ color: 'var(--muted-foreground)' }} />
            <p style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
              Grupos del operativo
            </p>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 999, padding: '1px 7px' }}>
              {grupos.length}
            </span>
          </div>

          {grupos.length > 0 && (
            <div style={{ padding: '10px 14px 0' }}>
              <Filtro etiqueta="Filtrar grupos" valor={filtro} onCambiar={setFiltro} opciones={[
                { valor: 'TODOS', texto: 'Todos', cantidad: grupos.length },
                { valor: 'RASTRILLAJE', texto: 'De rastrillaje', cantidad: deRastrillaje },
                { valor: 'ESPECIAL', texto: 'Especiales', cantidad: especiales },
              ]} />
            </div>
          )}

          <div style={{ padding: grupos.length === 0 ? 0 : 14, flex: 1 }}>
            {grupos.length === 0 ? (
              <SinGrupos onNuevoGrupo={editable ? onNuevoGrupo : undefined} />
            ) : visibles.length === 0 ? (
              <VacioSeccion texto={filtro === 'ESPECIAL' ? 'No hay grupos especiales.' : 'No hay grupos de rastrillaje.'} />
            ) : (
              <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {visibles.map(g => (
                  <TarjetaGrupo key={g.id} grupo={g} editable={editable}
                    onSoltar={id => onMover(id, g.id)}
                    onEditar={() => onEditar(g)} onDisolver={() => onDisolver(g)}
                    onRetirar={i => onRetirar(g, i)}
                    onAccion={a => onAccion(g, a)} onLineaTiempo={() => onLineaTiempo(g)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {grupos.length > 0 && (
        <p className="hidden md:flex items-center justify-between gap-3" style={{ paddingLeft: 4, paddingRight: 4, fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
          <span>Podés arrastrar agentes directamente entre grupos <em>En formación</em>. Los recursos especiales sólo entran a grupos especiales.</span>
          <span style={{ opacity: 0.6 }}>DUAR Táctico</span>
        </p>
      )}
    </div>
  );
}
