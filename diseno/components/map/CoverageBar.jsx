import React from 'react';

export function CoverageBar({ value = 0, label = 'Cobertura', showValue = true, height = 8, color }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const c = color || (v >= 75 ? '#16a34a' : v >= 40 ? '#ca8a04' : '#dc2626');
  return (
    <div style={{ fontFamily: 'var(--font-family-primary)' }}>
      {(label || showValue) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {showValue && <span style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>{v}%</span>}
      </div>}
      <div style={{ height, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ width: v + '%', height: '100%', borderRadius: 999, background: c, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}
