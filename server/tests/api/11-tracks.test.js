/**
 * Módulo 5 · Tracks GPX y cobertura (CU-29, CU-30, CU-36, CU-38), con las
 * decisiones del 12/10: el agente carga su recorrido desde el portal o el
 * coordinador lo carga en su nombre; el polígono se detecta por coordenadas
 * (≥ 30 % de los puntos); el .gpx original queda guardado; la cobertura se
 * recalcula sola (2 m por lado); del track sólo se corrigen polígono y notas.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, cuadrado } from '../ayudantes/entorno.js';

let ctx;
let P;            // polígono de los tracks
let T1, T2, T3;   // T1 adentro (de alfa), T2 casi todo afuera (de alfa), T3 del portal (de bravo)
let coberturaConT1;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

/** Un GPX con un punto por minuto desde `inicio`. `puntos` = [lng, lat, ele?]. */
function gpx(puntos, inicio) {
  const t0 = new Date(inicio).getTime();
  const pts = puntos.map(([lng, lat, ele], i) =>
    `<trkpt lat="${lat}" lon="${lng}">${ele === undefined ? '' : `<ele>${ele}</ele>`}` +
    `<time>${new Date(t0 + i * 60000).toISOString()}</time></trkpt>`).join('\n');
  return `<?xml version="1.0"?><gpx version="1.1" creator="pruebas"><trk><name>Recorrido de prueba</name><trkseg>\n${pts}\n</trkseg></trk></gpx>`;
}

// El polígono es cuadrado(40): de -64.95 a -64.945 de longitud y de -31.99 a -31.995 de latitud.
const ZIGZAG = Array.from({ length: 11 }, (_, k) => [-64.9495 + k * 0.0004, k % 2 ? -31.9945 : -31.9905, k % 2 ? 1910 : 1900]);
const CASI_AFUERA = [[-64.948, -31.992], [-64.9478, -31.9922],
  ...Array.from({ length: 8 }, (_, k) => [-64.944 + k * 0.0005, -31.992])];

const archivo = (contenido, nombre = 'recorrido.gpx') => ({ archivo: { nombre, contenido } });
const tracks = (ruta = '') => `/operativos/${ctx.op}/tracks${ruta}`;
const detallePol = async () => (await ctx.api('GET', `/operativos/${ctx.op}/poligonos/${P}`)).json.poligono;

