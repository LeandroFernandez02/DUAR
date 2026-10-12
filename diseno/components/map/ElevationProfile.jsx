import React from 'react';

export function ElevationProfile({ values = [], distances, color = '#E0662B', height = 64, width = 272 }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const dmax = distances ? distances[distances.length - 1] || 1 : values.length - 1;
  const x = i => (distances ? distances[i] / dmax : i / (values.length - 1)) * width;
  const y = v => 6 + (1 - (v - min) / span) * (height - 12);
  const line = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
  const km = n => (n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' km';
  return (
    <div style={{ fontFamily: 'var(--font-family-primary)' }}>
      <svg width="100%" viewBox={'0 0 ' + width + ' ' + height} preserveAspectRatio="none" style={{ display: 'block', height, borderRadius: 'var(--radius-md)', background: 'var(--muted)' }}>
        <path d={line + 'L' + width + ',' + height + 'L0,' + height + 'Z'} fill={color} fillOpacity="0.18" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
        <span>0 km</span><span>{Math.round(min).toLocaleString('es-AR')}–{Math.round(max).toLocaleString('es-AR')} m</span><span>{distances ? km(dmax) : ''}</span>
      </div>
    </div>
  );
}
