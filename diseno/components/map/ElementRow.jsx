import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusBadge } from '../core/StatusBadge.jsx';

export function ElementRow({ color = '#E0662B', icon = 'pentagon', title, meta, estado, selected, visible = true, onClick, onToggleVisible, right }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--radius-input)', cursor: 'pointer',
      background: selected ? 'color-mix(in srgb, var(--primary) 7%, transparent)' : h ? 'var(--muted)' : 'transparent',
      border: selected ? '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' : '1px solid transparent', fontFamily: 'var(--font-family-primary)', opacity: visible ? 1 : 0.5,
    }}>
      <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1f', color }}><Icon name={icon} size={14} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{title}</p>
        {meta && <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35 }}>{meta}</p>}
      </div>
      {estado && <StatusBadge estado={estado} size="sm" />}
      {right}
      {onToggleVisible && <button type="button" title={visible ? 'Ocultar' : 'Mostrar'} onClick={e => { e.stopPropagation(); onToggleVisible(); }} style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name={visible ? 'eye' : 'eye-off'} size={14} /></button>}
    </div>
  );
}
