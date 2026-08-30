import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RecuperarContrasenaModal } from '../components/auth/RecuperarContrasenaModal';

export default function Login() {
  const { login, isAuthenticated, usuario, data } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecover, setShowRecover] = useState(false);

  // Redirigir según rol si ya está autenticado
  if (isAuthenticated) {
    if (usuario?.rol === 'agente') return <Navigate to="/agente" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('fields');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result === 'ok') {
      // No hace falta navegar acá: al setearse el usuario en el contexto,
      // el guard `isAuthenticated` de arriba redirige según el rol (CU-01 paso 6).
      return;
    }
    if (result === 'inactive') setError('inactive');
    else if (result === 'sin_conexion') setError('sin_conexion');
    else setError('credentials');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10"
        style={{ background: 'var(--duar-dark, #444140)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>DUAR</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Córdoba</p>
          </div>
        </div>

        <div>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(229,75,75,0.15)' }}
          >
            <Shield size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.2, marginBottom: '12px' }}>
            Sistema de<br />Búsqueda y Rastreo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
            Dirección de Unidades de Alto Riesgo.<br />
            Plataforma de gestión operativa para misiones de búsqueda y rastreo en la provincia de Córdoba.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              'Gestión integral de operativos',
              'Coordinación de agentes y grupos',
              'Mapeo y análisis de sectores',
              'Informes automáticos PDF',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-base)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          © 2026 DUAR Córdoba · Sistema v2.0
        </p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <Shield size={22} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>DUAR</p>
              <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Dirección de Unidades de Alto Riesgo</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>
              Iniciar Sesión
            </h2>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Ingresá tus credenciales para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label
                className="block mb-1.5"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@duar.cba.gob.ar"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border outline-none transition-all"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-base)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block mb-1.5"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border outline-none transition-all"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-base)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* El backend no responde: es un problema de infraestructura, no
                de credenciales, y conviene distinguirlo para no confundir. */}
            {error === 'sin_conexion' && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', fontSize: 'var(--text-base)' }}
              >
                <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>
                  No se pudo contactar al servidor. Verificá que la API esté levantada
                  (<code>npm --prefix server run dev</code>).
                </span>
              </div>
            )}

            {/* Error */}
            {error === 'credentials' && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
              >
                <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>Credenciales incorrectas. Verificá tu email y contraseña.</span>
              </div>
            )}

            {error === 'inactive' && (
              <div
                className="flex flex-col gap-1.5 p-3.5 rounded-lg"
                style={{ background: 'rgba(255,169,135,0.12)', border: '1px solid rgba(255,169,135,0.45)' }}
              >
                <div className="flex items-center gap-2.5" style={{ color: 'var(--duar-dark)' }}>
                  <UserX size={16} style={{ flexShrink: 0, color: 'var(--duar-salmon)' }} />
                  <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)' }}>
                    Cuenta inactiva
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', paddingLeft: '24px' }}>
                  Tu cuenta se encuentra deshabilitada en el sistema. Contactá al coordinador del DUAR para reactivarla.
                </p>
              </div>
            )}

            {error === 'fields' && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
              >
                <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>Por favor completá todos los campos.</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white mt-1 transition-opacity"
              style={{
                background: 'var(--primary)',
                fontFamily: 'var(--font-family-primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>

            {/* Forgot password — el registro solo es posible vía QR */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRecover(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--primary)',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de recuperación de contraseña */}
      {showRecover && (
        <RecuperarContrasenaModal onClose={() => setShowRecover(false)} />
      )}
    </div>
  );
}