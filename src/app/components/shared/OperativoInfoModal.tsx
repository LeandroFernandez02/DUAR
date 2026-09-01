import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  X, MapPin, Calendar, Users, User,
  FileText, Clock, Flag, AlertTriangle, AlertCircle,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Operativo } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import StatusBadge from './StatusBadge';

interface Props {
  operativo: Operativo;
  onClose: () => void;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }}>{icon}</span>
      <div>
        <span style={{
          color: 'var(--muted-foreground)', fontSize: '11px',
          fontFamily: 'var(--font-family-primary)', display: 'block',
        }}>
          {label}
        </span>
        <span style={{
          color: 'var(--foreground)', fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-family-primary)',
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function OperativoInfoModal({ operativo, onClose }: Props) {
  const { data, updateOperativo } = useApp();
  const navigate = useNavigate();
  const [finalizeStep, setFinalizeStep] = useState<'confirm' | 'gpx_warning' | null>(null);

  const handleFinalizeConfirm = () => {
    if (operativo.agenteIds.length > 0) {
      setFinalizeStep('gpx_warning');
    } else {
      handleFinalizeExec();
    }
  };

  const handleFinalizeExec = () => {
    updateOperativo(operativo.id, {
      estado: 'finalizado',
      fechaFin: new Date().toISOString(),
    });
    setFinalizeStep(null);
    onClose();
    navigate('/operativos?estado=finalizado');
  };

  const coordinador = data.usuarios.find(u => u.id === operativo.coordinadorId);

  // `fechaInicio`/`fechaFin` ya vienen como datetime ISO completo
  // (mapearOperativo lee fechaHoraInicio/fechaHoraFin de la API) — no son
  // fechas "peladas" para concatenarles hora, por eso NO se les agrega
  // 'T00:00:00' (eso producía "Invalid Date" / "NaN días").
  const today = new Date();
  const inicio = new Date(operativo.fechaInicio);
  const fin = operativo.fechaFin ? new Date(operativo.fechaFin) : today;
  const diasRastrillando = Math.max(1, differenceInDays(fin, inicio) + 1);

  // `operativo.agenteIds` puede traer IDs placeholder ("sin-migrar-N") en las
  // pantallas ya migradas a la API real (ver mapearOperativo.ts) — su
  // `.length` sí es el conteo real (viene de `cantidadAgentes`), pero nunca
  // va a matchear contra `data.usuarios` (mock). Se usa el length directo.
  const totalAgentes = operativo.agenteIds.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <div
          className="w-full max-w-xl rounded-[var(--radius-card)] flex flex-col"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)', maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(229,75,75,0.1)' }}
            >
              <FileText size={17} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="truncate"
                  style={{
                    color: 'var(--foreground)',
                    fontSize: 'var(--text-h2)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  {operativo.nombre}
                </h2>
                <StatusBadge estado={operativo.estado} size="sm" />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">

            {/* General info */}
            <div className="flex flex-col gap-3">
              <h3 style={{
                color: 'var(--foreground)', fontSize: 'var(--text-h3)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              }}>
                Información General
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <InfoRow
                  icon={<Calendar size={13} />}
                  label="Fecha inicio"
                  value={inicio.toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                />
                {operativo.fechaFin && (
                  <InfoRow
                    icon={<Calendar size={13} />}
                    label="Fecha fin"
                    value={new Date(operativo.fechaFin).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  />
                )}
                <InfoRow
                  icon={<Clock size={13} />}
                  label="Días rastrillando"
                  value={`${diasRastrillando} ${diasRastrillando === 1 ? 'día' : 'días'}`}
                />
                {coordinador && (
                  <InfoRow
                    icon={<User size={13} />}
                    label="Coordinador"
                    value={`${coordinador.nombre} ${coordinador.apellido}`}
                  />
                )}
                <InfoRow icon={<MapPin size={13} />} label="Ubicación" value={operativo.ubicacion} />
                <InfoRow icon={<Users size={13} />} label="Total de agentes" value={`${totalAgentes} agente${totalAgentes !== 1 ? 's' : ''}`} />
              </div>
            </div>

            {/* Descripción */}
            {operativo.descripcion && (
              <div className="flex flex-col gap-2">
                <h3 style={{
                  color: 'var(--foreground)', fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                }}>
                  Descripción
                </h3>
                <p className="leading-relaxed" style={{
                  color: 'var(--muted-foreground)', fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  {operativo.descripcion}
                </p>
              </div>
            )}

            {/* Sectores summary */}
            {operativo.sectores.length > 0 && (
              null
            )}

            {/* Finalizar operativo */}
            {operativo.estado !== 'finalizado' && operativo.estado !== 'eliminado' && (
              <div
                className="flex flex-col gap-2 pt-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setFinalizeStep('confirm')}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[var(--radius-button)] transition-all"
                  style={{
                    background: 'var(--muted)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--muted-foreground)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#b45309';
                    (e.currentTarget as HTMLElement).style.color = '#b45309';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(180,83,9,0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
                  }}
                >
                  <Flag size={14} />
                  Finalizar operativo
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
      {/* Modal de finalización — dos pasos: confirm → gpx_warning */}
      {finalizeStep !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={() => setFinalizeStep(null)}
        >
          <div
            className="w-full max-w-[440px] rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                {finalizeStep === 'confirm' ? (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#fef3c7' }}
                  >
                    <Flag size={17} style={{ color: '#b45309' }} />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(229,75,75,0.1)' }}
                  >
                    <Clock size={17} style={{ color: 'var(--primary)' }} />
                  </div>
                )}
                <div>
                  <p style={{
                    color: 'var(--foreground)', fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                  }}>
                    {finalizeStep === 'confirm' ? 'Finalizar Operativo' : 'Sincronización GPX pendiente'}
                  </p>
                  <p className="truncate max-w-[240px]" style={{
                    color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                    fontFamily: 'var(--font-family-primary)', marginTop: 1,
                  }}>
                    {operativo.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFinalizeStep(null)}
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={17} />
              </button>
            </div>

            {/* ── STEP: confirm ── */}
            {finalizeStep === 'confirm' && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  <div
                    className="flex items-start gap-3 rounded-[var(--radius-input)] px-4 py-3"
                    style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}
                  >
                    <AlertTriangle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: '#78350f', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.55 }}>
                      Esta acción es <strong>irreversible</strong>. El operativo pasará a estado&nbsp;
                      <strong>Finalizado</strong> y todos los datos quedarán en <strong>modo solo lectura</strong>. El personal asignado será liberado.
                    </p>
                  </div>

                  <div
                    className="flex flex-col gap-2 p-3.5 rounded-[var(--radius-input)]"
                    style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.25)' }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} style={{ color: '#b45309', flexShrink: 0 }} />
                      <p style={{
                        color: '#b45309', fontSize: 'var(--text-label)',
                        fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                      }}>
                        ¿Qué ocurre al finalizar?
                      </p>
                    </div>
                    <ul style={{
                      color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                      fontFamily: 'var(--font-family-primary)',
                      paddingLeft: '1rem', lineHeight: 1.7, margin: 0,
                    }}>
                      <li>El operativo pasa al estado <strong>Finalizado</strong>.</li>
                      <li>Se registra la fecha de cierre de hoy.</li>
                      <li>Los agentes quedan liberados para otros operativos.</li>
                      <li>No se podrán realizar modificaciones posteriores.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setFinalizeStep(null)}
                    className="px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      color: 'var(--foreground)', background: 'transparent',
                      border: '1px solid var(--border)', fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinalizeConfirm}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: '#b45309', color: '#fff', fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer', border: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#92400e'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#b45309'}
                  >
                    <Flag size={14} />
                    Confirmar Finalización
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: gpx_warning ── */}
            {finalizeStep === 'gpx_warning' && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  <div
                    className="flex items-start gap-3 rounded-[var(--radius-input)] px-4 py-4"
                    style={{ background: 'rgba(229,75,75,0.06)', border: '1.5px solid rgba(229,75,75,0.35)' }}
                  >
                    <AlertCircle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                        Atención: Existen tracks GPX en proceso de sincronización activa.
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 5, lineHeight: 1.55 }}>
                        {operativo.agenteIds.length} agente{operativo.agenteIds.length !== 1 ? 's' : ''} aún están subiendo datos de rastrillaje. Forzar el cierre puede ocasionar <strong>pérdida de registros GPS</strong> no sincronizados.
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-[var(--radius-input)] px-4 py-3"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={12} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
                        Sincronización en curso
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {operativo.agenteIds.slice(0, 3).map((id, i) => (
                        <div key={id} className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: i % 2 === 0 ? '#f59e0b' : '#fcd34d', animation: 'pulse 1.5s ease-in-out infinite' }}
                          />
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                            Agente {id} — subiendo track GPX…
                          </span>
                        </div>
                      ))}
                      {operativo.agenteIds.length > 3 && (
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', paddingLeft: 14 }}>
                          +{operativo.agenteIds.length - 3} más…
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setFinalizeStep(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      color: 'var(--foreground)', background: 'transparent',
                      border: '1px solid var(--border)', fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Clock size={14} />
                    Esperar
                  </button>
                  <button
                    onClick={handleFinalizeExec}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: 'var(--primary)', color: '#fff', fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer', border: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#c0392b'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}
                  >
                    <AlertCircle size={15} />
                    Forzar Cierre
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
