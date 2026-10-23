import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, ClipboardList, Users, UsersRound, UserCheck, Map,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AccesibilidadPanel from './AccesibilidadPanel';
import Logo from './Logo';
import IconoAccesibilidad from './IconoAccesibilidad';

export interface NavItem {
  icono: typeof Users;
  label: string;
  path: string;
}

/**
 * Secciones del menú según el contexto (diseño CALÍVAR, 23/10): global (Panel, Operativos,
 * Usuarios) o dentro de un operativo (Panel, Agentes, Grupos, Mapa). Las comparte el menú
 * inferior de mobile. El Informe no es una sección: es un botón del encabezado del operativo.
 */
export function seccionesDe(pathname: string): { enOperativo: boolean; items: NavItem[] } {
  const enOperativo = pathname.startsWith('/operativo/');
  const id = enOperativo ? pathname.split('/')[2] : null;
  return {
    enOperativo,
    items: id ? [
      { icono: LayoutDashboard, label: 'Panel', path: `/operativo/${id}/dashboard` },
      { icono: UserCheck, label: 'Agentes', path: `/operativo/${id}/agentes` },
      { icono: UsersRound, label: 'Grupos', path: `/operativo/${id}/grupos` },
      { icono: Map, label: 'Mapa', path: `/operativo/${id}/mapa` },
    ] : [
      { icono: LayoutDashboard, label: 'Panel', path: '/dashboard' },
      { icono: ClipboardList, label: 'Operativos', path: '/operativos' },
      { icono: Users, label: 'Usuarios', path: '/usuarios' },
    ],
  };
}

/** Botón del menú: activo = fondo turquesa y texto azul noche; el resto a `--sidebar-dim`. */
function BotonMenu({ icono, label, activo = false, colapsado, onClick, to, fondo }: {
  icono: ReactNode; label: string; activo?: boolean; colapsado: boolean; onClick?: () => void; to?: string; fondo?: string;
}) {
  const [h, setH] = useState(false);
  const estilo = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', width: '100%',
    border: 'none', cursor: 'pointer', justifyContent: colapsado ? 'center' : 'flex-start', textAlign: 'left',
    background: activo ? 'var(--sidebar-activo)' : h ? 'var(--sidebar-accent)' : (fondo ?? 'transparent'),
    color: activo ? 'var(--sidebar-texto-activo)' : 'var(--sidebar-foreground)',
    opacity: activo || h ? 1 : 'var(--sidebar-dim)', fontFamily: 'var(--font-family-primary)',
    fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', transition: 'all .2s', textDecoration: 'none',
  } as const;
  const contenido = (
    <>
      <span className="flex" style={{ opacity: activo ? 1 : 0.7 }}>{icono}</span>
      {!colapsado && <span style={{ color: activo ? undefined : 'var(--sidebar-texto)' }}>{label}</span>}
    </>
  );
  const props = { title: label, onMouseEnter: () => setH(true), onMouseLeave: () => setH(false), style: estilo, 'aria-current': activo ? 'page' as const : undefined };
  return to
    ? <Link to={to} {...props}>{contenido}</Link>
    : <button type="button" onClick={onClick} {...props}>{contenido}</button>;
}

/**
 * Menú lateral de escritorio (≥ 1024 px, diseño CALÍVAR): azul noche en los dos temas, 260 px
 * (colapsable a 80). En mobile/tablet lo reemplazan la barra superior y el menú inferior
 * (Movil.tsx). Abajo: Colapsar, Modo oscuro, Accesibilidad y el menú de cuenta (Mis datos, Cerrar sesión).
 */
