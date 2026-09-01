import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Shield, User, UserCheck, AlertCircle, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { Usuario, Rol, EstadoUsuario, catInstituciones, catEspecialidades, catAlergias, dotacionesDe, institucionLabel, especialidadNombrePorId } from '../data/mockData';
import { usuariosApi, ApiError, UsuarioApi } from '../services/api';
import StatusBadge from '../components/shared/StatusBadge';
import {
  validarNombre, validarApellido, validarDni, validarTelefono,
  validarFechaNacimiento, fechaMaximaNacimiento,
  soloDigitos, formatearDni, formatearTelefono,
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
    fechaNacimiento: u.fechaNacimiento ?? undefined,
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

const rolIcon = (rol: Rol) => {
  if (rol === 'administrador') return <Shield size={13} style={{ color: 'var(--primary)' }} />;
  if (rol === 'coordinador') return <UserCheck size={13} style={{ color: '#2563eb' }} />;
  return <User size={13} style={{ color: 'var(--muted-foreground)' }} />;
};

const rolColor = (rol: Rol) => {
  if (rol === 'administrador') return { bg: 'rgba(229,75,75,0.1)', color: 'var(--primary)' };
  if (rol === 'coordinador') return { bg: '#dbeafe', color: '#1d4ed8' };
  return { bg: 'var(--muted)', color: 'var(--muted-foreground)' };
};

const emptyForm = {
  dni: '', nombre: '', apellido: '', email: '', password: '',
  rol: 'agente' as Rol, fechaNacimiento: '', telefono: '',
  alergiaIds: [] as string[],
  institucionId: '', dotacionId: '', especialidadId: '', grupo_sanguineo: '',
  estado: 'activo' as EstadoUsuario,
};

export default function Usuarios() {
  const { usuario: usuarioActual } = useApp();
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState<Rol | ''>('');

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
    const matchRol = !filterRol || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setErroresForm({});
    setModal('create');
  };

  /** id del usuario cuyo reenvío está en curso — deshabilita ese botón puntual. */
  const [reenviando, setReenviando] = useState<string | null>(null);

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

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setForm({
      dni: u.dni, nombre: u.nombre, apellido: u.apellido,
      email: u.email, password: u.password,
      rol: u.rol, fechaNacimiento: u.fechaNacimiento || '',
      telefono: u.telefono || '', alergiaIds: u.alergiaIds || [],
      institucionId: u.institucionId || '', dotacionId: u.dotacionId || '', especialidadId: u.especialidadId || '',
      grupo_sanguineo: u.grupo_sanguineo || '', estado: u.estado,
    });
    setErroresForm({});
    setModal('edit');
  };

  /** CU-05 Crear / CU-06 Modificar — persisten contra PostgreSQL. */
  const handleSave = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.dni) return;
    setErrorApi('');

    const errores: Record<string, string> = {};
    const errNombre = validarNombre(form.nombre); if (errNombre) errores.nombre = errNombre;
    const errApellido = validarApellido(form.apellido); if (errApellido) errores.apellido = errApellido;
    const errDni = validarDni(form.dni); if (errDni) errores.dni = errDni;
    const errTelefono = validarTelefono(form.telefono); if (errTelefono) errores.telefono = errTelefono;
    const errFechaNacimiento = validarFechaNacimiento(form.fechaNacimiento); if (errFechaNacimiento) errores.fechaNacimiento = errFechaNacimiento;
    setErroresForm(errores);
    if (Object.keys(errores).length > 0) {
      setErrorApi('Revisá los campos marcados en rojo.');
      return;
    }

    const datos = {
      dni: form.dni,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
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

    try {
      if (modal === 'create') {
        // El backend hashea con bcrypt (CU-05 paso 4); acá nunca se guarda en claro.
        await usuariosApi.crear({ ...datos, password: form.password || '1234' });
      } else if (selected) {
        await usuariosApi.actualizar(selected.id, {
          ...datos,
          // CU-06 paso 5: la contraseña sólo se sobrescribe si se cargó una nueva.
          ...(form.password ? { password: form.password } : {}),
          // Otro campo que nunca se enviaba: el toggle Activo/Inactivo del
          // formulario no hacía nada al guardar. La BD usa MAYÚSCULAS.
          estado: form.estado.toUpperCase(),
        });
      }
      setModal(null);
      await cargarUsuarios();
    } catch (err) {
      // Duplicado de DNI/email (CU-05 paso 3.1) u otro rechazo del servidor
      setErrorApi(err instanceof ApiError ? err.message : 'No se pudo guardar el usuario.');
    }
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

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>Usuarios</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
            {cargando
              ? 'Cargando usuarios…'
              : `Gestión de usuarios del sistema — ${usuariosVisibles.length} registrados`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] text-white hover:opacity-90"
          style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Rechazos del servidor: duplicados (CU-05 3.1), autobloqueo (CU-07 4.1),
          último administrador, o caída de la API. */}
      {errorApi && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg mb-4"
          style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
        >
          <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{errorApi}</span>
          <button
            onClick={() => setErrorApi('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, DNI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border outline-none"
            style={fieldStyle}
          />
        </div>
        <select
          value={filterRol}
          onChange={e => setFilterRol(e.target.value as Rol | '')}
          className="px-3 py-2 rounded-lg border outline-none"
          style={fieldStyle}
        >
          <option value="">Todos los roles</option>
          <option value="administrador">Administrador</option>
          <option value="coordinador">Coordinador</option>
          <option value="agente">Agente</option>
        </select>
      </div>

      {/* Mobile: tarjetas (md:hidden). Antes la tabla se achicaba con
          overflow-x-auto, pero eso escondía Rol/Especialidad/Dotación/Estado
          Y los botones de editar/eliminar fuera de pantalla, sin ninguna
          pista de que había que scrollear para llegar a ellos. */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map(u => {
          const rolC = rolColor(u.rol);
          return (
            <div
              key={u.id}
              className="rounded-[var(--radius-card)] p-4"
              style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 'var(--font-weight-bold)' }}
                  >
                    {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                      {u.nombre} {u.apellido}
                    </p>
                    <p className="truncate" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {u.estado === 'pendiente' && (
                    <button
                      onClick={() => handleReenviarConfirmacion(u)}
                      disabled={reenviando === u.id}
                      className="p-2 rounded-lg"
                      style={{ color: 'var(--muted-foreground)', background: 'var(--muted)', opacity: reenviando === u.id ? 0.5 : 1 }}
                      aria-label="Reenviar correo de confirmación"
                      title="Reenviar correo de confirmación"
                    >
                      <MailCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(u)}
                    className="p-2 rounded-lg"
                    style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
                    aria-label="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => { setSelected(u); setModal('delete'); }}
                    disabled={u.id === usuarioActual?.id}
                    title={u.id === usuarioActual?.id ? 'No podés eliminar tu propia cuenta' : 'Eliminar usuario'}
                    className="p-2 rounded-lg"
                    style={{
                      color: u.id === usuarioActual?.id ? 'var(--border)' : 'var(--muted-foreground)',
                      background: 'var(--muted)',
                    }}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: rolC.bg, color: rolC.color, fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
                >
                  {rolIcon(u.rol)}
                  <span className="capitalize">{u.rol}</span>
                </span>
                <StatusBadge estado={u.estado} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DNI</p>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>{formatearDni(u.dni)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Especialidad</p>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>{especialidadNombrePorId(u.especialidadId)}</p>
                </div>
                <div className="col-span-2">
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dotación</p>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>{institucionLabel(u)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            className="rounded-[var(--radius-card)] px-4 py-10 text-center"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}
          >
            No se encontraron usuarios
          </div>
        )}
      </div>

      {/* Desktop: tabla completa (oculta en mobile, ver arriba) */}
      <div
        className="rounded-[var(--radius-card)] overflow-hidden hidden md:block"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Usuario', 'DNI', 'Rol', 'Especialidad', 'Dotación', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => {
                const rolC = rolColor(u.rol);
                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 'var(--font-weight-bold)' }}
                        >
                          {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                        </div>
                        <div>
                          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                            {u.nombre} {u.apellido}
                          </p>
                          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>{formatearDni(u.dni)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: rolC.bg, color: rolC.color, fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
                      >
                        {rolIcon(u.rol)}
                        <span className="capitalize">{u.rol}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                      {especialidadNombrePorId(u.especialidadId)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                      {institucionLabel(u)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={u.estado} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.estado === 'pendiente' && (
                          <button
                            onClick={() => handleReenviarConfirmacion(u)}
                            disabled={reenviando === u.id}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--muted-foreground)', opacity: reenviando === u.id ? 0.5 : 1 }}
                            title="Reenviar correo de confirmación"
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <MailCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { setSelected(u); setModal('delete'); }}
                          disabled={u.id === usuarioActual?.id}
                          title={u.id === usuarioActual?.id ? 'No podés eliminar tu propia cuenta' : 'Eliminar usuario'}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            color: u.id === usuarioActual?.id ? 'var(--border)' : 'var(--muted-foreground)',
                            cursor: u.id === usuarioActual?.id ? 'not-allowed' : 'pointer',
                          }}
                          onMouseEnter={e => {
                            if (u.id !== usuarioActual?.id) {
                              (e.currentTarget as HTMLElement).style.background = '#fee2e2';
                              (e.currentTarget as HTMLElement).style.color = '#dc2626';
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = u.id === usuarioActual?.id ? 'var(--border)' : 'var(--muted-foreground)';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-[540px] rounded-[var(--radius-card)] p-6 my-4"
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

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'DNI *', key: 'dni', type: 'text', span: false,
                  inputMode: 'numeric' as const,
                  filtro: (v: string) => soloDigitos(v).slice(0, 8),
                  formato: formatearDni,
                },
                {
                  label: 'Nombre *', key: 'nombre', type: 'text', span: false,
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35),
                },
                {
                  label: 'Apellido *', key: 'apellido', type: 'text', span: false,
                  filtro: (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35),
                },
                { label: 'Email *', key: 'email', type: 'email', span: true },
                { label: 'Contraseña', key: 'password', type: 'password', span: false },
                { label: 'Fecha de Nacimiento', key: 'fechaNacimiento', type: 'date', span: false, max: fechaMaximaNacimiento() },
                {
                  label: 'Teléfono', key: 'telefono', type: 'tel', span: false,
                  inputMode: 'numeric' as const,
                  filtro: (v: string) => soloDigitos(v).slice(0, 10),
                  formato: formatearTelefono,
                },
              ].map(f => {
                const raw = (form as any)[f.key] as string;
                const valorMostrado = f.formato ? f.formato(raw) : raw;
                return (
                  <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                    <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      inputMode={f.inputMode}
                      max={(f as any).max}
                      value={valorMostrado}
                      onChange={e => {
                        const v = f.filtro ? f.filtro(e.target.value) : e.target.value;
                        setForm({ ...form, [f.key]: v });
                        if (erroresForm[f.key]) setErroresForm({ ...erroresForm, [f.key]: '' });
                      }}
                      className="w-full px-3 py-2 rounded-lg border outline-none"
                      style={{ ...fieldStyle, border: erroresForm[f.key] ? '1px solid #dc2626' : fieldStyle.border }}
                    />
                    {erroresForm[f.key] && (
                      <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{erroresForm[f.key]}</p>
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
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  <option value="agente">Agente</option>
                  <option value="coordinador">Coordinador</option>
                  <option value="administrador">Administrador</option>
                </select>
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

              <div className="col-span-2">
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Alergias {form.alergiaIds.length > 0 && `(${form.alergiaIds.length} seleccionadas)`}
                </label>
                {/* N:M real contra cat_alergias: un agente puede tener más de
                    una, por eso es un grupo de checkboxes y no un <select>. */}
                <div
                  className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 rounded-lg border"
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
              {modal === 'edit' && (
                <div>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value as EstadoUsuario })}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={fieldStyle}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-[var(--radius-button)] border" style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-[var(--radius-button)] text-white" style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                {modal === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
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
                    <li>Se puede crear un nuevo usuario con el mismo DNI o email.</li>
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