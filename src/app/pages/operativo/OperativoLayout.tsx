import { useCallback, useEffect, useState } from 'react';
import { Outlet, useParams, Navigate, useNavigate, useLocation } from 'react-router';
import { Operativo } from '../../data/mockData';
import { aviso } from '../../utils/aviso';
import { operativosApi, marcadoresApi, ApiError } from '../../services/api';
import { mapearOperativo } from '../../utils/mapearOperativo';
import OperativoHeader from './OperativoHeader';
import { CabeceraMovil } from '../../components/layout/Movil';
import { useEsCompacto } from '../../utils/useAncho';
import { useApp } from '../../context/AppContext';
import { ROL_JEFE } from '../../services/api';

export interface OperativoOutletContext {
  operativo: Operativo;
  recargarOperativo: () => void;
  /** Jefe de Operativo (rol del 02/11): ve todo el operativo, no modifica nada (salvo el Jefe y los informes). */
  soloConsulta: boolean;
}

/** Lo dispara el aviso de abajo: el mapa lo escucha para traer enseguida lo que cargó un Líder. */
export const EVENTO_NOVEDAD_LIDER = 'calivar:novedad-lider';
const NOVEDADES_MS = 20_000;

/**
 * Aviso al coordinador (pedido del 03/11): lo que los Líderes de Grupo cargan desde el portal
 * (puntos de interés y hallazgos) aparece como aviso en cualquier pantalla del operativo, con
 * «Ver en el mapa». Se consulta liviano (sin fotos) cada 20 s, desde que se abrió el operativo.
 */
function useAvisoLideres(operativoId: string | undefined) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!operativoId) return;
    let desde = new Date().toISOString();
    let vigente = true;
    const consultar = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await marcadoresApi.novedades(operativoId, desde);
        if (!vigente) return;
        desde = r.hasta;
        if (!r.novedades.length) return;
        window.dispatchEvent(new Event(EVENTO_NOVEDAD_LIDER));
        for (const n of r.novedades) {
          const que = n.clase === 'HALLAZGO' ? 'Nuevo hallazgo' : 'Nuevo punto de interés';
          const fuera = n.fueraPoligonoM !== null ? ' · fuera del polígono' : '';
          (n.clase === 'HALLAZGO' ? aviso.atencion : aviso.info)(
            `${n.nombre} · cargado por el Líder del grupo ${n.grupoNombre}${n.creadoPor ? ` (${n.creadoPor})` : ''}${fuera}.`, {
              titulo: que,
              duracion: 12_000,
              accion: { label: 'Ver en el mapa', onClick: () => navigate(`/operativo/${operativoId}/mapa`) },
            });
        }
      } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
    };
    const id = setInterval(consultar, NOVEDADES_MS);
    return () => { vigente = false; clearInterval(id); };
  }, [operativoId, navigate]);
}

export default function OperativoLayout() {
  const { id } = useParams<{ id: string }>();
  const [operativo, setOperativo] = useState<Operativo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const compacto = useEsCompacto();
  const navigate = useNavigate();
  const { usuario } = useApp();
  const soloConsulta = usuario?.rol === ROL_JEFE;
  const { pathname } = useLocation();
  useAvisoLideres(id);

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
        ? <CabeceraMovil onVolver={() => navigate('/operativos')}><OperativoHeader operativo={operativo} movil onRecargar={cargar} soloConsulta={soloConsulta} /></CabeceraMovil>
        : <OperativoHeader operativo={operativo} onRecargar={cargar} soloConsulta={soloConsulta} />}
      {/* En < 1024 el mapa sube 20 px por debajo de las esquinas redondeadas de la barra superior */}
      <div className="scroll-contenido flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
        style={compacto && pathname.endsWith('/mapa') ? { marginTop: -20 } : undefined}>
        <Outlet context={{ operativo, recargarOperativo: cargar, soloConsulta } satisfies OperativoOutletContext} />
      </div>
    </div>
  );
}
