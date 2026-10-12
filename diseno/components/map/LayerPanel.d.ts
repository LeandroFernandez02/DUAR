/**
 * CU-31 Visualizar Capas: base map switch (Político / Físico / Satelital) + element overlays toggles.
 * @startingPoint section="Mapa" subtitle="Panel de capas" viewport="700x380"
 */
export interface LayerBase { id: string; label: string; icon?: string; }
export interface LayerOverlay { id: string; label: string; checked?: boolean; icon?: string; color?: string; count?: number; }
export interface LayerPanelProps {
  bases: LayerBase[];
  base: string;
  onBase?: (id: string) => void;
  overlays: LayerOverlay[];
  onToggle?: (id: string) => void;
  onClose?: () => void;
}
export declare function LayerPanel(props: LayerPanelProps): JSX.Element;
