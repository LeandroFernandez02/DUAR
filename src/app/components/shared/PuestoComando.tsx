/**
 * Puesto de comando: presencia de mando (01/10, migración 016).
 *
 * Un indicador en el encabezado del operativo ("Puesto de comando: Fierro +2",
 * o "Sin coordinador a cargo" en ámbar) y, al tocarlo, el detalle: quién está
 * a cargo, quiénes están presentes, los movimientos y el historial.
 *
 * Los coordinadores NO son agentes: no aparecen en la pestaña Agentes ni en el
 * tablero. Reglas (mando.model.js): el primero que llega queda a cargo; el
 * mando lo pasa quien está a cargo (o un administrador); cualquier gestor
 * registra el ingreso o el retiro de otro (con motivo); si se retira el que
 * está a cargo y quedan otros, elige sucesor. Un administrador puede hacer
 * todo, pero no figura él mismo como presente.
 */
import { useCallback, useEffect, useState } from 'react';
import { RadioTower, X, Crown, LogIn, LogOut, UserPlus, History, AlertTriangle, ArrowRightLeft, Loader2, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  mandoApi, usuariosApi, ApiError,
  type MandoOperativoApi, type PresenciaMandoApi, type UsuarioApi,
} from '../../services/api';
import { Overlay, IconBox, Titulo, Texto, Etiqueta, ErrorCaja, estiloCampo, BotonPrimario, BotonSecundario } from './grupos/piezas';
import { haceCuanto, horaCorta } from '../../utils/tiempo';

/** El puesto de comando cambia poco: alcanza con mirar cada 30 s (y al volver a la pestaña). */
const INTERVALO_MS = 30_000;

const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

/** Motivos del retiro del puesto de comando. "Otros" pide el detalle. Lo que se guarda es el texto. */
const MOTIVOS_RETIRO = [
  'Finalización de turno', 'Decisión administrativa', 'Lesión o problema de salud',
  'Emergencia personal', 'No registró su retiro', 'Otros',
] as const;

interface Props {
  operativoId: string;
  /** Operativo finalizado o eliminado: sólo se mira el historial. */
  soloLectura: boolean;
}

export default function PuestoComando({ operativoId, soloLectura }: Props) {
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
  const sinMando = !mando.aCargo && !soloLectura;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Puesto de comando: quién está presente y quién está a cargo"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-all"
        style={{
          background: sinMando ? '#fef3c7' : 'var(--muted)',
          border: `1.5px solid ${sinMando ? '#fcd34d' : 'var(--border)'}`,
          color: sinMando ? '#92400e' : 'var(--foreground)',
          fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
          cursor: 'pointer', maxWidth: '100%',
        }}
      >
        <RadioTower size={13} style={{ flexShrink: 0 }} />
        {/* Sólo el nombre de quien está a cargo; el resto de los presentes, al abrirlo. */}
        <span className="truncate">{mando.aCargo ? nombreDe(mando.aCargo) : 'Sin coordinador a cargo'}</span>
      </button>

      {abierto && (
        <PuestoComandoModal operativoId={operativoId} mando={mando} soloLectura={soloLectura}
          onCambio={setMando} onClose={() => setAbierto(false)} />
      )}
    </>
  );
}

/* ── Detalle del puesto de comando ─────────────────────────────────────── */

