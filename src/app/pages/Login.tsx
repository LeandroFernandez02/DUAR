import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Mail, UserX, WifiOff, ShieldAlert, Smartphone } from 'lucide-react';
import { filtrarEmail, validarEmail, EMAIL_MAX } from '../utils/validacionUsuario';
import { useApp } from '../context/AppContext';
import { MarcoAcceso, TituloAcceso, CampoAcceso, CampoContrasenaAcceso, AlertaAcceso, BotonAcceso, EnlaceAcceso } from '../components/auth/Acceso';
import RecuperarContrasena from '../components/auth/RecuperarContrasena';
import { esInstalada } from '../utils/instalacion';

/**
 * Iniciar sesión (CU-01) y Recuperar contraseña (CU-03), con el diseño CALÍVAR (23/10): logo
 * vertical y tarjeta centrada. Los avisos distinguen credenciales incorrectas, cuenta inactiva,
 * demasiados intentos (bloqueo temporal del servidor) y servidor sin respuesta.
 */
export default function Login() {
  const { login, isAuthenticated, usuario } = useApp();
  const navigate = useNavigate();
  const [vista, setVista] = useState<'login' | 'recuperar'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Errores de cada campo, debajo del campo, como en «Recuperar contraseña» (QA 12/11, HP-03).
  const [errEmail, setErrEmail] = useState('');
  const [errPassword, setErrPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir según rol si ya está autenticado
  if (isAuthenticated) {
    if (usuario?.rol === 'agente') return <Navigate to="/agente" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const eEmail = !email.trim() ? 'Este campo es obligatorio.' : validarEmail(email) !== null ? 'El formato del correo electrónico no es válido.' : '';
    const ePass = !password ? 'Este campo es obligatorio.' : '';
    setErrEmail(eEmail); setErrPassword(ePass);
    if (eEmail || ePass) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result === 'ok') {
      // No hace falta navegar acá: al setearse el usuario en el contexto,
      // el guard `isAuthenticated` de arriba redirige según el rol (CU-01 paso 6).
      return;
    }
    if (result === 'inactive') setError('inactive');
    else if (result === 'bloqueado') setError('bloqueado');
    else if (result === 'sin_conexion') setError('sin_conexion');
    else setError('credentials');
  };

  // Al volver de «Recuperar contraseña» el login queda limpio: sin el aviso ni la contraseña de antes.
  // El correo se conserva (y pasa a la recuperación ya escrito) para no tipearlo dos veces (QA 12/11, HP-06).
  const volverDeRecuperar = () => { setError(''); setErrEmail(''); setErrPassword(''); setPassword(''); setVista('login'); };
  if (vista === 'recuperar') return <MarcoAcceso><RecuperarContrasena emailInicial={email} onVolver={volverDeRecuperar} /></MarcoAcceso>;

  return (
    <MarcoAcceso pie={<>
      ¿Sos agente? Registrate escaneando el QR del operativo.
      {/* App instalable (10/11): desde la app ya instalada no hace falta la guía. */}
      {!esInstalada() && (
        <button type="button" onClick={() => navigate('/instalar')} className="flex items-center justify-center gap-1.5"
          style={{ margin: '6px auto -8px', minHeight: 44, background: 'none', border: 'none', padding: '0 8px', cursor: 'pointer', color: 'var(--foreground)',
            fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600,
            textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'var(--primary)' }}>
          <Smartphone size={15} style={{ color: 'var(--primary)' }} />
          Guía de instalación en el celular
        </button>
      )}
    </>}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TituloAcceso titulo="Iniciar Sesión" texto="Ingresá tus credenciales para acceder al sistema." />
        <CampoAcceso label="Correo electrónico" icono={Mail} type="email" value={email} maxLength={EMAIL_MAX}
          onChange={v => { setEmail(filtrarEmail(v)); setErrEmail(''); }} autoComplete="username" error={errEmail} />
        {/* Sin puntitos de ejemplo: parecían caracteres escritos con el campo vacío (Testeo 13/10, punto 12). */}
        <CampoContrasenaAcceso label="Contraseña" value={password} onChange={v => { setPassword(v); setErrPassword(''); }} autoComplete="current-password" error={errPassword} />

        {/* El backend no responde: es un problema de infraestructura, no de credenciales. */}
        {error === 'sin_conexion' && (
          <AlertaAcceso tono="aviso" icono={WifiOff}>No se pudo contactar al servidor. Revisá tu conexión e intentá de nuevo en unos minutos.</AlertaAcceso>
        )}
        {/* Demasiados intentos fallidos: el servidor bloqueó el acceso un rato. */}
        {error === 'bloqueado' && (
          <AlertaAcceso icono={ShieldAlert}>Demasiados intentos fallidos. Por seguridad, esperá unos minutos antes de volver a intentar.</AlertaAcceso>
        )}
        {error === 'credentials' && <AlertaAcceso>Credenciales incorrectas. Verificá tu correo y tu contraseña.</AlertaAcceso>}
        {error === 'inactive' && (
          <AlertaAcceso icono={UserX} titulo="Cuenta inactiva">
            Tu cuenta se encuentra deshabilitada en el sistema. Contactá al coordinador del DUAR para reactivarla.
          </AlertaAcceso>
        )}

        <BotonAcceso type="submit" cargando={loading}>{loading ? 'Verificando...' : 'Ingresar al sistema'}</BotonAcceso>
        {/* El registro sólo es posible vía QR */}
        <EnlaceAcceso onClick={() => setVista('recuperar')}>¿Olvidaste tu contraseña?</EnlaceAcceso>
      </form>
    </MarcoAcceso>
  );
}
