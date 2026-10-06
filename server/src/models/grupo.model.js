/**
 * MODELO · Grupos de Trabajo (Módulo 4 · CU-21 a CU-26), con el modelo de
 * estados rediseñado el 24/09 (migración 010).
 *
 * Un grupo es una cuadrilla dentro de UN operativo: gente que sale junta y
 * vuelve junta. La pertenencia vive en `agentes_operativo.grupo_id`, el líder
 * en `grupos.lider_id` (FK a `agentes_operativo`: se es líder en ESTE
 * operativo) y el tiempo realmente trabajado en `agentes_grupo_historial`.
 *
 * Desde el 26/09 hay dos CLASES (migración 012), elegidas al crear:
 *   · RASTRILLAJE → agentes que rastrillan, más su conductor; Líder del DUAR y
 *                   binomio (al menos dos que rastrillen).
 *   · ESPECIAL    → recursos especiales (dron, canes, paramédico, caballería,
 *                   buzos) con agentes de apoyo; Líder libre, sin binomio ni mínimo.
 * "Recurso especial" = `cat_especialidades.es_recurso_critico` de la
 * especialidad TÁCTICA del agente (la que se cambia en CU-17).
 *
 * Desde el 29/09 no existe "caminante": quién rastrilla lo dice la especialidad
 * y el papel. El CONDUCTOR no rastrilla (espera al grupo en la camioneta) y,
 * como su papel en el operativo es manejar, entra a cualquier grupo aunque su
 * especialidad sea de recurso especial. Todos los demás integrantes rastrillan.
 *
 * Las reglas de estado están en estados.js. Acá se aplican, y siempre dentro
 * de la transacción que escribe:
 *   · transicionar()  → único punto por el que cambia el estado de un grupo.
 *   · cascada()       → los integrantes toman el estado que manda la Regla 1,
 *                       y cada uno deja su propio evento en la línea de tiempo.
 *   · historial       → cuándo se abre y se cierra un período en el terreno.
 * El controlador valida la forma del pedido; las reglas de negocio las valida
 * este modelo con las filas bloqueadas, así dos coordinadores operando a la vez
 * no pueden dejar un estado que ninguna regla permite.
 */
import { query, withTransaction } from '../config/db.js';
import * as Est from './estados.js';
import * as Evento from './evento.model.js';

export { EN_BASE, EN_OPERACION, ACCIONES, ACCIONES_TERRENO, ESTADOS_CORREGIBLES, entraARastrillaje } from './estados.js';

const PALETA = [
  '#E54B4B', '#2563EB', '#16A34A', '#D97706', '#7C3AED',
  '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#475569',
];

/** Nombres del armado automático (CU-22): alfabeto fonético, el que se usa por radio. */
const FONETICO = [
  'Alfa', 'Bravo', 'Charlie', 'Delta', 'Eco', 'Foxtrot', 'Golf', 'Hotel', 'India',
  'Julieta', 'Kilo', 'Lima', 'Mike', 'Noviembre', 'Oscar', 'Papa', 'Quebec', 'Romeo',
  'Sierra', 'Tango', 'Uniforme', 'Víctor', 'Whiskey', 'Xray', 'Yankee', 'Zulu',
];

/** Clases de grupo (migración 012, decisión del 26/09). */
export const CLASES = ['RASTRILLAJE', 'ESPECIAL'];

/** Margen para relojes de celular levemente adelantados. */
const TOLERANCIA_FUTURO_MS = 2 * 60 * 1000;

/**
 * Una regla de negocio rechazada. Lleva el status HTTP y un `motivo` estable
 * que el frontend usa para decidir qué mostrar; app.js lo convierte en respuesta.
 */
export class ReglaError extends Error {
  constructor(status, motivo, mensaje, datos = {}) {
    super(mensaje);
    this.status = status;
    this.motivo = motivo;
    this.datos = datos;
  }
}

const ejecutar = (db, texto, params) => (db ? db.query(texto, params) : query(texto, params));
const hhmm = (d) => new Date(d).toLocaleTimeString('es-AR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Cordoba',
});
const mismoInstante = (a, b) => a && b && new Date(a).getTime() === new Date(b).getTime();

/* ── Lectura ───────────────────────────────────────────────────────────── */

const SELECT_GRUPO = `
  SELECT g.id,
         g.operativo_id          AS "operativoId",
         g.nombre,
         g.estado::text          AS estado,
         g.clase::text           AS clase,
         g.lider_id              AS "liderId",
         g.color,
         g.creado_en             AS "creadoEn",
         g.estado_actualizado_en AS "estadoActualizadoEn",
         -- Los que rastrillan: todos menos el conductor (29/09).
         (count(ao.id) FILTER (WHERE NOT ao.es_conductor))::int AS rastrillan,
         -- Binomio mínimo (CU-26): nadie rastrilla solo. Se calcula en cada lectura,
         -- no se guarda, así nunca queda desactualizado respecto de la composición.
         -- Sólo en los de rastrillaje: los especiales no tienen binomio (26/09).
         (g.clase = 'RASTRILLAJE'
            AND g.estado IN ('DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO')
            AND count(ao.id) FILTER (WHERE NOT ao.es_conductor) = 1) AS "alertaBinomio",
         -- Hasta el CU-28 (Módulo 5), la "zona" es la descripción que cargó el
         -- coordinador al asignar. Vive en el evento, no en una columna provisoria.
         (SELECT e.nota FROM eventos_estado e
           WHERE e.grupo_id = g.id AND e.entidad = 'GRUPO' AND e.estado_nuevo = 'ASIGNADO'
             AND e.resultado = 'APLICADO'
           ORDER BY e.ocurrido_en DESC LIMIT 1) AS "zonaAsignada",
         COALESCE(
           json_agg(json_build_object(
             'id',                  ao.id,
             'usuarioId',           ao.usuario_id,
             'nombre',              u.nombre,
             'apellido',            u.apellido,
             'dni',                 u.dni,
             'estado',              ao.estado::text,
             'estadoActualizadoEn', ao.estado_actualizado_en,
             'esConductor',         ao.es_conductor,
             'esDuar',              COALESCE(i.es_duar, false),
             'especialidadNombre',  e.nombre,
             'esRecursoCritico',    COALESCE(e.es_recurso_critico, false)
           ) ORDER BY (ao.id = g.lider_id) DESC, u.apellido, u.nombre)
           FILTER (WHERE ao.id IS NOT NULL),
           '[]'
         ) AS integrantes
    FROM grupos g
    LEFT JOIN agentes_operativo  ao ON ao.grupo_id = g.id AND ao.fecha_egreso IS NULL
    LEFT JOIN usuarios            u ON u.id = ao.usuario_id
    LEFT JOIN cat_instituciones   i ON i.id = u.institucion_id
    LEFT JOIN cat_especialidades  e ON e.id = ao.especialidad_id
`;

