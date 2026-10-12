export interface FilterPillProps {
  children?: React.ReactNode;
  /** Count shown in a nested pill */
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  /** Optional status dot colour */
  dot?: string;
}
export declare function FilterPill(props: FilterPillProps): JSX.Element;
