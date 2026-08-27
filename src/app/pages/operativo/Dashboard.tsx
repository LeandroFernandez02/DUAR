import { useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Users, Activity, Coffee, UserMinus, Navigation, Map } from 'lucide-react';
import { RadialBarChart, RadialBar, Tooltip } from 'recharts';
import StatusBadge from '../../components/shared/StatusBadge';

export default function OperativoDashboard() {
  const { id } = useParams<{ id: string }>();
  const { getOperativo, data } = useApp();

  // Derive operativo BEFORE any callbacks that reference it
  const operativo = getOperativo(id!);

  if (!operativo) return null;

  const agentes = data.usuarios.filter(u => u.estado !== 'eliminado' && operativo.agenteIds.includes(u.id));
  const grupos = data.grupos.filter(g => operativo.grupoIds.includes(g.id));

  const rastrillando = grupos.filter(g => g.estado === 'rastrillando').reduce((acc, g) => acc + g.agenteIds.length, 0);
  const descansando = grupos.filter(g => g.estado === 'descansando').reduce((acc, g) => acc + g.agenteIds.length, 0);
  const inactivos = agentes.length - rastrillando - descansando;
  const sectoresCompletados = operativo.sectores.filter(s => s.estado === 'completado').length;
  const totalSectores = operativo.sectores.length;
  const progreso = totalSectores > 0 ? Math.round((sectoresCompletados / totalSectores) * 100) : 0;

  const statCards = [
    {
      label: 'Total Agentes',
      value: agentes.length,
      icon: <Users size={20} />,
      color: 'var(--primary)',
      bg: 'rgba(229,75,75,0.08)',
    },
    {
      label: 'Rastrillando',
      value: rastrillando,
      icon: <Activity size={20} />,
      color: '#16a34a',
      bg: '#dcfce7',
    },
    {
      label: 'Descansando',
      value: descansando,
      icon: <Coffee size={20} />,
      color: '#ca8a04',
      bg: '#fef9c3',
    },
    {
      label: 'Inactivos',
      value: Math.max(0, inactivos),
      icon: <UserMinus size={20} />,
      color: '#dc2626',
      bg: '#fee2e2',
    },
    {
      label: 'KM Rastrillados',
      value: `${operativo.kmRastrillados.toFixed(1)} km`,
      icon: <Navigation size={20} />,
      color: 'var(--accent)',
      bg: 'rgba(255,169,135,0.15)',
    },
    {
      label: 'Sectores Activos',
      value: `${sectoresCompletados}/${totalSectores}`,
      icon: <Map size={20} />,
      color: 'var(--primary)',
      bg: 'rgba(229,75,75,0.08)',
    },
  ];

  const radialData = [
    { name: 'Progreso', value: progreso, fill: '#E54B4B' },
  ];

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
            Dashboard del Operativo
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
            Métricas en tiempo real · {operativo.nombre}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div
            key={card.label}
            className="rounded-[var(--radius-card)] p-5"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <p style={{ fontSize: '26px', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>{card.value}</p>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Progreso sectores */}
        <div
          className="rounded-[var(--radius-card)] p-6 flex flex-col items-center justify-center"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <h3 className="mb-4 text-center" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)' }}>
            Progreso de Rastrillaje
          </h3>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <RadialBarChart width={140} height={140} cx={70} cy={70} innerRadius="65%" outerRadius="95%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f0eded' }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Progreso']} contentStyle={{ fontFamily: 'var(--font-family-primary)', fontSize: 12, borderRadius: 8 }} />
            </RadialBarChart>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>{progreso}%</span>
            </div>
          </div>
          <p className="mt-3" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
            {sectoresCompletados} de {totalSectores} sectores completados
          </p>
        </div>

        {/* Grupos de Rastrillaje */}
        <div
          className="lg:col-span-2 rounded-[var(--radius-card)] p-6"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <h3 className="mb-4" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)' }}>
            Grupos de Rastrillaje
          </h3>
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--muted-foreground)' }}>
              <Users size={28} className="mb-2 opacity-30" />
              <p style={{ fontSize: 'var(--text-base)' }}>No hay grupos asignados.</p>
              <p style={{ fontSize: 'var(--text-label)' }}>Configurá los grupos en el módulo de Agentes.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {grupos.map(grupo => {
                const lider = data.usuarios.find(u => u.id === grupo.lider);
                return (
                  <div
                    key={grupo.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: grupo.color }}
                      />
                      <div>
                        <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{grupo.nombre}</p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                          Líder: {lider ? `${lider.nombre} ${lider.apellido}` : '—'} · {grupo.agenteIds.length} agentes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                        {grupo.kmRecorridos} km
                      </span>
                      <StatusBadge estado={grupo.estado} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}