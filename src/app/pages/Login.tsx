import { useState } from 'react';
import { Navigate } from 'react-router';
import { Mail, UserX, WifiOff, ShieldAlert } from 'lucide-react';
import { filtrarEmail, EMAIL_MAX } from '../utils/validacionUsuario';
import { useApp } from '../context/AppContext';
import { MarcoAcceso, TituloAcceso, CampoAcceso, CampoContrasenaAcceso, AlertaAcceso, BotonAcceso, EnlaceAcceso } from '../components/auth/Acceso';
import RecuperarContrasena from '../components/auth/RecuperarContrasena';

/**
 * Iniciar sesión (CU-01) y Recuperar contraseña (CU-03), con el diseño CALÍVAR (23/10): logo
 * vertical y tarjeta centrada. Los avisos distinguen credenciales incorrectas, cuenta inactiva,
 * demasiados intentos (bloqueo temporal del servidor) y servidor sin respuesta.
 */
export default function Login() {
  const { login, isAuthenticated, usuario } = useApp();
  const [vista, setVista] = useState<'login' | 'recuperar'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    else if (result === 'bloqueado') setError('bloqueado');
    else if (result === 'sin_conexion') setError('sin_conexion');
    else setError('credentials');
  };

  if (vista === 'recuperar') return <MarcoAcceso><RecuperarContrasena onVolver={() => setVista('login')} /></MarcoAcceso>;

  return (
    <MarcoAcceso pie="¿Sos agente? Registrate escaneando el QR del operativo.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TituloAcceso titulo="Iniciar Sesión" texto="Ingresá tus credenciales para acceder al sistema." />
        <CampoAcceso label="Correo electrónico" icono={Mail} type="email" value={email} maxLength={EMAIL_MAX}
          onChange={v => setEmail(filtrarEmail(v))} autoComplete="username" />
        {/* Sin puntitos de ejemplo: parecían caracteres escritos con el campo vacío (Testeo 13/10, punto 12). */}
        <CampoContrasenaAcceso label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />

        {/* El backend no responde: es un problema de infraestructura, no de credenciales. */}
        {error === 'sin_conexion' && (
          <AlertaAcceso tono="aviso" icono={WifiOff}>No se pudo contactar al servidor. Revisá tu conexión e intentá de nuevo en unos minutos.</AlertaAcceso>
        )}
        {/* Demasiados intentos fallidos: el servidor bloqueó el acceso un rato. */}
        {error === 'bloqueado' && (
          <AlertaAcceso icono={ShieldAlert}>Demasiados intentos fallidos. Por seguridad, esperá unos minutos antes de volver a intentar.</AlertaAcceso>
        )}
        {error === 'credentials' && <AlertaAcceso>Credenciales incorrectas. Verificá tu email y contraseña.</AlertaAcceso>}
        {error === 'inactive' && (
          <AlertaAcceso icono={UserX} titulo="Cuenta inactiva">
            Tu cuenta se encuentra deshabilitada en el sistema. Contactá al coordinador del DUAR para reactivarla.
          </AlertaAcceso>
        )}
        {error === 'fields' && <AlertaAcceso>Por favor completá todos los campos.</AlertaAcceso>}

        <BotonAcceso type="submit" cargando={loading}>{loading ? 'Verificando...' : 'Ingresar al sistema'}</BotonAcceso>
        {/* El registro sólo es posible vía QR */}
        <EnlaceAcceso onClick={() => setVista('recuperar')}>¿Olvidó su contraseña?</EnlaceAcceso>
      </form>
    </MarcoAcceso>
  );
}
