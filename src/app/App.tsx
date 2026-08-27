import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AppProvider } from './context/AppContext';

/**
 * AppProvider wraps RouterProvider so ALL route components (MainLayout,
 * Login, Registro, etc.) are guaranteed descendants of the context,
 * and the provider reference stays stable across HMR re-evaluations.
 */
export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
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