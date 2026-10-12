import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function MapPopup({ icon, chip, color = '#444140', bg, kicker, title, subtitle, centrado, onClose, children, actions, width = 300 }) {
  return (
    <div style={{ width, fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', gap: 10, padding: '14px 14px 10px', alignItems: centrado ? 'center' : 'flex-start' }}>
        {chip || (icon && <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: bg || color + '1f', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={14} /></span>)}
        <div style={{ flex: 1, minWidth: 0 }}>
          {kicker && <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color, textAlign: centrado ? 'center' : undefined }}>{kicker}</p>}
          {title && <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{title}</p>}
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{subtitle}</p>}
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="x" size={15} /></button>}
      </div>
      {children && <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
      {actions && <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
