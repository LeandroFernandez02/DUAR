/**
 * Google-Earth-style collapsible tree for the map side panel ("Gestión del mapa"): +/− toggle, optional layer checkbox, uppercase title, count badge.
 * @startingPoint section="Mapa" subtitle="Árbol de capas del panel lateral" viewport="700x320"
 */
export interface TreeSectionProps {
  title: string;
  /** Lucide icon; turns red when the section is open */
  icon?: string;
  badge?: React.ReactNode;
  /** Controlled open state (omit for uncontrolled) */
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  /** Layer visibility checkbox in the header (shown when onCheck is set) */
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  children?: React.ReactNode;
}
export declare function TreeSection(props: TreeSectionProps): JSX.Element;

export interface TreeRowProps {
  label: React.ReactNode;
  meta?: React.ReactNode;
  /** Colour swatch / MapMarker mini before the label */
  swatch?: React.ReactNode;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  selected?: boolean;
  onClick?: () => void;
  /** Nesting level (18px per level) */
  indent?: number;
  /** Uppercase muted sub-header row */
  strong?: boolean;
  /** Render the checkbox as a radio (base map choice) */
  radio?: boolean;
  name?: string;
}
export declare function TreeRow(props: TreeRowProps): JSX.Element;
