export interface SelectOption { value: string; label: string; }
export interface SelectFieldProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  required?: boolean;
  overline?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function SelectField(props: SelectFieldProps): JSX.Element;
