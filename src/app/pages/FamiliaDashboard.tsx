import { useParams, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { useEffect, useState } from 'react';
import { validateFamiliaToken } from '../utils/familiaToken';
import {
  Users,
  Navigation,
  Map,
  Clock,
  Shield,
  Heart,
  CheckCircle2,
  Activity,
  AlertCircle,
  Search,
  Lock,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────── */
function formatElapsed(fechaInicio: string): string {
  const start = new Date(fechaInicio).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - start);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ── Estado badge ────────────────────────────────────────────── */
type EstadoOperativo = 'activo' | 'planificación' | 'inactivo' | 'nuevo';

const estadoConfig: Record<
  EstadoOperativo,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  activo: {
    label: 'Operativo en Curso',
    color: '#15803d',
    bg: 'rgba(21,128,61,0.10)',
    icon: <Activity size={14} />,
  },
  planificación: {
    label: 'En Planificación',
    color: '#ca8a04',
    bg: 'rgba(202,138,4,0.10)',
    icon: <AlertCircle size={14} />,
  },
  inactivo: {
    label: 'Operativo Finalizado',
    color: 'var(--muted-foreground)',
    bg: 'var(--muted)',
    icon: <CheckCircle2 size={14} />,
  },
  nuevo: {
    label: 'Iniciando',
    color: 'var(--primary)',
    bg: 'rgba(229,75,75,0.08)',
    icon: <Search size={14} />,
  },
};

/* ── Pulso animado (CSS-in-JSX) ─────────────────────────────── */
const pulseStyle = `
@keyframes duar-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(1.15); }
}
@keyframes duar-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes duar-fadeup {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.duar-pulse-dot {
  animation: duar-pulse 2s ease-in-out infinite;
}
.duar-spin-slow {
  animation: duar-spin-slow 8s linear infinite;
}
.duar-fadeup {
  animation: duar-fadeup 0.5s ease both;
}
`;

/* ── Componente ─────────────────────────────────────────────── */
export default function FamiliaDashboard() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { getOperativo, data } = useApp();
  const [elapsed, setElapsed] = useState('');
  const [now, setNow] = useState(new Date());

  const token = searchParams.get('token');
  const isAuthorized = validateFamiliaToken(id!, token);

  const operativo = getOperativo(id!);

  useEffect(() => {
    if (!operativo || !isAuthorized) return;
    const tick = () => {
      setElapsed(formatElapsed(operativo.fechaInicio));
      setNow(new Date());
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [operativo, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--background)',
          fontFamily: 'var(--font-family-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 400,
            width: '100%',
            background: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--elevation-md)',
            padding: '40px 32px',
            textAlign: 'center',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(229,75,75,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h2
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--text-h2)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: '12px',
            }}
          >
            Acceso restringido
          </h2>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--text-base)',
              lineHeight: 1.65,
              marginBottom: '24px',
            }}
          >
            Este portal solo es accesible a través del enlace generado por el coordinador del operativo.
            El enlace puede haber expirado o no ser válido.
          </p>
          <div
            style={{
              background: 'var(--muted)',
              borderRadius: 'var(--radius-input)',
              padding: '12px 16px',
              border: '1px solid var(--border)',
            }}
          >
            <p
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--text-label)',
                lineHeight: 1.5,
              }}
            >
              Si sos familiar de la persona buscada, solicitá al coordinador del operativo que te comparta el enlace de acceso.
            </p>
          </div>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--text-label)',
              marginTop: '24px',
              opacity: 0.6,
            }}
          >
            DUAR · Defensa Urbana y Atención de Riesgos
          </p>
        </div>
      </div>
    );
  }

  if (!operativo) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--background)',
          fontFamily: 'var(--font-family-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Shield size={40} style={{ color: 'var(--primary)', opacity: 0.5 }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
          Operativo no encontrado.
        </p>
      </div>
    );
  }

  const agentes = data.usuarios.filter(u => u.estado !== 'eliminado' && operativo.agenteIds.includes(u.id));
  const grupos = data.grupos.filter(g => operativo.grupoIds.includes(g.id));
  const rastrillando = grupos
    .filter(g => g.estado === 'rastrillando')
    .reduce((acc, g) => acc + g.agenteIds.length, 0);
  const sectoresCompletados = operativo.sectores.filter(s => s.estado === 'completado').length;
  const totalSectores = operativo.sectores.length;
  const progreso =
    totalSectores > 0 ? Math.round((sectoresCompletados / totalSectores) * 100) : 0;

  const cfg = estadoConfig[operativo.estado as EstadoOperativo] ?? estadoConfig['nuevo'];

  /* Hitos públicos (sin datos tácticos) */
  const hitos: { icon: React.ReactNode; texto: string; tiempo: string }[] = [
    {
      icon: <Shield size={14} />,
      texto: 'Operativo iniciado y equipos desplegados en zona de búsqueda.',
      tiempo: formatDate(operativo.fechaInicio),
    },
    ...(grupos.length > 0
      ? [
          {
            icon: <Users size={14} />,
            texto: `${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} de rastrillaje organizados y en actividad.`,
            tiempo: 'En curso',
          },
        ]
      : []),
    ...(operativo.kmRastrillados > 0
      ? [
          {
            icon: <Navigation size={14} />,
            texto: `${operativo.kmRastrillados.toFixed(1)} km de terreno relevados sistemáticamente.`,
            tiempo: 'Acumulado',
          },
        ]
      : []),
    ...(sectoresCompletados > 0
      ? [
          {
            icon: <CheckCircle2 size={14} />,
            texto: `${sectoresCompletados} sector${sectoresCompletados !== 1 ? 'es' : ''} del área analizado${sectoresCompletados !== 1 ? 's' : ''} en profundidad.`,
            tiempo: 'Completado',
          },
        ]
      : []),
    ...(operativo.puntos.filter(p => p.tipo === 'hallazgo').length > 0
      ? [
          {
            icon: <Search size={14} />,
            texto: `${operativo.puntos.filter(p => p.tipo === 'hallazgo').length} hallazgo${operativo.puntos.filter(p => p.tipo === 'hallazgo').length !== 1 ? 's' : ''} registrado${operativo.puntos.filter(p => p.tipo === 'hallazgo').length !== 1 ? 's' : ''} durante el rastrillaje.`,
            tiempo: 'Registrado',
          },
        ]
      : []),
  ];

  return (
    <>
      <style>{pulseStyle}</style>

      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--background)',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            background: 'var(--sidebar)',
            borderBottom: '1px solid var(--sidebar-border)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Animated live indicator */}
            {operativo.estado === 'activo' && (
              <span
                className="duar-pulse-dot"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: 'var(--sidebar-foreground)',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)',
                opacity: 0.9,
              }}
            >
              DUAR · Portal de Seguimiento Familiar
            </span>
          </div>
          <span
            style={{
              color: 'var(--sidebar-foreground)',
              fontSize: 'var(--text-label)',
              opacity: 0.55,
            }}
          >
            {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
          </span>
        </div>

        {/* ── Hero ── */}
        <div
          style={{
            background: 'var(--primary)',
            padding: '40px 20px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative ring */}
          <div
            className="duar-spin-slow"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              height: 320,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.10)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Shield size={26} color="#fff" />
            </div>

            {/* Estado badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              {cfg.icon}
              {cfg.label}
            </div>

            <h1
              style={{
                color: '#fff',
                fontSize: 'clamp(20px, 5vw, 28px)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 1.25,
                maxWidth: 520,
                margin: 0,
              }}
            >
              {operativo.nombre}
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 'var(--text-base)',
                margin: 0,
              }}
            >
              {operativo.ubicacion}
            </p>
          </div>
        </div>

        {/* ── Main content ── */}
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 16px 48px',
          }}
        >
          {/* Elapsed time highlight */}
          {operativo.estado === 'activo' && elapsed && (
            <div
              className="duar-fadeup"
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-md)',
                padding: '20px 24px',
                marginTop: '-24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(229,75,75,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p
                  style={{
                    color: 'var(--muted-foreground)',
                    fontSize: 'var(--text-label)',
                    marginBottom: '2px',
                  }}
                >
                  Tiempo de búsqueda activa
                </p>
                <p
                  style={{
                    color: 'var(--foreground)',
                    fontSize: '22px',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  {elapsed}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p
                  style={{
                    color: 'var(--muted-foreground)',
                    fontSize: 'var(--text-label)',
                    marginBottom: '2px',
                  }}
                >
                  Inicio del operativo
                </p>
                <p
                  style={{
                    color: 'var(--foreground)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {formatDate(operativo.fechaInicio)}
                </p>
              </div>
            </div>
          )}

          {/* KPI grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              marginTop: operativo.estado !== 'activo' ? '20px' : '0',
            }}
          >
            {/* Rescatistas en campo */}
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-sm)',
                padding: '18px',
                textAlign: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(229,75,75,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Users size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--foreground)',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {agentes.length}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-label)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.3,
                }}
              >
                Rescatistas movilizados
              </p>
            </div>

            {/* Activos en campo */}
            {operativo.estado === 'activo' && (
              <div
                style={{
                  background: 'var(--card)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--elevation-sm)',
                  padding: '18px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(21,128,61,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <Activity size={18} style={{ color: '#15803d' }} />
                </div>
                <p
                  style={{
                    fontSize: '28px',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#15803d',
                    lineHeight: 1,
                    marginBottom: '4px',
                  }}
                >
                  {rastrillando}
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-label)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.3,
                  }}
                >
                  Activos en terreno ahora
                </p>
              </div>
            )}

            {/* Grupos */}
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-sm)',
                padding: '18px',
                textAlign: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,169,135,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Shield size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--foreground)',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {grupos.length}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-label)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.3,
                }}
              >
                Grupos de rastrillaje
              </p>
            </div>

            {/* KM */}
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-sm)',
                padding: '18px',
                textAlign: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,169,135,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Navigation size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--foreground)',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {operativo.kmRastrillados.toFixed(1)}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-label)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.3,
                }}
              >
                km relevados
              </p>
            </div>
          </div>

          {/* Progreso sectores */}
          {totalSectores > 0 && (
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-sm)',
                padding: '20px 24px',
                marginBottom: '20px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Map size={16} style={{ color: 'var(--primary)' }} />
                  <span
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--foreground)',
                    }}
                  >
                    Cobertura del área de búsqueda
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-h3)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: progreso === 100 ? '#15803d' : 'var(--primary)',
                  }}
                >
                  {progreso}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: 'var(--muted)',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progreso}%`,
                    borderRadius: 999,
                    background:
                      progreso === 100
                        ? '#15803d'
                        : 'linear-gradient(90deg, var(--primary), var(--accent))',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>

              {/* Sector pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {operativo.sectores.map(sector => (
                  <div
                    key={sector.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-medium)',
                      background:
                        sector.estado === 'completado'
                          ? 'rgba(21,128,61,0.08)'
                          : sector.estado === 'en_progreso'
                          ? 'rgba(229,75,75,0.08)'
                          : 'var(--muted)',
                      color:
                        sector.estado === 'completado'
                          ? '#15803d'
                          : sector.estado === 'en_progreso'
                          ? 'var(--primary)'
                          : 'var(--muted-foreground)',
                      border: `1px solid ${
                        sector.estado === 'completado'
                          ? 'rgba(21,128,61,0.2)'
                          : sector.estado === 'en_progreso'
                          ? 'rgba(229,75,75,0.2)'
                          : 'var(--border)'
                      }`,
                    }}
                  >
                    {sector.estado === 'completado' && <CheckCircle2 size={11} />}
                    {sector.estado === 'en_progreso' && (
                      <span
                        className="duar-pulse-dot"
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                        }}
                      />
                    )}
                    {sector.nombre}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline de actividad */}
          {hitos.length > 0 && (
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--elevation-sm)',
                padding: '20px 24px',
                marginBottom: '20px',
                border: '1px solid var(--border)',
              }}
            >
              <h3
                style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: '16px',
                }}
              >
                Actividad del operativo
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {hitos.map((hito, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      position: 'relative',
                    }}
                  >
                    {/* Timeline line */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(229,75,75,0.08)',
                          border: '1.5px solid rgba(229,75,75,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          flexShrink: 0,
                        }}
                      >
                        {hito.icon}
                      </div>
                      {i < hitos.length - 1 && (
                        <div
                          style={{
                            width: 1.5,
                            flex: 1,
                            minHeight: 16,
                            background: 'var(--border)',
                            margin: '4px 0',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ paddingBottom: i < hitos.length - 1 ? '16px' : '0', flex: 1 }}>
                      <p
                        style={{
                          color: 'var(--foreground)',
                          fontSize: 'var(--text-base)',
                          lineHeight: 1.5,
                          marginBottom: '3px',
                        }}
                      >
                        {hito.texto}
                      </p>
                      <p
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: 'var(--text-label)',
                        }}
                      >
                        {hito.tiempo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje de compromiso */}
          <div
            style={{
              borderRadius: 'var(--radius-card)',
              padding: '24px',
              background: 'rgba(229,75,75,0.05)',
              border: '1px solid rgba(229,75,75,0.15)',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <Heart
              size={28}
              style={{ color: 'var(--primary)', margin: '0 auto 12px', display: 'block' }}
            />
            <h2
              style={{
                color: 'var(--foreground)',
                fontSize: 'var(--text-h3)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: '10px',
              }}
            >
              Trabajamos sin pausa por encontrarlos
            </h2>
            <p
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--text-base)',
                lineHeight: 1.65,
                maxWidth: 520,
                margin: '0 auto',
              }}
            >
              Nuestros equipos especializados trabajan de manera coordinada y sistemática. Cada
              kilómetro recorrido, cada sector analizado y cada hallazgo registrado forma parte de
              nuestra búsqueda intensiva y permanente. Estamos con ustedes.
            </p>
          </div>

          {/* Footer institucional */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--text-label)',
                lineHeight: 1.6,
              }}
            >
              Este portal es de solo lectura y uso exclusivo para familiares.
              <br />
              <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                DUAR · Defensa Urbana y Atención de Riesgos · Córdoba
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}