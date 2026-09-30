/**
 * EditarAgenteModal — CU-17 (Editar Agentes de Operativo)
 *
 * Modifica los datos TÁCTICOS del agente dentro de ESTE operativo, escribiendo
 * sobre su AgenteOperativo y nunca sobre el Usuario global (Decisión A):
 *  – Estado táctico: sólo si NO está en un grupo (Disponible / No disponible).
 *    Con grupo, el estado lo define el grupo (Regla 1, 24/09) y se muestra.
 *  – Especialidad técnica: lo que el agente SABE HACER (override local)
 *  – Especialidad: además define si es agente de rastrillaje o recurso especial
 *    (dato del catálogo, `es_recurso_critico`)
 *  – Conductor: maneja la camioneta y espera al grupo; no rastrilla y entra a
 *    cualquier grupo. Desde el 29/09 no hay "caminante": rastrilla todo el que
 *    no es conductor.
 *
 * Los datos personales se gestionan desde la pestaña Usuarios.
 */
import { useState } from 'react';
import { X, Check, Pencil, User, Loader2 } from 'lucide-react';
import {
  EstadoOperativoAgente, Especialidad,
  catEspecialidades,
} from '../../data/mockData';
import { agentesOperativoApi, ApiError, PersonalOperativoApi, type EstadoAgenteApi } from '../../services/api';
import { formatearDni } from '../../utils/validacionUsuario';

/* ── Catálogos de colores / etiquetas ─────────────────────── */
export const ESTADO_OP_CONFIG: Record<
  EstadoOperativoAgente,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  disponible:   { label: 'Disponible',   color: '#0d9488', bg: 'rgba(13,148,136,0.10)',  border: 'rgba(13,148,136,0.30)',  dot: '#0d9488' },
  agrupado:     { label: 'Agrupado',     color: '#4f46e5', bg: 'rgba(79,70,229,0.10)',   border: 'rgba(79,70,229,0.30)',   dot: '#4f46e5' },
  desplegado:   { label: 'Desplegado',   color: '#ca8a04', bg: 'rgba(202,138,4,0.10)',   border: 'rgba(202,138,4,0.30)',   dot: '#ca8a04' },
  rastrillando: { label: 'Rastrillando', color: '#15803d', bg: 'rgba(21,128,61,0.10)',   border: 'rgba(21,128,61,0.30)',   dot: '#15803d' },
  replegado:    { label: 'Replegado',    color: '#6b7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.28)', dot: '#6b7280' },
  en_espera:    { label: 'En espera',    color: '#0891b2', bg: 'rgba(8,145,178,0.10)',   border: 'rgba(8,145,178,0.30)',   dot: '#0891b2' },
  no_disponible:{ label: 'No disponible',color: '#b91c1c', bg: 'rgba(185,28,28,0.10)',   border: 'rgba(185,28,28,0.28)',   dot: '#b91c1c' },
};

/** Lo único que se elige para alguien SIN grupo; con grupo, el estado lo define el grupo (24/09). */
const ESTADOS_ELEGIBLES: EstadoOperativoAgente[] = ['disponible', 'no_disponible'];

/**
 * Especialidades TÉCNICAS, derivadas del catálogo (espejo de cat_especialidades).
 * "Conductor" ya no figura acá: dejó de ser una especialidad para pasar a ser un
 * estado logístico booleano (esConductor).
 */
const COLOR_ESPECIALIDAD: Record<Especialidad, string> = {
  'paramédico':         '#0891b2',
  'bombero':            '#dc2626',
  'bombero voluntario': '#ea580c',
  'canes':              '#65a30d',
  'defensa civil':      '#0284c7',
  'dron':               '#7c3aed',
  'caballería':         '#92400e',
  'buzos':              '#0369a1',
  'policía':            '#1e3a8a',
  'otra':               '#6b7280',
};

const ESPECIALIDADES: { value: Especialidad; label: string; color: string }[] =
  catEspecialidades.map(e => ({
    value: e.slug,
    label: e.nombre,
    color: COLOR_ESPECIALIDAD[e.slug] ?? '#6b7280',
  }));

