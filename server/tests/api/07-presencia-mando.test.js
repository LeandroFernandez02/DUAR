/**
 * Puesto de comando: presencia de mando (01/10, migración 016).
 *
 * Dos partes:
 *  · Reglas que necesitan un segundo operativo o finalizar uno (ubicuidad del
 *    mando, cierre al finalizar): se prueban sobre el modelo, dentro de una
 *    transacción que se DESCARTA al final, así no queda nada en la base.
 *  · El resto, contra la API real, en el operativo de pruebas, con los dos
 *    coordinadores de prueba (hotel e india).
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, TITULO_OPERATIVO } from '../ayudantes/entorno.js';
import { pool } from '../../src/config/db.js';
import * as Mando from '../../src/models/mando.model.js';

let ctx;
let hotel;
let india;
let adminId;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const como = (clave, m, ruta, body) => ctx.api(m, ruta, body, ctx.usuarios[clave].token);
const ingreso = (clave, body = {}) => como(clave, 'POST', `/operativos/${ctx.op}/mando/ingreso`, body);
const retiro = (clave, body = {}) => como(clave, 'POST', `/operativos/${ctx.op}/mando/retiro`, body);
const aCargo = (clave, usuarioId) => como(clave, 'POST', `/operativos/${ctx.op}/mando/a-cargo`, { usuarioId });
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
             extensions.ST_SetSRID(extensions.ST_MakePoint(-64.18, -31.42), 4326), now(), $1, 'ACTIVO')
     RETURNING id`, [adminId]);
  return rows[0].id;
}

describe('Puesto de comando: presencia de mando (CU nuevo del Módulo 3)', () => {
  before(async () => {
    ctx = await preparar();
    hotel = ctx.usuarios.hotel.uid;
    india = ctx.usuarios.india.uid;
    adminId = (await ctx.api('GET', '/auth/me')).json.usuario.id;
  });
  after(terminar);

  /* ── Reglas sobre el modelo, en una transacción descartada ── */

  test('Mando · un coordinador presente en otro operativo no entra sin trasladarse; al trasladarse deja el otro', async () => {
    await enTransaccionDescartada(async client => {
      const otro = await operativoTemporal(client);
      await Mando.ingresarCon(client, { operativoId: otro, usuarioId: hotel, autorId: hotel });
      await assert.rejects(
        Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel }),
        e => e.motivo === 'presente_en_otro_operativo' && e.datos?.operativoActual?.id === otro);
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel, trasladar: true });
      const { rows } = await client.query(
        `SELECT operativo_id, egreso_en, motivo_egreso FROM presencias_mando WHERE usuario_id = $1 ORDER BY ingreso_en`, [hotel]);
      const enOtro = rows.find(r => r.operativo_id === otro);
      assert.ok(enOtro.egreso_en, 'la presencia en el otro operativo se cierra');
      assert.equal(enOtro.motivo_egreso, `Se presentó en el operativo "${TITULO_OPERATIVO}"`);
      assert.ok(rows.some(r => r.operativo_id === ctx.op && !r.egreso_en));
      const { rows: mando } = await client.query(
        `SELECT hasta FROM mando_operativo WHERE operativo_id = $1 AND usuario_id = $2`, [otro, hotel]);
      assert.ok(mando[0]?.hasta, 'el otro operativo queda sin coordinador a cargo');
    });
  });

  test('Mando · la base impide que un coordinador tenga dos presencias abiertas a la vez', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, autorId: india });
      await client.query('SAVEPOINT duplicado');
      await assert.rejects(
        client.query(`INSERT INTO presencias_mando (operativo_id, usuario_id, ingreso_por) VALUES ($1, $2, $2)`, [ctx.op, india]),
        e => e.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT duplicado');
    });
  });

  test('CU-10 · al finalizar el operativo se cierran todas las presencias y el mando', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, autorId: hotel });
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, autorId: india });
      await Mando.cerrarTodoCon(client, ctx.op, adminId, 'Operativo finalizado');
      const { rows } = await client.query(
        `SELECT (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND egreso_en IS NULL) AS presentes,
                (SELECT count(*)::int FROM mando_operativo  WHERE operativo_id = $1 AND hasta IS NULL)     AS a_cargo,
                (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND motivo_egreso = 'Operativo finalizado') AS cerradas`,
        [ctx.op]);
      assert.deepEqual(rows[0], { presentes: 0, a_cargo: 0, cerradas: 2 });
    });
  });

  /* ── Contra la API ── */

  test('Mando · un administrador tiene que elegir qué coordinador ingresa → 400', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, {}), 400, 'usuario_requerido');
  });

  test('Mando · en el puesto de comando sólo se registra a coordinadores → 409', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: ctx.usuarios.alfa.uid }), 409, 'no_es_coordinador');
  });

  test('Mando · el primer coordinador que ingresa queda a cargo', async () => {
    const r = await ingreso('hotel');
    motivo(r, 201);
    assert.equal(r.json.quedoACargo, true);
    const m = await ctx.mando();
    assert.equal(m.aCargo.usuarioId, hotel);
    assert.deepEqual(m.presentes.map(p => p.usuarioId), [hotel]);
  });

  test('CU-11 · el listado de operativos muestra quién está a cargo', async () => {
    const op = (await comoAdmin('GET', '/operativos')).json.operativos.find(o => o.id === ctx.op);
    assert.equal(op.mandoNombre, 'Hotel');
    assert.equal(op.mandoHasta, null);
  });

  test('Mando · ingresar dos veces → 409 ya_presente', async () => {
    motivo(await ingreso('hotel'), 409, 'ya_presente');
  });

  test('Mando · un coordinador registra el ingreso de otro: queda presente, no a cargo, y consta quién lo registró', async () => {
    const r = await ingreso('hotel', { usuarioId: india });
    motivo(r, 201);
    assert.equal(r.json.quedoACargo, false);
    const p = (await ctx.mando()).presentes.find(x => x.usuarioId === india);
    assert.equal(p.aCargo, false);
    assert.equal(p.ingresoPor, hotel);
  });

  test('Mando · sólo quien está a cargo pasa el mando → 403 solo_a_cargo', async () => {
    motivo(await aCargo('india', india), 403, 'solo_a_cargo');
  });

  test('Mando · traspaso: el que está a cargo le pasa el mando a otro presente, sin huecos en la historia', async () => {
    motivo(await aCargo('hotel', india), 200);
    const m = await ctx.mando();
    assert.equal(m.aCargo.usuarioId, india);
    const [actual, anterior] = m.historialMando;
    assert.equal(anterior.usuarioId, hotel);
    assert.equal(new Date(anterior.hasta).getTime(), new Date(actual.desde).getTime());
  });

  test('Mando · registrar el retiro de otro coordinador exige motivo → 400', async () => {
    motivo(await retiro('hotel', { usuarioId: india }), 400, 'motivo_requerido');
  });

  test('Mando · si se retira el que está a cargo y quedan otros, tiene que elegir sucesor → 409', async () => {
    const r = await retiro('india');
    motivo(r, 409, 'sucesion_requerida');
    assert.deepEqual(r.json.presentes.map(p => p.usuarioId), [hotel]);
  });

  test('Mando · con sucesor: se retira y el mando pasa en el mismo instante', async () => {
    motivo(await retiro('india', { sucesorId: hotel }), 200);
    const m = await ctx.mando();
    assert.equal(m.aCargo.usuarioId, hotel);
    assert.deepEqual(m.presentes.map(p => p.usuarioId), [hotel]);
    const [actual, anterior] = m.historialMando;
    assert.equal(anterior.usuarioId, india);
    assert.equal(new Date(anterior.hasta).getTime(), new Date(actual.desde).getTime());
  });

  test('Mando · un administrador registra presencias y pasa el mando aunque no esté a cargo', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: india }), 201);
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/a-cargo`, { usuarioId: india }), 200);
    assert.equal((await ctx.mando()).aCargo.usuarioId, india);
  });

  test('Línea de tiempo · lo que registra un coordinador presente queda "en el puesto"; lo de uno ausente, "a distancia"', async () => {
    motivo(await retiro('hotel'), 200);                                        // hotel se va; india queda a cargo
    const g = await como('india', 'POST', `/operativos/${ctx.op}/grupos`,
      { nombre: 'Mando', liderId: ctx.agentes.alfa.id, clase: 'RASTRILLAJE' });
    motivo(g, 201);
    motivo(await como('hotel', 'POST', `/operativos/${ctx.op}/grupos/mover`,
      { agenteOperativoId: ctx.agentes.bravo.id, destinoGrupoId: g.json.grupo.id }), 200);
    const delGrupo = (await ctx.api('GET', `/operativos/${ctx.op}/grupos/${g.json.grupo.id}/linea-tiempo`)).json.eventos;
    assert.equal(delGrupo.find(e => e.accion === 'crear').enPuesto, true);
    const deBravo = (await ctx.api('GET', `/operativos/${ctx.op}/agentes/${ctx.agentes.bravo.id}/linea-tiempo`)).json.eventos;
    const agrupar = deBravo.filter(e => e.accion === 'agrupar').at(-1);
    assert.equal(agrupar.enPuesto, false);
    motivo(await ctx.disolver(g.json.grupo.id), 204);
  });

  test('Mando · si el que está a cargo se registra como agente, deja el puesto y el operativo queda sin coordinador a cargo', async () => {
    motivo(await ingreso('hotel'), 201);                                      // hotel vuelve, sin quedar a cargo
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: india }), 201);
    const m = await ctx.mando();
    assert.equal(m.aCargo, null);
    assert.deepEqual(m.presentes.map(p => p.usuarioId), [hotel]);
    const cerrada = m.historialPresencias.find(p => p.usuarioId === india);
    assert.match(cerrada.motivo, /^Pasó a rastrillar como agente/);
  });

  test('Mando · quien figura como agente no entra al puesto de comando → 409 es_agente', async () => {
    motivo(await ingreso('india'), 409, 'es_agente');
  });

  test('Mando · sin nadie a cargo, un presente toma el mando', async () => {
    motivo(await aCargo('hotel', hotel), 200);
    assert.equal((await ctx.mando()).aCargo.usuarioId, hotel);
  });

  test('Mando · el último a cargo se retira solo: el operativo queda sin coordinador a cargo', async () => {
    const r = await retiro('hotel');
    motivo(r, 200);
    assert.equal(r.json.quedaSinMando, true);
    const m = await ctx.mando();
    assert.equal(m.aCargo, null);
    assert.equal(m.presentes.length, 0);
  });

  test('CU-11 · sin nadie a cargo, el listado conserva quién estuvo a cargo por última vez', async () => {
    const op = (await comoAdmin('GET', '/operativos')).json.operativos.find(o => o.id === ctx.op);
    assert.equal(op.mandoNombre, 'Hotel');
    assert.ok(op.mandoHasta, 'el último período de mando está cerrado');
  });

  test('Mando · cada movimiento del puesto de comando queda en la auditoría', async () => {
    const { rows } = await ctx.query(
      `SELECT valores_nuevos->>'accion' AS accion FROM logs_auditoria
        WHERE entidad_afectada = 'presencias_mando' AND registro_id = $1
          AND creado_en > now() - interval '10 minutes'`, [ctx.op]);
    const acciones = new Set(rows.map(r => r.accion));
    for (const a of ['ingreso', 'retiro', 'a_cargo']) assert.ok(acciones.has(a), `falta ${a}`);
  });
});
