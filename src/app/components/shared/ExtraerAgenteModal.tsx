/**
 * ExtraerAgenteModal — CU-26: Extraer Agente de Grupo Activo (Baja Parcial / Contingencia)
 *
 * Retira a un agente de su cuadrilla SIN desarmar el grupo, gestionando:
 *  · Paso 3   → motivo de la baja + nuevo estado individual (Descansando / Replegado)
 *  · Paso 4.1 → Sucesión de Mando: si el que sale es el Líder, es obligatorio
 *               designar reemplazo. Cancelar aborta la extracción.
 *  · Paso 5.1 → Binomio Mínimo: si el grupo queda con 1 integrante, se advierte
 *               que el sistema lo pausará automáticamente.
 *  · Obs.1    → La participación NO se borra: el período queda sellado con
 *               fechaFin y motivo en agentesGrupoHistorial (trazabilidad judicial).
 */
import { useState } from 'react';
import { X, AlertTriangle, UserMinus, ShieldAlert, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AgenteOperativo, EstadoOperativoAgente, Usuario } from '../../data/mockData';

/** Motivos sugeridos por el CU (paso 3). El Coordinador puede escribir otro. */
const MOTIVOS = ['Lesión', 'Emergencia Personal', 'Reasignación'];

/** Estados individuales admitidos al salir del grupo (post-condición del CU). */
const ESTADOS_SALIDA: { value: EstadoOperativoAgente; label: string; desc: string }[] = [
  { value: 'descansando', label: 'Descansando', desc: 'Se queda en el operativo, en descanso' },
  { value: 'replegado',   label: 'Replegado',   desc: 'Vuelve al punto de origen del comando' },
];

interface Props {
  agenteOp: AgenteOperativo;
  usuario: Usuario;
  onClose: () => void;
}

