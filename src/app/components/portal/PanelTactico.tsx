/**
 * Portal del Agente — lo táctico (modelo de estados del 24/09):
 *
 *  · "Mi estado": SIN grupo, el agente se marca Disponible o No disponible
 *    (también al volver Replegado de un retiro, CU-26). CON grupo, su estado
 *    lo define el grupo y acá sólo se muestra.
 *  · "Mi grupo": con quién sale, en qué estado está, qué zona tiene.
 *  · Si es el Líder: informa lo que pasa en el terreno ("Salimos hacia el
 *    polígono", "Llegamos, empezamos a rastrillar", "Volvemos", "Llegamos a la
 *    base"). No elige estados ni disuelve: eso es del coordinador.
 *
 * Sin señal (decisión del 28/09): el aviso no se guarda en el celular. El
 * Líder llama por radio al coordinador, que lo registra en el sistema.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Users, ShieldCheck, AlertCircle, AlertTriangle, Loader2, MapPin, CloudOff, Radio, Check, X,
} from 'lucide-react';
import {
  portalApi, ApiError, type AccionTerreno, type GrupoApi, type MiEstadoApi,
} from '../../services/api';
import StatusBadge, { colorDeEstado } from '../shared/StatusBadge';
import { ESTADO_OP_CONFIG } from '../shared/EditarAgenteModal';
import {
  Overlay, IconBox, Titulo, Texto, BotonSecundario, BotonPrimario, ErrorCaja,
  ACCION_INFO, ACCIONES_TERRENO, BOTON_LIDER,
} from '../shared/grupos/piezas';
import type { EstadoOperativoAgente } from '../../data/mockData';
import { haceCuanto, horaExacta } from '../../utils/tiempo';

const INTERVALO_MS = 10_000;
const SIN_SENAL = 'No se pudo enviar: no hay señal. Avisale al coordinador por radio para que lo registre.';

type Autoestado = 'DISPONIBLE' | 'NO_DISPONIBLE';
const AUTOESTADOS: { valor: Autoestado; etiqueta: string; ayuda: string }[] = [
  { valor: 'DISPONIBLE',    etiqueta: 'Disponible',    ayuda: 'Estoy en la base, listo para salir' },
  { valor: 'NO_DISPONIBLE', etiqueta: 'No disponible', ayuda: 'Por cualquier razón no puedo rastrillar' },
];

const tarjeta = { background: 'var(--card)', boxShadow: 'var(--elevation-sm)' };
const rotulo = {
  color: 'var(--muted-foreground)', fontSize: '10px',
  fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
};

/** Lo que provoca cada aviso, dicho para el Líder. */
const EFECTO_LIDER: Record<AccionTerreno, string> = {
  salir: 'Todo el grupo pasa a Desplegado.',
  llegar_poligono: 'El grupo pasa a Rastrillando; el conductor queda Desplegado, con el vehículo.',
  volver: 'El grupo pasa a Replegado.',
  llegar_base: 'El grupo pasa a En espera, en el puesto de comando.',
};

type Confirmacion =
  | { tipo: 'autoestado'; valor: Autoestado }
  | { tipo: 'terreno'; accion: AccionTerreno };

