import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';
import { MapMarker } from './MapMarker.jsx';

function Sw({ it }) {
  const b = { flexShrink: 0, boxSizing: 'border-box' };
  if (it.kind === 'line') return <span style={{ ...b, width: 18, height: 3, borderRadius: 2, background: it.color }} />;
  if (it.kind === 'area') return <span style={{ ...b, width: 16, height: 11, borderRadius: 3, background: it.color + '40', border: '1.5px solid ' + it.color }} />;
  if (it.kind === 'areaDashed') return <span style={{ ...b, width: 16, height: 11, borderRadius: 3, background: it.color + '22', border: '1.5px dashed ' + it.color }} />;
  if (it.kind === 'ring') return <span style={{ ...b, width: 14, height: 14, borderRadius: '50%', background: it.color + '1a', border: '1.5px solid ' + it.color }} />;
  if (it.kind === 'gap') return <span style={{ ...b, width: 16, height: 11, borderRadius: 2, background: 'rgba(220,38,38,0.38)' }} />;
  if (it.kind === 'marker') return <MapMarker tipo={it.tipo} variant="mini" />;
  return <span style={{ ...b, width: 10, height: 10, borderRadius: '50%', background: it.color }} />;
}

export function MapLegend({ title = 'Simbología táctica', items = [], defaultOpen = true, width = 220 }) {
  const [o, setO] = useState(defaultOpen);
  return (
    <div style={{ width, background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setO(!o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{title}</span>
        <Icon name={o ? 'chevron-down' : 'chevron-up'} size={14} color="var(--muted-foreground)" />
      </button>
      {o && <div style={{ padding: '2px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11.5, color: 'var(--foreground)' }}><span style={{ width: 18, display: 'flex', justifyContent: 'center' }}><Sw it={it} /></span>{it.label}</div>)}
      </div>}
    </div>
  );
}