export default function ExtraerAgenteModal({ agenteOp, usuario, onClose }: Props) {
  const { evaluarExtraccion, extraerAgenteDeGrupo, data } = useApp();

  const evaluacion = evaluarExtraccion(agenteOp.id);

  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOperativoAgente>('descansando');
  const [nuevoLider, setNuevoLider] = useState('');
  const [riesgoAceptado, setRiesgoAceptado] = useState(false);
  const [hecho, setHecho] = useState(false);

  const nombreDe = (usuarioId: string) => {
    const u = data.usuarios.find(x => x.id === usuarioId);
    return u ? `${u.nombre} ${u.apellido}` : usuarioId;
  };

  const motivoFinal = motivo === 'Otro' ? motivoOtro.trim() : motivo;

  // Extraído con ternario para que el estrechamiento del union sea fiable
  // incluso sin strictNullChecks (el proyecto no tiene tsconfig propio).
  const bloqueo = evaluacion.permitido ? null : evaluacion.motivo;
  const estadoGrupoBloqueado = evaluacion.permitido ? null : evaluacion.grupo?.estado;

  /* ── Precondiciones no cumplidas: se explica y no se deja continuar ── */
  if (bloqueo) {
    const mensajes: Record<string, string> = {
      sin_grupo: 'Este agente no integra ningún grupo, así que no hay nada que extraer.',
      estado_grupo: `El grupo está en estado "${estadoGrupoBloqueado ?? '—'}". Solo se puede extraer personal de un grupo Desplegado, Rastrillando o En Pausa.`,
      minimo_integrantes: 'El grupo tiene un solo integrante. Para retirarlo, disolvé el grupo (CU-25) en lugar de extraer al agente.',
    };
    return (
      <Overlay onClose={onClose}>
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <IconBox bg="rgba(202,138,4,0.12)"><AlertTriangle size={17} style={{ color: '#ca8a04' }} /></IconBox>
          <div>
            <Titulo>No se puede extraer</Titulo>
            <Texto>{mensajes[bloqueo]}</Texto>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end">
          <BotonSecundario onClick={onClose}>Entendido</BotonSecundario>
        </div>
      </Overlay>
    );
  }

  if (!evaluacion.permitido) return null; // ya cubierto arriba; guarda para el tipado
  const { grupo, requiereSucesion, candidatosLider, alertaBinomio, miembrosRestantes } = evaluacion;

  // El botón sólo se habilita cuando TODAS las reglas del CU están satisfechas
  const puedeConfirmar =
    !!motivoFinal &&
    (!requiereSucesion || !!nuevoLider) &&
    (!alertaBinomio || riesgoAceptado);

  const handleConfirmar = () => {
    if (!puedeConfirmar) return;
    extraerAgenteDeGrupo(agenteOp.id, {
      motivo: motivoFinal,
      nuevoEstado,
      nuevoLiderUsuarioId: requiereSucesion ? nuevoLider : undefined,
    });
    setHecho(true);
    setTimeout(onClose, 1100);
  };

  if (hecho) {
    return (
      <Overlay onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Check size={28} color="#16a34a" />
          </div>
          <Titulo>Agente extraído del grupo</Titulo>
          <Texto>
            {alertaBinomio
              ? `${grupo.nombre} quedó en pausa por quedar con 1 integrante.`
              : `${grupo.nombre} continúa operando con ${miembrosRestantes} integrantes.`}
          </Texto>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <IconBox bg="rgba(229,75,75,0.1)"><UserMinus size={17} style={{ color: 'var(--primary)' }} /></IconBox>
          <div>
            <Titulo>Retirar del Grupo</Titulo>
            <Texto>
              {usuario.nombre} {usuario.apellido} · {grupo.nombre}
            </Texto>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={17} />
        </button>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5" style={{ maxHeight: '60vh', overflowY: 'auto' }}>

        {/* ── Paso 4.1 · Sucesión de Mando ── */}
        {requiereSucesion && (
          <div className="p-3 rounded-[var(--radius-input)]" style={{ background: 'rgba(229,75,75,0.07)', border: '1px solid rgba(229,75,75,0.25)' }}>
            <div className="flex items-start gap-2 mb-2.5">
              <ShieldAlert size={15} style={{ color: 'var(--primary)', marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                El agente retirado es el <strong>Líder del grupo</strong>. Seleccioná al nuevo Líder para continuar.
              </p>
            </div>
            <select
              value={nuevoLider}
              onChange={e => setNuevoLider(e.target.value)}
              className="w-full px-3 py-2 outline-none"
              style={{
                background: 'var(--input-background)', border: '1px solid var(--border)',
                color: 'var(--foreground)', borderRadius: 'var(--radius-input)',
                fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)',
              }}
            >
              <option value="">— Seleccioná el nuevo Líder —</option>
              {candidatosLider.map(uid => (
                <option key={uid} value={uid}>{nombreDe(uid)}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Paso 3 · Motivo de la baja ── */}
        <div>
          <Etiqueta>Motivo de la baja</Etiqueta>
          <div className="grid grid-cols-2 gap-2">
            {[...MOTIVOS, 'Otro'].map(m => {
              const sel = motivo === m;
              return (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className="px-3 py-2.5 rounded-[var(--radius-input)] text-left"
                  style={{
                    border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    background: sel ? 'rgba(229,75,75,0.06)' : 'var(--card)',
                    color: sel ? 'var(--primary)' : 'var(--foreground)',
                    fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)',
                    fontWeight: sel ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                    cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {motivo === 'Otro' && (
            <input
              autoFocus
              value={motivoOtro}
              onChange={e => setMotivoOtro(e.target.value)}
              placeholder="Especificá el motivo"
              className="w-full mt-2 px-3 py-2 outline-none"
              style={{
                background: 'var(--input-background)', border: '1px solid var(--border)',
                color: 'var(--foreground)', borderRadius: 'var(--radius-input)',
                fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)',
              }}
            />
          )}
        </div>

        {/* ── Paso 3 · Nuevo estado individual ── */}
        <div>
          <Etiqueta>Nuevo estado del agente</Etiqueta>
          <div className="flex flex-col gap-2">
            {ESTADOS_SALIDA.map(op => {
              const sel = nuevoEstado === op.value;
              return (
                <button
                  key={op.value}
                  onClick={() => setNuevoEstado(op.value)}
                  className="px-3 py-2.5 rounded-[var(--radius-input)] text-left"
                  style={{
                    border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    background: sel ? 'rgba(229,75,75,0.06)' : 'var(--card)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'block', fontSize: 'var(--text-label)',
                    fontWeight: sel ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                    color: sel ? 'var(--primary)' : 'var(--foreground)',
                    fontFamily: 'var(--font-family-primary)',
                  }}>{op.label}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    {op.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Paso 5.1 · Alerta de Binomio Mínimo ── */}
        {alertaBinomio && (
          <label
            className="flex items-start gap-2.5 p-3 rounded-[var(--radius-input)] cursor-pointer"
            style={{ background: '#fef9c3', border: '1px solid #fde047' }}
          >
            <input
              type="checkbox"
              checked={riesgoAceptado}
              onChange={e => setRiesgoAceptado(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--text-label)', color: '#713f12', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
              <strong>Advertencia:</strong> el grupo quedará por debajo del mínimo operativo
              (1 integrante). El sistema pausará el grupo automáticamente. Confirmo ser
              consciente del riesgo.
            </span>
          </label>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
        <button
          onClick={handleConfirmar}
          disabled={!puedeConfirmar}
          className="flex-1 py-2.5 rounded-[var(--radius-button)]"
          style={{
            background: puedeConfirmar ? 'var(--primary)' : 'var(--muted)',
            color: puedeConfirmar ? '#fff' : 'var(--muted-foreground)',
            fontSize: 'var(--text-base)', border: 'none',
            fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
            opacity: puedeConfirmar ? 1 : 0.55,
            cursor: puedeConfirmar ? 'pointer' : 'default',
          }}
        >
          Confirmar Extracción
        </button>
      </div>
    </Overlay>
  );
}

/* ── Piezas de presentación reutilizadas dentro del modal ── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-[var(--radius-card)] overflow-hidden flex flex-col"
        style={{ maxWidth: 480, background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function IconBox({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      {children}
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'var(--foreground)', fontSize: 'var(--text-base)',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
    }}>{children}</p>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5" style={{
      color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
      fontFamily: 'var(--font-family-primary)', lineHeight: 1.5,
    }}>{children}</p>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'var(--foreground)', fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
      marginBottom: 10,
    }}>{children}</p>
  );
}

function BotonSecundario({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-[var(--radius-button)]"
      style={{
        background: 'var(--muted)', border: '1px solid var(--border)',
        color: 'var(--foreground)', fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
