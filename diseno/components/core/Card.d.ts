export interface CardProps {
  children?: React.ReactNode;
  padding?: number | string;
  /** Soft drop shadow (--elevation-sm). Default true */
  elevated?: boolean;
  /** Dashed empty-state card */
  dashed?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}
export declare function Card(props: CardProps): JSX.Element;
