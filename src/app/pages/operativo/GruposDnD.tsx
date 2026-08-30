import { useState } from 'react';
import { GrupoRastrillaje, Usuario, grupoEnOperacion, puedeSerLider, institucionLabel } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/shared/StatusBadge';
import ExtraerAgenteModal from '../../components/shared/ExtraerAgenteModal';
import {
  ShieldCheck,
  AlertTriangle,
  Edit2,
  Trash2,
  GripVertical,
  Users,
  UserX,
  UserMinus,
} from 'lucide-react';

const isDUAR = (u: Usuario) => puedeSerLider(u);

// ──────────────────────────────────────────────
// Drag state stored in a module-level ref
// so it survives across component renders without
// triggering re-renders of unrelated components.
// ──────────────────────────────────────────────
let dragPayload: { agenteId: string; fromGrupoId: string | null } | null = null;

// ──────────────────────────────────────────────
// Draggable Agent Chip
// ──────────────────────────────────────────────
function DraggableAgente({
  agente,
  fromGrupoId,
  isLeader,
  compact = false,
  onExtraer,
  enOperacion = false,
}: {
  agente: Usuario;
  fromGrupoId: string | null;
  isLeader?: boolean;
  compact?: boolean;
  /** CU-26: retirar del grupo. Sólo se pasa cuando el agente ESTÁ en un grupo. */
  onExtraer?: (usuarioId: string) => void;
  /** El grupo ya salió a terreno: no se puede arrastrar, hay que usar CU-26. */
  enOperacion?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const esDUAR = isDUAR(agente);
  const fijo = isLeader || enOperacion;

  return (
    <div
      draggable={!fijo}
      onDragStart={(e) => {
        if (fijo) { e.preventDefault(); return; }
        dragPayload = { agenteId: agente.id, fromGrupoId };
        e.dataTransfer.effectAllowed = 'move';
        // Store in dataTransfer as fallback
        e.dataTransfer.setData('text/plain', agente.id);
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      title={
        isLeader
          ? 'El líder no puede ser movido desde aquí. Editá el grupo para cambiar el líder.'
          : enOperacion
          ? 'El grupo ya salió a terreno. Para retirarlo usá "Retirar del Grupo" (CU-26).'
          : 'Arrastrar a un grupo'
      }
      style={{
        opacity: isDragging ? 0.25 : 1,
        cursor: fijo ? 'not-allowed' : 'grab',
        background: isLeader ? 'rgba(229,75,75,0.07)' : 'var(--muted)',
        border: isLeader
          ? '1px dashed rgba(229,75,75,0.3)'
          : isDragging
          ? '1px dashed var(--border)'
          : '1px solid transparent',
        borderRadius: 'var(--radius-input)',
        padding: compact ? '4px 8px' : '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'box-shadow 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}
    >
      {!isLeader && (
        <GripVertical
          size={12}
          style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.6 }}
        />
      )}
      {isLeader && (
        <ShieldCheck size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
      )}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: esDUAR ? 'var(--primary)' : 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 'var(--font-weight-bold)',
          fontFamily: 'var(--font-family-primary)',
          flexShrink: 0,
        }}
      >
        {agente.nombre.charAt(0)}
        {agente.apellido.charAt(0)}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            fontFamily: 'var(--font-family-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {agente.nombre} {agente.apellido}
        </p>
        {!compact && (
          <p
            style={{
              fontSize: 10,
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-family-primary)',
              lineHeight: 1.2,
            }}
          >
            {isLeader ? 'Líder' : esDUAR ? 'DUAR' : institucionLabel(agente)}
            {agente.especialidad ? ` · ${agente.especialidad}` : ''}
          </p>
        )}
      </div>

      {/* CU-26 · Retirar del Grupo (baja parcial sin desarmar la cuadrilla) */}
      {onExtraer && (
        <button
          onClick={(e) => { e.stopPropagation(); onExtraer(agente.id); }}
          title="Retirar del Grupo (CU-26)"
          aria-label={`Retirar del grupo a ${agente.nombre} ${agente.apellido}`}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            padding: 2,
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}
        >
          <UserMinus size={12} />
        </button>
      )}
      {isLeader && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9,
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
            background: 'rgba(229,75,75,0.12)',
            color: 'var(--primary)',
            borderRadius: 999,
            padding: '1px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Líder
        </span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Unassigned Pool (drop zone)
// ──────────────────────────────────────────────
function UnassignedPool({ agentes, operativoId }: { agentes: Usuario[]; operativoId: string }) {
  const { data, moverAgenteAGrupo } = useApp();
  const [isOver, setIsOver] = useState(false);
  const [canDrop, setCanDrop] = useState(false);

  const checkCanDrop = () => {
    if (!dragPayload?.fromGrupoId) return false;
    const fromGrupo = data.grupos.find((g) => g.id === dragPayload!.fromGrupoId);
    if (!fromGrupo || fromGrupo.lider === dragPayload!.agenteId) return false;
    // De un grupo ya desplegado sólo se sale por CU-26, no arrastrando
    return !grupoEnOperacion(fromGrupo.estado);
  };

  const isActive = isOver && canDrop;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        const ok = checkCanDrop();
        setIsOver(true);
        setCanDrop(ok);
      }}
      onDragLeave={(e) => {
        // Only trigger if leaving the container itself
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsOver(false);
          setCanDrop(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        setCanDrop(false);
        if (!dragPayload?.fromGrupoId) return;
        // Una sola vía: mantiene agenteIds + grupoId + historial coherentes
        moverAgenteAGrupo(operativoId, dragPayload.agenteId, null);
        dragPayload = null;
      }}
      style={{
        background: isActive ? 'rgba(229,75,75,0.06)' : 'var(--card)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)',
        border: isActive
          ? '2px dashed var(--primary)'
          : isOver
          ? '2px dashed rgba(229,75,75,0.3)'
          : '2px dashed transparent',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <UserX size={15} style={{ color: 'var(--muted-foreground)' }} />
        <p
          style={{
            fontSize: 'var(--text-label)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            fontFamily: 'var(--font-family-primary)',
          }}
        >
          Sin grupo
        </p>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            borderRadius: 999,
            padding: '1px 7px',
          }}
        >
          {agentes.length}
        </span>
      </div>

      <div style={{ padding: '10px 12px', flex: 1 }}>
        {agentes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '24px 12px',
              opacity: 0.5,
            }}
          >
            <Users size={20} style={{ color: 'var(--muted-foreground)' }} />
            <p
              style={{
                fontSize: 11,
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-family-primary)',
                textAlign: 'center',
              }}
            >
              Todos los agentes están asignados a un grupo
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {agentes.map((agente) => (
              <DraggableAgente
                key={agente.id}
                agente={agente}
                fromGrupoId={null}
              />
            ))}
          </div>
        )}

        {isActive && (
          <div
            style={{
              marginTop: agentes.length > 0 ? 8 : 0,
              borderRadius: 'var(--radius-input)',
              border: '1.5px dashed var(--primary)',
              padding: '8px 12px',
              background: 'rgba(229,75,75,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: 'var(--primary)',
                fontFamily: 'var(--font-family-primary)',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              Soltar para quitar del grupo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Droppable Group Card
// ──────────────────────────────────────────────
function DroppableGrupoCard({
  grupo,
  operativoId,
  sectorNombre,
  onEdit,
  onDelete,
  onExtraer,
}: {
  grupo: GrupoRastrillaje;
  operativoId: string;
  sectorNombre?: string;
  onEdit: () => void;
  onDelete: () => void;
  /** CU-26: retirar a un integrante de este grupo. */
  onExtraer: (usuarioId: string) => void;
}) {
  const { data, moverAgenteAGrupo } = useApp();
  const [isOver, setIsOver] = useState(false);
  const [canDrop, setCanDrop] = useState(false);

  const checkCanDrop = () => {
    if (!dragPayload) return false;
    return (
      dragPayload.fromGrupoId !== grupo.id &&
      !grupo.agenteIds.includes(dragPayload.agenteId)
    );
  };

  const isActive = isOver && canDrop;
  const isReject = isOver && !canDrop;

  const lider = data.usuarios.find((u) => u.id === grupo.lider);
  const liderEsDUAR = lider ? isDUAR(lider) : false;
  const miembros = data.usuarios.filter(
    (u) => grupo.agenteIds.includes(u.id) && u.id !== grupo.lider && u.estado !== 'eliminado'
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        const ok = checkCanDrop();
        setIsOver(true);
        setCanDrop(ok);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsOver(false);
          setCanDrop(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        setCanDrop(false);
        if (!dragPayload) return;
        if (dragPayload.fromGrupoId === grupo.id) return;
        const r = moverAgenteAGrupo(operativoId, dragPayload.agenteId, grupo.id);
        if (r === 'origen_en_operacion') {
          alert('Ese agente pertenece a un grupo que ya salió a terreno. Para retirarlo usá "Retirar del Grupo" (CU-26), que registra el motivo y gestiona la sucesión de mando.');
        }
        dragPayload = null;
      }}
      style={{
        background: isActive ? `${grupo.color}08` : 'var(--card)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-sm)',
        border: isActive
          ? `2px dashed ${grupo.color}`
          : isReject
          ? '2px dashed rgba(220,38,38,0.4)'
          : '2px dashed transparent',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: grupo.color, flexShrink: 0 }} />

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Card header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: grupo.color,
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: 'var(--text-h3)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              {grupo.nombre}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusBadge estado={grupo.estado} size="sm" />
            <button
              onClick={onEdit}
              title="Editar grupo"
              style={{
                padding: 5,
                borderRadius: 6,
                color: 'var(--muted-foreground)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'var(--muted)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={onDelete}
              title="Eliminar grupo"
              style={{
                padding: 5,
                borderRadius: 6,
                color: 'var(--muted-foreground)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fee2e2';
                (e.currentTarget as HTMLElement).style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Leader row */}
        

        {/* Sector & KM */}
        {(sectorNombre || grupo.kmRecorridos > 0) && (
          <div style={{ marginBottom: 10 }}>
            {sectorNombre && (
              null
            )}
            {grupo.kmRecorridos > 0 && (
              null
            )}
          </div>
        )}

        {/* Members drop zone */}
        <div
          style={{
            flex: 1,
            minHeight: 60,
            borderRadius: 'var(--radius-input)',
            border: isActive
              ? `1.5px dashed ${grupo.color}`
              : '1.5px dashed var(--border)',
            background: isActive ? `${grupo.color}05` : 'transparent',
            transition: 'border-color 0.15s, background 0.15s',
            padding: '8px',
          }}
        >
          

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lider && (
              <DraggableAgente
                agente={lider}
                fromGrupoId={grupo.id}
                isLeader
                compact
                onExtraer={onExtraer}
                enOperacion={grupoEnOperacion(grupo.estado)}
              />
            )}
            {miembros.map((m) => (
              <DraggableAgente
                key={m.id}
                agente={m}
                fromGrupoId={grupo.id}
                compact
                onExtraer={onExtraer}
                enOperacion={grupoEnOperacion(grupo.estado)}
              />
            ))}
          </div>

          {isActive && (
            <div
              style={{
                marginTop: 6,
                borderRadius: 'var(--radius-input)',
                border: `1.5px dashed ${grupo.color}`,
                padding: '6px 10px',
                background: `${grupo.color}08`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: grupo.color,
                  fontFamily: 'var(--font-family-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Soltar para agregar al grupo
              </p>
            </div>
          )}

          {isReject && (
            <div
              style={{
                marginTop: 6,
                borderRadius: 'var(--radius-input)',
                border: '1.5px dashed #dc2626',
                padding: '6px 10px',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: '#dc2626',
                  fontFamily: 'var(--font-family-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Ya está en este grupo
              </p>
            </div>
          )}

          {!isActive && !isReject && miembros.length === 0 && !lider && (
            <p
              style={{
                fontSize: 10,
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-family-primary)',
                textAlign: 'center',
                paddingTop: 8,
                opacity: 0.6,
              }}
            >
              Arrastrá agentes aquí
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Props & Main Component
// ──────────────────────────────────────────────
interface GruposDnDProps {
  grupos: GrupoRastrillaje[];
  agentes: Usuario[];
  operativoId: string;
  sectores: { id: string; nombre: string }[];
  onEditGrupo: (gid: string) => void;
  onDeleteGrupo: (gid: string) => void;
}

export default function GruposDnD({
  grupos,
  agentes,
  operativoId,
  sectores,
  onEditGrupo,
  onDeleteGrupo,
}: GruposDnDProps) {
  const { getAgenteOperativo } = useApp();
  const assignedIds = new Set(grupos.flatMap((g) => g.agenteIds));
  const unassigned = agentes.filter((a) => !assignedIds.has(a.id));

  // CU-26: usuario cuya extracción se está gestionando
  const [extraerUsuarioId, setExtraerUsuarioId] = useState<string | null>(null);
  const usuarioAExtraer = extraerUsuarioId
    ? agentes.find((a) => a.id === extraerUsuarioId)
    : undefined;
  const agenteOpAExtraer = extraerUsuarioId
    ? getAgenteOperativo(operativoId, extraerUsuarioId)
    : undefined;

  return (
    <div>
      {/* Instruction banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          background: 'rgba(255,169,135,0.12)',
          border: '1px solid rgba(255,169,135,0.35)',
          borderRadius: 'var(--radius-input)',
          marginBottom: 16,
        }}
      >
        <GripVertical size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <p
          style={{
            fontSize: 11,
            color: 'var(--foreground)',
            fontFamily: 'var(--font-family-primary)',
          }}
        >
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Drag &amp; Drop:</span>{' '}
          Arrastrá agentes desde el panel <em>"Sin grupo"</em> o entre grupos. Los líderes no pueden
          moverse arrastrando — usá{' '}
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Editar grupo</span> para
          cambiar el líder.
        </p>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 280px) 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* LEFT: Unassigned pool */}
        <div style={{ position: 'sticky', top: 16 }}>
          <UnassignedPool agentes={unassigned} operativoId={operativoId} />
        </div>

        {/* RIGHT: Group cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {grupos.map((grupo) => {
            const sector = sectores.find((s) => s.id === grupo.sectorAsignado);
            return (
              <DroppableGrupoCard
                key={grupo.id}
                grupo={grupo}
                operativoId={operativoId}
                sectorNombre={sector?.nombre}
                onEdit={() => onEditGrupo(grupo.id)}
                onDelete={() => onDeleteGrupo(grupo.id)}
                onExtraer={setExtraerUsuarioId}
              />
            );
          })}
        </div>
      </div>

      {/* CU-26 · Extraer Agente de Grupo Activo */}
      {usuarioAExtraer && agenteOpAExtraer && (
        <ExtraerAgenteModal
          agenteOp={agenteOpAExtraer}
          usuario={usuarioAExtraer}
          onClose={() => setExtraerUsuarioId(null)}
        />
      )}
    </div>
  );
}
