/**
 * Action button used across DUAR (header quick actions, modal footers, panels).
 * @startingPoint section="Core" subtitle="Botones del sistema DUAR" viewport="700x260"
 */
export interface ButtonProps {
  /** primary = main action (red) · soft = red tint (e.g. "Objetivo" when loaded) · muted = grey header actions (QR, Informe) · outline = modal "Cancelar" · ghost = icon/text only · danger = destructive confirm */
  variant?: 'primary' | 'soft' | 'muted' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name shown before the label */
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: (e: any) => void;
  title?: string;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