/** Grupos vigentes del operativo (CU-23). Los disueltos quedan como registro histórico. */
export async function listarDeOperativo(operativoId) {
  const { rows } = await query(
    `${SELECT_GRUPO}
      WHERE g.operativo_id = $1 AND g.eliminado_en IS NULL
      GROUP BY g.id
      -- Desempate estable: los grupos del armado automático (CU-22) comparten
      -- creado_en; sin esto las tarjetas cambiaban de orden en cada refresco.
      ORDER BY g.creado_en, g.nombre, g.id`,
    [operativoId]
  );
  return rows;
}

/**
 * Un grupo, SIEMPRE acotado a su operativo: no existe un "buscar por id" suelto,
 * así un pedido con el id de un grupo de otro operativo da 404 por diseño.
 */
export async function buscar(operativoId, grupoId, db = null) {
  const { rows } = await ejecutar(
    db,
    `${SELECT_GRUPO}
      WHERE g.operativo_id = $1 AND g.id = $2 AND g.eliminado_en IS NULL
      GROUP BY g.id`,
    [operativoId, grupoId]
  );
  return rows[0] ?? null;
}

/** Bloquea la fila del grupo durante la transacción y la devuelve (o 404). */
async function bloquearGrupo(client, operativoId, grupoId) {
  const { rows } = await client.query(
    `SELECT id, operativo_id AS "operativoId", nombre, estado::text AS estado, clase::text AS clase,
            lider_id AS "liderId", creado_en AS "creadoEn",
            estado_actualizado_en AS "estadoActualizadoEn"
       FROM grupos
      WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL
      FOR UPDATE`,
    [grupoId, operativoId]
  );
  if (!rows[0]) throw new ReglaError(404, 'grupo_no_encontrado', 'El grupo no existe en este operativo.');
  return rows[0];
}

/** Alta vigente de un agente EN ESTE operativo, bloqueada, con lo que las reglas necesitan. */
async function bloquearAgente(client, operativoId, agenteOperativoId) {
  const { rows } = await client.query(
    `SELECT ao.id, ao.usuario_id AS "usuarioId", ao.grupo_id AS "grupoId",
            ao.estado::text AS estado,
            ao.es_conductor AS "esConductor",
            u.nombre, u.apellido,
            COALESCE(i.es_duar, false) AS "esDuar",
            ce.nombre AS "especialidadNombre",
            COALESCE(ce.es_recurso_critico, false) AS "esRecursoCritico"
       FROM agentes_operativo ao
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
       LEFT JOIN cat_especialidades ce ON ce.id = ao.especialidad_id
      WHERE ao.id = $1 AND ao.operativo_id = $2 AND ao.fecha_egreso IS NULL
      FOR UPDATE OF ao`,
    [agenteOperativoId, operativoId]
  );
  if (!rows[0]) throw new ReglaError(404, 'agente_no_encontrado', 'El agente no está activo en este operativo.');
  return rows[0];
}

/** Integrantes vigentes de un grupo, bloqueados. */
async function miembros(client, grupoId) {
  const { rows } = await client.query(
    `SELECT ao.id, ao.estado::text AS estado,
            ao.es_conductor AS "esConductor",
            COALESCE(i.es_duar, false) AS "esDuar", u.nombre, u.apellido,
            ce.nombre AS "especialidadNombre",
            COALESCE(ce.es_recurso_critico, false) AS "esRecursoCritico"
       FROM agentes_operativo ao
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
       LEFT JOIN cat_especialidades ce ON ce.id = ao.especialidad_id
      WHERE ao.grupo_id = $1 AND ao.fecha_egreso IS NULL
      FOR UPDATE OF ao`,
    [grupoId]
  );
  return rows;
}

/** Traduce la violación del índice de nombre único (migración 009) a la alerta del CU-21 3.2. */
function comoNombreDuplicado(err) {
  if (err.code === '23505' && String(err.constraint ?? '').includes('grupo_nombre_unico')) {
    return new ReglaError(409, 'nombre_duplicado', 'El nombre del grupo ya está en uso.');
  }
  return err;
}

/** Reglas en estados.js#entraARastrillaje (26/09 y 29/09). */
function exigirQueEntreARastrillaje(agente) {
  if (!Est.entraARastrillaje(agente)) {
    throw new ReglaError(409, 'recurso_especial_en_rastrillaje',
      `${agente.nombre} ${agente.apellido} es un recurso especial (${agente.especialidadNombre}): va en un grupo especial, no en uno de rastrillaje (salvo que vaya de conductor).`);
  }
}

/** Quién puede liderar según la clase del grupo: la regla está en estados.js#motivoLiderNoApto. */
const MENSAJE_LIDER_NO_APTO = {
  recurso_especial_en_rastrillaje: a => `${a.nombre} ${a.apellido} es un recurso especial (${a.especialidadNombre}): no puede liderar un grupo de rastrillaje.`,
  lider_conductor: a => `${a.nombre} ${a.apellido} es conductor: el Líder de un grupo de rastrillaje camina con su grupo y el conductor se queda en la camioneta.`,
  lider_no_duar: a => `${a.nombre} ${a.apellido} no pertenece al DUAR: el Líder de un grupo de rastrillaje tiene que ser personal del DUAR.`,
};

function exigirLiderApto(agente, clase) {
  const motivo = Est.motivoLiderNoApto(agente, clase);
  if (motivo) throw new ReglaError(409, motivo, MENSAJE_LIDER_NO_APTO[motivo](agente));
}

async function colorLibre(client, operativoId) {
  const { rows } = await client.query(
    `SELECT color FROM grupos WHERE operativo_id = $1 AND eliminado_en IS NULL`,
    [operativoId]
  );
  const usados = new Set(rows.map(r => r.color));
  return PALETA.find(c => !usados.has(c)) ?? PALETA[rows.length % PALETA.length];
}

/* ── Las reglas centrales ──────────────────────────────────────────────── */

/**
 * CASCADA (Regla 1). Cada integrante toma el estado que le corresponde según el
 * del grupo (estados.js#estadoAgenteSegunGrupo) y deja SU PROPIO evento, con la
 * hora del hecho y un puntero al evento del grupo que lo causó. Así la línea de
 * tiempo de una persona se lee sola, sin reconstruirla desde la del grupo.
 */
async function cascada(client, grupo, estadoGrupo, { ocurridoEn, eventoOrigenId, usuarioId, soloAgenteId = null }) {
  const lista = await miembros(client, grupo.id);
  for (const m of lista) {
    if (soloAgenteId && m.id !== soloAgenteId) continue;
    const nuevo = Est.estadoAgenteSegunGrupo(estadoGrupo, m);
    if (!nuevo || nuevo === m.estado) continue;
    await client.query(
      `UPDATE agentes_operativo SET estado = $2::estado_agente, estado_actualizado_en = $3 WHERE id = $1`,
      [m.id, nuevo, ocurridoEn]
    );
    await Evento.registrar(client, {
      operativoId: grupo.operativoId, entidad: 'AGENTE', grupoId: grupo.id, agenteOperativoId: m.id,
      accion: 'cascada', estadoAnterior: m.estado, estadoNuevo: nuevo, ocurridoEn,
      registradoPor: usuarioId, fuente: 'CASCADA', eventoOrigenId,
    });
  }
}

