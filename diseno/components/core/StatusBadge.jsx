import React from 'react';

export const ESTADOS = {
  activo: { label: 'Activo', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  inactivo: { label: 'Inactivo', bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626' },
  'planificación': { label: 'En Planificación', bg: '#fef9c3', text: '#a16207', dot: '#ca8a04' },
  nuevo: { label: 'Nuevo', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--foreground)', dot: 'var(--accent)' },
  en_proceso: { label: 'En Proceso', bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  finalizado: { label: 'Finalizado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  eliminado: { label: 'Eliminado', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  rastrillando: { label: 'Rastrillando', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  en_formacion: { label: 'En Formación', bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  confirmado: { label: 'Confirmado', bg: 'rgba(79,70,229,0.12)', text: '#4338ca', dot: '#4f46e5' },
  asignado: { label: 'Asignado', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)' },
  desplegado: { label: 'Desplegado', bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  replegado: { label: 'Replegado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  en_espera: { label: 'En Espera', bg: 'rgba(8,145,178,0.12)', text: '#0e7490', dot: '#0891b2' },
  disuelto: { label: 'Disuelto', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  pendiente: { label: 'Pendiente', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)' },
  completado: { label: 'Completado', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
};

export function StatusBadge({ estado, size = 'md', label }) {
  const c = ESTADOS[estado] || { label: estado, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: sm ? '2px 8px' : '3px 10px', borderRadius: 999,
      fontSize: sm ? 10 : 11, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--chip-font-family)', textTransform: 'var(--chip-transform)', letterSpacing: 'var(--chip-tracking)',
      background: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 15%, transparent) var(--tinte-oscuro, 0%), ${c.bg})`,
      color: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 62%, #fff) var(--tinte-oscuro, 0%), ${c.text})`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.dot} calc(var(--tinte-oscuro, 0%) * 0.6), transparent)`, whiteSpace: 'nowrap', lineHeight: 1.5,
    }}>
      <span style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label || c.label}
    </span>
  );
}
