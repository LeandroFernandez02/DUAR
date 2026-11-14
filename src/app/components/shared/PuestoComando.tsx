/**
 * Puesto de comando (CU-16; 01/10, migración 016; rehecho el 02/11, migración 030).
 *
 * Un botón «Puesto de Comando» en el encabezado del operativo (en ámbar si no tiene Jefe de
 * Operativo) y, al tocarlo, el detalle:
 *   · Jefe de Operativo: uno por operativo, con rol «jefe de operativo». Es omnipresente: no
 *     marca ingreso ni egreso y puede serlo de varios operativos. Lo asignan, cambian o quitan
 *     los coordinadores, los administradores y los jefes de operativo (también él mismo).
 *   · Turno: quiénes están en el puesto de comando y en qué puesto —«Coordinador» u «Operador
 *     Mesa Coordinadora»—, los dos con rol coordinador. El ingreso y el egreso los registran
 *     los coordinadores y los administradores (el egreso de otro, con motivo).
 *   · Historial.
 * Los coordinadores NO son agentes: no aparecen en la pestaña Agentes ni en el tablero.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RadioTower, X, ShieldCheck, LogOut, UserPlus, History, AlertTriangle, Loader2, User, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  mandoApi, usuariosApi, ApiError, PUESTOS_TURNO, ROL_JEFE,
  type MandoOperativoApi, type PresenciaMandoApi, type PuestoTurnoApi, type UsuarioApi,
} from '../../services/api';
import { Overlay, IconBox, Titulo, Texto, Etiqueta, ErrorCaja, estiloCampo, BotonPrimario, BotonSecundario } from './grupos/piezas';
import { haceCuanto, horaCorta } from '../../utils/tiempo';

/** El puesto de comando cambia poco: alcanza con mirar cada 30 s (y al volver a la pestaña). */
const INTERVALO_MS = 30_000;

const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

/** Motivos del egreso del turno. "Otros" pide el detalle. Lo que se guarda es el texto. */
const MOTIVOS_EGRESO = [
  'Finalización de turno', 'Decisión administrativa', 'Lesión o problema de salud',
  'Emergencia personal', 'No registró su egreso', 'Otros',
] as const;

interface Props {
  operativoId: string;
  /** Operativo finalizado o eliminado: sólo se mira el historial. */
  soloLectura: boolean;
  /** Encabezado achicado: sólo el ícono (el nombre queda en el título al pasar el mouse). */
  compacto?: boolean;
}

export default function PuestoComando({ operativoId, soloLectura, compacto = false }: Props) {
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
  const sinJefe = !mando.jefe && !soloLectura;
  // El botón dice «Puesto de Comando» (pedido del 02/11); quién es el Jefe, al pasar el mouse y al abrirlo.
  const jefeTexto = mando.jefe ? `Jefe de Operativo: ${nombreDe(mando.jefe)}` : 'Sin Jefe de Operativo';

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={`Puesto de Comando · ${jefeTexto}`}
        aria-label={`Puesto de Comando: ${jefeTexto}`}
        className={`flex items-center gap-1.5 ${compacto ? 'px-2.5' : 'px-3'} py-1.5 rounded-[var(--radius-button)] transition-all`}
        style={{
          background: sinJefe ? 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)' : 'var(--muted)',
          border: `1.5px solid ${sinJefe ? '#fcd34d' : 'var(--border)'}`,
          color: sinJefe ? '#92400e' : 'var(--foreground)',
          fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
          cursor: 'pointer', maxWidth: '100%',
        }}
      >
        <RadioTower size={compacto ? 15 : 13} style={{ flexShrink: 0 }} />
        {!compacto && <span className="truncate">Puesto de Comando</span>}
      </button>

      {abierto && (
        <PuestoComandoModal operativoId={operativoId} mando={mando} soloLectura={soloLectura}
          onCambio={setMando} onClose={() => setAbierto(false)} />
      )}
    </>
  );
}

