import { Map as MapaIcono } from 'lucide-react';
import ModuloEnConstruccion from '../../components/shared/ModuloEnConstruccion';

/**
 * Mapa operacional (Módulo 5, CU-27 a CU-38). La maqueta anterior dibujaba
 * sobre datos inventados y la base no tiene tablas de polígonos ni trazas:
 * se quitó hasta diseñar el esquema con PostGIS. Sigue en el historial de git.
 */
export default function Mapa() {
  return (
    <ModuloEnConstruccion
      titulo="Mapa"
      icono={MapaIcono}
      detalle="Esta sección todavía no está disponible."
    />
  );
}
