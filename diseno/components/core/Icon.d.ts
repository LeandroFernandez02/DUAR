export interface IconProps {
  /** Lucide icon name in kebab-case, e.g. "map-pin", "crosshair", "flag". */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
