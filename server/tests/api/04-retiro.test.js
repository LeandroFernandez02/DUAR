/**
 * CU-26 · Extraer Agente de Grupo Activo: sucesión de mando, binomio mínimo
 * (cuentan los que rastrillan, no el conductor) y trazabilidad del período.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let G;
const retirar = body => ctx.api('POST', `/operativos/${ctx.op}/grupos/${G}/extraer`, body);
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

describe('Retiro de un agente en el terreno (CU-26)', () => {
  before(async () => {
    ctx = await preparar();
    G = (await ctx.crearGrupo('Retiro', 'alfa')).json.grupo.id;
    for (const k of ['bravo', 'delta', 'golf']) await ctx.mover(k, G);
    await ctx.accion(G, { accion: 'confirmar' });
    await ctx.accion(G, { accion: 'asignar', zona: 'Ladera este' });
    await ctx.accion(G, { accion: 'salir' });
    await ctx.accion(G, { accion: 'llegar_poligono' });
    await ctx.refrescar();
  });
  after(terminar);

  test('CU-26 · retirar a alguien que no integra el grupo → 409', async () => {
    motivo(await retirar({ agenteOperativoId: ctx.agentes.eco.id, motivo: 'Lesión' }), 409, 'agente_fuera_del_grupo');
  });

  test('CU-26 · retirar al Líder sin designar sucesor → 409 sucesion_requerida', async () => {
    motivo(await retirar({ agenteOperativoId: ctx.agentes.alfa.id, motivo: 'Lesión' }), 409, 'sucesion_requerida');
  });

  test('CU-26 · el sucesor de un grupo de rastrillaje no puede ser el conductor → 409', async () => {
    const r = await retirar({ agenteOperativoId: ctx.agentes.alfa.id, motivo: 'Lesión', nuevoLiderId: ctx.agentes.golf.id });
    motivo(r, 409, 'lider_conductor');
  });

  test('CU-26 · el sucesor tiene que ser del DUAR → 409', async () => {
    const r = await retirar({ agenteOperativoId: ctx.agentes.alfa.id, motivo: 'Lesión', nuevoLiderId: ctx.agentes.delta.id });
    motivo(r, 409, 'lider_no_duar');
  });

  test('CU-26 · retirar al Líder con sucesor del DUAR: el grupo sigue rastrillando con el nuevo Líder', async () => {
    const r = await retirar({ agenteOperativoId: ctx.agentes.alfa.id, motivo: 'Lesión', nuevoLiderId: ctx.agentes.bravo.id });
    motivo(r, 200);
    assert.equal(r.json.grupo.estado, 'RASTRILLANDO');
    assert.equal(r.json.grupo.liderId, ctx.agentes.bravo.id);
  });

  test('CU-26 · el retirado queda Replegado y sin grupo, y su período se cierra con el motivo', async () => {
    const a = await ctx.refrescar();
    assert.equal(a.alfa.estado, 'REPLEGADO');
    assert.equal(a.alfa.grupoId, null);
    const { rows } = await ctx.query(
      `SELECT fecha_fin, motivo_salida FROM agentes_grupo_historial
        WHERE agente_operativo_id = $1 ORDER BY fecha_inicio DESC LIMIT 1`, [a.alfa.id]);
    assert.ok(rows[0]?.fecha_fin, 'el período se cierra, no se borra');
    assert.equal(rows[0]?.motivo_salida, 'Lesión');
  });

  test('CU-26 · si quedaría una sola persona rastrillando (el conductor no cuenta) hay que aceptar el riesgo → 409', async () => {
    motivo(await retirar({ agenteOperativoId: ctx.agentes.delta.id, motivo: 'Descompensación' }), 409, 'binomio_sin_confirmar');
  });

  test('CU-26 · con el riesgo aceptado el grupo sigue en el terreno y queda la alerta de binomio', async () => {
    const r = await retirar({ agenteOperativoId: ctx.agentes.delta.id, motivo: 'Descompensación', riesgoAceptado: true });
    motivo(r, 200);
    assert.equal(r.json.grupo.estado, 'RASTRILLANDO');
    assert.equal(r.json.alertaBinomio, true);
    const lista = (await ctx.api('GET', `/operativos/${ctx.op}/grupos`)).json.grupos;
    assert.equal(lista.find(g => g.id === G).alertaBinomio, true, 'el tablero muestra la alerta');
  });

  test('CU-26 · en la base no se retira: se reabre y se saca arrastrando → 409 grupo_no_extraible', async () => {
    const B = (await ctx.crearGrupo('En base', 'charlie')).json.grupo.id;
    await ctx.mover('eco', B);
    const r = await ctx.api('POST', `/operativos/${ctx.op}/grupos/${B}/extraer`, { agenteOperativoId: ctx.agentes.eco.id, motivo: 'Lesión' });
    motivo(r, 409, 'grupo_no_extraible');
  });

  test('CU-26 · el retirado, al llegar a la base, se marca Disponible desde su portal', async () => {
    const r = await ctx.api('PUT', '/mi-estado', { estado: 'DISPONIBLE' }, ctx.usuarios.alfa.token);
    assert.equal(r.json?.agente?.estado, 'DISPONIBLE', JSON.stringify(r.json));
  });
});
