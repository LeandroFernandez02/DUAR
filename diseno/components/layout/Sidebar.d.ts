/**
 * Dark charcoal app sidebar. In an operativo it shows "Volver a Operativos" + the mission modules (Panel, Agentes, Mapa).
 * @startingPoint section="Layout" subtitle="Sidebar global / de operativo" viewport="700x520"
 */
export interface SidebarItem { icon: string; label: string; active?: boolean; path?: string; }
export interface SidebarProps {
  items: SidebarItem[];
  context?: 'global' | 'operativo';
  user?: { nombre: string; apellido: string; rol: string; email?: string };
  isDark?: boolean;
  onToggleDark?: () => void;
  onNavigate?: (item: SidebarItem) => void;
  onBack?: () => void;
  /** Profile button opens an account popover (name, email, "Cerrar sesión") */
  onLogout?: () => void;
  defaultCollapsed?: boolean;
}
export declare function Sidebar(props: SidebarProps): JSX.Element;
