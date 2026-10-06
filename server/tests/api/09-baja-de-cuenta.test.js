/**
 * CU-07 · Eliminar una cuenta la saca de los operativos (05/10, detectado en
 * producción: una cuenta eliminada seguía "Disponible" en un operativo).
 * Usa cuentas propias (auto.baja*) para no tocar a los agentes fijos de las
 * otras pruebas.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

/** Cuenta nueva, activa y dada de alta en el operativo de pruebas. Devuelve su id de usuario. */
async function agenteNuevo(clave, dni) {
  const email = `auto.${clave}@prueba.duar`;
  await ctx.query(
    `UPDATE usuarios SET estado = 'ELIMINADO', eliminado_en = now()
      WHERE (dni = $1 OR lower(email) = $2) AND eliminado_en IS NULL`, [dni, email]);
  await ctx.query(`UPDATE agentes_operativo SET fecha_egreso = now(), grupo_id = NULL
                    WHERE usuario_id IN (SELECT id FROM usuarios WHERE dni = $1) AND fecha_egreso IS NULL`, [dni]);
  const r = await ctx.api('POST', '/usuarios', {
    dni, nombre: 'Baja', apellido: 'Prueba Automatica', email, password: 'ClaveBaja123', rol: 'agente',
  });
  motivo(r, 201);
  const id = r.json.usuario.id;
  await ctx.query(`UPDATE usuarios SET estado = 'ACTIVO', email_confirmado = true WHERE id = $1`, [id]);
  motivo(await ctx.api('POST', `/operativos/${ctx.op}/agentes`, { usuarioId: id }), 201);
  await ctx.refrescar();
  return id;
}

const altasVigentes = async usuarioId => (await ctx.query(
  `SELECT count(*)::int AS n FROM agentes_operativo WHERE usuario_id = $1 AND fecha_egreso IS NULL`, [usuarioId])).rows[0].n;

describe('Eliminar una cuenta la saca de los operativos (CU-07)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-07 · sin grupo: deja el operativo, con la baja en su línea de tiempo', async () => {
    const id = await agenteNuevo('baja', '98000990');
    assert.equal(await altasVigentes(id), 1);

    assert.equal((await ctx.api('DELETE', `/usuarios/${id}`)).status, 204);

    assert.equal(await altasVigentes(id), 0, 'ya no figura en el operativo');
    const lista = (await ctx.api('GET', `/operativos/${ctx.op}/agentes`)).json;
    assert.ok(!JSON.stringify(lista).includes(id), 'no aparece en la grilla de agentes');
    const { rows } = await ctx.query(
      `SELECT e.motivo FROM eventos_estado e JOIN agentes_operativo ao ON ao.id = e.agente_operativo_id
        WHERE ao.usuario_id = $1 AND e.accion = 'baja'`, [id]);
    assert.equal(rows[0]?.motivo, 'Su cuenta fue eliminada del sistema');
  });

  test('CU-07 · en un grupo en la base: sale del grupo y del operativo; el grupo sigue', async () => {
    const id = await agenteNuevo('baja', '98000990');
    const G = (await ctx.crearGrupo('Baja base', 'alfa')).json.grupo.id;
    motivo(await ctx.mover('baja', G), 200);

    assert.equal((await ctx.api('DELETE', `/usuarios/${id}`)).status, 204);

    assert.equal(await altasVigentes(id), 0);
    const grupo = await ctx.grupoDb(G);
    assert.equal(grupo.eliminado_en, null, 'el grupo no se disuelve');
    assert.equal(await ctx.periodosAbiertos(G), 0, 'no quedan períodos abiertos de la cuenta eliminada');
    assert.ok([200, 204].includes((await ctx.disolver(G)).status));
  });

  test('CU-07 · en el terreno con su grupo: no se puede eliminar (409) y no cambia nada', async () => {
    const id = await agenteNuevo('baja', '98000990');
    const G = (await ctx.crearGrupo('Baja terreno', 'alfa')).json.grupo.id;
    for (const k of ['baja', 'bravo']) motivo(await ctx.mover(k, G), 200);
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 200);
    motivo(await ctx.accion(G, { accion: 'asignar', zona: 'Ladera norte' }), 200);
    motivo(await ctx.accion(G, { accion: 'salir' }), 200);

    motivo(await ctx.api('DELETE', `/usuarios/${id}`), 409, 'grupo_en_terreno');

    const { rows: [u] } = await ctx.query(`SELECT estado::text AS estado FROM usuarios WHERE id = $1`, [id]);
    assert.equal(u.estado, 'ACTIVO', 'la cuenta no se eliminó');
    assert.equal(await altasVigentes(id), 1, 'sigue en el operativo, con su grupo');
  });
});
