import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Shield, Eye, EyeOff, CheckCircle, X, Lock, Mail, AlertTriangle,
  ArrowRightLeft, MailCheck, ExternalLink, RefreshCw, Clock,
  QrCode, UserPlus, LogIn, AlertCircle, FlagOff, UserX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RecuperarContrasenaModal } from '../components/auth/RecuperarContrasenaModal';
import { catInstituciones, catEspecialidades, catAlergias, dotacionesDe } from '../data/mockData';
import { qrApi, registroApi, authApi, setToken, ApiError, OperativoQRApi } from '../services/api';
import {
  validarNombre, validarApellido, validarDni, validarTelefono,
  soloDigitos, formatearDni, formatearTelefono,
} from '../utils/validacionUsuario';

/* ── Tipos ────────────────────────────────────────────────── */
type Modo = 'inicial' | 'login' | 'registro' | 'confirmar' | 'verificarEmail' | 'confirmacion';

/* ── Componente ───────────────────────────────────────────── */
export default function Registro() {
  const { operativoId } = useParams<{ operativoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useApp();

  /* ── Core state ── */
  const [modo, setModo] = useState<Modo>('inicial');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Flujo post-auth ── */
  const [pendingUserId, setPendingUserId] = useState('');
  /** Operativo que hoy ocupa al agente, para nombrarlo en el modal de Ubicuidad. */
  const [operativoConflicto, setOperativoConflicto] =
    useState<{ id: string; nombre: string; ubicacion: string } | null>(null);

  /**
   * showConflictoModal: true cuando se detecta conflicto de operativo.
   * Es un MODAL overlay independiente del modo actual.
   */
  const [showConflictoModal, setShowConflictoModal] = useState(false);
  const [showRecover, setShowRecover] = useState(false);

  /* ── Formularios ── */
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    dni: '', nombre: '', apellido: '', email: '', password: '',
    fechaNacimiento: '', telefono: '', institucionId: '', dotacionId: '',
    especialidadId: '',
    alergiaIds: [] as string[],
    grupo_sanguineo: '',
  });
  /** dni y telefono en regForm siempre quedan en dígitos puros — lo que
   *  viaja al backend. El formateo (45.080.924 / 351-228-3143) es sólo
   *  visual, se calcula al renderizar el input. */
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});

  /* ── Email confirmation (nuevo usuario) ── */
  const [nuevoUserEmail, setNuevoUserEmail] = useState('');
  const [nuevoUserNombre, setNuevoUserNombre] = useState('');
  const [urlConfirmacionDev, setUrlConfirmacionDev] = useState('');

  /* ── Reenvío de confirmación: cooldown de 2 min compartido con el backend ── */
  const [cooldownReenvio, setCooldownReenvio] = useState(0);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCooldownReenvio(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const formatCooldown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ── Token QR ──
   * El token se valida contra el BACKEND, no contra localStorage. Es la
   * corrección de fondo del flujo: el agente escanea con su propio celular, así
   * que el código sólo puede verificarse contra la base, que es lo único que
   * ambos dispositivos comparten (CU-15 pasos 4-5).
   */
  const qrToken = searchParams.get('qr');
  const [accesoQR, setAccesoQR] = useState<OperativoQRApi | null>(null);
  const [cargandoQR, setCargandoQR] = useState(true);

  useEffect(() => {
    if (!qrToken) { setCargandoQR(false); return; }
    let vigente = true;
    qrApi.validar(qrToken)
      .then(({ operativo: op }) => { if (vigente) setAccesoQR(op); })
      .catch(() => { if (vigente) setAccesoQR(null); })
      .finally(() => { if (vigente) setCargandoQR(false); });
    return () => { vigente = false; };
  }, [qrToken]);

  /**
   * Se adapta la respuesta de la API a los nombres que ya usa esta pantalla,
   * para no tocar la maqueta entera: `titulo`→`nombre`, `localidad`→`ubicacion`.
   */
  const operativo = accesoQR && {
    id: accesoQR.id,
    nombre: accesoQR.titulo,
    ubicacion: accesoQR.localidad,
    estado: accesoQR.estado.toLowerCase(),
  };
  const isValidQR = Boolean(accesoQR);

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: verificando el QR contra el servidor             */
  /* ────────────────────────────────────────────────────────── */
  if (cargandoQR) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
        style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
      >
        <RefreshCw size={30} style={{ color: 'var(--primary)', animation: 'spin 0.9s linear infinite' }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
          Verificando el código de acceso…
        </p>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: Operativo no encontrado                          */
  /* ────────────────────────────────────────────────────────── */
  if (!operativo) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
      >
        <div
          className="w-full max-w-sm rounded-[var(--radius-card)] overflow-hidden"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)' }}
        >
          <div style={{ height: 4, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
              <X size={30} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', marginBottom: 6 }}>
                Operativo no encontrado
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                El código QR no corresponde a ningún operativo activo en el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: QR inválido / expirado                           */
  /* ────────────────────────────────────────────────────────── */
  if (!isValidQR) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
      >
        <div
          className="w-full max-w-sm rounded-[var(--radius-card)] overflow-hidden"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)' }}
        >
          {/* Top accent bar */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />

          <div className="flex flex-col items-center gap-4 p-8 text-center">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(229,75,75,0.1)' }}
            >
              <QrCode size={30} style={{ color: 'var(--primary)' }} />
            </div>

            {/* Title */}
            <div>
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-bold)', marginBottom: 6,
              }}>
                QR expirado
              </p>
              <p style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6,
              }}>
                Este código QR ya no es válido. Los QR de acceso se renuevan automáticamente
                cada <strong style={{ color: 'var(--foreground)' }}>1 hora</strong> por seguridad.
              </p>
            </div>

            {/* Info box */}
            <div
              className="w-full flex items-start gap-3 p-3 rounded-[var(--radius-input)] text-left"
              style={{ background: 'rgba(229,75,75,0.06)', border: '1px solid rgba(229,75,75,0.18)' }}
            >
              <Clock size={14} style={{ color: 'var(--primary)', marginTop: 1, flexShrink: 0 }} />
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.55 }}>
                Solicitá al coordinador del operativo que genere un nuevo código QR
                usando el botón <strong style={{ color: 'var(--foreground)' }}>"Refrescar QR"</strong> y vuelva a compartirlo.
              </p>
            </div>

            {/* Operativo name */}
            <div
              className="w-full px-4 py-2.5 rounded-[var(--radius-input)]"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginBottom: 2 }}>Operativo</p>
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
              }}>
                {operativo.nombre}
              </p>
            </div>

            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', opacity: 0.6 }}>
              DUAR · Búsqueda y Rastreo
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: Operativo finalizado                              */
  /* ────────────────────────────────────────────────────────── */
  if (operativo.estado === 'finalizado') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
      >
        <div
          className="w-full max-w-sm rounded-[var(--radius-card)] overflow-hidden"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)' }}
        >
          <div style={{ height: 4, background: 'linear-gradient(90deg, #92400e, #b45309)' }} />
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(180,83,9,0.1)' }}
            >
              <FlagOff size={30} style={{ color: '#b45309' }} />
            </div>
            <div>
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', marginBottom: 6 }}>
                Operativo finalizado
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                Este operativo ya fue cerrado. El código QR no permite nuevos accesos ni registros.
              </p>
            </div>
            <div
              className="w-full px-4 py-2.5 rounded-[var(--radius-input)]"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginBottom: 2 }}>Operativo</p>
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                {operativo.nombre}
              </p>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', opacity: 0.6 }}>
              DUAR · Búsqueda y Rastreo
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Lógica de negocio                                          */
  /* ────────────────────────────────────────────────────────── */

  /**
   * Intenta el alta en el operativo (CU-15 pasos 6-8).
   *
   * La Regla de Ubicuidad la evalúa el BACKEND, no esta pantalla: es él quien
   * conoce todos los operativos y quien tiene el índice que la hace cumplir. Si
   * el agente ya está en otro, responde 409 con `regla_ubicuidad` y acá sólo se
   * abre el modal para que decida. La decisión es del agente (paso 6.2).
   */
  const intentarAlta = async (abandonarAnterior = false) => {
    if (!qrToken || !operativoId) return;
    setLoading(true);
    setError('');
    try {
      await registroApi.altaEnOperativo(operativoId, qrToken, abandonarAnterior);
      setShowConflictoModal(false);
      // Siempre a la confirmación final: el paso intermedio de "revisá tu correo"
      // queda para cuando haya SMTP (CU-02 paso 7, hoy fuera de alcance).
      setModo('confirmacion');
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'regla_ubicuidad') {
        const actual = err.datos.operativoActual as
          { id: string; titulo: string; localidad: string } | undefined;
        setOperativoConflicto(actual
          ? { id: actual.id, nombre: actual.titulo, ubicacion: actual.localidad }
          : null);
        setShowConflictoModal(true);
      } else if (err instanceof ApiError && err.motivo === 'ya_en_este_operativo') {
        navigate('/agente');                // ya estaba dado de alta: directo al panel, no es un registro nuevo
      } else if (err instanceof ApiError && err.motivo === 'email_no_confirmado') {
        setModo('verificarEmail');
        setError('Todavía no confirmaste tu correo. Revisá tu casilla y volvé a intentar.');
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo completar el alta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!loginForm.email || !loginForm.password) {
      setError('campos');
      return;
    }
    setLoading(true);
    const result = await login(loginForm.email, loginForm.password);
    setLoading(false);

    if (result === 'ok') {
      setPendingUserId('sesion');           // ya hay sesión; el alta usa el token

      // Si ya está dado de alta en ESTE operativo (volvió a escanear el
      // mismo QR para iniciar sesión, no para unirse de nuevo), directo al
      // panel — mostrarle la pantalla de "confirmá tu participación" da la
      // sensación de que se está registrando de vuelta cuando no es así.
      try {
        const { operativo: actual } = await authApi.miOperativoActual();
        if (actual && actual.id === operativoId) {
          navigate('/agente');
          return;
        }
      } catch {
        // Si la consulta falla, seguimos al flujo normal de confirmación.
      }

      setModo('confirmar');                 // CU-02 paso 6: confirma antes del alta
      return;
    }
    // El backend distingue credenciales de cuenta suspendida (CU-01 paso 4.2).
    setError(result === 'inactive' ? 'inactivo' : result === 'sin_conexion' ? 'conexion' : 'credentials');
  };

  const handleRegistro = async () => {
    setError('');
    if (!regForm.dni || !regForm.nombre || !regForm.apellido || !regForm.email || !regForm.password) {
      setError('Completá todos los campos obligatorios (*).');
      return;
    }
    if (regForm.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!qrToken) { setError('Falta el código del QR.'); return; }

    const errores: Record<string, string> = {};
    const errNombre = validarNombre(regForm.nombre); if (errNombre) errores.nombre = errNombre;
    const errApellido = validarApellido(regForm.apellido); if (errApellido) errores.apellido = errApellido;
    const errDni = validarDni(regForm.dni); if (errDni) errores.dni = errDni;
    const errTelefono = validarTelefono(regForm.telefono); if (errTelefono) errores.telefono = errTelefono;
    setErroresCampos(errores);
    if (Object.keys(errores).length > 0) {
      setError('Revisá los campos marcados en rojo.');
      return;
    }

    setLoading(true);
    try {
      // CU-02 paso 5: el registro se persiste en PostgreSQL y queda auditado.
      // El backend devuelve sesión abierta para poder encadenar el alta sin
      // volver a pedir la contraseña recién elegida.
      const { token } = await registroApi.registrar({
        qrToken,
        dni: regForm.dni,
        nombre: regForm.nombre,
        apellido: regForm.apellido,
        email: regForm.email,
        password: regForm.password,
        telefono: regForm.telefono || undefined,
        fechaNacimiento: regForm.fechaNacimiento || undefined,
        institucionId: regForm.institucionId || undefined,
        dotacionId: regForm.dotacionId || undefined,
        especialidadId: regForm.especialidadId || undefined,
        grupoSanguineo: regForm.grupo_sanguineo || undefined,
        alergiaIds: regForm.alergiaIds,
      });
      setToken(token);
      setNuevoUserEmail(regForm.email);
      setNuevoUserNombre(regForm.nombre);
      setPendingUserId('sesion');
      // CU-02 paso 7: el alta en el operativo (paso 6) queda bloqueada por el
      // backend hasta que confirme el correo — primero pasa por acá, recién
      // después puede ofrecérsele darse de alta. Ya se disparó un envío en
      // este mismo request, así que el reenvío arranca en cooldown.
      setModo('verificarEmail');
      setCooldownReenvio(120);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  /** CU-02 paso 7 / CU-15 paso 8 — "Confirmar Ingreso". */
  const handleConfirmar = () => { void intentarAlta(false); };

  /** Reenvía el correo de confirmación (self-service, con cooldown de 2 min). */
  const handleReenviarCorreo = async () => {
    setReenviando(true);
    setError('');
    try {
      await authApi.reenviarConfirmacion();
      setCooldownReenvio(120);
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'cooldown') {
        const segundos = typeof err.datos.segundos === 'number' ? err.datos.segundos : 0;
        setCooldownReenvio(segundos);
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo reenviar el correo.');
    } finally {
      setReenviando(false);
    }
  };

  /** CU-15 paso 6.2 — el agente acepta abandonar el operativo anterior. */
  const handleDarmeDeAlta = () => { void intentarAlta(true); };

  /* ────────────────────────────────────────────────────────── */
  /* Helpers de estilos                                         */
  /* ────────────────────────────────────────────────────────── */
  const inputCls = 'w-full px-3 py-3 rounded-xl border outline-none transition-all';
  const inputStyle = {
    background: '#fff',
    border: '1.5px solid var(--border)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)',
    fontSize: 'var(--text-base)',
  };

  /* ────────────────────────────────────────────────────────── */
  /* Render                                                     */
  /* ────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}
    >
      <div className="w-full max-w-[420px] px-4 py-6">

        {/* ── DUAR Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              DUAR · Acceso de Agente
            </p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
              Sistema de Búsqueda y Rastreo
            </p>
          </div>
        </div>

        {/* ── Operativo info card ── */}
        <div
          className="p-4 rounded-[var(--radius-card)] mb-6"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', borderLeft: '3px solid var(--primary)' }}
        >
          <p className="mb-1 uppercase" style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Operativo
          </p>
          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
            {operativo.nombre}
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
            {operativo.ubicacion}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: INICIAL                                          */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'inicial' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="mb-1"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                ¿Cómo querés continuar?
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                Para unirte al operativo, ingresá con tu cuenta o registrate como usuario nuevo.
              </p>
            </div>

            <button
              onClick={() => { setError(''); setModo('login'); }}
              className="w-full py-4 rounded-[var(--radius-card)] text-white flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              <LogIn size={20} />
              Ya tengo cuenta — Iniciar sesión
            </button>

            <button
              onClick={() => { setError(''); setModo('registro'); }}
              className="w-full py-4 rounded-[var(--radius-card)] border-2 flex items-center justify-center gap-3 transition-all hover:opacity-80"
              style={{
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                background: 'transparent',
                fontSize: 'var(--text-h3)',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              <UserPlus size={20} />
              Soy nuevo — Registrarme
            </button>

            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', textAlign: 'center', marginTop: 4 }}>
              El acceso a este operativo es exclusivo por código QR.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: LOGIN                                            */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'login' && (
          <div>
            <h2
              className="mb-1"
              style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
            >
              Iniciar Sesión
            </h2>
            <p className="mb-6" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Ingresá con tu correo y contraseña para unirte al operativo.
            </p>

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  className={`${inputCls} pl-10`}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  className={`${inputCls} pl-10 pr-10`}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Error: campos vacíos */}
              {error === 'campos' && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}
                >
                  <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>Completá todos los campos.</span>
                </div>
              )}

              {/* Error: credenciales incorrectas */}
              {error === 'credentials' && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}
                >
                  <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>Credenciales incorrectas. Verificá tu email y contraseña.</span>
                </div>
              )}

              {/* Error: cuenta inactiva */}
              {error === 'inactivo' && (
                <div
                  className="flex flex-col gap-1.5 p-3.5 rounded-xl"
                  style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.3)', fontFamily: 'var(--font-family-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <UserX size={15} style={{ color: '#b45309', flexShrink: 0 }} />
                    <span style={{ color: '#b45309', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)' }}>
                      Cuenta inactiva
                    </span>
                  </div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', paddingLeft: '23px', lineHeight: 1.5 }}>
                    Tu cuenta se encuentra deshabilitada. Contactá al coordinador del DUAR para reactivarla.
                  </p>
                </div>
              )}

              {/* Error: cuenta eliminada */}
              {error === 'eliminado' && (
                <div
                  className="flex flex-col gap-1.5 p-3.5 rounded-xl"
                  style={{ background: '#fee2e2', border: '1px solid #fecaca', fontFamily: 'var(--font-family-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <UserX size={15} style={{ color: '#b91c1c', flexShrink: 0 }} />
                    <span style={{ color: '#b91c1c', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)' }}>
                      Cuenta eliminada
                    </span>
                  </div>
                  <p style={{ color: '#b91c1c', fontSize: 'var(--text-label)', paddingLeft: '23px', lineHeight: 1.5, opacity: 0.85 }}>
                    Esta cuenta ha sido dada de baja del sistema. Contactá al coordinador del DUAR para más información.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-4 rounded-[var(--radius-card)] text-white transition-opacity"
                style={{
                  background: 'var(--primary)',
                  opacity: loading ? 0.7 : 1,
                  fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {loading ? 'Verificando...' : 'Ingresar al operativo'}
              </button>

              {/* ── Recuperar contraseña ── */}
              <div
                className="flex items-center justify-center gap-1.5 p-3.5 rounded-[var(--radius-input)]"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                  ¿Olvidó su contraseña?
                </span>
                <button
                  onClick={() => setShowRecover(true)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Recuperar contraseña
                </button>
              </div>

              <button
                onClick={() => { setError(''); setModo('inicial'); }}
                className="text-center"
                style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}
              >
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: REGISTRO                                         */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'registro' && (
          <div>
            <h2
              className="mb-1"
              style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
            >
              Crear Cuenta
            </h2>
            <p className="mb-5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Completá tus datos. Los campos marcados con <span style={{ color: 'var(--primary)' }}>*</span> son obligatorios.
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  label: 'DNI *', key: 'dni', type: 'text', placeholder: 'Ej: 45.080.924',
                  inputMode: 'numeric' as const,
                  filtro: (v: string) => soloDigitos(v).slice(0, 8),
                  formato: formatearDni,
                },
                {
                  label: 'Nombre *', key: 'nombre', type: 'text', placeholder: 'Tu nombre',
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35),
                },
                {
                  label: 'Apellido *', key: 'apellido', type: 'text', placeholder: 'Tu apellido',
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35),
                },
                { label: 'Correo electrónico *', key: 'email', type: 'email', placeholder: 'tu@email.com' },
                { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres' },
                { label: 'Fecha de Nacimiento', key: 'fechaNacimiento', type: 'date', placeholder: '' },
                {
                  label: 'Teléfono', key: 'telefono', type: 'tel', placeholder: 'Ej: 351-228-3143',
                  inputMode: 'numeric' as const,
                  filtro: (v: string) => soloDigitos(v).slice(0, 10),
                  formato: formatearTelefono,
                },
              ].map(f => {
                const raw = (regForm as any)[f.key] as string;
                const valorMostrado = f.formato ? f.formato(raw) : raw;
                return (
                  <div key={f.key}>
                    <label
                      className="block mb-1"
                      style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      inputMode={f.inputMode}
                      placeholder={f.placeholder}
                      value={valorMostrado}
                      onChange={e => {
                        const v = f.filtro ? f.filtro(e.target.value) : e.target.value;
                        setRegForm({ ...regForm, [f.key]: v });
                        if (erroresCampos[f.key]) setErroresCampos({ ...erroresCampos, [f.key]: '' });
                      }}
                      className={inputCls}
                      style={{ ...inputStyle, border: erroresCampos[f.key] ? '1.5px solid #dc2626' : inputStyle.border }}
                      onFocus={e => (e.target.style.borderColor = erroresCampos[f.key] ? '#dc2626' : 'var(--primary)')}
                      onBlur={e => (e.target.style.borderColor = erroresCampos[f.key] ? '#dc2626' : 'var(--border)')}
                    />
                    {erroresCampos[f.key] && (
                      <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{erroresCampos[f.key]}</p>
                    )}
                  </div>
                );
              })}

              {/* ── Institución ── */}
              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Institución *
                </label>
                <select
                  value={regForm.institucionId}
                  // Cambiar de institución limpia la dotación: una base del DUAR
                  // no puede quedar colgada de otra fuerza (la BD lo rechaza).
                  onChange={e => setRegForm({ ...regForm, institucionId: e.target.value, dotacionId: '' })}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">— Seleccioná tu institución —</option>
                  {catInstituciones.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
              </div>

              {/* ── Dotación: aparece sólo si la institución tiene destacamentos ── */}
              {dotacionesDe(regForm.institucionId).length > 0 && (
                <div>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Dotación *
                  </label>
                  <select
                    value={regForm.dotacionId}
                    onChange={e => setRegForm({ ...regForm, dotacionId: e.target.value })}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">— Seleccioná tu dotación —</option>
                    {dotacionesDe(regForm.institucionId).map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Especialidad
                </label>
                <select
                  value={regForm.especialidadId}
                  onChange={e => setRegForm({ ...regForm, especialidadId: e.target.value })}
                  className={inputCls}
                  style={inputStyle}
                >
                  {/* Se envía el id del catálogo, no el slug: es lo que espera la
                      API y de lo que el backend deriva si el agente camina el
                      polígono o es un recurso crítico que se queda en Punto Cero. */}
                  <option value="">— Seleccioná tu especialidad —</option>
                  {catEspecialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Grupo Sanguíneo
                </label>
                <select
                  value={regForm.grupo_sanguineo}
                  onChange={e => setRegForm({ ...regForm, grupo_sanguineo: e.target.value })}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">— No especificado —</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Alergias {regForm.alergiaIds.length > 0 && `(${regForm.alergiaIds.length})`}
                </label>
                {/* Relación N:M real contra cat_alergias: un agente puede tener
                    más de una, y en campo este dato puede ser crítico. */}
                <div
                  className="grid grid-cols-1 gap-2 p-3 rounded-xl"
                  style={{ background: '#fff', border: '1.5px solid var(--border)' }}
                >
                  {catAlergias.map(a => (
                    <label
                      key={a.id}
                      className="flex items-center gap-2.5 cursor-pointer"
                      style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)' }}
                    >
                      <input
                        type="checkbox"
                        checked={regForm.alergiaIds.includes(a.id)}
                        onChange={e => setRegForm({
                          ...regForm,
                          alergiaIds: e.target.checked
                            ? [...regForm.alergiaIds, a.id]
                            : regForm.alergiaIds.filter(id => id !== a.id),
                        })}
                      />
                      {a.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
                >
                  <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleRegistro}
                disabled={loading}
                className="w-full py-4 rounded-[var(--radius-card)] text-white mt-2 transition-opacity"
                style={{ background: 'var(--primary)', opacity: loading ? 0.7 : 1, fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                {loading ? 'Registrando...' : 'Registrarme y unirme al operativo'}
              </button>

              {/* Link a login */}
              <div className="flex items-center justify-center gap-1.5">
                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                  ¿Ya tenés cuenta?
                </span>
                <button
                  onClick={() => { setError(''); setModo('login'); }}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Iniciá sesión aquí
                </button>
              </div>

              <button
                onClick={() => { setError(''); setModo('inicial'); }}
                className="text-center"
                style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}
              >
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: CONFIRMAR participación                          */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'confirmar' && (
          <div className="flex flex-col gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(229,75,75,0.1)' }}
            >
              <Shield size={28} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Confirmá tu participación
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                Estás a punto de unirte al siguiente operativo:
              </p>
            </div>
            <div
              className="p-4 rounded-[var(--radius-card)]"
              style={{ background: 'rgba(229,75,75,0.06)', border: '1.5px solid rgba(229,75,75,0.25)' }}
            >
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                {operativo.nombre}
              </p>
              <p className="mt-1" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                {operativo.ubicacion}
              </p>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Al confirmar, quedarás registrado con estado <strong style={{ color: 'var(--foreground)' }}>Disponible</strong> y el coordinador podrá verte asignado al operativo.
            </p>
            <button
              onClick={handleConfirmar}
              className="w-full py-4 rounded-[var(--radius-card)] text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              Confirmar participación
            </button>
            <button
              onClick={() => setModo('inicial')}
              className="w-full py-3 rounded-[var(--radius-card)] border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'transparent', fontSize: 'var(--text-base)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: VERIFICAR EMAIL (solo nuevos usuarios)           */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'verificarEmail' && (
          <div className="flex flex-col gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              <MailCheck size={32} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}
              >
                Confirmá tu cuenta para continuar
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                Te enviamos un correo a la casilla de abajo. Hacé clic en el link para confirmar tu cuenta —
                recién ahí vas a poder unirte a <strong style={{ color: 'var(--foreground)' }}>{operativo.nombre}</strong>.
              </p>
            </div>

            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              <Mail size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', wordBreak: 'break-all' }}>
                {nuevoUserEmail}
              </span>
            </div>

            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                Todavía no quedaste unido al operativo. Confirmá el correo y volvé a esta pantalla.
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
              >
                <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Link de confirmación en desarrollo */}
            {urlConfirmacionDev && (
              <div
                className="p-3 rounded-xl flex flex-col gap-2"
                style={{ background: '#f0fdf4', border: '1px solid #86efac' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p style={{ color: '#15803d', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Modo desarrollo — link de confirmación
                  </p>
                </div>
                <a
                  href={urlConfirmacionDev}
                  className="flex items-center gap-1.5 break-all"
                  style={{ color: '#15803d', fontSize: '12px', lineHeight: 1.5 }}
                >
                  <ExternalLink size={11} style={{ flexShrink: 0 }} />
                  {urlConfirmacionDev}
                </a>
              </div>
            )}

            <button
              onClick={handleConfirmar}
              disabled={loading}
              className="w-full py-4 rounded-[var(--radius-card)] text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', opacity: loading ? 0.7 : 1, fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              {loading ? 'Verificando...' : 'Ya confirmé mi correo — continuar'}
            </button>

            <button
              onClick={handleReenviarCorreo}
              disabled={cooldownReenvio > 0 || reenviando}
              className="w-full py-3 rounded-[var(--radius-card)] border transition-colors"
              style={{
                borderColor: 'var(--border)',
                color: cooldownReenvio > 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
                background: 'transparent',
                fontSize: 'var(--text-base)',
                cursor: cooldownReenvio > 0 || reenviando ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              {reenviando
                ? 'Reenviando...'
                : cooldownReenvio > 0
                  ? `Reenviar correo (${formatCooldown(cooldownReenvio)})`
                  : 'Reenviar correo'}
            </button>

            <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', textAlign: 'center', lineHeight: 1.5 }}>
              Si después de un par de intentos no te llegó, contactá a un coordinador del DUAR.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MODO: CONFIRMACIÓN FINAL                               */}
        {/* ══════════════════════════════════════════════════════ */}
        {modo === 'confirmacion' && (
          <div className="flex flex-col items-center text-center gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7' }}
            >
              <CheckCircle size={40} color="#16a34a" />
            </div>
            <div>
              <h2
                className="mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}
              >
                ¡Te uniste al operativo!
              </h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                Ya estás registrado en:
              </p>
              <p className="mt-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                {operativo.nombre}
              </p>
            </div>

            {/* Estado asignado */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }} />
              <span style={{ color: '#0d9488', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                Estado: Disponible
              </span>
            </div>

            <div
              className="w-full p-4 rounded-[var(--radius-card)] text-left"
              style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
            >
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                El coordinador del operativo podrá verte en el sistema. Presentate al Puesto de Comando para recibir instrucciones.
              </p>
            </div>
            <button
              onClick={() => navigate('/agente')}
              className="w-full py-4 rounded-[var(--radius-card)] text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              Ir a mi panel
            </button>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL DE CONFLICTO DE OPERATIVO — CU-14, Paso 5.1 / 6
          Overlay independiente del modo actual.
          Texto exacto requerido por el caso de uso.
         ══════════════════════════════════════════════════════════ */}
      {showConflictoModal && operativoConflicto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConflictoModal(false)}
        >
          <div
            className="w-full rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] overflow-hidden flex flex-col"
            style={{
              maxWidth: 440,
              background: 'var(--card)',
              boxShadow: 'var(--elevation-md)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Accent bar ── */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }} />

            {/* ── Header ── */}
            <div
              className="flex items-start justify-between px-5 pt-5 pb-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(217,119,6,0.12)' }}
                >
                  <AlertTriangle size={20} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <p style={{
                    color: 'var(--foreground)', fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)',
                    marginBottom: 2,
                  }}>
                    Conflicto de operativo
                  </p>
                  <p style={{
                    color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                    fontFamily: 'var(--font-family-primary)',
                  }}>
                    Se detectó actividad en otro operativo activo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConflictoModal(false)}
                className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Cuerpo: texto exacto del CU-14, Paso 5.1 ── */}
            <div className="px-5 py-5 flex flex-col gap-4">
              <p style={{
                color: 'var(--foreground)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-family-primary)',
                lineHeight: 1.65,
              }}>
                Ya te encontrás activo en un operativo,{' '}
                <span style={{ color: 'var(--muted-foreground)' }}>¿Deseás abandonar el operativo</span>{' '}
                <strong style={{ color: '#d97706' }}>{operativoConflicto.nombre}</strong>{' '}
                <span style={{ color: 'var(--muted-foreground)' }}>y darte de alta en el operativo</span>{' '}
                <strong style={{ color: 'var(--primary)' }}>{operativo.nombre}</strong>?
              </p>

              {/* ── Visualización de transferencia ── */}
              <div className="flex flex-col gap-2">
                {/* Operativo anterior */}
                <div
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-input)]"
                  style={{ background: 'rgba(217,119,6,0.07)', border: '1.5px solid rgba(217,119,6,0.25)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(217,119,6,0.12)' }}
                  >
                    <AlertTriangle size={14} style={{ color: '#d97706' }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '10px', color: '#d97706', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Operativo actual
                    </p>
                    <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {operativoConflicto.nombre}
                    </p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                      {operativoConflicto.ubicacion}
                    </p>
                  </div>
                </div>

                {/* Flecha */}
                <div className="flex items-center justify-center gap-2 py-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  <ArrowRightLeft size={14} />
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Cambiar a</span>
                </div>

                {/* Operativo nuevo */}
                <div
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-input)]"
                  style={{ background: 'rgba(229,75,75,0.06)', border: '1.5px solid rgba(229,75,75,0.25)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(229,75,75,0.1)' }}
                  >
                    <Shield size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Nuevo operativo (QR)
                    </p>
                    <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {operativo.nombre}
                    </p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                      {operativo.ubicacion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advertencia */}
              <div
                className="flex items-start gap-2.5 p-3 rounded-[var(--radius-input)]"
                style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}
              >
                <AlertCircle size={13} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', lineHeight: 1.55 }}>
                  Serás desvinculado del operativo anterior automáticamente y tu estado quedará como <strong style={{ color: 'var(--foreground)' }}>Disponible</strong> en el nuevo operativo.
                </p>
              </div>
            </div>

            {/* ── Footer: botones CU-14 ── */}
            <div
              className="flex flex-col gap-2.5 px-5 pb-5"
            >
              {/* Botón principal: "Darme de alta" — CU-14, Paso 6 */}
              <button
                onClick={handleDarmeDeAlta}
                className="w-full py-3.5 rounded-[var(--radius-button)] text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--primary)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontFamily: 'var(--font-family-primary)',
                }}
              >
                <Shield size={16} />
                Darme de alta
              </button>

              {/* Botón secundario */}
              <button
                onClick={() => { setShowConflictoModal(false); navigate('/agente'); }}
                className="w-full py-3 rounded-[var(--radius-button)] transition-colors"
                style={{
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
              >
                Quedarme en el operativo actual
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecover && (
        <RecuperarContrasenaModal onClose={() => setShowRecover(false)} />
      )}
    </div>
  );
}
