/**
 * Pill with dot for any operativo / grupo / polígono state. Red/yellow/green are reserved for states.
 * @startingPoint section="Core" subtitle="Estados de operativos, grupos y polígonos" viewport="700x220"
 */
export interface StatusBadgeProps {
  estado: 'activo' | 'inactivo' | 'planificación' | 'nuevo' | 'en_proceso' | 'finalizado' | 'eliminado' | 'rastrillando'
    | 'en_formacion' | 'confirmado' | 'asignado' | 'desplegado' | 'replegado' | 'en_espera' | 'disuelto' | 'pendiente' | 'completado' | string;
  size?: 'sm' | 'md';
  /** Override the default label */
  label?: string;
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