describe('Módulo 5 · Tracks GPX y cobertura (CU-29, 30, 36, 38)', () => {
  before(async () => {
    ctx = await preparar();
    const r = await ctx.api('POST', `/operativos/${ctx.op}/poligonos`, { nombre: 'Track Quebrada', geometria: cuadrado(40) });
    motivo(r, 201);
    P = r.json.poligono.id;
  });
  after(terminar);

  test('CU-29 pasos 3-5 · analizar muestra puntos, horas, desnivel y el polígono detectado, sin guardar nada', async () => {
    const r = await ctx.subir(tracks('/analizar'), archivo(gpx(ZIGZAG, '2026-10-12T11:00:00Z')));
    motivo(r, 200);
    const a = r.json.analisis;
    assert.equal(a.puntos, 11);
    assert.equal(a.poligono?.nombre, 'Track Quebrada');
    assert.equal(a.deteccionPct, 100);
    assert.equal(a.duracionS, 600);
    assert.equal(a.conElevacion, true);
    assert.deepEqual([a.desnivelPositivoM, a.desnivelNegativoM], [50, 50]);
    assert.ok(a.distanciaM > 4000 && a.distanciaM < 5000, `distancia ${a.distanciaM}`);
    assert.equal((await ctx.api('GET', tracks())).json.tracks.length, 0, 'analizar no guarda');
  });

  test('CU-29 · el coordinador carga en nombre de un agente: queda en el polígono detectado y la cobertura se calcula sola', async () => {
    const r = await ctx.subir(tracks(), {
      ...archivo(gpx(ZIGZAG, '2026-10-12T11:00:00Z'), 'alfa-quebrada.gpx'),
      campos: { agenteOperativoId: ctx.agentes.alfa.id, notas: 'Cargado por radio' },
    });
    motivo(r, 201);
    T1 = r.json.track.id;
    assert.equal(r.json.track.poligonoId, P);
    assert.equal(r.json.track.agenteOperativoId, ctx.agentes.alfa.id);
    assert.notEqual(r.json.track.cargadoPor, r.json.track.agente, '«recorrido de» uno, «cargado por» otro');
    assert.equal(r.json.track.archivoNombre, 'alfa-quebrada.gpx');
    assert.equal(r.json.track.notas, 'Cargado por radio');
    assert.equal(r.json.track.geometria.type, 'LineString');

    const p = await detallePol();
    coberturaConT1 = p.coberturaPct;
    assert.ok(p.coberturaPct > 2 && p.coberturaPct < 20, `cobertura ${p.coberturaPct} %`);
    assert.ok(p.coberturaKm > 4, `km ${p.coberturaKm}`);
    assert.equal(p.tracks, 1);
    assert.deepEqual(p.listaTracks.map(t => t.id), [T1]);
    assert.equal(p.historial[0].tipo, 'TRACK_CARGADO');
  });

  test('CU-29 · el .gpx original queda guardado tal cual y se descarga con un enlace temporal', async () => {
    const r = await ctx.api('GET', tracks(`/${T1}`));
    motivo(r, 200);
    assert.match(r.json.track.archivoUrl ?? '', /^https:\/\//);
    const original = await (await fetch(r.json.track.archivoUrl)).text();
    assert.equal(original, gpx(ZIGZAG, '2026-10-12T11:00:00Z'));
  });

  test('CU-29 · el mismo recorrido dos veces (mismo agente, misma hora de inicio y fin) → 409 track_duplicado', async () => {
    const r = await ctx.subir(tracks(), {
      ...archivo(gpx(ZIGZAG, '2026-10-12T11:00:00Z')), campos: { agenteOperativoId: ctx.agentes.alfa.id },
    });
    motivo(r, 409, 'track_duplicado');
  });

  test('CU-29 paso 4 · con menos del 30 % de los puntos adentro queda «Fuera de polígono»', async () => {
    const r = await ctx.subir(tracks(), {
      ...archivo(gpx(CASI_AFUERA, '2026-10-12T13:00:00Z')), campos: { agenteOperativoId: ctx.agentes.alfa.id },
    });
    motivo(r, 201);
    T2 = r.json.track.id;
    assert.equal(r.json.track.poligonoId, null);
    assert.equal(r.json.track.deteccionPct, 20);
    assert.equal((await detallePol()).coberturaPct, coberturaConT1, 'no suma al polígono');
  });

  test('CU-30 · se corrige el polígono a mano: suma cobertura y queda en el historial de dónde vino', async () => {
    const r = await ctx.api('PUT', tracks(`/${T2}`), { poligonoId: P });
    motivo(r, 200);
    assert.equal(r.json.track.poligonoId, P);
    const p = await detallePol();
    assert.ok(p.coberturaPct > coberturaConT1, `${p.coberturaPct} > ${coberturaConT1}`);
    assert.equal(p.historial[0].tipo, 'TRACK_REASIGNADO');
    assert.equal(p.historial[0].detalle.desde, 'Fuera de polígono');
  });

  test('CU-30 · sólo se editan polígono y notas: horas o agente → 400 dato_no_editable; sin cambios → 400', async () => {
    motivo(await ctx.api('PUT', tracks(`/${T2}`), { inicio: '2026-10-12T10:00:00Z' }), 400, 'dato_no_editable');
    motivo(await ctx.api('PUT', tracks(`/${T2}`), { agenteOperativoId: ctx.agentes.bravo.id }), 400, 'dato_no_editable');
    motivo(await ctx.api('PUT', tracks(`/${T2}`), {}), 400, 'sin_cambios');
    const r = await ctx.api('PUT', tracks(`/${T2}`), { notas: '  GPS con poca señal  ' });
    motivo(r, 200);
    assert.equal(r.json.track.notas, 'GPS con poca señal');
  });

  test('CU-36 · eliminar un track es una baja con registro: deja de sumar cobertura', async () => {
    motivo(await ctx.api('DELETE', tracks(`/${T2}`)), 204);
    motivo(await ctx.api('GET', tracks(`/${T2}`)), 404, 'track_no_encontrado');
    const p = await detallePol();
    assert.equal(p.coberturaPct, coberturaConT1);
    assert.equal(p.historial[0].tipo, 'TRACK_ELIMINADO');
    const { rows: [fila] } = await ctx.query(`SELECT eliminado_en, eliminado_por FROM tracks_gpx WHERE id = $1`, [T2]);
    assert.ok(fila.eliminado_en && fila.eliminado_por, 'la fila sigue, dada de baja');
  });

  test('CU-29 flujo principal · el agente analiza y carga su propio recorrido desde el portal', async () => {
    const bravo = ctx.usuarios.bravo.token;
    const contenido = gpx(ZIGZAG.map(([x, y]) => [x + 0.0002, y]), '2026-10-12T15:00:00Z');   // sin elevación
    const a = await ctx.subir('/mis-tracks/analizar', archivo(contenido), bravo);
    motivo(a, 200);
    assert.equal(a.json.analisis.poligono?.id, P);
    assert.equal(a.json.analisis.conElevacion, false);
    assert.equal(a.json.analisis.desnivelPositivoM, null, 'sin elevación no se inventa desnivel');

    const r = await ctx.subir('/mis-tracks', archivo(contenido), bravo);
    motivo(r, 201);
    T3 = r.json.track.id;
    assert.equal(r.json.track.agenteOperativoId, ctx.agentes.bravo.id);
    assert.equal(r.json.track.cargadoPor, r.json.track.agente, 'lo cargó él mismo');
    assert.equal(r.json.track.geometria, undefined, 'el portal no recibe la línea');

    const mios = (await ctx.api('GET', '/mis-tracks', undefined, bravo)).json.tracks;
    assert.deepEqual(mios.map(t => t.id), [T3], 've sólo los suyos');
    assert.ok((await detallePol()).coberturaPct > coberturaConT1);
  });

  test('CU-29 · portal sin operativo en curso → 404 sin_operativo; un agente no usa la carga del coordinador → 403', async () => {
    motivo(await ctx.subir('/mis-tracks/analizar', archivo(gpx(ZIGZAG, '2026-10-12T17:00:00Z')), ctx.coordinador), 404, 'sin_operativo');
    assert.deepEqual((await ctx.api('GET', '/mis-tracks', undefined, ctx.coordinador)).json.tracks, []);
    motivo(await ctx.subir(tracks('/analizar'), archivo(gpx(ZIGZAG, '2026-10-12T17:00:00Z')), ctx.usuarios.bravo.token), 403);
  });

  test('CU-29 2.x · archivo faltante, que no es .gpx, sin puntos, o de un agente ajeno → rechazos claros', async () => {
    motivo(await ctx.subir(tracks('/analizar'), {}), 400, 'archivo_requerido');
    motivo(await ctx.subir(tracks('/analizar'), archivo('hola', 'notas.txt')), 400, 'archivo_no_gpx');
    motivo(await ctx.subir(tracks('/analizar'), archivo(gpx([[-64.948, -31.992]], '2026-10-12T18:00:00Z'))), 400, 'gpx_sin_puntos');
    motivo(await ctx.subir(tracks(), archivo(gpx(ZIGZAG, '2026-10-12T18:00:00Z'))), 400, 'agente_requerido');
    motivo(await ctx.subir(tracks(), {
      ...archivo(gpx(ZIGZAG, '2026-10-12T18:00:00Z')), campos: { agenteOperativoId: '00000000-0000-4000-8000-000000000000' },
    }), 404, 'agente_no_encontrado');
  });

  test('CU-36 · al eliminar el polígono sus tracks quedan «Fuera de polígono» (no se borran)', async () => {
    motivo(await ctx.api('DELETE', `/operativos/${ctx.op}/poligonos/${P}`), 204);
    const lista = (await ctx.api('GET', tracks())).json.tracks;
    assert.deepEqual(lista.map(t => [t.id, t.poligonoId]).sort(), [[T1, null], [T3, null]].sort());
  });
});
