import { useNavigate } from 'react-router';
import { Compass } from 'lucide-react';
import { MarcoAcceso, TituloAcceso, BotonAcceso } from '../components/auth/Acceso';

/**
 * Dirección que no existe, o un error de carga de la pantalla. Reemplaza a la
 * pantalla de error que trae la librería de rutas ("Hey developer"), que en un
 * sistema publicado no le dice nada útil a quien lo usa.
 */
export default function NoEncontrada() {
  const navigate = useNavigate();
  return (
    <MarcoAcceso>
      <TituloAcceso icono={Compass} titulo="Página no encontrada" texto="La dirección que abriste no existe o ya no está disponible." />
      <BotonAcceso onClick={() => navigate('/')}>Ir al inicio</BotonAcceso>
    </MarcoAcceso>
  );
}
