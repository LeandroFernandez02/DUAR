import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router';
import Sidebar, { seccionesDe } from './Sidebar';
import { CabeceraMovil, BarraInferior, HojaPerfil } from './Movil';
import MisDatosModal from '../shared/MisDatosModal';
import { useApp } from '../../context/AppContext';
import { useEsCompacto } from '../../utils/useAncho';

/** Título y leyenda de cada sección global en la barra superior de mobile (diseño CALÍVAR). */
const CABECERAS: Record<string, [string, string]> = {
  '/dashboard': ['Panel de Control', 'Estadísticas Generales de Todos los Operativos'],
  '/operativos': ['Operativos', 'Gestión de Operativos de Búsqueda y Rastrillaje'],
  '/usuarios': ['Usuarios', 'Gestión de Cuentas, Roles y Accesos al Sistema'],
};

/**
 * Layout del sistema del coordinador/administrador. Escritorio (≥ 1024 px): menú lateral.
 * Mobile/tablet: barra superior + menú inferior + hoja de Perfil (Movil.tsx). Dentro de un
 * operativo la barra superior la pone OperativoLayout, con el encabezado del operativo.
 */
export default function MainLayout() {
  const { isAuthenticated, usuario, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const compacto = useEsCompacto();
  const [perfil, setPerfil] = useState(false);
  const [misDatos, setMisDatos] = useState(false);

  // La hoja de Perfil no queda abierta sobre la pantalla siguiente.
  useEffect(() => { setPerfil(false); }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Los agentes tienen su propio panel dedicado
  if (usuario?.rol === 'agente') {
    return <Navigate to="/agente" replace />;
  }

  const { enOperativo, items } = seccionesDe(location.pathname);

  if (!compacto) return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar onVerDatos={() => setMisDatos(true)} />
      <main className="scroll-contenido flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative">
        <Outlet />
      </main>
      {misDatos && <MisDatosModal onClose={() => setMisDatos(false)} />}
    </div>
  );

  const [titulo, leyenda] = CABECERAS[location.pathname] ?? ['', ''];
  return (
    <div className="flex flex-col overflow-hidden relative" style={{ height: '100dvh', background: 'var(--background)', color: 'var(--foreground)' }}>
      {!enOperativo && <CabeceraMovil titulo={titulo} subtitulo={leyenda} />}
      <main className={`scroll-contenido contenido-movil${enOperativo ? '' : ' global'} flex-1 min-h-0 overflow-x-hidden relative ${enOperativo ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Outlet />
      </main>
      <BarraInferior items={items} activo={p => location.pathname === p} perfilAbierto={perfil}
        onPerfil={() => setPerfil(p => !p)} onNavegar={() => setPerfil(false)} />
      {perfil && (
        <HojaPerfil onCerrar={() => setPerfil(false)}
          onVerDatos={() => { setPerfil(false); setMisDatos(true); }}
          onSalir={() => { setPerfil(false); logout(); navigate('/login'); }} />
      )}
      {misDatos && <MisDatosModal pantalla onClose={() => setMisDatos(false)} />}
    </div>
  );
}
