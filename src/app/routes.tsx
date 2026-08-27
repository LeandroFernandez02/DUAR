import { createBrowserRouter, redirect, Outlet } from 'react-router';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import RecuperarContrasena from './pages/RecuperarContrasena';
import Registro from './pages/Registro';
import ConfirmarEmail from './pages/ConfirmarEmail';
import AgenteDashboard from './pages/AgenteDashboard';
import FamiliaDashboard from './pages/FamiliaDashboard';
import GlobalDashboard from './pages/GlobalDashboard';
import Operativos from './pages/Operativos';
import Usuarios from './pages/Usuarios';
import OperativoLayout from './pages/operativo/OperativoLayout';
import OperativoDashboard from './pages/operativo/Dashboard';
import Agentes from './pages/operativo/Agentes';
import Mapa from './pages/operativo/Mapa';
import Clima from './pages/operativo/Clima';
import Informe from './pages/operativo/Informe';
import ObjetivoBuscado from './pages/operativo/ObjetivoBuscado';

/**
 * RootLayout is a thin shell — AppProvider lives in App.tsx, wrapping
 * RouterProvider, so every route here is already inside the context tree.
 */
function RootLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        path: 'login',
        Component: Login,
      },
      {
        // /registro sin operativoId: ruta eliminada por seguridad.
        // El registro solo es posible vía QR → /registro/:operativoId
        // Cualquier intento de acceso directo redirige al login.
        path: 'registro',
        loader: () => redirect('/login'),
      },
      {
        // Registro vía QR (con operativoId)
        path: 'registro/:operativoId',
        Component: Registro,
      },
      {
        // Confirmación de email via link enviado al correo
        path: 'confirmar-email/:token',
        Component: ConfirmarEmail,
      },
      {
        path: 'recuperar-contrasena/:token',
        Component: RecuperarContrasena,
      },
      {
        // Portal dedicado para agentes (sin sidebar)
        path: 'agente',
        Component: AgenteDashboard,
      },
      {
        path: 'familia/:id',
        Component: FamiliaDashboard,
      },
      {
        path: '/',
        Component: MainLayout,
        children: [
          {
            index: true,
            loader: () => redirect('/dashboard'),
          },
          {
            path: 'dashboard',
            Component: GlobalDashboard,
          },
          {
            path: 'operativos',
            Component: Operativos,
          },
          {
            path: 'usuarios',
            Component: Usuarios,
          },
          {
            path: 'operativo/:id',
            Component: OperativoLayout,
            children: [
              {
                index: true,
                loader: ({ params }) => redirect(`/operativo/${params.id}/dashboard`),
              },
              {
                path: 'dashboard',
                Component: OperativoDashboard,
              },
              {
                path: 'agentes',
                Component: Agentes,
              },
              {
                path: 'mapa',
                Component: Mapa,
              },
              {
                path: 'clima',
                Component: Clima,
              },
              {
                path: 'informe',
                Component: Informe,
              },
              {
                path: 'objetivo',
                Component: ObjetivoBuscado,
              },
            ],
          },
        ],
      },
    ],
  },
]);
