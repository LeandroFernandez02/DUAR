/**
 * Collapsible "Simbología táctica" legend card, bottom-right of the map.
 */
export interface MapLegendItem {
  kind: 'line' | 'area' | 'areaDashed' | 'ring' | 'gap' | 'dot' | 'marker';
  label: string;
  color?: string;
  /** For kind="marker": a MapMarker tipo */
  tipo?: string;
}
export interface MapLegendProps {
  title?: string;
  items: MapLegendItem[];
  defaultOpen?: boolean;
  width?: number;
}
export declare function MapLegend(props: MapLegendProps): JSX.Element;
