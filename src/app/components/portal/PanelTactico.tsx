/**
 * Portal del Agente — lo táctico (modelo de estados del 24/09):
 *
 *  · "Mi estado": SIN grupo, el agente se marca Disponible o No disponible
 *    (también al volver Replegado de un retiro, CU-27). CON grupo, su estado
 *    lo define el grupo y acá sólo se muestra.
 *  · "Mi grupo": con quién sale, en qué estado está, qué polígono tiene.
 *  · Si es el Líder: informa lo que pasa en el terreno ("Salimos hacia el
 *    polígono", "Llegamos, empezamos a rastrillar", "Volvemos", "Llegamos a la
 *    base"). No elige estados ni disuelve: eso es del coordinador.
 *
 * Sin señal (decisión del 28/09): el aviso no se guarda en el celular. El
 * Líder llama por radio al coordinador, que lo registra en el sistema.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Users, ShieldCheck, AlertCircle, AlertTriangle, Loader2, MapPin, CloudOff, Radio, Check, X, Footprints, Truck,
} from 'lucide-react';
import {
  portalApi, ApiError, type AccionTerreno, type GrupoApi, type MiEstadoApi,
} from '../../services/api';
import StatusBadge, { colorDeEstado } from '../shared/StatusBadge';
import { ESTADO_OP_CONFIG } from '../shared/EditarAgenteModal';
import EstadoAgenteBadge from '../shared/EstadoAgenteBadge';
import AvatarAgente from '../shared/AvatarAgente';
import { tarjetaBase } from '../shared/Listados';
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

const tarjeta = tarjetaBase;
export const rotuloPortal = {
  margin: 0, color: 'var(--muted-foreground)', fontSize: 'calc(10.5px * var(--escala-texto))',
  fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
};
const rotulo = rotuloPortal;

/** Sección de integrantes («LÍDER · 1», «AGENTES · 3», «CONDUCTOR · 1») con su ícono. */
function SeccionIntegrantes({ icono: I, texto, n }: { icono: typeof Users; texto: string; n: number }) {
  return (
    <p className="flex items-center" style={{ ...rotulo, gap: 6, margin: '6px 2px 0' }}>
      <I size={12} />{texto}<span style={{ fontWeight: 700, opacity: 0.8 }}>· {n}</span>
    </p>
  );
}

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

