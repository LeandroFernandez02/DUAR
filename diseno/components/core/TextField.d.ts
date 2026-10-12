export interface TextFieldProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  /** Uppercase muted label (side panels, e.g. PuntoDetailPanel) instead of the form label */
  overline?: boolean;
  type?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
