import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Shield, CheckCircle, XCircle, Loader, MailCheck, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, registroApi, ApiError } from '../services/api';
import { leerAltaPendiente, limpiarAltaPendiente, AltaPendiente } from '../utils/altaPendiente';

type Estado = 'verificando' | 'exitoso' | 'invalido' | 'ya_confirmado';
/** Estado del alta automática al operativo que quedó pendiente (ver utils/altaPendiente.ts). */
type EstadoAlta = 'ninguna' | 'uniendo' | 'unido' | 'conflicto' | 'error';

export default function ConfirmarEmail() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, usuario } = useApp();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');

  const [altaPendiente, setAltaPendienteState] = useState<AltaPendiente | null>(null);
  const [estadoAlta, setEstadoAlta] = useState<EstadoAlta>('ninguna');
  const [errorAlta, setErrorAlta] = useState('');

  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      return;
    }
    let vigente = true;
    authApi.confirmarEmail(token)
      .then(({ estado: r }) => { if (vigente) setEstado(r === 'ok' ? 'exitoso' : r); })
      // 410 = vencido/inexistente; cualquier otro fallo cae igual en
      // "inválido" — no hay una tercera pantalla útil que mostrar.
      .catch(() => { if (vigente) setEstado('invalido'); });
    return () => { vigente = false; };
  }, [token]);

  /**
   * CU-02 paso 7 → paso 6: apenas el correo queda confirmado, se completa
   * automáticamente el alta al operativo que quedó pendiente de la pantalla
   * de registro (ver utils/altaPendiente.ts) — antes había que acordarse de
   * volver a esa pestaña y tocar "Ya confirmé mi correo", y si no, el agente
   * quedaba registrado en el sistema pero nunca sumado al operativo.
   */
  const intentarAltaAutomatica = () => {
    const pendiente = leerAltaPendiente();
    if (!pendiente) return;
    setAltaPendienteState(pendiente);
    setEstadoAlta('uniendo');
    registroApi.altaEnOperativo(pendiente.operativoId, pendiente.qrToken)
      .then(() => {
        limpiarAltaPendiente();
        setEstadoAlta('unido');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.motivo === 'ya_en_este_operativo') {
          limpiarAltaPendiente();
          setEstadoAlta('unido');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'regla_ubicuidad') {
          // Requiere una decisión del agente (CU-15 paso 6.2) — se lo manda
          // de vuelta a la pantalla de registro, que ya tiene ese modal armado.
          limpiarAltaPendiente();
          setEstadoAlta('conflicto');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'qr_invalido') {
          // No se limpia el pendiente: si el coordinador refresca el QR y el
          // agente reintenta, `qrToken` seguiría siendo el viejo de todos
          // modos (no hay forma de enterarse del nuevo desde acá) — se deja
          // así a propósito para que "Reintentar" sea consistente y no un
          // botón que no hace nada.
          setErrorAlta(`El código QR de "${pendiente.operativoNombre}" venció. Pedile al coordinador que te comparta uno nuevo y volvé a escanearlo.`);
          setEstadoAlta('error');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'operativo_cerrado') {
          setErrorAlta(`El operativo "${pendiente.operativoNombre}" ya no admite nuevos ingresos.`);
          setEstadoAlta('error');
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          setErrorAlta(`Iniciá sesión y volvé a escanear el QR de "${pendiente.operativoNombre}" para unirte.`);
          setEstadoAlta('error');
          return;
        }
        setErrorAlta(err instanceof ApiError ? err.message : 'No se pudo completar el ingreso al operativo.');
        setEstadoAlta('error');
      });
  };

  useEffect(() => {
    if (estado !== 'exitoso' && estado !== 'ya_confirmado') return;
    intentarAltaAutomatica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  /** Sección chica que se agrega bajo el mensaje de "cuenta confirmada" cuando había un operativo esperando. */
  const renderEstadoAlta = () => {
    if (estadoAlta === 'ninguna') return null;

    if (estadoAlta === 'uniendo') {
      return (
        <div className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <Loader size={18} style={{ color: '#2563eb', flexShrink: 0 }} className="animate-spin" />
          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>
            Sumándote al operativo <strong>{altaPendiente?.operativoNombre}</strong>...
          </p>
        </div>
      );
    }

    if (estadoAlta === 'unido') {
      return (
        <div className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
          <Users size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#15803d', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
            Ya figurás como agente <strong>Disponible</strong> en{' '}
            <strong>{altaPendiente?.operativoNombre}</strong>.
          </p>
        </div>
      );
    }

    if (estadoAlta === 'conflicto' && altaPendiente) {
      return (
        <div className="w-full flex flex-col gap-2.5 p-3.5 rounded-xl text-left" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
              Ya estás activo en otro operativo. Volvé a entrar por el QR de{' '}
              <strong>{altaPendiente.operativoNombre}</strong> para decidir si te trasladás.
            </p>
          </div>
          <Link
            to={`/registro/${altaPendiente.operativoId}?qr=${altaPendiente.qrToken}`}
            className="text-center py-2.5 rounded-lg"
            style={{ background: '#d97706', color: '#fff', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}
          >
            Ver operativo y decidir
          </Link>
        </div>
      );
    }

    if (estadoAlta === 'error') {
      return (
        <div className="w-full flex flex-col gap-2.5 p-3.5 rounded-xl text-left" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#b91c1c', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>{errorAlta}</p>
          </div>
          {altaPendiente && (
            <button
              onClick={intentarAltaAutomatica}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}
            >
              <RefreshCw size={13} />
              Reintentar
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  const handleIrAlPanel = () => {
    if (isAuthenticated) {
      navigate(usuario?.rol === 'agente' ? '/agente' : '/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--primary)' }}
        >
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
            DUAR · Confirmación de cuenta
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
            Sistema de Búsqueda y Rastreo
          </p>
        </div>
      </div>

      <div
        className="w-full max-w-[400px] rounded-[var(--radius-card)] p-8 flex flex-col items-center text-center gap-6"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
      >
        {/* ── Verificando ── */}
        {estado === 'verificando' && (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              <Loader size={36} style={{ color: '#2563eb' }} className="animate-spin" />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Verificando tu cuenta...
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                Por favor esperá un momento.
              </p>
            </div>
          </>
        )}

        {/* ── Exitoso ── */}
        {estado === 'exitoso' && (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7' }}
            >
              <CheckCircle size={40} color="#16a34a" />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                ¡Cuenta confirmada!
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                Tu correo electrónico fue verificado exitosamente. Ya tenés acceso completo al sistema DUAR.
              </p>
            </div>
            {renderEstadoAlta()}
            <button
              onClick={handleIrAlPanel}
              className="w-full py-3.5 rounded-xl text-white"
              style={{
                background: 'var(--primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              Ir al sistema
            </button>
          </>
        )}

        {/* ── Ya confirmado ── */}
        {estado === 'ya_confirmado' && (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              <MailCheck size={36} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Cuenta ya verificada
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                Tu cuenta ya fue confirmada previamente. Podés ingresar al sistema con normalidad.
              </p>
            </div>
            {renderEstadoAlta()}
            <button
              onClick={handleIrAlPanel}
              className="w-full py-3.5 rounded-xl text-white"
              style={{
                background: 'var(--primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              Ir al sistema
            </button>
          </>
        )}

        {/* ── Inválido / expirado ── */}
        {estado === 'invalido' && (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: '#fee2e2' }}
            >
              <XCircle size={40} color="#dc2626" />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Link inválido o expirado
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                El link de confirmación no es válido o ya fue utilizado. Solicitá un nuevo correo desde tu panel de agente.
              </p>
            </div>
            <button
              onClick={handleIrAlPanel}
              className="w-full py-3.5 rounded-xl"
              style={{
                background: 'var(--muted)',
                color: 'var(--foreground)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              Ir al inicio
            </button>
          </>
        )}
      </div>

      <p
        className="mt-8 text-center"
        style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}
      >
        © 2026 DUAR Córdoba · Sistema v2.0
      </p>
    </div>
  );
}
