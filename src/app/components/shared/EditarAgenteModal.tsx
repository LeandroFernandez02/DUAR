/**
 * EditarAgenteModal — CU-17 (Editar Agentes de Operativo)
 *
 * Modifica los datos TÁCTICOS del agente dentro de ESTE operativo, escribiendo
 * sobre su AgenteOperativo y nunca sobre el Usuario global (Decisión A):
 *  – Estado táctico (los 7 del catálogo `estado_agente`)
 *  – Especialidad técnica: lo que el agente SABE HACER (override local)
 *  – Estados logísticos físicos: qué FUNCIÓN cumple en el terreno
 *      · Caminante  → sale a caminar el polígono
 *      · Conductor  → se queda con el vehículo
 *
 * Los datos personales se gestionan desde la pestaña Usuarios.
 */
import { useState } from 'react';
import { X, Check, Pencil, User, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  EstadoOperativoAgente, Especialidad, Usuario, AgenteOperativo,
  catEspecialidades, esRecursoCritico, getEspecialidad,
} from '../../data/mockData';

/* ── Catálogos de colores / etiquetas ─────────────────────── */
export const ESTADO_OP_CONFIG: Record<
  EstadoOperativoAgente,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  disponible:   { label: 'Disponible',   color: '#0d9488', bg: 'rgba(13,148,136,0.10)',  border: 'rgba(13,148,136,0.30)',  dot: '#0d9488' },
  desplegado:   { label: 'Desplegado',   color: '#ca8a04', bg: 'rgba(202,138,4,0.10)',   border: 'rgba(202,138,4,0.30)',   dot: '#ca8a04' },
  rastrillando: { label: 'Rastrillando', color: '#15803d', bg: 'rgba(21,128,61,0.10)',   border: 'rgba(21,128,61,0.30)',   dot: '#15803d' },
  descansando:  { label: 'Descansando',  color: '#0891b2', bg: 'rgba(8,145,178,0.10)',   border: 'rgba(8,145,178,0.30)',   dot: '#0891b2' },
  en_espera:    { label: 'En espera',    color: '#7c3aed', bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.30)',  dot: '#7c3aed' },
  replegado:    { label: 'Replegado',    color: '#6b7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.28)', dot: '#6b7280' },
  no_disponible:{ label: 'No disponible',color: '#b91c1c', bg: 'rgba(185,28,28,0.10)',   border: 'rgba(185,28,28,0.28)',   dot: '#b91c1c' },
};

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
  agente: Usuario;
  /** Operativo en curso: define QUÉ encarnación táctica se está editando. */
  operativoId: string;
  onClose: () => void;
}

