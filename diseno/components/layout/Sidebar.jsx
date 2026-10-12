import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

function NavBtn({ icon, label, active, collapsed, onClick, dim = 0.75, iconSize = 18, bg }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" title={label} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', width: '100%', border: 'none', cursor: 'pointer',
      justifyContent: collapsed ? 'center' : 'flex-start', textAlign: 'left',
      background: active ? 'var(--sidebar-activo, var(--primary))' : h ? 'var(--sidebar-accent)' : (bg || 'transparent'),
      color: active ? 'var(--sidebar-texto-activo, var(--primary-foreground))' : 'var(--sidebar-foreground)', opacity: active || h ? 1 : 'var(--sidebar-dim, ' + dim + ')',
      fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', transition: 'all .2s',
    }}>
      <span style={{ opacity: active ? 1 : 0.7, display: 'flex' }}><Icon name={icon} size={iconSize} /></span>
      {!collapsed && <span style={{ color: active ? undefined : 'var(--sidebar-texto, inherit)' }}>{label}</span>}
    </button>
  );
}

export function Sidebar({ items = [], context = 'operativo', user, isDark, onToggleDark, onNavigate, onBack, onLogout, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [menu, setMenu] = useState(false);
  const [hl, setHl] = useState(false);
  const ini = user ? (user.nombre[0] + user.apellido[0]).toUpperCase() : '??';
  const sb = { borderColor: 'var(--sidebar-border)' };
  return (
    <aside style={{ width: collapsed ? 80 : 260, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', fontFamily: 'var(--font-family-primary)', transition: 'width .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '20px 8px' : '20px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid', ...sb }}>
        <div role="img" aria-label="Sistema Integral de Búsqueda y Rescate" className="duar-logo-escudo" style={{ width: 34, height: 44, flexShrink: 0 }}></div>
        {!collapsed && <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 'var(--sidebar-dim, 0.7)', lineHeight: 1.3 }}>Sistema Integral de</p>
          <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, lineHeight: 1.25 }}>Búsqueda y Rescate</p>
        </div>}
      </div>
      {context === 'operativo' && <div style={{ padding: '12px 12px 0' }}>
        <NavBtn icon="chevron-left" label="Volver a Operativos" collapsed={collapsed} onClick={onBack} bg="var(--sidebar-accent)" iconSize={15} dim={0.7} />
      </div>}
      {!collapsed && <p style={{ margin: 0, padding: '20px 20px 4px', fontSize: 10, fontWeight: 600, opacity: 'var(--sidebar-dim-titulo, 0.4)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{context === 'operativo' ? 'Módulos' : 'Navegación'}</p>}
      <nav style={{ flex: 1, padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {items.map(it => <NavBtn key={it.label} icon={it.icon} label={it.label} active={it.active} collapsed={collapsed} onClick={() => onNavigate && onNavigate(it)} />)}
      </nav>
      <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid', ...sb }}>
        <NavBtn icon={collapsed ? 'panel-left-open' : 'panel-left-close'} label="Colapsar menú" collapsed={collapsed} onClick={() => setCollapsed(c => !c)} iconSize={16} dim={0.7} />
        <NavBtn icon={isDark ? 'sun' : 'moon'} label={isDark ? 'Modo Claro' : 'Modo Oscuro'} collapsed={collapsed} onClick={onToggleDark} iconSize={16} dim={0.7} />
        <div style={{ position: 'relative', marginTop: 4 }}>
          {menu && <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 45 }} />}
          <button type="button" onClick={() => setMenu(m => !m)} title={user ? user.nombre + ' ' + user.apellido : 'Cuenta'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'var(--sidebar-accent)', justifyContent: collapsed ? 'center' : 'flex-start', fontFamily: 'var(--font-family-primary)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'var(--sidebar-texto-activo, var(--primary-foreground))', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</div>
            {!collapsed && user && <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--sidebar-texto, var(--sidebar-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nombre} {user.apellido}</p>
              <p style={{ margin: 0, fontSize: 10, opacity: 'var(--sidebar-dim, 0.55)', color: 'var(--sidebar-texto, var(--sidebar-foreground))', textTransform: 'capitalize' }}>{user.rol}</p>
            </div>}
          </button>
          {menu && <div role="menu" style={{ position: 'absolute', zIndex: 50, left: 0, bottom: 'calc(100% + 8px)', width: 230, background: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: 'var(--elevation-md)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.nombre + ' ' + user.apellido : 'Usuario'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user && user.email}</p>
            </div>
            <div style={{ padding: 6 }}>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); onLogout && onLogout(); }} onMouseEnter={() => setHl(true)} onMouseLeave={() => setHl(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', background: hl ? 'color-mix(in srgb, var(--destructive) 12%, transparent)' : 'none', color: hl ? 'var(--destructive)' : 'var(--popover-foreground)', opacity: hl ? 1 : 0.85 }}>
                <Icon name="log-out" size={15} />Cerrar sesión
              </button>
            </div>
          </div>}
        </div>
      </div>
    </aside>
  );
}
