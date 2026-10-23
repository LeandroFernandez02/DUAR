import { useState } from 'react';
import { Mail, KeyRound, MailCheck, Info } from 'lucide-react';
import { validarEmail, filtrarEmail, EMAIL_MAX } from '../../utils/validacionUsuario';
import { authApi } from '../../services/api';
import { CampoAcceso, AlertaAcceso, BotonAcceso, TituloAcceso } from './Acceso';

/**
 * Recuperar contraseña (CU-03), dentro de la tarjeta de acceso (diseño CALÍVAR, 23/10; antes era
 * una ventana aparte): pedir el correo → «Solicitud enviada». El mensaje es neutro, exista o no
 * ese correo (CU-03 paso 4.1: no se revela qué cuentas existen).
 */
export default function RecuperarContrasena({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Este campo es obligatorio.'); return; }
    if (validarEmail(email) !== null) { setError('El formato del correo electrónico no es válido.'); return; }
    setError('');
    setCargando(true);
    // El backend responde igual exista o no ese email; ni con el servidor caído conviene mostrarlo distinto.
    try { await authApi.solicitarRecuperacion(email); } catch { /* se ve como enviado igual */ } finally {
      setCargando(false);
      setEnviado(true);
    }
  };

  if (enviado) return (
    <>
      <TituloAcceso icono={MailCheck} titulo="Solicitud enviada" />
      <AlertaAcceso tono="info" icono={Info}>Si el correo está registrado, recibirá un enlace pronto.</AlertaAcceso>
      <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
        El enlace expira en <strong style={{ color: 'var(--foreground)' }}>60 minutos</strong>. Revisá también la carpeta de spam. Si no lo recibís, podés volver a intentarlo.
      </p>
      <BotonAcceso onClick={onVolver}>Volver al inicio de sesión</BotonAcceso>
    </>
  );
  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <TituloAcceso icono={KeyRound} titulo="Recuperar contraseña" texto="Ingresá el correo registrado en el sistema y te enviaremos un enlace de recuperación." />
      <CampoAcceso label="Email registrado" icono={Mail} type="email" value={email} maxLength={EMAIL_MAX} autoFocus
        onChange={v => { setEmail(filtrarEmail(v)); setError(''); }} autoComplete="email" placeholder="usuario@duar.cba.gob.ar" error={error} />
      <BotonAcceso type="submit" cargando={cargando}>{cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}</BotonAcceso>
      <BotonAcceso tono="secundario" onClick={onVolver}>Cancelar</BotonAcceso>
    </form>
  );
}
