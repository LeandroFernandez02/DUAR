import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

const chk = { accentColor: 'var(--primary)', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' };

export function TreeSection({ title, icon, badge, open, defaultOpen = false, onToggle, checked, onCheck, children }) {
  const [o, setO] = useState(defaultOpen);
  const isOpen = open != null ? open : o;
  const toggle = () => { if (onToggle) onToggle(!isOpen); if (open == null) setO(!isOpen); };
  return (
    <div style={{ borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-family-primary)' }}>
      <div onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', cursor: 'pointer', background: isOpen ? 'var(--muted)' : 'transparent', userSelect: 'none' }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexShrink: 0, boxSizing: 'border-box' }}><Icon name={isOpen ? 'minus' : 'plus'} size={10} strokeWidth={2.8} /></span>
        {onCheck && <input type="checkbox" checked={!!checked} onClick={e => e.stopPropagation()} onChange={e => onCheck(e.target.checked)} style={chk} />}
        {icon && <Icon name={icon} size={14} color={isOpen ? 'var(--primary)' : 'var(--muted-foreground)'} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        {badge != null && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: isOpen ? 'var(--card)' : 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{badge}</span>}
      </div>
      {isOpen && <div style={{ padding: '6px 8px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>}
    </div>
  );
}

export function TreeRow({ label, meta, swatch, checked, onCheck, selected, onClick, indent = 0, strong, radio, name }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', paddingLeft: 8 + indent * 18, borderRadius: 'var(--radius-sm)', cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : h && onClick ? 'var(--muted)' : 'transparent', opacity: checked === false && !radio ? 0.55 : 1, fontFamily: 'var(--font-family-primary)',
    }}>
      {onCheck && <input type={radio ? 'radio' : 'checkbox'} name={name} checked={!!checked} onClick={e => e.stopPropagation()} onChange={e => onCheck(e.target.checked)} style={chk} />}
      {swatch}
      <span style={{ flex: 1, minWidth: 0, fontSize: strong ? 11 : 12.5, fontWeight: strong ? 700 : selected ? 600 : 500, textTransform: strong ? 'uppercase' : 'none', letterSpacing: strong ? '0.04em' : 0, color: selected ? 'var(--primary)' : strong ? 'var(--muted-foreground)' : 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {meta != null && <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>{meta}</span>}
    </div>
  );
}