export default function EditarAgenteModal({ agente, operativoId, onClose }: Props) {
  const { getAgenteOperativo, updateAgenteOperativo } = useApp();

  // La fuente de verdad de lo táctico es el AgenteOperativo, no el Usuario.
  const agenteOp: AgenteOperativo | undefined = getAgenteOperativo(operativoId, agente.id);

  const [estadoOp, setEstadoOp] = useState<EstadoOperativoAgente | ''>(
    agenteOp?.estado ?? ''
  );
  // La especialidad táctica sobrescribe a la global sólo dentro de este operativo.
  const [especialidad, setEspecialidad] = useState<Especialidad | ''>(
    agenteOp?.especialidad ?? agente.especialidad ?? ''
  );
  const [caminante, setCaminante] = useState<boolean>(agenteOp?.esCaminante ?? false);
  const [conductor, setConductor] = useState<boolean>(agenteOp?.esConductor ?? false);
  const [saved, setSaved] = useState(false);

  /**
   * Candado Flexible (soft constraint) sobre los RECURSOS CRÍTICOS.
   *
   * Un recurso crítico es aquel cuya función se pierde si sale a caminar el
   * polígono. Hay dos maneras de serlo:
   *   · por ESPECIALIDAD  → Paramédico, Dron (dato de cat_especialidades)
   *   · por FUNCIÓN       → es conductor del vehículo
   *
   * Mandarlo a caminar igual se permite, pero exige que el Coordinador confirme
   * la excepción táctica de forma explícita (CU-17).
   */
  const [confirmExcepcion, setConfirmExcepcion] = useState<'caminante' | 'conductor' | null>(null);

  /** Motivo por el que este agente es recurso crítico (null = no lo es). */
  const motivoCritico = (): string | null => {
    if (conductor) return 'es el Conductor del vehículo';
    const cat = getEspecialidad(especialidad as Especialidad);
    if (cat?.esRecursoCritico) return `su especialidad (${cat.nombre}) es un recurso crítico`;
    return null;
  };

  const pedirCaminante = (valor: boolean) => {
    if (valor && motivoCritico()) { setConfirmExcepcion('caminante'); return; }
    setCaminante(valor);
  };
  const pedirConductor = (valor: boolean) => {
    if (valor && caminante) { setConfirmExcepcion('conductor'); return; }
    setConductor(valor);
  };
  const confirmarExcepcion = () => {
    if (confirmExcepcion === 'caminante') setCaminante(true);
    else if (confirmExcepcion === 'conductor') setConductor(true);
    setConfirmExcepcion(null);
  };

  const isDUAR = agente.dotacion?.toLowerCase().includes('duar') ?? false;

  const handleSave = () => {
    if (!agenteOp) return;
    updateAgenteOperativo(agenteOp.id, {
      estado: (estadoOp || 'disponible') as EstadoOperativoAgente,
      especialidad: (especialidad as Especialidad) || undefined,
      esCaminante: caminante,
      esConductor: conductor,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  const hasChanges = !!agenteOp && (
    (estadoOp || '') !== (agenteOp.estado ?? '') ||
    (especialidad || '') !== (agenteOp.especialidad ?? agente.especialidad ?? '') ||
    caminante !== agenteOp.esCaminante ||
    conductor !== agenteOp.esConductor
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
                DNI {agente.dni}{agente.dotacion ? ` · ${agente.dotacion}` : ''}
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
            <div className="grid grid-cols-2 gap-2">
              {/* Opción "sin estado" */}
              <button
                onClick={() => setEstadoOp('')}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-input)] transition-all text-left"
                style={{
                  border: estadoOp === ''
                    ? '2px solid var(--primary)'
                    : '1.5px solid var(--border)',
                  background: estadoOp === ''
                    ? 'rgba(229,75,75,0.06)'
                    : 'var(--card)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: estadoOp === '' ? 'var(--primary)' : '#d1d5db',
                    flexShrink: 0,
                  }}
                />
                <span style={{
                  color: estadoOp === '' ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontSize: 'var(--text-label)',
                  fontWeight: estadoOp === '' ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  Sin estado
                </span>
                {estadoOp === '' && (
                  <Check size={12} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
                )}
              </button>

              {(Object.keys(ESTADO_OP_CONFIG) as EstadoOperativoAgente[]).map(key => {
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

          {/* ── Caminante (estado logístico físico) ── */}
          <div>
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              marginBottom: 10,
            }}>
              Caminante
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: 'No caminante' },
                { value: true,  label: 'Caminante' },
              ].map(opt => {
                const isSelected = caminante === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => pedirCaminante(opt.value)}
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
                    onClick={() => pedirConductor(opt.value)}
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
            {conductor && !caminante && (
              <p className="mt-2" style={{
                color: 'var(--muted-foreground)', fontSize: '11px',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Al pasar el grupo a Rastrillando, quedará automáticamente En espera con el vehículo.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
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
            disabled={!hasChanges || saved}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-[var(--radius-button)] transition-all"
            style={{
              background: saved ? '#16a34a' : hasChanges ? 'var(--primary)' : 'var(--muted)',
              color: hasChanges || saved ? '#fff' : 'var(--muted-foreground)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              opacity: !hasChanges && !saved ? 0.55 : 1,
              cursor: hasChanges && !saved ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            {saved ? (
              <><Check size={14} /> Guardado</>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </div>

      {/* ── Candado Flexible: confirmación de excepción táctica ── */}
      {confirmExcepcion && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { e.stopPropagation(); setConfirmExcepcion(null); }}
        >
          <div
            className="w-full rounded-[var(--radius-card)] overflow-hidden"
            style={{ maxWidth: 420, background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(202,138,4,0.12)' }}
              >
                <AlertTriangle size={17} style={{ color: '#ca8a04' }} />
              </div>
              <div>
                <p style={{
                  color: 'var(--foreground)', fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                }}>
                  Excepción táctica
                </p>
                <p className="mt-1" style={{
                  color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)', lineHeight: 1.5,
                }}>
                  {confirmExcepcion === 'conductor' ? (
                    <>
                      Está por asignar como <strong>Conductor</strong> a un agente que ya figura
                      como <strong>Caminante</strong>. El conductor es un recurso crítico que
                      debería permanecer con el vehículo. ¿Confirma la excepción?
                    </>
                  ) : (
                    <>
                      Está por enviar a <strong>rastrillar</strong> a un recurso crítico:
                      {' '}<strong>{motivoCritico()}</strong>. Si sale a caminar el polígono,
                      su función especializada deja de estar disponible. ¿Confirma la excepción?
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <button
                onClick={() => setConfirmExcepcion(null)}
                className="flex-1 py-2.5 rounded-[var(--radius-button)]"
                style={{
                  background: 'var(--muted)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExcepcion}
                className="flex-1 py-2.5 rounded-[var(--radius-button)]"
                style={{
                  background: '#ca8a04', color: '#fff',
                  fontSize: 'var(--text-base)', border: 'none',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                  cursor: 'pointer',
                }}
              >
                Confirmar excepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