export default function Sidebar({ onVerDatos }: { onVerDatos: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, isDark, toggleDark } = useApp();
  const [colapsado, setColapsado] = useState(false);
  const [menu, setMenu] = useState(false);
  const [acc, setAcc] = useState(false);
  const [hDatos, setHDatos] = useState(false);
  const [hSalir, setHSalir] = useState(false);

  // Cerrar los menús al navegar, para que no queden flotando sobre la pantalla siguiente.
  useEffect(() => { setMenu(false); setAcc(false); }, [location.pathname]);

  const { enOperativo, items } = seccionesDe(location.pathname);
  const salir = () => { logout(); navigate('/login'); };
  const ini = usuario ? `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase() : '??';
  const borde = { borderColor: 'var(--sidebar-border)' };

  return (
    <aside className="flex flex-col h-full shrink-0" style={{ width: colapsado ? 80 : 260, background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', fontFamily: 'var(--font-family-primary)', transition: 'width .2s' }}>
      <div className="flex items-center gap-3 border-b" style={{ padding: colapsado ? '20px 8px' : 20, justifyContent: colapsado ? 'center' : 'flex-start', ...borde }}>
        {colapsado ? <Logo variante="simbolo" ancho={36} alto={38} /> : <Logo variante="horizontal" ancho={198} alto={39} />}
      </div>

      {enOperativo && (
        <div style={{ padding: '12px 12px 0' }}>
          <BotonMenu icono={<ChevronLeft size={15} />} label="Volver a Operativos" colapsado={colapsado} to="/operativos" fondo="var(--sidebar-accent)" />
        </div>
      )}
      {!colapsado && (
        <p style={{ margin: 0, padding: '20px 20px 4px', fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {enOperativo ? 'Módulos' : 'Navegación'}
        </p>
      )}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden" style={{ padding: '8px 12px 0' }}>
        {items.map(it => <BotonMenu key={it.path} icono={<it.icono size={18} />} label={it.label} to={it.path} activo={location.pathname === it.path} colapsado={colapsado} />)}
      </nav>

      <div className="flex flex-col gap-1 border-t" style={{ padding: '12px 12px 16px', ...borde }}>
        <BotonMenu icono={colapsado ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} label="Colapsar menú" colapsado={colapsado} onClick={() => setColapsado(c => !c)} />
        <BotonMenu icono={isDark ? <Sun size={16} /> : <Moon size={16} />} label={isDark ? 'Modo Claro' : 'Modo Oscuro'} colapsado={colapsado} onClick={toggleDark} />

        {/* Accesibilidad: tamaño de texto, alto contraste y foco */}
        <div className="relative">
          {acc && <div onClick={() => setAcc(false)} className="fixed inset-0" style={{ zIndex: 45 }} aria-hidden="true" />}
          <BotonMenu icono={<IconoAccesibilidad size={20} />} label="Accesibilidad" colapsado={colapsado} onClick={() => setAcc(v => !v)} fondo={acc ? 'var(--sidebar-accent)' : undefined} />
          {acc && (
            <div role="dialog" aria-label="Accesibilidad" className="absolute"
              style={{ zIndex: 50, left: 'calc(100% + 12px)', bottom: 0, width: 300, padding: '10px 6px 6px', background: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: 'var(--elevation-md)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 12px 6px', fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Accesibilidad</p>
              <AccesibilidadPanel />
            </div>
          )}
        </div>

        {/* Cuenta → Mis datos y Cerrar sesión */}
        <div className="relative mt-1">
          {menu && <div onClick={() => setMenu(false)} className="fixed inset-0" style={{ zIndex: 45 }} aria-hidden="true" />}
          <button type="button" onClick={() => setMenu(m => !m)} title={usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Cuenta'} aria-expanded={menu}
            className="flex items-center gap-3 w-full text-left"
            style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'var(--sidebar-accent)', justifyContent: colapsado ? 'center' : 'flex-start', fontFamily: 'var(--font-family-primary)' }}>
            <div className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'var(--sidebar-texto-activo)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 700 }}>{ini}</div>
            {!colapsado && usuario && (
              <div className="min-w-0">
                <p className="truncate" style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--sidebar-texto)' }}>{usuario.nombre} {usuario.apellido}</p>
                <p className="capitalize" style={{ margin: 0, fontSize: 'calc(10px * var(--escala-texto))', opacity: 'var(--sidebar-dim)', color: 'var(--sidebar-texto)' }}>{usuario.rol}</p>
              </div>
            )}
          </button>
          {menu && (
            <div role="menu" className="absolute overflow-hidden"
              style={{ zIndex: 50, left: 0, bottom: 'calc(100% + 8px)', width: 230, background: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: 'var(--elevation-md)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
              <div style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>
                <button type="button" role="menuitem" title="Ver mis datos" onClick={() => { setMenu(false); onVerDatos(); }}
                  onMouseEnter={() => setHDatos(true)} onMouseLeave={() => setHDatos(false)}
                  className="flex items-center gap-2 w-full text-left"
                  style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', color: 'var(--popover-foreground)', background: hDatos ? 'var(--muted)' : 'none', transition: 'background .15s' }}>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 'var(--text-label)', fontWeight: 600 }}>{usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}</span>
                    <span className="block truncate" style={{ marginTop: 2, fontSize: 'calc(11px * var(--escala-texto))', opacity: 0.6 }}>{usuario?.email}</span>
                  </span>
                  <ChevronRight size={15} style={{ opacity: hDatos ? 0.9 : 0.45, transition: 'opacity .15s', flexShrink: 0 }} />
                </button>
              </div>
              <div style={{ padding: 6 }}>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); salir(); }}
                  onMouseEnter={() => setHSalir(true)} onMouseLeave={() => setHSalir(false)}
                  className="flex items-center gap-2.5 w-full text-left"
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)',
                    background: hSalir ? 'color-mix(in srgb, var(--destructive) 12%, transparent)' : 'none', color: hSalir ? 'var(--destructive)' : 'var(--popover-foreground)', opacity: hSalir ? 1 : 0.85 }}>
                  <LogOut size={15} />Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
