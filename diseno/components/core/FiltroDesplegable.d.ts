/**
 * Multi-select filter pill with dropdown (FiltroDesplegable.tsx): used in the "Filtrar por:" row of Operativos, Usuarios and Agentes. Empty selection = all.
 */
export interface FiltroOpcion<T = string> { value: T; label: string; dot?: string; count?: number; }
export interface FiltroAtajo<T = string> { label: string; valores: T[]; count?: number; }
export interface FiltroDesplegableProps<T = string> {
  titulo: string;
  opciones: FiltroOpcion<T>[];
  seleccion: T[];
  onCambiar?: (sel: T[]) => void;
  /** Preset groups shown first, e.g. "Vigentes" */
  atajos?: FiltroAtajo<T>[];
}
export declare function FiltroDesplegable(props: FiltroDesplegableProps): JSX.Element;