/**
 * HISTORIAL (decisión del 28/08, fases del 24/09). El armado no deja rastro: un
 * agente puede pasar por cinco grupos en dos minutos hasta que el coordinador se
 * decide. Al salir al terreno se abren los períodos; al volver a la base (o
 * disolverse) se cierran. Siempre con la hora del HECHO, no la del servidor: si
 * el Líder avisó sin señal, el informe tiene que decir cuándo trabajaron de verdad.
 */
async function sincronizarHistorial(client, grupo, anterior, nuevo, t, usuarioId, { correccion = false, motivo = null } = {}) {
  const operaba = Est.EN_OPERACION.includes(anterior);
  const opera = Est.EN_OPERACION.includes(nuevo);

  if (!operaba && opera) {
    if (correccion) {
      // Deshacer una llegada a la base marcada por error: se reabren los
      // períodos que ese evento cerró, en vez de dejar un hueco.
      const { rowCount } = await client.query(
        `UPDATE agentes_grupo_historial h
            SET fecha_fin = NULL, motivo_salida = NULL
           FROM agentes_operativo ao
          WHERE h.grupo_id = $1 AND h.agente_operativo_id = ao.id
            AND ao.grupo_id = $1 AND ao.fecha_egreso IS NULL
            AND h.fecha_fin = $2`,
        [grupo.id, grupo.estadoActualizadoEn]
      );
      if (rowCount > 0) return;
    }
    await client.query(
      `INSERT INTO agentes_grupo_historial (agente_operativo_id, grupo_id, fecha_inicio, registrado_por)
       SELECT ao.id, $1, $2, $3
         FROM agentes_operativo ao
        WHERE ao.grupo_id = $1 AND ao.fecha_egreso IS NULL
          AND NOT EXISTS (SELECT 1 FROM agentes_grupo_historial h
                           WHERE h.agente_operativo_id = ao.id AND h.fecha_fin IS NULL)`,
      [grupo.id, t, usuarioId]
    );
  } else if (operaba && !opera) {
    const razon = correccion ? `Corrección: ${motivo ?? ''}`.trim()
      : nuevo === 'DISUELTO' ? 'Disolución del grupo'
      : `Grupo ${Est.ETIQUETA_GRUPO[nuevo].toLowerCase()}`;
    await client.query(
      `UPDATE agentes_grupo_historial
          SET fecha_fin = $2, motivo_salida = $3, registrado_por = $4
        WHERE grupo_id = $1 AND fecha_fin IS NULL`,
      [grupo.id, t, razon.slice(0, 100), usuarioId]
    );
  }
}

/**
 * Hora del evento. Desde el portal viene la del celular (puede ser de hace
 * horas si no había señal): si es futura o anterior a la creación del grupo, no
 * se le cree, se usa la del servidor y queda marcada. El coordinador, que carga
 * la hora a mano al registrar un aviso de radio, recibe un error en su lugar.
 */
function resolverHora(ocurridoEn, grupo, interactivo) {
  const ahora = new Date();
  if (!ocurridoEn) return { t: ahora, confiable: true };
  const t = new Date(ocurridoEn);
  if (Number.isNaN(t.getTime())) throw new ReglaError(400, 'hora_invalida', 'La hora del evento no es válida.');
  const futura = t.getTime() > ahora.getTime() + TOLERANCIA_FUTURO_MS;
  if (interactivo) {
    if (futura) throw new ReglaError(400, 'hora_futura', 'La hora en que ocurrió no puede ser futura.');
    return { t: t > ahora ? ahora : t, confiable: true };
  }
  if (futura || t < new Date(grupo.creadoEn)) return { t: ahora, confiable: false };
  // Un reloj apenas adelantado (dentro de la tolerancia) se lleva a "ahora":
  // un "desde" en el futuro bloquearía las acciones siguientes del coordinador.
  return { t: t > ahora ? ahora : t, confiable: true };
}

/** Cuando el celular confirma con una hora anterior y confiable, el "desde" del estado vigente se adelanta. */
async function adelantarDesde(client, grupo, eventoId, t) {
  await client.query(`UPDATE grupos SET estado_actualizado_en = $2 WHERE id = $1`, [grupo.id, t]);
  await client.query(
    `UPDATE agentes_operativo ao
        SET estado_actualizado_en = $3
       FROM eventos_estado e
      WHERE e.evento_origen_id = $2 AND e.agente_operativo_id = ao.id
        AND ao.grupo_id = $1 AND ao.estado::text = e.estado_nuevo`,
    [grupo.id, eventoId, t]
  );
}

/** Precondiciones de negocio de cada acción (además de la tabla de transiciones). */
async function precondiciones(client, grupo, accion, { nota }) {
  // Los grupos especiales se confirman sin requisitos (decisión del 26/09).
  if (accion === 'confirmar' && grupo.clase === 'RASTRILLAJE') {
    const lista = await miembros(client, grupo.id);
    const lider = lista.find(m => m.id === grupo.liderId);
    if (!lider) {
      throw new ReglaError(409, 'sin_lider', 'El grupo no tiene Líder. Designá uno del DUAR antes de confirmarlo.');
    }
    exigirLiderApto(lider, grupo.clase);
    const especiales = lista.filter(m => !Est.entraARastrillaje(m));
    if (especiales.length > 0) {
      throw new ReglaError(409, 'recurso_especial_en_rastrillaje',
        `${especiales.map(m => `${m.nombre} ${m.apellido}`).join(', ')} ${especiales.length === 1 ? 'es un recurso especial' : 'son recursos especiales'}: `
        + 'no van en un grupo de rastrillaje. Sacalos y armales un grupo especial.');
    }
    // Binomio (29/09): al menos dos que rastrillen. El conductor no cuenta: espera en la camioneta.
    if (Est.cuantosRastrillan(lista) < 2) {
      throw new ReglaError(409, 'binomio_minimo',
        'Un grupo de rastrillaje necesita al menos dos agentes que rastrillen (el conductor no cuenta): nadie rastrilla solo.');
    }
  }
  if (accion === 'asignar') {
    const zona = String(nota ?? '').trim();
    if (zona.length < 2) {
      throw new ReglaError(400, 'zona_requerida', 'Describí la zona asignada (hasta que exista el mapa, es un texto).');
    }
  }
}

