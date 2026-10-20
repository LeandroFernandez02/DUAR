import { useNavigate } from 'react-router';
import {
  X, MapPin, Calendar, Users, User,
  FileText, Clock, Flag,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Operativo } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import StatusBadge from './StatusBadge';
import { ETIQUETA_RESULTADO } from '../../utils/resultadoOperativo';

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
  const { data } = useApp();
  const navigate = useNavigate();
  /** Finalizar va por el flujo real del listado (revisión previa, reseña y resultado, CU-10). Antes este
   * botón sólo cambiaba los datos de ejemplo del navegador y el operativo seguía abierto en la base. */
  const irAFinalizar = () => {
    onClose();
    navigate(`/operativos?finalizar=${operativo.id}`);
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

            {/* Reseña de cierre (CU-10): su propio campo, ya no pisa la descripción (migración 024). */}
            {operativo.notaFinal && (
              <div className="flex flex-col gap-2">
                <h3 style={{
                  color: 'var(--foreground)', fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                }}>
                  Reseña de cierre
                </h3>
                <p className="leading-relaxed" style={{
                  color: 'var(--muted-foreground)', fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  {operativo.notaFinal}
                </p>
              </div>
            )}

            {/* Resultado elegido al finalizar (CU-10, migración 025). */}
            {operativo.resultado && (
              <div className="flex flex-col gap-2">
                <h3 style={{
                  color: 'var(--foreground)', fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                }}>
                  Resultado
                </h3>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>
                  {ETIQUETA_RESULTADO[operativo.resultado]}
                </p>
              </div>
            )}

            {/* Finalizar operativo: sólo lo que el servidor deja finalizar (activo, en planificación o en proceso). */}
            {['activo', 'planificación', 'en_proceso'].includes(operativo.estado) && (
              <div
                className="flex flex-col gap-2 pt-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={irAFinalizar}
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
    </>
  );
}
