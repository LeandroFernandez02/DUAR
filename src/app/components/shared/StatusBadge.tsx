interface StatusBadgeProps {
  estado: string;
  size?: 'sm' | 'md';
  /** Texto en lugar del nombre del estado (el color sigue siendo el del estado). */
  label?: string;
}

/**
 * Estados de operativo, grupo y sector con su color (tabla del diseño CALÍVAR, 23/10). Se exporta
 * porque la barra superior y el cuadradito de la tarjeta de grupo usan `ESTADOS[estado].dot`.
 * `textDark`: color del texto en el tema oscuro para los de fondo translúcido (Testeo 15/10, punto 25).
 * Nuevo, Asignado y Pendiente usan el acero (`--accent`): rojo, amarillo y verde son sólo para estados.
 */
export const ESTADOS: Record<string, { label: string; bg: string; text: string; dot: string; textDark?: string }> = {
  activo: { label: 'Activo', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  inactivo: { label: 'Inactivo', bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626' },
  'planificación': { label: 'En Planificación', bg: '#fef9c3', text: '#a16207', dot: '#ca8a04' },
  nuevo: { label: 'Nuevo', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--foreground)', dot: 'var(--accent)', textDark: '#ffe6d9' },
  en_proceso: { label: 'En Proceso', bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  finalizado: { label: 'Finalizado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  eliminado: { label: 'Eliminado', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  rastrillando: { label: 'Rastrillando', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  // Catálogo estado_grupo (8 valores, migración 010 — rediseño del 24/09)
  en_formacion: { label: 'En Formación', bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  confirmado: { label: 'Confirmado', bg: 'rgba(79,70,229,0.12)', text: '#4338ca', dot: '#4f46e5', textDark: '#dcdeff' },
  asignado: { label: 'Asignado', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)', textDark: '#ffdcc9' },
  desplegado: { label: 'Desplegado', bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  replegado: { label: 'Replegado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  en_espera: { label: 'En Espera', bg: 'rgba(8,145,178,0.12)', text: '#0e7490', dot: '#0891b2', textDark: '#a4e8f5' },
  disuelto: { label: 'Disuelto', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  pendiente: { label: 'Pendiente', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)', textDark: '#ffdcc9' },
  completado: { label: 'Completado', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
};

/** Color principal de un estado (el del punto del badge). */
export function colorDeEstado(estado: string): string {
  return ESTADOS[estado]?.dot ?? '#9ca3af';
}

/**
 * Píldora de estado con punto. En el tema oscuro (`--tinte-oscuro: 100%`) el fondo pastel pasa a
 * un tinte translúcido del color del estado con borde, y el texto y el punto se aclaran.
 */
export default function StatusBadge({ estado, size = 'md', label }: StatusBadgeProps) {
  const c = ESTADOS[estado] || { label: estado, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const sm = size === 'sm';
  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: sm ? '2px 8px' : '3px 10px', borderRadius: 999,
        fontSize: sm ? 'calc(10px * var(--escala-texto))' : 'calc(11px * var(--escala-texto))',
        fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
        background: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 27%, transparent) var(--tinte-oscuro, 0%), ${c.bg})`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.dot} calc(var(--tinte-oscuro, 0%) * 0.9), transparent)`,
        whiteSpace: 'nowrap', lineHeight: 1.5,
        ['--badge-fg-claro' as string]: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 42%, #fff) var(--tinte-oscuro, 0%), ${c.text})`,
        ['--badge-fg-dark' as string]: c.textDark ?? 'var(--badge-fg-claro)',
      }}
    >
      <span style={{
        width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: '50%', flexShrink: 0,
        background: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 70%, #fff) var(--tinte-oscuro, 0%), ${c.dot})`,
        boxShadow: `0 0 6px color-mix(in srgb, ${c.dot} calc(var(--tinte-oscuro, 0%) * 0.7), transparent)`,
      }} />
      {label ?? c.label}
    </span>
  );
}
