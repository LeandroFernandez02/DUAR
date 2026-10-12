import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function LayerPanel({ bases = [], base, onBase, overlays = [], onToggle, onClose }) {
  const over = { color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' };
  return (
    <div style={{ width: 260, background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)', fontFamily: 'var(--font-family-primary)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}><Icon name="layers" size={15} color="var(--primary)" />Capas del mapa</span>
        {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 2 }}><Icon name="x" size={15} /></button>}
      </div>
      <div style={{ padding: 14 }}>
        <p style={over}>Mapa base</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + Math.max(bases.length, 1) + ', 1fr)', gap: 6, marginBottom: 16 }}>
          {bases.map(b => {
            const sel = b.id === base;
            return (
              <button key={b.id} type="button" onClick={() => onBase && onBase(b.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: sel ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent', color: sel ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}>
                <Icon name={b.icon || 'map'} size={16} />{b.label}
              </button>
            );
          })}
        </div>
        <p style={over}>Elementos</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {overlays.map(o => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-label)', color: 'var(--foreground)' }}>
              <input type="checkbox" checked={!!o.checked} onChange={() => onToggle && onToggle(o.id)} style={{ accentColor: 'var(--primary)', width: 14, height: 14, margin: 0 }} />
              {o.icon && <Icon name={o.icon} size={13} color={o.color || 'var(--muted-foreground)'} />}
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.count != null && <span style={{ fontSize: 10, color: 'var(--muted-foreground)', padding: '0 6px', borderRadius: 999, background: 'var(--muted)' }}>{o.count}</span>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