function PuestoComandoModal({ operativoId, mando, soloLectura, onCambio, onClose }: {
  operativoId: string;
  mando: MandoOperativoApi;
  soloLectura: boolean;
  onCambio: (m: MandoOperativoApi) => void;
  onClose: () => void;
}) {
  const { usuario } = useApp();
  const yoId = usuario?.id ?? '';
  const soyAdmin = usuario?.rol === 'administrador';
  const yoPresente = mando.presentes.find(p => p.usuarioId === yoId);
  const yoACargo = mando.aCargo?.usuarioId === yoId;

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ubicuidad: el coordinador está en otro operativo; se pide confirmar el traslado. */
  const [traslado, setTraslado] = useState<{ usuarioId?: string; mensaje: string } | null>(null);
  /** Retiro desplegado justo debajo de la fila de ese coordinador. */
  const [retirando, setRetirando] = useState<PresenciaMandoApi | null>(null);
  const [motivoOpcion, setMotivoOpcion] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [sucesorId, setSucesorId] = useState('');
  /** Selector "Registrar ingreso de un coordinador" desplegado. */
  const [ingresando, setIngresando] = useState(false);
  const [coordinadores, setCoordinadores] = useState<UsuarioApi[] | null>(null);
  const [elegido, setElegido] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);

  // Los coordinadores que se pueden registrar: activos, que no estén ya presentes acá.
  useEffect(() => {
    if (soloLectura) return;
    usuariosApi.listar()
      .then(({ usuarios }) => setCoordinadores(usuarios.filter(u =>
        u.rol.toLowerCase() === 'coordinador' && u.estado.toUpperCase() === 'ACTIVO')))
      .catch(() => setCoordinadores([]));
  }, [soloLectura]);
  const registrables = (coordinadores ?? []).filter(u =>
    u.id !== yoId && !mando.presentes.some(p => p.usuarioId === u.id));

  const ejecutar = async (fn: () => Promise<{ mando: MandoOperativoApi }>, usuarioIdIngreso?: string) => {
    setOcupado(true);
    setError(null);
    try {
      const r = await fn();
      onCambio(r.mando);
      setRetirando(null);
      setIngresando(false);
      setTraslado(null);
      setMotivoOpcion('');
      setMotivoOtro('');
      setSucesorId('');
      setElegido('');
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'presente_en_otro_operativo') {
        setTraslado({ usuarioId: usuarioIdIngreso, mensaje: err.message });
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo registrar. Intentá de nuevo.');
      }
    } finally {
      setOcupado(false);
    }
  };

  const ingresar = (usuarioId?: string, trasladar = false) =>
    ejecutar(() => mandoApi.ingresar(operativoId, { usuarioId, trasladar }), usuarioId);
  const pasarMando = (usuarioId: string) => ejecutar(() => mandoApi.asignar(operativoId, usuarioId));

  // Formulario de retiro
  const propio = retirando?.usuarioId === yoId;
  const otrosPresentes = retirando ? mando.presentes.filter(p => p.usuarioId !== retirando.usuarioId) : [];
  const pideSucesor = !!retirando?.aCargo && otrosPresentes.length > 0;
  const motivoOk = !!motivoOpcion && (motivoOpcion !== 'Otros' || motivoOtro.trim().length >= 3);
  const retiroOk = !!retirando && motivoOk && (!pideSucesor || !!sucesorId);
  const confirmarRetiro = () => {
    if (!retirando || !retiroOk) return;
    ejecutar(() => mandoApi.retirar(operativoId, {
      usuarioId: propio ? undefined : retirando.usuarioId,
      motivo: motivoOpcion === 'Otros' ? `Otros: ${motivoOtro.trim()}` : motivoOpcion,
      sucesorId: pideSucesor ? sucesorId : undefined,
    }));
  };
  const abrirRetiro = (p: PresenciaMandoApi) => {
    // Un solo desplegable a la vez; tocar de nuevo el mismo Retiro lo cierra.
    if (retirando?.id === p.id) { setRetirando(null); return; }
    setRetirando(p); setIngresando(false); setMotivoOpcion(''); setMotivoOtro(''); setSucesorId(''); setError(null);
  };
  const abrirIngreso = () => {
    if (ingresando) { setIngresando(false); return; }
    setIngresando(true); setRetirando(null); setElegido(''); setTraslado(null); setError(null);
  };

  /** El retiro, justo debajo de la fila del coordinador que se retira. */
  const formularioRetiro = (p: PresenciaMandoApi) => (
    <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)] mt-1" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      <div>
        <Etiqueta htmlFor="retiro-motivo">Motivo del retiro</Etiqueta>
        <select id="retiro-motivo" value={motivoOpcion} onChange={e => setMotivoOpcion(e.target.value)}
          className="w-full px-3 py-2 outline-none" style={estiloCampo}>
          <option value="">Elegí un motivo</option>
          {MOTIVOS_RETIRO.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {motivoOpcion === 'Otros' && (
        <div>
          <Etiqueta htmlFor="retiro-otro">Contá el motivo</Etiqueta>
          <input id="retiro-otro" value={motivoOtro} maxLength={150} onChange={e => setMotivoOtro(e.target.value)}
            className="w-full px-3 py-2 outline-none" style={estiloCampo} autoFocus />
        </div>
      )}
      {pideSucesor && (
        <div>
          <Etiqueta htmlFor="retiro-sucesor">{propio ? 'Estás a cargo' : 'Está a cargo'}: ¿a quién le deja el mando?</Etiqueta>
          <select id="retiro-sucesor" value={sucesorId} onChange={e => setSucesorId(e.target.value)}
            className="w-full px-3 py-2 outline-none" style={estiloCampo}>
            <option value="">Elegí un coordinador presente</option>
            {otrosPresentes.map(o => <option key={o.usuarioId} value={o.usuarioId}>{nombreDe(o)}</option>)}
          </select>
        </div>
      )}
      {p.aCargo && !pideSucesor && (
        <p style={{ fontSize: 11, color: '#92400e' }}>No queda otro coordinador presente: el operativo va a quedar sin coordinador a cargo.</p>
      )}
      {error && <ErrorCaja>{error}</ErrorCaja>}
      <div className="flex justify-end gap-2">
        <BotonSecundario onClick={() => setRetirando(null)}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={confirmarRetiro} habilitado={retiroOk && !ocupado}>
          {ocupado ? 'Registrando…' : 'Registrar retiro'}
        </BotonPrimario>
      </div>
    </div>
  );

  const avisoTraslado = (
    traslado && (
      <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
        <p style={{ fontSize: 'var(--text-label)', color: '#92400e', lineHeight: 1.5 }}>{traslado.mensaje}</p>
        <div className="flex justify-end gap-2">
          <BotonSecundario onClick={() => setTraslado(null)}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={() => ingresar(traslado.usuarioId, true)} habilitado={!ocupado}>Sí, trasladar</BotonPrimario>
        </div>
      </div>
    )
  );

  // Quién puede dejar a cargo a quién (el backend lo vuelve a validar).
  const puedeDesignar = (p: PresenciaMandoApi) =>
    !soloLectura && !p.aCargo && (!mando.aCargo || yoACargo || soyAdmin);

  return (
    <Overlay onClose={onClose} ancho={520}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <IconBox bg="rgba(229,75,75,0.1)"><RadioTower size={16} style={{ color: 'var(--primary)' }} /></IconBox>
          <div className="min-w-0">
            <Titulo>Puesto de comando</Titulo>
            <Texto>Coordinadores presentes en el operativo y quién está a cargo.</Texto>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto" style={{ fontFamily: 'var(--font-family-primary)' }}>
        {/* ── A cargo ── */}
        {mando.aCargo ? (
          <div className="flex items-start gap-3 p-3 rounded-[var(--radius-input)]" style={{ background: 'rgba(229,75,75,0.06)', border: '1px solid rgba(229,75,75,0.25)' }}>
            <Crown size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <div className="min-w-0">
              <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>A cargo del operativo</p>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                {nombreDe(mando.aCargo)}{mando.aCargo.usuarioId === yoId ? ' (vos)' : ''}
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                Desde las {horaCorta(mando.aCargo.desde)} ({haceCuanto(mando.aCargo.desde)}) · lo designó {mando.aCargo.asignadoPorNombre}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {soloLectura ? 'El operativo está cerrado: el puesto de comando ya no tiene a nadie.'
                : mando.presentes.length ? 'Sin coordinador a cargo. Designá a uno de los presentes.'
                : 'Sin coordinador a cargo: no hay nadie registrado en el puesto de comando.'}
            </span>
          </div>
        )}

        {/* ── Presentes ── */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
              Presentes · {mando.presentes.length}
            </p>
            {!soloLectura && (
              <button type="button" onClick={abrirIngreso} disabled={ocupado}
                className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                style={{ fontSize: 11, border: '1px solid var(--border)', background: ingresando ? 'var(--muted)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 'var(--font-weight-semibold)' }}>
                <UserPlus size={11} /> Registrar ingreso
              </button>
            )}
          </div>

          {/* Selector del coordinador: se despliega al tocar el botón y se va al registrar. */}
          {ingresando && (
            <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)] mb-1.5" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
              <Etiqueta htmlFor="ingreso-otro">¿Qué coordinador ingresa al puesto de comando?</Etiqueta>
              <div className="flex gap-2">
                <select id="ingreso-otro" value={elegido} onChange={e => setElegido(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 outline-none" style={estiloCampo} disabled={coordinadores === null}>
                  <option value="">{coordinadores === null ? 'Cargando…' : registrables.length ? 'Elegí un coordinador' : 'No hay otros coordinadores para registrar'}</option>
                  {registrables.map(u => <option key={u.id} value={u.id}>{nombreDe(u)}</option>)}
                </select>
                <button type="button" disabled={!elegido || ocupado} onClick={() => ingresar(elegido)}
                  className="flex items-center gap-1 px-3 rounded-[var(--radius-button)] shrink-0"
                  style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', border: '1.5px solid var(--border)',
                    background: 'var(--card)', color: elegido ? 'var(--foreground)' : 'var(--muted-foreground)', cursor: elegido ? 'pointer' : 'default' }}>
                  {ocupado ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Registrar
                </button>
              </div>
              {traslado?.usuarioId && avisoTraslado}
              {error && <ErrorCaja>{error}</ErrorCaja>}
            </div>
          )}

          {mando.presentes.length === 0 ? (
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Nadie registrado ahora.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {mando.presentes.map(p => (
                <div key={p.id}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                        <span className="truncate">{nombreDe(p)}{p.usuarioId === yoId ? ' (vos)' : ''}</span>
                        {p.aCargo && (
                          <span className="px-1.5 rounded-full shrink-0" style={{ fontSize: 9.5, background: 'rgba(229,75,75,0.12)', color: 'var(--primary)' }}>A cargo</span>
                        )}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                        Desde las {horaCorta(p.desde)}{p.ingresoPor !== p.usuarioId ? ` · registró el ingreso ${p.ingresoPorNombre}` : ''}
                      </p>
                    </div>
                    {puedeDesignar(p) && (
                      <button type="button" disabled={ocupado} onClick={() => pasarMando(p.usuarioId)}
                        title={mando.aCargo ? 'Pasarle el mando' : 'Dejarlo a cargo'}
                        className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                        style={{ fontSize: 11, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}>
                        <ArrowRightLeft size={11} />
                        {p.usuarioId === yoId ? 'Tomar el mando' : mando.aCargo ? 'Pasarle el mando' : 'Dejar a cargo'}
                      </button>
                    )}
                    {!soloLectura && (
                      <button type="button" disabled={ocupado} onClick={() => abrirRetiro(p)}
                        title={p.usuarioId === yoId ? 'Me retiro del puesto de comando' : 'Registrar el retiro de este coordinador'}
                        className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                        style={{ fontSize: 11, border: '1px solid var(--border)', background: retirando?.id === p.id ? 'var(--muted)' : 'var(--card)', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <LogOut size={11} /> Retiro
                      </button>
                    )}
                  </div>
                  {retirando?.id === p.id && formularioRetiro(p)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sin ningún desplegable abierto, el traslado o el error se muestran acá. */}
        {!retirando && !ingresando && avisoTraslado}
        {!retirando && !ingresando && error && <ErrorCaja>{error}</ErrorCaja>}

        {/* Un coordinador que todavía no está presente puede registrarse él mismo (el administrador no figura como presente). */}
        {!soloLectura && !soyAdmin && !yoPresente && (
          <BotonPrimario onClick={() => ingresar()} habilitado={!ocupado}>
            <span className="inline-flex items-center gap-1.5">
              {ocupado ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />} Estoy en el puesto de comando
            </span>
          </BotonPrimario>
        )}

        {/* ── Historial ── */}
        <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={() => setVerHistorial(true)} className="flex items-center gap-1.5"
            style={{ fontSize: 'var(--text-label)', color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <History size={13} /> Ver historial
          </button>
        </div>
      </div>

      {verHistorial && <HistorialPuestoComando mando={mando} onClose={() => setVerHistorial(false)} />}
    </Overlay>
  );
}

/* ── Historial del puesto de comando ───────────────────────────────────── */

interface EventoPuesto {
  clave: string;
  t: string;
  /** Desempate entre hechos del mismo instante: primero el retiro, al final quién queda a cargo. */
  orden: number;
  tipo: 'ingreso' | 'retiro' | 'a_cargo' | 'sin_mando';
  titulo: string;
  detalle?: string;
  registro?: string;
}

const MISMO_INSTANTE_MS = 1000;
const mismoInstante = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) < MISMO_INSTANTE_MS;

/** Presencias y períodos de mando → una sola línea de tiempo, como la de los grupos. */
function armarEventos(mando: MandoOperativoApi): EventoPuesto[] {
  const eventos: EventoPuesto[] = [];
  for (const p of mando.historialPresencias) {
    eventos.push({
      clave: `i-${p.id}`, t: p.desde, orden: 2, tipo: 'ingreso',
      titulo: `${nombreDe(p)} ingresó al puesto de comando`, registro: p.ingresoPorNombre,
    });
    if (p.hasta) {
      eventos.push({
        clave: `r-${p.id}`, t: p.hasta, orden: 0, tipo: 'retiro',
        titulo: `${nombreDe(p)} se retiró del puesto de comando`, detalle: p.motivo ?? undefined,
        registro: p.egresoPorNombre ?? undefined,
      });
    }
  }
  for (const m of mando.historialMando) {
    const anterior = mando.historialMando.find(x => x.hasta && x.usuarioId !== m.usuarioId && mismoInstante(x.hasta, m.desde));
    const alLlegar = mando.historialPresencias.some(p => p.usuarioId === m.usuarioId && mismoInstante(p.desde, m.desde));
    eventos.push({
      clave: `a-${m.id}`, t: m.desde, orden: 3, tipo: 'a_cargo',
      titulo: `${nombreDe(m)} quedó a cargo del operativo`,
      detalle: anterior ? `Relevó a ${nombreDe(anterior)}` : alLlegar ? 'Quedó a cargo al llegar' : undefined,
      registro: m.asignadoPorNombre,
    });
    if (m.hasta && !mando.historialMando.some(x => x.id !== m.id && mismoInstante(x.desde, m.hasta!))) {
      eventos.push({
        clave: `s-${m.id}`, t: m.hasta, orden: 1, tipo: 'sin_mando',
        titulo: 'El operativo quedó sin coordinador a cargo', detalle: m.motivo ?? undefined,
      });
    }
  }
  return eventos.sort((a, b) => +new Date(a.t) - +new Date(b.t) || a.orden - b.orden);
}

const PUNTO: Record<EventoPuesto['tipo'], string> = {
  ingreso: '#15803d', retiro: '#6b7280', a_cargo: 'var(--primary)', sin_mando: '#d97706',
};
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

function HistorialPuestoComando({ mando, onClose }: { mando: MandoOperativoApi; onClose: () => void }) {
  const eventos = armarEventos(mando);
  let diaAnterior = '';

  return (
    <Overlay onClose={onClose} ancho={560}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <IconBox bg="rgba(229,75,75,0.1)"><History size={17} style={{ color: 'var(--primary)' }} /></IconBox>
          <div className="min-w-0">
            <Titulo>Historial del puesto de comando</Titulo>
            <Texto>Quién ingresó, quién se retiró y quién estuvo a cargo, con la hora en que pasó.</Texto>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={17} />
        </button>
      </div>

      {/* Altura máxima propia: con muchos movimientos el cuerpo se desplaza, el modal no crece. */}
      <div className="px-5 py-4" style={{ overflowY: 'auto', maxHeight: 'min(62vh, 520px)', fontFamily: 'var(--font-family-primary)' }}>
        {eventos.length === 0 && <Texto>Todavía no hay movimientos en el puesto de comando.</Texto>}
        <ol className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {eventos.map(e => {
            const d = dia(e.t);
            const mostrarDia = d !== diaAnterior;
            diaAnterior = d;
            return (
              <li key={e.clave}>
                {mostrarDia && (
                  <p className="uppercase tracking-wider mt-2 mb-1" style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{d}</p>
                )}
                <div className="grid gap-x-3 py-2" style={{ gridTemplateColumns: '48px 1fr', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>
                    {horaCorta(e.t)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.35 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PUNTO[e.tipo], display: 'inline-block', flexShrink: 0 }} />
                      {e.titulo}
                    </p>
                    {e.detalle && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{e.detalle}</p>}
                    {e.registro && (
                      <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
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
    </Overlay>
  );
}
