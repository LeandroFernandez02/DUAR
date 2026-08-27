import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, Users, Activity, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { estadisticasMensuales } from '../data/mockData';

export default function GlobalDashboard() {
  const { data, usuario } = useApp();
  const { operativos, usuarios } = data;

  const activos = operativos.filter(o => o.estado === 'activo').length;
  const inactivos = operativos.filter(o => o.estado === 'inactivo').length;
  const planificacion = operativos.filter(o => o.estado === 'planificación').length;
  const totalAgentes = usuarios.filter(u => u.rol === 'agente' && u.estado !== 'eliminado').length;
  const totalKm = operativos.reduce((acc, o) => acc + o.kmRastrillados, 0);

  const estadosPie = [
    { name: 'Activos', value: activos, color: '#16a34a' },
    { name: 'Planificación', value: planificacion, color: '#ca8a04' },
    { name: 'Inactivos', value: inactivos, color: '#dc2626' },
    { name: 'Nuevos', value: operativos.filter(o => o.estado === 'nuevo').length, color: 'var(--accent)' },
  ].filter(e => e.value > 0);

  const statCards = [
    {
      label: 'Total Operativos',
      value: operativos.length,
      icon: <ClipboardList size={20} />,
      color: 'var(--primary)',
      bg: 'rgba(229,75,75,0.08)',
      sub: `${activos} activos ahora`,
    },
    {
      label: 'Operativos Activos',
      value: activos,
      icon: <Activity size={20} />,
      color: '#16a34a',
      bg: '#dcfce7',
      sub: 'En curso',
    },
    {
      label: 'En Planificación',
      value: planificacion,
      icon: <AlertCircle size={20} />,
      color: '#ca8a04',
      bg: '#fef9c3',
      sub: 'Por iniciar',
    },
    {
      label: 'Total Agentes',
      value: totalAgentes,
      icon: <Users size={20} />,
      color: 'var(--accent)',
      bg: 'rgba(255,169,135,0.15)',
      sub: `${usuarios.filter(u => u.estado === 'activo' && u.estado !== 'eliminado').length} activos`,
    },
    {
      label: 'KM Rastrillados',
      value: `${totalKm.toFixed(1)} km`,
      icon: <TrendingUp size={20} />,
      color: 'var(--primary)',
      bg: 'rgba(229,75,75,0.08)',
      sub: 'En todos los operativos',
    },
    {
      label: 'Finalizados',
      value: inactivos,
      icon: <CheckCircle2 size={20} />,
      color: '#15803d',
      bg: '#dcfce7',
      sub: 'Operativos cerrados',
    },
  ];

  const recentOperativos = [...operativos]
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
    .slice(0, 4);

  const estadoBadge = (estado: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      activo: { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
      inactivo: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactivo' },
      'planificación': { bg: '#fef9c3', color: '#a16207', label: 'Planificación' },
      nuevo: { bg: 'rgba(255,169,135,0.2)', color: '#444140', label: 'Nuevo' },
    };
    const c = map[estado] || { bg: '#f3f4f6', color: '#374151', label: estado };
    return (
      <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
        {c.label}
      </span>
    );
  };

  // Custom bar chart — avoids recharts internal key collision in BarChart
  const maxVal = Math.max(...estadisticasMensuales.map(d => d.operativos), 1);
  const chartH = 160;
  const barW = 28;
  const gap = 16;
  const padX = 32;
  const padBottom = 28;
  const totalW = estadisticasMensuales.length * (barW + gap) - gap + padX * 2;

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>
          Bienvenido, {usuario?.nombre} 
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
          Estadisticas generales del Sistema de Búsqueda y Rastreo
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div
            key={card.label}
            className="rounded-[var(--radius-card)] p-5"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
            <p className="mb-0.5" style={{ fontSize: '26px', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>{card.value}</p>
            <p className="mb-0.5" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>
              {card.label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Custom SVG Bar chart — no recharts BarChart to avoid key collisions */}
        <div
          className="lg:col-span-2 rounded-[var(--radius-card)] p-6"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <h3 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
            Operativos por Mes
          </h3>
          <p className="mb-4" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>Últimos 7 meses</p>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              width="100%"
              viewBox={`0 0 ${totalW} ${chartH + padBottom}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ display: 'block', fontFamily: 'var(--font-family-primary)' }}
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = (chartH - padBottom / 2) * (1 - ratio) + 4;
                const tickVal = Math.round(maxVal * ratio);
                return (
                  <g key={`grid-${ratio}`}>
                    <line
                      x1={padX}
                      x2={totalW - padX / 2}
                      y1={y}
                      y2={y}
                      stroke="#dedad8"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padX - 6}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="#9e9b9a"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {estadisticasMensuales.map((d, i) => {
                const barH = Math.max(4, ((d.operativos / maxVal) * (chartH - padBottom / 2 - 4)));
                const x = padX + i * (barW + gap);
                const y = (chartH - padBottom / 2 + 4) - barH;
                const rx = 5;
                return (
                  <g key={`bar-group-${d.mes}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={rx}
                      ry={rx}
                      fill="#E54B4B"
                      opacity={0.9}
                    />
                    {/* Value label on top */}
                    <text
                      x={x + barW / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill="#444140"
                    >
                      {d.operativos}
                    </text>
                    {/* Month label */}
                    <text
                      x={x + barW / 2}
                      y={chartH + padBottom - 6}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#9e9b9a"
                    >
                      {d.mes}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Pie chart — uses recharts PieChart only (no BarChart key issue) */}
        <div
          className="rounded-[var(--radius-card)] p-6"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <h3 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
            Estado Operativos
          </h3>
          <p className="mb-4" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>Distribución actual</p>
          {estadosPie.length > 0 ? (
            <>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={estadosPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {estadosPie.map((entry) => (
                        <Cell key={`cell-pie-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {estadosPie.map((entry) => (
                  <div key={`legend-pie-${entry.name}`} className="flex items-center gap-1.5">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: entry.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-family-primary)',
                      }}
                    >
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="h-[200px] flex items-center justify-center"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Sin datos
            </div>
          )}
        </div>
      </div>

      {/* Recent operativos */}
      
    </div>
  );
}