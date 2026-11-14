/**
 * CU-16 · Puesto de comando (01/10, migración 016; rehecho el 02/11, migración 030).
 *
 *  · Turno: el ingreso y el egreso de los coordinadores, por puesto («Coordinador» u
 *    «Operador Mesa Coordinadora»).
 *  · Jefe de Operativo: rol nuevo, uno por operativo, omnipresente (sin ingreso ni egreso),
 *    puede serlo de varios; reemplaza al «coordinador a cargo».
 *  · Rol «jefe de operativo»: consulta todo, saca informes y asigna al Jefe; nada más.
 *
 * Reglas que necesitan un segundo operativo o finalizar uno se prueban sobre el modelo, en
 * una transacción que se DESCARTA. El resto, contra la API, en el operativo de pruebas, con
 * los coordinadores hotel e india y los jefes de operativo juliet y kilo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, TITULO_OPERATIVO } from '../ayudantes/entorno.js';
import { pool } from '../../src/config/db.js';
import * as Mando from '../../src/models/mando.model.js';

let ctx;
let hotel, india, juliet, kilo;
let adminId;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const como = (clave, m, ruta, body) => ctx.api(m, ruta, body, ctx.usuarios[clave].token);
const ingreso = (clave, body = {}) => como(clave, 'POST', `/operativos/${ctx.op}/mando/ingreso`, body);
const egreso = (clave, body = {}) => como(clave, 'POST', `/operativos/${ctx.op}/mando/retiro`, body);
const jefe = (clave, usuarioId) => como(clave, 'PUT', `/operativos/${ctx.op}/mando/jefe`, { usuarioId });
const comoAdmin = (m, ruta, body) => ctx.api(m, ruta, body);

/** Corre `fn` con una transacción que se descarta siempre: no deja nada en la base. */
async function enTransaccionDescartada(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

/** Un operativo que sólo existe dentro de la transacción (se descarta con ella). */
async function operativoTemporal(client) {
  const { rows } = await client.query(
    `INSERT INTO operativos (titulo, localidad, fiscal_instruccion, punto_cero, fecha_hora_inicio, coordinador_id, estado)
     VALUES ('Operativo temporal de prueba', 'Córdoba', 'Pruebas',
             extensions.ST_SetSRID(extensions.ST_MakePoint(-64.18, -31.42), 4326), now(), $1, 'INICIADO')
     RETURNING id`, [adminId]);
  return rows[0].id;
}

describe('Puesto de comando: turno y Jefe de Operativo (CU-16)', () => {
  before(async () => {
    ctx = await preparar();
    hotel = ctx.usuarios.hotel.uid;
    india = ctx.usuarios.india.uid;
    juliet = ctx.usuarios.juliet.uid;
    kilo = ctx.usuarios.kilo.uid;
    adminId = (await ctx.api('GET', '/auth/me')).json.usuario.id;
  });
  after(terminar);

  /* ── Reglas sobre el modelo, en una transacción descartada ── */

  test('CU-16 · un coordinador en el turno de otro operativo no entra sin trasladarse; al trasladarse egresa del otro', async () => {
    await enTransaccionDescartada(async client => {
      const otro = await operativoTemporal(client);
      await Mando.ingresarCon(client, { operativoId: otro, usuarioId: hotel, autorId: hotel, puesto: 'COORDINADOR' });
      await assert.rejects(
        Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel, puesto: 'OPERADOR_MESA' }),
        e => e.motivo === 'presente_en_otro_operativo' && e.datos?.operativoActual?.id === otro);
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel, puesto: 'OPERADOR_MESA', trasladar: true });
      const { rows } = await client.query(
        `SELECT operativo_id, egreso_en, motivo_egreso, puesto FROM presencias_mando WHERE usuario_id = $1 ORDER BY ingreso_en`, [hotel]);
      const enOtro = rows.find(r => r.operativo_id === otro);
      assert.ok(enOtro.egreso_en, 'el turno en el otro operativo se cierra');
      assert.equal(enOtro.motivo_egreso, `Se presentó en el operativo "${TITULO_OPERATIVO}"`);
      assert.equal(rows.find(r => r.operativo_id === ctx.op && !r.egreso_en).puesto, 'OPERADOR_MESA');
    });
  });

  test('CU-16 · la base impide dos turnos abiertos del mismo coordinador y un puesto inventado', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, autorId: india, puesto: 'COORDINADOR' });
      await client.query('SAVEPOINT duplicado');
      await assert.rejects(
        client.query(`INSERT INTO presencias_mando (operativo_id, usuario_id, ingreso_por) VALUES ($1, $2, $2)`, [ctx.op, india]),
        e => e.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT duplicado');
      await assert.rejects(
        client.query(`UPDATE presencias_mando SET puesto = 'CAFETERO' WHERE usuario_id = $1 AND egreso_en IS NULL`, [india]),
        e => e.code === '23514');
    });
  });

  test('02/11 · el Jefe es omnipresente: puede ser Jefe de dos operativos a la vez; uno solo por operativo', async () => {
    await enTransaccionDescartada(async client => {
      const otro = await operativoTemporal(client);
      await Mando.asignarJefeCon(client, { operativoId: otro, usuarioId: juliet, autorId: adminId });
      await Mando.asignarJefeCon(client, { operativoId: ctx.op, usuarioId: juliet, autorId: adminId });
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM jefes_operativo WHERE usuario_id = $1 AND hasta IS NULL`, [juliet]);
      assert.equal(rows[0].n, 2);
      await client.query('SAVEPOINT doble');
      await assert.rejects(
        client.query(`INSERT INTO jefes_operativo (operativo_id, usuario_id, asignado_por) VALUES ($1, $2, $2)`, [otro, kilo]),
        e => e.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT doble');
    });
  });

  test('CU-10 · al finalizar el operativo se cierran el turno y el período del Jefe', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel, puesto: 'COORDINADOR' });
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, autorId: india, puesto: 'OPERADOR_MESA' });
      await Mando.asignarJefeCon(client, { operativoId: ctx.op, usuarioId: juliet, autorId: adminId });
      await Mando.cerrarTodoCon(client, ctx.op, adminId, 'Operativo finalizado');
      const { rows } = await client.query(
        `SELECT (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND egreso_en IS NULL) AS turno,
                (SELECT count(*)::int FROM jefes_operativo  WHERE operativo_id = $1 AND hasta IS NULL)     AS jefe,
                (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND motivo_egreso = 'Operativo finalizado') AS cerradas`,
        [ctx.op]);
      assert.deepEqual(rows[0], { turno: 0, jefe: 0, cerradas: 2 });
    });
  });

  /* ── Turno, contra la API ── */

  test('CU-16 · un administrador tiene que elegir qué coordinador ingresa, y el puesto es obligatorio → 400', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { puesto: 'COORDINADOR' }), 400, 'usuario_requerido');
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: hotel }), 400, 'puesto_invalido');
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: hotel, puesto: 'JEFE' }), 400, 'puesto_invalido');
  });

  test('CU-16 · en el turno sólo se registra a usuarios con rol coordinador (no agentes ni jefes) → 409', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: ctx.usuarios.alfa.uid, puesto: 'COORDINADOR' }), 409, 'no_es_coordinador');
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: juliet, puesto: 'OPERADOR_MESA' }), 409, 'no_es_coordinador');
  });

  test('CU-16 · un coordinador ingresa como Coordinador y registra a otro como Operador Mesa Coordinadora', async () => {
    motivo(await ingreso('hotel', { puesto: 'COORDINADOR' }), 201);
    const r = await ingreso('hotel', { usuarioId: india, puesto: 'OPERADOR_MESA' });
    motivo(r, 201);
    const m = r.json.mando;
    assert.deepEqual(m.presentes.map(p => [p.usuarioId, p.puesto]), [[hotel, 'COORDINADOR'], [india, 'OPERADOR_MESA']]);
    assert.equal(m.presentes.find(p => p.usuarioId === india).ingresoPor, hotel);
    assert.equal(m.jefe, null, 'ingresar al turno no lo hace Jefe ni «a cargo»');
  });

  test('CU-16 · ingresar dos veces → 409 ya_presente', async () => {
    motivo(await ingreso('hotel', { puesto: 'OPERADOR_MESA' }), 409, 'ya_presente');
  });

  test('CU-16 · registrar un egreso exige motivo, el de otro y también el propio (14/11)', async () => {
    motivo(await egreso('hotel', { usuarioId: india }), 400, 'motivo_requerido');
    motivo(await egreso('hotel', { usuarioId: india, motivo: 'Finalización de turno' }), 200);
    motivo(await egreso('hotel'), 400, 'motivo_requerido');
    motivo(await egreso('hotel', { motivo: 'Finalización de turno' }), 200);
    const m = await ctx.mando();
    assert.equal(m.presentes.length, 0);
    assert.equal(m.historialPresencias.find(p => p.usuarioId === hotel).motivo, 'Finalización de turno');
  });

  /* ── Jefe de Operativo, contra la API ── */

  test('02/11 · como Jefe sólo puede quedar alguien con rol «jefe de operativo» → 409 no_es_jefe', async () => {
    motivo(await jefe('hotel', india), 409, 'no_es_jefe');
    motivo(await jefe('hotel', 'no-es-un-id'), 400, 'jefe_invalido');
  });

  test('02/11 · un jefe de operativo se asigna a sí mismo; el listado y el operativo lo muestran', async () => {
    const r = await jefe('juliet', juliet);
    motivo(r, 200);
    assert.equal(r.json.mando.jefe.usuarioId, juliet);
    motivo(await jefe('juliet', juliet), 409, 'ya_es_jefe');
    const op = (await comoAdmin('GET', '/operativos')).json.operativos.find(o => o.id === ctx.op);
    assert.equal(op.jefeId, juliet);
    assert.equal((await comoAdmin('GET', `/operativos/${ctx.op}`)).json.operativo.jefeNombre, 'Juliet');
  });

  test('02/11 · otro jefe de operativo o un coordinador lo cambia; el período anterior se cierra en el mismo instante', async () => {
    motivo(await jefe('kilo', kilo), 200);
    const m = await ctx.mando();
    assert.equal(m.jefe.usuarioId, kilo);
    const [actual, anterior] = m.historialJefes;
    assert.equal(anterior.usuarioId, juliet);
    assert.equal(anterior.motivo, 'Lo reemplaza Kilo Prueba Automatica');
    assert.equal(new Date(anterior.hasta).getTime(), new Date(actual.desde).getTime());
    motivo(await jefe('hotel', juliet), 200);
  });

  test('02/11 · «No asignado» lo quita; sin Jefe, quitarlo de nuevo → 409 sin_jefe', async () => {
    motivo(await jefe('india', null), 200);
    assert.equal((await ctx.mando()).jefe, null);
    motivo(await jefe('india', null), 409, 'sin_jefe');
  });

  test('02/11 · «Modificar operativo» asigna, cambia y quita al Jefe (sólo usuarios con ese rol)', async () => {
    motivo(await comoAdmin('PUT', `/operativos/${ctx.op}`, { jefeId: hotel }), 409, 'no_es_jefe');
    let r = await comoAdmin('PUT', `/operativos/${ctx.op}`, { jefeId: juliet });
    motivo(r, 200);
    assert.equal(r.json.operativo.jefeId, juliet);
    r = await comoAdmin('PUT', `/operativos/${ctx.op}`, { jefeId: null });
    motivo(r, 200);
    assert.equal(r.json.operativo.jefeId, null);
  });

  test('02/11 · al crear un operativo el Jefe es opcional', async () => {
    const base = { localidad: 'Córdoba', puntoCeroLat: -31.5, puntoCeroLng: -64.5 };
    const c = await comoAdmin('POST', '/operativos', { ...base, titulo: `PRUEBAS AUTOMÁTICAS - Jefe ${Date.now()}`, jefeId: kilo });
    motivo(c, 201);
    assert.equal(c.json.operativo.jefeId, kilo);
    const s = await comoAdmin('POST', '/operativos', { ...base, titulo: `PRUEBAS AUTOMÁTICAS - Sin Jefe ${Date.now()}` });
    motivo(s, 201);
    assert.equal(s.json.operativo.jefeId, null);
  });

  /* ── El rol «jefe de operativo»: consulta, informes y Jefe; nada más ── */

  test('02/11 · el jefe de operativo consulta todo: operativos, personal, grupos, mapa, objetivo, usuarios y puesto de comando', async () => {
    for (const ruta of ['/operativos', `/operativos/${ctx.op}`, `/operativos/${ctx.op}/personal`, `/operativos/${ctx.op}/grupos`,
      `/operativos/${ctx.op}/poligonos`, `/operativos/${ctx.op}/marcadores`, `/operativos/${ctx.op}/punto-cero`,
      `/operativos/${ctx.op}/mando`, `/operativos/${ctx.op}/informes`, '/usuarios']) {
      const r = await como('juliet', 'GET', ruta);
      assert.ok(r.status === 200 || r.status === 404, `${ruta} → ${r.status}`);   // objetivo puede no existir
    }
  });

  test('02/11 · el jefe de operativo no modifica nada: crear, editar, turno, agentes, grupos, mapa, usuarios y QR → 403', async () => {
    const pedidos = [
      ['POST', '/operativos', { titulo: 'X', localidad: 'Córdoba', puntoCeroLat: -31, puntoCeroLng: -64 }],
      ['PUT', `/operativos/${ctx.op}`, { descripcion: 'x' }],
      ['POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: hotel, puesto: 'COORDINADOR' }],
      ['POST', `/operativos/${ctx.op}/agentes`, { usuarioId: ctx.usuarios.alfa.uid }],
      ['POST', `/operativos/${ctx.op}/grupos`, { nombre: 'X', clase: 'RASTRILLAJE' }],
      ['POST', `/operativos/${ctx.op}/marcadores`, { clase: 'POI', nombre: 'X', lat: -31.4, lng: -64.8 }],
      ['PUT', `/operativos/${ctx.op}/punto-cero`, { lat: -31.4, lng: -64.8, motivo: 'x' }],
      ['POST', '/usuarios', { nombre: 'X' }],
      ['GET', `/operativos/${ctx.op}/qr`],
    ];
    for (const [m, ruta, body] of pedidos) motivo(await como('juliet', m, ruta, body), 403);
  });

  test('02/11 · el jefe de operativo saca informes (parcial)', async () => {
    const r = await como('juliet', 'POST', `/operativos/${ctx.op}/informes`, { tipo: 'PARCIAL' });
    assert.ok([200, 201].includes(r.status), JSON.stringify(r.json));
  });

  test('02/11 · cambiarle el rol a un Jefe asignado avisa; confirmado, deja de ser Jefe', async () => {
    motivo(await jefe('juliet', juliet), 200);
    const aviso = await comoAdmin('PUT', `/usuarios/${juliet}`, { rol: 'coordinador' });
    motivo(aviso, 409, 'cambio_rol_en_operativo');
    assert.match(aviso.json.error, /como Jefe de Operativo\. Si le cambiás el rol, deja de ser el Jefe/);
    motivo(await comoAdmin('PUT', `/usuarios/${juliet}`, { rol: 'coordinador', confirmarCambioRol: true }), 200);
    const m = await ctx.mando();
    assert.equal(m.jefe, null);
    assert.equal(m.historialJefes[0].motivo, 'Cambió de rol a coordinador');
    motivo(await comoAdmin('PUT', `/usuarios/${juliet}`, { rol: 'jefe de operativo' }), 200);
  });

  /* ── Coordinadores y agentes (27/10) ── */

  test('27/10 · un coordinador no se da de alta como agente → 409 no_es_agente (primero hay que cambiarle el rol)', async () => {
    const r = await comoAdmin('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: india });
    motivo(r, 409, 'no_es_agente');
    assert.match(r.json.error, /pedile a un coordinador que le cambie el rol a agente/);
  });

  test('27/10 · si a un coordinador en el turno le cambian el rol a agente (confirmando), egresa del turno', async () => {
    motivo(await ingreso('india', { puesto: 'COORDINADOR' }), 201);
    const aviso = await comoAdmin('PUT', `/usuarios/${india}`, { rol: 'agente' });
    motivo(aviso, 409, 'cambio_rol_en_operativo');
    assert.match(aviso.json.error, /se registra su egreso del turno del puesto de comando/);
    motivo(await comoAdmin('PUT', `/usuarios/${india}`, { rol: 'agente', confirmarCambioRol: true }), 200);
    const m = await ctx.mando();
    assert.equal(m.presentes.length, 0);
    assert.equal(m.historialPresencias.find(p => p.usuarioId === india).motivo, 'Cambió de rol a agente');
    // Ya como agente, recién ahora se da de alta; y como agente no entra al turno.
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: india }), 201);
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: india, puesto: 'COORDINADOR' }), 409, 'no_es_coordinador');
  });

  test('Línea de tiempo · lo que registra un coordinador en el turno queda "en el puesto"; lo de uno ausente, "a distancia"', async () => {
    motivo(await ingreso('hotel', { puesto: 'COORDINADOR' }), 201);
    const g = await como('hotel', 'POST', `/operativos/${ctx.op}/grupos`,
      { nombre: 'Mando', liderId: ctx.agentes.alfa.id, clase: 'RASTRILLAJE' });
    motivo(g, 201);
    motivo(await egreso('hotel', { motivo: 'Finalización de turno' }), 200);
    motivo(await como('hotel', 'POST', `/operativos/${ctx.op}/grupos/mover`,
      { agenteOperativoId: ctx.agentes.bravo.id, destinoGrupoId: g.json.grupo.id }), 200);
    const delGrupo = (await ctx.api('GET', `/operativos/${ctx.op}/grupos/${g.json.grupo.id}/linea-tiempo`)).json.eventos;
    assert.equal(delGrupo.find(e => e.accion === 'crear').enPuesto, true);
    const deBravo = (await ctx.api('GET', `/operativos/${ctx.op}/agentes/${ctx.agentes.bravo.id}/linea-tiempo`)).json.eventos;
    assert.equal(deBravo.filter(e => e.accion === 'agrupar').at(-1).enPuesto, false);
    motivo(await ctx.disolver(g.json.grupo.id), 204);
  });

  test('CU-16 · cada movimiento del puesto de comando queda en la auditoría', async () => {
    const { rows } = await ctx.query(
      `SELECT entidad_afectada AS entidad, valores_nuevos->>'accion' AS accion FROM logs_auditoria
        WHERE entidad_afectada IN ('presencias_mando', 'jefes_operativo') AND registro_id = $1
          AND creado_en > now() - interval '10 minutes'`, [ctx.op]);
    const acciones = new Set(rows.map(r => r.accion));
    for (const a of ['ingreso', 'retiro', 'jefe_asignado', 'jefe_quitado']) assert.ok(acciones.has(a), `falta ${a}`);
  });
});
