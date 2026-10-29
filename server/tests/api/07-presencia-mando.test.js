/**
 * CU-15 · Puesto de comando: turnos por puesto (01/10, migración 016; puestos desde el 29/10, migración 029).
 *
 * Puestos: Jefe de operativo (rol jefe_operativo), Coordinador y Encargado (rol
 * coordinador). Ya no hay «coordinador a cargo». Dos partes:
 *  · Reglas que necesitan un segundo operativo o finalizar uno (ubicuidad,
 *    cierre al finalizar): se prueban sobre el modelo, dentro de una
 *    transacción que se DESCARTA al final, así no queda nada en la base.
 *  · El resto, contra la API real, en el operativo de pruebas, con los dos
 *    coordinadores de prueba (hotel e india) y el jefe de operativo (juliett).
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, TITULO_OPERATIVO } from '../ayudantes/entorno.js';
import { pool } from '../../src/config/db.js';
import * as Mando from '../../src/models/mando.model.js';

let ctx;
let hotel;
let india;
let juliett;
let adminId;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const como = (clave, m, ruta, body) => ctx.api(m, ruta, body, ctx.usuarios[clave].token);
const ingreso = (clave, body) => como(clave, 'POST', `/operativos/${ctx.op}/mando/ingreso`, body);
const egreso = (clave, body) => como(clave, 'POST', `/operativos/${ctx.op}/mando/retiro`, body);
const cambiar = (clave, body) => como(clave, 'POST', `/operativos/${ctx.op}/mando/cambiar-puesto`, body);
const comoAdmin = (m, ruta, body) => ctx.api(m, ruta, body);
const FIN_TURNO = { motivo: 'Finalización de turno' };

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

describe('Puesto de comando: turnos por puesto (CU-15)', () => {
  before(async () => {
    ctx = await preparar();
    hotel = ctx.usuarios.hotel.uid;
    india = ctx.usuarios.india.uid;
    juliett = ctx.usuarios.juliett.uid;
    adminId = (await ctx.api('GET', '/auth/me')).json.usuario.id;
  });
  after(terminar);

  /* ── Reglas sobre el modelo, en una transacción descartada ── */

  test('CU-15 · quien está de turno en otro operativo no entra sin trasladarse; al trasladarse deja el otro', async () => {
    await enTransaccionDescartada(async client => {
      const otro = await operativoTemporal(client);
      await Mando.ingresarCon(client, { operativoId: otro, usuarioId: hotel, puesto: 'COORDINADOR', autorId: hotel });
      await assert.rejects(
        Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, puesto: 'ENCARGADO', autorId: hotel }),
        e => e.motivo === 'presente_en_otro_operativo' && e.datos?.operativoActual?.id === otro);
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, puesto: 'ENCARGADO', autorId: hotel, trasladar: true });
      const { rows } = await client.query(
        `SELECT operativo_id, puesto::text AS puesto, egreso_en, motivo_egreso FROM presencias_mando WHERE usuario_id = $1 ORDER BY ingreso_en`, [hotel]);
      const enOtro = rows.find(r => r.operativo_id === otro);
      assert.ok(enOtro.egreso_en, 'el turno en el otro operativo se cierra');
      assert.equal(enOtro.motivo_egreso, `Se presentó en el operativo "${TITULO_OPERATIVO}"`);
      assert.ok(rows.some(r => r.operativo_id === ctx.op && r.puesto === 'ENCARGADO' && !r.egreso_en));
    });
  });

  test('CU-15 · la base impide que una persona tenga dos turnos abiertos a la vez', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, puesto: 'COORDINADOR', autorId: india });
      await client.query('SAVEPOINT duplicado');
      await assert.rejects(
        client.query(`INSERT INTO presencias_mando (operativo_id, usuario_id, puesto, ingreso_por) VALUES ($1, $2, 'ENCARGADO', $2)`, [ctx.op, india]),
        e => e.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT duplicado');
    });
  });

  test('CU-10 · al finalizar el operativo se cierran todos los turnos', async () => {
    await enTransaccionDescartada(async client => {
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: hotel, puesto: 'COORDINADOR', autorId: hotel });
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: india, puesto: 'ENCARGADO', autorId: india });
      await Mando.ingresarCon(client, { operativoId: ctx.op, usuarioId: juliett, puesto: 'JEFE_OPERATIVO', autorId: adminId });
      await Mando.cerrarTodoCon(client, ctx.op, adminId, 'Operativo finalizado');
      const { rows } = await client.query(
        `SELECT (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND egreso_en IS NULL) AS de_turno,
                (SELECT count(*)::int FROM presencias_mando WHERE operativo_id = $1 AND motivo_egreso = 'Operativo finalizado') AS cerrados`,
        [ctx.op]);
      assert.deepEqual(rows[0], { de_turno: 0, cerrados: 3 });
    });
  });

  /* ── Contra la API ── */

  test('CU-15 · un administrador tiene que elegir quién ingresa → 400', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { puesto: 'COORDINADOR' }), 400, 'usuario_requerido');
  });

  test('CU-15 · sin puesto, o con uno que no existe → 400 puesto_invalido', async () => {
    motivo(await ingreso('hotel', {}), 400, 'puesto_invalido');
    motivo(await ingreso('hotel', { puesto: 'LIDER' }), 400, 'puesto_invalido');
  });

  test('CU-15 · el puesto Jefe de operativo exige ese rol: un coordinador no lo ocupa → 409', async () => {
    motivo(await ingreso('hotel', { puesto: 'JEFE_OPERATIVO' }), 409, 'rol_no_corresponde');
  });

  test('CU-15 · Coordinador y Encargado exigen rol coordinador: ni un agente ni el jefe de operativo → 409', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: ctx.usuarios.alfa.uid, puesto: 'ENCARGADO' }), 409, 'rol_no_corresponde');
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/ingreso`, { usuarioId: juliett, puesto: 'COORDINADOR' }), 409, 'rol_no_corresponde');
  });

  test('CU-15 · un coordinador se registra a sí mismo como Coordinador', async () => {
    motivo(await ingreso('hotel', { puesto: 'COORDINADOR' }), 201);
    const m = await ctx.mando();
    assert.deepEqual(m.presentes.map(p => [p.usuarioId, p.puesto]), [[hotel, 'COORDINADOR']]);
    assert.equal(m.aCargo, undefined, 'ya no hay «a cargo»');
  });

  test('CU-15 · un coordinador registra al jefe de operativo y a otro coordinador como Encargado', async () => {
    motivo(await ingreso('hotel', { usuarioId: juliett, puesto: 'JEFE_OPERATIVO' }), 201);
    motivo(await ingreso('hotel', { usuarioId: india, puesto: 'ENCARGADO' }), 201);
    const m = await ctx.mando();
    const de = id => m.presentes.find(p => p.usuarioId === id);
    assert.equal(de(juliett).puesto, 'JEFE_OPERATIVO');
    assert.equal(de(india).puesto, 'ENCARGADO');
    assert.equal(de(india).ingresoPor, hotel);
  });

  test('CU-11 · el listado de operativos muestra quién está de turno y en qué puesto', async () => {
    const op = (await comoAdmin('GET', '/operativos')).json.operativos.find(o => o.id === ctx.op);
    assert.deepEqual(op.puestoComando.map(p => p.puesto).sort(), ['COORDINADOR', 'ENCARGADO', 'JEFE_OPERATIVO']);
    assert.equal(op.mandoNombre, undefined, 'ya no viene el «a cargo»');
  });

  test('CU-15 · ingresar dos veces → 409 ya_presente', async () => {
    motivo(await ingreso('hotel', { puesto: 'ENCARGADO' }), 409, 'ya_presente');
  });

  test('CU-15 · cambiar de puesto: Encargado → Coordinador, con la misma hora de cierre y apertura', async () => {
    motivo(await cambiar('india', { puesto: 'COORDINADOR' }), 200);
    const m = await ctx.mando();
    assert.equal(m.presentes.find(p => p.usuarioId === india).puesto, 'COORDINADOR');
    const turnos = m.historialPresencias.filter(p => p.usuarioId === india);
    const [actual, anterior] = turnos;
    assert.equal(anterior.puesto, 'ENCARGADO');
    assert.equal(anterior.motivo, 'Pasó al puesto Coordinador');
    assert.equal(new Date(anterior.hasta).getTime(), new Date(actual.desde).getTime());
  });

  test('CU-15 · cambiar al mismo puesto → 409; el jefe de operativo no pasa a Coordinador → 409', async () => {
    motivo(await cambiar('india', { puesto: 'COORDINADOR' }), 409, 'mismo_puesto');
    motivo(await cambiar('hotel', { usuarioId: juliett, puesto: 'COORDINADOR' }), 409, 'rol_no_corresponde');
  });

  test('CU-15 · el egreso exige motivo → 400', async () => {
    motivo(await egreso('hotel', { usuarioId: india }), 400, 'motivo_requerido');
  });

  test('CU-15 · el jefe de operativo ve el puesto de comando pero no registra nada → 403', async () => {
    motivo(await como('juliett', 'GET', `/operativos/${ctx.op}/mando`), 200);
    motivo(await egreso('juliett', FIN_TURNO), 403);
    motivo(await ingreso('juliett', { usuarioId: hotel, puesto: 'ENCARGADO' }), 403);
  });

  test('Línea de tiempo · lo que registra un coordinador de turno queda "en el puesto"; lo de uno ausente, "a distancia"', async () => {
    motivo(await egreso('hotel', FIN_TURNO), 200);                            // hotel se va; india sigue de turno
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

  test('CU-15 · si un coordinador de turno se registra como agente, deja el puesto de comando', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: india }), 201);
    const m = await ctx.mando();
    assert.ok(!m.presentes.some(p => p.usuarioId === india));
    const cerrado = m.historialPresencias.find(p => p.usuarioId === india && p.hasta && /^Pasó a rastrillar como agente/.test(p.motivo));
    assert.ok(cerrado, 'el turno se cerró con el motivo del alta como agente');
  });

  test('CU-15 · quien figura como agente no entra al puesto de comando → 409 es_agente', async () => {
    motivo(await ingreso('india', { puesto: 'COORDINADOR' }), 409, 'es_agente');
  });

  test('CU-15 · un administrador registra el egreso del jefe de operativo', async () => {
    motivo(await comoAdmin('POST', `/operativos/${ctx.op}/mando/retiro`, { usuarioId: juliett, ...FIN_TURNO }), 200);
    assert.equal((await ctx.mando()).presentes.length, 0);
  });

  test('CU-15 · cada movimiento del puesto de comando queda en la auditoría', async () => {
    const { rows } = await ctx.query(
      `SELECT valores_nuevos->>'accion' AS accion FROM logs_auditoria
        WHERE entidad_afectada = 'presencias_mando' AND registro_id = $1
          AND creado_en > now() - interval '10 minutes'`, [ctx.op]);
    const acciones = new Set(rows.map(r => r.accion));
    for (const a of ['ingreso', 'retiro', 'cambio_puesto']) assert.ok(acciones.has(a), `falta ${a}`);
  });
});

describe('Jefe de operativo: sólo visualización e informes (29/10)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  const jefe = (m, ruta, body) => como('juliett', m, ruta, body);

  test('Jefe de operativo · ve operativos, agentes, grupos, mapa, objetivo e informes', async () => {
    for (const ruta of ['/operativos', `/operativos/${ctx.op}`, `/operativos/${ctx.op}/personal`, `/operativos/${ctx.op}/grupos`,
      `/operativos/${ctx.op}/poligonos`, `/operativos/${ctx.op}/tracks`, `/operativos/${ctx.op}/marcadores`,
      `/operativos/${ctx.op}/punto-cero`, `/operativos/${ctx.op}/informes`]) {
      const r = await jefe('GET', ruta);
      assert.equal(r.status, 200, `${ruta}: ${JSON.stringify(r.json)}`);
    }
  });

  test('Jefe de operativo · consulta usuarios, sin ver a los administradores', async () => {
    const r = await jefe('GET', '/usuarios');
    motivo(r, 200);
    assert.ok(r.json.usuarios.length > 0);
    assert.ok(r.json.usuarios.every(u => u.rol.toLowerCase() !== 'administrador'));
  });

  test('Jefe de operativo · no crea, modifica ni opera nada → 403', async () => {
    motivo(await jefe('POST', '/operativos', {}), 403);
    motivo(await jefe('PUT', `/operativos/${ctx.op}`, { descripcion: 'x' }), 403);
    motivo(await jefe('POST', `/operativos/${ctx.op}/pausar`, { motivo: 'Prueba' }), 403);
    motivo(await jefe('GET', `/operativos/${ctx.op}/qr`), 403);
    motivo(await jefe('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: ctx.usuarios.alfa.uid }), 403);
    motivo(await jefe('POST', `/operativos/${ctx.op}/grupos`, { nombre: 'X', liderId: ctx.agentes.alfa.id, clase: 'RASTRILLAJE' }), 403);
    motivo(await jefe('POST', '/usuarios', {}), 403);
    motivo(await jefe('PUT', `/usuarios/${ctx.usuarios.alfa.uid}`, { telefono: '3510000000' }), 403);
  });

  test('Jefe de operativo · un coordinador no crea ni asigna ese rol → 403 rol_no_permitido', async () => {
    const r = await como('hotel', 'PUT', `/usuarios/${ctx.usuarios.alfa.uid}`, { rol: 'jefe_operativo' });
    motivo(r, 403, 'rol_no_permitido');
  });
});
