import { FileText } from 'lucide-react';
import ModuloEnConstruccion from '../../components/shared/ModuloEnConstruccion';

/**
 * Informe del operativo (CU-39). La maqueta anterior armaba el informe con
 * datos inventados (sectores, hallazgos, grupos del mock): con un operativo
 * real salía en blanco o mentía. Se quitó hasta construirlo con la línea de
 * tiempo (`eventos_estado`) y la cobertura del Módulo 5. Sigue en el historial de git.
 */
export default function Informe() {
  return (
    <ModuloEnConstruccion
      titulo="Informe"
      icono={FileText}
      detalle="Esta sección todavía no está disponible."
    />
  );
}
