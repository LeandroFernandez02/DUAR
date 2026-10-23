import { useCallback, useEffect, useState } from 'react';
import { Outlet, useParams, Navigate, useNavigate } from 'react-router';
import { Operativo } from '../../data/mockData';
import { operativosApi, ApiError } from '../../services/api';
import { mapearOperativo } from '../../utils/mapearOperativo';
import OperativoHeader from './OperativoHeader';
import { CabeceraMovil } from '../../components/layout/Movil';
import { useEsCompacto } from '../../utils/useAncho';

export interface OperativoOutletContext {
  operativo: Operativo;
  recargarOperativo: () => void;
}

export default function OperativoLayout() {
  const { id } = useParams<{ id: string }>();
  const [operativo, setOperativo] = useState<Operativo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const compacto = useEsCompacto();
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const { operativo: o } = await operativosApi.obtener(id);
      setOperativo(mapearOperativo(o));
    } catch (err) {
      // 404 = no existe / fue eliminado; cualquier otro error de red también
      // manda de vuelta a la lista — no hay nada útil que mostrar sin datos.
      setNotFound(true);
      if (!(err instanceof ApiError) || err.status !== 404) {
        console.error('No se pudo cargar el operativo', err);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!id || notFound) return <Navigate to="/operativos" replace />;

  if (loading || !operativo) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
        Cargando operativo…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* En mobile/tablet el encabezado del operativo va dentro de la barra superior, con el botón volver */}
      {compacto
        ? <CabeceraMovil onVolver={() => navigate('/operativos')}><OperativoHeader operativo={operativo} movil /></CabeceraMovil>
        : <OperativoHeader operativo={operativo} />}
      <div className="scroll-contenido flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        <Outlet context={{ operativo, recargarOperativo: cargar } satisfies OperativoOutletContext} />
      </div>
    </div>
  );
}
