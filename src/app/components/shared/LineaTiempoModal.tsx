/**
 * Línea de tiempo de un agente o de un grupo (tabla `eventos_estado`,
 * migración 010). Es la respuesta al pedido que originó el rediseño del 24/09:
 * poder leer cuándo un agente llegó, cuándo lo agruparon, cuándo su grupo
 * recibió zona, cuándo salieron, cuándo rastrillaron y cuándo volvieron.
 *
 * Cada renglón dice qué pasó, cuándo PASÓ (no cuándo se cargó), quién lo
 * registró y por qué vía. Si un aviso llegó tarde (sin señal en el terreno) se
 * ve la diferencia; si el mismo hecho llegó por radio y por el celular del
 * Líder, se muestran las dos fuentes y se toma la hora más temprana confiable.
 */
import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, Radio, Smartphone, User, Users, Cpu, QrCode, AlertTriangle, X } from 'lucide-react';
import { ApiError, type EventoEstadoApi } from '../../services/api';
import { Overlay, IconBox, Titulo, Texto, ErrorCaja, ETIQUETA_ESTADO_GRUPO } from './grupos/piezas';
import { ESTADO_OP_CONFIG } from './EditarAgenteModal';
import type { EstadoOperativoAgente } from '../../data/mockData';
import { horaCorta } from '../../utils/tiempo';

const ETIQUETA_AGENTE: Record<string, string> = Object.fromEntries(
  (Object.keys(ESTADO_OP_CONFIG) as EstadoOperativoAgente[]).map(k => [k.toUpperCase(), ESTADO_OP_CONFIG[k].label])
);
const etiqueta = (estado: string | null) =>
  !estado ? '—' : (ETIQUETA_AGENTE[estado] ?? ETIQUETA_ESTADO_GRUPO[estado as keyof typeof ETIQUETA_ESTADO_GRUPO] ?? estado);

const FUENTE: Record<EventoEstadoApi['fuente'], { texto: string; icono: typeof Radio }> = {
  PORTAL_LIDER:  { texto: 'celular del Líder', icono: Smartphone },
  PORTAL_AGENTE: { texto: 'portal del agente', icono: Smartphone },
  COORDINADOR:   { texto: 'coordinador',       icono: User },
  RADIO:         { texto: 'aviso de radio',    icono: Radio },
  CASCADA:       { texto: 'por su grupo',      icono: Users },
  SISTEMA:       { texto: 'sistema',           icono: Cpu },
  QR:            { texto: 'QR del operativo',  icono: QrCode },
};

const ACCION_GRUPO: Record<string, string> = {
  crear: 'Grupo creado',
  confirmar: 'Confirmado',
  asignar: 'Zona asignada',
  reabrir: 'Reabierto para cambiar su composición',
  salir: 'Salieron hacia el polígono',
  llegar_poligono: 'Llegaron y empezaron a rastrillar',
  volver: 'Emprendieron la vuelta',
  llegar_base: 'Llegaron al puesto de comando',
  disolver: 'Disuelto',
  corregir: 'Corrección del coordinador',
  cambio_lider: 'Cambio de Líder',
  estado_inicial: 'Estado al empezar el registro',
};

/** "Grupo Alfa" se deja como está; "Alfa" se lee "grupo Alfa". */
const conGrupo = (nombre: string | null) =>
  !nombre ? 'grupo' : /^grupo\b/i.test(nombre) ? nombre : `grupo ${nombre}`;

/** Sólo en los avisos del terreno importa cuánto tardaron en llegar. */
const FUENTES_CON_DEMORA: EventoEstadoApi['fuente'][] = ['PORTAL_LIDER', 'RADIO', 'PORTAL_AGENTE'];

