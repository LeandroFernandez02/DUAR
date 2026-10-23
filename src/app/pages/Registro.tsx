import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Shield, CheckCircle, X, Lock, Mail, AlertTriangle, ArrowRightLeft, MailCheck, ExternalLink, RefreshCw, Clock,
  QrCode, UserPlus, LogIn, AlertCircle, FlagOff, UserX, WifiOff, IdCard, User, Phone, Check, UserCheck, MapPin, Calendar, ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import RecuperarContrasena from '../components/auth/RecuperarContrasena';
import {
  MarcoAcceso, TituloAcceso, CampoAcceso, CampoContrasenaAcceso, CampoFechaAcceso, SelectAcceso,
  AlertaAcceso, BotonAcceso, EnlaceAcceso, SeparadorO,
} from '../components/auth/Acceso';
import StatusBadge from '../components/shared/StatusBadge';
import EstadoAgenteBadge from '../components/shared/EstadoAgenteBadge';
import { fechaHoraArgentina } from '../utils/fechaArgentina';
import { catInstituciones, catEspecialidades, catAlergias, dotacionesDe } from '../data/mockData';
import { qrApi, registroApi, authApi, setToken, ApiError, OperativoQRApi } from '../services/api';
import {
  validarNombre, validarApellido, validarDni, validarTelefono,
  validarFechaNacimiento, digitosAntesDelCursor, reponerCursor,
  validarEmail, validarPassword, filtrarEmail, PASSWORD_MAX, EMAIL_MAX,
  soloDigitos, formatearDni, formatearTelefono, limpiarTexto,
  AYUDA_PASSWORD, AYUDA_TELEFONO, PLACEHOLDER_TELEFONO,
} from '../utils/validacionUsuario';
import { guardarAltaPendiente, limpiarAltaPendiente } from '../utils/altaPendiente';

/* ── Tipos ────────────────────────────────────────────────── */
type Modo = 'inicial' | 'login' | 'registro' | 'confirmar' | 'verificarEmail' | 'confirmacion' | 'recuperar';

