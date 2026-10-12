/**
 * CU-38 coverage of a polygon by GPX traces. Red < 40 % · yellow < 75 % · green ≥ 75 % (status colours).
 */
export interface CoverageBarProps {
  /** 0–100 */
  value: number;
  label?: string;
  showValue?: boolean;
  height?: number;
  /** Override the automatic status colour */
  color?: string;
}
export declare function CoverageBar(props: CoverageBarProps): JSX.Element;
