import { Outlet, Navigate } from 'react-router';
import Sidebar from './Sidebar';
import { useApp } from '../../context/AppContext';

export default function MainLayout() {
  const { isAuthenticated, usuario } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Los agentes tienen su propio panel dedicado
  if (usuario?.rol === 'agente') {
    return <Navigate to="/agente" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}