/** Escribe el cambio: estado del grupo, su evento, historial y cascada (o liberación, si se disuelve). */
async function aplicar(client, grupo, accion, hacia, { t, confiable, base, usuarioId }) {
  const anterior = grupo.estado;
  if (hacia === 'DISUELTO') {
    await client.query(
      `UPDATE grupos SET estado = 'DISUELTO', eliminado_en = CURRENT_TIMESTAMP,
                         estado_actualizado_en = $2, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [grupo.id, t]
    );
  } else {
    await client.query(
      `UPDATE grupos SET estado = $2::estado_grupo, estado_actualizado_en = $3, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [grupo.id, hacia, t]
    );
  }

  const eventoId = await Evento.registrar(client, {
    ...base, estadoAnterior: anterior, estadoNuevo: hacia, ocurridoEn: t, horaConfiable: confiable, resultado: 'APLICADO',
  });

  await sincronizarHistorial(client, grupo, anterior, hacia, t, usuarioId,
    { correccion: accion === 'corregir', motivo: base.motivo });

  if (hacia === 'DISUELTO') {
    // CU-25: todos vuelven a "Sin grupo" como DISPONIBLES. lider_id no se toca:
    // es parte del registro histórico ("el Grupo 04 existió de 08:00 a 12:00…").
    const lista = await miembros(client, grupo.id);
    for (const m of lista) {
      await client.query(
        `UPDATE agentes_operativo SET grupo_id = NULL, estado = 'DISPONIBLE', estado_actualizado_en = $2 WHERE id = $1`,
        [m.id, t]
      );
      await Evento.registrar(client, {
        operativoId: grupo.operativoId, entidad: 'AGENTE', grupoId: grupo.id, agenteOperativoId: m.id,
        accion: 'disolucion', estadoAnterior: m.estado, estadoNuevo: 'DISPONIBLE', ocurridoEn: t,
        registradoPor: usuarioId, fuente: 'CASCADA', eventoOrigenId: eventoId,
      });
    }
  } else {
    await cascada(client, grupo, hacia, { ocurridoEn: t, eventoOrigenId: eventoId, usuarioId });
  }
  return eventoId;
}

/* ── transicionar: el único punto por el que cambia el estado de un grupo ─ */

/**
 * @param {string} accion  una de estados.js#ACCIONES, o 'corregir'
 * @param {object} opts
 *   · fuente                 'COORDINADOR' | 'RADIO' | 'PORTAL_LIDER' | 'SISTEMA'
 *   · ocurridoEn             hora del hecho (celular, o la que carga el coordinador)
 *   · motivo, nota           motivo (corregir) / zona (asignar)
 *   · estadoDestino          sólo para 'corregir'
 *   · clienteEventoId        id de la cola sin señal del celular (idempotencia)
 *   · autorAgenteOperativoId quien lo manda desde el portal (tiene que ser el Líder)
 * @returns {{resultado, eventoId, antes, despues}}
 *   resultado: APLICADO | CONFIRMACION | SUPERADO | RECHAZADO
 *
 * Desde el portal NUNCA lanza por reglas del terreno: un evento de la cola que
 * no se puede aplicar queda registrado con su resultado y el celular lo muestra.
 * Para el coordinador, que está mirando la pantalla, una transición inválida es
 * un error con explicación.
 */
export async function transicionar(operativoId, grupoId, accion, opts, usuarioId) {
  const {
    fuente, ocurridoEn = null, motivo = null, nota = null, estadoDestino = null,
    clienteEventoId = null, autorAgenteOperativoId = null,
  } = opts;
  const desdePortal = fuente === 'PORTAL_LIDER';
  const antes = await buscar(operativoId, grupoId);

  let resultado = null;
  let eventoId = null;

  await withTransaction(async (client) => {
    // 1. Idempotencia: la cola del celular puede reenviar lo que ya llegó.
    const previo = await Evento.porIdCliente(client, clienteEventoId);
    if (previo) { resultado = previo.resultado; eventoId = previo.id; return; }

    const grupo = await bloquearGrupo(client, operativoId, grupoId);
    const hacia = accion === 'corregir' ? estadoDestino : Est.ACCIONES[accion]?.hacia;
    if (!hacia) throw new ReglaError(400, 'accion_invalida', 'Acción desconocida.');

    const base = {
      operativoId, entidad: 'GRUPO', grupoId, accion, registradoPor: usuarioId, fuente,
      motivo, nota: accion === 'asignar' ? String(nota ?? '').trim() : null, clienteEventoId,
    };
    const registrarSin = async (res, extra = {}) => {
      eventoId = await Evento.registrar(client, { ...base, estadoNuevo: hacia, resultado: res, ...extra });
      resultado = res;
    };

    // 2. Autoría: desde el portal, sólo el Líder actual.
    if (desdePortal && grupo.liderId !== autorAgenteOperativoId) {
      await registrarSin('RECHAZADO', {
        estadoAnterior: grupo.estado, ocurridoEn: resolverHora(ocurridoEn, grupo, false).t,
        motivo: 'Quien lo envió ya no es el Líder del grupo',
      });
      return;
    }

    const { t, confiable } = resolverHora(ocurridoEn, grupo, !desdePortal);

    // 3. Eventos tardíos (cola sin señal): nunca hacen retroceder el estado.
    if (desdePortal) {
      const siguiente = await Evento.primerCambioDeGrupoPosterior(client, grupoId, t);
      if (siguiente) {
        if (siguiente.estadoNuevo === hacia) {
          // El mismo hecho ya estaba registrado (casi siempre, por radio).
          await registrarSin('CONFIRMACION', { ocurridoEn: t, horaConfiable: confiable, confirmaEventoId: siguiente.id });
          if (confiable && grupo.estado === hacia && mismoInstante(siguiente.ocurridoEn, grupo.estadoActualizadoEn)) {
            await adelantarDesde(client, grupo, siguiente.id, t);
          }
        } else {
          // El grupo ya había pasado a otra cosa: queda en la historia, el tablero no se mueve.
          await registrarSin('SUPERADO', { ocurridoEn: t, horaConfiable: confiable });
        }
        return;
      }
      if (grupo.estado === hacia) {
        const ultimo = await Evento.ultimoCambioDeGrupo(client, grupoId);
        await registrarSin('CONFIRMACION', { ocurridoEn: t, horaConfiable: confiable, confirmaEventoId: ultimo?.id ?? null });
        return;
      }
      if (!Est.ACCIONES[accion]?.desde.includes(grupo.estado)) {
        await registrarSin('RECHAZADO', {
          estadoAnterior: grupo.estado, ocurridoEn: t, horaConfiable: confiable,
          motivo: `El grupo estaba ${Est.ETIQUETA_GRUPO[grupo.estado]}`,
        });
        return;
      }
    } else {
      // 4. Coordinador. Un aviso de radio de algo que ya se registró (casi
      //    siempre, desde el celular del Líder) es una confirmación, no un error.
      if (Est.ACCIONES_TERRENO.includes(accion) && grupo.estado === hacia) {
        const ultimo = await Evento.ultimoCambioDeGrupo(client, grupoId);
        await registrarSin('CONFIRMACION', { ocurridoEn: t, confirmaEventoId: ultimo?.id ?? null });
        return;
      }
      if (accion === 'corregir') {
        if (!motivo || String(motivo).trim().length < 3) {
          throw new ReglaError(400, 'motivo_requerido', 'Una corrección necesita el motivo.');
        }
        if (!Est.ESTADOS_CORREGIBLES.includes(grupo.estado) || !Est.ESTADOS_CORREGIBLES.includes(hacia) || hacia === grupo.estado) {
          throw new ReglaError(409, 'correccion_invalida',
            `Sólo se corrigen estados del terreno. El grupo está ${Est.ETIQUETA_GRUPO[grupo.estado]}.`);
        }
      } else if (!Est.ACCIONES[accion].desde.includes(grupo.estado)) {
        throw new ReglaError(409, 'transicion_invalida',
          `No se puede hacer eso con el grupo ${Est.ETIQUETA_GRUPO[grupo.estado]}.`, { estadoGrupo: grupo.estado });
      }
      if (t < new Date(grupo.estadoActualizadoEn)) {
        throw new ReglaError(409, 'hora_anterior',
          `La hora es anterior al estado actual (${Est.ETIQUETA_GRUPO[grupo.estado]} desde las ${hhmm(grupo.estadoActualizadoEn)}). Si lo registrado está mal, usá Corregir estado.`);
      }
    }

    // 5. Reglas de negocio de la acción y aplicación.
    await precondiciones(client, grupo, accion, { nota });
    eventoId = await aplicar(client, grupo, accion, hacia, { t, confiable, base, usuarioId });
    resultado = 'APLICADO';
  });

  const despues = await buscar(operativoId, grupoId);
  return { resultado, eventoId, antes, despues };
}

