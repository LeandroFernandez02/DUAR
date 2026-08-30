import { useState, useRef, useEffect } from 'react';
import { Mail, X, ArrowRight, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { authApi } from '../../services/api';

interface Props {
  onClose: () => void;
}

type Step = 'form' | 'sent';

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function RecuperarContrasenaModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (step === 'form') setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const emailError = touched && email.length > 0 && !isValidEmail(email);
  const emailEmpty = touched && email.trim() === '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!email.trim() || !isValidEmail(email)) return;
    setLoading(true);
    // CU-03 paso 4.1: el backend responde igual exista o no ese email — nunca
    // hay un caso de error real acá salvo que el servidor esté caído, y ni
    // siquiera entonces conviene revelarlo distinto (se ve como "enviado" igual).
    try {
      await authApi.solicitarRecuperacion(email);
    } finally {
      setLoading(false);
      setStep('sent');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(68, 65, 64, 0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Recuperar contraseña"
    >
      <div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: 'var(--elevation-md)',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        {/* Header stripe */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, var(--duar-red), var(--duar-salmon))' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        <div className="p-7">
          {step === 'form' && (
            <>
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(229,75,75,0.10)' }}
              >
                <Mail size={22} style={{ color: 'var(--primary)' }} />
              </div>

              {/* Heading */}
              <h2
                className="mb-1"
                style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-h1)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                Recuperar contraseña
              </h2>
              <p
                className="mb-6"
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                Ingresá el correo registrado en el sistema y te enviaremos un enlace de recuperación.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Email field */}
                <div>
                  <label
                    htmlFor="recover-email"
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      color: 'var(--foreground)',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                    }}
                  >
                    Email registrado
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        color: emailError || emailEmpty
                          ? 'var(--destructive)'
                          : 'var(--muted-foreground)',
                      }}
                    />
                    <input
                      id="recover-email"
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setTouched(false); }}
                      onBlur={() => setTouched(true)}
                      placeholder="usuario@duar.cba.gob.ar"
                      autoComplete="email"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border outline-none transition-all"
                      style={{
                        background: emailError || emailEmpty
                          ? 'rgba(220,38,38,0.04)'
                          : 'var(--card)',
                        border: `1.5px solid ${emailError || emailEmpty ? 'var(--destructive)' : 'var(--border)'}`,
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 'var(--text-base)',
                        boxShadow: emailError || emailEmpty
                          ? '0 0 0 3px rgba(220,38,38,0.10)'
                          : 'none',
                      }}
                      onFocus={e => {
                        if (!emailError && !emailEmpty)
                          e.target.style.borderColor = 'var(--primary)';
                      }}
                      onBlurCapture={e => {
                        if (!emailError && !emailEmpty)
                          e.target.style.borderColor = 'var(--border)';
                      }}
                      aria-invalid={emailError || emailEmpty}
                      aria-describedby={emailError ? 'email-error' : undefined}
                    />
                  </div>

                  {/* Alt path 3.1 — invalid format */}
                  {emailError && (
                    <div
                      id="email-error"
                      className="flex items-center gap-1.5 mt-2"
                      style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
                      role="alert"
                    >
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>El formato del correo electrónico no es válido.</span>
                    </div>
                  )}
                  {emailEmpty && (
                    <div
                      className="flex items-center gap-1.5 mt-2"
                      style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
                      role="alert"
                    >
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>Este campo es obligatorio.</span>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-opacity mt-1"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                        style={{ animation: 'spin 0.7s linear infinite' }}
                      />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar enlace de recuperación
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Back to login */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg transition-colors"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
                >
                  Cancelar
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <>
              {/* Success icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(229,75,75,0.10)' }}
              >
                <CheckCircle size={28} style={{ color: 'var(--primary)' }} />
              </div>

              <h2
                className="mb-3"
                style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-h1)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                Solicitud enviada
              </h2>

              {/* Security-neutral message — always the same regardless of whether
                  the email exists in the system (prevents user enumeration). */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  background: 'rgba(229,75,75,0.07)',
                  border: '1px solid rgba(229,75,75,0.18)',
                }}
              >
                <p
                  style={{
                    color: 'var(--foreground)',
                    fontSize: 'var(--text-base)',
                    fontFamily: 'var(--font-family-primary)',
                    lineHeight: 1.65,
                  }}
                >
                  Si el correo está registrado, recibirá un enlace pronto.
                </p>
              </div>

              <p
                className="mb-6"
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)',
                  lineHeight: 1.6,
                }}
              >
                El enlace expira en <strong style={{ color: 'var(--foreground)' }}>60 minutos</strong>. Revisá también la carpeta de spam. Si no lo recibís, podés volver a intentarlo.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-lg transition-opacity"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Volver al inicio de sesión
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-7 py-3 flex items-center gap-2"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--muted)',
          }}
        >
          <Shield size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <span
            style={{
              color: 'var(--muted-foreground)',
              fontSize: '11px',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            DUAR Córdoba · Acceso seguro
          </span>
        </div>
      </div>
    </div>
  );
}
