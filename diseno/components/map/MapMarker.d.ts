/**
 * Map pin for Módulo 5 points: Punto Cero (LSP), POI, Hallazgo and the SCI installations
 * (Puesto de Comando, Base, Campamento, Helipunto, Área de Espera, ACV). Points are round; SCI installations are blue squares with their SCI letter.
 * @startingPoint section="Mapa" subtitle="Marcadores del mapa operacional" viewport="700x200"
 */
export interface MapMarkerProps {
  tipo?: 'puntoCero' | 'poi' | 'hallazgo' | 'puestoComando' | 'base' | 'campamento' | 'helipunto' | 'espera' | 'acv';
  /** Small dark caption under the pin */
  label?: string;
  selected?: boolean;
  /** pin = on-map marker · chip = 32px tinted square for panels · mini = 16px solid swatch for trees/legends */
  variant?: 'pin' | 'chip' | 'mini';
}
export declare function MapMarker(props: MapMarkerProps): JSX.Element;
export declare const TIPOS_MARCADOR: Record<string, { color: string; bg: string; label: string; icon?: string; glyph?: string; sci?: boolean }>;
export declare const TIPOS_SCI: string[];
