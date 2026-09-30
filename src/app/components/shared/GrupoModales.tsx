/**
 * Modales del tablero de grupos (Módulo 4, modelo de estados del 24/09):
 *  · CrearGrupoModal         → CU-21 pasos 2-3 (clase, nombre y Líder del panel "Sin grupo")
 *  · EditarGrupoModal        → CU-24 (nombre; Líder sólo con el grupo En formación)
 *  · AccionGrupoModal        → cambiar el estado: confirmar, asignar zona, reabrir,
 *                              registrar lo que avisan del terreno, o corregir con motivo
 *  · ArmadoAutomaticoModal   → CU-22 (tamaño máximo por grupo)
 *  · DisolverGrupoModal      → CU-25 (confirmación, o la alerta de grupo en terreno)
 *
 * Todas las reglas las aplica el backend; los modales anticipan lo que va a
 * pasar para que el coordinador decida sabiendo, y muestran el error del
 * backend tal cual si algo cambió mientras tanto.
 */
import { useState } from 'react';
import { Users, Edit2, Wand2, Trash2, AlertTriangle, Check, X, ArrowRight, Radio, Wrench } from 'lucide-react';
import {
  gruposApi, ApiError,
  type GrupoApi, type EstadoGrupoApi, type PersonalOperativoApi, type ArmadoAutomaticoApi, type AccionGrupo,
  type ClaseGrupoApi,
} from '../../services/api';
import {
  Overlay, IconBox, Titulo, Texto, Etiqueta, BotonSecundario, BotonPrimario, ErrorCaja,
  estiloCampo, ETIQUETA_ESTADO_GRUPO, DISOLUBLES, ACCION_INFO, ACCIONES_TERRENO, CORREGIBLES,
} from './grupos/piezas';

const NOMBRE_MAX = 50;
const TEXTO_MAX = 200;
const filtrarNombre = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]/g, '').slice(0, NOMBRE_MAX);
const nombreValido = (v: string) => v.trim().length >= 2;
const normalizar = (v: string) => v.trim().toLowerCase();

function Encabezado({ icono, fondo, titulo, subtitulo, onClose }: {
  icono: React.ReactNode; fondo: string; titulo: string; subtitulo?: string; onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <IconBox bg={fondo}>{icono}</IconBox>
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
  );
}

function Pie({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>{children}</div>;
}

const mensaje = (err: unknown, porDefecto: string) => (err instanceof ApiError ? err.message : porDefecto);

/** "de En formación a Confirmado", con las etiquetas del catálogo. */
function Transicion({ desde, hacia }: { desde: EstadoGrupoApi; hacia: EstadoGrupoApi }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
      <span style={{ color: 'var(--muted-foreground)' }}>{ETIQUETA_ESTADO_GRUPO[desde]}</span>
      <ArrowRight size={13} style={{ color: 'var(--muted-foreground)' }} />
      <strong style={{ color: 'var(--foreground)' }}>{ETIQUETA_ESTADO_GRUPO[hacia]}</strong>
    </div>
  );
}

/* ── CU-21 · Crear Grupo ───────────────────────────────────────────────── */

/** Qué es cada clase, dicho para el coordinador al crear (decisión del 26/09). */
const CLASES: { valor: ClaseGrupoApi; titulo: string; detalle: string }[] = [
  { valor: 'RASTRILLAJE', titulo: 'Grupo de rastrillaje', detalle: 'Agentes que caminan el polígono. Lo lidera alguien del DUAR.' },
  { valor: 'ESPECIAL', titulo: 'Grupo especial', detalle: 'Drones, canes, paramédicos, caballería o buzos, con agentes de apoyo. Lo lidera cualquiera.' },
];

const nombreCompleto = (a: { nombre: string; apellido: string }) => `${a.nombre} ${a.apellido}`;

