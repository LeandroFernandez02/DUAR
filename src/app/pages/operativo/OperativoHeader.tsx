import { useState } from 'react';
import { useNavigate } from 'react-router';
import { differenceInDays } from 'date-fns';
import {
  MapPin, Calendar, Clock, Cloud, Target,
  QrCode, FileText, ChevronLeft,
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import OperativoInfoModal from '../../components/shared/OperativoInfoModal';
import ObjetivoModal from '../../components/shared/ObjetivoModal';
import { QRModal } from '../../components/shared/QRModal';
import PuestoComando from '../../components/shared/PuestoComando';
import { Operativo } from '../../data/mockData';
import { climaMock } from '../../data/mockData';

interface Props {
  operativo: Operativo;
}

/* ─────────────────────────────────────────────────
   Header principal del operativo
───────────────────────────────────────────────── */
export default function OperativoHeader({ operativo }: Props) {
  const today = new Date();
  // `fechaInicio` ya viene como datetime ISO completo (mapearOperativo lee
  // `fechaHoraInicio` de la API) — no es una fecha "pelada" para concatenarle hora.
  const inicio = new Date(operativo.fechaInicio);
  const diasOperativo = Math.max(0, differenceInDays(today, inicio));
  const { actual } = climaMock;

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showObjetivoModal, setShowObjetivoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Los botones de la derecha se pueden achicar a puros íconos (02/10) y la
  // elección se recuerda en este navegador. Sin almacenamiento, arranca grande.
  const [compacto, setCompacto] = useState(() => {
    try { return localStorage.getItem('duar-encabezado-compacto') === '1'; } catch { return false; }
  });
  const alternarCompacto = () => setCompacto(c => {
    const nuevo = !c;
    try { localStorage.setItem('duar-encabezado-compacto', nuevo ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return nuevo;
  });
  const relleno = compacto ? 'px-2.5' : 'px-3';
  // Achicado, los íconos se agrandan: son lo único que queda para reconocer cada botón.
  const icono = compacto ? 15 : 13;

  const hasObjetivo = !!operativo.tieneObjetivoBuscado;
  const navigate = useNavigate();

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
                Inicio: {new Date(operativo.fechaInicio).toLocaleDateString('es-AR')}
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
        <div className="flex items-center gap-2 flex-wrap min-w-0">

          {/* Achicar / agrandar: la flecha mira a la izquierda para achicar y se gira para agrandar. */}
          <button
            type="button"
            onClick={alternarCompacto}
            title={compacto ? 'Agrandar los botones' : 'Achicar los botones'}
            aria-label={compacto ? 'Agrandar los botones' : 'Achicar los botones'}
            aria-pressed={compacto}
            className="flex items-center justify-center rounded-[var(--radius-button)] transition-all"
            style={{
              width: 30, height: 30, flexShrink: 0,
              background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <ChevronLeft size={15} style={{ transform: compacto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Puesto de comando: coordinadores presentes y quién está a cargo (01/10). */}
          <PuestoComando operativoId={operativo.id} compacto={compacto}
            soloLectura={operativo.estado === 'finalizado' || operativo.estado === 'eliminado'} />

          {/* Objetivo Buscado */}
          <button
            onClick={() => setShowObjetivoModal(true)}
            title="Ver / editar objetivo buscado"
            className={`flex items-center gap-1.5 ${relleno} py-1.5 rounded-[var(--radius-button)] transition-all`}
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
            <Target size={icono} />
            {!compacto && <span>Objetivo</span>}
          </button>

          {/* QR Agentes */}
          <button
            onClick={() => setShowQRModal(true)}
            title="Código QR para registro de agentes"
            className={`flex items-center gap-1.5 ${relleno} py-1.5 rounded-[var(--radius-button)] transition-all`}
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
            <QrCode size={icono} />
            {!compacto && <span>QR Agentes</span>}
          </button>

          {/* Informe (CU-39). Pasó del sidebar a botón según la Lista de Casos
              de Uso del 21/09, que además sacó el Portal de Familia (ex CU-44)
              del alcance de la tesis: este lugar era el del botón "Familia". */}
          <button
            onClick={() => navigate(`/operativo/${operativo.id}/informe`)}
            title="Generar el informe del operativo"
            className={`flex items-center gap-1.5 ${relleno} py-1.5 rounded-[var(--radius-button)] transition-all`}
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
            <FileText size={icono} />
            {!compacto && <span>Informe</span>}
          </button>

          {/* Separador */}
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Día del operativo */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(229,75,75,0.08)' }}
          >
            <Clock size={compacto ? 14 : 12} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}
              title={compacto ? `Día ${diasOperativo + 1} del operativo` : undefined}>
              {compacto ? diasOperativo + 1 : `Día ${diasOperativo + 1}`}
            </span>
            {!compacto && (
              <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                del operativo
              </span>
            )}
          </div>

          {/* Widget de clima: es sólo el chip. La pantalla de Clima no se presenta
              en la tesis y se quitó. OJO: los datos todavía son fijos (climaMock),
              no vienen de ningún servicio. */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--muted)' }}
          >
            <Cloud size={compacto ? 14 : 12} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>{actual.icono}</span>
            <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
              {actual.temperatura}°C
            </span>
            {!compacto && (
              <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                {actual.descripcion}
              </span>
            )}
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