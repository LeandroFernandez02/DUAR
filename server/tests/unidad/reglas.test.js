/**
 * Reglas puras del Módulo 4 (estados.js): no tocan la base ni la API.
 * Son la especificación ejecutable del modelo de estados del 24/09 y de las
 * reglas de composición del 26/09 y 29/09.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCIONES, ESTADOS_GRUPO, EN_BASE, EN_OPERACION, ESTADOS_AGENTE_SIN_GRUPO,
  estadoAgenteSegunGrupo, entraARastrillaje, motivoLiderNoApto, cuantosRastrillan,
} from '../../src/models/estados.js';

describe('Reglas puras del modelo de estados y de composición', () => {
  test('Estados · Regla 1: cada estado del grupo define el de sus integrantes', () => {
    const esperado = {
      EN_FORMACION: 'AGRUPADO', CONFIRMADO: 'AGRUPADO', ASIGNADO: 'AGRUPADO',
      DESPLEGADO: 'DESPLEGADO', RASTRILLANDO: 'RASTRILLANDO', REPLEGADO: 'REPLEGADO',
      EN_ESPERA: 'EN_ESPERA', DISUELTO: 'DISPONIBLE',
    };
    for (const estado of ESTADOS_GRUPO) {
      assert.equal(estadoAgenteSegunGrupo(estado), esperado[estado], estado);
    }
  });

  test('Estados · Regla 1: el conductor queda Desplegado mientras el grupo rastrilla', () => {
    assert.equal(estadoAgenteSegunGrupo('RASTRILLANDO', { esConductor: true }), 'DESPLEGADO');
    assert.equal(estadoAgenteSegunGrupo('RASTRILLANDO', { esConductor: false }), 'RASTRILLANDO');
    // En el resto de los estados el conductor sigue al grupo como cualquiera.
    for (const estado of ESTADOS_GRUPO.filter(e => e !== 'RASTRILLANDO')) {
      assert.equal(estadoAgenteSegunGrupo(estado, { esConductor: true }), estadoAgenteSegunGrupo(estado), estado);
    }
  });

  test('Estados · ningún estado de grupo deja a un integrante en un estado "sin grupo"', () => {
    for (const estado of ESTADOS_GRUPO.filter(e => e !== 'DISUELTO')) {
      for (const esConductor of [false, true]) {
        const a = estadoAgenteSegunGrupo(estado, { esConductor });
        assert.ok(!['DISPONIBLE', 'NO_DISPONIBLE'].includes(a), `${estado} → ${a}`);
      }
    }
    assert.ok(ESTADOS_AGENTE_SIN_GRUPO.includes(estadoAgenteSegunGrupo('DISUELTO')));
  });

  test('Estados · cada acción sale de estados válidos y llega a un estado del catálogo', () => {
    for (const [accion, def] of Object.entries(ACCIONES)) {
      assert.ok(ESTADOS_GRUPO.includes(def.hacia), `${accion} → ${def.hacia}`);
      for (const desde of def.desde) assert.ok(ESTADOS_GRUPO.includes(desde), `${accion} desde ${desde}`);
      assert.ok(!def.desde.includes(def.hacia), `${accion} no puede volver al mismo estado`);
    }
  });

  test('Estados · las acciones del terreno sólo avanzan: salir → llegar → volver → base', () => {
    assert.deepEqual(ACCIONES.salir.desde, ['ASIGNADO']);
    assert.equal(ACCIONES.salir.hacia, 'DESPLEGADO');
    assert.deepEqual(ACCIONES.llegar_poligono.desde, ['DESPLEGADO']);
    assert.equal(ACCIONES.llegar_poligono.hacia, 'RASTRILLANDO');
    assert.ok(ACCIONES.volver.desde.includes('RASTRILLANDO') && ACCIONES.volver.hacia === 'REPLEGADO');
    assert.deepEqual(ACCIONES.llegar_base.desde, ['REPLEGADO']);
    assert.equal(ACCIONES.llegar_base.hacia, 'EN_ESPERA');
  });

  test('CU-25 · sólo se disuelve un grupo que está en la base', () => {
    assert.deepEqual([...ACCIONES.disolver.desde].sort(), [...EN_BASE].sort());
    for (const e of EN_OPERACION) assert.ok(!ACCIONES.disolver.desde.includes(e), e);
  });

  test('Estados · el Líder informa sólo hechos del terreno; confirmar, asignar y disolver son del coordinador', () => {
    for (const a of ['salir', 'llegar_poligono', 'volver', 'llegar_base']) assert.ok(ACCIONES[a].quien.includes('LIDER'), a);
    for (const a of ['confirmar', 'asignar', 'reabrir', 'disolver']) assert.deepEqual(ACCIONES[a].quien, ['COORDINADOR'], a);
  });

  test('CU-21/24 · a un grupo de rastrillaje entra un agente o un conductor, no un recurso especial', () => {
    assert.equal(entraARastrillaje({ esRecursoCritico: false, esConductor: false }), true);
    assert.equal(entraARastrillaje({ esRecursoCritico: true, esConductor: false }), false);
    assert.equal(entraARastrillaje({ esRecursoCritico: true, esConductor: true }), true);
    assert.equal(entraARastrillaje({ esRecursoCritico: false, esConductor: true }), true);
  });

  test('CU-21/24/26 · Líder de rastrillaje: del DUAR, no recurso especial y no conductor', () => {
    const duar = { esDuar: true, esRecursoCritico: false, esConductor: false };
    assert.equal(motivoLiderNoApto(duar, 'RASTRILLAJE'), null);
    assert.equal(motivoLiderNoApto({ ...duar, esDuar: false }, 'RASTRILLAJE'), 'lider_no_duar');
    assert.equal(motivoLiderNoApto({ ...duar, esRecursoCritico: true }, 'RASTRILLAJE'), 'recurso_especial_en_rastrillaje');
    assert.equal(motivoLiderNoApto({ ...duar, esConductor: true }, 'RASTRILLAJE'), 'lider_conductor');
  });

  test('CU-21 · un grupo especial lo lidera cualquiera, incluso un conductor de afuera', () => {
    assert.equal(motivoLiderNoApto({ esDuar: false, esRecursoCritico: true, esConductor: true }, 'ESPECIAL'), null);
  });

  test('CU-26 · binomio: rastrillan todos menos el conductor', () => {
    assert.equal(cuantosRastrillan([{ esConductor: false }, { esConductor: true }, { esConductor: false }]), 2);
    assert.equal(cuantosRastrillan([{ esConductor: true }, { esConductor: true }]), 0);
    assert.equal(cuantosRastrillan([]), 0);
  });
});
