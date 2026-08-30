import { createBrowserRouter, redirect, Outlet } from 'react-router';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';

/**
 * Carga de rutas: eager vs. lazy.
 *
 * Login y Usuarios se importan de entrada porque son la puerta del sistema y el
 * Módulo 2; que aparezcan al instante es lo que más se nota.
 *
 * El resto se carga bajo demanda con `lazy`. El motivo es concreto: las páginas
 * de Mapa y Clima arrastran Leaflet, y los dashboards arrastran Recharts. Sin
 * dividir, un coordinador que sólo entra a loguearse igual se descargaba todo
 * ese código. Cada `lazy` genera un archivo aparte que sólo viaja si se visita
 * esa pantalla.
 */
const RootLayout = () => <Outlet />;

/** Envuelve un import dinámico en la forma que espera react-router. */
const cargar = (importar: () => Promise<{ default: React.ComponentType }>) =>
  async () => ({ Component: (await importar()).default });

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
        lazy: cargar(() => import('./pages/Registro')),
      },
      {
        // Confirmación de email via link enviado al correo
        path: 'confirmar-email/:token',
        lazy: cargar(() => import('./pages/ConfirmarEmail')),
      },
      {
        path: 'recuperar-contrasena/:token',
        lazy: cargar(() => import('./pages/RecuperarContrasena')),
      },
      {
        // Portal dedicado para agentes (sin sidebar)
        path: 'agente',
        lazy: cargar(() => import('./pages/AgenteDashboard')),
      },
      {
        path: 'familia/:id',
        lazy: cargar(() => import('./pages/FamiliaDashboard')),
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
            lazy: cargar(() => import('./pages/GlobalDashboard')),
          },
          {
            path: 'operativos',
            lazy: cargar(() => import('./pages/Operativos')),
          },
          {
            path: 'usuarios',
            Component: Usuarios,
          },
          {
            path: 'operativo/:id',
            lazy: cargar(() => import('./pages/operativo/OperativoLayout')),
            children: [
              {
                index: true,
                loader: ({ params }) => redirect(`/operativo/${params.id}/dashboard`),
              },
              {
                path: 'dashboard',
                lazy: cargar(() => import('./pages/operativo/Dashboard')),
              },
              {
                path: 'agentes',
                lazy: cargar(() => import('./pages/operativo/Agentes')),
              },
              {
                path: 'mapa',
                lazy: cargar(() => import('./pages/operativo/Mapa')),
              },
              {
                path: 'clima',
                lazy: cargar(() => import('./pages/operativo/Clima')),
              },
              {
                path: 'informe',
                lazy: cargar(() => import('./pages/operativo/Informe')),
              },
              {
                path: 'objetivo',
                lazy: cargar(() => import('./pages/operativo/ObjetivoBuscado')),
              },
            ],
          },
        ],
      },
    ],
  },
]);
