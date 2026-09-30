import { LayoutDashboard } from 'lucide-react';
import ModuloEnConstruccion from '../components/shared/ModuloEnConstruccion';

/**
 * Panel general (CU-40). La versión anterior mostraba cifras inventadas (6
 * operativos, 42,6 km) que no salían de la base: se quitó hasta construirlo
 * con datos reales. Sigue en el historial de git.
 */
export default function GlobalDashboard() {
  return <ModuloEnConstruccion titulo="Panel de Control" icono={LayoutDashboard} />;
}
