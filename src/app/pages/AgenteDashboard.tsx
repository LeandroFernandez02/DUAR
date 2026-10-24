/**
 * Portal del Agente (diseño CALÍVAR del 23/10, 03 §I): mobile primero, contenido de 640 px como
 * máximo. Arriba la barra con el operativo en el que está; abajo el menú con «Operativo»,
 * «Objetivo» y «Perfil» (la misma hoja de Perfil del coordinador: Mis datos, modo oscuro,
 * accesibilidad y cerrar sesión).
 *  · Operativo: Mi estado, Mi grupo, Mi sector y Mis recorridos.
 *  · Objetivo: la ficha de lo que se busca (sólo lectura).
 * Lo que el coordinador cambia (estado, grupo, polígono) llega solo por la consulta periódica de
 * cada tarjeta, y lo que marca el agente lo ve el coordinador en su tablero (Módulo 4).
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { MapPin, Calendar, RadioTower, Target, Search, MailWarning, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, ApiError, type OperativoApi } from '../services/api';
import PanelTactico from '../components/portal/PanelTactico';
import MiSector from '../components/portal/MiSector';
import MisRecorridos from '../components/portal/MisRecorridos';
import ObjetivoAgente from '../components/portal/ObjetivoAgente';
import MisDatosModal from '../components/shared/MisDatosModal';
import StatusBadge from '../components/shared/StatusBadge';
import { BarraInferior, HojaPerfil } from '../components/layout/Movil';
import Logo from '../components/layout/Logo';
import { tarjetaBase } from '../components/shared/Listados';

const SECCIONES = [
  { icono: RadioTower, label: 'Operativo', path: '/agente' },
  { icono: Target, label: 'Objetivo', path: '/agente?seccion=objetivo' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

/** Barra superior: el operativo en el que estoy (o el logo, si no estoy en ninguno). */
function Cabecera({ op }: { op: OperativoApi | null }) {
  return (
    <header className="shrink-0 relative" style={{ zIndex: 5, background: 'var(--cabecera-movil)', borderRadius: '0 0 20px 20px', boxShadow: 'var(--cabecera-movil-sombra)', padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {op ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate" style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>{op.titulo}</h2>
              <StatusBadge estado={op.estado === 'EN_PLANIFICACION' ? 'planificación' : op.estado.toLowerCase()} size="sm" />
            </div>
            <div className="flex items-center flex-wrap" style={{ gap: '2px 12px', marginTop: 4, fontSize: 'var(--text-label)', color: 'var(--cabecera-movil-sub, var(--muted-foreground))' }}>
              <span className="flex items-center gap-1"><MapPin size={12} />{op.localidad}</span>
              <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(op.fechaHoraInicio)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Logo variante="horizontal" tono="auto" ancho={120} alto={28} />
            <span style={{ fontSize: 'var(--text-label)', color: 'var(--cabecera-movil-sub, var(--muted-foreground))' }}>Portal del agente</span>
          </div>
        )}
      </div>
    </header>
  );
}

function TituloSeccion({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>{titulo}</h1>
      <p style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{sub}</p>
    </div>
  );
}

function SinOperativo() {
  return (
    <div className="flex flex-col items-center text-center gap-3 p-8" style={tarjetaBase}>
      <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--muted)' }}>
        <Search size={22} style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <div>
        <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 600 }}>Sin operativo asignado</p>
        <p style={{ margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
          Cuando un coordinador te asigne a un operativo, o escanees un código QR, aparecerá aquí.
        </p>
      </div>
    </div>
  );
}

