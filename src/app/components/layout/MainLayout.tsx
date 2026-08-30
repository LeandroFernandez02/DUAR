import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router';
import { Menu, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import { useApp } from '../../context/AppContext';

export default function MainLayout() {
  const { isAuthenticated, usuario } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar el drawer al cambiar de pantalla — si quedara abierto, la próxima
  // navegación por debajo se vería tapada por el fondo oscuro.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Los agentes tienen su propio panel dedicado
  if (usuario?.rol === 'agente') {
    return <Navigate to="/agente" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior: sólo en mobile (el sidebar de desktop ya muestra
            todo esto). Es lo único que le da al usuario una forma de abrir
            el menú una vez que el sidebar deja de estar siempre visible. */}
        <header
          className="flex md:hidden items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: 'var(--sidebar-foreground)', background: 'none', border: 'none' }}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            <Shield size={15} color="#fff" />
          </div>
          <p style={{ color: 'var(--sidebar-foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.08em' }}>
            DUAR
          </p>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
