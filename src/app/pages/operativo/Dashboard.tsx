import { useOutletContext } from 'react-router';
import { LayoutDashboard } from 'lucide-react';
import { OperativoOutletContext } from './OperativoLayout';
import ModuloEnConstruccion from '../../components/shared/ModuloEnConstruccion';

/**
 * Esqueleto a propósito: todavía no está definido qué métricas mostrar acá
 * (depende de cómo termine el módulo de Agentes/Grupos, en migración). Se
 * arma el placeholder ahora para no dejar la ruta vacía mientras se decide.
 */
export default function OperativoDashboard() {
  const { operativo } = useOutletContext<OperativoOutletContext>();
  return <ModuloEnConstruccion titulo="Panel de Control" subtitulo={operativo.nombre} icono={LayoutDashboard} />;
}
