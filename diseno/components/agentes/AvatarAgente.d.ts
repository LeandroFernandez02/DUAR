/**
 * Round avatar for an agent: footprints on primary (DUAR) or accent (other dotación); conductor = magenta truck; recurso especial = amber star.
 */
export interface AvatarAgenteProps {
  esDuar?: boolean;
  esConductor?: boolean;
  esRecursoCritico?: boolean;
  /** px, default 40 (cards) · 32 (tables) */
  tamano?: number;
  /** Show initials instead of the icon (user lists) */
  iniciales?: string;
}
export declare function AvatarAgente(props: AvatarAgenteProps): JSX.Element;
