import { useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { FileText, Printer, Shield, MapPin, Calendar, Users, CheckCircle2, Activity } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import StatusBadge from '../../components/shared/StatusBadge';

export default function Informe() {
  const { id } = useParams<{ id: string }>();
  const { getOperativo, data } = useApp();

  const operativo = getOperativo(id!);
  if (!operativo) return null;

  const agentes = data.usuarios.filter(u => u.estado !== 'eliminado' && operativo.agenteIds.includes(u.id));
  const grupos = data.grupos.filter(g => operativo.grupoIds.includes(g.id));
  const coordinador = data.usuarios.find(u => u.id === operativo.coordinadorId);
  const today = new Date();
  const inicio = new Date(operativo.fechaInicio + 'T00:00:00');
  const diasOperativo = Math.max(1, differenceInDays(today, inicio) + 1);
  const sectoresCompletados = operativo.sectores.filter(s => s.estado === 'completado').length;
  const puntoCero = operativo.puntos.find(p => p.tipo === 'puntoCero');
  const hallazgos = operativo.puntos.filter(p => p.tipo === 'hallazgo');

  const handlePrint = () => window.print();

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Controls - hidden on print */}
      <div className="no-print flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
            Generador de Informe Final
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
            Revisá el informe y hacé clic en imprimir para generar el PDF.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] text-white hover:opacity-90"
          style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          <Printer size={16} />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Informe document */}
      <div
        id="informe-document"
        className="rounded-[var(--radius-card)] overflow-hidden"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
      >
        {/* Header del informe */}
        <div
          className="p-8"
          style={{ background: 'var(--duar-dark, #444140)', color: '#F7EBE8' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <Shield size={24} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>DUAR</p>
                  <p style={{ fontSize: 'var(--text-label)', opacity: 0.6 }}>Dirección de Unidades de Alto Riesgo</p>
                </div>
              </div>
              <h2 className="mb-1" style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>{operativo.nombre}</h2>
              <p style={{ fontSize: 'var(--text-base)', opacity: 0.7 }}>Informe Final de Operativo</p>
            </div>
            <div className="text-right">
              <StatusBadge estado={operativo.estado} />
              <p className="mt-2" style={{ fontSize: 'var(--text-label)', opacity: 0.6 }}>
                Emitido: {today.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ fontSize: 'var(--text-label)', opacity: 0.6 }}>
                Duración: {diasOperativo} día{diasOperativo !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8">
          {/* Sección 1: Datos del Operativo */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
                <FileText size={14} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                1. Datos del Operativo
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nombre del Operativo', value: operativo.nombre, icon: <FileText size={13} /> },
                { label: 'Estado', value: <StatusBadge estado={operativo.estado} size="sm" />, icon: <Activity size={13} /> },
                { label: 'Ubicación', value: operativo.ubicacion, icon: <MapPin size={13} /> },
                { label: 'Punto Cero', value: puntoCero ? puntoCero.nombre : 'No definido', icon: <MapPin size={13} /> },
                { label: 'Fecha de Inicio', value: new Date(operativo.fechaInicio + 'T00:00:00').toLocaleDateString('es-AR'), icon: <Calendar size={13} /> },
                { label: 'Fecha de Cierre', value: operativo.fechaFin ? new Date(operativo.fechaFin + 'T00:00:00').toLocaleDateString('es-AR') : '—', icon: <Calendar size={13} /> },
                { label: 'Coordinador', value: coordinador ? `${coordinador.nombre} ${coordinador.apellido}` : '—', icon: <Users size={13} /> },
                { label: 'Días de Operativo', value: diasOperativo, icon: <Calendar size={13} /> },
              ].map(item => (
                <div
                  key={item.label}
                  className="p-3 rounded-xl"
                  style={{ background: 'var(--muted)' }}
                >
                  <p className="mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
                    {item.icon} {item.label}
                  </p>
                  <div style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 2: Objetivo */}
          {operativo.objetivo && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
                  <Activity size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  2. Objetivo de la Misión
                </h3>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--muted)', borderLeft: '3px solid var(--primary)' }}>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)' }}>{operativo.objetivo}</p>
              </div>
              {operativo.descripcion && (
                <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--muted)' }}>
                  <p className="mb-1" style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Descripción General</p>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)' }}>{operativo.descripcion}</p>
                </div>
              )}
            </section>
          )}

          {/* Sección 3: Métricas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
                <Activity size={14} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                3. Métricas del Operativo
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Agentes', value: agentes.length, color: 'var(--primary)', bg: 'rgba(229,75,75,0.08)' },
                { label: 'Grupos de Rastrillaje', value: grupos.length, color: '#2563eb', bg: '#dbeafe' },
                { label: 'Sectores Completados', value: `${sectoresCompletados}/${operativo.sectores.length}`, color: '#16a34a', bg: '#dcfce7' },
                { label: 'KM Rastrillados', value: `${operativo.kmRastrillados} km`, color: 'var(--accent)', bg: 'rgba(255,169,135,0.15)' },
              ].map(m => (
                <div key={m.label} className="p-4 rounded-xl text-center" style={{ background: m.bg }}>
                  <p style={{ color: m.color, fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>{m.value}</p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{m.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 4: Agentes */}
          {agentes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
                  <Users size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  4. Personal Interviniente ({agentes.length} agentes)
                </h3>
              </div>
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full">
                  <thead style={{ background: 'var(--muted)' }}>
                    <tr>
                      {['Nombre y Apellido', 'DNI', 'Especialidad', 'Dotación', 'Grupo Sanguíneo'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentes.map((a) => (
                      <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="px-4 py-2.5" style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>{a.nombre} {a.apellido}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>{a.dni}</td>
                        <td className="px-4 py-2.5 capitalize" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>{a.especialidad || '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>{a.dotacion || '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>{a.grupo_sanguineo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Sección 5: Sectores */}
          {operativo.sectores.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(229,75,75,0.1)' }}>
                  <MapPin size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  5. Sectores de Rastrillaje
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {operativo.sectores.map(sector => {
                  const grupoAsig = grupos.find(g => g.id === sector.grupoAsignado);
                  return (
                    <div key={sector.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                      <div className="flex items-center gap-3">
                        {sector.estado === 'completado'
                          ? <CheckCircle2 size={15} color="#16a34a" />
                          : sector.estado === 'en_progreso'
                          ? <Activity size={15} color="#2563eb" />
                          : <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: '#FFA987' }} />
                        }
                        <div>
                          <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{sector.nombre}</p>
                          {grupoAsig && <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>Grupo: {grupoAsig.nombre}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{sector.area} km²</span>
                        <StatusBadge estado={sector.estado} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sección 6: Hallazgos */}
          {hallazgos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#dcfce7' }}>
                  <CheckCircle2 size={14} color="#16a34a" />
                </div>
                <h3 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  6. Hallazgos Registrados
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {hallazgos.map(h => (
                  <div key={h.id} className="p-3 rounded-xl" style={{ background: '#dcfce7' }}>
                    <p style={{ color: '#15803d', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{h.nombre}</p>
                    {h.descripcion && <p className="mt-0.5" style={{ color: '#166534', fontSize: 'var(--text-label)' }}>{h.descripcion}</p>}
                    <p className="mt-1" style={{ color: '#15803d', fontSize: '11px' }}>
                      Coordenadas: {h.lat.toFixed(4)}°S, {Math.abs(h.lng).toFixed(4)}°O
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Firma */}
          <section className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="h-px mb-2" style={{ background: 'var(--border)' }} />
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {coordinador ? `${coordinador.nombre} ${coordinador.apellido}` : 'Coordinador'}
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                  Coordinador del Operativo
                </p>
              </div>
              <div>
                <div className="h-px mb-2" style={{ background: 'var(--border)' }} />
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Firma y sello DUAR
                </p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                  Dirección de Unidades de Alto Riesgo — Córdoba
                </p>
              </div>
            </div>
            <p className="text-center mt-6" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
              Documento generado el {today.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}Sistema DUAR v2.0 · Confidencial
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}