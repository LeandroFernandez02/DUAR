/**
 * Info balloon content anchored to a map element (track, POI, installation, Punto Cero) — the Google Earth "info del track" pattern in DUAR style.
 * Mount inside a Leaflet popup with className "duar-popup" (card radius 14, no padding).
 */
export interface MapPopupProps {
  /** Lucide icon in a tinted 32px chip */
  icon?: string;
  /** Custom chip node (e.g. <MapMarker variant="chip" />) instead of icon */
  chip?: React.ReactNode;
  color?: string;
  bg?: string;
  /** Uppercase coloured line above the title (element type) */
  kicker?: string;
  title: string;
  /** Centers the kicker/title block (used when the popup has no title, e.g. Track GPX) */
  centrado?: boolean;
  subtitle?: string;
  onClose?: () => void;
  children?: React.ReactNode;
  /** Right-aligned footer actions */
  actions?: React.ReactNode;
  width?: number;
}
export declare function MapPopup(props: MapPopupProps): JSX.Element;
