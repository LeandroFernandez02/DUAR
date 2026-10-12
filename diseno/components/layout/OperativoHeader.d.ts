/**
 * Always-visible header inside an operativo: title + status, location/date, compact toggle, Puesto de comando chip, Objetivo · QR Agentes · Informe, "Día N del operativo" and weather chip.
 * @startingPoint section="Layout" subtitle="Encabezado del operativo" viewport="1100x120"
 */
export interface OperativoHeaderProps {
  nombre: string;
  estado?: string;
  ubicacion: string;
  /** Already formatted es-AR, e.g. "28/2/2026" */
  fechaInicio: string;
  dia?: number;
  clima?: { temperatura: number; descripcion: string };
  /** When the objetivo is loaded the button is soft red; otherwise solid primary (call to action) */
  hasObjetivo?: boolean;
  /** Name of the coordinator in charge (Puesto de comando chip). Empty = amber "Sin coordinador a cargo" */
  aCargo?: string;
  /** Controlled compact mode: action buttons become icons only */
  compacto?: boolean;
  defaultCompacto?: boolean;
  onCompacto?: (compacto: boolean) => void;
  onInfo?: () => void;
  onPuestoComando?: () => void;
  onObjetivo?: () => void;
  onQR?: () => void;
  onInforme?: () => void;
}
export declare function OperativoHeader(props: OperativoHeaderProps): JSX.Element;
