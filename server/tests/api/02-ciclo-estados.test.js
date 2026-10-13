/**
 * Ciclo de estados de un grupo (modelo del 24/09) y Regla 1: un agente en un
 * grupo nunca contradice al grupo. También el historial de tiempo en el
 * terreno y las restricciones del CU-18 con grupo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let G;
const MIEMBROS = ['alfa', 'bravo', 'golf'];      // golf es el conductor

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const estados = async claves => {
  const a = await ctx.refrescar();
  return Object.fromEntries(claves.map(k => [k, a[k].estado]));
};

describe('Grupos: ciclo de estados y Regla 1 (CU-24, CU-18, CU-26)', () => {
  before(async () => {
    ctx = await preparar();
    G = (await ctx.crearGrupo('Ciclo', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
    await ctx.mover('golf', G);
  });
  after(terminar);

  test('CU-24 · en formación, todos los integrantes están Agrupados', async () => {
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'AGRUPADO', bravo: 'AGRUPADO', golf: 'AGRUPADO' });
  });

  test('CU-24 · salir sin estar asignado → 409 transicion_invalida', async () => {
    motivo(await ctx.accion(G, { accion: 'salir' }), 409, 'transicion_invalida');
  });

  test('CU-24/30 · confirmar y asignar sin polígono → 400 poligono_requerido', async () => {
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 200);
    motivo(await ctx.accion(G, { accion: 'asignar' }), 400, 'poligono_requerido');
  });

  test('CU-24/30 · asignar a un polígono → Asignado; los integrantes siguen Agrupados y sin tiempo en el terreno', async () => {
    const r = await ctx.accion(G, { accion: 'asignar', zona: 'Quebrada norte, polígono 2' });
    motivo(r, 200);
    assert.equal(r.json.grupo.estado, 'ASIGNADO');
    assert.equal(r.json.grupo.zonaAsignada, 'Quebrada norte, polígono 2');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'AGRUPADO', bravo: 'AGRUPADO', golf: 'AGRUPADO' });
    assert.equal(await ctx.periodosAbiertos(G), 0);
  });

  test('CU-24 · salir → Desplegado: todos Desplegados y se abre el tiempo en el terreno de cada uno', async () => {
    const r = await ctx.accion(G, { accion: 'salir' });
    assert.equal(r.json?.grupo?.estado, 'DESPLEGADO');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'DESPLEGADO', bravo: 'DESPLEGADO', golf: 'DESPLEGADO' });
    assert.equal(await ctx.periodosAbiertos(G), 3);
  });

  test('CU-26 · no se disuelve un grupo en el terreno → 409', async () => {
    motivo(await ctx.disolver(G), 409, 'transicion_invalida');
  });

  test('CU-24 · llegar al polígono → Rastrillando; el conductor queda Desplegado con la camioneta', async () => {
    const r = await ctx.accion(G, { accion: 'llegar_poligono' });
    assert.equal(r.json?.grupo?.estado, 'RASTRILLANDO');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'RASTRILLANDO', bravo: 'RASTRILLANDO', golf: 'DESPLEGADO' });
  });

  test('CU-18 · con grupo, el estado del agente no se cambia a mano → 409 agente_en_grupo', async () => {
    motivo(await ctx.cu17('bravo', { estado: 'NO_DISPONIBLE' }), 409, 'agente_en_grupo');
  });

  test('CU-18 · el Líder de un grupo de rastrillaje no puede pasar a ser conductor → 409', async () => {
    motivo(await ctx.cu17('alfa', { esConductor: true }), 409, 'lider_conductor');
  });

  test('CU-18 · sacarle el conductor a alguien que rastrilla lo pone a rastrillar (Regla 1)', async () => {
    motivo(await ctx.cu17('golf', { esConductor: false }), 200);
    assert.equal((await estados(['golf'])).golf, 'RASTRILLANDO');
    motivo(await ctx.cu17('golf', { esConductor: true }), 200);
    assert.equal((await estados(['golf'])).golf, 'DESPLEGADO');
  });

  test('CU-24 · corregir un estado exige motivo → 400 motivo_requerido', async () => {
    motivo(await ctx.accion(G, { accion: 'corregir', estadoDestino: 'DESPLEGADO' }), 400, 'motivo_requerido');
  });

  test('CU-24 · corregir con motivo → vuelve a Desplegado y arrastra a los integrantes', async () => {
    const r = await ctx.accion(G, { accion: 'corregir', estadoDestino: 'DESPLEGADO', motivo: 'Se marcó antes de llegar' });
    assert.equal(r.json?.grupo?.estado, 'DESPLEGADO');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'DESPLEGADO', bravo: 'DESPLEGADO', golf: 'DESPLEGADO' });
    await ctx.accion(G, { accion: 'llegar_poligono' });
  });

  test('CU-24 · volver → Replegado y llegar a la base → En espera; se cierra el tiempo en el terreno', async () => {
    assert.equal((await ctx.accion(G, { accion: 'volver' })).json?.grupo?.estado, 'REPLEGADO');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'REPLEGADO', bravo: 'REPLEGADO', golf: 'REPLEGADO' });
    assert.equal((await ctx.accion(G, { accion: 'llegar_base' })).json?.grupo?.estado, 'EN_ESPERA');
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'EN_ESPERA', bravo: 'EN_ESPERA', golf: 'EN_ESPERA' });
    assert.equal(await ctx.periodosAbiertos(G), 0);
  });

  test('CU-24 · reabrir desde En espera → En formación y todos Agrupados', async () => {
    const r = await ctx.accion(G, { accion: 'reabrir' });
    assert.equal(r.json?.grupo?.estado, 'EN_FORMACION');
    assert.ok(r.json.grupo.integrantes.every(i => i.estado === 'AGRUPADO'));
  });

  test('CU-26 · disolver en la base → todos Disponibles y sin grupo', async () => {
    motivo(await ctx.disolver(G), 204);
    assert.deepEqual(await estados(MIEMBROS), { alfa: 'DISPONIBLE', bravo: 'DISPONIBLE', golf: 'DISPONIBLE' });
  });

  test('Regla 1 · en toda la base, ningún agente contradice el estado de su grupo', async () => {
    const { rows } = await ctx.query(
      `SELECT count(*)::int AS n
         FROM agentes_operativo ao JOIN grupos g ON g.id = ao.grupo_id
        WHERE ao.fecha_egreso IS NULL AND ao.estado::text <> (CASE g.estado
          WHEN 'EN_FORMACION' THEN 'AGRUPADO' WHEN 'CONFIRMADO' THEN 'AGRUPADO' WHEN 'ASIGNADO' THEN 'AGRUPADO'
          WHEN 'DESPLEGADO' THEN 'DESPLEGADO' WHEN 'REPLEGADO' THEN 'REPLEGADO' WHEN 'EN_ESPERA' THEN 'EN_ESPERA'
          WHEN 'RASTRILLANDO' THEN CASE WHEN ao.es_conductor THEN 'DESPLEGADO' ELSE 'RASTRILLANDO' END END)`);
    assert.equal(rows[0].n, 0);
  });
});
