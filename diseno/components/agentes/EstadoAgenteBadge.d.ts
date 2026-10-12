/**
 * Tactical state of an agent inside an operativo (ESTADO_OP_CONFIG in EditarAgenteModal.tsx). Status colours, not brand colours.
 */
export interface EstadoAgenteBadgeProps {
  estado: 'disponible' | 'agrupado' | 'desplegado' | 'replegado' | 'en_espera' | 'no_disponible' | string;
  size?: 'xs' | 'sm';
}
export declare function EstadoAgenteBadge(props: EstadoAgenteBadgeProps): JSX.Element;
export declare const ESTADOS_AGENTE: Record<string, { label: string; color: string; dot: string }>;
