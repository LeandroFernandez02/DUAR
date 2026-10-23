import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Shield, ShieldCheck, UserCheck, Footprints, AlertCircle, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { Usuario, Rol, EstadoUsuario, catInstituciones, catEspecialidades, catAlergias, dotacionesDe, institucionLabel, especialidadNombrePorId } from '../data/mockData';
import { usuariosApi, ApiError, UsuarioApi } from '../services/api';
import StatusBadge from '../components/shared/StatusBadge';
import { AccionCabecera } from '../components/layout/Movil';
import FiltroDesplegable from '../components/shared/FiltroDesplegable';
import AvatarAgente from '../components/shared/AvatarAgente';
import Button from '../components/shared/base/Button';
import {
  Buscador, SelectorVista, BarraFiltros, BotonTextoFiltro, Vacio, BotonIcono, Dato, TablaFija, tarjetaBase, type VistaListado,
} from '../components/shared/Listados';
import CampoPassword from '../components/shared/CampoPassword';
import CampoFecha from '../components/shared/CampoFecha';
import {
  validarNombre, validarApellido, validarDni, validarTelefono,
  validarFechaNacimiento,
  validarEmail, validarPassword, filtrarEmail, PASSWORD_MAX,
  soloDigitos, formatearDni, formatearTelefono, limpiarTexto,
  digitosAntesDelCursor, reponerCursor,
  AYUDA_PASSWORD, AYUDA_TELEFONO, PLACEHOLDER_TELEFONO,
} from '../utils/validacionUsuario';

/**
 * Traduce el usuario de la API al modelo del frontend.
 * La base usa enums en MAYÚSCULAS y el rol como nombre del catálogo; el
 * frontend viene trabajando en minúsculas.
 */
function mapearUsuario(u: UsuarioApi): Usuario {
  return {
    id: u.id,
    dni: u.dni,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    password: '',
    rol: u.rol.toLowerCase() as Rol,
    telefono: u.telefono ?? undefined,
    // El campo de fecha sólo entiende «YYYY-MM-DD» (Testeo 13/10, punto 10).
    fechaNacimiento: u.fechaNacimiento ? u.fechaNacimiento.slice(0, 10) : undefined,
    institucionId: u.institucionId ?? undefined,
    dotacionId: u.dotacionId ?? undefined,
    especialidadId: u.especialidadId ?? undefined,
    alergiaIds: u.alergias.map(a => a.id),
    grupo_sanguineo: u.grupoSanguineo ?? undefined,
    estado: u.estado.toLowerCase() as EstadoUsuario,
    createdAt: '',
    emailConfirmado: u.emailConfirmado,
  };
}

type ModalType = 'create' | 'edit' | 'delete' | null;

/** Rol con su ícono y colores (diseño CALÍVAR): administrador turquesa, coordinador azul, agente gris. */
const ROL_INFO: Record<Rol, { label: string; icono: typeof Shield; bg: string; color: string }> = {
  administrador: { label: 'Administrador', icono: Shield, bg: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' },
  coordinador: { label: 'Coordinador', icono: UserCheck, bg: 'color-mix(in srgb, rgba(37,99,235,0.18) var(--tinte-oscuro, 0%), #dbeafe)', color: 'color-mix(in srgb, #93c5fd var(--tinte-oscuro, 0%), #1d4ed8)' },
  agente: { label: 'Agente', icono: Footprints, bg: 'var(--muted)', color: 'var(--muted-foreground)' },
};
const ROLES_FILTRO: Rol[] = ['administrador', 'coordinador', 'agente'];
const ESTADOS_USUARIO: { value: EstadoUsuario; label: string; dot: string }[] = [
  { value: 'activo', label: 'Activo', dot: '#16a34a' },
  { value: 'pendiente', label: 'Pendiente', dot: 'var(--accent)' },
  { value: 'inactivo', label: 'Inactivo', dot: '#dc2626' },
];

function RolPill({ rol }: { rol: Rol }) {
  const r = ROL_INFO[rol];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ padding: '2px 9px', borderRadius: 999, background: r.bg, color: r.color, fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 600 }}>
      <r.icono size={11} />{r.label}
    </span>
  );
}

