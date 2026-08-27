import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router';
import { Shield, CheckCircle, XCircle, Loader, MailCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Estado = 'verificando' | 'exitoso' | 'invalido' | 'ya_confirmado';

export default function ConfirmarEmail() {
  const { token } = useParams<{ token: string }>();
  const { confirmarEmail, isAuthenticated, usuario } = useApp();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');

  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      return;
    }

    // Simular latencia de verificación (en producción sería una llamada al backend)
    const timer = setTimeout(() => {
      const resultado = confirmarEmail(token);
      setEstado(resultado === 'ok' ? 'exitoso' : resultado === 'ya_confirmado' ? 'ya_confirmado' : 'invalido');
    }, 1200);

    return () => clearTimeout(timer);
  }, [token, confirmarEmail]);

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