/* ── Pequeño badge reutilizable para mostrar estado actual ── */
export function EstadoOperativoBadge({
  estado,
  size = 'sm',
}: {
  estado?: EstadoOperativoAgente;
  size?: 'xs' | 'sm';
}) {
  if (!estado) return null;
  const cfg = ESTADO_OP_CONFIG[estado];
  const fs = size === 'xs' ? '10px' : 'var(--text-label)';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 'var(--font-weight-semibold)',
        fontFamily: 'var(--font-family-primary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }}
      />
      {cfg.label}
    </span>
  );
}

/* ── Modal principal ────────────────────────────────────────── */
interface Props {
  /** Registro TÁCTICO real (join agentes_operativo + usuarios) — CU-19. */
  agente: PersonalOperativoApi;
  operativoId: string;
  onClose: () => void;
  /** Se llama tras un guardado exitoso, para que la lista se refresque. */
  onSaved: () => void;
}

/** especialidadId (uuid real) ↔ slug que usa la UI — catEspecialidades espeja cat_especialidades. */
const especialidadIdASlug = (especialidadId: string | null): Especialidad | '' =>
  catEspecialidades.find(e => e.id === especialidadId)?.slug ?? '';
const especialidadSlugAId = (slug: Especialidad | ''): string | null =>
  slug ? catEspecialidades.find(e => e.slug === slug)?.id ?? null : null;