/** Avisos que siguen el tema (en oscuro se aclaran texto y tinte). */
const tono = (c: string, claro: string, oscuro: string) => ({
  bg: `color-mix(in srgb, ${c} calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)`,
  borde: `color-mix(in srgb, ${c} 30%, transparent)`,
  color: `color-mix(in srgb, ${oscuro} var(--tinte-oscuro, 0%), ${claro})`,
});
const TONO = {
  ok: tono('#16a34a', '#15803d', '#86efac'),
  info: tono('#0891b2', '#0e7490', '#67e8f9'),
  error: tono('#dc2626', '#b91c1c', '#fca5a5'),
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
      if (!(err instanceof ApiError) || err.status >= 500 || err.status === 0) setSinConexion(true);
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
      <div className="p-6 flex justify-center" style={tarjeta}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
      </div>
    );
  }
  if (!agente) return null;

  const enGrupo = !!agente.grupoId;
  const lider = grupo ? grupo.integrantes.filter(i => i.id === grupo.liderId) : [];
  const resto = grupo ? grupo.integrantes.filter(i => i.id !== grupo.liderId) : [];
  const agentesG = resto.filter(i => !i.esConductor);
  const conductores = resto.filter(i => i.esConductor);
  /** Fila de un integrante: la propia, resaltada con «(vos)». */
  const fila = (i: (typeof resto)[number]) => {
    const yo = i.id === agente.id;
    const esLider = i.id === grupo?.liderId;
    return (
      <li key={i.id} className="flex items-center gap-2.5" style={{
        padding: '8px 10px', borderRadius: 'var(--radius-md)', minHeight: 48, boxSizing: 'border-box',
        background: yo ? 'color-mix(in srgb, var(--primary) 16%, var(--card))' : 'var(--muted)',
        border: yo ? '1px solid color-mix(in srgb, var(--primary) 45%, transparent)' : '1px solid transparent',
      }}>
        <AvatarAgente esDuar={i.esDuar} esConductor={i.esConductor} esRecursoCritico={i.esRecursoCritico} tamano={30} />
        {esLider && <ShieldCheck size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-label="Líder" />}
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 600 }}>
          {i.nombre} {i.apellido}{yo && ' (vos)'}
        </span>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorCaja>{error}</ErrorCaja>}

      {/* ── Conexión ── */}
      {sinConexion && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]"
          style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', fontSize: 'var(--text-label)', lineHeight: 1.45 }}>
          <CloudOff size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Sin conexión con el servidor. Lo que ves es de {ultimoDato ? haceCuanto(ultimoDato) : 'antes'}.
            {grupo?.soyLider && ' Lo que pase en el terreno, avisalo al coordinador por radio.'}
          </span>
        </div>
      )}

      {/* ── Mi estado ── */}
      <section className="p-4" style={tarjeta} aria-labelledby="mi-estado-titulo">
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 10 }}>
          <p id="mi-estado-titulo" style={rotulo}>Mi estado</p>
          <span className="flex items-center gap-2" title={`Desde ${horaExacta(agente.estadoActualizadoEn)}`}>
            <span style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{haceCuanto(agente.estadoActualizadoEn)}</span>
            <EstadoAgenteBadge estado={agente.estado.toLowerCase() as EstadoOperativoAgente} size="sm" />
          </span>
        </div>
        {enGrupo ? (
          <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
            Estás en un grupo: tu estado lo maneja el grupo{grupo ? ` (${grupo.nombre})` : ''}.
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
                  <button key={op.valor} type="button" disabled={actual} aria-pressed={actual}
                    onClick={() => setConfirmar({ tipo: 'autoestado', valor: op.valor })}
                    className="text-left px-3 py-3"
                    style={{
                      borderRadius: 'var(--radius-md)', minHeight: 56, fontFamily: 'var(--font-family-primary)',
                      border: actual ? `2px solid ${cfg.color}` : '1.5px solid var(--border)',
                      background: actual ? `color-mix(in srgb, ${cfg.color} calc(10% + var(--tinte-oscuro, 0%) * 0.1), var(--card))` : 'var(--card)',
                      cursor: actual ? 'default' : 'pointer',
                    }}>
                    <span style={{ display: 'block', color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
                      {op.etiqueta}
                    </span>
                    <span style={{ display: 'block', color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', lineHeight: 1.35 }}>
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
      <section className="overflow-hidden" style={tarjeta} aria-labelledby="mi-grupo-titulo">
        {grupo ? (
          <>
            <div style={{ height: 4, background: colorDeEstado(grupo.estado.toLowerCase()) }} />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p id="mi-grupo-titulo" style={rotulo}>Mi grupo{grupo.soyLider ? ' · sos el Líder' : ''}</p>
                  <p className="flex items-center gap-2" style={{ margin: '4px 0 0', color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 700 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: grupo.color || colorDeEstado(grupo.estado.toLowerCase()) }} />
                    <span className="truncate">{grupo.nombre}</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                    {grupo.clase === 'ESPECIAL' ? 'Grupo especial' : 'Grupo de rastrillaje'} · {grupo.integrantes.length} integrante{grupo.integrantes.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge estado={grupo.estado.toLowerCase()} size="sm" />
                  <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}
                    title={`Desde ${horaExacta(grupo.estadoActualizadoEn)}`}>
                    {haceCuanto(grupo.estadoActualizadoEn)}
                  </p>
                </div>
              </div>

              {grupo.zonaAsignada && (
                <p className="flex items-start gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', lineHeight: 1.4 }}>
                  <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                  <span><span style={{ color: 'var(--muted-foreground)' }}>Polígono: </span>{grupo.zonaAsignada}</span>
                </p>
              )}

              {grupo.alertaBinomio && (
                <p className="flex items-start gap-1.5 px-2.5 py-2 rounded-[var(--radius-input)]"
                  style={{ background: TONO.error.bg, border: `1px solid ${TONO.error.borde}`, color: TONO.error.color, fontSize: 'var(--text-label)', lineHeight: 1.4, fontWeight: 'var(--font-weight-semibold)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  Queda una sola persona rastrillando: nadie debe rastrillar solo.
                </p>
              )}

              {/* Integrantes: líder → agentes → conductores; la fila propia resaltada */}
              <div className="flex flex-col gap-1.5">
                {lider.length > 0 && <><SeccionIntegrantes icono={ShieldCheck} texto="Líder" n={lider.length} /><ul className="flex flex-col gap-1.5">{lider.map(fila)}</ul></>}
                {agentesG.length > 0 && <><SeccionIntegrantes icono={Footprints} texto="Agentes" n={agentesG.length} /><ul className="flex flex-col gap-1.5">{agentesG.map(fila)}</ul></>}
                {conductores.length > 0 && <><SeccionIntegrantes icono={Truck} texto={conductores.length === 1 ? 'Conductor' : 'Conductores'} n={conductores.length} /><ul className="flex flex-col gap-1.5">{conductores.map(fila)}</ul></>}
              </div>

              {/* ── Avisos del Líder ── */}
              {grupo.soyLider && (
                <div className="flex flex-col gap-2 pt-1">
                  <p style={rotulo}>Informar al coordinador</p>
                  {accionesLider.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {accionesLider.map((a, idx) => (
                        <button key={a} type="button" onClick={() => setConfirmar({ tipo: 'terreno', accion: a })}
                          className="px-4 py-3.5"
                          style={{
                            border: idx === 0 ? 'none' : '1.5px solid var(--border)',
                            background: idx === 0 ? 'var(--primary)' : 'var(--card)',
                            color: idx === 0 ? 'var(--primary-foreground)' : 'var(--foreground)',
                            fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer',
                            borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-primary)',
                          }}>
                          {BOTON_LIDER[a]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                      {grupo.estado === 'EN_ESPERA'
                        ? 'Están en el puesto de comando. El coordinador decide si salen de nuevo o si disuelve el grupo.'
                        : 'Cuando el coordinador confirme el grupo y les asigne un polígono, vas a poder informar la salida desde acá.'}
                    </p>
                  )}
                  <p className="flex items-start gap-1.5" style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', lineHeight: 1.45 }}>
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
          style={{ background: TONO[resultado.tono].bg, border: `1px solid ${TONO[resultado.tono].borde}`, color: TONO[resultado.tono].color, fontSize: 'calc(11.5px * var(--escala-texto))', lineHeight: 1.45 }}>
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
                <IconBox bg={confirmar.valor === 'NO_DISPONIBLE' ? TONO.error.bg : 'color-mix(in srgb, var(--primary) 10%, transparent)'}>
                  <AlertCircle size={17} style={{ color: confirmar.valor === 'NO_DISPONIBLE' ? 'var(--destructive)' : 'var(--primary)' }} />
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
                <IconBox bg="color-mix(in srgb, var(--primary) 10%, transparent)"><Radio size={17} style={{ color: 'var(--primary)' }} /></IconBox>
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
