import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, ClipboardList, Users, Cloud,
  FileText, ChevronLeft, LogOut, Moon, Sun, Shield, Map,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, isDark, toggleDark } = useApp();

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
    <aside
      className="flex flex-col h-full w-[260px] flex-shrink-0"
      style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <Shield size={20} color="#fff" />
        </div>
        <div className="min-w-0">
          <p style={{ color: 'var(--sidebar-foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.1em', lineHeight: 1.2 }}>
            DUAR
          </p>
          <p className="truncate" style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', opacity: 0.6, lineHeight: 1.2 }}>
            Búsqueda y Rastreo
          </p>
        </div>
      </div>

      {/* Back to global */}
      {isOperativoContext && (
        <div className="px-3 pt-3">
          <Link
            to="/operativos"
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--sidebar-foreground)', background: 'var(--sidebar-accent)', fontSize: 'var(--text-base)' }}
          >
            <ChevronLeft size={15} />
            <span style={{ opacity: 0.7 }}>Volver a Operativos</span>
          </Link>
        </div>
      )}

      {/* Nav section label */}
      <div className="px-5 pt-5 pb-1">
        <p
          className="uppercase tracking-widest"
          style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', opacity: 0.4 }}
        >
          {isOperativoContext ? 'Módulos' : 'Navegación'}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
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
              <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left"
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
          <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left"
          style={{ color: 'var(--sidebar-foreground)', opacity: 0.7, fontSize: 'var(--text-base)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.18)';
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.opacity = '0.7';
          }}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>

        {/* User info */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1"
          style={{ background: 'var(--sidebar-accent)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 'var(--font-weight-bold)' }}
          >
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="truncate" style={{ color: 'var(--sidebar-foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
              {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
            </p>
            <p className="capitalize" style={{ color: 'var(--sidebar-foreground)', fontSize: '10px', opacity: 0.55 }}>
              {usuario?.rol || ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}