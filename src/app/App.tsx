import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { useEsCompacto } from './utils/useAncho';
import AvisoSinConexion from './components/shared/AvisoSinConexion';

/**
 * AppProvider wraps RouterProvider so ALL route components (MainLayout,
 * Login, Registro, etc.) are guaranteed descendants of the context,
 * and the provider reference stays stable across HMR re-evaluations.
 */
export default function App() {
  // Avisos abajo al centro (diseño CALÍVAR); en mobile/tablet a 84 px, para no tapar el menú inferior.
  const compacto = useEsCompacto();
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <AvisoSinConexion />
      <Toaster
        position="bottom-center"
        offset={compacto ? 84 : 24}
        mobileOffset={84}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--text-base)',
          },
        }}
      />
    </AppProvider>
  );
}