/** Si la institución del usuario es el DUAR (cat_instituciones.es_duar): avatar turquesa y escudo junto a la dotación. */
const esDelDuar = (u: Usuario) => !!catInstituciones.find(i => i.id === u.institucionId)?.esDuar;
const iniciales = (u: Usuario) => `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();

function Dotacion({ u }: { u: Usuario }) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      {esDelDuar(u) && <ShieldCheck size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
      <span className="truncate">{institucionLabel(u)}</span>
    </span>
  );
}

const emptyForm = {
  dni: '', nombre: '', apellido: '', email: '', password: '', passwordConfirm: '',
  rol: 'agente' as Rol, fechaNacimiento: '', telefono: '',
  alergiaIds: [] as string[],
  institucionId: '', dotacionId: '', especialidadId: '', grupo_sanguineo: '',
  estado: 'activo' as EstadoUsuario,
};

export default function Usuarios() {
  const { usuario: usuarioActual } = useApp();
  // Para el coordinador los administradores no existen (30/09): el backend ya no
  // se los lista, y acá tampoco se le ofrece el rol ni el filtro.
  const soyAdmin = usuarioActual?.rol === 'administrador';
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<Rol[]>([]);
  const [estados, setEstados] = useState<EstadoUsuario[]>([]);
  const [vista, setVista] = useState<VistaListado>('card');

  /* ── Datos REALES desde la API (CU-04) ──────────────────────────────────
   * Este módulo ya no usa los mocks del contexto: la lista sale de la tabla
   * `usuarios` de PostgreSQL. El backend ya excluye los ELIMINADOS.        */
  const [usuariosVisibles, setUsuariosVisibles] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState('');

  const cargarUsuarios = async () => {
    setCargando(true);
    setErrorApi('');
    try {
      const { usuarios } = await usuariosApi.listar();
      setUsuariosVisibles(usuarios.map(mapearUsuario));
    } catch (err) {
      setErrorApi(err instanceof ApiError ? err.message : 'No se pudo contactar al servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const filtered = usuariosVisibles.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nombre.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) || u.dni.includes(q);
    return matchSearch && (!roles.length || roles.includes(u.rol)) && (!estados.length || estados.includes(u.estado));
  });

  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});
  /** Error del servidor al guardar: se muestra dentro del modal, no detrás (Testeo 13/10, punto 6). */
  const [errorModal, setErrorModal] = useState('');

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setErroresForm({});
    setErrorModal('');
    setModal('create');
  };

  /** id del usuario cuyo reenvío está en curso — deshabilita ese botón puntual. */
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Reenvía el correo de confirmación a un usuario PENDIENTE, a pedido del coordinador. */
  const handleReenviarConfirmacion = async (u: Usuario) => {
    setReenviando(u.id);
    try {
      await usuariosApi.reenviarConfirmacion(u.id);
      toast.success(`Correo de confirmación reenviado a ${u.email}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo reenviar el correo.');
    } finally {
      setReenviando(null);
    }
  };

  /** Editando la propia cuenta: ni el rol ni el estado se tocan (autobloqueo, 30/09). */
  const editandomePropio = modal === 'edit' && !!selected && selected.id === usuarioActual?.id;

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setForm({
      dni: u.dni, nombre: u.nombre, apellido: u.apellido,
      email: u.email, password: u.password, passwordConfirm: '',
      rol: u.rol, fechaNacimiento: u.fechaNacimiento || '',
      telefono: u.telefono || '', alergiaIds: u.alergiaIds || [],
      institucionId: u.institucionId || '', dotacionId: u.dotacionId || '', especialidadId: u.especialidadId || '',
      grupo_sanguineo: u.grupo_sanguineo || '', estado: u.estado,
    });
    setErroresForm({});
    setErrorModal('');
    setModal('edit');
  };

  /** Una cuenta Pendiente pasa a Activo sólo al confirmar su correo: su estado no se elige (Testeo 13/10, punto 4). */
  const editandoPendiente = modal === 'edit' && selected?.estado === 'pendiente';
  /** Al editar, cambiar el correo obliga a confirmarlo de nuevo (Testeo 13/10, punto 8). */
  const cambiaEmail = modal === 'edit' && !!selected && form.email.trim().toLowerCase() !== selected.email.toLowerCase();

  /** CU-05 Crear / CU-06 Modificar — persisten contra PostgreSQL. */
  const handleSave = async () => {
    // Sin espacios de más (Testeo 13/10, punto 14): lo que se valida es lo que se guarda.
    const nombre = limpiarTexto(form.nombre);
    const apellido = limpiarTexto(form.apellido);
    const email = form.email.trim();
    if (nombre !== form.nombre || apellido !== form.apellido || email !== form.email) setForm({ ...form, nombre, apellido, email });
    setErrorModal('');
    const obligatorios: Record<string, string> = {};
    if (!form.dni) obligatorios.dni = 'Completá el DNI.';
    if (!nombre) obligatorios.nombre = 'Completá el nombre.';
    if (!apellido) obligatorios.apellido = 'Completá el apellido.';
    if (!email) obligatorios.email = 'Completá el correo.';
    if (Object.keys(obligatorios).length > 0) {
      setErroresForm(obligatorios);
      setErrorModal('Completá los campos obligatorios (*).');
      return;
    }

    const errores: Record<string, string> = {};
    const errNombre = validarNombre(nombre); if (errNombre) errores.nombre = errNombre;
    const errApellido = validarApellido(apellido); if (errApellido) errores.apellido = errApellido;
    const errDni = validarDni(form.dni); if (errDni) errores.dni = errDni;
    const errTelefono = validarTelefono(form.telefono); if (errTelefono) errores.telefono = errTelefono;
    const errEmail = validarEmail(email); if (errEmail) errores.email = errEmail;
    // Alta: la contraseña es obligatoria (antes se usaba '1234' por defecto,
    // que ni cumple el mínimo de 8). Edición: vacía = "no cambiarla" (CU-06 paso 5).
    if (modal === 'create' || form.password) {
      const errPassword = validarPassword(form.password); if (errPassword) errores.password = errPassword;
      // Doble validación (Testeo 15/10, punto 21): se escribe dos veces para no guardar una con error de tipeo.
      else if (form.password !== form.passwordConfirm) errores.passwordConfirm = 'Las contraseñas no coinciden.';
    }
    // La fecha de nacimiento es obligatoria al crear (Testeo 15/10, punto 24); al modificar, sólo si la cuenta ya la tenía.
    const errFechaNacimiento = validarFechaNacimiento(form.fechaNacimiento, modal === 'create' || !!selected?.fechaNacimiento);
    if (errFechaNacimiento) errores.fechaNacimiento = errFechaNacimiento;
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) {
      setErrorModal('Revisá los campos marcados en rojo.');
      return;
    }

    const datos = {
      dni: form.dni,
      nombre,
      apellido,
      email,
      rol: form.rol,
      telefono: form.telefono || undefined,
      fechaNacimiento: form.fechaNacimiento || undefined,
      institucionId: form.institucionId || undefined,
      dotacionId: form.dotacionId || undefined,
      // BUG reportado: faltaba mandar esto. El backend siempre lo soportó
      // (usuario.model.js ya tenía especialidad_id en el UPDATE); el payload
      // simplemente nunca lo incluía.
      especialidadId: form.especialidadId || undefined,
      grupoSanguineo: form.grupo_sanguineo || undefined,
      // Siempre se manda, incluso vacío: `[]` es "sin alergias", no "no tocar".
      alergiaIds: form.alergiaIds,
      // `caminante` es TÁCTICO: se infiere al dar de alta al agente en un
      // operativo, no al crear el usuario global (Decisión A/C).
    };

    // Mientras el servidor guarda y manda el correo (unos segundos con Gmail) el botón no se puede volver a tocar.
    if (guardando) return;
    setGuardando(true);
    try {
      if (modal === 'create') {
        // El backend hashea con bcrypt (CU-05 paso 4); acá nunca se guarda en claro.
        const { usuario: alta, reactivado, correoEnviado } = await usuariosApi.crear({ ...datos, password: form.password });
        // CU-07 (05/10): el DNI era de una cuenta eliminada → se recuperó esa misma, con su historial.
        if (reactivado) {
          toast.success(`Se reactivó la cuenta de ${alta.nombre} ${alta.apellido}, que estaba eliminada: conserva su historial de operativos.`);
        }
        avisarCorreo(alta.email, correoEnviado);
      } else if (selected) {
        const r = await usuariosApi.actualizar(selected.id, {
          ...datos,
          // CU-06 paso 4: la contraseña sólo se sobrescribe si se cargó una nueva.
          ...(form.password ? { password: form.password } : {}),
          // Pendiente no se elige a mano: no se manda (Testeo 13/10, puntos 3 y 4).
          ...(editandoPendiente ? {} : { estado: form.estado.toUpperCase() }),
        });
        if (r.cambioEmail) avisarCorreo(r.usuario.email, r.correoEnviado);
      }
      setModal(null);
      await cargarUsuarios();
    } catch (err) {
      // Duplicado de DNI/correo (CU-05 3.1, CU-06 5.1) u otro rechazo del servidor: dentro del modal.
      if (err instanceof ApiError) {
        const campos = err.datos.errores as Record<string, string> | undefined;
        if (campos) setErroresForm(prev => ({ ...prev, ...campos }));
        setErrorModal(err.message);
      } else {
        setErrorModal('No se pudo guardar el usuario.');
      }
    } finally {
      setGuardando(false);
    }
  };

  /** Resultado del correo de confirmación (Testeo 13/10, puntos 5 y 8). */
  const avisarCorreo = (para: string, enviado?: boolean) => {
    if (enviado) toast.success(`Se envió el correo de confirmación a ${para}. La cuenta queda Pendiente hasta que lo confirme.`);
    else toast.warning(`La cuenta quedó Pendiente, pero el correo de confirmación a ${para} no salió. Reenvialo desde el listado.`);
  };

  /** CU-07 Eliminar — baja lógica + invalidación de sesiones, todo en el backend. */
  const handleDelete = async () => {
    if (!selected) return;
    setErrorApi('');
    try {
      await usuariosApi.eliminar(selected.id);
      setModal(null);
      await cargarUsuarios();
    } catch (err) {
      // Incluye el autobloqueo (paso 4.1) y el último administrador
      setErrorApi(err instanceof ApiError ? err.message : 'No se pudo eliminar el usuario.');
      setModal(null);
    }
  };

  const fieldStyle = {
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)',
    fontSize: 'var(--text-base)',
  };

  const acciones = (u: Usuario) => {
    const yo = u.id === usuarioActual?.id;
    return (
      <div className="flex items-center gap-0.5 shrink-0">
        {u.estado === 'pendiente' && (
          <BotonIcono icono={MailCheck} title="Reenviar correo de confirmación" disabled={reenviando === u.id} onClick={() => handleReenviarConfirmacion(u)} />
        )}
        <BotonIcono icono={Edit2} title="Editar usuario" onClick={() => openEdit(u)} />
        <BotonIcono icono={Trash2} tono="peligro" disabled={yo} title={yo ? 'No podés eliminar tu propia cuenta' : 'Eliminar usuario'}
          onClick={() => { setSelected(u); setModal('delete'); }} />
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>Usuarios</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
            {cargando ? 'Cargando usuarios…' : `Gestión de Cuentas, Roles y Accesos al Sistema — ${usuariosVisibles.length} registrados`}
          </p>
        </div>
        {/* En mobile/tablet va a la barra superior (diseño CALÍVAR) */}
        <AccionCabecera>
          <Button size="lg" icon={Plus} onClick={openCreate} aria-label="Nuevo Usuario">Nuevo Usuario</Button>
        </AccionCabecera>
      </div>

      {/* Rechazos del servidor: duplicados (CU-05 3.1), autobloqueo (CU-07 4.1),
          último administrador, o caída de la API. */}
      {errorApi && (
        <div className="flex items-start gap-2.5 mb-4" role="alert"
          style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)', color: 'var(--destructive)', fontSize: 'var(--text-base)' }}>
          <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{errorApi}</span>
          <button onClick={() => setErrorApi('')} aria-label="Cerrar aviso" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Buscador, vista y filtros por rol y estado (selección múltiple; vacío = todos) */}
      <div className="mb-5" style={tarjetaBase}>
        <div className="flex items-center gap-3" style={{ padding: '16px 16px 12px' }}>
          {/* El navegador tomaba el buscador por un campo de correo y lo llenaba con el del modal (Testeo 13/10, punto 13): Buscador usa type="text" sin nombre de correo. */}
          <Buscador value={search} onChange={setSearch} placeholder="Buscar por nombre, email, DNI..." />
          <SelectorVista value={vista} onChange={setVista} />
        </div>
        <BarraFiltros>
          <FiltroDesplegable<Rol> titulo="Rol" seleccion={roles} onCambiar={setRoles}
            opciones={ROLES_FILTRO.filter(r => soyAdmin || r !== 'administrador').map(r => ({ value: r, label: ROL_INFO[r].label, count: usuariosVisibles.filter(u => u.rol === r).length }))} />
          <FiltroDesplegable<EstadoUsuario> titulo="Estado" seleccion={estados} onCambiar={setEstados}
            opciones={ESTADOS_USUARIO.map(e => ({ ...e, count: usuariosVisibles.filter(u => u.estado === e.value).length }))} />
          {(roles.length > 0 || estados.length > 0) && <BotonTextoFiltro onClick={() => { setRoles([]); setEstados([]); }}>Limpiar filtros</BotonTextoFiltro>}
        </BarraFiltros>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20" style={{ ...tarjetaBase, color: 'var(--muted-foreground)' }}>Cargando usuarios…</div>
      ) : filtered.length === 0 ? (
        <Vacio icono={Search} titulo="Sin resultados" texto="Ningún usuario coincide con la búsqueda o los filtros."
          accion={<Button variant="muted" size="md" icon={X} onClick={() => { setSearch(''); setRoles([]); setEstados([]); }}>Limpiar filtros</Button>} />
      ) : vista === 'card' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(290px, 100%), 1fr))' }}>
          {filtered.map(u => (
            <div key={u.id} style={{ ...tarjetaBase, padding: 16 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarAgente esDuar={esDelDuar(u)} esConductor={false} esRecursoCritico={false} tamano={40} iniciales={iniciales(u)} />
                  <div className="min-w-0">
                    <p className="truncate" style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 600 }}>{u.nombre} {u.apellido}</p>
                    <p className="truncate" style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))' }}>{u.email}</p>
                  </div>
                </div>
                {acciones(u)}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-3"><RolPill rol={u.rol} /><StatusBadge estado={u.estado} size="sm" /></div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <Dato titulo="DNI">{formatearDni(u.dni)}</Dato>
                <Dato titulo="Dotación"><Dotacion u={u} /></Dato>
                <Dato titulo="Especialidad">{u.especialidadId ? especialidadNombrePorId(u.especialidadId) : <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>Sin especialidad</span>}</Dato>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TablaFija cols={[{ l: 'Usuario', w: 250 }, { l: 'DNI', w: 120 }, { l: 'Rol', w: 150 }, { l: 'Especialidad', w: 170 }, { l: 'Dotación', w: 220 }, { l: 'Estado', w: 120 }, { l: '', w: 110 }]}>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 'var(--text-base)', color: 'var(--foreground)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarAgente esDuar={esDelDuar(u)} esConductor={false} esRecursoCritico={false} tamano={32} iniciales={iniciales(u)} />
                    <div className="min-w-0">
                      <p className="truncate" style={{ margin: 0, fontWeight: 500 }}>{u.nombre} {u.apellido}</p>
                      <p className="truncate" style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 'var(--text-label)' }}>{formatearDni(u.dni)}</td>
                <td style={{ padding: '12px 16px' }}><RolPill rol={u.rol} /></td>
                <td style={{ padding: '12px 16px' }}>{u.especialidadId ? especialidadNombrePorId(u.especialidadId) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}</td>
                <td style={{ padding: '12px 16px' }}><Dotacion u={u} /></td>
                <td style={{ padding: '12px 16px' }}><StatusBadge estado={u.estado} size="sm" /></td>
                <td style={{ padding: '12px 16px' }}>{acciones(u)}</td>
              </tr>
            ))}
          </tbody>
        </TablaFija>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        // `m-auto` en el hijo (y no `items-center`) centra cuando entra y deja que se desplace desde
        // arriba cuando no: con `items-center` el borde superior quedaba cortado (Testeo 15/10, punto 20).
        <div className="fixed inset-0 z-50 flex p-4 overflow-y-auto" style={{ background: 'var(--scrim-modal)' }}>
          <div
            className="w-full max-w-[540px] rounded-[var(--radius-card)] p-4 sm:p-6 m-auto"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-semibold)' }}>
                {modal === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'DNI *', key: 'dni', type: 'text', span: false,
                  inputMode: 'numeric' as const, autoComplete: 'off',
                  filtro: (v: string) => soloDigitos(v).slice(0, 8),
                  formato: formatearDni,
                },
                {
                  label: 'Nombre *', key: 'nombre', type: 'text', span: false, autoComplete: 'off',
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35),
                  limpiar: limpiarTexto,
                },
                {
                  label: 'Apellido *', key: 'apellido', type: 'text', span: false, autoComplete: 'off',
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35),
                  limpiar: limpiarTexto,
                },
                {
                  label: 'Email *', key: 'email', type: 'email', span: true, autoComplete: 'off', filtro: filtrarEmail,
                  ayuda: cambiaEmail ? 'Al cambiar el correo, la cuenta vuelve a Pendiente y se envía un correo de confirmación a la dirección nueva.' : undefined,
                },
                {
                  // La contraseña actual no se puede mostrar: se guarda cifrada y no
                  // tiene vuelta atrás (Testeo 13/10, punto 9).
                  label: modal === 'create' ? 'Contraseña *' : 'Contraseña nueva', key: 'password', type: 'password', span: true,
                  autoComplete: 'new-password', filtro: (v: string) => v.slice(0, PASSWORD_MAX),
                  placeholder: modal === 'create' ? '' : 'Sin cambios',
                  ayuda: modal === 'create'
                    ? AYUDA_PASSWORD
                    : `La contraseña actual no se muestra porque se guarda cifrada. Escribí una sólo si querés cambiarla: ${AYUDA_PASSWORD.charAt(0).toLowerCase()}${AYUDA_PASSWORD.slice(1)}`,
                },
                // Se pide dos veces: al crear siempre, al modificar sólo si se escribió una nueva.
                ...((modal === 'create' || form.password) ? [{
                  label: modal === 'create' ? 'Repetir contraseña *' : 'Repetir contraseña nueva', key: 'passwordConfirm', type: 'password', span: true,
                  autoComplete: 'new-password', filtro: (v: string) => v.slice(0, PASSWORD_MAX),
                }] : []),
                {
                  label: modal === 'create' ? 'Fecha de Nacimiento *' : 'Fecha de Nacimiento', key: 'fechaNacimiento', type: 'date', span: false, autoComplete: 'off',
                },
                {
                  label: 'Teléfono', key: 'telefono', type: 'tel', span: false,
                  inputMode: 'numeric' as const, autoComplete: 'off', placeholder: PLACEHOLDER_TELEFONO, ayuda: AYUDA_TELEFONO,
                  filtro: (v: string) => soloDigitos(v).slice(0, 10),
                  formato: formatearTelefono,
                },
              ].map(f => {
                const raw = (form as any)[f.key] as string;
                const valorMostrado = f.formato ? f.formato(raw) : raw;
                return (
                  <div key={f.key} className={f.span ? 'sm:col-span-2' : ''}>
                    <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {f.label}
                    </label>
                    {f.type === 'password' ? (
                      <CampoPassword
                        name={`usuario-${f.key}`}
                        autoComplete={f.autoComplete}
                        placeholder={(f as any).placeholder}
                        value={valorMostrado}
                        onChange={e => {
                          setForm({ ...form, [f.key]: f.filtro ? f.filtro(e.target.value) : e.target.value });
                          if (erroresForm[f.key]) setErroresForm({ ...erroresForm, [f.key]: '' });
                        }}
                        className="w-full px-3 py-2 rounded-lg border outline-none"
                        style={{ ...fieldStyle, border: erroresForm[f.key] ? '1px solid #dc2626' : fieldStyle.border }}
                      />
                    ) : f.type === 'date' ? (
                      <CampoFecha
                        value={valorMostrado}
                        onChange={v => {
                          setForm({ ...form, [f.key]: v });
                          if (erroresForm[f.key]) setErroresForm({ ...erroresForm, [f.key]: '' });
                        }}
                        className="w-full px-3 py-2 rounded-lg border outline-none"
                        style={{ ...fieldStyle, border: erroresForm[f.key] ? '1px solid #dc2626' : fieldStyle.border }}
                      />
                    ) : (
                      <input
                        type={f.type}
                        inputMode={f.inputMode}
                        name={`usuario-${f.key}`}
                        autoComplete={f.autoComplete}
                        placeholder={(f as any).placeholder}
                        value={valorMostrado}
                        onChange={e => {
                          const el = e.target;
                          const digitos = digitosAntesDelCursor(el);   // para no perder el lugar al reformatear (punto 22)
                          const v = f.filtro ? f.filtro(el.value) : el.value;
                          setForm({ ...form, [f.key]: v });
                          if (erroresForm[f.key]) setErroresForm({ ...erroresForm, [f.key]: '' });
                          if (f.formato) reponerCursor(el, digitos);
                        }}
                        onBlur={(f as any).limpiar ? () => setForm(prev => ({ ...prev, [f.key]: (f as any).limpiar((prev as any)[f.key]) })) : undefined}
                        className="w-full px-3 py-2 rounded-lg border outline-none"
                        style={{ ...fieldStyle, border: erroresForm[f.key] ? '1px solid #dc2626' : fieldStyle.border }}
                      />
                    )}
                    {erroresForm[f.key] ? (
                      <p style={{ color: '#dc2626', fontSize: 'calc(11px * var(--escala-texto))', marginTop: '4px' }}>{erroresForm[f.key]}</p>
                    ) : (f as any).ayuda && (
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', marginTop: '4px', lineHeight: 1.4 }}>{(f as any).ayuda}</p>
                    )}
                  </div>
                );
              })}

              {/* ── Institución (determina si puede ser Líder de grupo) ── */}
              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Institución</label>
                <select
                  value={form.institucionId}
                  // Al cambiar de institución se limpia la dotación: una base del
                  // DUAR no puede quedar colgada de la Policía (la BD lo rechaza).
                  onChange={e => setForm({ ...form, institucionId: e.target.value, dotacionId: '' })}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  <option value="">— Seleccioná la institución —</option>
                  {catInstituciones.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
              </div>

              {/* ── Dotación: sólo si la institución elegida tiene destacamentos ── */}
              {dotacionesDe(form.institucionId).length > 0 && (
                <div>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Dotación</label>
                  <select
                    value={form.dotacionId}
                    onChange={e => setForm({ ...form, dotacionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={fieldStyle}
                  >
                    <option value="">— Seleccioná la dotación —</option>
                    {dotacionesDe(form.institucionId).map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Rol</label>
                <select
                  value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value as Rol })}
                  disabled={editandomePropio}
                  title={editandomePropio ? 'No podés cambiar tu propio rol' : undefined}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={{ ...fieldStyle, ...(editandomePropio ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                >
                  <option value="agente">Agente</option>
                  <option value="coordinador">Coordinador</option>
                  {(soyAdmin || form.rol === 'administrador') && <option value="administrador">Administrador</option>}
                </select>
                {editandomePropio && (
                  <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>No podés cambiar tu propio rol.</p>
                )}
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Especialidad</label>
                <select
                  value={form.especialidadId}
                  onChange={e => setForm({ ...form, especialidadId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  {/* Derivadas del catálogo real. Antes esta lista estaba
                      hardcodeada: incluía "Conductor" (ya no es una
                      especialidad, es un estado táctico) y le faltaban
                      Canes, Defensa Civil y Dron. */}
                  <option value="">— No especificado —</option>
                  {catEspecialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Grupo Sanguíneo</label>
                <select
                  value={form.grupo_sanguineo}
                  onChange={e => setForm({ ...form, grupo_sanguineo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  <option value="">— No especificado —</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Alergias {form.alergiaIds.length > 0 && `(${form.alergiaIds.length} seleccionadas)`}
                </label>
                {/* N:M real contra cat_alergias: un agente puede tener más de
                    una, por eso es un grupo de checkboxes y no un <select>. */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 p-3 rounded-lg border"
                  style={{ background: 'var(--input-background)', borderColor: 'var(--border)' }}
                >
                  {catAlergias.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)' }}>
                      <input
                        type="checkbox"
                        checked={form.alergiaIds.includes(a.id)}
                        onChange={e => setForm({
                          ...form,
                          alergiaIds: e.target.checked
                            ? [...form.alergiaIds, a.id]
                            : form.alergiaIds.filter(id => id !== a.id),
                        })}
                      />
                      {a.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {/* Estado: solo visible al editar, nunca al crear */}
              {modal === 'edit' && editandoPendiente && (
                <div>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Estado</label>
                  <div
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ ...fieldStyle, opacity: 0.7, cursor: 'not-allowed' }}
                    title="Pasa a Activo cuando la persona confirma su correo"
                  >
                    Pendiente
                  </div>
                  <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                    Pasa a Activo cuando la persona confirma su correo. Si no le llegó, reenvialo desde el listado.
                  </p>
                </div>
              )}
              {modal === 'edit' && !editandoPendiente && (
                <div>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value as EstadoUsuario })}
                    disabled={editandomePropio}
                    title={editandomePropio ? 'No podés desactivar tu propia cuenta' : undefined}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={{ ...fieldStyle, ...(editandomePropio ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
            </div>

            {errorModal && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg mt-5"
                style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
              >
                <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{errorModal}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-[var(--radius-button)] border" style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={guardando} className="px-4 py-2 rounded-[var(--radius-button)] text-[var(--primary-foreground)] disabled:cursor-wait" style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', opacity: guardando ? 0.7 : 1 }}>
                {guardando
                  ? (modal === 'create' ? 'Creando…' : 'Guardando…')
                  : (modal === 'create' ? 'Crear Usuario' : 'Guardar Cambios')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--scrim-modal)' }}>
          <div className="w-full max-w-[400px] rounded-[var(--radius-card)] p-6" style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}>

            {selected.id === usuarioActual?.id ? (
              /* ── Bloqueo: autoeliminación ── */
              <>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fef3c7' }}>
                  <Shield size={20} color="#b45309" />
                </div>
                <h2 className="mb-2" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Acción no permitida
                </h2>
                <p className="mb-5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
                  No podés eliminar tu propia cuenta mientras tenés la sesión activa. Pedile a otro administrador que realice esta acción.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-[var(--radius-button)]"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Entendido
                  </button>
                </div>
              </>
            ) : (
              /* ── Confirmación normal ── */
              <>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fee2e2' }}>
                  <Trash2 size={20} color="#dc2626" />
                </div>
                <h2 className="mb-2" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Eliminar Usuario
                </h2>
                <p className="mb-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                  ¿Seguro que querés eliminar a <strong>{selected.nombre} {selected.apellido}</strong>?
                </p>
                <div
                  className="p-3 rounded-lg mb-5 flex flex-col gap-1"
                  style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <p style={{ color: '#dc2626', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                    ¿Qué ocurre al eliminar?
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', paddingLeft: '1rem', lineHeight: 1.7 }}>
                    <li>El usuario desaparece del sistema visualmente.</li>
                    <li>Se desvincula de todos los operativos y grupos.</li>
                    <li>Su registro queda como auditoría interna (soft-delete).</li>
                    <li>Si la persona vuelve a registrarse con el mismo DNI, se reactiva esta cuenta con su historial. Su correo queda libre para crear otra cuenta.</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-[var(--radius-button)] border"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-[var(--radius-button)] text-white"
                    style={{ background: 'var(--destructive)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Eliminar usuario
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}