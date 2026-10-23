/**
 * Mis datos (diseño CALÍVAR, 23/10): el usuario logueado ve y edita sus propios datos.
 * Escritorio = ventana centrada; mobile/tablet = pantalla completa (`pantalla`). La usan el
 * coordinador/administrador (menú de cuenta y hoja de Perfil) y el agente (su portal).
 *
 * Son los mismos datos que el sistema ya guarda (PUT /api/auth/me): el diseño suma un contacto
 * de emergencia y alergias en texto libre, pero el 23/10 se decidió dejarlo como está hoy —
 * sin contacto de emergencia y con las alergias de la lista. DNI, email, estado y rol no se
 * editan acá: quedan reservados al panel de Usuarios (CU-06).
 */
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Pencil, X, User, Phone, Shield, HeartPulse, AlertCircle, Loader2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { institucionLabel, especialidadNombrePorId, catInstituciones, catEspecialidades, catAlergias, dotacionesDe } from '../../data/mockData';
import CampoFecha from './CampoFecha';
import {
  validarNombre, validarApellido, validarTelefono, validarFechaNacimiento,
  soloDigitos, formatearTelefono, formatearDni, limpiarTexto, digitosAntesDelCursor, reponerCursor,
  AYUDA_TELEFONO, PLACEHOLDER_TELEFONO,
} from '../../utils/validacionUsuario';

