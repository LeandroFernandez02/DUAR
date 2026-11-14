/**
 * Decisión del 13/11: el Líder de un grupo carga desde el portal el .gpx de cualquier integrante
 * de su grupo (por ejemplo, el conductor que tuvo que rastrillar). Queda «recorrido de» el
 * integrante y «cargado por» el Líder. 14/11: el integrante carga el suyo sólo en el terreno
 * (Desplegado, Rastrillando o Replegado); el Líder, en cualquier estado.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, cuadrado } from '../ayudantes/entorno.js';

let ctx;
let G;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

function gpx(inicio, corrimiento = 0) {
  const t0 = new Date(inicio).getTime();
  const pts = Array.from({ length: 11 }, (_, k) => [-64.9495 + k * 0.0004 + corrimiento, k % 2 ? -31.9945 : -31.9905])
    .map(([lng, lat], i) => `<trkpt lat="${lat}" lon="${lng}"><time>${new Date(t0 + i * 60000).toISOString()}</time></trkpt>`).join('\n');
  return { archivo: { nombre: 'recorrido.gpx', contenido: `<?xml version="1.0"?><gpx version="1.1" creator="pruebas"><trk><trkseg>\n${pts}\n</trkseg></trk></gpx>` } };
}
const conAgente = (datos, agenteOperativoId) => ({ ...datos, campos: { agenteOperativoId } });
const token = clave => ctx.usuarios[clave].token;

describe('13/11 · el Líder carga el recorrido de un integrante de su grupo', () => {
  before(async () => {
    ctx = await preparar();
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/poligonos`, { nombre: 'Tracks del Líder', geometria: cuadrado(40) }), 201);
    G = (await ctx.crearGrupo('Tracks del Líder', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
  });
  after(terminar);

  test('el Líder carga el de un integrante: queda a nombre del integrante y cargado por el Líder', async () => {
    const r = await ctx.subir('/mis-tracks', conAgente(gpx('2026-11-13T10:00:00Z'), ctx.agentes.bravo.id), token('alfa'));
    motivo(r, 201);
    assert.equal(r.json.track.agenteOperativoId, ctx.agentes.bravo.id);
    assert.notEqual(r.json.track.cargadoPor, r.json.track.agente);

    // El Líder lo ve en su lista (lo cargó él) y el integrante también (es suyo).
    const delLider = (await ctx.api('GET', '/mis-tracks', undefined, token('alfa'))).json.tracks;
    assert.ok(delLider.some(t => t.id === r.json.track.id));
    const delIntegrante = (await ctx.api('GET', '/mis-tracks', undefined, token('bravo'))).json.tracks;
    assert.ok(delIntegrante.some(t => t.id === r.json.track.id));
  });

  test('14/11 · en la base el integrante no carga el suyo (se lo pasa al Líder); el Líder sí, en cualquier estado', async () => {
    motivo(await ctx.subir('/mis-tracks', gpx('2026-11-13T11:00:00Z', 0.0001), token('bravo')), 409, 'fuera_del_terreno');
    motivo(await ctx.subir('/mis-tracks/analizar', gpx('2026-11-13T11:00:00Z', 0.0001), token('bravo')), 409, 'fuera_del_terreno');
    const propio = await ctx.subir('/mis-tracks', gpx('2026-11-13T11:30:00Z', 0.0002), token('alfa'));
    motivo(propio, 201);
    assert.equal(propio.json.track.agenteOperativoId, ctx.agentes.alfa.id);
  });

  test('14/11 · en el terreno el integrante carga el suyo, sin elegir a nadie', async () => {
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 200);
    motivo(await ctx.accion(G, { accion: 'asignar', zona: 'Tracks del Líder en terreno' }), 200);
    motivo(await ctx.accion(G, { accion: 'salir' }), 200);
    const r = await ctx.subir('/mis-tracks', gpx('2026-11-13T12:00:00Z', 0.0001), token('bravo'));
    motivo(r, 201);
    assert.equal(r.json.track.agenteOperativoId, ctx.agentes.bravo.id);
  });

  test('un integrante que no es Líder no carga por otro; el Líder no carga por alguien de afuera del grupo', async () => {
    motivo(await ctx.subir('/mis-tracks', conAgente(gpx('2026-11-13T12:00:00Z'), ctx.agentes.alfa.id), token('bravo')), 403, 'no_es_lider');
    motivo(await ctx.subir('/mis-tracks', conAgente(gpx('2026-11-13T12:30:00Z'), ctx.agentes.charlie.id), token('alfa')), 403, 'no_es_del_grupo');
    motivo(await ctx.subir('/mis-tracks', conAgente(gpx('2026-11-13T13:00:00Z'), 'x'), token('alfa')), 400, 'agente_requerido');
  });
});
