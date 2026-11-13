import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { CircleCheck, CircleX, TriangleAlert, Info, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { useEsCompacto } from './utils/useAncho';
import AvisoSinConexion from './components/shared/AvisoSinConexion';
import ActualizacionApp from './components/shared/ActualizacionApp';

/** Encima del menú inferior en celular y tablet; en escritorio, a 24 px del borde. */
const SOBRE_MENU = 'calc(84px + env(safe-area-inset-bottom))';

/**
 * AppProvider wraps RouterProvider so ALL route components (MainLayout,
 * Login, Registro, etc.) are guaranteed descendants of the context,
 * and the provider reference stays stable across HMR re-evaluations.
 */
export default function App() {
  // Avisos abajo al centro (diseño CALÍVAR), con la estructura de utils/aviso.ts y el estilo `.aviso`
  // de theme.css. El margen lateral es aparte del de abajo: antes los 84 px del menú se aplicaban
  // también a los costados y en el celular la caja quedaba angosta y alta (13/11).
  const compacto = useEsCompacto();
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <AvisoSinConexion />
      <ActualizacionApp />
      <Toaster
        position="bottom-center"
        offset={{ bottom: compacto ? SOBRE_MENU : 24 }}
        mobileOffset={{ bottom: SOBRE_MENU, left: 12, right: 12 }}
        style={{ '--width': '440px' } as CSSProperties}
        icons={{
          success: <CircleCheck size={18} />, error: <CircleX size={18} />, warning: <TriangleAlert size={18} />,
          info: <Info size={18} />, loading: <Loader2 size={18} className="animate-spin" />,
        }}
        toastOptions={{ classNames: { toast: 'aviso' } }}
      />
    </AppProvider>
  );
}