function describir(e: EventoEstadoApi, vista: 'grupo' | 'agente'): { titulo: string; detalle?: string } {
  const grupo = conGrupo(e.grupoNombre);
  // En la historia del grupo, las entradas y salidas de gente llevan el nombre de quién.
  if (vista === 'grupo' && e.entidad === 'AGENTE') {
    const quien = e.agenteNombre ?? 'Un agente';
    const que: Record<string, string> = {
      agrupar: 'se sumó al grupo', desagrupar: 'salió del grupo', retiro: 'fue retirado del grupo',
      baja: 'dejó el operativo', cambio_operativo: 'se fue a otro operativo',
    };
    return { titulo: `${quien} ${que[e.accion] ?? e.accion}`, detalle: e.motivo ?? undefined };
  }
  if (e.entidad === 'GRUPO') {
    if (e.accion === 'corregir') return { titulo: `Corrección: ${etiqueta(e.estadoAnterior)} → ${etiqueta(e.estadoNuevo)}`, detalle: e.motivo ?? undefined };
    if (e.accion === 'asignar') return { titulo: `Zona asignada: ${e.nota ?? '—'}` };
    if (e.accion === 'cambio_lider') return { titulo: e.motivo ?? 'Cambio de Líder' };
    return { titulo: ACCION_GRUPO[e.accion] ?? e.accion, detalle: e.motivo ?? undefined };
  }
  switch (e.accion) {
    case 'alta':             return { titulo: 'Llegó al operativo', detalle: e.motivo ?? undefined };
    case 'agrupar':          return { titulo: `Se sumó al ${grupo}`, detalle: e.motivo ?? undefined };
    case 'desagrupar':       return { titulo: `Salió del ${grupo}`, detalle: e.motivo ?? undefined };
    case 'retiro':           return { titulo: `Retirado del ${grupo}`, detalle: e.motivo ?? undefined };
    case 'disolucion':       return { titulo: `Quedó sin grupo: se disolvió el ${grupo}` };
    case 'cambio_operativo': return { titulo: `Salió del ${grupo}`, detalle: e.motivo ?? undefined };
    case 'baja':             return { titulo: 'Dejó el operativo', detalle: e.motivo ?? undefined };
    case 'marcar_estado':    return { titulo: `Pasó a ${etiqueta(e.estadoNuevo)}` };
    case 'estado_inicial':   return { titulo: `Estado al empezar el registro: ${etiqueta(e.estadoNuevo)}` };
    case 'cascada':
      return {
        titulo: `Pasó a ${etiqueta(e.estadoNuevo)}`,
        detalle: e.origenAccion
          ? `${grupo.charAt(0).toUpperCase()}${grupo.slice(1)}: ${(ACCION_GRUPO[e.origenAccion] ?? e.origenAccion).toLowerCase()}`
          : `por el ${grupo}`,
      };
    default: return { titulo: e.accion };
  }
}

const hora = horaCorta;
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
const diferenciaTexto = (ms: number) => {
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
};

/**
 * La hora en que pasó: la más temprana entre el evento y sus confirmaciones
 * confiables (el celular del Líder suele ser más exacto que el aviso de radio).
 */
function horaDelHecho(e: EventoEstadoApi): string {
  const candidatas = [e.ocurridoEn, ...e.confirmaciones.filter(c => c.horaConfiable).map(c => c.ocurridoEn)];
  return candidatas.reduce((min, t) => (new Date(t) < new Date(min) ? t : min));
}

