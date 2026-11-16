/**
 * Pedido del 15/11 · CU-28 desde el portal: el Líder hace la baja de contingencia de un integrante
 * de su grupo, con las mismas reglas que el coordinador. El retirado queda Replegado y sin grupo, y
 * el evento queda como informado por el Líder (PORTAL_LIDER). El Líder no se retira a sí mismo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let G;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const token = clave => ctx.usuarios[clave].token;
const retirar = (quien, por, extra = {}) => ctx.api('POST', '/mi-grupo/retirar',
  { agenteOperativoId: ctx.agentes[quien].id, motivo: 'Lesión', ...extra }, token(por));

describe('15/11 · el Líder retira a un integrante de su grupo desde el portal (CU-28)', () => {
  before(async () => {
    ctx = await preparar();
    G = (await ctx.crearGrupo('Retiro del Líder', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
    await ctx.mover('charlie', G);
    await ctx.refrescar();
  });
  after(terminar);

  test('con el grupo en la base no se puede (el retiro es para el terreno)', async () => {
    motivo(await retirar('charlie', 'alfa'), 409, 'grupo_no_extraible');
  });

  test('en el terreno: un integrante que no es el Líder no retira a nadie; el Líder no se retira a sí mismo', async () => {
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 200);
    motivo(await ctx.accion(G, { accion: 'asignar', zona: 'Retiro del Líder' }), 200);
    motivo(await ctx.accion(G, { accion: 'salir' }), 200);
    motivo(await retirar('charlie', 'bravo'), 403, 'no_es_lider');
    motivo(await retirar('alfa', 'alfa'), 409, 'lider_se_retira');
    motivo(await retirar('delta', 'alfa'), 403, 'no_es_del_grupo');
    motivo(await ctx.api('POST', '/mi-grupo/retirar', { agenteOperativoId: ctx.agentes.charlie.id, motivo: '  ' }, token('alfa')), 400, 'motivo_requerido');
  });

  test('el Líder retira a un integrante: queda Replegado, sin grupo, y el evento lo informa el Líder', async () => {
    const r = await retirar('charlie', 'alfa');
    motivo(r, 200);
    assert.equal(r.json.grupo.integrantes.length, 2);
    await ctx.refrescar();
    assert.equal(ctx.agentes.charlie.estado, 'REPLEGADO');
    assert.equal(ctx.agentes.charlie.grupoId, null);
    const ev = (await ctx.query(
      `SELECT fuente::text AS fuente, motivo FROM eventos_estado
        WHERE agente_operativo_id = $1 AND accion = 'retiro' ORDER BY registrado_en DESC LIMIT 1`,
      [ctx.agentes.charlie.id])).rows[0];
    assert.equal(ev.fuente, 'PORTAL_LIDER');
    assert.equal(ev.motivo, 'Lesión');
  });

  test('si queda una sola persona rastrillando, hay que confirmar el riesgo (binomio mínimo)', async () => {
    motivo(await retirar('bravo', 'alfa'), 409, 'binomio_sin_confirmar');
    const r = await retirar('bravo', 'alfa', { riesgoAceptado: true });
    motivo(r, 200);
    assert.equal(r.json.alertaBinomio, true);
  });
});
