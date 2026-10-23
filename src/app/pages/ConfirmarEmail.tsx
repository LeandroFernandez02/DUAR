import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { CheckCircle, XCircle, Loader, MailCheck, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { MarcoAcceso, TituloAcceso, AlertaAcceso, BotonAcceso } from '../components/auth/Acceso';
import { useApp } from '../context/AppContext';
import { authApi, registroApi, ApiError } from '../services/api';
import { leerAltaPendiente, limpiarAltaPendiente, AltaPendiente } from '../utils/altaPendiente';

type Estado = 'verificando' | 'exitoso' | 'invalido' | 'ya_confirmado';
/** Estado del alta automática al operativo que quedó pendiente (ver utils/altaPendiente.ts). */
type EstadoAlta = 'ninguna' | 'uniendo' | 'unido' | 'conflicto' | 'sin_sesion' | 'error';

export default function ConfirmarEmail() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, usuario, refrescarUsuario, logout } = useApp();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');
  /** Correo de la cuenta que se confirmó (lo devuelve el servidor). */
  const [emailConfirmado, setEmailConfirmado] = useState<string | null>(null);
  /**
   * En este navegador está abierta la sesión de OTRA persona (Testeo 13/10,
   * punto 11): "Ir al sistema" la llevaba a la vista de esa otra cuenta.
   */
  const otraSesion = isAuthenticated && !!usuario && !!emailConfirmado
    && usuario.email.toLowerCase() !== emailConfirmado.toLowerCase();

  const [altaPendiente, setAltaPendienteState] = useState<AltaPendiente | null>(null);
  const [estadoAlta, setEstadoAlta] = useState<EstadoAlta>('ninguna');
  const [errorAlta, setErrorAlta] = useState('');

  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      return;
    }
    let vigente = true;
    authApi.confirmarEmail(token)
      .then(({ estado: r, email }) => {
        if (!vigente) return;
        setEmailConfirmado(email ?? null);
        setEstado(r === 'ok' ? 'exitoso' : r);
      })
      // 410 = vencido/inexistente; cualquier otro fallo cae igual en
      // "inválido" — no hay una tercera pantalla útil que mostrar.
      .catch(() => { if (vigente) setEstado('invalido'); });
    return () => { vigente = false; };
  }, [token]);

  /**
   * CU-02 paso 7 → paso 6: apenas el correo queda confirmado, se completa
   * automáticamente el alta al operativo que quedó pendiente de la pantalla
   * de registro (ver utils/altaPendiente.ts) — antes había que acordarse de
   * volver a esa pestaña y tocar "Ya confirmé mi correo", y si no, el agente
   * quedaba registrado en el sistema pero nunca sumado al operativo.
   */
  const intentarAltaAutomatica = () => {
    const pendiente = leerAltaPendiente();
    if (!pendiente) return;
    setAltaPendienteState(pendiente);
    // La sesión vive en la pestaña donde la persona se registró (sessionStorage, Testeo 15/10 punto 19):
    // el enlace del correo abre otra pestaña sin sesión. No es un error, es el paso que sigue.
    if (!isAuthenticated) {
      setEstadoAlta('sin_sesion');
      return;
    }
    setEstadoAlta('uniendo');
    registroApi.altaEnOperativo(pendiente.operativoId, pendiente.qrToken)
      .then(() => {
        limpiarAltaPendiente();
        setEstadoAlta('unido');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.motivo === 'ya_en_este_operativo') {
          limpiarAltaPendiente();
          setEstadoAlta('unido');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'regla_ubicuidad') {
          // Requiere una decisión del agente (CU-16 paso 6.2) — se lo manda
          // de vuelta a la pantalla de registro, que ya tiene ese modal armado.
          limpiarAltaPendiente();
          setEstadoAlta('conflicto');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'qr_invalido') {
          // No se limpia el pendiente: si el coordinador refresca el QR y el
          // agente reintenta, `qrToken` seguiría siendo el viejo de todos
          // modos (no hay forma de enterarse del nuevo desde acá) — se deja
          // así a propósito para que "Reintentar" sea consistente y no un
          // botón que no hace nada.
          setErrorAlta(`El código QR de "${pendiente.operativoNombre}" venció. Pedile al coordinador que te comparta uno nuevo y volvé a escanearlo.`);
          setEstadoAlta('error');
          return;
        }
        if (err instanceof ApiError && err.motivo === 'operativo_cerrado') {
          setErrorAlta(`El operativo "${pendiente.operativoNombre}" ya no admite nuevos ingresos.`);
          setEstadoAlta('error');
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          setErrorAlta(`Iniciá sesión y volvé a escanear el QR de "${pendiente.operativoNombre}" para unirte.`);
          setEstadoAlta('error');
          return;
        }
        setErrorAlta(err instanceof ApiError ? err.message : 'No se pudo completar el ingreso al operativo.');
        setEstadoAlta('error');
      });
  };

  useEffect(() => {
    if (estado !== 'exitoso' && estado !== 'ya_confirmado') return;
    // Con la sesión de otra persona abierta no se hace nada en su nombre: el
    // alta al operativo se haría con la cuenta equivocada.
    if (otraSesion) return;
    /* El `usuario` en memoria (AppContext) se cargó al montar la app, antes
     * de que este mismo efecto confirmara el mail contra el backend — sin
     * este refresh, "Confirmá tu correo" seguía pegado en el portal de
     * agente hasta recargar la página a mano. */
    if (isAuthenticated) refrescarUsuario();
    intentarAltaAutomatica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  /** Sección chica que se agrega bajo el mensaje de "cuenta confirmada" cuando había un operativo esperando. */
  const irAlQR = () => altaPendiente && navigate(`/registro/${altaPendiente.operativoId}?qr=${altaPendiente.qrToken}`);
  const renderEstadoAlta = () => {
    if (estadoAlta === 'ninguna') return null;
    if (estadoAlta === 'uniendo') {
      return (
        <AlertaAcceso tono="info" icono={Loader}>
          Sumándote al operativo <strong>{altaPendiente?.operativoNombre}</strong>...
        </AlertaAcceso>
      );
    }
    if (estadoAlta === 'unido') {
      return (
        <AlertaAcceso tono="info" icono={Users}>
          Ya figurás como agente <strong>Disponible</strong> en <strong>{altaPendiente?.operativoNombre}</strong>.
        </AlertaAcceso>
      );
    }
    if (estadoAlta === 'conflicto' && altaPendiente) {
      return (
        <>
          <AlertaAcceso tono="aviso" icono={AlertTriangle}>
            Ya estás activo en otro operativo. Volvé a entrar por el QR de <strong>{altaPendiente.operativoNombre}</strong> para decidir si te trasladás.
          </AlertaAcceso>
          <BotonAcceso tono="secundario" onClick={irAlQR}>Ver operativo y decidir</BotonAcceso>
        </>
      );
    }
    if (estadoAlta === 'sin_sesion' && altaPendiente) {
      return (
        <>
          <AlertaAcceso tono="info" icono={Users}>
            Falta un paso para sumarte a <strong>{altaPendiente.operativoNombre}</strong>: volvé a la pantalla donde te
            registraste y tocá <strong>«Ya confirmé mi correo»</strong>, o iniciá sesión acá.
          </AlertaAcceso>
          <BotonAcceso tono="secundario" onClick={irAlQR}>Iniciar sesión y unirme</BotonAcceso>
        </>
      );
    }
    if (estadoAlta === 'error') {
      return (
        <>
          <AlertaAcceso icono={AlertTriangle}>{errorAlta}</AlertaAcceso>
          {altaPendiente && <BotonAcceso tono="secundario" icono={RefreshCw} onClick={intentarAltaAutomatica}>Reintentar</BotonAcceso>}
        </>
      );
    }
    return null;
  };

  /** Cierra la sesión de la otra persona y lleva al login para entrar con la cuenta confirmada. */
  const handleEntrarConMiCuenta = async () => {
    await logout();
    navigate('/login');
  };

  /** Aviso cuando el navegador tiene abierta la sesión de otra cuenta. */
  const renderOtraSesion = () => otraSesion && usuario && (
    <>
      <AlertaAcceso tono="aviso" icono={AlertTriangle}>
        En este navegador está abierta la sesión de <strong>{usuario.nombre} {usuario.apellido}</strong> ({usuario.rol}).
        Para entrar con la cuenta que confirmaste (<strong>{emailConfirmado}</strong>), cerrá esa sesión.
      </AlertaAcceso>
      <BotonAcceso onClick={handleEntrarConMiCuenta}>Cerrar esa sesión e ingresar con mi cuenta</BotonAcceso>
    </>
  );

  const handleIrAlPanel = () => {
    if (isAuthenticated) {
      navigate(usuario?.rol === 'agente' ? '/agente' : '/dashboard');
    } else {
      navigate('/login');
    }
  };
  const botonIrAlSistema = (
    <BotonAcceso tono={otraSesion ? 'secundario' : 'primario'} onClick={handleIrAlPanel}>
      {otraSesion && usuario ? `Seguir como ${usuario.nombre}` : 'Ir al sistema'}
    </BotonAcceso>
  );

  return (
    <MarcoAcceso>
      {/* ── Verificando ── */}
      {estado === 'verificando' && (
        <TituloAcceso icono={Loader} titulo="Verificando tu cuenta..." texto="Por favor esperá un momento." />
      )}

      {/* ── Exitoso ── */}
      {estado === 'exitoso' && (
        <>
          <TituloAcceso icono={CheckCircle} colorIcono="#16a34a" titulo="¡Cuenta confirmada!"
            texto="Tu correo electrónico fue verificado exitosamente. Ya tenés acceso completo al sistema." />
          {renderOtraSesion()}
          {renderEstadoAlta()}
          {botonIrAlSistema}
        </>
      )}

      {/* ── Ya confirmado ── */}
      {estado === 'ya_confirmado' && (
        <>
          <TituloAcceso icono={MailCheck} titulo="Cuenta ya verificada"
            texto="Tu cuenta ya fue confirmada previamente. Podés ingresar al sistema con normalidad." />
          {renderOtraSesion()}
          {renderEstadoAlta()}
          {botonIrAlSistema}
        </>
      )}

      {/* ── Inválido / expirado ── */}
      {estado === 'invalido' && (
        <>
          <TituloAcceso icono={XCircle} colorIcono="var(--destructive)" titulo="Link inválido o expirado"
            texto="El link de confirmación no es válido o ya fue utilizado. Solicitá un nuevo correo desde tu panel de agente." />
          <BotonAcceso tono="secundario" onClick={handleIrAlPanel}>Ir al inicio</BotonAcceso>
        </>
      )}
    </MarcoAcceso>
  );
}
