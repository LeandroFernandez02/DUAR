/**
 * Estado del agente en el operativo (diseño CALÍVAR, 23/10): píldora con punto, del color del
 * estado. En el tema claro el texto va del color, con fondo al 10% y borde al 30%; en el oscuro
 * (`--tinte-oscuro: 100%`) se aclaran texto y punto y el tinte sube.
 *
 * Son los 7 estados del rediseño del 24/09 (estado_agente). El diseño suma «Desplegando» y
 * «Replegando», pero el 23/10 se decidió mantener nuestras reglas: no existen en el sistema.
 * El estado de un agente con grupo ya llega del servidor coherente con el de su grupo (Regla 1,
 * cascada de grupo.model.js), así que acá no se recalcula.
 */
import type { EstadoOperativoAgente } from '../../data/mockData';

export const ESTADOS_AGENTE: Record<EstadoOperativoAgente, { label: string; color: string }> = {
  disponible:    { label: 'Disponible',    color: '#0d9488' },
  agrupado:      { label: 'Agrupado',      color: '#4f46e5' },
  desplegado:    { label: 'Desplegado',    color: '#ca8a04' },
  rastrillando:  { label: 'Rastrillando',  color: '#16a34a' },
  replegado:     { label: 'Replegado',     color: '#6b7280' },
  en_espera:     { label: 'En espera',     color: '#0891b2' },
  no_disponible: { label: 'No disponible', color: '#b91c1c' },
};

/** Texto, fondo y borde del estado, ya mezclados según el tema (los usan también otras piezas). */
export function tonosEstadoAgente(color: string) {
  return {
    texto: `color-mix(in srgb, color-mix(in srgb, ${color} 42%, #fff) var(--tinte-oscuro, 0%), ${color})`,
    fondo: `color-mix(in srgb, ${color} calc(10% + var(--tinte-oscuro, 0%) * 0.18), transparent)`,
    borde: `1px solid color-mix(in srgb, ${color} calc(30% + var(--tinte-oscuro, 0%) * 0.55), transparent)`,
    punto: `color-mix(in srgb, color-mix(in srgb, ${color} 70%, #fff) var(--tinte-oscuro, 0%), ${color})`,
  };
}

export default function EstadoAgenteBadge({ estado, size = 'sm' }: { estado?: EstadoOperativoAgente; size?: 'xs' | 'sm' }) {
  if (!estado) return null;
  const c = ESTADOS_AGENTE[estado] ?? { label: estado, color: '#6b7280' };
  const t = tonosEstadoAgente(c.color);
  const xs = size === 'xs';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: xs ? '1px 7px' : '2px 9px', borderRadius: 999,
      fontFamily: 'var(--font-family-primary)', fontSize: xs ? 'calc(10px * var(--escala-texto))' : 'calc(11px * var(--escala-texto))',
      fontWeight: 600, lineHeight: 1.5, whiteSpace: 'nowrap', color: t.texto, background: t.fondo, border: t.borde,
    }}>
      <span style={{ width: xs ? 5 : 6, height: xs ? 5 : 6, borderRadius: '50%', flexShrink: 0, background: t.punto,
        boxShadow: `0 0 6px color-mix(in srgb, ${c.color} calc(var(--tinte-oscuro, 0%) * 0.7), transparent)` }} />
      {c.label}
    </span>
  );
}
