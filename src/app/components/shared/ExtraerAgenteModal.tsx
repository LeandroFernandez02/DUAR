/**
 * ExtraerAgenteModal — CU-26: Extraer Agente de Grupo Activo (Baja Parcial / Contingencia)
 *
 * Retira a un agente de su cuadrilla en el terreno SIN desarmar el grupo:
 *  · Paso 3   → motivo de la baja. El retirado queda siempre REPLEGADO y sin
 *               grupo: vuelve del polígono (decisión del 24/09). Al llegar, él
 *               o el coordinador lo marcan Disponible o No disponible.
 *  · Paso 4.1 → Sucesión de Mando: si el que sale es el Líder, es obligatorio
 *               designar reemplazo: del DUAR en un grupo de rastrillaje;
 *               cualquiera en uno especial.
 *               Cancelar aborta la extracción.
 *  · Paso 5.1 → Binomio Mínimo, sólo en los de rastrillaje (26/09): cuenta
 *               los que RASTRILLAN (no el conductor). Si queda uno solo se pide confirmar el riesgo; el
 *               grupo sigue en su estado y el tablero lo marca en rojo.
 *  · Obs.1    → La participación NO se borra: el backend cierra el período con
 *               motivo y fecha (trazabilidad judicial).
 *
 * El modal evalúa lo mismo que el backend para habilitar el botón, pero la
 * última palabra la tiene grupo.model.js#extraerAgente: si entre que se abrió y
 * se confirmó otro coordinador cambió el grupo, el error del backend se muestra.
 */
import { useState } from 'react';
import { AlertTriangle, UserMinus, ShieldAlert, Check, X } from 'lucide-react';
import { gruposApi, ApiError, type GrupoApi, type IntegranteGrupoApi } from '../../services/api';
import {
  Overlay, IconBox, Titulo, Texto, Etiqueta, BotonSecundario, BotonPrimario, ErrorCaja,
  estiloCampo, EN_OPERACION, ETIQUETA_ESTADO_GRUPO,
} from './grupos/piezas';

/** Motivos sugeridos por el CU (paso 3). El Coordinador puede escribir otro. */
const MOTIVOS = ['Lesión', 'Emergencia Personal', 'Reasignación'];
const MOTIVO_MAX = 100;

interface Props {
  operativoId: string;
  grupo: GrupoApi;
  integrante: IntegranteGrupoApi;
  onClose: () => void;
  /** Se llama después de una extracción exitosa, para recargar el tablero. */
  onHecho: () => void;
}

