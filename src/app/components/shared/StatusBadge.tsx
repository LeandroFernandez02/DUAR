interface StatusBadgeProps {
  estado: string;
  size?: 'sm' | 'md';
}

/**
 * `textDark`: color del texto en modo oscuro para los estados con fondo translúcido, cuyo texto
 * oscuro dejaba de verse sobre el fondo oscuro (Testeo 15/10, punto 25). Los de fondo sólido se ven igual.
 */
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string; textDark?: string }> = {
  activo: { label: 'Activo', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  inactivo: { label: 'Inactivo', bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626' },
  'planificación': { label: 'En Planificación', bg: '#fef9c3', text: '#a16207', dot: '#ca8a04' },
  nuevo: { label: 'Nuevo', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--foreground)', dot: 'var(--accent)' },
  en_proceso: { label: 'En Proceso', bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  finalizado: { label: 'Finalizado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  eliminado: { label: 'Eliminado', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  rastrillando: { label: 'Rastrillando', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  // Catálogo estado_grupo (8 valores, migración 010 — rediseño del 24/09)
  en_formacion: { label: 'En Formación', bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  confirmado: { label: 'Confirmado', bg: 'rgba(79,70,229,0.12)', text: '#4338ca', dot: '#4f46e5', textDark: '#c7caff' },
  asignado: { label: 'Asignado', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)' },
  desplegado: { label: 'Desplegado', bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  replegado: { label: 'Replegado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  en_espera: { label: 'En Espera', bg: 'rgba(8,145,178,0.12)', text: '#0e7490', dot: '#0891b2', textDark: '#7dd8ea' },
  disuelto: { label: 'Disuelto', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  pendiente: { label: 'Pendiente', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', text: 'var(--accent-strong)', dot: 'var(--accent)' },
  completado: { label: 'Completado', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
};

/** Color principal de un estado (el del punto del badge). */
export function colorDeEstado(estado: string): string {
  return statusConfig[estado]?.dot ?? '#9ca3af';
}

export default function StatusBadge({ estado, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[estado] || { label: estado, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };

  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';

  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: 'var(--font-weight-semibold)',
        fontFamily: 'var(--font-family-primary)',
        background: config.bg,
        color: 'var(--badge-fg)',
        whiteSpace: 'nowrap',
        ['--badge-fg' as string]: config.text,
        ['--badge-fg-dark' as string]: config.textDark ?? config.text,
      }}
    >
      <span
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          borderRadius: '50%',
          background: config.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}