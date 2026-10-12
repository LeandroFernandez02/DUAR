/**
 * Floating tool rail over the map: Seleccionar · Polígono · POI · Punto Cero · Cargar GPX · Medir…
 * @startingPoint section="Mapa" subtitle="Barra de herramientas del mapa" viewport="700x220"
 */
export interface MapTool { id?: string; icon?: string; label?: string; disabled?: boolean; /** separator */ sep?: boolean; }
export interface MapToolbarProps {
  tools: MapTool[];
  active?: string;
  onSelect?: (id: string) => void;
  orientation?: 'vertical' | 'horizontal';
  showLabels?: boolean;
}
export declare function MapToolbar(props: MapToolbarProps): JSX.Element;