export default function LineaTiempoModal({ vista, titulo, subtitulo, cargar, onClose }: {
  vista: 'grupo' | 'agente';
  titulo: string;
  subtitulo?: string;
  cargar: () => Promise<EventoEstadoApi[]>;
  onClose: () => void;
}) {
  const [eventos, setEventos] = useState<EventoEstadoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then(ev => { if (vigente) setEventos(ev); })
      .catch(err => { if (vigente) setError(err instanceof ApiError ? err.message : 'No se pudo cargar la línea de tiempo.'); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordenados = useMemo(
    () => (eventos ?? []).map(e => ({ e, t: horaDelHecho(e) })).sort((a, b) => +new Date(a.t) - +new Date(b.t)),
    [eventos]
  );

  let fechaAnterior = '';

  return (
    <Overlay onClose={onClose} ancho={560}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <IconBox bg="rgba(229,75,75,0.1)"><History size={17} style={{ color: 'var(--primary)' }} /></IconBox>
          <div>
            <Titulo>{titulo}</Titulo>
            {subtitulo && <Texto>{subtitulo}</Texto>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={17} />
        </button>
      </div>

      <div className="px-5 py-4" style={{ overflowY: 'auto' }}>
        {error && <ErrorCaja>{error}</ErrorCaja>}
        {!eventos && !error && (
          <div className="flex justify-center py-10" style={{ color: 'var(--muted-foreground)' }}><Loader2 size={18} className="animate-spin" /></div>
        )}
        {eventos && eventos.length === 0 && <Texto>Todavía no hay eventos registrados.</Texto>}

        <ol className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {ordenados.map(({ e, t }) => {
            const { titulo: tituloEv, detalle } = describir(e, vista);
            const F = FUENTE[e.fuente] ?? FUENTE.SISTEMA;
            const demora = FUENTES_CON_DEMORA.includes(e.fuente) ? +new Date(e.registradoEn) - +new Date(e.ocurridoEn) : 0;
            const noAplicado = e.resultado === 'SUPERADO' || e.resultado === 'RECHAZADO';
            const cfgEstado = e.entidad === 'AGENTE' && e.estadoNuevo
              ? ESTADO_OP_CONFIG[e.estadoNuevo.toLowerCase() as EstadoOperativoAgente] : null;
            const dia = fecha(t);
            const mostrarDia = dia !== fechaAnterior;
            fechaAnterior = dia;
            return (
              <li key={e.id}>
                {mostrarDia && (
                  <p className="uppercase tracking-wider mt-2 mb-1" style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-semibold)' }}>{dia}</p>
                )}
                <div className="grid gap-x-3 py-2" style={{ gridTemplateColumns: '48px 1fr', borderTop: '1px solid var(--border)', opacity: noAplicado ? 0.7 : 1 }}>
                  <span style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>
                    {hora(t)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.35, textDecoration: noAplicado ? 'line-through' : 'none' }}>
                      {cfgEstado && <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfgEstado.dot, display: 'inline-block' }} />}
                      {tituloEv}
                    </p>
                    {detalle && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{detalle}</p>}
                    <p className="flex items-center gap-1 flex-wrap mt-0.5" style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                      <F.icono size={11} />
                      {F.texto}{e.registradoPorNombre && e.fuente !== 'CASCADA' ? ` · ${e.registradoPorNombre}` : ''}
                      {/* Presencia de mando (01/10): ¿lo registró desde el puesto de comando? */}
                      {e.enPuesto === true && <span title="Quien lo registró estaba en el puesto de comando"> · en el puesto</span>}
                      {e.enPuesto === false && (
                        <span title="Quien lo registró no estaba presente en el puesto de comando a esa hora"
                          style={{ color: '#b45309', fontWeight: 'var(--font-weight-semibold)' }}> · a distancia</span>
                      )}
                      {demora > 2 * 60000 && ` · se registró ${diferenciaTexto(demora)} después`}
                    </p>
                    {e.confirmaciones.map((c, i) => {
                      const FC = FUENTE[c.fuente as EventoEstadoApi['fuente']] ?? { texto: c.fuente, icono: Smartphone };
                      return (
                        <p key={i} className="flex items-center gap-1 mt-0.5" style={{ fontSize: 10.5, color: '#15803d' }}>
                          <FC.icono size={11} />
                          También llegó por {FC.texto} · {hora(c.ocurridoEn)}{c.registradoPorNombre ? ` · ${c.registradoPorNombre}` : ''}{!c.horaConfiable ? ' (hora no confiable)' : ''}
                        </p>
                      );
                    })}
                    {e.resultado === 'SUPERADO' && (
                      <p style={{ fontSize: 10.5, color: '#b45309' }}>Llegó tarde: el grupo ya había pasado a otro estado. Queda en la historia, sin cambiar nada.</p>
                    )}
                    {e.resultado === 'RECHAZADO' && (
                      <p style={{ fontSize: 10.5, color: '#b91c1c' }}>Rechazado{e.motivo ? `: ${e.motivo}` : ''}.</p>
                    )}
                    {!e.horaConfiable && (
                      <p className="flex items-center gap-1" style={{ fontSize: 10.5, color: '#b45309' }}>
                        <AlertTriangle size={11} /> La hora del celular no era confiable: se usó la del servidor.
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
