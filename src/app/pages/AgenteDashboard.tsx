import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  Shield, LogOut, MapPin, Calendar, Users, User,
  ChevronDown, ChevronUp, Droplets, Heart, AlertCircle,
  Target, Clock, Search, History, MailWarning, ExternalLink, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Operativo, EstadoOperativo, institucionLabel } from '../data/mockData';
import { enviarEmailConfirmacion } from '../services/emailService';
import { authApi, OperativoApi, ApiError } from '../services/api';

/** Estados que representan que un agente está actualmente activo en un operativo */
const ESTADOS_ACTIVOS = new Set(['activo', 'en_proceso', 'planificación', 'nuevo']);

const ESTADO_API_A_MOCK: Record<string, EstadoOperativo> = {
  NUEVO: 'nuevo', ACTIVO: 'activo', INACTIVO: 'inactivo',
  EN_PLANIFICACION: 'planificación', EN_PROCESO: 'en_proceso',
  FINALIZADO: 'finalizado', ELIMINADO: 'eliminado',
};

/** Traduce el operativo de la API al modelo que ya consume esta pantalla. */
function mapearOperativo(o: OperativoApi): Operativo {
  return {
    id: o.id,
    nombre: o.titulo,
    estado: ESTADO_API_A_MOCK[o.estado] ?? 'nuevo',
    ubicacion: o.localidad,
    fiscal: o.fiscalInstruccion,
    punto0: { lat: o.puntoCeroLat, lng: o.puntoCeroLng },
    fechaInicio: o.fechaHoraInicio,
    fechaFin: o.fechaHoraFin ?? undefined,
    descripcion: o.descripcion ?? undefined,
    // "Objetivo Buscado" (CU-12..14) y grupos (Módulo 4) todavía no tienen
    // endpoint — quedan sin datos hasta que se migren esos CU.
    agenteIds: Array.from({ length: o.cantidadAgentes }, (_, i) => `sin-migrar-${i}`),
    grupoIds: [],
    sectores: [],
    puntos: [],
    kmRastrillados: 0,
    coordinadorId: o.coordinadorId,
  };
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activo:        { label: 'Activo',        bg: '#dcfce7', color: '#16a34a', dot: '#16a34a' },
  en_proceso:    { label: 'En Proceso',    bg: '#dbeafe', color: '#1d4ed8', dot: '#1d4ed8' },
  planificación: { label: 'Planificación', bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04' },
  nuevo:         { label: 'Nuevo',         bg: 'rgba(229,75,75,0.1)', color: '#E54B4B', dot: '#E54B4B' },
  inactivo:      { label: 'Finalizado',    bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  finalizado:    { label: 'Finalizado',    bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
};

function calcAge(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return '—';
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return `${age} años`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Tarjeta de operativo ────────────────────────────────────────────────────

function OperativoCard({
  op,
  variant = 'normal',
}: {
  op: Operativo;
  variant?: 'current' | 'normal';
}) {
  const { data, usuario } = useApp();
  const [expanded, setExpanded] = useState(variant === 'current');

  const cfg = ESTADO_CONFIG[op.estado] ?? ESTADO_CONFIG.inactivo;

  const miGrupo = data.grupos.find(g =>
    op.grupoIds.includes(g.id) &&
    (g.agenteIds.includes(usuario!.id) || g.lider === usuario!.id)
  );
  const sectorAsignado = miGrupo?.sectorAsignado
    ? op.sectores.find(s => s.id === miGrupo.sectorAsignado)
    : null;
  const esLider = miGrupo?.lider === usuario!.id;

  const obj = op.objetivoBusqueda;
  const objNombre = obj?.tipo === 'persona'
    ? `${obj.persona?.nombre ?? ''} ${obj.persona?.apellido ?? ''}`.trim()
    : obj?.objeto?.nombre ?? '';

  return (
    <div
      className="rounded-[var(--radius-card)] overflow-hidden"
      style={{
        background: 'var(--card)',
        boxShadow: variant === 'current' ? 'var(--elevation-md)' : 'var(--elevation-sm)',
        border: variant === 'current' ? '2px solid var(--primary)' : '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Status + badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
              {miGrupo && esLider && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
                >
                  Líder de grupo
                </span>
              )}
            </div>

            <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.3 }}>
              {op.nombre}
            </h3>

            <div className="flex items-center gap-1 mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
              <MapPin size={12} />
              <span style={{ fontSize: 'var(--text-label)' }}>{op.ubicacion}</span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
            style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
            aria-label={expanded ? 'Contraer' : 'Expandir'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
            <Calendar size={12} />
            <span style={{ fontSize: 'var(--text-label)' }}>{formatDate(op.fechaInicio)}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
            <Users size={12} />
            <span style={{ fontSize: 'var(--text-label)' }}>{op.agenteIds.length} agentes</span>
          </div>
          {miGrupo && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: miGrupo.color }} />
              <span style={{ fontSize: 'var(--text-label)' }}>{miGrupo.nombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-3 flex flex-col gap-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Objetivo buscado */}
          {obj && (
            <div>
              <p className="mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                Objetivo buscado
              </p>
              <div
                className="p-3 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(229,75,75,0.06)', border: '1px solid rgba(229,75,75,0.2)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229,75,75,0.1)' }}
                >
                  {obj.tipo === 'persona'
                    ? <User size={15} style={{ color: 'var(--primary)' }} />
                    : <Target size={15} style={{ color: 'var(--primary)' }} />
                  }
                </div>
                <div>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {objNombre || '—'}
                  </p>
                  {obj.tipo === 'persona' && obj.persona && (
                    <>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                        {[
                          obj.persona.edad ? `${obj.persona.edad} años` : null,
                          obj.persona.sexo,
                          obj.persona.nacionalidad,
                        ].filter(Boolean).join(' · ')}
                      </p>
                      {obj.persona.detallesAdicionales && (
                        <p className="mt-1.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--foreground)' }}>Detalles:</strong> {obj.persona.detallesAdicionales}
                        </p>
                      )}
                    </>
                  )}
                  {obj.tipo === 'objeto' && obj.objeto?.descripcion && (
                    <p className="mt-1" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                      {obj.objeto.descripcion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mi grupo */}
          {miGrupo && (
            <div>
              <p className="mb-2 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                Mi grupo
              </p>
              <div className="p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: miGrupo.color }} />
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {miGrupo.nombre}
                  </p>
                  {esLider && (
                    <span className="px-1.5 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                      Líder
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                  {miGrupo.agenteIds.length} integrante{miGrupo.agenteIds.length !== 1 ? 's' : ''}
                  {sectorAsignado ? ` · ${sectorAsignado.nombre}` : ''}
                  {miGrupo.kmRecorridos > 0 ? ` · ${miGrupo.kmRecorridos} km recorridos` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Descripción */}
          {op.descripcion && (
            <div>
              <p className="mb-1.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                Descripción
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                {op.descripcion}
              </p>
            </div>
          )}

          {/* Fecha fin si aplica */}
          {op.fechaFin && (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
              Finalizado el {formatDate(op.fechaFin)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AgenteDashboard() {
  const { isAuthenticated, usuario, logout, data } = useApp();
  const navigate = useNavigate();
  const [reenvioExitoso, setReenvioExitoso] = useState(false);
  const [urlConfirmacionDev, setUrlConfirmacionDev] = useState<string | undefined>();

  /* ── Operativo actual: REAL desde la API (Decisión B — a lo sumo uno) ──
   * Antes leía de `data.operativos` (mock), por eso mostraba "Sin operativo
   * asignado" aunque el alta ya estuviera en PostgreSQL. */
  const [operativoActual, setOperativoActual] = useState<Operativo | null>(null);
  const [cargandoOperativo, setCargandoOperativo] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || usuario?.rol !== 'agente') { setCargandoOperativo(false); return; }
    let vigente = true;
    authApi.miOperativoActual()
      .then(({ operativo }) => { if (vigente) setOperativoActual(operativo ? mapearOperativo(operativo) : null); })
      .catch(() => { if (vigente) setOperativoActual(null); })
      .finally(() => { if (vigente) setCargandoOperativo(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol !== 'agente') return <Navigate to="/dashboard" replace />;

  // Historial: todavía no migrado (requeriría un endpoint de participaciones
  // cerradas). `data.operativos` sigue vacío para operativos reales, así que
  // esta sección simplemente no aparece — no muestra datos incorrectos,
  // sólo no muestra nada hasta que se migre.
  const historial = data.operativos.filter(
    op => !ESTADOS_ACTIVOS.has(op.estado) && op.agenteIds.includes(usuario.id)
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}>

      {/* Top navigation */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:px-6"
        style={{ background: 'var(--duar-dark, #444140)', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Shield size={17} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>DUAR</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>Portal Agente</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', fontSize: 'var(--text-label)' }}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Perfil del agente ── */}
        <div
          className="rounded-[var(--radius-card)] p-5"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary)', color: '#fff', fontSize: '20px', fontWeight: 'var(--font-weight-bold)' }}
            >
              {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
                {usuario.nombre} {usuario.apellido}
              </h1>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>{usuario.email}</p>
              {usuario.institucionId && (
                <p className="mt-0.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                  {institucionLabel(usuario)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <User size={13} />, label: 'DNI', value: usuario.dni },
              { icon: <Calendar size={13} />, label: 'Edad', value: calcAge(usuario.fechaNacimiento) },
              { icon: <Droplets size={13} />, label: 'Grupo Sanguíneo', value: usuario.grupo_sanguineo || '—' },
              {
                icon: <Heart size={13} />,
                label: 'Especialidad',
                value: usuario.especialidad
                  ? usuario.especialidad.charAt(0).toUpperCase() + usuario.especialidad.slice(1)
                  : '—',
              },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {item.icon}
                  <span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.label}
                  </span>
                </div>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {usuario.alergias && (
            <div
              className="mt-4 flex items-start gap-2 p-3 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>
                <strong>Alergias:</strong> {usuario.alergias}
              </p>
            </div>
          )}
        </div>

        {/* ── Banner: email no confirmado ── */}
        {!usuario.emailConfirmado && (
          <div
            className="rounded-[var(--radius-card)] p-4"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1.5px solid rgba(234,179,8,0.35)' }}
          >
            <div className="flex items-start gap-3">
              <MailWarning size={18} style={{ color: '#ca8a04', flexShrink: 0, marginTop: '1px' }} />
              <div className="flex-1 min-w-0">
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Confirmá tu correo electrónico
                </p>
                <p className="mt-0.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                  Te enviamos un link de verificación a <strong>{usuario.email}</strong>. Revisá tu bandeja de entrada.
                </p>

                {/* Link dev visible solo en desarrollo */}
                {urlConfirmacionDev && (
                  <a
                    href={urlConfirmacionDev}
                    className="mt-2 flex items-center gap-1 break-all"
                    style={{ color: '#15803d', fontSize: '11px', lineHeight: 1.5 }}
                  >
                    <ExternalLink size={10} style={{ flexShrink: 0 }} />
                    {urlConfirmacionDev}
                  </a>
                )}

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {reenvioExitoso ? (
                    <span style={{ color: '#15803d', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                      ✓ Correo reenviado
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        const r = await enviarEmailConfirmacion({
                          destinatario: usuario.email,
                          nombreUsuario: `${usuario.nombre} ${usuario.apellido}`,
                          tokenConfirmacion: usuario.tokenConfirmacion ?? '',
                        });
                        setUrlConfirmacionDev(r.urlConfirmacionDev);
                        setReenvioExitoso(true);
                        setTimeout(() => setReenvioExitoso(false), 4000);
                      }}
                      className="flex items-center gap-1.5"
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: '#ca8a04', fontSize: 'var(--text-label)',
                        fontFamily: 'var(--font-family-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                        textDecoration: 'underline', textUnderlineOffset: '2px',
                      }}
                    >
                      <RefreshCw size={12} />
                      Reenviar correo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Operativo actual ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: 'var(--primary)' }} />
            <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
              Mi operativo actual
            </h2>
          </div>

          {cargandoOperativo ? (
            <div
              className="rounded-[var(--radius-card)] p-8 flex items-center justify-center"
              style={{ background: 'var(--card)', border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}
            >
              Cargando…
            </div>
          ) : operativoActual ? (
            <OperativoCard op={operativoActual} variant="current" />
          ) : (
            <div
              className="rounded-[var(--radius-card)] p-8 flex flex-col items-center text-center gap-3"
              style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--muted)' }}
              >
                <Search size={22} style={{ color: 'var(--muted-foreground)' }} />
              </div>
              <div>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Sin operativo asignado
                </p>
                <p className="mt-1" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                  Cuando un coordinador te asigne a un operativo, o escanees un código QR, aparecerá aquí.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Historial ── */}
        {historial.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={16} style={{ color: 'var(--muted-foreground)' }} />
              <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                Historial de participación
              </h2>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
              >
                {historial.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {historial.map(op => (
                <OperativoCard key={op.id} op={op} variant="normal" />
              ))}
            </div>
          </div>
        )}

        <p className="text-center pb-4" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
          © 2026 DUAR Córdoba · Sistema v2.0
        </p>
      </div>
    </div>
  );
}