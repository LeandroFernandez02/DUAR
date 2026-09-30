interface StatusBadgeProps {
  estado: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  activo: { label: 'Activo', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  inactivo: { label: 'Inactivo', bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626' },
  'planificación': { label: 'En Planificación', bg: '#fef9c3', text: '#a16207', dot: '#ca8a04' },
  nuevo: { label: 'Nuevo', bg: 'rgba(255,169,135,0.2)', text: '#444140', dot: '#FFA987' },
  en_proceso: { label: 'En Proceso', bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  finalizado: { label: 'Finalizado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  eliminado: { label: 'Eliminado', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  rastrillando: { label: 'Rastrillando', bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  // Catálogo estado_grupo (8 valores, migración 010 — rediseño del 24/09)
  en_formacion: { label: 'En Formación', bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  confirmado: { label: 'Confirmado', bg: 'rgba(79,70,229,0.12)', text: '#4338ca', dot: '#4f46e5' },
  asignado: { label: 'Asignado', bg: 'rgba(255,169,135,0.2)', text: '#7c3d0f', dot: '#FFA987' },
  desplegado: { label: 'Desplegado', bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  replegado: { label: 'Replegado', bg: '#e5e7eb', text: '#374151', dot: '#6b7280' },
  en_espera: { label: 'En Espera', bg: 'rgba(8,145,178,0.12)', text: '#0e7490', dot: '#0891b2' },
  disuelto: { label: 'Disuelto', bg: '#fce7f3', text: '#9d174d', dot: '#be185d' },
  pendiente: { label: 'Pendiente', bg: 'rgba(255,169,135,0.2)', text: '#7c3d0f', dot: '#FFA987' },
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
        color: config.text,
        whiteSpace: 'nowrap',
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