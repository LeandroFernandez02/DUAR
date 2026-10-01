/**
 * Composición de grupos: CU-21 (crear), CU-24 (editar y mover), CU-25 (disolver)
 * y las reglas de clase (26/09) y de conductor (29/09).
 * Escenario encadenado: cada prueba parte de lo que dejó la anterior.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let G;       // grupo de rastrillaje "Composición"
let E;       // grupo especial "Especial Dron"

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

describe('Grupos: composición y clases (CU-21, CU-24, CU-25)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-21 · crear un grupo sin elegir la clase → 400 clase_requerida', async () => {
    const r = await ctx.api('POST', `/operativos/${ctx.op}/grupos`, { nombre: 'Sin clase', liderId: ctx.agentes.alfa.id });
    motivo(r, 400, 'clase_requerida');
  });

  test('CU-21 · Líder de rastrillaje que no es del DUAR → 409 lider_no_duar', async () => {
    motivo(await ctx.crearGrupo('Rechazado', 'delta'), 409, 'lider_no_duar');
  });

  test('CU-21 · Líder de rastrillaje que es recurso especial → 409', async () => {
    motivo(await ctx.crearGrupo('Rechazado', 'foxtrot'), 409, 'recurso_especial_en_rastrillaje');
  });

  test('CU-21 · Líder de rastrillaje que es conductor → 409 lider_conductor', async () => {
    motivo(await ctx.crearGrupo('Rechazado', 'golf'), 409, 'lider_conductor');
  });

  test('CU-21 · crear con Líder del DUAR → En formación y el Líder queda Agrupado', async () => {
    const r = await ctx.crearGrupo('Composicion', 'alfa');
    motivo(r, 201);
    G = r.json.grupo.id;
    assert.equal(r.json.grupo.estado, 'EN_FORMACION');
    assert.equal(r.json.grupo.clase, 'RASTRILLAJE');
    const a = await ctx.refrescar();
    assert.equal(a.alfa.estado, 'AGRUPADO');
    assert.equal(a.alfa.grupoId, G);
  });

  test('CU-21 · nombre de grupo repetido en el operativo → 409 nombre_duplicado', async () => {
    motivo(await ctx.crearGrupo('Composicion', 'bravo'), 409, 'nombre_duplicado');
  });

  test('CU-24 · un recurso especial no entra a un grupo de rastrillaje → 409', async () => {
    motivo(await ctx.mover('foxtrot', G), 409, 'recurso_especial_en_rastrillaje');
  });

  test('CU-24 · un recurso especial que va de conductor sí entra a uno de rastrillaje', async () => {
    motivo(await ctx.cu17('foxtrot', { esConductor: true }), 200);
    motivo(await ctx.mover('foxtrot', G), 200);
    assert.equal((await ctx.refrescar()).foxtrot.grupoId, G);
  });

  test('CU-17 · no se le saca el conductor a un recurso especial dentro de uno de rastrillaje → 409', async () => {
    motivo(await ctx.cu17('foxtrot', { esConductor: false }), 409, 'recurso_especial_en_rastrillaje');
  });

  test('CU-24 · sacarlo arrastrando a "Sin grupo" lo deja Disponible', async () => {
    motivo(await ctx.mover('foxtrot', null), 200);
    const a = await ctx.refrescar();
    assert.equal(a.foxtrot.grupoId, null);
    assert.equal(a.foxtrot.estado, 'DISPONIBLE');
    motivo(await ctx.cu17('foxtrot', { esConductor: false }), 200);
  });

  test('CU-21 · confirmar con una sola persona que rastrilla (el conductor no cuenta) → 409 binomio_minimo', async () => {
    motivo(await ctx.mover('golf', G), 200);
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 409, 'binomio_minimo');
  });

  test('CU-24 · cambiar el Líder por el conductor → 409 lider_conductor', async () => {
    const r = await ctx.api('PUT', `/operativos/${ctx.op}/grupos/${G}`, { liderId: ctx.agentes.golf.id });
    motivo(r, 409, 'lider_conductor');
  });

  test('CU-24 · cambiar el Líder por alguien que no es del DUAR → 409 lider_no_duar', async () => {
    motivo(await ctx.mover('delta', G), 200);
    const r = await ctx.api('PUT', `/operativos/${ctx.op}/grupos/${G}`, { liderId: ctx.agentes.delta.id });
    motivo(r, 409, 'lider_no_duar');
  });

  test('CU-24 · la clase del grupo no se puede cambiar → 400 clase_fija', async () => {
    const r = await ctx.api('PUT', `/operativos/${ctx.op}/grupos/${G}`, { clase: 'ESPECIAL' });
    motivo(r, 400, 'clase_fija');
  });

  test('CU-21 · con dos que rastrillan se confirma', async () => {
    const r = await ctx.accion(G, { accion: 'confirmar' });
    motivo(r, 200);
    assert.equal(r.json.grupo.estado, 'CONFIRMADO');
  });

  test('CU-24 · a un grupo confirmado no se suma gente arrastrando → 409 grupo_no_en_formacion', async () => {
    motivo(await ctx.mover('eco', G), 409, 'grupo_no_en_formacion');
  });

  test('CU-21 · un grupo especial lo lidera un recurso especial y se confirma sin requisitos', async () => {
    const r = await ctx.crearGrupo('Especial Dron', 'foxtrot', 'ESPECIAL');
    motivo(r, 201);
    E = r.json.grupo.id;
    const c = await ctx.accion(E, { accion: 'confirmar' });
    motivo(c, 200);
    assert.equal(c.json.grupo.estado, 'CONFIRMADO');
  });

  test('CU-25 · disolver un grupo en la base deja a sus integrantes Disponibles y sin grupo', async () => {
    motivo(await ctx.disolver(G), 204);
    motivo(await ctx.disolver(E), 204);
    const a = await ctx.refrescar();
    for (const k of ['alfa', 'golf', 'delta', 'foxtrot']) {
      assert.equal(a[k].grupoId, null, k);
      assert.equal(a[k].estado, 'DISPONIBLE', k);
    }
    assert.ok((await ctx.grupoDb(G)).eliminado_en, 'el grupo disuelto queda como registro histórico');
  });
});
