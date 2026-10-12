import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

function Tool({ t, active, onSelect, showLabel }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" title={t.label} disabled={t.disabled} onClick={() => onSelect && onSelect(t.id)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 8, height: 36, minWidth: 36, padding: showLabel ? '0 10px' : 0, justifyContent: showLabel ? 'flex-start' : 'center',
      borderRadius: 'var(--radius-md)', border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer', opacity: t.disabled ? 0.4 : 1,
      background: active ? 'var(--primary)' : h ? 'var(--muted)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background .15s',
    }}>
      <Icon name={t.icon} size={16} />{showLabel && <span>{t.label}</span>}
    </button>
  );
}

export function MapToolbar({ tools = [], active, onSelect, orientation = 'vertical', showLabels = false }) {
  const v = orientation === 'vertical';
  return (
    <div style={{ display: 'flex', flexDirection: v ? 'column' : 'row', gap: 2, padding: 4, background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)' }}>
      {tools.map((t, i) => t.sep
        ? <div key={'s' + i} style={{ [v ? 'height' : 'width']: 1, [v ? 'margin' : 'margin']: v ? '3px 4px' : '4px 3px', background: 'var(--border)', alignSelf: 'stretch' }} />
        : <Tool key={t.id} t={t} active={active === t.id} onSelect={onSelect} showLabel={showLabels} />)}
    </div>
  );
}
