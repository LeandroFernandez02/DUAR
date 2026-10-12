/**
 * List row for a map element (polígono, traza GPX, punto) in the map side panel.
 * @startingPoint section="Mapa" subtitle="Fila de elemento del mapa" viewport="700x240"
 */
export interface ElementRowProps {
  /** Hex colour — group colour for polygons/traces, marker colour for points */
  color?: string;
  icon?: string;
  title: string;
  meta?: string;
  estado?: string;
  selected?: boolean;
  visible?: boolean;
  onClick?: () => void;
  onToggleVisible?: () => void;
  right?: React.ReactNode;
}
export declare function ElementRow(props: ElementRowProps): JSX.Element;