const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function edad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return '—';
  // Al mediodía local: «YYYY-MM-DD» solo se lee como UTC y en Argentina caería el día anterior.
  const n = new Date(`${fechaNacimiento.slice(0, 10)}T12:00:00`), hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e--;
  return Number.isFinite(e) ? `${e} años` : '—';
}
const fechaCorta = (s?: string) => { if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

const tarjeta = { background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--card-border)' } as const;
const campo = {
  width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '9px 12px', borderRadius: 'var(--radius-input)',
  border: '1px solid var(--border)', background: 'var(--input-background)', color: 'var(--foreground)',
  fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', outline: 'none',
} as const;

function Bloque({ titulo, icono: I, children }: { titulo: string; icono: typeof User; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3" style={{ ...tarjeta, padding: '14px 16px' }}>
      <p className="flex items-center gap-1.5" style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-overline)' }}>
        <I size={13} />{titulo}
      </p>
      {children}
    </div>
  );
}
function Dato({ l, v }: { l: string; v?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span style={{ fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>{l}</span>
      <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-word' }}>{v || '—'}</span>
    </div>
  );
}
function Campo({ l, req, ayuda, error, children }: { l: string; req?: boolean; ayuda?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>{l}{req && <span style={{ color: 'var(--destructive)' }}> *</span>}</span>
      {children}
      {error ? <span style={{ fontSize: 'var(--text-small)', color: 'var(--destructive)' }}>{error}</span>
        : ayuda && <span style={{ fontSize: 'var(--text-small)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{ayuda}</span>}
    </label>
  );
}

export default function MisDatosModal({ pantalla = false, inicial = 'ver', onClose }: { pantalla?: boolean; inicial?: 'ver' | 'editar'; onClose: () => void }) {
  const { usuario, actualizarPerfilPropio } = useApp();
  const formDe = () => ({
    nombre: usuario?.nombre ?? '', apellido: usuario?.apellido ?? '',
    // El campo de fecha sólo entiende «YYYY-MM-DD» (Testeo 13/10, punto 10).
    telefono: usuario?.telefono ?? '', fechaNacimiento: (usuario?.fechaNacimiento ?? '').slice(0, 10),
    institucionId: usuario?.institucionId ?? '', dotacionId: usuario?.dotacionId ?? '',
    especialidadId: usuario?.especialidadId ?? '', grupoSanguineo: usuario?.grupo_sanguineo ?? '',
    alergiaIds: usuario?.alergiaIds ?? [],
  });
  const [modo, setModo] = useState<'ver' | 'editar'>(inicial);
  const [f, setF] = useState(formDe);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  if (!usuario) return null;

  const ini = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  const rol = usuario.rol ? usuario.rol[0].toUpperCase() + usuario.rol.slice(1) : '—';
  const institucion = institucionLabel(usuario);
  const alergias = catAlergias.filter(a => (usuario.alergiaIds ?? []).includes(a.id)).map(a => a.nombre).join(', ');
  const cols = pantalla ? 'grid-cols-1' : 'grid-cols-2';
  const cols3 = pantalla ? 'grid-cols-1' : 'grid-cols-3';

  const editar = () => { setF(formDe()); setErrores({}); setError(''); setModo('editar'); };
  const cancelar = () => { if (inicial === 'editar') onClose(); else setModo('ver'); };
  const poner = (k: keyof ReturnType<typeof formDe>, v: unknown) => {
    setF(p => ({ ...p, [k]: v })); setError('');
    if (errores[k]) setErrores(e => ({ ...e, [k]: '' }));
  };

  const guardar = async () => {
    // Sin espacios de más (Testeo 13/10, punto 14): lo que se valida es lo que se guarda.
    const nombre = limpiarTexto(f.nombre), apellido = limpiarTexto(f.apellido);
    if (nombre !== f.nombre || apellido !== f.apellido) setF(p => ({ ...p, nombre, apellido }));
    const e: Record<string, string> = {};
    const en = validarNombre(nombre); if (en) e.nombre = en;
    const ea = validarApellido(apellido); if (ea) e.apellido = ea;
    const et = validarTelefono(f.telefono); if (et) e.telefono = et;
    const ef = validarFechaNacimiento(f.fechaNacimiento, !!usuario.fechaNacimiento); if (ef) e.fechaNacimiento = ef;
    setErrores(e);
    if (Object.keys(e).length) { setError('Revisá los campos marcados en rojo.'); return; }
    setGuardando(true); setError('');
    const r = await actualizarPerfilPropio({
      nombre, apellido,
      telefono: f.telefono || undefined, fechaNacimiento: f.fechaNacimiento || undefined,
      institucionId: f.institucionId || undefined, dotacionId: f.dotacionId || undefined,
      especialidadId: f.especialidadId || undefined, grupoSanguineo: f.grupoSanguineo || undefined,
      alergiaIds: f.alergiaIds,
    });
    setGuardando(false);
    if (r !== 'ok') { setError(r); return; }
    if (inicial === 'editar') { onClose(); return; }
    setModo('ver'); setGuardado(true); setTimeout(() => setGuardado(false), 2600);
  };

  const conError = (k: string) => (errores[k] ? { borderColor: 'var(--destructive)' } : null);
  const botonIcono = (I: typeof X, etiqueta: string, onClick: () => void, tinte = false) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} title={etiqueta}
      className="flex items-center justify-center shrink-0"
      style={{ width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: tinte ? 'color-mix(in srgb, var(--primary) 16%, transparent)' : 'transparent', color: 'var(--foreground)' }}>
      <I size={18} />
    </button>
  );

  const ver = (
    <>
      <Bloque titulo="Datos personales" icono={User}>
        <div className={`grid ${cols3} gap-3`}>
          <Dato l="DNI" v={formatearDni(usuario.dni)} /><Dato l="Fecha de nacimiento" v={fechaCorta(usuario.fechaNacimiento)} /><Dato l="Edad" v={edad(usuario.fechaNacimiento)} />
        </div>
      </Bloque>
      <Bloque titulo="Contacto" icono={Phone}>
        <div className={`grid ${cols3} gap-3`}>
          <Dato l="Teléfono" v={usuario.telefono ? formatearTelefono(usuario.telefono) : null} /><Dato l="Correo electrónico" v={usuario.email} />
        </div>
      </Bloque>
      <Bloque titulo="Institución" icono={Shield}>
        <div className={`grid ${cols3} gap-3`}>
          <Dato l="Dotación" v={institucion} /><Dato l="Rol en el sistema" v={rol} /><Dato l="Especialidad" v={especialidadNombrePorId(usuario.especialidadId)} />
        </div>
      </Bloque>
      <Bloque titulo="Datos médicos" icono={HeartPulse}>
        <div className={`grid ${cols3} gap-3`}>
          <Dato l="Grupo sanguíneo" v={usuario.grupo_sanguineo} /><Dato l="Alergias" v={alergias || 'Ninguna informada'} />
        </div>
      </Bloque>
    </>
  );

  const edicion = (
    <>
      <Bloque titulo="Datos personales" icono={User}>
        <div className={`grid ${cols} gap-3`}>
          <Campo l="Nombre" req error={errores.nombre}>
            <input type="text" value={f.nombre} style={{ ...campo, ...conError('nombre') }}
              onChange={e => poner('nombre', e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35))}
              onBlur={() => setF(p => ({ ...p, nombre: limpiarTexto(p.nombre) }))} />
          </Campo>
          <Campo l="Apellido" req error={errores.apellido}>
            <input type="text" value={f.apellido} style={{ ...campo, ...conError('apellido') }}
              onChange={e => poner('apellido', e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35))}
              onBlur={() => setF(p => ({ ...p, apellido: limpiarTexto(p.apellido) }))} />
          </Campo>
        </div>
        <div className={`grid ${cols} gap-3`}>
          <Campo l="DNI" ayuda="No se puede modificar.">
            <input readOnly value={formatearDni(usuario.dni)} style={{ ...campo, background: 'var(--muted)', color: 'var(--muted-foreground)' }} />
          </Campo>
          <Campo l="Fecha de nacimiento" error={errores.fechaNacimiento}>
            <CampoFecha value={f.fechaNacimiento} onChange={v => poner('fechaNacimiento', v)} style={{ ...campo, ...conError('fechaNacimiento') }} />
          </Campo>
        </div>
      </Bloque>
      <Bloque titulo="Contacto" icono={Phone}>
        <div className={`grid ${cols} gap-3`}>
          <Campo l="Teléfono" ayuda={AYUDA_TELEFONO} error={errores.telefono}>
            <input type="tel" inputMode="numeric" placeholder={PLACEHOLDER_TELEFONO} value={formatearTelefono(f.telefono)} style={{ ...campo, ...conError('telefono') }}
              onChange={e => {
                const el = e.target;
                const digitos = digitosAntesDelCursor(el);   // para no perder el lugar al reformatear (Testeo 15/10, punto 22)
                poner('telefono', soloDigitos(el.value).slice(0, 10));
                reponerCursor(el, digitos);
              }} />
          </Campo>
          <Campo l="Correo electrónico" ayuda="Lo cambia un administrador.">
            <input readOnly value={usuario.email} style={{ ...campo, background: 'var(--muted)', color: 'var(--muted-foreground)' }} />
          </Campo>
        </div>
      </Bloque>
      <Bloque titulo="Institución" icono={Shield}>
        <div className={`grid ${cols} gap-3`}>
          <Campo l="Institución">
            <select value={f.institucionId} onChange={e => { poner('institucionId', e.target.value); poner('dotacionId', ''); }} style={campo}>
              <option value="">— Seleccioná la institución —</option>
              {catInstituciones.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </Campo>
          {dotacionesDe(f.institucionId).length > 0 && (
            <Campo l="Dotación">
              <select value={f.dotacionId} onChange={e => poner('dotacionId', e.target.value)} style={campo}>
                <option value="">— Seleccioná la dotación —</option>
                {dotacionesDe(f.institucionId).map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </Campo>
          )}
          <Campo l="Especialidad">
            <select value={f.especialidadId} onChange={e => poner('especialidadId', e.target.value)} style={campo}>
              <option value="">— No especificado —</option>
              {catEspecialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <Campo l="Rol en el sistema" ayuda="El rol lo asigna un administrador.">
            <input readOnly value={rol} style={{ ...campo, background: 'var(--muted)', color: 'var(--muted-foreground)' }} />
          </Campo>
        </div>
      </Bloque>
      <Bloque titulo="Datos médicos" icono={HeartPulse}>
        <Campo l="Grupo sanguíneo">
          <select value={f.grupoSanguineo} onChange={e => poner('grupoSanguineo', e.target.value)} style={campo}>
            <option value="">— No especificado —</option>
            {GRUPOS_SANGUINEOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Campo>
        <div className="flex flex-col gap-1.5">
          <span style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>
            Alergias {f.alergiaIds.length > 0 && `(${f.alergiaIds.length} seleccionadas)`}
          </span>
          <div className={`grid ${cols} gap-x-3 gap-y-2 p-3 rounded-[var(--radius-input)]`} style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}>
            {catAlergias.map(a => (
              <label key={a.id} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', minHeight: 28 }}>
                <input type="checkbox" checked={f.alergiaIds.includes(a.id)} style={{ accentColor: 'var(--primary)' }}
                  onChange={e => poner('alergiaIds', e.target.checked ? [...f.alergiaIds, a.id] : f.alergiaIds.filter(id => id !== a.id))} />
                {a.nombre}
              </label>
            ))}
          </div>
        </div>
      </Bloque>
    </>
  );

  const cuerpo = (
    <>
      {modo === 'ver' ? ver : edicion}
      {error && (
        <div role="alert" className="flex items-center gap-2" style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', color: 'var(--destructive)', fontSize: 'var(--text-label)' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}
      {guardado && (
        <div role="status" className="flex items-center gap-2" style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #16a34a 10%, transparent)', color: '#15803d', fontSize: 'var(--text-label)' }}>
          <Check size={15} />Tus datos se guardaron
        </div>
      )}
    </>
  );

  const pie = modo === 'editar' && (
    <div className="flex justify-end gap-2 shrink-0"
      style={{ padding: pantalla ? '12px 16px calc(12px + env(safe-area-inset-bottom))' : '14px 20px', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
      <button type="button" onClick={cancelar}
        style={{ flex: pantalla ? 1 : 'none', height: 44, padding: '0 18px', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
        Cancelar
      </button>
      <button type="button" onClick={guardar} disabled={guardando} className="flex items-center justify-center gap-2"
        style={{ flex: pantalla ? 2 : 'none', height: 44, padding: '0 18px', borderRadius: 'var(--radius-button)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', cursor: guardando ? 'wait' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
        {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );

  if (pantalla) return (
    <div role="dialog" aria-label="Mis datos" className="fixed inset-0 flex flex-col" style={{ zIndex: 90, background: 'var(--background)' }}>
      <header className="flex items-center gap-2 shrink-0"
        style={{ padding: 'calc(env(safe-area-inset-top) + 10px) 8px 10px', background: 'var(--cabecera-movil)', borderRadius: '0 0 20px 20px', boxShadow: 'var(--cabecera-movil-sombra)' }}>
        <button type="button" onClick={modo === 'ver' ? onClose : cancelar} aria-label="Volver" className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--foreground)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="flex-1" style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>{modo === 'ver' ? 'Mis datos' : 'Editar mis datos'}</h2>
        {modo === 'ver' && <span style={{ marginRight: 4 }}>{botonIcono(Pencil, 'Editar mis datos', editar, true)}</span>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 28px' }}>
          {modo === 'ver' && (
            <div className="flex flex-col items-center gap-1.5 text-center" style={{ ...tarjeta, padding: 20 }}>
              <span className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', fontSize: 'calc(24px * var(--escala-texto))', fontWeight: 700, marginBottom: 6 }}>{ini}</span>
              <p style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>{usuario.nombre} {usuario.apellido}</p>
              <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{rol} · {institucion}</p>
            </div>
          )}
          {cuerpo}
        </div>
      </div>
      {pie}
    </div>
  );

  return (
    <div role="dialog" aria-label="Mis datos" className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2000, padding: 24 }}>
      <div onClick={modo === 'ver' ? onClose : undefined} className="absolute inset-0" style={{ background: 'rgba(11, 30, 45, 0.5)' }} />
      <div className="relative w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 680, maxHeight: '88vh', background: 'var(--background)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-modal)' }}>
        <div className="shrink-0" style={{ padding: '16px 16px 16px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          {modo === 'ver' ? (
            <div className="flex items-center gap-3.5">
              <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', fontSize: 'calc(17px * var(--escala-texto))', fontWeight: 700 }}>{ini}</span>
              <div className="flex-1 min-w-0">
                <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>{usuario.nombre} {usuario.apellido}</p>
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{rol} · {institucion}</p>
              </div>
              {botonIcono(Pencil, 'Editar mis datos', editar, true)}
              {botonIcono(X, 'Cerrar', onClose)}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <p className="flex-1" style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>Editar mis datos</p>
              {botonIcono(X, 'Cancelar', cancelar)}
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5" style={{ padding: 20 }}>{cuerpo}</div>
        {pie}
      </div>
    </div>
  );
}