export default function AgenteDashboard() {
  const { isAuthenticated, usuario, logout } = useApp();
  const { search } = useLocation();
  const seccion = new URLSearchParams(search).get('seccion') === 'objetivo' ? 'objetivo' : 'operativo';
  const [perfil, setPerfil] = useState(false);
  const [misDatos, setMisDatos] = useState(false);

  /* ── Reenvío de confirmación: mismo endpoint real y cooldown de 2 min que usa Registro.tsx ── */
  const [cooldownReenvio, setCooldownReenvio] = useState(0);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioExitoso, setReenvioExitoso] = useState(false);
  const [errorReenvio, setErrorReenvio] = useState('');

  useEffect(() => {
    const id = setInterval(() => setCooldownReenvio(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const formatCooldown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleReenviarCorreo = async () => {
    setReenviando(true);
    setErrorReenvio('');
    try {
      await authApi.reenviarConfirmacion();
      setReenvioExitoso(true);
      setCooldownReenvio(120);
      setTimeout(() => setReenvioExitoso(false), 4000);
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'cooldown') {
        const segundos = typeof err.datos.segundos === 'number' ? err.datos.segundos : 0;
        setCooldownReenvio(segundos);
      }
      setErrorReenvio(err instanceof ApiError ? err.message : 'No se pudo reenviar el correo.');
    } finally {
      setReenviando(false);
    }
  };

  /* ── Operativo actual: real desde la API (Decisión B — a lo sumo uno) ── */
  const [operativo, setOperativo] = useState<OperativoApi | null>(null);
  const [cargandoOperativo, setCargandoOperativo] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || usuario?.rol !== 'agente') { setCargandoOperativo(false); return; }
    let vigente = true;
    authApi.miOperativoActual()
      .then(({ operativo: o }) => { if (vigente) setOperativo(o ?? null); })
      .catch(() => { if (vigente) setOperativo(null); })
      .finally(() => { if (vigente) setCargandoOperativo(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol !== 'agente') return <Navigate to="/dashboard" replace />;

  const cargando = (
    <div className="p-8 flex items-center justify-center" style={{ ...tarjetaBase, color: 'var(--muted-foreground)' }}>Cargando…</div>
  );

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}>
      <Cabecera op={operativo} />

      <main className="scroll-contenido flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 640, padding: 16 }}>

          {/* ── Correo sin confirmar ── */}
          {!usuario.emailConfirmado && (
            <div className="p-4" style={{ borderRadius: 'var(--radius-card)', background: 'color-mix(in srgb, #ca8a04 calc(8% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1.5px solid color-mix(in srgb, #ca8a04 35%, transparent)' }}>
              <div className="flex items-start gap-3">
                <MailWarning size={18} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 1 }} />
                <div className="flex-1 min-w-0">
                  <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 600 }}>Confirmá tu correo electrónico</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                    Te enviamos un link de verificación a <strong>{usuario.email}</strong>. Revisá tu bandeja de entrada.
                  </p>
                  {errorReenvio && <p className="mt-2" style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))' }}>{errorReenvio}</p>}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {reenvioExitoso ? (
                      <span style={{ color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)', fontSize: 'var(--text-label)', fontWeight: 500 }}>✓ Correo reenviado</span>
                    ) : (
                      <button onClick={handleReenviarCorreo} disabled={cooldownReenvio > 0 || reenviando} className="flex items-center gap-1.5"
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: cooldownReenvio > 0 || reenviando ? 'not-allowed' : 'pointer',
                          color: 'color-mix(in srgb, #fde047 var(--tinte-oscuro, 0%), #a16207)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', fontWeight: 600,
                          textDecoration: 'underline', textUnderlineOffset: '2px', opacity: cooldownReenvio > 0 || reenviando ? 0.6 : 1,
                        }}>
                        <RefreshCw size={12} />
                        {reenviando ? 'Reenviando...' : cooldownReenvio > 0 ? `Reenviar correo (${formatCooldown(cooldownReenvio)})` : 'Reenviar correo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {seccion === 'operativo' ? (
            <>
              <TituloSeccion titulo="Mi operativo" sub="Tu estado, tu grupo y tus recorridos" />
              {cargandoOperativo ? cargando : operativo ? (
                <>
                  {/* Módulo 4: mi estado, mi grupo y, si soy el Líder, los avisos del terreno */}
                  <PanelTactico />
                  {/* El polígono de mi grupo, para ubicarme (sólo lectura) */}
                  <MiSector />
                  {/* Módulo 5 · CU-31: el GPX de lo que recorrí (cargar sí, eliminar no) */}
                  <MisRecorridos />
                </>
              ) : <SinOperativo />}
            </>
          ) : (
            <>
              <TituloSeccion titulo="Objetivo buscado" sub="Persona que se está buscando en este operativo" />
              {cargandoOperativo ? cargando : operativo ? <ObjetivoAgente /> : <SinOperativo />}
            </>
          )}
        </div>
      </main>

      <BarraInferior items={SECCIONES} activo={p => (p.includes('?') ? seccion === 'objetivo' : seccion === 'operativo')}
        perfilAbierto={perfil} onPerfil={() => setPerfil(v => !v)} onNavegar={() => setPerfil(false)} />
      {perfil && (
        <HojaPerfil onCerrar={() => setPerfil(false)}
          onVerDatos={() => { setPerfil(false); setMisDatos(true); }}
          onSalir={() => { setPerfil(false); void logout(); }} />
      )}
      {misDatos && <MisDatosModal pantalla onClose={() => setMisDatos(false)} />}
    </div>
  );
}