/* ── Detalle del puesto de comando ─────────────────────────────────────── */

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <p className="uppercase tracking-wider" style={{ fontSize: 'calc(10px * var(--escala-texto))', color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{children}</p>
);
const Pildora = ({ children }: { children: React.ReactNode }) => (
  <span className="px-1.5 rounded-full shrink-0" style={{ fontSize: 'calc(9.5px * var(--escala-texto))', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>{children}</span>
);
const estiloBotonChico = { fontSize: 'calc(11px * var(--escala-texto))', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' } as const;

function PuestoComandoModal({ operativoId, mando, soloLectura, onCambio, onClose }: {
  operativoId: string;
  mando: MandoOperativoApi;
  soloLectura: boolean;
  onCambio: (m: MandoOperativoApi) => void;
  onClose: () => void;
}) {
  const { usuario } = useApp();
  const yoId = usuario?.id ?? '';
  const rol = usuario?.rol ?? '';
  /** El turno lo registran coordinadores y administradores. */
  const puedeTurno = !soloLectura && (rol === 'administrador' || rol === 'coordinador');
  /** Al Jefe lo asignan, cambian o quitan además los jefes de operativo. */
  const puedeJefe = !soloLectura && (rol === 'administrador' || rol === 'coordinador' || rol === ROL_JEFE);

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ubicuidad: el coordinador está en el turno de otro operativo; se pide confirmar el traslado. */
  const [traslado, setTraslado] = useState<{ usuarioId?: string; puesto: PuestoTurnoApi; mensaje: string } | null>(null);
  /** Egreso desplegado justo debajo de la fila de ese coordinador. */
  const [egresando, setEgresando] = useState<PresenciaMandoApi | null>(null);
  const [motivoOpcion, setMotivoOpcion] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  /** Formulario de ingreso al turno desplegado. */
  const [ingresando, setIngresando] = useState(false);
  const [elegido, setElegido] = useState('');
  const [puesto, setPuesto] = useState<PuestoTurnoApi | ''>('');
  /** Cambio del Jefe desplegado. */
  const [cambiandoJefe, setCambiandoJefe] = useState(false);
  const [jefeElegido, setJefeElegido] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioApi[] | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  useEffect(() => {
    if (!puedeJefe) return;
    usuariosApi.listar()
      .then(({ usuarios: u }) => setUsuarios(u.filter(x => x.estado.toUpperCase() === 'ACTIVO')))
      .catch(() => setUsuarios([]));
  }, [puedeJefe]);

  // Para el turno: usuarios con rol coordinador que no estén ya en el turno. Quien figura hoy como
  // agente en un operativo no es opción (Testeo, punto 46): la API lo rechazaría igual.
  const noPresentes = (usuarios ?? []).filter(u => u.rol.toLowerCase() === 'coordinador' && !mando.presentes.some(p => p.usuarioId === u.id));
  const registrables = noPresentes.filter(u => !u.agenteEnOperativo);
  const deAgente = noPresentes.length - registrables.length;
  // Para el Jefe: sólo usuarios con rol «jefe de operativo» (02/11).
  const jefes = (usuarios ?? []).filter(u => u.rol.toLowerCase() === ROL_JEFE);

  const ejecutar = async (fn: () => Promise<{ mando: MandoOperativoApi }>, reintento?: { usuarioId?: string; puesto: PuestoTurnoApi }) => {
    setOcupado(true);
    setError(null);
    try {
      const r = await fn();
      onCambio(r.mando);
      setEgresando(null); setIngresando(false); setCambiandoJefe(false); setTraslado(null);
      setMotivoOpcion(''); setMotivoOtro(''); setElegido(''); setPuesto(''); setJefeElegido('');
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'presente_en_otro_operativo' && reintento) {
        setTraslado({ ...reintento, mensaje: err.message });
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo registrar. Intentá de nuevo.');
      }
    } finally {
      setOcupado(false);
    }
  };

  const ingresar = (usuarioId: string, p: PuestoTurnoApi, trasladar = false) => {
    const propio = usuarioId === yoId;
    ejecutar(() => mandoApi.ingresar(operativoId, { usuarioId: propio ? undefined : usuarioId, puesto: p, trasladar }), { usuarioId, puesto: p });
  };
  const asignarJefe = (usuarioId: string | null) => ejecutar(() => mandoApi.asignarJefe(operativoId, usuarioId));

  // Egreso
  const propio = egresando?.usuarioId === yoId;
  const motivoOk = !!motivoOpcion && (motivoOpcion !== 'Otros' || motivoOtro.trim().length >= 3);
  const confirmarEgreso = () => {
    if (!egresando || !motivoOk) return;
    ejecutar(() => mandoApi.retirar(operativoId, {
      usuarioId: propio ? undefined : egresando.usuarioId,
      motivo: motivoOpcion === 'Otros' ? `Otros: ${motivoOtro.trim()}` : motivoOpcion,
    }));
  };
  const cerrarDesplegables = () => { setEgresando(null); setIngresando(false); setCambiandoJefe(false); setTraslado(null); setError(null); };
  const abrirEgreso = (p: PresenciaMandoApi) => {
    if (egresando?.id === p.id) { setEgresando(null); return; }
    cerrarDesplegables(); setEgresando(p); setMotivoOpcion(''); setMotivoOtro('');
  };
  const abrirIngreso = () => {
    if (ingresando) { setIngresando(false); return; }
    cerrarDesplegables(); setIngresando(true);
    // Un coordinador que no está en el turno arranca elegido él mismo.
    setElegido(rol === 'coordinador' && !mando.presentes.some(p => p.usuarioId === yoId) ? yoId : ''); setPuesto('');
  };
  const abrirCambioJefe = () => {
    if (cambiandoJefe) { setCambiandoJefe(false); return; }
    cerrarDesplegables(); setCambiandoJefe(true); setJefeElegido(mando.jefe?.usuarioId ?? '');
  };

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
        <BotonPrimario onClick={confirmarEgreso} habilitado={motivoOk && !ocupado}>{ocupado ? 'Registrando…' : 'Registrar egreso'}</BotonPrimario>
      </div>
    </div>
  );

  const avisoTraslado = traslado && (
    <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)' }}>
      <p style={{ fontSize: 'var(--text-label)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', lineHeight: 1.5 }}>{traslado.mensaje}</p>
      <div className="flex justify-end gap-2">
        <BotonSecundario onClick={() => setTraslado(null)}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={() => ingresar(traslado.usuarioId ?? yoId, traslado.puesto, true)} habilitado={!ocupado}>Sí, trasladar</BotonPrimario>
      </div>
    </div>
  );

  const soyJefeDeOtro = rol === ROL_JEFE && mando.jefe?.usuarioId !== yoId;

  return (
    <Overlay onClose={onClose} ancho={520}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <IconBox bg="color-mix(in srgb, var(--primary) 10%, transparent)"><RadioTower size={16} style={{ color: 'var(--primary)' }} /></IconBox>
          <div className="min-w-0">
            <Titulo>Puesto de comando</Titulo>
            <Texto>Jefe de Operativo y turno del puesto de comando.</Texto>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto" style={{ fontFamily: 'var(--font-family-primary)' }}>
        {/* ── Jefe de Operativo ── */}
        <div className="flex flex-col gap-1.5">
          <Rotulo>Jefe de Operativo</Rotulo>
          {mando.jefe ? (
            <div className="flex items-start gap-3 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {nombreDe(mando.jefe)}{mando.jefe.usuarioId === yoId ? ' (vos)' : ''}
                </p>
                <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                  Desde las {horaCorta(mando.jefe.desde)} ({haceCuanto(mando.jefe.desde)}) · lo asignó {mando.jefe.asignadoPorNombre}
                </p>
              </div>
              {puedeJefe && (
                <button type="button" disabled={ocupado} onClick={abrirCambioJefe} className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0" style={{ ...estiloBotonChico, background: cambiandoJefe ? 'var(--muted)' : 'var(--card)' }}>
                  <Pencil size={11} /> Cambiar
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="flex-1">{soloLectura ? 'El operativo está cerrado.' : 'El operativo no tiene Jefe de Operativo asignado.'}</span>
              {puedeJefe && (
                <button type="button" disabled={ocupado} onClick={abrirCambioJefe} className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0" style={estiloBotonChico}>
                  <UserPlus size={11} /> Asignar
                </button>
              )}
            </div>
          )}
          {/* Un jefe de operativo se puede asignar a sí mismo con un toque. */}
          {puedeJefe && soyJefeDeOtro && !cambiandoJefe && (
            <div className="flex" style={{ maxWidth: 260 }}><BotonSecundario onClick={() => asignarJefe(yoId)}>{mando.jefe ? 'Quedar yo como Jefe' : 'Asignarme como Jefe'}</BotonSecundario></div>
          )}
          {cambiandoJefe && (
            <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)]" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
              <Etiqueta htmlFor="jefe-elegido">Jefe de Operativo</Etiqueta>
              <select id="jefe-elegido" value={jefeElegido} onChange={e => setJefeElegido(e.target.value)} disabled={usuarios === null}
                className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                <option value="">{usuarios === null ? 'Cargando…' : 'No asignado'}</option>
                {jefes.map(u => <option key={u.id} value={u.id}>{nombreDe(u)}{u.id === yoId ? ' (vos)' : ''}</option>)}
              </select>
              {usuarios !== null && jefes.length === 0 && (
                <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Todavía no hay usuarios con el rol «Jefe de Operativo».</p>
              )}
              {error && <ErrorCaja>{error}</ErrorCaja>}
              <div className="flex justify-end gap-2">
                <BotonSecundario onClick={() => setCambiandoJefe(false)}>Cancelar</BotonSecundario>
                <BotonPrimario onClick={() => asignarJefe(jefeElegido || null)}
                  habilitado={!ocupado && jefeElegido !== (mando.jefe?.usuarioId ?? '')}>
                  {ocupado ? 'Guardando…' : 'Guardar'}
                </BotonPrimario>
              </div>
            </div>
          )}
        </div>

        {/* ── Turno ── */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Rotulo>En el turno · {mando.presentes.length}</Rotulo>
            {puedeTurno && (
              <button type="button" onClick={abrirIngreso} disabled={ocupado} className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                style={{ ...estiloBotonChico, background: ingresando ? 'var(--muted)' : 'var(--card)', fontWeight: 'var(--font-weight-semibold)' }}>
                <UserPlus size={11} /> Registrar ingreso
              </button>
            )}
          </div>

          {ingresando && (
            <div className="flex flex-col gap-2 px-3 py-3 rounded-[var(--radius-input)] mb-1.5" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div>
                <Etiqueta htmlFor="ingreso-puesto">Puesto</Etiqueta>
                <select id="ingreso-puesto" value={puesto} onChange={e => setPuesto(e.target.value as PuestoTurnoApi)} className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                  <option value="">Elegí el puesto</option>
                  {(Object.keys(PUESTOS_TURNO) as PuestoTurnoApi[]).map(p => <option key={p} value={p}>{PUESTOS_TURNO[p]}</option>)}
                </select>
              </div>
              <div>
                <Etiqueta htmlFor="ingreso-coordinador">¿Quién ingresa? (usuarios con rol Coordinador)</Etiqueta>
                <select id="ingreso-coordinador" value={elegido} onChange={e => setElegido(e.target.value)} disabled={usuarios === null}
                  className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                  <option value="">{usuarios === null ? 'Cargando…' : registrables.length ? 'Elegí un coordinador' : 'No hay coordinadores para registrar'}</option>
                  {registrables.map(u => <option key={u.id} value={u.id}>{nombreDe(u)}{u.id === yoId ? ' (vos)' : ''}</option>)}
                </select>
              </div>
              {deAgente > 0 && (
                <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                  {deAgente === 1 ? 'Un coordinador no aparece porque figura' : `${deAgente} coordinadores no aparecen porque figuran`} como agente en un operativo.
                </p>
              )}
              {avisoTraslado}
              {error && <ErrorCaja>{error}</ErrorCaja>}
              {!traslado && (
                <div className="flex justify-end gap-2">
                  <BotonSecundario onClick={() => setIngresando(false)}>Cancelar</BotonSecundario>
                  <BotonPrimario onClick={() => puesto && elegido && ingresar(elegido, puesto)} habilitado={!!puesto && !!elegido && !ocupado}>
                    <span className="inline-flex items-center gap-1.5">{ocupado && <Loader2 size={13} className="animate-spin" />}Registrar ingreso</span>
                  </BotonPrimario>
                </div>
              )}
            </div>
          )}

          {mando.presentes.length === 0 ? (
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Nadie en el turno ahora.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {mando.presentes.map(p => (
                <div key={p.id}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)' }}>
                        <span className="truncate">{nombreDe(p)}{p.usuarioId === yoId ? ' (vos)' : ''}</span>
                        <Pildora>{PUESTOS_TURNO[p.puesto] ?? 'Coordinador'}</Pildora>
                      </p>
                      <p style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                        Desde las {horaCorta(p.desde)}{p.ingresoPor !== p.usuarioId ? ` · registró el ingreso ${p.ingresoPorNombre}` : ''}
                      </p>
                    </div>
                    {puedeTurno && (
                      <button type="button" disabled={ocupado} onClick={() => abrirEgreso(p)}
                        title={p.usuarioId === yoId ? 'Terminé mi turno' : 'Registrar el egreso de este coordinador'}
                        className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0"
                        style={{ ...estiloBotonChico, background: egresando?.id === p.id ? 'var(--muted)' : 'var(--card)', color: 'var(--muted-foreground)' }}>
                        <LogOut size={11} /> Egreso
                      </button>
                    )}
                  </div>
                  {egresando?.id === p.id && formularioEgreso}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sin ningún desplegable abierto, el error se muestra acá. */}
        {!egresando && !ingresando && !cambiandoJefe && error && <ErrorCaja>{error}</ErrorCaja>}

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
  /** Desempate entre hechos del mismo instante: primero lo que termina, después lo que empieza. */
  orden: number;
  tipo: 'ingreso' | 'egreso' | 'jefe' | 'sin_jefe';
  titulo: string;
  detalle?: string;
  registro?: string;
}

/** Turnos y períodos del Jefe → una sola línea de tiempo, como la de los grupos. */
function armarEventos(mando: MandoOperativoApi): EventoPuesto[] {
  const eventos: EventoPuesto[] = [];
  for (const p of mando.historialPresencias) {
    const puesto = PUESTOS_TURNO[p.puesto] ?? 'Coordinador';
    eventos.push({ clave: `i-${p.id}`, t: p.desde, orden: 2, tipo: 'ingreso', titulo: `${nombreDe(p)} ingresó al turno como ${puesto}`, registro: p.ingresoPorNombre });
    if (p.hasta) {
      eventos.push({
        clave: `e-${p.id}`, t: p.hasta, orden: 0, tipo: 'egreso', titulo: `${nombreDe(p)} egresó del turno`,
        detalle: p.motivo ?? undefined, registro: p.egresoPorNombre ?? undefined,
      });
    }
  }
  for (const j of mando.historialJefes) {
    eventos.push({ clave: `j-${j.id}`, t: j.desde, orden: 3, tipo: 'jefe', titulo: `${nombreDe(j)} quedó como Jefe de Operativo`, registro: j.asignadoPorNombre });
    // Un reemplazo ya se ve en el «quedó como Jefe» del siguiente; sólo se cuenta cuando quedó sin Jefe.
    if (j.hasta && !j.motivo?.startsWith('Lo reemplaza')) {
      eventos.push({ clave: `s-${j.id}`, t: j.hasta, orden: 1, tipo: 'sin_jefe', titulo: `${nombreDe(j)} dejó de ser el Jefe de Operativo`, detalle: j.motivo ?? undefined, registro: j.cerradoPorNombre ?? undefined });
    }
  }
  return eventos.sort((a, b) => +new Date(a.t) - +new Date(b.t) || a.orden - b.orden);
}

const PUNTO: Record<EventoPuesto['tipo'], string> = {
  ingreso: '#15803d', egreso: '#6b7280', jefe: 'var(--primary)', sin_jefe: '#d97706',
};
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
