import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Shield, User, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Usuario, Rol, EstadoUsuario, Especialidad } from '../data/mockData';
import StatusBadge from '../components/shared/StatusBadge';

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
  rol: 'agente' as Rol, fechaNacimiento: '', telefono: '', alergias: '',
  dotacion: '', especialidad: '' as Especialidad | '', grupo_sanguineo: '',
  estado: 'activo' as EstadoUsuario,
};

export default function Usuarios() {
  const { data, usuario: usuarioActual, addUsuario, updateUsuario, deleteUsuario } = useApp();
  const { usuarios } = data;
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState<Rol | ''>('');

  // Los usuarios eliminados son invisibles en toda la UI — es un tombstone de base de datos
  const usuariosVisibles = usuarios.filter(u => u.estado !== 'eliminado');

  const filtered = usuariosVisibles.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nombre.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) || u.dni.includes(q);
    const matchRol = !filterRol || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setModal('create');
  };

  const openEdit = (u: Usuario) => {
    setSelected(u);
    setForm({
      dni: u.dni, nombre: u.nombre, apellido: u.apellido,
      email: u.email, password: u.password,
      rol: u.rol, fechaNacimiento: u.fechaNacimiento || '',
      telefono: u.telefono || '', alergias: u.alergias || '',
      dotacion: u.dotacion || '', especialidad: u.especialidad || '',
      grupo_sanguineo: u.grupo_sanguineo || '', estado: u.estado,
    });
    setModal('edit');
  };

  const handleSave = () => {
    if (!form.nombre || !form.apellido || !form.email || !form.dni) return;
    const userData = {
      dni: form.dni, nombre: form.nombre, apellido: form.apellido,
      email: form.email, password: form.password || '1234',
      rol: form.rol,
      // On create: always 'activo'. On edit: use form value.
      estado: modal === 'create' ? ('activo' as EstadoUsuario) : form.estado,
      fechaNacimiento: form.fechaNacimiento || undefined,
      telefono: form.telefono || undefined,
      alergias: form.alergias || undefined,
      dotacion: form.dotacion || undefined,
      especialidad: (form.especialidad as Especialidad) || undefined,
      grupo_sanguineo: form.grupo_sanguineo || undefined,
      // `caminante` es TÁCTICO: se infiere al dar de alta al agente en un
      // operativo, no al crear el usuario global (Decisión A/C).
    };
    if (modal === 'create') {
      addUsuario(userData);
    } else if (selected) {
      updateUsuario(selected.id, userData);
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (selected) deleteUsuario(selected.id);
    setModal(null);
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
            Gestión de usuarios del sistema — {usuariosVisibles.length} registrados
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

      {/* Table */}
      <div
        className="rounded-[var(--radius-card)] overflow-hidden"
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
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>{u.dni}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: rolC.bg, color: rolC.color, fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}
                      >
                        {rolIcon(u.rol)}
                        <span className="capitalize">{u.rol}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                      {u.especialidad || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
                      {u.dotacion || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={u.estado} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                { label: 'DNI *', key: 'dni', type: 'text', span: false },
                { label: 'Nombre *', key: 'nombre', type: 'text', span: false },
                { label: 'Apellido *', key: 'apellido', type: 'text', span: false },
                { label: 'Email *', key: 'email', type: 'email', span: true },
                { label: 'Contraseña', key: 'password', type: 'password', span: false },
                { label: 'Fecha de Nacimiento', key: 'fechaNacimiento', type: 'date', span: false },
                { label: 'Teléfono', key: 'telefono', type: 'tel', span: false },
                { label: 'Dotación', key: 'dotacion', type: 'text', span: false },
              ].map(f => (
                <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                  <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border outline-none"
                    style={fieldStyle}
                  />
                </div>
              ))}

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
                  value={form.especialidad}
                  onChange={e => setForm({ ...form, especialidad: e.target.value as Especialidad | '' })}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  <option value="">—</option>
                  <option value="paramédico">Paramédico</option>
                  <option value="conductor">Conductor</option>
                  <option value="bombero">Bombero</option>
                  <option value="bombero voluntario">Bombero voluntario</option>
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
                <label className="block mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>Alergias</label>
                <select
                  value={form.alergias}
                  onChange={e => setForm({ ...form, alergias: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border outline-none"
                  style={fieldStyle}
                >
                  <option value="">— Ninguna —</option>
                  <option value="Penicilina">Penicilina</option>
                  <option value="Amoxicilina / Ampicilina">Amoxicilina / Ampicilina</option>
                  <option value="Aspirina / AINEs">Aspirina / AINEs</option>
                  <option value="Polen">Polen</option>
                  <option value="Ácaros del polvo">Ácaros del polvo</option>
                  <option value="Látex">Látex</option>
                  <option value="Frutos secos">Frutos secos</option>
                  <option value="Mariscos / Crustáceos">Mariscos / Crustáceos</option>
                  <option value="Gluten">Gluten</option>
                  <option value="Lácteos">Lácteos</option>
                  <option value="Picadura de insectos">Picadura de insectos</option>
                  <option value="Yodo / Contraste radiológico">Yodo / Contraste radiológico</option>
                  <option value="Otros">Otros</option>
                </select>
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