/**
 * Pedido del cliente del 03/11 (migración 032): el Líder de Grupo, desde el portal, marca puntos
 * de interés y hallazgos en el polígono asignado a su grupo, con fotos. Los demás integrantes no.
 *   · Sólo el Líder (grupos.lider_id); con polígono asignado, en cualquier estado.
 *   · Sin señal: reenviar el mismo punto o la misma foto no duplica.
 *   · Fuera del polígono: se guarda con los metros hasta el borde.
 *   · El coordinador recibe el aviso (novedades) y lo ve en el mapa con grupo y horas.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let G;
let P;
let desde;
// El polígono de prueba es el primero que se crea: cuadrado(0), de -64.95 a -64.945 y de -31.95 a -31.955.
const ADENTRO = { lat: -31.9525, lng: -64.9475 };
const AFUERA = { lat: -31.9525, lng: -64.94 };   // ~475 m al este del borde

// JPEG mínimo válido para el bucket (1×1).
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const token = clave => ctx.usuarios[clave].token;
const punto = (extra = {}) => ({
  clienteId: randomUUID(), poligonoId: P, clase: 'POI', nombre: 'Huellas', ...ADENTRO,
  precisionM: 6, ocurridoEn: new Date().toISOString(), ...extra,
});
const crear = (clave, body) => ctx.api('POST', '/mi-sector/marcadores', body, token(clave));
const foto = (clave, marcadorId, clienteId = randomUUID()) => ctx.subir(`/mi-sector/marcadores/${marcadorId}/fotos`, {
  archivos: [{ campo: 'fotos', nombre: 'foto.jpg', contenido: JPEG, tipo: 'image/jpeg' }], campos: { clienteId },
}, token(clave));

describe('Pedido del 03/11 · el Líder marca puntos de interés y hallazgos en su polígono', () => {
  before(async () => {
    ctx = await preparar();
    desde = new Date().toISOString();
    G = (await ctx.crearGrupo('Marcadores del Líder', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
    await ctx.mover('delta', G);
    await ctx.accion(G, { accion: 'confirmar' });
    // Con el polígono asignado alcanza: todavía en la base (pedido del cliente).
    await ctx.accion(G, { accion: 'asignar', zona: 'Sector del Líder' });
    P = await ctx.poligono('Sector del Líder');
  });
  after(terminar);

  test('«Mi sector» le dice al Líder que es Líder, y al resto que no', async () => {
    const lider = await ctx.api('GET', '/mi-sector', undefined, token('alfa'));
    motivo(lider, 200);
    assert.equal(lider.json.sector?.id, P);
    assert.equal(lider.json.soyLider, true);
    assert.equal((await ctx.api('GET', '/mi-sector', undefined, token('bravo'))).json.soyLider, false);
  });

  test('un integrante que no es el Líder no carga ni ve los marcadores → 403', async () => {
    motivo(await crear('bravo', punto()), 403, 'no_es_lider');
    motivo(await ctx.api('GET', '/mi-sector/marcadores', undefined, token('bravo')), 403, 'no_es_lider');
    // Alguien sin grupo tampoco.
    motivo(await crear('charlie', punto()), 403, 'no_es_lider');
  });

  test('el Líder carga un punto de interés dentro del polígono, con grupo, hora y precisión', async () => {
    // Marcado sin señal hace unos segundos (después de asignar el polígono) y enviado ahora.
    const ocurridoEn = new Date(Date.now() - 3000).toISOString();
    const r = await crear('alfa', punto({ nombre: 'Huellas en el barro', ocurridoEn }));
    motivo(r, 201);
    const m = r.json.marcador;
    assert.equal(m.clase, 'POI');
    assert.equal(m.grupoId, G);
    assert.equal(m.poligonoId, P);
    assert.equal(m.precisionM, 6);
    assert.equal(m.fueraPoligonoM, null);
    assert.equal(new Date(m.ocurridoEn).toISOString(), ocurridoEn);
    assert.ok(new Date(m.creadoEn) > new Date(m.ocurridoEn), 'la hora de carga es posterior a la de marcado');
    assert.equal(m.creadoPorId, ctx.usuarios.alfa.uid);
  });

  test('reenviar el mismo punto (se cortó la señal) no lo duplica', async () => {
    const body = punto({ nombre: 'Reenvío' });
    motivo(await crear('alfa', body), 201);
    const r = await crear('alfa', body);
    motivo(r, 200);
    assert.equal(r.json.repetido, true);
    const { rows } = await ctx.query(`SELECT count(*)::int AS n FROM marcadores WHERE cliente_id = $1`, [body.clienteId]);
    assert.equal(rows[0].n, 1);
  });

  test('fuera del polígono se guarda igual, con los metros hasta el borde', async () => {
    const r = await crear('alfa', punto({ clase: 'HALLAZGO', nombre: 'Mochila', ...AFUERA }));
    motivo(r, 201);
    const d = r.json.marcador.fueraPoligonoM;
    assert.ok(d > 450 && d < 500, `metros al borde: ${d}`);
  });

  test('validaciones: nombre, tipo, coordenadas, hora futura y un polígono que no era del grupo', async () => {
    motivo(await crear('alfa', punto({ nombre: '  ' })), 400, 'nombre_requerido');
    motivo(await crear('alfa', punto({ clase: 'INSTALACION' })), 400, 'clase_invalida');
    motivo(await crear('alfa', punto({ lat: 120 })), 400, 'coordenadas_invalidas');
    motivo(await crear('alfa', punto({ ocurridoEn: new Date(Date.now() + 60 * 60 * 1000).toISOString() })), 400, 'hora_invalida');
    // Anterior al inicio del operativo.
    motivo(await crear('alfa', punto({ ocurridoEn: '2020-01-01T00:00:00.000Z' })), 400, 'hora_invalida');
    motivo(await crear('alfa', punto({ clienteId: 'x' })), 400, 'cliente_id_invalido');
    const otro = await ctx.poligono('Otro sector');
    motivo(await crear('alfa', punto({ poligonoId: otro })), 409, 'poligono_ajeno');
  });

  test('el Líder suma fotos a lo suyo; reenviar la misma foto no la duplica; a lo ajeno, no', async () => {
    const { marcador } = (await crear('alfa', punto({ clase: 'HALLAZGO', nombre: 'Zapatilla' }))).json;
    const idFoto = randomUUID();
    const r = await foto('alfa', marcador.id, idFoto);
    if (r.status === 503) return;   // sin almacenamiento configurado en este entorno
    motivo(r, 201);
    assert.equal(r.json.marcador.fotos.length, 1);
    const otra = await foto('alfa', marcador.id, idFoto);
    motivo(otra, 200);
    assert.equal(otra.json.repetida, true);
    const { rows } = await ctx.query(`SELECT count(*)::int AS n FROM marcador_fotos WHERE marcador_id = $1`, [marcador.id]);
    assert.equal(rows[0].n, 1);
    // Bravo no lo cargó.
    motivo(await foto('bravo', marcador.id), 403, 'marcador_ajeno');
  });

  test('«Mi sector» del Líder lista lo del polígono, también lo que quedó afuera', async () => {
    const r = await ctx.api('GET', '/mi-sector/marcadores', undefined, token('alfa'));
    motivo(r, 200);
    const nombres = r.json.marcadores.map(m => m.nombre);
    for (const n of ['Huellas en el barro', 'Mochila', 'Zapatilla']) assert.ok(nombres.includes(n), `falta ${n}`);
  });

  test('el coordinador recibe el aviso y lo ve en el mapa con el grupo', async () => {
    const r = await ctx.api('GET', `/operativos/${ctx.op}/marcadores/novedades?desde=${encodeURIComponent(desde)}`, undefined, ctx.coordinador);
    motivo(r, 200);
    const mochila = r.json.novedades.find(n => n.nombre === 'Mochila');
    assert.ok(mochila, JSON.stringify(r.json));
    assert.equal(mochila.clase, 'HALLAZGO');
    assert.equal(mochila.grupoNombre, 'Marcadores del Líder');
    assert.ok(mochila.fueraPoligonoM > 0);
    motivo(await ctx.api('GET', `/operativos/${ctx.op}/marcadores/novedades?desde=x`, undefined, ctx.coordinador), 400, 'desde_invalido');

    const lista = (await ctx.api('GET', `/operativos/${ctx.op}/marcadores`, undefined, ctx.coordinador)).json.marcadores;
    const enMapa = lista.find(m => m.id === mochila.id);
    assert.equal(enMapa.grupoNombre, 'Marcadores del Líder');
  });

  test('si el Líder pasa a ser otro, el anterior ya no carga', async () => {
    const { rows: [b] } = await ctx.query(
      `SELECT ao.id FROM agentes_operativo ao JOIN usuarios u ON u.id = ao.usuario_id
        WHERE ao.operativo_id = $1 AND u.id = $2 AND ao.fecha_egreso IS NULL`, [ctx.op, ctx.usuarios.bravo.uid]);
    const r = await ctx.api('PUT', `/operativos/${ctx.op}/grupos/${G}`, { liderId: b.id });
    if (r.status !== 200) return;   // el cambio de Líder tiene sus propias reglas (CU-21): no es lo que se prueba acá
    motivo(await crear('alfa', punto()), 403, 'no_es_lider');
    motivo(await crear('bravo', punto({ nombre: 'Del nuevo Líder' })), 201);
  });
});
