import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Lock, CheckCircle, ArrowLeft, XCircle, RefreshCw } from 'lucide-react';
import { MarcoAcceso, TituloAcceso, CampoContrasenaAcceso, AlertaAcceso, BotonAcceso, EnlaceAcceso } from '../components/auth/Acceso';
import { authApi, ApiError } from '../services/api';
import { validarPassword, AYUDA_PASSWORD, PASSWORD_MAX } from '../utils/validacionUsuario';

type FormStep = 'form' | 'success';

function isStrongEnough(pwd: string) {
  return validarPassword(pwd) === null;   // misma regla que al crear la cuenta (Testeo 13/10, punto 2)
}

export default function RecuperarContrasena() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  /**
   * CU-03 paso 6.1: la vigencia se chequea contra el BACKEND antes de mostrar
   * el formulario — el aviso de "vencido" debe aparecer al hacer clic en el
   * enlace, no recién al enviar la nueva contraseña.
   */
  const [tokenInvalid, setTokenInvalid] = useState<boolean | null>(null);
  useEffect(() => {
    if (!token) { setTokenInvalid(true); return; }
    let vigente = true;
    authApi.chequearTokenRecuperacion(token)
      .then(() => { if (vigente) setTokenInvalid(false); })
      .catch(() => { if (vigente) setTokenInvalid(true); });
    return () => { vigente = false; };
  }, [token]);

  // --- New password form state ---
  const [step, setStep] = useState<FormStep>('form');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mismatch = touched && pwdConfirm.length > 0 && pwd !== pwdConfirm;
  const weakPwd = touched && pwd.length > 0 && !isStrongEnough(pwd);
  const canSubmit = pwd.length > 0 && pwdConfirm.length > 0 && pwd === pwdConfirm && isStrongEnough(pwd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!canSubmit || !token) return;
    setLoading(true);
    try {
      await authApi.restablecerContrasena(token, pwd);
      setStep('success');
    } catch (err) {
      // El token pudo vencer o usarse justo entre que se chequeó y se envió
      // el formulario (dos pestañas, doble clic): se trata igual que "vencido".
      if (err instanceof ApiError && err.motivo === 'token_invalido') {
        setTokenInvalid(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── VERIFICANDO EL ENLACE CONTRA EL SERVIDOR ──────────────────────────────
  if (tokenInvalid === null) {
    return (
      <MarcoAcceso>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <RefreshCw size={28} style={{ color: 'var(--primary)', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>Verificando el enlace…</p>
        </div>
      </MarcoAcceso>
    );
  }

  // ─── TOKEN INVÁLIDO / VENCIDO ──────────────────────────────────────────────
  if (tokenInvalid) {
    return (
      <MarcoAcceso>
        <TituloAcceso icono={XCircle} colorIcono="var(--destructive)" titulo="Enlace inválido o vencido"
          texto="Este enlace de recuperación ya no es válido. Puede que haya expirado (más de 60 minutos) o ya fue utilizado anteriormente." />
        <AlertaAcceso titulo="Posibles causas">
          <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: 'var(--muted-foreground)' }}>
            <li>El enlace tiene más de 60 minutos de antigüedad</li>
            <li>El enlace ya fue utilizado para restablecer la contraseña</li>
            <li>El enlace fue copiado de forma incompleta</li>
          </ul>
        </AlertaAcceso>
        {/* El pedido de un enlace nuevo se hace desde «¿Olvidó su contraseña?» del inicio de sesión. */}
        <BotonAcceso icono={RefreshCw} onClick={() => navigate('/login')}>Solicitar nuevo enlace</BotonAcceso>
        <BotonAcceso tono="secundario" icono={ArrowLeft} onClick={() => navigate('/login')}>Volver al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  // ─── CONTRASEÑA ACTUALIZADA ────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <MarcoAcceso>
        <TituloAcceso icono={CheckCircle} colorIcono="#16a34a" titulo="Contraseña actualizada"
          texto="Tu contraseña fue restablecida correctamente. Ya podés ingresar al sistema con tus nuevas credenciales." />
        <BotonAcceso onClick={() => navigate('/login')}>Ir al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  // ─── FORMULARIO NUEVA CONTRASEÑA ──────────────────────────────────────────
  return (
    <MarcoAcceso>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TituloAcceso icono={Lock} titulo="Nueva contraseña" texto={`Creá una contraseña nueva para tu cuenta. ${AYUDA_PASSWORD}`} />
        {error && <AlertaAcceso>{error}</AlertaAcceso>}
        <CampoContrasenaAcceso label="Nueva contraseña" icono={Lock} value={pwd} maxLength={PASSWORD_MAX} autoComplete="new-password" autoFocus
          onChange={v => setPwd(v.slice(0, PASSWORD_MAX))} onBlur={() => setTouched(true)}
          error={weakPwd ? validarPassword(pwd) ?? undefined : undefined} />
        <CampoContrasenaAcceso label="Confirmar contraseña" icono={Lock} value={pwdConfirm} maxLength={PASSWORD_MAX} autoComplete="new-password"
          onChange={v => setPwdConfirm(v.slice(0, PASSWORD_MAX))} onBlur={() => setTouched(true)}
          error={mismatch ? 'Las contraseñas no coinciden.' : undefined} />
        <BotonAcceso type="submit" cargando={loading} deshabilitado={!canSubmit}>{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</BotonAcceso>
        <EnlaceAcceso onClick={() => navigate('/login')}>Volver al inicio de sesión</EnlaceAcceso>
      </form>
    </MarcoAcceso>
  );
}
