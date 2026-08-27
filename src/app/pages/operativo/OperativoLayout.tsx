import { Outlet, useParams, Navigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import OperativoHeader from './OperativoHeader';

export default function OperativoLayout() {
  const { id } = useParams<{ id: string }>();
  const { getOperativo } = useApp();

  if (!id) return <Navigate to="/operativos" replace />;
  const operativo = getOperativo(id);
  if (!operativo) return <Navigate to="/operativos" replace />;

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontFamily: 'var(--font-family-primary)' }}>
      <OperativoHeader operativo={operativo} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
