/**
 * Pedidos del 27/10 sobre el mapa (Módulo 5):
 *   · Distancia automática de cada punto de interés o hallazgo al Punto Cero
 *     (CU-34/35): la calcula la API al leer y sigue al Punto Cero cuando se mueve.
 *   · Instalación SCI «Helibase» (CU-34), distinta del helipunto (migración 029).
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const marc = (m, ruta = '', body) => ctx.api(m, `/operativos/${ctx.op}/marcadores${ruta}`, body);

describe('Pedidos del 27/10 · distancia al Punto Cero y Helibase', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-34 · un punto de interés sale con su distancia al Punto Cero, y se recalcula al moverlo', async () => {
    const { puntoCero: p0 } = (await ctx.api('GET', `/operativos/${ctx.op}/punto-cero`)).json;
    // ~1,11 km al norte del Punto Cero vigente.
    const r = await marc('POST', '', { clase: 'POI', nombre: 'Tranquera', lat: p0.lat + 0.01, lng: p0.lng });
    motivo(r, 201);
    const id = r.json.marcador.id;
    const d = r.json.marcador.distanciaPuntoCeroM;
    assert.ok(d > 1100 && d < 1120, `distancia ${d}`);

    // La lista trae el mismo dato.
    const enLista = (await marc('GET')).json.marcadores.find(m => m.id === id);
    assert.equal(enLista.distanciaPuntoCeroM, d);

    // El Punto Cero se mueve al punto: la distancia pasa a ~0 sin tocar el marcador.
    motivo(await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { lat: p0.lat + 0.01, lng: p0.lng, motivo: 'Prueba de distancia' }), 200);
    assert.equal((await marc('GET', `/${id}`)).json.marcador.distanciaPuntoCeroM, 0);
    motivo(await marc('DELETE', `/${id}`), 204);
  });

  test('Testeo punto 46 · la lista de usuarios dice en qué operativo figura cada uno como agente', async () => {
    const r = await ctx.api('GET', '/usuarios');
    motivo(r, 200);
    const alfa = r.json.usuarios.find(u => u.id === ctx.usuarios.alfa.uid);
    const { rows: [op] } = await ctx.query(`SELECT titulo FROM operativos WHERE id = $1`, [ctx.op]);
    assert.equal(alfa.agenteEnOperativo, op.titulo);
    assert.ok(r.json.usuarios.some(u => u.agenteEnOperativo === null), 'quien no está de agente viene en null');
  });

  test('CU-34 · Helibase es un tipo de instalación SCI: toma su nombre', async () => {
    const r = await marc('POST', '', { clase: 'INSTALACION', tipoInstalacion: 'HELIBASE', lat: -31.41, lng: -64.81 });
    motivo(r, 201);
    assert.equal(r.json.marcador.tipoInstalacion, 'HELIBASE');
    assert.equal(r.json.marcador.nombre, 'Helibase');
    motivo(await marc('DELETE', `/${r.json.marcador.id}`), 204);
  });
});