/* ── Componente ───────────────────────────────────────────── */
export default function Registro() {
  const { operativoId } = useParams<{ operativoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useApp();

  /* ── Core state ── */
  const [modo, setModo] = useState<Modo>('inicial');
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
  // El DNI era de una cuenta dada de baja: se recuperó esa misma (CU-07, 05/10).
  const [cuentaReactivada, setCuentaReactivada] = useState(false);
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
   * ambos dispositivos comparten (CU-16 pasos 4-5).
   */
  const qrToken = searchParams.get('qr');
  const [accesoQR, setAccesoQR] = useState<OperativoQRApi | null>(null);
  const [cargandoQR, setCargandoQR] = useState(true);
  /** El servidor dijo que el código venció o ya no es válido (410 `qr_invalido`, CU-16 paso 4.1). */
  const [qrVencido, setQrVencido] = useState(false);

  useEffect(() => {
    if (!qrToken) { setCargandoQR(false); return; }
    let vigente = true;
    qrApi.validar(qrToken)
      .then(({ operativo: op }) => { if (vigente) setAccesoQR(op); })
      .catch(err => {
        if (!vigente) return;
        setAccesoQR(null);
        setQrVencido(err instanceof ApiError && err.motivo === 'qr_invalido');
      })
      .finally(() => { if (vigente) setCargandoQR(false); });
    return () => { vigente = false; };
  }, [qrToken]);

  /**
   * Se adapta la respuesta de la API a los nombres que ya usa esta pantalla,
   * para no tocar la maqueta entera: `titulo`→`nombre`, `localidad`→`ubicacion`.
   * Memoizado para no disparar de nuevo los efectos de abajo en cada render.
   */
  const operativo = useMemo(() => accesoQR && {
    id: accesoQR.id,
    nombre: accesoQR.titulo,
    ubicacion: accesoQR.localidad,
    estado: accesoQR.estado.toLowerCase(),
    inicio: accesoQR.fechaHoraInicio,
  }, [accesoQR]);
  const isValidQR = Boolean(accesoQR);

  /**
   * Puente con ConfirmarEmail.tsx (ver utils/altaPendiente.ts): mientras se
   * espera la confirmación del correo, se deja guardado a qué operativo hay
   * que sumarse apenas se confirme — si no, el alta (CU-02 paso 6) se pierde
   * porque el link del mail abre otra pantalla que no sabe nada de esto.
   */
  useEffect(() => {
    if (modo !== 'verificarEmail' || !operativoId || !qrToken || !operativo) return;
    guardarAltaPendiente({
      operativoId, qrToken,
      operativoNombre: operativo.nombre,
      operativoUbicacion: operativo.ubicacion,
    });
  }, [modo, operativoId, qrToken, operativo]);

  /**
   * Si ya hay sesión activa (agente que ya tiene cuenta confirmada y escanea
   * un QR estando logueado, o volvió a esta pestaña), no tiene sentido
   * pedirle que elija "Ya tengo cuenta / Soy nuevo" ni que vuelva a loguearse
   * — se salta directo a la pantalla de confirmar participación, mismo
   * camino que sigue `handleLogin` cuando el login es exitoso.
   */
  const [autenticacionRevisada, setAutenticacionRevisada] = useState(false);
  useEffect(() => {
    if (!operativo || autenticacionRevisada) return;
    setAutenticacionRevisada(true);
    if (!isAuthenticated) return;
    (async () => {
      try {
        const { operativo: actual } = await authApi.miOperativoActual();
        if (actual && actual.id === operativoId) {
          navigate('/agente');
          return;
        }
      } catch {
        // Si falla la consulta, se sigue igual al flujo normal de confirmación.
      }
      setModo('confirmar');
    })();
  }, [operativo, isAuthenticated, autenticacionRevisada, operativoId, navigate]);

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: verificando el QR contra el servidor             */
  /* ────────────────────────────────────────────────────────── */
  if (cargandoQR) {
    return (
      <MarcoAcceso>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <RefreshCw size={28} style={{ color: 'var(--primary)', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>Verificando el código de acceso…</p>
        </div>
      </MarcoAcceso>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: QR vencido (CU-16 paso 4.1)                      */
  /* Antes caía en «Operativo no encontrado»: con el código      */
  /* vencido el servidor no dice de qué operativo era.           */
  /* ────────────────────────────────────────────────────────── */
  if (!operativo && qrVencido) {
    return (
      <MarcoAcceso>
        <TituloAcceso icono={QrCode} titulo="QR expirado" texto="Código de acceso vencido. Solicite el QR actualizado." />
        <AlertaAcceso tono="info" icono={Clock}>
          Los QR de acceso se renuevan automáticamente cada <strong>24 horas</strong> por seguridad. Pedile al coordinador del operativo
          que genere uno nuevo con el botón <strong>"Refrescar QR"</strong> y vuelva a compartirlo.
        </AlertaAcceso>
        <BotonAcceso tono="secundario" onClick={() => navigate('/login')}>Ir al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: Operativo no encontrado                          */
  /* ────────────────────────────────────────────────────────── */
  if (!operativo) {
    return (
      <MarcoAcceso>
        <TituloAcceso icono={X} colorIcono="var(--destructive)" titulo="Operativo no encontrado"
          texto="El código QR no corresponde a ningún operativo activo en el sistema." />
        <BotonAcceso tono="secundario" onClick={() => navigate('/login')}>Ir al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: QR inválido / expirado                           */
  /* ────────────────────────────────────────────────────────── */
  if (!isValidQR) {
    return (
      <MarcoAcceso arriba={<BannerOperativo operativo={operativo} />}>
        <TituloAcceso icono={QrCode} titulo="QR expirado" texto={<>
          Este código QR ya no es válido. Los QR de acceso se renuevan automáticamente
          cada <strong style={{ color: 'var(--foreground)' }}>24 horas</strong> por seguridad.
        </>} />
        <AlertaAcceso tono="info" icono={Clock}>
          Solicitá al coordinador del operativo que genere un nuevo código QR
          usando el botón <strong>"Refrescar QR"</strong> y vuelva a compartirlo.
        </AlertaAcceso>
        <BotonAcceso tono="secundario" onClick={() => navigate('/login')}>Ir al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Pantalla: Operativo finalizado                              */
  /* ────────────────────────────────────────────────────────── */
  if (operativo.estado === 'finalizado') {
    return (
      <MarcoAcceso arriba={<BannerOperativo operativo={operativo} />}>
        <TituloAcceso icono={FlagOff} colorIcono="#b45309" titulo="Operativo finalizado"
          texto="Este operativo ya fue cerrado. El código QR no permite nuevos accesos ni registros." />
        <BotonAcceso tono="secundario" onClick={() => navigate('/login')}>Ir al inicio de sesión</BotonAcceso>
      </MarcoAcceso>
    );
  }

  /* ────────────────────────────────────────────────────────── */
  /* Lógica de negocio                                          */
  /* ────────────────────────────────────────────────────────── */

  /**
   * Intenta el alta en el operativo (CU-16 pasos 6-8).
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
      limpiarAltaPendiente();
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
        limpiarAltaPendiente();
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
    // Sin espacios de más (Testeo 13/10, punto 14): lo que se valida es lo que se guarda.
    const nombre = limpiarTexto(regForm.nombre);
    const apellido = limpiarTexto(regForm.apellido);
    const email = regForm.email.trim();
    if (nombre !== regForm.nombre || apellido !== regForm.apellido || email !== regForm.email) setRegForm({ ...regForm, nombre, apellido, email });
    if (!regForm.dni || !nombre || !apellido || !email || !regForm.password) {
      setError('Completá todos los campos obligatorios (*).');
      return;
    }
    if (!qrToken) { setError('Falta el código del QR.'); return; }

    const errores: Record<string, string> = {};
    const errNombre = validarNombre(nombre); if (errNombre) errores.nombre = errNombre;
    const errApellido = validarApellido(apellido); if (errApellido) errores.apellido = errApellido;
    const errDni = validarDni(regForm.dni); if (errDni) errores.dni = errDni;
    const errTelefono = validarTelefono(regForm.telefono); if (errTelefono) errores.telefono = errTelefono;
    const errEmail = validarEmail(email); if (errEmail) errores.email = errEmail;
    const errPassword = validarPassword(regForm.password); if (errPassword) errores.password = errPassword;
    const errFechaNacimiento = validarFechaNacimiento(regForm.fechaNacimiento, true); if (errFechaNacimiento) errores.fechaNacimiento = errFechaNacimiento;
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
      const { token, reactivado } = await registroApi.registrar({
        qrToken,
        dni: regForm.dni,
        nombre,
        apellido,
        email,
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
      setCuentaReactivada(reactivado);
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

  /** CU-02 paso 7 / CU-16 paso 8 — "Confirmar Ingreso". */
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

  /** CU-16 paso 6.2 — el agente acepta abandonar el operativo anterior. */
  const handleDarmeDeAlta = () => { void intentarAlta(true); };

  /* ────────────────────────────────────────────────────────── */
  /* Render                                                     */
  /* ────────────────────────────────────────────────────────── */
  const poner = (k: keyof typeof regForm, v: unknown) => {
    setRegForm(prev => ({ ...prev, [k]: v }));
    if (erroresCampos[k]) setErroresCampos(e => ({ ...e, [k]: '' }));
  };
  const fila = 'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]';
  const volverAlInicio = () => { setError(''); setModo('inicial'); };

  if (modo === 'recuperar') {
    return <MarcoAcceso><RecuperarContrasena onVolver={() => setModo('login')} /></MarcoAcceso>;
  }

  return (
    <>
      <MarcoAcceso arriba={<BannerOperativo operativo={operativo} />}>

        {/* ══ MODO: INICIAL ══ */}
        {modo === 'inicial' && (
          <>
            <TituloAcceso titulo="¿Cómo querés continuar?" texto="Para unirte al operativo, ingresá con tu cuenta o registrate como usuario nuevo." />
            <p style={{ margin: '4px 0 -8px', fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--muted-foreground)' }}>¿Ya tenés cuenta?</p>
            <BotonAcceso icono={LogIn} onClick={() => { setError(''); setModo('login'); }}>Iniciar sesión</BotonAcceso>
            <SeparadorO />
            <p style={{ margin: '0 0 -8px', fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--muted-foreground)' }}>¿Es tu primera vez?</p>
            <BotonAcceso tono="secundario" icono={UserPlus} onClick={() => { setError(''); setModo('registro'); }}>Registrarme</BotonAcceso>
            <p className="text-center" style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>
              El acceso a este operativo es exclusivo por código QR.
            </p>
          </>
        )}

        {/* ══ MODO: LOGIN ══ */}
        {modo === 'login' && (
          <form onSubmit={e => { e.preventDefault(); void handleLogin(); }} noValidate className="flex flex-col gap-4">
            <TituloAcceso titulo="Iniciar Sesión" texto="Ingresá con tu correo y contraseña para unirte al operativo." />
            <CampoAcceso label="Correo electrónico" icono={Mail} type="email" value={loginForm.email} maxLength={EMAIL_MAX}
              onChange={v => setLoginForm({ ...loginForm, email: filtrarEmail(v) })} autoComplete="username" />
            <CampoContrasenaAcceso label="Contraseña" value={loginForm.password}
              onChange={v => setLoginForm({ ...loginForm, password: v })} autoComplete="current-password" />

            {error === 'campos' && <AlertaAcceso>Completá todos los campos.</AlertaAcceso>}
            {error === 'credentials' && <AlertaAcceso>Credenciales incorrectas. Verificá tu email y contraseña.</AlertaAcceso>}
            {error === 'conexion' && (
              <AlertaAcceso tono="aviso" icono={WifiOff}>No se pudo contactar al servidor. Revisá tu conexión e intentá de nuevo en unos minutos.</AlertaAcceso>
            )}
            {error === 'inactivo' && (
              <AlertaAcceso icono={UserX} titulo="Cuenta inactiva">
                Tu cuenta se encuentra deshabilitada. Contactá al coordinador del DUAR para reactivarla.
              </AlertaAcceso>
            )}
            {error === 'eliminado' && (
              <AlertaAcceso icono={UserX} titulo="Cuenta eliminada">
                Esta cuenta ha sido dada de baja del sistema. Contactá al coordinador del DUAR para más información.
              </AlertaAcceso>
            )}

            <BotonAcceso type="submit" cargando={loading}>{loading ? 'Verificando...' : 'Ingresar al operativo'}</BotonAcceso>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <EnlaceAcceso onClick={volverAlInicio}>Volver</EnlaceAcceso>
              <EnlaceAcceso onClick={() => { setError(''); setModo('recuperar'); }}>¿Olvidó su contraseña?</EnlaceAcceso>
            </div>
          </form>
        )}

        {/* ══ MODO: REGISTRO ══ */}
        {modo === 'registro' && (
          <form onSubmit={e => { e.preventDefault(); void handleRegistro(); }} noValidate className="flex flex-col gap-4">
            <TituloAcceso titulo="Crear Cuenta" texto="Completá tus datos para registrarte y sumarte al operativo. Los campos con * son obligatorios." />

            <SeccionRegistro n={1} titulo="Datos personales">
              <CampoAcceso label="DNI" requerido icono={IdCard} inputMode="numeric" placeholder="Ej: 45.080.924" error={erroresCampos.dni}
                value={formatearDni(regForm.dni)}
                onChange={(v, el) => { const d = digitosAntesDelCursor(el); poner('dni', soloDigitos(v).slice(0, 8)); reponerCursor(el, d); }} />
              <div className={fila}>
                <CampoAcceso label="Nombre" requerido icono={User} placeholder="Tu nombre" autoComplete="given-name" error={erroresCampos.nombre}
                  value={regForm.nombre} onChange={v => poner('nombre', v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35))}
                  onBlur={() => setRegForm(p => ({ ...p, nombre: limpiarTexto(p.nombre) }))} />
                <CampoAcceso label="Apellido" requerido icono={User} placeholder="Tu apellido" autoComplete="family-name" error={erroresCampos.apellido}
                  value={regForm.apellido} onChange={v => poner('apellido', v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35))}
                  onBlur={() => setRegForm(p => ({ ...p, apellido: limpiarTexto(p.apellido) }))} />
              </div>
              <div className={fila}>
                <CampoAcceso label="Teléfono" icono={Phone} type="tel" inputMode="numeric" placeholder={PLACEHOLDER_TELEFONO} ayuda={AYUDA_TELEFONO} error={erroresCampos.telefono}
                  value={formatearTelefono(regForm.telefono)} autoComplete="tel"
                  onChange={(v, el) => { const d = digitosAntesDelCursor(el); poner('telefono', soloDigitos(v).slice(0, 10)); reponerCursor(el, d); }} />
                {/* Obligatoria (Testeo 15/10, punto 24): sin ella no se puede comprobar la edad mínima de 16 años. */}
                <CampoFechaAcceso label="Fecha de Nacimiento" requerido value={regForm.fechaNacimiento} error={erroresCampos.fechaNacimiento}
                  onChange={v => poner('fechaNacimiento', v)} />
              </div>
            </SeccionRegistro>

            <SeccionRegistro n={2} titulo="Institución">
              <div className={fila}>
                {/* Cambiar de institución limpia la dotación: una base del DUAR no puede quedar colgada de otra fuerza (la BD lo rechaza). */}
                <SelectAcceso label="Institución" requerido value={regForm.institucionId} placeholder="— Seleccioná tu institución —"
                  onChange={v => setRegForm({ ...regForm, institucionId: v, dotacionId: '' })}
                  opciones={catInstituciones.map(i => ({ value: i.id, label: i.nombre }))} />
                {/* Dotación: aparece sólo si la institución tiene destacamentos */}
                {dotacionesDe(regForm.institucionId).length > 0 && (
                  <SelectAcceso label="Dotación" requerido value={regForm.dotacionId} placeholder="— Seleccioná tu dotación —"
                    onChange={v => setRegForm({ ...regForm, dotacionId: v })}
                    opciones={dotacionesDe(regForm.institucionId).map(d => ({ value: d.id, label: d.nombre }))} />
                )}
              </div>
              {/* Se envía el id del catálogo, no el slug: de él el backend deriva si es un recurso crítico. */}
              <SelectAcceso label="Especialidad" value={regForm.especialidadId} placeholder="— Seleccioná tu especialidad —"
                onChange={v => setRegForm({ ...regForm, especialidadId: v })}
                opciones={catEspecialidades.map(e => ({ value: e.id, label: e.nombre }))} />
            </SeccionRegistro>

            <SeccionRegistro n={3} titulo="Salud">
              <SelectAcceso label="Grupo Sanguíneo" value={regForm.grupo_sanguineo} placeholder="— No especificado —"
                onChange={v => setRegForm({ ...regForm, grupo_sanguineo: v })}
                opciones={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => ({ value: g, label: g }))} />
              {/* Relación N:M real contra cat_alergias: un agente puede tener más de una, y en campo este dato puede ser crítico. */}
              <div className="flex flex-col gap-2">
                <span style={{ fontSize: 'var(--text-label)', fontWeight: 600 }}>Alergias{regForm.alergiaIds.length > 0 && ` (${regForm.alergiaIds.length})`}</span>
                <div className="flex flex-wrap gap-2">
                  {catAlergias.map(a => {
                    const on = regForm.alergiaIds.includes(a.id);
                    return (
                      <button key={a.id} type="button" aria-pressed={on} className="inline-flex items-center gap-1.5"
                        onClick={() => setRegForm(p => ({ ...p, alergiaIds: on ? p.alergiaIds.filter(id => id !== a.id) : [...p.alergiaIds, a.id] }))}
                        style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)',
                          fontWeight: on ? 600 : 500, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                          background: on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'var(--card)', color: 'var(--foreground)' }}>
                        {on && <Check size={13} />}{a.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SeccionRegistro>

            <SeccionRegistro n={4} titulo="Cuenta">
              <CampoAcceso label="Correo electrónico" requerido icono={Mail} type="email" placeholder="tu@email.com" autoComplete="email" error={erroresCampos.email}
                value={regForm.email} onChange={v => poner('email', filtrarEmail(v))} />
              {/* Con el ojito para ver lo que se escribe (Testeo 15/10, punto 26). */}
              <CampoContrasenaAcceso label="Contraseña" requerido icono={Lock} autoComplete="new-password" ayuda={AYUDA_PASSWORD} error={erroresCampos.password}
                value={regForm.password} onChange={v => poner('password', v.slice(0, PASSWORD_MAX))} />
            </SeccionRegistro>

            {error && <AlertaAcceso>{error}</AlertaAcceso>}
            <BotonAcceso type="submit" cargando={loading}>{loading ? 'Registrando...' : 'Registrarme y unirme al operativo'}</BotonAcceso>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <EnlaceAcceso onClick={volverAlInicio}>Volver</EnlaceAcceso>
              <EnlaceAcceso onClick={() => { setError(''); setModo('login'); }}>¿Ya tenés cuenta? Iniciá sesión</EnlaceAcceso>
            </div>
          </form>
        )}

        {/* ══ MODO: CONFIRMAR participación ══ */}
        {modo === 'confirmar' && (
          <>
            <TituloAcceso icono={UserCheck} titulo="Confirmá tu participación" texto="Estás a punto de unirte al siguiente operativo:" />
            <div className="flex flex-col gap-2" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', fontSize: 'var(--text-label)' }}>
              <span className="flex items-center gap-2" style={{ color: 'var(--foreground)', fontWeight: 600 }}><Shield size={14} style={{ color: 'var(--muted-foreground)' }} />{operativo.nombre}</span>
              <span className="flex items-center gap-2" style={{ color: 'var(--foreground)' }}><MapPin size={14} style={{ color: 'var(--muted-foreground)' }} />{operativo.ubicacion}</span>
              {operativo.inicio && <span className="flex items-center gap-2" style={{ color: 'var(--foreground)' }}><Calendar size={14} style={{ color: 'var(--muted-foreground)' }} />Inicio: {fechaHoraArgentina(operativo.inicio)}</span>}
            </div>
            <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.55 }}>
              Al confirmar, quedarás registrado con estado <strong style={{ color: 'var(--foreground)' }}>Disponible</strong> y el coordinador podrá verte asignado al operativo.
            </p>
            {error && <AlertaAcceso>{error}</AlertaAcceso>}
            <BotonAcceso icono={Check} cargando={loading} onClick={handleConfirmar}>{loading ? 'Confirmando...' : 'Confirmar participación'}</BotonAcceso>
            <BotonAcceso tono="secundario" onClick={() => setModo('inicial')}>Cancelar</BotonAcceso>
          </>
        )}

        {/* ══ MODO: VERIFICAR EMAIL (solo nuevos usuarios) ══ */}
        {modo === 'verificarEmail' && (
          <>
            <TituloAcceso icono={MailCheck} titulo="Confirmá tu cuenta para continuar" texto={<>
              Te enviamos un correo a la casilla de abajo. Hacé clic en el link para confirmar tu cuenta —
              recién ahí vas a poder unirte a <strong style={{ color: 'var(--foreground)' }}>{operativo.nombre}</strong>.
            </>} />
            {cuentaReactivada && (
              <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                Tu DNI ya tenía una cuenta que había sido dada de baja: la recuperamos con los datos que cargaste,
                así conservás tu historial de operativos.
              </p>
            )}
            <div className="flex items-center gap-2.5" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', fontSize: 'var(--text-base)', fontWeight: 600, wordBreak: 'break-all' }}>
              <Mail size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />{nuevoUserEmail}
            </div>
            <AlertaAcceso tono="aviso" icono={AlertTriangle}>Todavía no quedaste unido al operativo. Confirmá el correo y volvé a esta pantalla.</AlertaAcceso>
            {error && <AlertaAcceso>{error}</AlertaAcceso>}

            {/* Link de confirmación en desarrollo */}
            {urlConfirmacionDev && (
              <AlertaAcceso tono="info" icono={ExternalLink} titulo="Modo desarrollo — link de confirmación">
                <a href={urlConfirmacionDev} className="break-all" style={{ color: 'var(--foreground)' }}>{urlConfirmacionDev}</a>
              </AlertaAcceso>
            )}

            <BotonAcceso icono={Check} cargando={loading} onClick={handleConfirmar}>{loading ? 'Verificando...' : 'Ya confirmé mi correo — continuar'}</BotonAcceso>
            <BotonAcceso tono="secundario" icono={RefreshCw} onClick={handleReenviarCorreo} cargando={reenviando} deshabilitado={cooldownReenvio > 0}>
              {reenviando ? 'Reenviando...' : cooldownReenvio > 0 ? `Reenviar correo (${formatCooldown(cooldownReenvio)})` : 'Reenviar correo'}
            </BotonAcceso>
            <p className="text-center" style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-small)', lineHeight: 1.5 }}>
              Si después de un par de intentos no te llegó, contactá a un coordinador del DUAR.
            </p>
          </>
        )}

        {/* ══ MODO: CONFIRMACIÓN FINAL ══ */}
        {modo === 'confirmacion' && (
          <>
            <TituloAcceso icono={CheckCircle} colorIcono="#16a34a" titulo="¡Te uniste al operativo!" texto={<>
              Ya estás registrado en <strong style={{ color: 'var(--foreground)' }}>{operativo.nombre}</strong>.
            </>} />
            <span className="self-start"><EstadoAgenteBadge estado="disponible" /></span>
            <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.55 }}>
              El coordinador del operativo podrá verte en el sistema. Presentate al Puesto de Comando para recibir instrucciones.
            </p>
            <BotonAcceso icono={ArrowRight} onClick={() => navigate('/agente')}>Ir a mi panel</BotonAcceso>
          </>
        )}
      </MarcoAcceso>

      {/* ══ MODAL DE CONFLICTO DE OPERATIVO — CU-14, Paso 5.1 / 6. Texto exacto requerido por el caso de uso. ══ */}
      {showConflictoModal && operativoConflicto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'var(--scrim-modal)' }} onClick={() => setShowConflictoModal(false)}>
          <div role="dialog" aria-label="Conflicto de operativo" className="w-full rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] overflow-hidden flex flex-col"
            style={{ maxWidth: 440, background: 'var(--card)', boxShadow: 'var(--elevation-modal)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in srgb, #d97706 14%, transparent)', color: '#d97706' }}>
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>Conflicto de operativo</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>Se detectó actividad en otro operativo activo</p>
                </div>
              </div>
              <button onClick={() => setShowConflictoModal(false)} aria-label="Cerrar" className="flex" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo: texto exacto del CU-14, Paso 5.1 */}
            <div className="flex flex-col gap-4" style={{ padding: 20 }}>
              <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', lineHeight: 1.65 }}>
                Ya te encontrás activo en un operativo,{' '}
                <span style={{ color: 'var(--muted-foreground)' }}>¿Deseás abandonar el operativo</span>{' '}
                <strong>{operativoConflicto.nombre}</strong>{' '}
                <span style={{ color: 'var(--muted-foreground)' }}>y darte de alta en el operativo</span>{' '}
                <strong>{operativo.nombre}</strong>?
              </p>
              <div className="flex flex-col gap-2">
                {([['Operativo actual', operativoConflicto, '#d97706', AlertTriangle], ['Nuevo operativo (QR)', operativo, 'var(--primary)', QrCode]] as const).map(([rotulo, op, color, I], i) => (
                  <div key={rotulo}>
                    {i === 1 && (
                      <div className="flex items-center justify-center gap-2 pb-2" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-small)' }}>
                        <ArrowRightLeft size={14} />Cambiar a
                      </div>
                    )}
                    <div className="flex items-center gap-3" style={{ padding: 12, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${color} 7%, transparent)`, border: `1.5px solid color-mix(in srgb, ${color} 28%, transparent)` }}>
                      <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}><I size={14} /></span>
                      <div className="min-w-0">
                        <p style={{ margin: 0, fontSize: 'var(--text-micro)', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-overline)' }}>{rotulo}</p>
                        <p className="truncate" style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 600 }}>{op.nombre}</p>
                        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-small)' }}>{op.ubicacion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <AlertaAcceso tono="aviso" icono={AlertCircle}>
                Serás desvinculado del operativo anterior automáticamente y tu estado quedará como <strong>Disponible</strong> en el nuevo operativo.
              </AlertaAcceso>
            </div>

            {/* Footer: botones CU-14 */}
            <div className="flex flex-col gap-2.5" style={{ padding: '0 20px 20px' }}>
              {/* Botón principal: "Darme de alta" — CU-14, Paso 6 */}
              <BotonAcceso icono={Check} cargando={loading} onClick={handleDarmeDeAlta}>Darme de alta</BotonAcceso>
              <BotonAcceso tono="secundario" onClick={() => { setShowConflictoModal(false); navigate('/agente'); }}>Quedarme en el operativo actual</BotonAcceso>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** El operativo del QR, en una franja azul noche arriba de la tarjeta (diseño CALÍVAR). */
function BannerOperativo({ operativo }: { operativo: { nombre: string; ubicacion: string; estado: string } }) {
  // La API manda el estado en mayúsculas («EN_PLANIFICACION»); StatusBadge usa las claves de la app.
  const estado = operativo.estado === 'en_planificacion' ? 'planificación' : operativo.estado;
  return (
    <div className="w-full flex items-center gap-3" style={{ padding: '12px 14px', borderRadius: 'var(--radius-card)', background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary)', color: 'var(--primary-foreground)' }}><QrCode size={20} /></span>
      <div className="min-w-0 flex-1">
        <p style={{ margin: 0, fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>Operativo</p>
        <p style={{ margin: '1px 0 2px', fontSize: 'var(--text-base)', fontWeight: 700, lineHeight: 1.3 }}>{operativo.nombre}</p>
        <p className="flex items-center gap-1" style={{ margin: 0, fontSize: 'var(--text-small)', opacity: 0.75 }}><MapPin size={11} />{operativo.ubicacion}</p>
      </div>
      <StatusBadge estado={estado} size="sm" />
    </div>
  );
}

/** Sección numerada del formulario de registro. */
function SeccionRegistro({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5" style={{ paddingTop: n > 1 ? 16 : 0, borderTop: n > 1 ? '1px solid var(--border)' : 'none' }}>
      <p className="flex items-center gap-2" style={{ margin: 0, fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
        <span className="flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--foreground)', fontSize: 'var(--text-micro)', letterSpacing: 0 }}>{n}</span>
        {titulo}
      </p>
      {children}
    </div>
  );
}
