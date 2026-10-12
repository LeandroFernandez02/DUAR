import React from 'react';

export const ESTADOS_AGENTE = {
  disponible:    { label: 'Disponible',    color: '#0d9488', dot: '#0d9488' },
  agrupado:      { label: 'Agrupado',      color: '#4f46e5', dot: '#4f46e5' },
  desplegado:    { label: 'Desplegado',    color: '#ca8a04', dot: '#ca8a04' },
  replegado:     { label: 'Replegado',     color: '#6b7280', dot: '#6b7280' },
  en_espera:     { label: 'En espera',     color: '#0891b2', dot: '#0891b2' },
  no_disponible: { label: 'No disponible', color: '#b91c1c', dot: '#b91c1c' },
};

export function EstadoAgenteBadge({ estado, size = 'sm' }) {
  const c = ESTADOS_AGENTE[estado] || { label: estado, color: '#6b7280', dot: '#6b7280' };
  const xs = size === 'xs';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: xs ? '1px 7px' : '2px 9px', borderRadius: 999, fontFamily: 'var(--chip-font-family)', textTransform: 'var(--chip-transform)', letterSpacing: 'var(--chip-tracking)', fontSize: xs ? 10 : 11, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'nowrap',
      color: 'color-mix(in srgb, color-mix(in srgb, ' + c.color + ' 62%, #fff) var(--tinte-oscuro, 0%), ' + c.color + ')', background: 'color-mix(in srgb, ' + c.color + ' calc(10% + var(--tinte-oscuro, 0%) * 0.05), transparent)', border: '1px solid color-mix(in srgb, ' + c.color + ' 30%, transparent)' }}>
      <span style={{ width: xs ? 5 : 6, height: xs ? 5 : 6, borderRadius: '50%', background: c.dot }} />{c.label}
    </span>
  );
}
