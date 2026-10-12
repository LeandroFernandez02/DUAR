import React from 'react';
import { Icon } from './Icon.jsx';

export function Modal({ title, subtitle, icon, onClose, children, footer, width = 520, open = true }) {
  if (!open) return null;
  return (
    <div onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: 'min(92vw, ' + width + 'px)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', fontFamily: 'var(--font-family-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
            {icon && <span style={{ color: 'var(--primary)', marginTop: 2 }}><Icon name={icon} size={16} /></span>}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.4 }}>{title}</p>
              {subtitle && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{subtitle}</p>}
            </div>
          </div>
          {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="x" size={18} /></button>}
        </div>
        <div style={{ padding: 20, overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>{footer}</div>}
      </div>
    </div>
  );
}