/** Id del aviso: el backend lo usa para no registrar dos veces el mismo toque. */
function idAviso(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Contexto no seguro (http en la red local): v4 con getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type Resultado = { texto: string; tono: 'ok' | 'info' | 'error' };

const TONO = {
  ok:    { bg: '#dcfce7', borde: '#bbf7d0', color: '#15803d' },
  info:  { bg: 'rgba(8,145,178,0.1)', borde: 'rgba(8,145,178,0.3)', color: '#0e7490' },
  error: { bg: '#fee2e2', borde: '#fecaca', color: '#b91c1c' },
} as const;

export default function PanelTactico() {
  const [agente, setAgente] = useState<MiEstadoApi | null>(null);
  const [grupo, setGrupo] = useState<(GrupoApi & { soyLider: boolean }) | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacion | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [sinConexion, setSinConexion] = useState(false);
  const [ultimoDato, setUltimoDato] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await portalApi.miGrupo();
      setAgente(r.agente);
      setGrupo(r.grupo);
      setSinConexion(false);
      setUltimoDato(new Date().toISOString());
    } catch (err) {
      // Sin señal en el terreno: se conserva lo último que se vio, con su "hace X".
      if (!(err instanceof ApiError) || err.status >= 500) setSinConexion(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, INTERVALO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', cargar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', cargar);
    };
  }, [cargar]);

  const accionesLider = grupo ? ACCIONES_TERRENO.filter(a => ACCION_INFO[a].desde.includes(grupo.estado)) : [];

  /** El aviso del Líder: se envía en el momento; sin señal, se avisa por radio. */
  const informar = async (accion: AccionTerreno) => {
    if (!grupo) return;
    const r = await portalApi.enviarEventos([{ id: idAviso(), grupoId: grupo.id, accion, ocurridoEn: new Date().toISOString() }]);
    const res = r.resultados[0];
    if (r.grupo !== undefined) setGrupo(r.grupo);
    if (res?.resultado === 'APLICADO') setResultado({ texto: `"${BOTON_LIDER[accion]}": recibido.`, tono: 'ok' });
    else if (res?.resultado === 'CONFIRMACION') setResultado({ texto: `"${BOTON_LIDER[accion]}": el coordinador ya lo había registrado.`, tono: 'info' });
    else setResultado({ texto: `"${BOTON_LIDER[accion]}": no se registró. ${res?.mensaje ?? 'El grupo ya estaba en otro estado.'}`.trim(), tono: 'error' });
    await cargar();
  };

  const aplicar = async () => {
    if (!confirmar) return;
    setError(null);
    setResultado(null);
    setEnviando(true);
    try {
      if (confirmar.tipo === 'terreno') await informar(confirmar.accion);
      else {
        await portalApi.cambiarMiEstado(confirmar.valor);
        await cargar();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status < 500) setError(err.message);
      else {
        setSinConexion(true);
        setError(confirmar.tipo === 'terreno' ? SIN_SENAL : 'No se pudo guardar: no hay señal. Intentá de nuevo cuando tengas conexión.');
      }
    } finally {
      setConfirmar(null);
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="rounded-[var(--radius-card)] p-6 flex justify-center" style={tarjeta}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
      </div>
    );
  }
  if (!agente) return null;

  const cfgMio = ESTADO_OP_CONFIG[agente.estado.toLowerCase() as EstadoOperativoAgente];
  const enGrupo = !!agente.grupoId;

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorCaja>{error}</ErrorCaja>}

      {/* ── Conexión ── */}
      {sinConexion && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]"
          style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: 'var(--text-label)', lineHeight: 1.45 }}>
          <CloudOff size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Sin conexión con el servidor. Lo que ves es de {ultimoDato ? haceCuanto(ultimoDato) : 'antes'}.
            {grupo?.soyLider && ' Lo que pase en el terreno, avisalo al coordinador por radio.'}
          </span>
        </div>
      )}

      {/* ── Mi estado ── */}
      <section className="rounded-[var(--radius-card)] p-4" style={tarjeta} aria-labelledby="mi-estado-titulo">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p id="mi-estado-titulo" style={rotulo}>Mi estado</p>
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }} title={`Desde ${horaExacta(agente.estadoActualizadoEn)}`}>
            {haceCuanto(agente.estadoActualizadoEn)}
          </span>
        </div>
        {cfgMio && (
          <p className="mb-3" style={{ color: cfgMio.color, fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
            ● {cfgMio.label}
          </p>
        )}
        {enGrupo ? (
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
            Mientras integres un grupo, tu estado lo define el grupo{grupo ? ` (${grupo.nombre})` : ''}.
            Si no podés seguir, avisale {grupo?.soyLider ? 'al coordinador' : 'a tu Líder o al coordinador'} para que te retiren.
          </p>
        ) : (
          <>
            {agente.estado === 'REPLEGADO' && (
              <p className="mb-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                Te retiraron de tu grupo y estás volviendo. Cuando llegues a la base, marcá cómo estás.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUTOESTADOS.map(op => {
                const actual = agente.estado === op.valor;
                const cfg = ESTADO_OP_CONFIG[op.valor.toLowerCase() as EstadoOperativoAgente];
                return (
                  <button key={op.valor} type="button" disabled={actual}
                    onClick={() => setConfirmar({ tipo: 'autoestado', valor: op.valor })}
                    className="text-left px-3 py-3 rounded-[var(--radius-input)]"
                    style={{
                      border: actual ? `2px solid ${cfg.color}` : '1.5px solid var(--border)',
                      background: actual ? cfg.bg : 'var(--card)',
                      cursor: actual ? 'default' : 'pointer',
                    }}>
                    <span style={{ display: 'block', color: cfg.color, fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {op.etiqueta}
                    </span>
                    <span style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.35 }}>
                      {actual ? 'Tu estado actual' : op.ayuda}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Mi grupo ── */}
      <section className="rounded-[var(--radius-card)] overflow-hidden" style={tarjeta} aria-labelledby="mi-grupo-titulo">
        {grupo ? (
          <>
            <div style={{ height: 4, background: colorDeEstado(grupo.estado.toLowerCase()) }} />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p id="mi-grupo-titulo" style={rotulo}>Mi grupo{grupo.clase === 'ESPECIAL' ? ' especial' : ''}{grupo.soyLider ? ' · sos el Líder' : ''}</p>
                  <p className="mt-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                    {grupo.nombre}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge estado={grupo.estado.toLowerCase()} size="sm" />
                  <p className="mt-1" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}
                    title={`Desde ${horaExacta(grupo.estadoActualizadoEn)}`}>
                    {haceCuanto(grupo.estadoActualizadoEn)}
                  </p>
                </div>
              </div>

              {grupo.zonaAsignada && (
                <p className="flex items-start gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', lineHeight: 1.4 }}>
                  <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                  <span><span style={{ color: 'var(--muted-foreground)' }}>Zona: </span>{grupo.zonaAsignada}</span>
                </p>
              )}

              {grupo.alertaBinomio && (
                <p className="flex items-start gap-1.5 px-2.5 py-2 rounded-[var(--radius-input)]"
                  style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 'var(--text-label)', lineHeight: 1.4, fontWeight: 'var(--font-weight-semibold)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  Queda una sola persona rastrillando: nadie debe rastrillar solo.
                </p>
              )}

              <ul className="flex flex-col gap-1.5">
                {grupo.integrantes.map(i => {
                  const cfg = ESTADO_OP_CONFIG[i.estado.toLowerCase() as EstadoOperativoAgente];
                  return (
                    <li key={i.id} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
                      {i.id === grupo.liderId
                        ? <ShieldCheck size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-label="Líder" />
                        : <span style={{ width: 13, flexShrink: 0 }} />}
                      <span className="flex-1 min-w-0" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-medium)' }}>
                        {i.nombre} {i.apellido}
                        {i.esConductor && <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-normal)' }}> · Conductor</span>}
                      </span>
                      {cfg && <span style={{ fontSize: 11, color: cfg.color, fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{cfg.label}</span>}
                    </li>
                  );
                })}
              </ul>

              {/* ── Avisos del Líder ── */}
              {grupo.soyLider && (
                <div className="flex flex-col gap-2 pt-1">
                  <p style={rotulo}>Informar al coordinador</p>
                  {accionesLider.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {accionesLider.map((a, idx) => (
                        <button key={a} type="button" onClick={() => setConfirmar({ tipo: 'terreno', accion: a })}
                          className="px-4 py-3.5 rounded-[var(--radius-input)]"
                          style={{
                            border: idx === 0 ? 'none' : '1.5px solid var(--border)',
                            background: idx === 0 ? 'var(--primary)' : 'var(--card)',
                            color: idx === 0 ? '#fff' : 'var(--foreground)',
                            fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer',
                          }}>
                          {BOTON_LIDER[a]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                      {grupo.estado === 'EN_ESPERA'
                        ? 'Están en el puesto de comando. El coordinador decide si salen de nuevo o si disuelve el grupo.'
                        : 'Cuando el coordinador confirme el grupo y les asigne una zona, vas a poder informar la salida desde acá.'}
                    </p>
                  )}
                  <p className="flex items-start gap-1.5" style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.45 }}>
                    <Radio size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    Si no tenés señal, avisale al coordinador por radio: él lo registra en el sistema.
                  </p>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="p-4 flex items-center gap-3">
            <IconBox bg="var(--muted)"><Users size={16} style={{ color: 'var(--muted-foreground)' }} /></IconBox>
            <div>
              <p id="mi-grupo-titulo" style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Todavía no integrás ningún grupo
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                Cuando el coordinador te sume a uno, lo vas a ver acá.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Qué pasó con el último aviso ── */}
      {resultado && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-input)]" aria-live="polite"
          style={{ background: TONO[resultado.tono].bg, border: `1px solid ${TONO[resultado.tono].borde}`, color: TONO[resultado.tono].color, fontSize: 11.5, lineHeight: 1.45 }}>
          {resultado.tono === 'ok' ? <Check size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span className="flex-1">{resultado.texto}</span>
          <button type="button" aria-label="Cerrar" onClick={() => setResultado(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Confirmación ── */}
      {confirmar && (
        <Overlay onClose={() => !enviando && setConfirmar(null)}>
          <div className="px-5 py-5 flex items-start gap-3">
            {confirmar.tipo === 'autoestado' ? (
              <>
                <IconBox bg={confirmar.valor === 'NO_DISPONIBLE' ? '#fee2e2' : 'rgba(229,75,75,0.1)'}>
                  <AlertCircle size={17} style={{ color: confirmar.valor === 'NO_DISPONIBLE' ? '#dc2626' : 'var(--primary)' }} />
                </IconBox>
                <div>
                  <Titulo>¿Marcarte {AUTOESTADOS.find(a => a.valor === confirmar.valor)!.etiqueta}?</Titulo>
                  <Texto>
                    {confirmar.valor === 'NO_DISPONIBLE'
                      ? 'El coordinador va a ver que no podés rastrillar y no te va a sumar a un grupo. Para volver, marcate Disponible.'
                      : 'El coordinador te ve disponible para sumarte a un grupo.'}
                  </Texto>
                </div>
              </>
            ) : (
              <>
                <IconBox bg="rgba(229,75,75,0.1)"><Radio size={17} style={{ color: 'var(--primary)' }} /></IconBox>
                <div>
                  <Titulo>¿{BOTON_LIDER[confirmar.accion]}?</Titulo>
                  <Texto>
                    {EFECTO_LIDER[confirmar.accion]} El coordinador lo ve en su tablero en unos segundos.
                  </Texto>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 px-5 pb-5">
            <BotonSecundario onClick={() => setConfirmar(null)} disabled={enviando}>Cancelar</BotonSecundario>
            <BotonPrimario onClick={aplicar} habilitado={!enviando}
              peligro={confirmar.tipo === 'autoestado' && confirmar.valor === 'NO_DISPONIBLE'}>
              {enviando ? 'Enviando…' : 'Confirmar'}
            </BotonPrimario>
          </div>
        </Overlay>
      )}
    </div>
  );
}