export default function EditarAgenteModal({ agente, operativoId, onClose, onSaved }: Props) {
  const estadoInicial = (agente.estado?.toLowerCase() as EstadoOperativoAgente) || 'disponible';
  const enGrupo = Boolean(agente.grupoId);
  const especialidadInicial = especialidadIdASlug(agente.especialidadId);

  const [estadoOp, setEstadoOp] = useState<EstadoOperativoAgente>(estadoInicial);
  // La especialidad táctica sobrescribe a la global sólo dentro de este operativo.
  const [especialidad, setEspecialidad] = useState<Especialidad | ''>(especialidadInicial);
  const [conductor, setConductor] = useState<boolean>(agente.esConductor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDUAR = agente.esDuar;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await agentesOperativoApi.actualizar(operativoId, agente.usuarioId, {
        // Con grupo, el estado lo define el grupo: no se manda.
        ...(enGrupo ? {} : { estado: estadoOp.toUpperCase() as EstadoAgenteApi }),
        especialidadId: especialidadSlugAId(especialidad),
        esConductor: conductor,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (
    (estadoOp || '') !== estadoInicial ||
    (especialidad || '') !== especialidadInicial ||
    conductor !== agente.esConductor
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-[var(--radius-card)] overflow-hidden flex flex-col"
        style={{
          maxWidth: 460,
          background: 'var(--card)',
          boxShadow: 'var(--elevation-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isDUAR ? 'rgba(229,75,75,0.1)' : 'rgba(255,169,135,0.15)' }}
            >
              <Pencil size={16} style={{ color: isDUAR ? 'var(--primary)' : 'var(--accent)' }} />
            </div>
            <div>
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              }}>
                Editar datos operativos
              </p>
              <p style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Solo campos operativos — los datos personales se editan desde Usuarios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 flex flex-col gap-5">

          {/* Agente info pill */}
          <div
            className="flex items-center gap-3 p-3 rounded-[var(--radius-input)]"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: isDUAR ? 'var(--primary)' : 'var(--accent)',
                color: '#fff',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-bold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              {agente.nombre.charAt(0)}{agente.apellido.charAt(0)}
            </div>
            <div className="min-w-0">
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              }}>
                {agente.nombre} {agente.apellido}
              </p>
              <p style={{
                color: 'var(--muted-foreground)', fontSize: '11px',
                fontFamily: 'var(--font-family-primary)',
              }}>
                DNI {formatearDni(agente.dni)}{agente.institucionNombre ? ` · ${agente.institucionNombre}` : ''}
              </p>
            </div>
          </div>

          {/* ── Estado Operativo ── */}
          <div>
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              marginBottom: 10,
            }}>
              Estado Operativo
            </p>
            {/* Regla 1 (24/09): con grupo, el estado lo define el grupo. Se muestra, no se elige. */}
            {enGrupo ? (
              <div className="flex items-start gap-3 p-3 rounded-[var(--radius-input)]"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <EstadoOperativoBadge estado={estadoInicial} />
                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                  Integra un grupo y su estado lo define el grupo. Para cambiarlo, cambiá el estado
                  del grupo en la pestaña Grupos, o sacalo del grupo.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              {[...ESTADOS_ELEGIBLES, ...(ESTADOS_ELEGIBLES.includes(estadoInicial) ? [] : [estadoInicial])].map(key => {
                const cfg = ESTADO_OP_CONFIG[key];
                const isSelected = estadoOp === key;
                return (
                  <button
                    key={key}
                    onClick={() => setEstadoOp(key)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-input)] transition-all text-left"
                    style={{
                      border: isSelected ? `2px solid ${cfg.color}` : '1.5px solid var(--border)',
                      background: isSelected ? cfg.bg : 'var(--card)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: cfg.dot,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      color: isSelected ? cfg.color : 'var(--foreground)',
                      fontSize: 'var(--text-label)',
                      fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      fontFamily: 'var(--font-family-primary)',
                    }}>
                      {cfg.label}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color: cfg.color, marginLeft: 'auto' }} />
                    )}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Especialidad ── */}
          <div>
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              marginBottom: 10,
            }}>
              Especialidad
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Sin especialidad */}
              <button
                onClick={() => setEspecialidad('')}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-input)] transition-all text-left"
                style={{
                  border: especialidad === ''
                    ? '2px solid var(--primary)'
                    : '1.5px solid var(--border)',
                  background: especialidad === ''
                    ? 'rgba(229,75,75,0.06)'
                    : 'var(--card)',
                  cursor: 'pointer',
                }}
              >
                <User size={12} style={{ color: especialidad === '' ? 'var(--primary)' : '#9ca3af', flexShrink: 0 }} />
                <span style={{
                  color: especialidad === '' ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontSize: 'var(--text-label)',
                  fontWeight: especialidad === '' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  Sin especialidad
                </span>
                {especialidad === '' && (
                  <Check size={12} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
                )}
              </button>

              {ESPECIALIDADES.map(({ value, label, color }) => {
                const isSelected = especialidad === value;
                return (
                  <button
                    key={value}
                    onClick={() => setEspecialidad(value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-input)] transition-all text-left"
                    style={{
                      border: isSelected ? `2px solid ${color}` : '1.5px solid var(--border)',
                      background: isSelected ? `${color}12` : 'var(--card)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: color, flexShrink: 0,
                      }}
                    />
                    <span style={{
                      color: isSelected ? color : 'var(--foreground)',
                      fontSize: 'var(--text-label)',
                      fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      fontFamily: 'var(--font-family-primary)',
                    }}>
                      {label}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color, marginLeft: 'auto' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Conductor (estado logístico físico) ── */}
          <div>
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              marginBottom: 10,
            }}>
              Conductor
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: 'No conductor' },
                { value: true,  label: 'Conductor' },
              ].map(opt => {
                const isSelected = conductor === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setConductor(opt.value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-input)] transition-all text-left"
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: isSelected ? 'rgba(229,75,75,0.06)' : 'var(--card)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? 'var(--primary)' : '#d1d5db',
                    }} />
                    <span style={{
                      color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                      fontSize: 'var(--text-label)',
                      fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      fontFamily: 'var(--font-family-primary)',
                    }}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
                    )}
                  </button>
                );
              })}
            </div>
            {conductor && (
              <p className="mt-2" style={{
                color: 'var(--muted-foreground)', fontSize: '11px',
                fontFamily: 'var(--font-family-primary)',
              }}>
                No rastrilla: espera al grupo con la camioneta (queda Desplegado mientras el grupo rastrilla). Puede ir en cualquier grupo.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {error && (
            <p style={{ color: '#dc2626', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[var(--radius-button)] transition-colors"
              style={{
                background: 'var(--muted)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saved || saving}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-[var(--radius-button)] transition-all"
              style={{
                background: saved ? '#16a34a' : hasChanges ? 'var(--primary)' : 'var(--muted)',
                color: hasChanges || saved ? '#fff' : 'var(--muted-foreground)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                opacity: !hasChanges && !saved ? 0.55 : 1,
                cursor: hasChanges && !saved && !saving ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {saved ? (
                <><Check size={14} /> Guardado</>
              ) : saving ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando…</>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
