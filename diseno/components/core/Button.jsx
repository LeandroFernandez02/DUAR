import React, { useState } from 'react';
import { Icon } from './Icon.jsx';

const V = {
  primary: { bg: 'var(--primary)', fg: 'var(--primary-foreground)', bd: 'var(--boton-primario-borde, var(--primary))', bw: 'var(--boton-primario-borde-ancho, 1.5px)', hover: { opacity: 0.88 } },
  soft:    { bg: 'color-mix(in srgb, var(--primary) 10%, transparent)', fg: 'var(--primary)', bd: 'color-mix(in srgb, var(--primary) 35%, transparent)', hover: { background: 'color-mix(in srgb, var(--primary) 18%, transparent)' } },
  muted:   { bg: 'var(--muted)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { background: 'var(--border)', borderColor: 'var(--muted-foreground)' } },
  outline: { bg: 'var(--card)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { borderColor: 'var(--foreground)' } },
  ghost:   { bg: 'transparent', fg: 'var(--muted-foreground)', bd: 'transparent', hover: { color: 'var(--foreground)', background: 'var(--muted)' } },
  danger:  { bg: '#dc2626', fg: '#fff', bd: '#dc2626', hover: { opacity: 0.88 } },
};

export function Button({ variant = 'primary', size = 'sm', icon, iconRight, children, disabled, fullWidth, onClick, title, type = 'button', style }) {
  const [h, setH] = useState(false);
  const v = V[variant] || V.primary;
  const pad = size === 'md' ? '8px 16px' : size === 'lg' ? '10px 16px' : '6px 12px';
  const fs = size === 'lg' ? 'var(--text-base)' : 'var(--text-label)';
  const off = !!disabled;
  return (
    <button type={type} title={title} disabled={off} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: pad, borderRadius: 'var(--radius-button)', border: (v.bw || '1.5px') + ' solid ' + (off ? 'var(--border)' : v.bd),
        background: off ? 'var(--muted)' : v.bg, color: off ? 'var(--muted-foreground)' : v.fg,
        fontFamily: 'var(--button-font-family)', textTransform: 'var(--button-transform)', letterSpacing: 'var(--button-tracking)', fontSize: fs, fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.5,
        cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.55 : 1, transition: 'all .15s ease',
        width: fullWidth ? '100%' : undefined, whiteSpace: 'nowrap',
        ...(h && !off ? v.hover : null), ...style,
      }}>
      {icon && <Icon name={icon} size={13} />}
      {children}
      {iconRight && <Icon name={iconRight} size={13} />}
    </button>
  );
}
