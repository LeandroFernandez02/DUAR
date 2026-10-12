export interface ModalProps {
  title: string;
  subtitle?: string;
  /** Lucide icon shown in red before the title */
  icon?: string;
  onClose?: () => void;
  children?: React.ReactNode;
  /** Footer actions, right-aligned (Cancelar + primary) */
  footer?: React.ReactNode;
  width?: number;
  open?: boolean;
}
export declare function Modal(props: ModalProps): JSX.Element | null;
