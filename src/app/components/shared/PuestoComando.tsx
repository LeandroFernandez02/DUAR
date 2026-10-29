/**
 * Puesto de comando (CU-15; 01/10, migración 016; puestos desde el 29/10, migración 029).
 *
 * Un indicador en el encabezado del operativo (el Coordinador de turno, o "Sin
 * coordinador en el puesto" en ámbar) y, al tocarlo, el detalle: quién está de
 * turno en cada puesto, el registro de ingresos y egresos y el historial.
 *
 * Puestos (relevamiento del 29/10):
 *   · Jefe de operativo → usuarios con rol Jefe de operativo.
 *   · Coordinador       → usuarios con rol Coordinador.
 *   · Encargado         → usuarios con rol Coordinador (es el que está en el campo).
 * Ya no hay un «coordinador a cargo». Ingresos y egresos los registran
 * coordinadores y administradores; el Jefe de operativo sólo mira. Una persona
 * está en un solo puesto a la vez: «Cambiar puesto» la pasa de Coordinador a
 * Encargado (o al revés) con la misma hora. Los de este puesto NO son agentes:
 * no aparecen en Agentes ni en el tablero.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RadioTower, X, LogIn, LogOut, UserPlus, History, AlertTriangle, ArrowRightLeft, Loader2, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  mandoApi, usuariosApi, ApiError,
  type MandoOperativoApi, type PresenciaMandoApi, type UsuarioApi,
} from '../../services/api';
import { Overlay, IconBox, Titulo, Texto, Etiqueta, ErrorCaja, estiloCampo, BotonPrimario, BotonSecundario } from './grupos/piezas';
import { haceCuanto, horaCorta } from '../../utils/tiempo';
import { PUESTOS, ETIQUETA_PUESTO, type PuestoMando } from '../../utils/permisos';

/** El puesto de comando cambia poco: alcanza con mirar cada 30 s (y al volver a la pestaña). */
const INTERVALO_MS = 30_000;

const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

/** Motivos del egreso del turno. "Otros" pide el detalle. Lo que se guarda es el texto. */
const MOTIVOS_EGRESO = [
  'Finalización de turno', 'Decisión administrativa', 'Lesión o problema de salud',
  'Emergencia personal', 'No registró su egreso', 'Otros',
] as const;

/** Coordinador ↔ Encargado: el otro puesto al que se puede pasar (el Jefe de operativo tiene uno solo). */
const OTRO_PUESTO: Partial<Record<PuestoMando, PuestoMando>> = { COORDINADOR: 'ENCARGADO', ENCARGADO: 'COORDINADOR' };

interface Props {
  operativoId: string;
  /** No se registra nada: operativo cerrado, o quien mira es el Jefe de operativo. */
  soloLectura: boolean;
  /** Operativo finalizado o eliminado: el aviso ámbar no corresponde. */
  cerrado?: boolean;
  /** Encabezado achicado: sólo el ícono (el detalle queda en el título al pasar el mouse). */
  compacto?: boolean;
}

export default function PuestoComando({ operativoId, soloLectura, cerrado = soloLectura, compacto = false }: Props) {
  const [mando, setMando] = useState<MandoOperativoApi | null>(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try { setMando(await mandoApi.estado(operativoId)); } catch { /* el indicador queda como estaba */ }
  }, [operativoId]);

  useEffect(() => {
    cargar();
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  if (!mando) return null;
  const coordinadores = mando.presentes.filter(p => p.puesto === 'COORDINADOR');
  const sinCoordinador = !coordinadores.length && !cerrado;
  const texto = coordinadores.length
    ? `${nombreDe(coordinadores[0])}${mando.presentes.length > 1 ? ` +${mando.presentes.length - 1}` : ''}`
    : 'Sin coordinador en el puesto';
  const detalle = mando.presentes.length
    ? mando.presentes.map(p => `${ETIQUETA_PUESTO[p.puesto]}: ${nombreDe(p)}`).join(' · ')
    : 'nadie de turno';

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={`Puesto de comando · ${detalle}`}
        aria-label={`Puesto de comando: ${detalle}`}
        className={`flex items-center gap-1.5 ${compacto ? 'px-2.5' : 'px-3'} py-1.5 rounded-[var(--radius-button)] transition-all`}
        style={{
          background: sinCoordinador ? 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)' : 'var(--muted)',
          border: `1.5px solid ${sinCoordinador ? '#fcd34d' : 'var(--border)'}`,
          color: sinCoordinador ? '#92400e' : 'var(--foreground)',
          fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
          cursor: 'pointer', maxWidth: '100%',
        }}
      >
        <RadioTower size={compacto ? 15 : 13} style={{ flexShrink: 0 }} />
        {/* El Coordinador de turno; el resto, al abrirlo. */}
        {!compacto && <span className="truncate">{texto}</span>}
      </button>

      {abierto && (
        <PuestoComandoModal operativoId={operativoId} mando={mando} soloLectura={soloLectura} cerrado={cerrado}
          onCambio={setMando} onClose={() => setAbierto(false)} />
      )}
    </>
  );
}

