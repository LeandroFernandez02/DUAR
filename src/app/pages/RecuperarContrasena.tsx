import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Shield, Lock, Eye, EyeOff, AlertCircle,
  CheckCircle, ArrowLeft, XCircle, RefreshCw,
} from 'lucide-react';

// Tokens that simulate an invalid/expired link in the demo
const INVALID_TOKENS = ['token-invalido', 'expired', 'used', 'vencido'];

type FormStep = 'form' | 'success';

function isStrongEnough(pwd: string) {
  return pwd.length >= 8;
}

export default function RecuperarContrasena() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const tokenInvalid = !token || INVALID_TOKENS.includes(token.toLowerCase());

  // --- New password form state ---
  const [step, setStep] = useState<FormStep>('form');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const mismatch = touched && pwdConfirm.length > 0 && pwd !== pwdConfirm;
  const weakPwd = touched && pwd.length > 0 && !isStrongEnough(pwd);
  const canSubmit = pwd.length > 0 && pwdConfirm.length > 0 && pwd === pwdConfirm && isStrongEnough(pwd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setStep('success');
  };

  // ─── Shared layout wrapper ─────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Background decoration */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(229,75,75,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <p
              style={{
                color: 'var(--foreground)',
                fontSize: 'var(--text-h3)',
                fontWeight: 'var(--font-weight-bold)',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              DUAR
            </p>
            <p
              style={{
                color: 'var(--muted-foreground)',
                fontSize: '11px',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              Dirección de Unidades de Alto Riesgo
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--card)',
            boxShadow: 'var(--elevation-md)',
          }}
        >
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, var(--duar-red), var(--duar-salmon))' }}
          />
          <div className="p-8">{children}</div>
          <div
            className="px-8 py-3 flex items-center gap-2"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}
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
    </div>
  );

  // ─── TOKEN INVÁLIDO / VENCIDO ──────────────────────────────────────────────
  if (tokenInvalid) {
    return (
      <Wrapper>
        {/* Error icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
          style={{ background: 'rgba(220,38,38,0.09)' }}
        >
          <XCircle size={28} style={{ color: 'var(--destructive)' }} />
        </div>

        <h2
          className="text-center mb-2"
          style={{
            color: 'var(--foreground)',
            fontSize: 'var(--text-h1)',
            fontWeight: 'var(--font-weight-bold)',
            fontFamily: 'var(--font-family-primary)',
          }}
        >
          Enlace inválido o vencido
        </h2>

        <p
          className="text-center mb-6"
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-family-primary)',
            lineHeight: 1.65,
          }}
        >
          Este enlace de recuperación ya no es válido. Puede que haya expirado (más de 60 minutos) o ya fue utilizado anteriormente.
        </p>

        {/* Reasons list */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}
        >
          <p
            className="mb-3"
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
              letterSpacing: '0.03em',
            }}
          >
            Posibles causas
          </p>
          <div className="flex flex-col gap-2">
            {[
              'El enlace tiene más de 60 minutos de antigüedad',
              'El enlace ya fue utilizado para restablecer la contraseña',
              'El enlace fue copiado de forma incompleta',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: 'var(--destructive)' }}
                />
                <span
                  style={{
                    color: 'var(--muted-foreground)',
                    fontSize: 'var(--text-label)',
                    fontFamily: 'var(--font-family-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg mb-3 transition-opacity"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          <RefreshCw size={15} />
          Solicitar nuevo enlace
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors"
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
          <ArrowLeft size={15} />
          Volver al inicio de sesión
        </button>
      </Wrapper>
    );
  }

  // ─── ÉXITO (contraseña actualizada) ───────────────────────────────────────
  if (step === 'success') {
    return (
      <Wrapper>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
          style={{ background: 'rgba(229,75,75,0.10)' }}
        >
          <CheckCircle size={28} style={{ color: 'var(--primary)' }} />
        </div>

        <h2
          className="text-center mb-2"
          style={{
            color: 'var(--foreground)',
            fontSize: 'var(--text-h1)',
            fontWeight: 'var(--font-weight-bold)',
            fontFamily: 'var(--font-family-primary)',
          }}
        >
          Contraseña actualizada
        </h2>

        <p
          className="text-center mb-7"
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-family-primary)',
            lineHeight: 1.65,
          }}
        >
          Tu contraseña fue restablecida correctamente. Ya podés ingresar al sistema con tus nuevas credenciales.
        </p>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-opacity"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Ir al inicio de sesión
        </button>
      </Wrapper>
    );
  }

  // ─── FORMULARIO NUEVA CONTRASEÑA ──────────────────────────────────────────
  return (
    <Wrapper>
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(229,75,75,0.10)' }}
      >
        <Lock size={22} style={{ color: 'var(--primary)' }} />
      </div>

      <h2
        className="mb-1"
        style={{
          color: 'var(--foreground)',
          fontSize: 'var(--text-h1)',
          fontWeight: 'var(--font-weight-bold)',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        Nueva contraseña
      </h2>
      <p
        className="mb-6"
        style={{
          color: 'var(--muted-foreground)',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-family-primary)',
        }}
      >
        Creá una contraseña nueva para tu cuenta. Debe tener al menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Nueva contraseña */}
        <div>
          <label
            htmlFor="new-pwd"
            style={{
              display: 'block',
              marginBottom: '6px',
              color: 'var(--foreground)',
              fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: weakPwd ? 'var(--destructive)' : 'var(--muted-foreground)' }}
            />
            <input
              id="new-pwd"
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={e => { setPwd(e.target.value); }}
              onBlur={() => setTouched(true)}
              placeholder="Mínimo 8 caracteres"
              className="w-full pl-9 pr-10 py-2.5 rounded-lg border outline-none transition-all"
              style={{
                background: weakPwd ? 'rgba(220,38,38,0.04)' : 'var(--card)',
                border: `1.5px solid ${weakPwd ? 'var(--destructive)' : 'var(--border)'}`,
                color: 'var(--foreground)',
                fontFamily: 'var(--font-family-primary)',
                fontSize: 'var(--text-base)',
                boxShadow: weakPwd ? '0 0 0 3px rgba(220,38,38,0.10)' : 'none',
              }}
              onFocus={e => { if (!weakPwd) e.target.style.borderColor = 'var(--primary)'; }}
              onBlurCapture={e => { if (!weakPwd) e.target.style.borderColor = 'var(--border)'; }}
              aria-invalid={weakPwd}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted-foreground)' }}
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {weakPwd && (
            <div
              className="flex items-center gap-1.5 mt-2"
              style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
              role="alert"
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>La contraseña debe tener al menos 8 caracteres.</span>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label
            htmlFor="confirm-pwd"
            style={{
              display: 'block',
              marginBottom: '6px',
              color: 'var(--foreground)',
              fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: mismatch ? 'var(--destructive)' : 'var(--muted-foreground)' }}
            />
            <input
              id="confirm-pwd"
              type={showConfirm ? 'text' : 'password'}
              value={pwdConfirm}
              onChange={e => { setPwdConfirm(e.target.value); setTouched(true); }}
              placeholder="Repetí tu nueva contraseña"
              className="w-full pl-9 pr-10 py-2.5 rounded-lg border outline-none transition-all"
              style={{
                background: mismatch ? 'rgba(220,38,38,0.04)' : 'var(--card)',
                border: `1.5px solid ${mismatch ? 'var(--destructive)' : 'var(--border)'}`,
                color: 'var(--foreground)',
                fontFamily: 'var(--font-family-primary)',
                fontSize: 'var(--text-base)',
                boxShadow: mismatch ? '0 0 0 3px rgba(220,38,38,0.10)' : 'none',
              }}
              onFocus={e => { if (!mismatch) e.target.style.borderColor = 'var(--primary)'; }}
              onBlurCapture={e => { if (!mismatch) e.target.style.borderColor = 'var(--border)'; }}
              aria-invalid={mismatch}
              aria-describedby={mismatch ? 'confirm-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted-foreground)' }}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Alt path 8.1 — passwords do not match */}
          {mismatch && (
            <div
              id="confirm-error"
              className="flex items-center gap-1.5 mt-2"
              style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
              role="alert"
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>Las contraseñas no coinciden.</span>
            </div>
          )}
        </div>

        {/* Mismatch inline banner (extra visual feedback) */}
        {mismatch && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg"
            style={{
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.20)',
            }}
            role="alert"
          >
            <AlertCircle size={15} style={{ color: 'var(--destructive)', marginTop: '1px', flexShrink: 0 }} />
            <div>
              <p
                style={{
                  color: 'var(--destructive)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                Las contraseñas no coinciden
              </p>
              <p
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)',
                  marginTop: '2px',
                }}
              >
                Asegurate de que ambas contraseñas sean idénticas.
              </p>
            </div>
          </div>
        )}

        {/* Submit — stays disabled while passwords don't match (Alt 8.1) */}
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg mt-1 transition-all"
          style={{
            background: canSubmit && !loading ? 'var(--primary)' : 'var(--muted)',
            color: canSubmit && !loading ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: !canSubmit || loading ? 'not-allowed' : 'pointer',
            border: `1px solid ${!canSubmit ? 'var(--border)' : 'transparent'}`,
          }}
          aria-disabled={!canSubmit}
          title={mismatch ? 'Las contraseñas no coinciden' : !isStrongEnough(pwd) ? 'La contraseña es demasiado corta' : ''}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 inline-block"
                style={{
                  borderColor: 'rgba(68,65,64,0.2)',
                  borderTopColor: 'var(--muted-foreground)',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Guardando...
            </>
          ) : (
            <>
              <Lock size={15} />
              Guardar nueva contraseña
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </button>
      </form>
    </Wrapper>
  );
}
