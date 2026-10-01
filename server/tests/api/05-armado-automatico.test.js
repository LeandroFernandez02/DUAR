/**
 * CU-22 · Asignación y Armado Automático de Grupos: sólo arma grupos de
 * rastrillaje, con agentes que rastrillan (ni conductores ni recursos
 * especiales), Líder del DUAR y al menos dos por grupo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let resultado;
const armar = tamano => ctx.api('POST', `/operativos/${ctx.op}/grupos/automatico`, { tamano });

describe('Armado automático (CU-22)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-22 · un tamaño fuera de rango → 400', async () => {
    assert.equal((await armar(1)).status, 400);
  });

  test('CU-22 · con 5 agentes que rastrillan y tamaño 3 arma 2 grupos y los reparte a todos', async () => {
    const r = await armar(3);
    assert.equal(r.status, 201, JSON.stringify(r.json));
    resultado = r.json;
    assert.equal(resultado.creados.length, 2);
    assert.equal(resultado.asignados, 5);
    assert.equal(resultado.sinAsignar.length, 0);
  });

  test('CU-22 · cada grupo es de rastrillaje, En formación, con Líder del DUAR que no maneja y al menos dos integrantes', async () => {
    const grupos = (await ctx.api('GET', `/operativos/${ctx.op}/grupos`)).json.grupos;
    for (const g of grupos) {
      assert.equal(g.clase, 'RASTRILLAJE');
      assert.equal(g.estado, 'EN_FORMACION');
      assert.ok(g.integrantes.length >= 2, `${g.nombre}: ${g.integrantes.length}`);
      const lider = g.integrantes.find(i => i.id === g.liderId);
      assert.ok(lider?.esDuar && !lider.esConductor && !lider.esRecursoCritico, g.nombre);
      assert.ok(g.integrantes.every(i => i.estado === 'AGRUPADO'));
    }
  });

  test('CU-22 · el conductor y el recurso especial quedan sin grupo, para sumarlos a mano', async () => {
    const a = await ctx.refrescar();
    assert.equal(a.golf.grupoId, null);
    assert.equal(a.foxtrot.grupoId, null);
  });

  test('CU-22 · sin agentes del DUAR disponibles para liderar → 409 sin_lideres_duar', async () => {
    const r = await armar(3);
    assert.equal(r.status, 409);
    assert.equal(r.json?.motivo, 'sin_lideres_duar');
  });
});
