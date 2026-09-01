import { useOutletContext } from 'react-router';
import { LayoutDashboard } from 'lucide-react';
import { OperativoOutletContext } from './OperativoLayout';

/**
 * Esqueleto a propósito: todavía no está definido qué métricas mostrar acá
 * (depende de cómo termine el módulo de Agentes/Grupos, en migración). Se
 * arma el placeholder ahora para no dejar la ruta vacía mientras se decide.
 */
export default function OperativoDashboard() {
  const { operativo } = useOutletContext<OperativoOutletContext>();

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      <div className="mb-8">
        <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
          Dashboard del Operativo
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
          {operativo.nombre}
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-16 rounded-[var(--radius-card)]"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
      >
        <LayoutDashboard size={32} className="mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
        <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
          En construcción
        </p>
        <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
          Todavía se está definiendo qué métricas mostrar en esta sección.
        </p>
      </div>
    </div>
  );
}
