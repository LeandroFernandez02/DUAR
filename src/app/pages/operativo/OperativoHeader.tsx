import { useState } from 'react';
import { differenceInDays } from 'date-fns';
import {
  MapPin, Calendar, Clock, Cloud, Target,
  QrCode, Heart,
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import OperativoInfoModal from '../../components/shared/OperativoInfoModal';
import ObjetivoModal from '../../components/shared/ObjetivoModal';
import { QRModal } from '../../components/shared/QRModal';
import { Operativo } from '../../data/mockData';
import { climaMock } from '../../data/mockData';
import { generateFamiliaToken } from '../../utils/familiaToken';

interface Props {
  operativo: Operativo;
}

/* ─────────────────────────────────────────────────
   Header principal del operativo
───────────────────────────────────────────────── */
export default function OperativoHeader({ operativo }: Props) {
  const today = new Date();
  const inicio = new Date(operativo.fechaInicio + 'T00:00:00');
  const diasOperativo = Math.max(0, differenceInDays(today, inicio));
  const { actual } = climaMock;

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showObjetivoModal, setShowObjetivoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const hasObjetivo = !!operativo.objetivoBusqueda;

  const handleFamiliaView = () => {
    const token = generateFamiliaToken(operativo.id);
    window.open(`/familia/${operativo.id}?token=${token}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div
        className="flex-shrink-0 px-6 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          boxShadow: '0 1px 0 var(--border)',
        }}
      >
        {/* ── Left: operativo info ── */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="min-w-0 cursor-pointer group"
            onClick={() => setShowInfoModal(true)}
            title="Ver información del operativo"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                className="truncate transition-colors"
                style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                {operativo.nombre}
              </h2>
              <StatusBadge estado={operativo.estado} size="sm" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="flex items-center gap-1"
                style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
              >
                <MapPin size={11} />
                {operativo.ubicacion}
              </span>
              <span
                className="flex items-center gap-1"
                style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
              >
                <Calendar size={11} />
                Inicio: {new Date(operativo.fechaInicio + 'T00:00:00').toLocaleDateString('es-AR')}
              </span>
              <span
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
              >
                Ver detalles →
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: quick-action buttons + weather ── */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">

          {/* Objetivo Buscado */}
          <button
            onClick={() => setShowObjetivoModal(true)}
            title="Ver / editar objetivo buscado"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-all"
            style={hasObjetivo
              ? {
                  background: 'rgba(229,75,75,0.1)',
                  border: '1.5px solid rgba(229,75,75,0.35)',
                  color: 'var(--primary)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }
              : {
                  background: 'var(--primary)',
                  border: '1.5px solid var(--primary)',
                  color: '#fff',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }
            }
            onMouseEnter={e => {
              if (hasObjetivo) (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.18)';
              else (e.currentTarget as HTMLElement).style.opacity = '0.88';
            }}
            onMouseLeave={e => {
              if (hasObjetivo) (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.1)';
              else (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            <Target size={13} />
            <span>Objetivo</span>
          </button>

          {/* QR Agentes */}
          <button
            onClick={() => setShowQRModal(true)}
            title="Código QR para registro de agentes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-all"
            style={{
              background: 'var(--muted)',
              border: '1.5px solid var(--border)',
              color: 'var(--foreground)',
              fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--border)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted-foreground)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            <QrCode size={13} />
            <span>QR Agentes</span>
          </button>

          {/* Vista Familia */}
          <button
            onClick={handleFamiliaView}
            title="Abrir portal de seguimiento familiar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-all"
            style={{
              background: 'rgba(255,169,135,0.12)',
              border: '1.5px solid rgba(255,169,135,0.45)',
              color: 'var(--accent)',
              fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,169,135,0.22)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,169,135,0.12)'}
          >
            <Heart size={13} />
            <span>Familia</span>
          </button>

          {/* Separador */}
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Día del operativo */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(229,75,75,0.08)' }}
          >
            <Clock size={12} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
              Día {diasOperativo + 1}
            </span>
            <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
              del operativo
            </span>
          </div>

          {/* Clima */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--muted)' }}
          >
            <Cloud size={12} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>{actual.icono}</span>
            <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
              {actual.temperatura}°C
            </span>
            <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
              {actual.descripcion}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInfoModal && (
        <OperativoInfoModal operativo={operativo} onClose={() => setShowInfoModal(false)} />
      )}
      {showObjetivoModal && (
        <ObjetivoModal operativoId={operativo.id} onClose={() => setShowObjetivoModal(false)} />
      )}
      {showQRModal && (
        <QRModal operativo={operativo} onClose={() => setShowQRModal(false)} />
      )}
    </>
  );
}