/* ── Detalle del puesto de comando ─────────────────────────────────────── */

function PuestoComandoModal({ operativoId, mando, soloLectura, cerrado, onCambio, onClose }: {
  operativoId: string;
  mando: MandoOperativoApi;
  soloLectura: boolean;
  cerrado: boolean;
  onCambio: (m: MandoOperativoApi) => void;
  onClose: () => void;
}) {
  const { usuario } = useApp();
  const yoId = usuario?.id ?? '';

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ubicuidad: la persona está de turno en otro operativo; se pide confirmar el traslado. */
  const [traslado, setTraslado] = useState<{ usuarioId: string; puesto: PuestoMando; mensaje: string } | null>(null);
  /** Egreso desplegado justo debajo de la fila de esa persona. */
  const [egresando, setEgresando] = useState<PresenciaMandoApi | null>(null);
  const [motivoOpcion, setMotivoOpcion] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  /** Formulario "Registrar ingreso" desplegado: primero el puesto, después la persona. */
  const [ingresando, setIngresando] = useState(false);
  const [puestoElegido, setPuestoElegido] = useState<PuestoMando | ''>('');
  const [elegido, setElegido] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioApi[] | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  // Los usuarios activos que pueden ocupar algún puesto (rol Jefe de operativo o Coordinador).
  useEffect(() => {
    if (soloLectura) return;
    usuariosApi.listar()
      .then(({ usuarios: lista }) => setUsuarios(lista.filter(u =>
        ['jefe_operativo', 'coordinador'].includes(u.rol.toLowerCase()) && u.estado.toUpperCase() === 'ACTIVO')))
      .catch(() => setUsuarios([]));
  }, [soloLectura]);

  // Para el puesto elegido: los usuarios con el rol que exige y que no estén ya de turno acá.
  const rolDelPuesto = PUESTOS.find(p => p.value === puestoElegido)?.rol;
  const registrables = (usuarios ?? []).filter(u =>
    u.rol.toLowerCase() === rolDelPuesto && !mando.presentes.some(p => p.usuarioId === u.id));

  const limpiar = () => {
    setEgresando(null); setIngresando(false); setTraslado(null);
    setMotivoOpcion(''); setMotivoOtro(''); setPuestoElegido(''); setElegido('');
  };

  const ejecutar = async (fn: () => Promise<{ mando: MandoOperativoApi }>, ingreso?: { usuarioId: string; puesto: PuestoMando }) => {
    setOcupado(true);
    setError(null);
    try {
      const r = await fn();
      onCambio(r.mando);
      limpiar();
    } catch (err) {
      if (ingreso && err instanceof ApiError && err.motivo === 'presente_en_otro_operativo') {
        setTraslado({ ...ingreso, mensaje: err.message });
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo registrar. Intentá de nuevo.');
      }
    } finally {
      setOcupado(false);
    }
  };

  const ingresar = (usuarioId: string, puesto: PuestoMando, trasladar = false) =>
    ejecutar(() => mandoApi.ingresar(operativoId, {
      usuarioId: usuarioId === yoId ? undefined : usuarioId, puesto, trasladar,
    }), { usuarioId, puesto });
  const cambiarPuesto = (p: PresenciaMandoApi, puesto: PuestoMando) =>
    ejecutar(() => mandoApi.cambiarPuesto(operativoId, { usuarioId: p.usuarioId === yoId ? undefined : p.usuarioId, puesto }));

  // Formulario de egreso
  const motivoOk = !!motivoOpcion && (motivoOpcion !== 'Otros' || motivoOtro.trim().length >= 3);
  const confirmarEgreso = () => {
    if (!egresando || !motivoOk) return;
    ejecutar(() => mandoApi.retirar(operativoId, {
      usuarioId: egresando.usuarioId === yoId ? undefined : egresando.usuarioId,
      motivo: motivoOpcion === 'Otros' ? `Otros: ${motivoOtro.trim()}` : motivoOpcion,
    }));
  };
  const abrirEgreso = (p: PresenciaMandoApi) => {
    // Un solo desplegable a la vez; tocar de nuevo el mismo Egreso lo cierra.
    if (egresando?.id === p.id) { setEgresando(null); return; }
    limpiar(); setEgresando(p); setError(null);
  };
  const abrirIngreso = () => {
    if (ingresando) { setIngresando(false); return; }
    limpiar(); setIngresando(true); setError(null);
  };

  /** El egreso, justo debajo de la fila de quien egresa. */
  const formularioEgreso = (
    <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)] mt-1" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      <div>
        <Etiqueta htmlFor="egreso-motivo">Motivo del egreso</Etiqueta>
        <select id="egreso-motivo" value={motivoOpcion} onChange={e => setMotivoOpcion(e.target.value)}
          className="w-full px-3 py-2 outline-none" style={estiloCampo}>
          <option value="">Elegí un motivo</option>
          {MOTIVOS_EGRESO.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {motivoOpcion === 'Otros' && (
        <div>
          <Etiqueta htmlFor="egreso-otro">Contá el motivo</Etiqueta>
          <input id="egreso-otro" value={motivoOtro} maxLength={150} onChange={e => setMotivoOtro(e.target.value)}
            className="w-full px-3 py-2 outline-none" style={estiloCampo} autoFocus />
        </div>
      )}
      {error && <ErrorCaja>{error}</ErrorCaja>}
      <div className="flex justify-end gap-2">
        <BotonSecundario onClick={() => setEgresando(null)}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={confirmarEgreso} habilitado={motivoOk && !ocupado}>
          {ocupado ? 'Registrando…' : 'Registrar egreso'}
        </BotonPrimario>
      </div>
    </div>
  );

  const avisoTraslado = traslado && (
    <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)' }}>
      <p style={{ fontSize: 'var(--text-label)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', lineHeight: 1.5 }}>{traslado.mensaje}</p>
      <div className="flex justify-end gap-2">
        <BotonSecundario onClick={() => setTraslado(null)}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={() => ingresar(traslado.usuarioId, traslado.puesto, true)} habilitado={!ocupado}>Sí, trasladar</BotonPrimario>
      </div>
    </div>
  );

  const botonChico = (activo = false) => ({
    fontSize: 'calc(11px * var(--escala-texto))', border: '1px solid var(--border)',
    background: activo ? 'var(--muted)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer',
  });

  const sinCoordinador = !cerrado && !mando.presentes.some(p => p.puesto === 'COORDINADOR');

  return (
    <Overlay onClose={onClose} ancho={540}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <IconBox bg="color-mix(in srgb, var(--primary) 10%, transparent)"><RadioTower size={16} style={{ color: 'var(--primary)' }} /></IconBox>
          <div className="min-w-0">
            <Titulo>Puesto de comando</Titulo>
            <Texto>Quién está de turno y en qué puesto.</Texto>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto" style={{ fontFamily: 'var(--font-family-primary)' }}>
        {(cerrado || sinCoordinador) && (
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{cerrado ? 'El operativo está cerrado: el puesto de comando ya no tiene a nadie de turno.' : 'No hay ningún Coordinador de turno en el puesto de comando.'}</span>
          </div>
        )}

        {/* ── Registrar ingreso: puesto y persona ── */}
        {!soloLectura && (
          <div>
            <button type="button" onClick={abrirIngreso} disabled={ocupado}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)]"
              style={{ ...botonChico(ingresando), fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
              <LogIn size={13} /> Registrar ingreso al turno
            </button>
            {ingresando && (
              <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)] mt-1.5" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                <div>
                  <Etiqueta htmlFor="ingreso-puesto">Puesto</Etiqueta>
                  <select id="ingreso-puesto" value={puestoElegido}
                    onChange={e => { setPuestoElegido(e.target.value as PuestoMando | ''); setElegido(''); setTraslado(null); setError(null); }}
                    className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                    <option value="">Elegí el puesto</option>
                    {PUESTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {puestoElegido && (
                    <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                      {PUESTOS.find(p => p.value === puestoElegido)?.ayuda}
                    </p>
                  )}
                </div>
                {puestoElegido && (
                  <div>
                    <Etiqueta htmlFor="ingreso-persona">¿Quién ingresa?</Etiqueta>
                    <div className="flex gap-2">
                      <select id="ingreso-persona" value={elegido} onChange={e => setElegido(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 outline-none" style={estiloCampo} disabled={usuarios === null}>
                        <option value="">{usuarios === null ? 'Cargando…' : registrables.length ? 'Elegí a la persona' : 'No hay nadie más para registrar en este puesto'}</option>
                        {registrables.map(u => <option key={u.id} value={u.id}>{nombreDe(u)}{u.id === yoId ? ' (vos)' : ''}</option>)}
                      </select>
                      <button type="button" disabled={!elegido || ocupado} onClick={() => puestoElegido && ingresar(elegido, puestoElegido)}
                        className="flex items-center gap-1 px-3 rounded-[var(--radius-button)] shrink-0"
                        style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', border: '1.5px solid var(--border)',
                          background: 'var(--card)', color: elegido ? 'var(--foreground)' : 'var(--muted-foreground)', cursor: elegido ? 'pointer' : 'default' }}>
                        {ocupado ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Registrar
                      </button>
                    </div>
                  </div>
                )}
                {avisoTraslado}
                {error && <ErrorCaja>{error}</ErrorCaja>}
              </div>
            )}
          </div>
        )}

        {/* ── De turno, por puesto ── */}
        {PUESTOS.map(puesto => {
          const deTurno = mando.presentes.filter(p => p.puesto === puesto.value);
          return (
            <div key={puesto.value}>
              <p className="uppercase tracking-wider mb-1.5" style={{ fontSize: 'calc(10px * var(--escala-texto))', color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                {puesto.label} · {deTurno.length}
              </p>
              {deTurno.length === 0 ? (
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Nadie de turno.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {deTurno.map(p => {
                    const otro = OTRO_PUESTO[p.puesto];
                    return (
                      <div key={p.id}>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                              {nombreDe(p)}{p.usuarioId === yoId ? ' (vos)' : ''}
                            </p>
                            <p style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                              Desde las {horaCorta(p.desde)} ({haceCuanto(p.desde)}){p.ingresoPor !== p.usuarioId ? ` · registró ${p.ingresoPorNombre}` : ''}
                            </p>
                          </div>
                          {!soloLectura && otro && (
                            <button type="button" disabled={ocupado} onClick={() => cambiarPuesto(p, otro)}
                              title={`Pasarlo al puesto ${ETIQUETA_PUESTO[otro]}`}
                              className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0" style={botonChico()}>
                              <ArrowRightLeft size={11} /> {ETIQUETA_PUESTO[otro]}
                            </button>
                          )}
                          {!soloLectura && (
                            <button type="button" disabled={ocupado} onClick={() => abrirEgreso(p)}
                              title="Registrar el egreso del turno"
                              className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                              style={{ ...botonChico(egresando?.id === p.id), color: 'var(--muted-foreground)' }}>
                              <LogOut size={11} /> Egreso
                            </button>
                          )}
                        </div>
                        {egresando?.id === p.id && formularioEgreso}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Sin ningún desplegable abierto, el error se muestra acá (p. ej. al cambiar de puesto). */}
        {!egresando && !ingresando && error && <ErrorCaja>{error}</ErrorCaja>}

        {/* ── Historial ── */}
        <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={() => setVerHistorial(v => !v)} className="flex items-center gap-1.5"
            style={{ fontSize: 'var(--text-label)', color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <History size={13} /> {verHistorial ? 'Ocultar historial' : 'Ver historial'}
          </button>
          {/* En el mismo modal, pero corto: la lista tiene su propio alto máximo y se desplaza. */}
          {verHistorial && <HistorialPuestoComando mando={mando} />}
        </div>
      </div>
    </Overlay>
  );
}

/* ── Historial del puesto de comando ───────────────────────────────────── */

interface EventoPuesto {
  clave: string;
  t: string;
  /** Desempate entre hechos del mismo instante: primero el egreso, después el ingreso. */
  orden: number;
  tipo: 'ingreso' | 'egreso' | 'cambio';
  titulo: string;
  detalle?: string;
  registro?: string;
}

const MISMO_INSTANTE_MS = 1000;
const mismoInstante = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) < MISMO_INSTANTE_MS;

/** Turnos → una sola línea de tiempo, como la de los grupos. Un cambio de puesto (egreso + ingreso a la misma hora) va como un solo hecho. */
function armarEventos(mando: MandoOperativoApi): EventoPuesto[] {
  const eventos: EventoPuesto[] = [];
  const turnos = mando.historialPresencias;
  for (const p of turnos) {
    const anterior = turnos.find(x => x.id !== p.id && x.usuarioId === p.usuarioId && x.hasta && mismoInstante(x.hasta, p.desde));
    if (anterior) {
      eventos.push({
        clave: `c-${p.id}`, t: p.desde, orden: 1, tipo: 'cambio',
        titulo: `${nombreDe(p)} pasó de ${ETIQUETA_PUESTO[anterior.puesto]} a ${ETIQUETA_PUESTO[p.puesto]}`,
        registro: p.ingresoPorNombre,
      });
    } else {
      eventos.push({
        clave: `i-${p.id}`, t: p.desde, orden: 1, tipo: 'ingreso',
        titulo: `${nombreDe(p)} ingresó como ${ETIQUETA_PUESTO[p.puesto]}`, registro: p.ingresoPorNombre,
      });
    }
    const siguiente = p.hasta && turnos.some(x => x.id !== p.id && x.usuarioId === p.usuarioId && mismoInstante(p.hasta!, x.desde));
    if (p.hasta && !siguiente) {
      eventos.push({
        clave: `e-${p.id}`, t: p.hasta, orden: 0, tipo: 'egreso',
        titulo: `${nombreDe(p)} egresó del puesto ${ETIQUETA_PUESTO[p.puesto]}`, detalle: p.motivo ?? undefined,
        registro: p.egresoPorNombre ?? undefined,
      });
    }
  }
  return eventos.sort((a, b) => +new Date(a.t) - +new Date(b.t) || a.orden - b.orden);
}

const PUNTO: Record<EventoPuesto['tipo'], string> = { ingreso: '#15803d', egreso: '#6b7280', cambio: 'var(--primary)' };
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

function HistorialPuestoComando({ mando }: { mando: MandoOperativoApi }) {
  const eventos = armarEventos(mando);
  const caja = useRef<HTMLDivElement>(null);
  let diaAnterior = '';

  // Al abrirlo queda a la vista, aunque el modal haya estado desplazado hacia arriba.
  useEffect(() => { caja.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, []);

  return (
    <div ref={caja} className="mt-2 rounded-[var(--radius-input)] px-3 py-1" style={{ border: '1px solid var(--border)', overflowY: 'auto', maxHeight: 230 }}>
      {eventos.length === 0 && (
        <p className="py-2" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Todavía no hay movimientos en el puesto de comando.</p>
      )}
      <ol className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {eventos.map(e => {
          const d = dia(e.t);
          const mostrarDia = d !== diaAnterior;
          diaAnterior = d;
          return (
            <li key={e.clave}>
              {mostrarDia && (
                <p className="uppercase tracking-wider mt-2 mb-1" style={{ fontSize: 'calc(10px * var(--escala-texto))', color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{d}</p>
              )}
              <div className="grid gap-x-3 py-2" style={{ gridTemplateColumns: '44px 1fr', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>
                  {horaCorta(e.t)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-start gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.35 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: PUNTO[e.tipo], display: 'inline-block', flexShrink: 0, marginTop: 5 }} />
                    {e.titulo}
                  </p>
                  {e.detalle && <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{e.detalle}</p>}
                  {e.registro && (
                    <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                      <User size={11} /> Registró: {e.registro}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