/* ── CU-21 · Crear Grupo de Trabajo ────────────────────────────────────── */

/**
 * Crea el "envase" EN_FORMACION con su Líder adentro (pasos 2 a 5). El resto
 * llega arrastrando (paso 6, moverAgente). El Líder sale del panel "Sin grupo"
 * y tiene que estar DISPONIBLE. La clase se elige acá y no cambia: en uno de
 * rastrillaje el Líder es del DUAR; en uno especial puede ser cualquiera.
 */
export async function crear(operativoId, { nombre, liderId, clase }, usuarioId) {
  const id = await withTransaction(async (client) => {
    const lider = await bloquearAgente(client, operativoId, liderId);
    if (lider.grupoId) {
      throw new ReglaError(409, 'lider_con_grupo',
        `${lider.nombre} ${lider.apellido} ya integra otro grupo. El Líder se elige entre los agentes sin grupo.`);
    }
    exigirLiderApto(lider, clase);
    if (lider.estado !== 'DISPONIBLE') {
      throw new ReglaError(409, 'lider_no_disponible',
        `${lider.nombre} ${lider.apellido} no está Disponible (está ${Est.ETIQUETA_AGENTE[lider.estado]}).`);
    }

    const color = await colorLibre(client, operativoId);
    let grupoId;
    try {
      const { rows } = await client.query(
        `INSERT INTO grupos (operativo_id, nombre, lider_id, estado, color, clase)
         VALUES ($1, $2, $3, 'EN_FORMACION', $4, $5::clase_grupo) RETURNING id`,
        [operativoId, nombre.trim(), liderId, color, clase]
      );
      grupoId = rows[0].id;
    } catch (err) { throw comoNombreDuplicado(err); }

    const evGrupo = await Evento.registrar(client, {
      operativoId, entidad: 'GRUPO', grupoId, accion: 'crear', estadoNuevo: 'EN_FORMACION',
      registradoPor: usuarioId, fuente: 'COORDINADOR',
      motivo: clase === 'ESPECIAL' ? 'Grupo especial' : 'Grupo de rastrillaje',
    });
    await client.query(
      `UPDATE agentes_operativo SET grupo_id = $1, estado = 'AGRUPADO', estado_actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`,
      [grupoId, liderId]
    );
    await Evento.registrar(client, {
      operativoId, entidad: 'AGENTE', grupoId, agenteOperativoId: liderId, accion: 'agrupar',
      estadoAnterior: 'DISPONIBLE', estadoNuevo: 'AGRUPADO', registradoPor: usuarioId,
      fuente: 'COORDINADOR', eventoOrigenId: evGrupo,
      motivo: 'Líder del grupo',
    });
    return grupoId;
  });
  return buscar(operativoId, id);
}

/* ── CU-24 · Nombre y Líder ────────────────────────────────────────────── */

/**
 * El estado NO se cambia acá: va por transicionar(). El Líder se cambia sólo
 * con el grupo EN_FORMACION (es parte de su composición); en el terreno se
 * cambia al retirar al Líder (sucesión de mando del CU-26).
 */