export function CrearGrupoModal({ operativoId, disponibles, nombresUsados, onClose, onCreado }: {
  operativoId: string;
  /** Paso 2.1: los que están sin grupo y Disponibles. El Líder sale de acá según la clase. */
  disponibles: PersonalOperativoApi[];
  nombresUsados: string[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [clase, setClase] = useState<ClaseGrupoApi | null>(null);
  const [nombre, setNombre] = useState('');
  const [liderId, setLiderId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // De rastrillaje: agentes del DUAR (un recurso especial no entra). Especial: cualquiera.
  const candidatos = clase === 'RASTRILLAJE' ? disponibles.filter(a => a.esDuar && !a.esRecursoCritico && !a.esConductor)
    : clase === 'ESPECIAL' ? disponibles : [];
  const lider = candidatos.find(a => a.id === liderId) ?? null;
  const duplicado = nombresUsados.map(normalizar).includes(normalizar(nombre));
  const puede = !!clase && nombreValido(nombre) && !duplicado && !!lider && !enviando;

  const elegirClase = (c: ClaseGrupoApi) => {
    setClase(c);
    setError(null);
    // El Líder elegido puede no valer para la otra clase.
    if (c === 'RASTRILLAJE' && lider && (!lider.esDuar || lider.esRecursoCritico || lider.esConductor)) setLiderId('');
  };

  const crear = async () => {
    if (!puede || !clase || !lider) return;
    setEnviando(true);
    setError(null);
    try {
      await gruposApi.crear(operativoId, { nombre: nombre.trim(), liderId: lider.id, clase });
      onCreado();
      onClose();
    } catch (err) {
      setError(mensaje(err, 'No se pudo crear el grupo.'));
    } finally {
      setEnviando(false);
    }
  };

  const especiales = candidatos.filter(a => a.esRecursoCritico);
  const agentes = candidatos.filter(a => !a.esRecursoCritico);
  const opcion = (a: PersonalOperativoApi) => (
    <option key={a.id} value={a.id}>
      {nombreCompleto(a)}{a.especialidadNombre ? ` · ${a.especialidadNombre}` : ''}{clase === 'ESPECIAL' && a.esDuar ? ' · DUAR' : ''}
    </option>
  );

  return (
    <>
      <Overlay onClose={onClose}>
        <Encabezado icono={<Users size={17} style={{ color: 'var(--primary)' }} />} fondo="rgba(229,75,75,0.1)"
          titulo="Nuevo Grupo" subtitulo="Nace En Formación con su Líder adentro. Al resto lo sumás arrastrando." onClose={onClose} />
        <div className="px-5 py-5 flex flex-col gap-4" style={{ overflowY: 'auto' }}>
          <div>
            <Etiqueta>Tipo de grupo *</Etiqueta>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de grupo">
              {CLASES.map(c => {
                const sel = clase === c.valor;
                return (
                  <button key={c.valor} type="button" role="radio" aria-checked={sel} onClick={() => elegirClase(c.valor)}
                    className="text-left px-3 py-2.5 rounded-[var(--radius-input)]"
                    style={{
                      border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: sel ? 'rgba(229,75,75,0.06)' : 'var(--card)', cursor: 'pointer',
                    }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: sel ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                      {c.titulo}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4, marginTop: 2, fontFamily: 'var(--font-family-primary)' }}>
                      {c.detalle}
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 11, marginTop: 6, fontFamily: 'var(--font-family-primary)' }}>
              El tipo no se cambia después: define quién puede integrar el grupo.
            </p>
          </div>

          <div>
            <Etiqueta htmlFor="crear-grupo-nombre">Nombre del Grupo *</Etiqueta>
            <input id="crear-grupo-nombre" value={nombre} maxLength={NOMBRE_MAX}
              onChange={e => setNombre(filtrarNombre(e.target.value))} placeholder={clase === 'ESPECIAL' ? 'Ej: Dron 1' : 'Ej: Grupo Alfa'}
              className="w-full px-3 py-2 outline-none"
              style={{ ...estiloCampo, border: duplicado ? '1px solid #dc2626' : estiloCampo.border }} />
            {duplicado && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>El nombre del grupo ya está en uso.</p>}
          </div>

          {clase && (
            <div>
              <Etiqueta htmlFor="crear-grupo-lider">Líder *</Etiqueta>
              {candidatos.length === 0 ? (
                <ErrorCaja>
                  {clase === 'RASTRILLAJE'
                    ? 'No hay agentes del DUAR disponibles y sin grupo para liderar un grupo de rastrillaje.'
                    : 'No hay nadie disponible y sin grupo para liderar.'}
                </ErrorCaja>
              ) : (
                <select id="crear-grupo-lider" value={liderId} onChange={e => setLiderId(e.target.value)}
                  className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                  <option value="">— Seleccioná al Líder —</option>
                  {clase === 'ESPECIAL' ? (
                    <>
                      {especiales.length > 0 && <optgroup label="Recursos especiales">{especiales.map(opcion)}</optgroup>}
                      {agentes.length > 0 && <optgroup label="Agentes">{agentes.map(opcion)}</optgroup>}
                    </>
                  ) : candidatos.map(opcion)}
                </select>
              )}
              <p style={{ color: 'var(--muted-foreground)', fontSize: 11, marginTop: 6, lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                {clase === 'RASTRILLAJE'
                  ? 'Sólo agentes del DUAR, Disponibles y sin grupo. Los recursos especiales no lideran grupos de rastrillaje.'
                  : 'Cualquiera Disponible y sin grupo, sea o no del DUAR.'}
              </p>
            </div>
          )}
          {error && <ErrorCaja>{error}</ErrorCaja>}
        </div>
        <Pie>
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={crear} habilitado={puede}>{enviando ? 'Creando…' : 'Crear Grupo'}</BotonPrimario>
        </Pie>
      </Overlay>
    </>
  );
}

/* ── CU-24 · Editar nombre y Líder ─────────────────────────────────────── */

export function EditarGrupoModal({ operativoId, grupo, nombresUsados, onClose, onGuardado, onCorregirEstado }: {
  operativoId: string;
  grupo: GrupoApi;
  nombresUsados: string[];
  onClose: () => void;
  onGuardado: () => void;
  /** Abre la corrección del estado (sólo con estados del terreno, 24/09). */
  onCorregirEstado?: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [liderId, setLiderId] = useState(grupo.liderId ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El Líder es parte de la composición: se cambia sólo En formación. En el
  // terreno se cambia al retirar al Líder (sucesión de mando del CU-26).
  const liderEditable = grupo.estado === 'EN_FORMACION';
  const especial = grupo.clase === 'ESPECIAL';
  // De rastrillaje: integrantes del DUAR. Especial: cualquier integrante.
  const candidatos = especial ? grupo.integrantes : grupo.integrantes.filter(i => i.esDuar && !i.esRecursoCritico && !i.esConductor);
  const corregible = CORREGIBLES.includes(grupo.estado) && !!onCorregirEstado;
  const duplicado = normalizar(nombre) !== normalizar(grupo.nombre) &&
    nombresUsados.map(normalizar).includes(normalizar(nombre));

  const cambios: { nombre?: string; liderId?: string } = {};
  if (nombre.trim() !== grupo.nombre) cambios.nombre = nombre.trim();
  if (liderEditable && liderId && liderId !== grupo.liderId) cambios.liderId = liderId;
  const puede = Object.keys(cambios).length > 0 && nombreValido(nombre) && !duplicado && !enviando;

  const guardar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    try {
      await gruposApi.actualizar(operativoId, grupo.id, cambios);
      onGuardado();
      onClose();
    } catch (err) {
      setError(mensaje(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Overlay onClose={onClose}>
        <Encabezado icono={<Edit2 size={16} style={{ color: 'var(--primary)' }} />} fondo="rgba(229,75,75,0.1)"
          titulo="Editar Grupo" subtitulo={`${grupo.nombre} · ${especial ? 'grupo especial' : 'grupo de rastrillaje'}`} onClose={onClose} />
        <div className="px-5 py-5 flex flex-col gap-4" style={{ overflowY: 'auto' }}>
          <div>
            <Etiqueta htmlFor="editar-grupo-nombre">Nombre *</Etiqueta>
            <input id="editar-grupo-nombre" value={nombre} maxLength={NOMBRE_MAX}
              onChange={e => setNombre(filtrarNombre(e.target.value))}
              className="w-full px-3 py-2 outline-none"
              style={{ ...estiloCampo, border: duplicado ? '1px solid #dc2626' : estiloCampo.border }} />
            {duplicado && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>El nombre del grupo ya está en uso.</p>}
          </div>

          <div>
            <Etiqueta htmlFor="editar-grupo-lider">Líder</Etiqueta>
            <select id="editar-grupo-lider" value={liderId} onChange={e => setLiderId(e.target.value)} disabled={!liderEditable}
              className="w-full px-3 py-2 outline-none" style={{ ...estiloCampo, opacity: liderEditable ? 1 : 0.6 }}>
              {!grupo.liderId && <option value="">— Sin Líder: elegí uno —</option>}
              {candidatos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}{especial ? `${c.especialidadNombre ? ` · ${c.especialidadNombre}` : ''}${c.esDuar ? ' · DUAR' : ''}` : ''}
                </option>
              ))}
            </select>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 11, marginTop: 6, lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
              {liderEditable
                ? `${especial ? 'Cualquier integrante, sea o no del DUAR.' : 'Integrantes del DUAR.'} Para nombrar a alguien que no está en el grupo, sumalo primero arrastrándolo.`
                : `El Líder se cambia con el grupo En formación (está ${ETIQUETA_ESTADO_GRUPO[grupo.estado]}). En el terreno, se cambia al retirar al Líder.`}
            </p>
          </div>

          {corregible ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
              <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
                Estado: <strong>{ETIQUETA_ESTADO_GRUPO[grupo.estado]}</strong>. Si quedó mal registrado, corregilo con un motivo.
              </p>
              <button type="button" onClick={onCorregirEstado}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] flex-shrink-0"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}>
                <Wrench size={13} style={{ color: '#b45309' }} />
                Corregir estado
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
              El estado no se edita acá: se cambia con los botones de la tarjeta del grupo.
            </p>
          )}
          {error && <ErrorCaja>{error}</ErrorCaja>}
        </div>
        <Pie>
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={guardar} habilitado={puede}>{enviando ? 'Guardando…' : 'Guardar'}</BotonPrimario>
        </Pie>
      </Overlay>
    </>
  );
}

/* ── Acciones de estado ────────────────────────────────────────────────── */

/**
 * Confirmar una acción sobre el grupo, explicando antes lo que provoca.
 *  · asignar              → pide la zona.
 *  · acciones del terreno → las registra el coordinador cuando el Líder se lo
 *    avisa por radio (decisión del 28/09: sin señal, el Líder llama; no hay cola
 *    en el celular ni hora cargada a mano). Quedan con la hora del registro.
 *  · corregir             → pide el estado correcto y el motivo.
 */
export function AccionGrupoModal({ operativoId, grupo, accion, onClose, onHecho }: {
  operativoId: string;
  grupo: GrupoApi;
  accion: AccionGrupo;
  onClose: () => void;
  onHecho: () => void;
}) {
  const esCorreccion = accion === 'corregir';
  const esTerreno = (ACCIONES_TERRENO as string[]).includes(accion);
  const info = esCorreccion ? null : ACCION_INFO[accion];

  const [zona, setZona] = useState(grupo.zonaAsignada ?? '');
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState<EstadoGrupoApi | ''>('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const destinosCorreccion = CORREGIBLES.filter(e => e !== grupo.estado);
  const puede = !enviando && (
    esCorreccion ? (!!destino && motivo.trim().length >= 3)
    : accion === 'asignar' ? zona.trim().length >= 2
    : true
  );

  const confirmar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await gruposApi.accion(operativoId, grupo.id, {
        accion,
        ...(accion === 'asignar' ? { zona: zona.trim() } : {}),
        ...(esCorreccion ? { estadoDestino: destino as EstadoGrupoApi, motivo: motivo.trim() } : {}),
      });
      onHecho();
      if (r.resultado === 'CONFIRMACION') {
        // El Líder ya lo había informado desde su celular.
        setAviso('Ya estaba registrado: lo informó el Líder desde su celular.');
        setTimeout(onClose, 1800);
      } else {
        onClose();
      }
    } catch (err) {
      setError(mensaje(err, 'No se pudo registrar.'));
      setEnviando(false);
    }
  };

  const titulo = esCorreccion ? 'Corregir estado' : info!.titulo;
  const icono = esCorreccion ? <Wrench size={16} style={{ color: '#b45309' }} />
    : esTerreno ? <Radio size={16} style={{ color: 'var(--primary)' }} />
    : <Check size={16} style={{ color: 'var(--primary)' }} />;

  return (
    <Overlay onClose={onClose}>
      <Encabezado icono={icono} fondo={esCorreccion ? '#fef3c7' : 'rgba(229,75,75,0.1)'} titulo={titulo} subtitulo={grupo.nombre} onClose={onClose} />
      <div className="px-5 py-5 flex flex-col gap-4" style={{ overflowY: 'auto' }}>
        {!esCorreccion && (
          <>
            <Transicion desde={grupo.estado} hacia={info!.hacia} />
            <Texto>{info!.efecto}</Texto>
          </>
        )}

        {accion === 'asignar' && (
          <div>
            <Etiqueta htmlFor="accion-zona">Zona asignada *</Etiqueta>
            <input id="accion-zona" autoFocus value={zona} maxLength={TEXTO_MAX} onChange={e => setZona(e.target.value)}
              placeholder="Ej: Margen norte del río, sector 3" className="w-full px-3 py-2 outline-none" style={estiloCampo} />
          </div>
        )}

        {esCorreccion && (
          <>
            <Texto>
              Para arreglar lo que quedó mal registrado (por ejemplo, alguien tocó «Llegamos a la base» antes de
              tiempo). Queda en la línea de tiempo como corrección, con tu nombre y el motivo.
            </Texto>
            <div>
              <Etiqueta htmlFor="accion-destino">Estado correcto *</Etiqueta>
              <select id="accion-destino" value={destino} onChange={e => setDestino(e.target.value as EstadoGrupoApi)}
                className="w-full px-3 py-2 outline-none" style={estiloCampo}>
                <option value="">— Elegí el estado correcto —</option>
                {destinosCorreccion.map(e => <option key={e} value={e}>{ETIQUETA_ESTADO_GRUPO[e]}</option>)}
              </select>
            </div>
            <div>
              <Etiqueta htmlFor="accion-motivo">Motivo *</Etiqueta>
              <input id="accion-motivo" value={motivo} maxLength={TEXTO_MAX} onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: marcaron la llegada antes de tiempo" className="w-full px-3 py-2 outline-none" style={estiloCampo} />
            </div>
          </>
        )}

        {aviso && (
          <div className="p-3 rounded-[var(--radius-input)]" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
            {aviso}
          </div>
        )}
        {error && <ErrorCaja>{error}</ErrorCaja>}
      </div>
      <Pie>
        <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={confirmar} habilitado={puede && !aviso}>
          {enviando ? 'Registrando…' : esCorreccion ? 'Corregir' : info!.boton}
        </BotonPrimario>
      </Pie>
    </Overlay>
  );
}

/* ── CU-22 · Asignación y Armado Automático ────────────────────────────── */

export function ArmadoAutomaticoModal({ operativoId, disponibles, lideresDuar, recursosEspeciales, onClose, onHecho }: {
  operativoId: string;
  /** Agentes de rastrillaje sin grupo y DISPONIBLES (ni conductores ni especiales): los que toma el algoritmo. */
  disponibles: number;
  lideresDuar: number;
  /** Recursos especiales y conductores sin grupo y Disponibles: el algoritmo no los toca. */
  recursosEspeciales: number;
  onClose: () => void;
  onHecho: () => void;
}) {
  const [tamanoTexto, setTamanoTexto] = useState('5');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ArmadoAutomaticoApi | null>(null);

  const tamano = Number(tamanoTexto);
  const tamanoOk = Number.isInteger(tamano) && tamano >= 2 && tamano <= 50;
  // Misma cuenta que grupo.model.js#armadoAutomatico, para anticipar el resultado.
  const porTamano = tamanoOk ? Math.ceil(disponibles / tamano) : 0;
  // Todos los del reparto rastrillan: con N ≤ disponibles / 2 nadie queda solo (binomio).
  const grupos = Math.min(porTamano, lideresDuar, Math.floor(disponibles / 2));
  const sobran = Math.max(0, disponibles - grupos * (tamanoOk ? tamano : 0));
  const puede = tamanoOk && grupos > 0 && !enviando;

  const ejecutar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    try {
      setResultado(await gruposApi.armadoAutomatico(operativoId, tamano));
      onHecho();
    } catch (err) {
      setError(mensaje(err, 'No se pudo ejecutar el armado automático.'));
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <Overlay onClose={onClose}>
        <Encabezado icono={<Check size={18} color="#16a34a" />} fondo="rgba(34,197,94,0.12)"
          titulo={`${resultado.creados.length} grupo${resultado.creados.length !== 1 ? 's' : ''} de rastrillaje creado${resultado.creados.length !== 1 ? 's' : ''}`}
          subtitulo={`${resultado.asignados} agentes asignados, todos En Formación.`} onClose={onClose} />
        <div className="px-5 py-5 flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5">
            {resultado.creados.map(g => (
              <li key={g.id} className="flex justify-between" style={{ fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)' }}>
                <span>{g.nombre}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{g.integrantes} integrantes</span>
              </li>
            ))}
          </ul>
          {resultado.sinAsignar.length > 0 && (
            <div className="p-3 rounded-[var(--radius-input)]" style={{ background: '#fef9c3', border: '1px solid #fde047', fontSize: 'var(--text-label)', color: '#713f12', lineHeight: 1.5, fontFamily: 'var(--font-family-primary)' }}>
              {resultado.limitadoPorLideres
                ? 'No hay más personal del DUAR para liderar, así que se armaron menos grupos de los pedidos. '
                : ''}
              Quedaron sin asignar: {resultado.sinAsignar.map(a => `${a.nombre} ${a.apellido}`).join(', ')}.
            </div>
          )}
          <Texto>Revisalos y confirmalos para poder asignarles zona.</Texto>
          {recursosEspeciales > 0 && (
            <Texto>
              Los recursos especiales y conductores ({recursosEspeciales}) siguen en "Sin grupo": sumalos a mano o armales su grupo especial con "Nuevo Grupo".
            </Texto>
          )}
        </div>
        <Pie><BotonPrimario onClick={onClose} habilitado>Listo</BotonPrimario></Pie>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <Encabezado icono={<Wand2 size={16} style={{ color: 'var(--primary)' }} />} fondo="rgba(229,75,75,0.1)"
        titulo="Asignación Automática" subtitulo="Arma grupos de rastrillaje nuevos con los agentes sin grupo. Los existentes no se tocan." onClose={onClose} />
      <div className="px-5 py-5 flex flex-col gap-4">
        <div>
          <Etiqueta htmlFor="armado-tamano">Tamaño máximo por grupo (incluye al Líder)</Etiqueta>
          <input id="armado-tamano" type="number" inputMode="numeric" min={2} max={50} value={tamanoTexto}
            onChange={e => setTamanoTexto(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="w-full px-3 py-2 outline-none" style={estiloCampo} />
        </div>
        <div className="p-3 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)', fontSize: 'var(--text-label)', color: 'var(--foreground)', lineHeight: 1.6, fontFamily: 'var(--font-family-primary)' }}>
          <p>{disponibles} agente{disponibles !== 1 ? 's' : ''} de rastrillaje Disponible{disponibles !== 1 ? 's' : ''} sin grupo · {lideresDuar} del DUAR para liderar.</p>
          {tamanoOk && grupos > 0 && (
            <p style={{ color: 'var(--muted-foreground)' }}>
              Se armarían <strong style={{ color: 'var(--foreground)' }}>{grupos} grupo{grupos !== 1 ? 's' : ''}</strong>
              {sobran > 0 ? `; ${sobran} quedarían sin asignar` : ''}. Se reparten en ronda: cada grupo sale con al menos dos (nadie rastrilla solo).
            </p>
          )}
          {recursosEspeciales > 0 && (
            <p style={{ color: 'var(--muted-foreground)' }}>
              Los recursos especiales y conductores ({recursosEspeciales}) no entran en el reparto: se suman a mano (los especiales, en grupos especiales).
            </p>
          )}
        </div>
        {lideresDuar === 0 && disponibles > 0 && (
          <ErrorCaja>Imposible armar grupos: no hay agentes del DUAR disponibles para liderar un grupo de rastrillaje.</ErrorCaja>
        )}
        {disponibles === 1 && (
          <ErrorCaja>Hay un solo agente de rastrillaje disponible: cualquier grupo lo dejaría rastrillando solo.</ErrorCaja>
        )}
        {!tamanoOk && <p style={{ color: '#dc2626', fontSize: 11 }}>Ingresá un número entre 2 y 50.</p>}
        {error && <ErrorCaja>{error}</ErrorCaja>}
      </div>
      <Pie>
        <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={ejecutar} habilitado={puede}>{enviando ? 'Armando…' : 'Ejecutar Algoritmo'}</BotonPrimario>
      </Pie>
    </Overlay>
  );
}

/* ── CU-25 · Disolución ────────────────────────────────────────────────── */

export function DisolverGrupoModal({ grupo, onClose, onConfirmar }: {
  grupo: GrupoApi;
  onClose: () => void;
  /** Hace la llamada. Lanza si falla. */
  onConfirmar: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 2.1: en el terreno no se muestra la confirmación, sólo la alerta.
  if (!DISOLUBLES.includes(grupo.estado)) {
    return (
      <Overlay onClose={onClose}>
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <IconBox bg="rgba(202,138,4,0.12)"><AlertTriangle size={17} style={{ color: '#ca8a04' }} /></IconBox>
          <div>
            <Titulo>No se puede disolver</Titulo>
            <Texto>
              No se puede disolver un grupo activo en el terreno. Tiene que volver al puesto de comando primero.
              ({grupo.nombre} está {ETIQUETA_ESTADO_GRUPO[grupo.estado]}.)
            </Texto>
          </div>
        </div>
        <div className="px-5 py-4 flex"><BotonSecundario onClick={onClose}>Entendido</BotonSecundario></div>
      </Overlay>
    );
  }

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      onClose();
    } catch (err) {
      setError(mensaje(err, 'No se pudo disolver el grupo.'));
      setEnviando(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <Encabezado icono={<Trash2 size={16} style={{ color: '#dc2626' }} />} fondo="#fee2e2"
        titulo={`Disolver ${grupo.nombre}`} onClose={onClose} />
      <div className="px-5 py-5 flex flex-col gap-3">
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
          ¿Seguro que querés eliminar este grupo? Esta acción no se puede deshacer.
        </p>
        <Texto>
          Sus {grupo.integrantes.length} integrante{grupo.integrantes.length !== 1 ? 's' : ''} vuelven a
          "Sin grupo" como Disponibles. El grupo queda en el registro del operativo con su historia completa.
        </Texto>
        {error && <ErrorCaja>{error}</ErrorCaja>}
      </div>
      <Pie>
        <BotonSecundario onClick={onClose} disabled={enviando}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={confirmar} habilitado={!enviando} peligro>{enviando ? 'Eliminando…' : 'Eliminar'}</BotonPrimario>
      </Pie>
    </Overlay>
  );
}
