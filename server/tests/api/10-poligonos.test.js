/**
 * Módulo 5 · Polígonos y sus grupos (CU-29, CU-30, CU-37, CU-38, CU-39), con
 * las decisiones del 12/10: el polígono no tiene estado; a lo sumo un grupo de
 * rastrillaje más especiales; sólo se asignan grupos Confirmados; un grupo en
 * un solo polígono a la vez; al replegarse sale solo; eliminar es una baja con
 * registro y no se puede con un grupo trabajando en el terreno.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, cuadrado } from '../ayudantes/entorno.js';

let ctx;
let A, B, E;      // grupos: A y B de rastrillaje, E especial
let P1, P2;       // polígonos
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const pol = (m, ruta = '', body) => ctx.api(m, `/operativos/${ctx.op}/poligonos${ruta}`, body);
const grupo = async id => (await ctx.api('GET', `/operativos/${ctx.op}/grupos`)).json.grupos.find(g => g.id === id);
const detalle = async id => (await pol('GET', `/${id}`)).json.poligono;
const asignar = (p, g) => pol('POST', `/${p}/grupos`, { grupoId: g });
const tipos = d => d.historial.map(e => e.tipo);

describe('Módulo 5 · Polígonos y sus grupos (CU-29, 30, 37, 38, 39)', () => {
  before(async () => {
    ctx = await preparar();
    A = (await ctx.crearGrupo('Poli A', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', A);
    B = (await ctx.crearGrupo('Poli B', 'charlie')).json.grupo.id;
    await ctx.mover('delta', B);
    await ctx.accion(B, { accion: 'confirmar' });
    E = (await ctx.crearGrupo('Poli Dron', 'foxtrot', 'ESPECIAL')).json.grupo.id;
    await ctx.accion(E, { accion: 'confirmar' });
  });
  after(terminar);

  test('CU-29 · dibujar un polígono: la base calcula área y perímetro; nace sin grupos, con cobertura 0 y «Creado» en su historial', async () => {
    const r = await pol('POST', '', { nombre: 'Quebrada Norte', geometria: cuadrado(20), notas: 'Pendiente fuerte' });
    motivo(r, 201);
    P1 = r.json.poligono.id;
    assert.equal(r.json.poligono.geometria.type, 'Polygon');
    assert.ok(r.json.poligono.areaM2 > 200000 && r.json.poligono.areaM2 < 400000, `área ${r.json.poligono.areaM2}`);
    assert.ok(r.json.poligono.perimetroM > 1800 && r.json.poligono.perimetroM < 2400);
    assert.equal(r.json.poligono.coberturaPct, 0);
    assert.deepEqual(r.json.poligono.grupos, []);
    assert.deepEqual(tipos(r.json.poligono), ['CREADO']);
    assert.equal(r.json.poligono.estado, undefined, 'el polígono no tiene estado');
  });

  test('CU-29 4.2 · nombre repetido en el operativo (sin importar mayúsculas) → 409 nombre_duplicado', async () => {
    motivo(await pol('POST', '', { nombre: 'QUEBRADA NORTE', geometria: cuadrado(21) }), 409, 'nombre_duplicado');
  });

  test('CU-29 2.3 · bordes cruzados → 400 geometria_invalida', async () => {
    const mono = { type: 'Polygon', coordinates: [[[-64.9, -31.9], [-64.89, -31.91], [-64.89, -31.9], [-64.9, -31.91], [-64.9, -31.9]]] };
    motivo(await pol('POST', '', { nombre: 'Moño', geometria: mono }), 400, 'geometria_invalida');
  });

  test('CU-29 · nombre de menos de 3 caracteres o menos de 3 vértices → 400', async () => {
    motivo(await pol('POST', '', { nombre: 'Ab', geometria: cuadrado(22) }), 400, 'nombre_invalido');
    const linea = { type: 'Polygon', coordinates: [[[-64.9, -31.9], [-64.89, -31.9], [-64.9, -31.9]]] };
    motivo(await pol('POST', '', { nombre: 'Línea', geometria: linea }), 400, 'geometria_invalida');
  });

  test('CU-30 · sólo se asigna un grupo Confirmado (uno En formación → 409)', async () => {
    motivo(await asignar(P1, A), 409, 'transicion_invalida');
  });

  test('CU-30 · asignar un grupo Confirmado → Asignado; el grupo muestra su polígono', async () => {
    await ctx.accion(A, { accion: 'confirmar' });
    const r = await asignar(P1, A);
    motivo(r, 200);
    assert.deepEqual(r.json.poligono.grupos.map(g => g.nombre), ['Poli A']);
    const g = await grupo(A);
    assert.equal(g.estado, 'ASIGNADO');
    assert.equal(g.poligonoId, P1);
    assert.equal(g.zonaAsignada, 'Quebrada Norte');
  });

  test('CU-30 · un segundo grupo de rastrillaje en el mismo polígono → 409 poligono_con_rastrillaje', async () => {
    motivo(await asignar(P1, B), 409, 'poligono_con_rastrillaje');
    assert.equal((await grupo(B)).estado, 'CONFIRMADO', 'el rechazo no cambia nada');
  });

  test('CU-30 · un grupo especial sí entra junto al de rastrillaje', async () => {
    const r = await asignar(P1, E);
    motivo(r, 200);
    assert.deepEqual(r.json.poligono.grupos.map(g => g.nombre), ['Poli A', 'Poli Dron']);
  });

  test('CU-30 · un grupo está en un solo polígono a la vez', async () => {
    P2 = (await pol('POST', '', { nombre: 'Filo del Cerro', geometria: cuadrado(23) })).json.poligono.id;
    motivo(await asignar(P2, A), 409, 'transicion_invalida');
  });

  test('CU-30 A1 · cambiar el grupo (el actual está Asignado): el anterior vuelve a Confirmado', async () => {
    const r = await pol('POST', `/${P1}/grupos/${A}/cambiar`, { nuevoGrupoId: B });
    motivo(r, 200);
    assert.deepEqual(r.json.poligono.grupos.map(g => g.nombre).sort(), ['Poli B', 'Poli Dron']);
    assert.equal((await grupo(A)).estado, 'CONFIRMADO');
    assert.equal((await grupo(B)).estado, 'ASIGNADO');
    assert.ok(tipos(await detalle(P1)).includes('GRUPO_CAMBIADO'));
  });

  test('CU-30 A2.1 · quitar un grupo Asignado: vuelve a Confirmado y queda libre', async () => {
    motivo(await pol('POST', `/${P1}/grupos/${B}/quitar`, {}), 200);
    const g = await grupo(B);
    assert.equal(g.estado, 'CONFIRMADO');
    assert.equal(g.poligonoId, null);
  });

  test('CU-30 A2.2 · quitar un grupo en el terreno pide confirmación; confirmado, el grupo sigue en el terreno sin polígono', async () => {
    await asignar(P1, A);
    await ctx.accion(A, { accion: 'salir' });
    motivo(await pol('POST', `/${P1}/grupos/${A}/quitar`, {}), 409, 'requiere_confirmacion');
    motivo(await pol('POST', `/${P1}/grupos/${A}/quitar`, { confirmar: true }), 200);
    const g = await grupo(A);
    assert.equal(g.estado, 'DESPLEGADO');
    assert.equal(g.poligonoId, null);
    const linea = (await ctx.api('GET', `/operativos/${ctx.op}/grupos/${A}/linea-tiempo`)).json;
    assert.ok(JSON.stringify(linea).includes('quitar_poligono'), 'queda en la línea de tiempo del grupo');
  });

  test('CU-30 A3 · al pasar a Replegado el grupo sale solo del polígono', async () => {
    motivo(await asignar(P2, B), 200);
    await ctx.accion(B, { accion: 'salir' });
    await ctx.accion(B, { accion: 'llegar_poligono' });
    await ctx.accion(B, { accion: 'volver' });
    const d = await detalle(P2);
    assert.deepEqual(d.grupos, []);
    assert.ok(tipos(d).includes('GRUPO_REPLEGADO'));
    assert.deepEqual(d.asistieron.map(g => g.nombre), ['Poli B'], 'queda entre los grupos que asistieron');
  });

  test('CU-38 · no se elimina un polígono con un grupo trabajando en él', async () => {
    await ctx.accion(E, { accion: 'salir' });
    motivo(await pol('DELETE', `/${P1}`), 409, 'grupo_en_terreno');
    assert.ok(await detalle(P1), 'sigue vigente');
  });

  test('CU-38 · eliminar con un grupo Asignado: el grupo vuelve a Confirmado y el polígono deja de verse', async () => {
    await ctx.accion(B, { accion: 'llegar_base' });
    await ctx.accion(B, { accion: 'confirmar' });
    const P3 = (await pol('POST', '', { nombre: 'Bosque de Tabaquillos', geometria: cuadrado(24) })).json.poligono.id;
    motivo(await asignar(P3, B), 200);
    motivo(await pol('DELETE', `/${P3}`), 204);
    assert.equal((await grupo(B)).estado, 'CONFIRMADO');
    motivo(await pol('GET', `/${P3}`), 404, 'poligono_no_encontrado');
    const lista = (await pol('GET')).json.poligonos.map(p => p.id);
    assert.ok(!lista.includes(P3));
    const { rows } = await ctx.query(`SELECT eliminado_en, eliminado_por FROM poligonos WHERE id = $1`, [P3]);
    assert.ok(rows[0].eliminado_en && rows[0].eliminado_por, 'baja con registro: queda quién y cuándo');
  });

  test('CU-38 · el nombre de un polígono eliminado se puede volver a usar', async () => {
    motivo(await pol('POST', '', { nombre: 'Bosque de Tabaquillos', geometria: cuadrado(25) }), 201);
  });

  test('CU-37 · cambiar nombre, notas y forma deja cada cambio en el historial', async () => {
    const antes = await detalle(P2);
    const grande = cuadrado(26, 0.008);
    const r = await pol('PUT', `/${P2}`, { nombre: 'Filo del Cerro Sur', notas: 'Acceso por la tranquera', geometria: grande });
    motivo(r, 200);
    assert.equal(r.json.poligono.nombre, 'Filo del Cerro Sur');
    assert.ok(r.json.poligono.areaM2 > antes.areaM2, 'la base recalculó el área');
    const t = tipos(r.json.poligono);
    for (const tipo of ['NOMBRE', 'NOTAS', 'GEOMETRIA']) assert.ok(t.includes(tipo), tipo);
  });

  test('CU-37 · sin cambios → 400; nombre de otro polígono → 409', async () => {
    motivo(await pol('PUT', `/${P2}`, {}), 400, 'sin_cambios');
    motivo(await pol('PUT', `/${P2}`, { nombre: 'Quebrada Norte' }), 409, 'nombre_duplicado');
  });

  test('CU-39 · el detalle trae grupos que asistieron e historial, del más reciente al más viejo', async () => {
    const d = await detalle(P1);
    assert.deepEqual(d.asistieron.map(g => g.nombre), ['Poli A', 'Poli Dron', 'Poli B']);
    const fechas = d.historial.map(e => new Date(e.registradoEn).getTime());
    assert.deepEqual(fechas, [...fechas].sort((x, y) => y - x));
    assert.equal(d.historial.at(-1).tipo, 'CREADO');
    assert.ok(d.historial.every(e => e.registradoPor), 'cada evento dice quién lo registró');
  });

  test('CU-30 · desde el tablero: asignar exige polígono y desasignar devuelve a Confirmado', async () => {
    motivo(await ctx.accion(B, { accion: 'asignar' }), 400, 'poligono_requerido');
    motivo(await ctx.accion(B, { accion: 'asignar', poligonoId: P2 }), 200);
    const r = await ctx.accion(B, { accion: 'desasignar' });
    motivo(r, 200);
    assert.equal(r.json.grupo.estado, 'CONFIRMADO');
    assert.equal(r.json.grupo.poligonoId, null);
  });

  test('CU-26 · disolver un grupo Asignado lo saca del polígono', async () => {
    motivo(await ctx.accion(B, { accion: 'asignar', poligonoId: P2 }), 200);
    motivo(await ctx.disolver(B), 204);
    const d = await detalle(P2);
    assert.deepEqual(d.grupos, []);
    assert.ok(tipos(d).includes('GRUPO_SALIO'));
  });
});
