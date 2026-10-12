/**
 * Elevation profile area chart for a GPX track (shown in the track popup).
 */
export interface ElevationProfileProps {
  /** Elevation in metres per track point */
  values: number[];
  /** Cumulative distance in metres per point (x axis). Omit for evenly spaced */
  distances?: number[];
  /** Group colour */
  color?: string;
  height?: number;
  width?: number;
}
export declare function ElevationProfile(props: ElevationProfileProps): JSX.Element | null;