export async function actualizar(operativoId, grupoId, { nombre, liderId }, usuarioId) {
  const antes = await buscar(operativoId, grupoId);
  if (!antes) throw new ReglaError(404, 'grupo_no_encontrado', 'El grupo no existe en este operativo.');

  await withTransaction(async (client) => {
    const grupo = await bloquearGrupo(client, operativoId, grupoId);

    if (nombre !== undefined && nombre.trim() !== grupo.nombre) {
      try {
        await client.query(`UPDATE grupos SET nombre = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
          [grupoId, nombre.trim()]);
      } catch (err) { throw comoNombreDuplicado(err); }
    }

    if (liderId !== undefined && liderId !== grupo.liderId) {
      if (grupo.estado !== 'EN_FORMACION') {
        throw new ReglaError(409, 'grupo_no_en_formacion',
          `El Líder se cambia con el grupo En formación. Está ${Est.ETIQUETA_GRUPO[grupo.estado]}: reabrilo primero.`);
      }
      const nuevo = await bloquearAgente(client, operativoId, liderId);
      if (nuevo.grupoId !== grupoId) {
        throw new ReglaError(409, 'lider_fuera_del_grupo',
          `${nuevo.nombre} ${nuevo.apellido} no integra este grupo. Sumalo primero y después nombralo Líder.`);
      }
      exigirLiderApto(nuevo, grupo.clase);
      await client.query(`UPDATE grupos SET lider_id = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
        [grupoId, liderId]);
      await Evento.registrar(client, {
        operativoId, entidad: 'GRUPO', grupoId, accion: 'cambio_lider',
        estadoAnterior: grupo.estado, estadoNuevo: grupo.estado, registradoPor: usuarioId,
        fuente: 'COORDINADOR',
        motivo: `Nuevo Líder: ${nuevo.nombre} ${nuevo.apellido}`,
      });
    }
  });

  return { antes, despues: await buscar(operativoId, grupoId) };
}

/* ── CU-21 paso 6 / CU-24 · Drag & Drop ───────────────────────────────── */

/** Mensaje de por qué la composición de un grupo no se puede tocar ahora. */
function composicionCerrada(grupo) {
  const estado = Est.ETIQUETA_GRUPO[grupo.estado];
  return Est.EN_OPERACION.includes(grupo.estado)
    ? new ReglaError(409, 'grupo_no_en_formacion',
        `El ${grupo.nombre} está ${estado}, en el terreno: no se suma ni se saca gente arrastrando. Para retirar a alguien usá "Retirar del grupo".`)
    : new ReglaError(409, 'grupo_no_en_formacion',
        `El ${grupo.nombre} está ${estado}: para cambiar su composición, reabrilo.`);
}

/**
 * Mueve a un agente entre "Sin grupo" (destino null) y un grupo EN_FORMACION.
 *  · La composición sólo se toca con el grupo EN_FORMACION (decisión 24/09):
 *    un grupo confirmado se reabre, y al terreno no se suma gente — lo que sale
 *    aparte (los drones al precipicio) sale en su propio grupo.
 *  · El Líder no se arrastra (CU-21 6.1, CU-24 2.1).
 *  · Entra sólo quien está DISPONIBLE (CU-23 obs. 2) y queda AGRUPADO; quien
 *    sale vuelve a DISPONIBLE.
 *  · A un grupo de rastrillaje no entra un recurso especial (26/09); a uno
 *    especial entra cualquiera (los agentes van de apoyo).
 */
export async function moverAgente(operativoId, { agenteOperativoId, destinoGrupoId }, usuarioId) {
  return withTransaction(async (client) => {
    // Orden de bloqueo: GRUPOS primero, AGENTE después — igual que el resto de
    // las operaciones, para que dos coordinadores a la vez no se traben.
    const { rows: previa } = await client.query(
      `SELECT grupo_id AS "grupoId" FROM agentes_operativo
        WHERE id = $1 AND operativo_id = $2 AND fecha_egreso IS NULL`,
      [agenteOperativoId, operativoId]
    );
    if (!previa[0]) throw new ReglaError(404, 'agente_no_encontrado', 'El agente no está activo en este operativo.');
    const origenId = previa[0].grupoId;
    const destino = destinoGrupoId ?? null;

    const grupos = {};
    for (const id of [origenId, destino].filter(Boolean).sort()) {
      grupos[id] = await bloquearGrupo(client, operativoId, id);
    }
    const agente = await bloquearAgente(client, operativoId, agenteOperativoId);
    if (agente.grupoId !== origenId) {
      throw new ReglaError(409, 'conflicto', 'El agente cambió de grupo mientras tanto. Actualizá el tablero y volvé a intentar.');
    }
    const antes = { ...agente };
    if (origenId === destino) return { antes, despues: agente };

    if (origenId) {
      const origen = grupos[origenId];
      if (origen.liderId === agente.id) {
        throw new ReglaError(409, 'es_lider', 'Los líderes no pueden moverse arrastrando: cambiá el líder desde Editar grupo.');
      }
      if (origen.estado !== 'EN_FORMACION') throw composicionCerrada(origen);
    }
    if (destino) {
      const grupo = grupos[destino];
      if (grupo.estado !== 'EN_FORMACION') throw composicionCerrada(grupo);
      if (!origenId && agente.estado !== 'DISPONIBLE') {
        throw new ReglaError(409, 'agente_no_apto',
          `${agente.nombre} ${agente.apellido} está ${Est.ETIQUETA_AGENTE[agente.estado]}: sólo se suma a un grupo quien está Disponible.`);
      }
      if (grupo.clase === 'RASTRILLAJE') exigirQueEntreARastrillaje(agente);
    }

    const evento = (grupoId, accion, estadoAnterior, estadoNuevo, motivo = null) => Evento.registrar(client, {
      operativoId, entidad: 'AGENTE', grupoId, agenteOperativoId: agente.id, accion,
      estadoAnterior, estadoNuevo, registradoPor: usuarioId, fuente: 'COORDINADOR', motivo,
    });

    if (destino) {
      await client.query(
        `UPDATE agentes_operativo
            SET grupo_id = $1, estado = 'AGRUPADO',
                estado_actualizado_en = CASE WHEN estado <> 'AGRUPADO' THEN CURRENT_TIMESTAMP ELSE estado_actualizado_en END
          WHERE id = $2`,
        [destino, agente.id]
      );
      if (origenId) await evento(origenId, 'desagrupar', agente.estado, 'AGRUPADO', `Pasó al ${grupos[destino].nombre}`);
      await evento(destino, 'agrupar', agente.estado, 'AGRUPADO', origenId ? `Venía del ${grupos[origenId].nombre}` : null);
    } else {
      await client.query(
        `UPDATE agentes_operativo SET grupo_id = NULL, estado = 'DISPONIBLE', estado_actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
        [agente.id]
      );
      await evento(origenId, 'desagrupar', agente.estado, 'DISPONIBLE');
    }

    const despues = await bloquearAgente(client, operativoId, agente.id);
    return { antes, despues };
  });
}

/* ── CU-26 · Extraer Agente de Grupo Activo ────────────────────────────── */

/**
 * Baja parcial en el terreno (grupo DESPLEGADO, RASTRILLANDO o REPLEGADO, con
 * al menos 2 integrantes). El retirado queda REPLEGADO y sin grupo: vuelve a la
 * base, y al llegar él o el coordinador lo marca Disponible o No disponible.
 *  · Sucesión de mando obligatoria si sale el Líder (4.1), con la regla de
 *    Líder de la clase del grupo.
 *  · Binomio (5.1), sólo en los de rastrillaje: si quedaría exactamente UNO
 *    que rastrille, el coordinador tiene que aceptar el riesgo. El grupo NO cambia
 *    de estado (decisión 24/09: sigue, con la alerta visible en el tablero).
 *  · El período se CIERRA con motivo, nunca se borra (obs. 1).
 */
export async function extraerAgente(operativoId, grupoId,
  { agenteOperativoId, motivo, nuevoLiderId = null, riesgoAceptado = false }, usuarioId) {
  const antes = await buscar(operativoId, grupoId);

  await withTransaction(async (client) => {
    const grupo = await bloquearGrupo(client, operativoId, grupoId);
    if (!Est.EN_OPERACION.includes(grupo.estado)) {
      throw new ReglaError(409, 'grupo_no_extraible',
        `El grupo está ${Est.ETIQUETA_GRUPO[grupo.estado]}: el retiro es para grupos en el terreno. En la base, reabrilo y sacalo arrastrando.`);
    }
    const lista = await miembros(client, grupoId);
    const agente = lista.find(m => m.id === agenteOperativoId);
    if (!agente) throw new ReglaError(409, 'agente_fuera_del_grupo', 'Ese agente no integra este grupo.');
    if (lista.length < 2) {
      throw new ReglaError(409, 'minimo_integrantes', 'El grupo tiene un solo integrante: no hay a quién dejar operando.');
    }

    if (grupo.liderId === agente.id) {
      if (!nuevoLiderId) {
        throw new ReglaError(409, 'sucesion_requerida', 'El agente retirado es el Líder del grupo. Seleccione al nuevo Líder para continuar.');
      }
      const sucesor = lista.find(m => m.id === nuevoLiderId);
      if (!sucesor || sucesor.id === agente.id) {
        throw new ReglaError(409, 'lider_fuera_del_grupo', 'El nuevo Líder tiene que ser otro integrante del grupo.');
      }
      exigirLiderApto(sucesor, grupo.clase);
      await client.query(`UPDATE grupos SET lider_id = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
        [grupoId, nuevoLiderId]);
      await Evento.registrar(client, {
        operativoId, entidad: 'GRUPO', grupoId, accion: 'cambio_lider',
        estadoAnterior: grupo.estado, estadoNuevo: grupo.estado, registradoPor: usuarioId, fuente: 'COORDINADOR',
        motivo: `Nuevo Líder: ${sucesor.nombre} ${sucesor.apellido} (sucesión por retiro)`,
      });
    }

    const rastrillanRestantes = lista.filter(m => m.id !== agente.id && !m.esConductor).length;
    if (grupo.clase === 'RASTRILLAJE' && rastrillanRestantes === 1 && !riesgoAceptado) {
      throw new ReglaError(409, 'binomio_sin_confirmar',
        'El grupo quedará con una sola persona rastrillando, por debajo del mínimo operativo. Hay que confirmar el riesgo.');
    }

    await client.query(
      `UPDATE agentes_operativo SET grupo_id = NULL, estado = 'REPLEGADO', estado_actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
      [agente.id]
    );
    await client.query(
      `UPDATE agentes_grupo_historial
          SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = $2, registrado_por = $3
        WHERE agente_operativo_id = $1 AND fecha_fin IS NULL`,
      [agente.id, String(motivo).slice(0, 100), usuarioId]
    );
    await Evento.registrar(client, {
      operativoId, entidad: 'AGENTE', grupoId, agenteOperativoId: agente.id, accion: 'retiro',
      estadoAnterior: agente.estado, estadoNuevo: 'REPLEGADO', registradoPor: usuarioId,
      fuente: 'COORDINADOR', motivo,
    });
  });

  const despues = await buscar(operativoId, grupoId);
  return { antes, despues, alertaBinomio: Boolean(despues?.alertaBinomio) };
}

/* ── CU-25 · Disolución ────────────────────────────────────────────────── */

/** Baja lógica (paso 5): sólo desde la base, sólo el coordinador. Ver aplicar(). */
export async function disolver(operativoId, grupoId, usuarioId) {
  return transicionar(operativoId, grupoId, 'disolver', { fuente: 'COORDINADOR' }, usuarioId);
}

/* ── CU-22 · Asignación y Armado Automático de Grupos ──────────────────── */

/**
 * Arma N grupos de RASTRILLAJE EN_FORMACION de una vez con los agentes sin
 * grupo y DISPONIBLES. Los recursos especiales no entran (decisión del 26/09):
 * cuántos drones o canes mandar, y adónde, lo decide el coordinador a mano.
 * Los conductores tampoco (28/09): no rastrillan, esperan al grupo en la camioneta;
 * se suman a mano cuando el Coordinador arma la salida.
 *
 *  · N lo limita el tamaño pedido, los líderes DUAR que haya (paso 5.1) y el
 *    binomio: como todos los del reparto rastrillan, N ≤ disponibles / 2.
 *  · El tamaño es un MÁXIMO e incluye al Líder. Lo que no entra queda sin
 *    asignar y se informa.
 *  · Reparto en ronda: con N ≤ disponibles / 2, cada grupo recibe al menos uno
 *    además de su Líder (binomio).
 *  · Sólo crea grupos nuevos: los existentes no se tocan.
 */
export async function armadoAutomatico(operativoId, { tamano }, usuarioId) {
  return withTransaction(async (client) => {
    const { rows: pool } = await client.query(
      `SELECT ao.id,
              u.nombre, u.apellido, COALESCE(i.es_duar, false) AS "esDuar"
         FROM agentes_operativo ao
         JOIN usuarios u ON u.id = ao.usuario_id
         LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
         LEFT JOIN cat_especialidades ce ON ce.id = ao.especialidad_id
        WHERE ao.operativo_id = $1 AND ao.fecha_egreso IS NULL
          AND ao.grupo_id IS NULL AND ao.estado = 'DISPONIBLE'
          AND NOT COALESCE(ce.es_recurso_critico, false)
          AND NOT ao.es_conductor
        ORDER BY ao.fecha_ingreso, u.apellido
        FOR UPDATE OF ao`,
      [operativoId]
    );

    const candidatosLider = pool.filter(a => a.esDuar);
    if (candidatosLider.length === 0) {
      throw new ReglaError(409, 'sin_lideres_duar',
        'Imposible armar grupos: no hay agentes del DUAR disponibles para liderar un grupo de rastrillaje.');
    }
    if (pool.length < 2) {
      throw new ReglaError(409, 'personal_insuficiente',
        'Hacen falta al menos dos agentes de rastrillaje disponibles sin grupo: un grupo no puede salir con una sola persona.');
    }
    const porTamano = Math.ceil(pool.length / tamano);
    const n = Math.min(porTamano, candidatosLider.length, Math.floor(pool.length / 2));

    const lideres = candidatosLider.slice(0, n);
    const idsLideres = new Set(lideres.map(l => l.id));
    const grupos = lideres.map(l => ({ lider: l, miembros: [l] }));
    const lleno = g => g.miembros.length >= tamano;

    // En ronda respetando el máximo: el primer pase ya les da a todos su binomio.
    const sinAsignar = [];
    let i = 0;
    for (const a of pool.filter(x => !idsLideres.has(x.id))) {
      let ubicado = false;
      for (let intentos = 0; intentos < grupos.length; intentos++) {
        const g = grupos[(i + intentos) % grupos.length];
        if (!lleno(g)) {
          g.miembros.push(a);
          i = (i + intentos + 1) % grupos.length;
          ubicado = true;
          break;
        }
      }
      if (!ubicado) sinAsignar.push(a);
    }

    const { rows: existentes } = await client.query(
      `SELECT lower(btrim(nombre)) AS nombre, color FROM grupos WHERE operativo_id = $1 AND eliminado_en IS NULL`,
      [operativoId]
    );
    const nombresUsados = new Set(existentes.map(e => e.nombre));
    const coloresUsados = new Set(existentes.map(e => e.color));
    const nombres = [];
    for (const f of FONETICO) {
      if (nombres.length === n) break;
      if (!nombresUsados.has(`grupo ${f}`.toLowerCase())) nombres.push(`Grupo ${f}`);
    }
    for (let k = 1; nombres.length < n; k++) {
      if (!nombresUsados.has(`grupo ${k}`)) nombres.push(`Grupo ${k}`);
    }
    const coloresLibres = PALETA.filter(c => !coloresUsados.has(c));

    const creados = [];
    for (let k = 0; k < n; k++) {
      const g = grupos[k];
      const color = coloresLibres[k] ?? PALETA[(existentes.length + k) % PALETA.length];
      const { rows } = await client.query(
        `INSERT INTO grupos (operativo_id, nombre, lider_id, estado, color, clase)
         VALUES ($1, $2, $3, 'EN_FORMACION', $4, 'RASTRILLAJE') RETURNING id`,
        [operativoId, nombres[k], g.lider.id, color]
      );
      const grupoId = rows[0].id;
      const evGrupo = await Evento.registrar(client, {
        operativoId, entidad: 'GRUPO', grupoId, accion: 'crear', estadoNuevo: 'EN_FORMACION',
        registradoPor: usuarioId, fuente: 'COORDINADOR', motivo: 'Armado automático',
      });
      // Paso 7: actualización por lotes.
      await client.query(
        `UPDATE agentes_operativo SET grupo_id = $1, estado = 'AGRUPADO', estado_actualizado_en = CURRENT_TIMESTAMP
          WHERE id = ANY($2::uuid[])`,
        [grupoId, g.miembros.map(m => m.id)]
      );
      for (const m of g.miembros) {
        await Evento.registrar(client, {
          operativoId, entidad: 'AGENTE', grupoId, agenteOperativoId: m.id, accion: 'agrupar',
          estadoAnterior: 'DISPONIBLE', estadoNuevo: 'AGRUPADO', registradoPor: usuarioId,
          fuente: 'COORDINADOR', eventoOrigenId: evGrupo,
          motivo: m.id === g.lider.id ? 'Líder del grupo (armado automático)' : 'Armado automático',
        });
      }
      creados.push({ id: grupoId, nombre: nombres[k], integrantes: g.miembros.length });
    }

    return {
      creados,
      asignados: pool.length - sinAsignar.length,
      sinAsignar: sinAsignar.map(a => ({ id: a.id, nombre: a.nombre, apellido: a.apellido })),
      limitadoPorLideres: porTamano > candidatosLider.length,
    };
  });
}

/* ── Otros módulos ─────────────────────────────────────────────────────── */

/**
 * Regla de Ubicuidad + grupos (lo usa agenteOperativo.model.js#darDeAlta en la
 * misma transacción). Quien se va a otro operativo:
 *  · estando en el terreno con su grupo → no puede: primero tiene que volver y
 *    ser retirado (409 grupo_en_terreno);
 *  · estando en la base → sale del grupo. Si el grupo ya estaba confirmado, su
 *    composición cambió: se reabre. Si era el Líder, el grupo queda sin Líder.
 *
 * Con `porEliminacion` es lo mismo pero porque su cuenta se elimina (CU-07,
 * 05/10): cambian sólo los textos que quedan en la línea de tiempo.
 */
export async function liberarPorCambioDeOperativo(client, agenteOperativoId, usuarioId, destinoTitulo, { porEliminacion = false } = {}) {
  const { rows } = await client.query(
    `SELECT id, operativo_id AS "operativoId", grupo_id AS "grupoId", estado::text AS estado
       FROM agentes_operativo WHERE id = $1 FOR UPDATE`,
    [agenteOperativoId]
  );
  const agente = rows[0];
  if (!agente?.grupoId) return;

  const grupo = await bloquearGrupo(client, agente.operativoId, agente.grupoId);
  if (Est.EN_OPERACION.includes(grupo.estado)) {
    throw new ReglaError(409, 'grupo_en_terreno',
      `Está en el terreno con el ${grupo.nombre} (${Est.ETIQUETA_GRUPO[grupo.estado]}). Tiene que volver y ser retirado del grupo antes de ${porEliminacion ? 'eliminar su cuenta' : 'pasar a otro operativo'}.`);
  }

  await client.query(
    `UPDATE agentes_operativo SET grupo_id = NULL, estado = 'DISPONIBLE', estado_actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
    [agente.id]
  );
  await Evento.registrar(client, {
    operativoId: agente.operativoId, entidad: 'AGENTE', grupoId: grupo.id, agenteOperativoId: agente.id,
    accion: porEliminacion ? 'desagrupar' : 'cambio_operativo', estadoAnterior: agente.estado, estadoNuevo: 'DISPONIBLE',
    registradoPor: usuarioId, fuente: 'SISTEMA',
    motivo: porEliminacion ? 'Su cuenta fue eliminada del sistema' : `Pasó al operativo ${destinoTitulo}`,
  });

  if (grupo.liderId === agente.id) {
    await client.query(`UPDATE grupos SET lider_id = NULL, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`, [grupo.id]);
    await Evento.registrar(client, {
      operativoId: grupo.operativoId, entidad: 'GRUPO', grupoId: grupo.id, accion: 'cambio_lider',
      estadoAnterior: grupo.estado, estadoNuevo: grupo.estado, registradoPor: usuarioId,
      fuente: 'SISTEMA',
      motivo: porEliminacion ? 'La cuenta del Líder fue eliminada: hay que designar otro' : 'El Líder dejó el operativo: hay que designar otro',
    });
  }

  if (grupo.estado !== 'EN_FORMACION') {
    await aplicar(client, grupo, 'reabrir', 'EN_FORMACION', {
      t: new Date(), confiable: true, usuarioId,
      base: {
        operativoId: grupo.operativoId, entidad: 'GRUPO', grupoId: grupo.id, accion: 'reabrir',
        registradoPor: usuarioId, fuente: 'SISTEMA',
        motivo: 'Un integrante dejó el operativo: hay que volver a confirmar el grupo',
      },
    });
  }
}

/**
 * Tras un cambio de conductor (CU-17) de alguien que está en un grupo, su
 * estado se recalcula con la Regla 1: dejar de ser conductor con el grupo
 * rastrillando lo pone a rastrillar, y al revés.
 */
export async function recalcularIntegrante(agenteOperativoId, usuarioId) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT g.id, g.operativo_id AS "operativoId", g.estado::text AS estado
         FROM agentes_operativo ao JOIN grupos g ON g.id = ao.grupo_id
        WHERE ao.id = $1 AND ao.fecha_egreso IS NULL AND g.eliminado_en IS NULL
        FOR UPDATE OF g`,
      [agenteOperativoId]
    );
    if (!rows[0]) return;
    await cascada(client, rows[0], rows[0].estado, {
      ocurridoEn: new Date(), eventoOrigenId: null, usuarioId, soloAgenteId: agenteOperativoId,
    });
  });
}

/** El grupo del agente en su operativo vigente, o null. `soyLider` habilita los controles del Líder. */
export async function grupoDelAgente(alta) {
  if (!alta?.grupoId) return null;
  const grupo = await buscar(alta.operativoId, alta.grupoId);
  if (!grupo) return null;
  return { ...grupo, soyLider: grupo.liderId === alta.id };
}

/** Estado y Líder del grupo de un agente (para las guardas del portal y del CU-17). */
export async function estadoDeGrupo(grupoId) {
  if (!grupoId) return null;
  const { rows } = await query(
    `SELECT nombre, estado::text AS estado, clase::text AS clase, lider_id AS "liderId" FROM grupos WHERE id = $1`,
    [grupoId]
  );
  return rows[0] ?? null;
}
