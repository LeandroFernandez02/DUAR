import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, ClipboardList, Users, Cloud,
  FileText, ChevronLeft, LogOut, Moon, Sun, Shield, Map,
  UserCheck, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface Props {
  /** Sólo se usa en mobile: si el drawer está abierto y cómo cerrarlo. En
   *  desktop el sidebar es siempre visible y estas props no importan. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, isDark, toggleDark } = useApp();

  // El colapso sólo aplica en desktop (ver clases `md:w-...` más abajo); en
  // mobile el drawer siempre se abre a ancho completo.
  const [collapsed, setCollapsed] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Cerrar el popover de cuenta al navegar, para que no quede flotando sobre
  // la pantalla siguiente.
  useEffect(() => { setShowAccountMenu(false); }, [location.pathname]);

  const isOperativoContext = location.pathname.startsWith('/operativo/');
  const operativoId = isOperativoContext ? location.pathname.split('/')[2] : null;

  const globalNav: NavItem[] = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <ClipboardList size={18} />, label: 'Operativos', path: '/operativos' },
    { icon: <Users size={18} />, label: 'Usuarios', path: '/usuarios' },
  ];

  const operativoNav: NavItem[] = operativoId ? [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: `/operativo/${operativoId}/dashboard` },
    { icon: <UserCheck size={18} />, label: 'Agentes', path: `/operativo/${operativoId}/agentes` },
    { icon: <Map size={18} />, label: 'Mapa', path: `/operativo/${operativoId}/mapa` },
    { icon: <Cloud size={18} />, label: 'Clima', path: `/operativo/${operativoId}/clima` },
    { icon: <FileText size={18} />, label: 'Informe Final', path: `/operativo/${operativoId}/informe` },
  ] : [];

  const navItems = isOperativoContext ? operativoNav : globalNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const iniciales = usuario
    ? `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase()
    : '??';

  return (
    <>
      {/* Fondo oscuro detrás del drawer en mobile. No existe en desktop —
          ahí el sidebar nunca "flota" sobre el contenido. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Backdrop invisible del popover de cuenta: fuera del <aside> a
          propósito — el <aside> tiene `translate-x` (un transform) aplicado,
          y un transform en un ancestro convierte a `position: fixed` en
          relativo a ESE ancestro en vez de al viewport, así que puesto
          adentro nunca cubriría toda la pantalla. */}
      {showAccountMenu && (
        <div
          className="fixed inset-0 z-[45]"
          onClick={() => setShowAccountMenu(false)}
          aria-hidden="true"
        />
      )}

      <aside
        // El deslizamiento y el colapso van por CLASE, no por `style.transform`
        // / `style.width`: un estilo inline gana siempre contra cualquier
        // clase, incluida `md:...` — con `style={{transform}}` el sidebar
        // quedaba trasladado fuera de la pantalla también en desktop, sin
        // importar el ancho. Por eso el ancho colapsado también se resuelve
        // con clases (`md:w-[80px]`), que en mobile ni se aplican: el drawer
        // siempre se abre a ancho completo ahí.
        className={`flex flex-col h-full w-[260px] ${collapsed ? 'md:w-[80px]' : 'md:w-[260px]'} flex-shrink-0 fixed md:static inset-y-0 left-0 z-50 transition-all duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 py-5 border-b flex-shrink-0 ${collapsed ? 'md:justify-center md:px-2' : 'justify-between px-5'}`}
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0 px-5 md:px-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              <Shield size={20} color="#fff" />
            </div>
            <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <p style={{ color: 'var(--sidebar-foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.1em', lineHeight: 1.2 }}>
                DUAR
              </p>
              <p className="truncate" style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', opacity: 0.6, lineHeight: 1.2 }}>
                Búsqueda y Rastreo
              </p>
            </div>
          </div>
          {/* Cerrar: sólo tiene sentido en el drawer de mobile */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg flex-shrink-0 md:hidden mr-5"
            style={{ color: 'var(--sidebar-foreground)', opacity: 0.7, background: 'none', border: 'none' }}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Back to global */}
        {isOperativoContext && (
          <div className="px-3 pt-3">
            <Link
              to="/operativos"
              onClick={onMobileClose}
              title="Volver a Operativos"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80 ${collapsed ? 'md:justify-center' : ''}`}
              style={{ color: 'var(--sidebar-foreground)', background: 'var(--sidebar-accent)', fontSize: 'var(--text-base)' }}
            >
              <ChevronLeft size={15} />
              <span className={collapsed ? 'md:hidden' : ''} style={{ opacity: 0.7 }}>Volver a Operativos</span>
            </Link>
          </div>
        )}

        {/* Nav section label */}
        <div className={`px-5 pt-5 pb-1 ${collapsed ? 'md:hidden' : ''}`}>
          <p
            className="uppercase tracking-widest"
            style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', opacity: 0.4 }}
          >
            {isOperativoContext ? 'Módulos' : 'Navegación'}
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${collapsed ? 'md:justify-center' : ''}`}
                style={{
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--sidebar-foreground)',
                  opacity: active ? 1 : 0.75,
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-accent)';
                    (e.currentTarget as HTMLElement).style.opacity = '1';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.opacity = '0.75';
                  }
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: colapsar → modo oscuro → perfil (con logout en popover) */}
        <div className="px-3 pb-4 flex flex-col gap-1 border-t pt-3 flex-shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
          {/* Colapsar / expandir sidebar (sólo desktop) */}
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`hidden md:flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left ${collapsed ? 'md:justify-center' : ''}`}
            style={{ color: 'var(--sidebar-foreground)', opacity: 0.7, fontSize: 'var(--text-base)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-accent)';
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.opacity = '0.7';
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            <span className={collapsed ? 'md:hidden' : ''}>Colapsar menú</span>
          </button>

          {/* Modo oscuro */}
          <button
            onClick={toggleDark}
            title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left ${collapsed ? 'md:justify-center' : ''}`}
            style={{ color: 'var(--sidebar-foreground)', opacity: 0.7, fontSize: 'var(--text-base)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-accent)';
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.opacity = '0.7';
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className={collapsed ? 'md:hidden' : ''}>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          {/* Perfil → abre popover con cuenta + cerrar sesión */}
          <div className="relative mt-1">
            <button
              onClick={() => setShowAccountMenu(v => !v)}
              title={usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Cuenta'}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors ${collapsed ? 'md:justify-center' : ''}`}
              style={{ background: 'var(--sidebar-accent)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 'var(--font-weight-bold)' }}
              >
                {iniciales}
              </div>
              <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
                <p className="truncate" style={{ color: 'var(--sidebar-foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
                </p>
                <p className="capitalize truncate" style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', opacity: 0.55 }}>
                  {usuario?.rol || ''}
                </p>
              </div>
            </button>

            {showAccountMenu && (
              <>
                <div
                  role="menu"
                  className="absolute z-50 left-0"
                  style={{
                    bottom: 'calc(100% + 8px)',
                    width: 230,
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    boxShadow: 'var(--elevation-md)',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <div className="px-3.5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="truncate" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
                    </p>
                    <p className="truncate" style={{ fontSize: '11px', opacity: 0.6, marginTop: 2 }}>
                      {usuario?.email}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-colors"
                      style={{ color: 'var(--popover-foreground)', opacity: 0.85, background: 'none', border: 'none', fontSize: 'var(--text-base)' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.12)';
                        (e.currentTarget as HTMLElement).style.color = '#E54B4B';
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'none';
                        (e.currentTarget as HTMLElement).style.color = 'var(--popover-foreground)';
                        (e.currentTarget as HTMLElement).style.opacity = '0.85';
                      }}
                    >
                      <LogOut size={15} />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