export default function ExtraerAgenteModal({ operativoId, grupo, integrante, onClose, onHecho }: Props) {
  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [nuevoLider, setNuevoLider] = useState('');
  const [riesgoAceptado, setRiesgoAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ alertaBinomio: boolean } | null>(null);

  const motivoFinal = (motivo === 'Otro' ? motivoOtro : motivo).trim();
  const requiereSucesion = grupo.liderId === integrante.id;
  const rastrillaje = grupo.clase === 'RASTRILLAJE';
  // Sucesor: en uno de rastrillaje, del DUAR, no recurso especial y no conductor; en uno especial, cualquiera.
  const candidatosLider = grupo.integrantes.filter(i => i.id !== integrante.id && (!rastrillaje || (i.esDuar && !i.esRecursoCritico && !i.esConductor)));
  const restantes = grupo.integrantes.length - 1;
  const rastrillanRestantes = grupo.integrantes.filter(i => i.id !== integrante.id && !i.esConductor).length;
  const alertaBinomio = rastrillaje && rastrillanRestantes === 1;

  /* ── Precondiciones: se explica y no se deja continuar ── */
  let bloqueo: string | null = null;
  if (!EN_OPERACION.includes(grupo.estado)) {
    bloqueo = `El grupo está ${ETIQUETA_ESTADO_GRUPO[grupo.estado]}. El retiro es para grupos en el terreno (Desplegado, Rastrillando o Replegado); en la base, reabrí el grupo y arrastralo a "Sin grupo".`;
  } else if (grupo.integrantes.length < 2) {
    bloqueo = 'El grupo tiene un solo integrante: no hay a quién dejar operando. Replegá el grupo y disolvelo.';
  } else if (requiereSucesion && candidatosLider.length === 0) {
    bloqueo = 'Es el Líder y no queda otro integrante del DUAR que pueda asumir el mando. Sumá a alguien del DUAR al grupo antes de retirarlo.';
  }

  if (bloqueo) {
    return (
      <Overlay onClose={onClose}>
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <IconBox bg="rgba(202,138,4,0.12)"><AlertTriangle size={17} style={{ color: '#ca8a04' }} /></IconBox>
          <div>
            <Titulo>No se puede retirar del grupo</Titulo>
            <Texto>{bloqueo}</Texto>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end">
          <BotonSecundario onClick={onClose}>Entendido</BotonSecundario>
        </div>
      </Overlay>
    );
  }

  const puedeConfirmar =
    !!motivoFinal && motivoFinal.length <= MOTIVO_MAX &&
    (!requiereSucesion || !!nuevoLider) &&
    (!alertaBinomio || riesgoAceptado) &&
    !enviando;

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await gruposApi.extraer(operativoId, grupo.id, {
        agenteOperativoId: integrante.id,
        motivo: motivoFinal,
        nuevoLiderId: requiereSucesion ? nuevoLider : undefined,
        riesgoAceptado,
      });
      setResultado({ alertaBinomio: r.alertaBinomio });
      onHecho();
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo retirar al agente. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <Overlay onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Check size={28} color="#16a34a" />
          </div>
          <Titulo>Agente retirado del grupo</Titulo>
          <Texto>
            {integrante.nombre} queda Replegado, volviendo a la base.{' '}
            {resultado.alertaBinomio
              ? `${grupo.nombre} sigue con una sola persona rastrillando: queda marcado en rojo en el tablero.`
              : `${grupo.nombre} sigue operando con ${restantes} ${restantes === 1 ? 'integrante' : 'integrantes'}.`}
          </Texto>
        </div>
      </Overlay>
    );
  }

  return (
    <>
      <Overlay onClose={onClose}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <IconBox bg="rgba(229,75,75,0.1)"><UserMinus size={17} style={{ color: 'var(--primary)' }} /></IconBox>
            <div>
              <Titulo>Retirar del Grupo</Titulo>
              <Texto>{integrante.nombre} {integrante.apellido} · {grupo.nombre}</Texto>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={17} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5" style={{ overflowY: 'auto' }}>
          {/* ── Paso 4.1 · Sucesión de Mando ── */}
          {requiereSucesion && (
            <div className="p-3 rounded-[var(--radius-input)]" style={{ background: 'rgba(229,75,75,0.07)', border: '1px solid rgba(229,75,75,0.25)' }}>
              <div className="flex items-start gap-2 mb-2.5">
                <ShieldAlert size={15} style={{ color: 'var(--primary)', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                  El agente retirado es el <strong>Líder del grupo</strong>. Seleccioná al nuevo Líder para continuar.
                </p>
              </div>
              <select id="extraer-nuevo-lider" value={nuevoLider} onChange={e => setNuevoLider(e.target.value)}
                className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                <option value="">{rastrillaje ? '— Seleccioná el nuevo Líder (DUAR) —' : '— Seleccioná el nuevo Líder —'}</option>
                {candidatosLider.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido}{!rastrillaje && c.esDuar ? ' · DUAR' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Paso 3 · Motivo ── */}
          <div>
            <Etiqueta>Motivo de la baja</Etiqueta>
            <div className="grid grid-cols-2 gap-2">
              {[...MOTIVOS, 'Otro'].map(m => {
                const sel = motivo === m;
                return (
                  <button key={m} type="button" onClick={() => setMotivo(m)}
                    className="px-3 py-2.5 rounded-[var(--radius-input)] text-left"
                    style={{
                      border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: sel ? 'rgba(229,75,75,0.06)' : 'var(--card)',
                      color: sel ? 'var(--primary)' : 'var(--foreground)',
                      fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)',
                      fontWeight: sel ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      cursor: 'pointer',
                    }}>
                    {m}
                  </button>
                );
              })}
            </div>
            {motivo === 'Otro' && (
              <input id="extraer-motivo-otro" autoFocus value={motivoOtro} maxLength={MOTIVO_MAX}
                onChange={e => setMotivoOtro(e.target.value)} placeholder="Especificá el motivo"
                className="w-full mt-2 px-3 py-2 outline-none" style={estiloCampo} />
            )}
          </div>

          {/* ── Paso 3 · Estado al salir: siempre Replegado ── */}
          <p className="px-3 py-2.5 rounded-[var(--radius-input)]"
            style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
            {integrante.nombre} queda <strong style={{ color: 'var(--foreground)' }}>Replegado</strong> y sin grupo: vuelve del
            polígono. Cuando llegue, su estado pasa a Disponible o No disponible desde su portal o desde la pestaña Agentes.
            {rastrillaje && rastrillanRestantes === 0 && ' Atención: en el grupo no queda nadie que rastrille el polígono.'}
          </p>

          {/* ── Paso 5.1 · Binomio Mínimo ── */}
          {alertaBinomio && (
            <label className="flex items-start gap-2.5 p-3 rounded-[var(--radius-input)] cursor-pointer"
              style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
              <input id="extraer-riesgo" type="checkbox" checked={riesgoAceptado}
                onChange={e => setRiesgoAceptado(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-label)', color: '#713f12', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                <strong>Advertencia:</strong> el grupo quedará con una sola persona rastrillando, por debajo
                del binomio mínimo. Sigue en el terreno y el tablero lo marca en rojo hasta que
                vuelva. Confirmo ser consciente del riesgo.
              </span>
            </label>
          )}

          {error && <ErrorCaja>{error}</ErrorCaja>}
        </div>

        <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={confirmar} habilitado={puedeConfirmar}>
            {enviando ? 'Retirando…' : 'Confirmar Extracción'}
          </BotonPrimario>
        </div>
      </Overlay>
    </>
  );
}
