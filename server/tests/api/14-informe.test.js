/**
 * Módulo 6 · Informe por operativo (CU-41) y su emisión al finalizar (CU-10 paso 6).
 *
 * Cada informe queda guardado tal cual con su código y su huella SHA-256: lo
 * que se descarga tiene que ser byte a byte lo registrado, la base no deja
 * cambiarlo ni borrarlo, y la verificación pública no muestra datos personales.
 * El informe final se prueba sobre un operativo propio de la corrida
 * («PRUEBAS AUTOMÁTICAS - Informe …»), que se finaliza.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { preparar, terminar, api } from '../ayudantes/entorno.js';
import * as Storage from '../../src/services/storage.service.js';

let ctx;
let primero;
let opFinal;

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const informes = (m, ruta = '', body, token) => ctx.api(m, `/operativos/${ctx.op}/informes${ruta}`, body, token);
const bajar = async url => Buffer.from(await (await fetch(url)).arrayBuffer());
const sha = buf => createHash('sha256').update(buf).digest('hex');

describe('Módulo 6 · Informe por operativo (CU-41)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-41 2 · con el operativo abierto se emite un informe parcial', async () => {
    const r = await informes('GET');
    motivo(r, 200);
    assert.deepEqual(r.json.proximo, { tipo: 'PARCIAL', yaEmitido: false });
  });

  test('CU-41 3-7 · genera el PDF, lo guarda con código y huella, y lo que se descarga es idéntico a lo registrado', async () => {
    const r = await informes('POST');
    motivo(r, 201);
    primero = r.json.informe;
    assert.match(primero.codigo, /^INF-\d{4}-\d{4,}$/);
    assert.equal(primero.tipo, 'PARCIAL');
    assert.equal(r.json.archivoRuta, undefined, 'la ruta interna del archivo no sale de la API');
    assert.match(r.json.nombreArchivo, new RegExp(`^Informe parcial - PRUEBAS AUTOMÁTICAS - no tocar - \\d{4}-\\d{2}-\\d{2} \\d{2}h\\d{2}\\.pdf$`));

    const pdf = await bajar(r.json.url);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.length, primero.tamanoBytes);
    assert.equal(sha(pdf), primero.sha256, 'la huella registrada es la del archivo guardado');

    const { rows: [fila] } = await ctx.query(`SELECT sha256, corte_en, generado_por FROM informes_operativo WHERE id = $1`, [primero.id]);
    assert.equal(fila.sha256, primero.sha256);
    assert.ok(Math.abs(new Date(fila.corte_en) - Date.now()) < 120_000, 'el corte de un parcial es la hora de emisión');
  });

  test('CU-41 · cada descarga del botón es un informe nuevo, con el número siguiente del operativo', async () => {
    const r = await informes('POST');
    motivo(r, 201);
    assert.equal(r.json.informe.numeroEnOperativo, primero.numeroEnOperativo + 1);
    assert.notEqual(r.json.informe.codigo, primero.codigo);
    const lista = (await informes('GET')).json.informes;
    assert.equal(lista[0].codigo, r.json.informe.codigo, 'la lista va del más nuevo al más viejo');
  });

  test('CU-41 N2 · un informe anterior se vuelve a bajar idéntico', async () => {
    const r = await informes('GET', `/${primero.id}/descarga`);
    motivo(r, 200);
    assert.equal(sha(await bajar(r.json.url)), primero.sha256);
    motivo(await informes('GET', '/00000000-0000-4000-8000-000000000000/descarga'), 404);
  });

  test('CU-41 N1 · la verificación es pública y no muestra datos personales ni del contenido', async () => {
    const r = await api('GET', `/informes/verificar/${primero.codigo.toLowerCase()}`);
    motivo(r, 200);
    assert.deepEqual(Object.keys(r.json.informe).sort(),
      ['codigo', 'corteEn', 'generadoEn', 'operativoCodigo', 'sha256', 'tamanoBytes', 'tipo']);
    assert.equal(r.json.informe.sha256, primero.sha256);
    assert.match(r.json.informe.operativoCodigo, /^OP-[0-9A-F]{8}$/);
    motivo(await api('GET', '/informes/verificar/INF-1999-9999'), 404);
    motivo(await api('GET', '/informes/verificar/cualquier-cosa'), 404);
  });

  test('CU-41 · los informes emitidos no se modifican ni se borran (la base lo impide)', async () => {
    await assert.rejects(ctx.query(`UPDATE informes_operativo SET sha256 = repeat('0', 64) WHERE id = $1`, [primero.id]), /no se modifican ni se borran/);
    await assert.rejects(ctx.query(`DELETE FROM informes_operativo WHERE id = $1`, [primero.id]), /no se modifican ni se borran/);
  });

  test('CU-41 · un agente no genera informes → 403', async () => {
    motivo(await informes('POST', '', undefined, ctx.usuarios.alfa.token), 403);
  });

  test('CU-10 6 · al finalizar se emite el informe final; después el botón baja siempre esa copia', async () => {
    const c = await ctx.api('POST', '/operativos', {
      titulo: `PRUEBAS AUTOMÁTICAS - Informe ${Date.now()}`, localidad: 'Córdoba', fiscalInstruccion: 'Pruebas automatizadas',
      puntoCeroLat: -31.5, puntoCeroLng: -64.5, fechaHoraInicio: new Date().toISOString(),
    });
    motivo(c, 201);
    opFinal = c.json.operativo.id;
    await ctx.api('POST', `/operativos/${opFinal}/activar`, {});
    const f = await ctx.api('POST', `/operativos/${opFinal}/finalizar`, {});
    motivo(f, 200);
    assert.match(f.json.informeFinal?.codigo ?? '', /^INF-/, 'la finalización devuelve el código del informe final');

    const { rows: [fin] } = await ctx.query(
      `SELECT i.tipo, i.corte_en, o.fecha_hora_fin FROM informes_operativo i JOIN operativos o ON o.id = i.operativo_id WHERE i.operativo_id = $1`, [opFinal]);
    assert.equal(fin.tipo, 'FINAL');
    assert.equal(new Date(fin.corte_en).getTime(), new Date(fin.fecha_hora_fin).getTime(), 'el final cubre hasta el fin del operativo');

    const l = await ctx.api('GET', `/operativos/${opFinal}/informes`);
    assert.deepEqual(l.json.proximo, { tipo: 'FINAL', yaEmitido: true });
    const g = await ctx.api('POST', `/operativos/${opFinal}/informes`);
    motivo(g, 200);
    assert.equal(g.json.nuevo, false);
    assert.equal(g.json.informe.codigo, f.json.informeFinal.codigo, 'no se genera otro: se descarga el mismo final');
    const { rows: [n] } = await ctx.query(`SELECT count(*)::int AS n FROM informes_operativo WHERE operativo_id = $1`, [opFinal]);
    assert.equal(n.n, 1);
  });

  test('CU-41 2.1 · si el final no se pudo emitir al finalizar, se emite la próxima vez que se toca «Informe»', async () => {
    // Simula la falla: el operativo finalizado sin su informe final (el permiso de borrar es sólo para esta prueba).
    const { rows } = await ctx.query(`SELECT archivo_ruta FROM informes_operativo WHERE operativo_id = $1`, [opFinal]);
    await ctx.query(`BEGIN; SET LOCAL duar.limpieza_pruebas = 'si'; DELETE FROM informes_operativo WHERE operativo_id = '${opFinal}'; COMMIT;`);
    await Storage.borrarInformes(rows.map(r => r.archivo_ruta));
    const g = await ctx.api('POST', `/operativos/${opFinal}/informes`);
    motivo(g, 201);
    assert.equal(g.json.informe.tipo, 'FINAL');
  });
});
