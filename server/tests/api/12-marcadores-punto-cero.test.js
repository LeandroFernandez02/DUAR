/**
 * Módulo 5 · Marcadores, Punto Cero y radios (CU-34, CU-35, CU-36, CU-38; y
 * el Punto Cero de CU-08 / CU-09), con las decisiones del 12/10: un hallazgo
 * es evidencia (no se elimina, no cambia de clase, sus fotos no se quitan);
 * sólo las instalaciones se reubican; el Punto Cero tiene historial y, con el
 * operativo en curso, moverlo pide motivo; los radios son del operativo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let POI, HALLAZGO, INST, R2K;
let opNuevo;   // operativo propio de esta corrida, para probar el estado NUEVO

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const marc = (m, ruta = '', body) => ctx.api(m, `/operativos/${ctx.op}/marcadores${ruta}`, body);
const radios = (m, ruta = '', body) => ctx.api(m, `/operativos/${ctx.op}/radios${ruta}`, body);

// Una imagen PNG de 1×1 (la más chica posible) para las fotos.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fotos = (n) => ({ archivos: Array.from({ length: n }, (_, i) => ({ campo: 'fotos', nombre: `pista-${i}.png`, contenido: PNG, tipo: 'image/png' })) });

describe('Módulo 5 · Marcadores, Punto Cero y radios (CU-34, 35, 36, 38)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  /* ── Marcadores ── */

  test('CU-34 · marcar un punto de interés: queda con coordenadas, autor y hora', async () => {
    const r = await marc('POST', '', { clase: 'POI', nombre: 'Refugio Los Gigantes', descripcion: 'Techo de chapa', lat: -31.40, lng: -64.80 });
    motivo(r, 201);
    POI = r.json.marcador.id;
    assert.equal(r.json.marcador.clase, 'POI');
    assert.equal(r.json.marcador.lat, -31.4);
    assert.ok(r.json.marcador.creadoPor && r.json.marcador.creadoEn);
    assert.deepEqual(r.json.marcador.fotos, []);
  });

  test('CU-34 · una instalación toma el nombre de su tipo; lleva responsable y notas', async () => {
    const r = await marc('POST', '', { clase: 'INSTALACION', tipoInstalacion: 'HELIPUNTO', responsable: 'Of. Pérez', lat: -31.41, lng: -64.81 });
    motivo(r, 201);
    INST = r.json.marcador.id;
    assert.equal(r.json.marcador.nombre, 'Helipunto');
    assert.equal(r.json.marcador.responsable, 'Of. Pérez');
  });

  test('CU-34 3.1 / 4.1 · sin nombre, sin tipo de instalación, coordenadas inválidas o datos de otra clase → 400', async () => {
    motivo(await marc('POST', '', { clase: 'HALLAZGO', nombre: '   ', lat: -31.4, lng: -64.8 }), 400, 'nombre_requerido');
    motivo(await marc('POST', '', { clase: 'INSTALACION', lat: -31.4, lng: -64.8 }), 400, 'tipo_invalido');
    motivo(await marc('POST', '', { clase: 'INSTALACION', tipoInstalacion: 'BUNKER', lat: -31.4, lng: -64.8 }), 400, 'tipo_invalido');
    motivo(await marc('POST', '', { clase: 'POI', nombre: 'X', lat: 95, lng: -64.8 }), 400, 'coordenadas_invalidas');
    motivo(await marc('POST', '', { clase: 'POI', nombre: 'X', responsable: 'Y', lat: -31.4, lng: -64.8 }), 400, 'campo_no_corresponde');
    motivo(await marc('POST', '', { clase: 'OTRA', nombre: 'X', lat: -31.4, lng: -64.8 }), 400, 'clase_invalida');
  });

  test('CU-34 · un hallazgo con fotos; las fotos salen con enlace firmado', async () => {
    const r = await marc('POST', '', { clase: 'HALLAZGO', nombre: 'Campera roja', detalle: 'Talle M, junto al arroyo', lat: -31.42, lng: -64.82 });
    motivo(r, 201);
    HALLAZGO = r.json.marcador.id;
    const f = await ctx.subir(`/operativos/${ctx.op}/marcadores/${HALLAZGO}/fotos`, fotos(2));
    motivo(f, 201);
    assert.equal(f.json.marcador.fotos.length, 2);
    assert.match(f.json.marcador.fotos[0].url ?? '', /^https:\/\//);
  });

  test('CU-38 · un hallazgo no se elimina, no pasa a punto de interés y sus fotos no se quitan', async () => {
    motivo(await marc('DELETE', `/${HALLAZGO}`), 409, 'hallazgo_no_se_elimina');
    motivo(await marc('PUT', `/${HALLAZGO}`, { clase: 'POI' }), 409, 'hallazgo_fijo');
    const { fotos: [foto] } = (await marc('GET', `/${HALLAZGO}`)).json.marcador;
    motivo(await marc('DELETE', `/${HALLAZGO}/fotos/${foto.id}`), 409, 'foto_de_hallazgo');
    // La base lo garantiza también, aunque alguien lo intente por fuera de la API.
    await assert.rejects(ctx.query(`UPDATE marcadores SET eliminado_en = now() WHERE id = $1`, [HALLAZGO]));
    await assert.rejects(ctx.query(`UPDATE marcadores SET clase = 'POI' WHERE id = $1`, [HALLAZGO]));
  });

  test('CU-35 · se corrigen los datos de un hallazgo (nombre vacío no) y un punto de interés puede pasar a hallazgo', async () => {
    motivo(await marc('PUT', `/${HALLAZGO}`, { nombre: '' }), 400, 'nombre_requerido');
    const r = await marc('PUT', `/${HALLAZGO}`, { detalle: 'Talle M, mojada, junto al arroyo' });
    motivo(r, 200);
    assert.equal(r.json.marcador.detalle, 'Talle M, mojada, junto al arroyo');
    motivo(await marc('PUT', `/${HALLAZGO}`, { detalle: 'Talle M, mojada, junto al arroyo' }), 400, 'sin_cambios');

    const p = await ctx.api('POST', `/operativos/${ctx.op}/marcadores`, { clase: 'POI', nombre: 'Mochila', lat: -31.43, lng: -64.83 });
    const r2 = await marc('PUT', `/${p.json.marcador.id}`, { clase: 'HALLAZGO' });
    motivo(r2, 200);
    assert.equal(r2.json.marcador.clase, 'HALLAZGO');
  });

  test('CU-35 2.x · sólo una instalación se reubica (y queda la ubicación anterior en la auditoría)', async () => {
    motivo(await marc('PUT', `/${POI}`, { lat: -31.401, lng: -64.801 }), 409, 'no_se_reubica');
    motivo(await marc('PUT', `/${HALLAZGO}`, { lat: -31.421, lng: -64.821 }), 409, 'no_se_reubica');
    const r = await marc('PUT', `/${INST}`, { lat: -31.415, lng: -64.815 });
    motivo(r, 200);
    assert.deepEqual([r.json.marcador.lat, r.json.marcador.lng], [-31.415, -64.815]);
    const { rows: [a] } = await ctx.query(
      `SELECT valores_previos->>'lat' AS lat FROM logs_auditoria WHERE entidad_afectada = 'marcadores' AND registro_id = $1
        ORDER BY creado_en DESC LIMIT 1`, [INST]);
    assert.equal(Number(a.lat), -31.41);
    motivo(await marc('PUT', `/${INST}`, { clase: 'POI' }), 409, 'clase_no_cambia');
  });

  test('CU-34 · fotos: hasta 8 por marcador, no en instalaciones, y las de un punto de interés se quitan', async () => {
    motivo(await ctx.subir(`/operativos/${ctx.op}/marcadores/${INST}/fotos`, fotos(1)), 409, 'sin_fotos');
    motivo(await ctx.subir(`/operativos/${ctx.op}/marcadores/${HALLAZGO}/fotos`, fotos(7)), 409, 'demasiadas_fotos');
    const f = await ctx.subir(`/operativos/${ctx.op}/marcadores/${POI}/fotos`, fotos(1));
    motivo(f, 201);
    motivo(await marc('DELETE', `/${POI}/fotos/${f.json.marcador.fotos[0].id}`), 204);
    assert.equal((await marc('GET', `/${POI}`)).json.marcador.fotos.length, 0);
  });

  test('CU-38 · eliminar un punto de interés o una instalación: baja con registro, sale de la lista', async () => {
    motivo(await marc('DELETE', `/${POI}`), 204);
    motivo(await marc('DELETE', `/${INST}`), 204);
    const ids = (await marc('GET')).json.marcadores.map(m => m.id);
    assert.ok(!ids.includes(POI) && !ids.includes(INST) && ids.includes(HALLAZGO));
    const { rows: [f] } = await ctx.query(`SELECT eliminado_en, eliminado_por FROM marcadores WHERE id = $1`, [POI]);
    assert.ok(f.eliminado_en && f.eliminado_por, 'la fila sigue, dada de baja');
  });

  /* ── Radios ── */

  test('CU-36 R1 · agregar radios; la misma distancia dos veces → 409 «Ya existe un radio de 2 km»', async () => {
    const r = await radios('POST', '', { radioM: 2000, color: '#e54b4b' });
    motivo(r, 201);
    R2K = r.json.radio.id;
    assert.equal(r.json.radio.color, '#E54B4B');
    motivo(await radios('POST', '', { radioM: 500, color: '#0891B2' }), 201);
    const dup = await radios('POST', '', { radioM: 2000, color: '#000000' });
    motivo(dup, 409, 'radio_duplicado');
    assert.equal(dup.json.error, 'Ya existe un radio de 2 km.');
    assert.deepEqual((await radios('GET')).json.radios.map(x => x.radioM), [500, 2000]);
  });

  test('CU-36 R1-R2 · valores fuera de rango o color inválido → 400; cambiar km y color; quitar', async () => {
    motivo(await radios('POST', '', { radioM: 10, color: '#000000' }), 400, 'radio_invalido');
    motivo(await radios('POST', '', { radioM: 3000, color: 'rojo' }), 400, 'color_invalido');
    motivo(await radios('PUT', `/${R2K}`, { radioM: 500 }), 409, 'radio_duplicado');
    const r = await radios('PUT', `/${R2K}`, { radioM: 3000, color: '#16A34A' });
    motivo(r, 200);
    assert.deepEqual([r.json.radio.radioM, r.json.radio.color], [3000, '#16A34A']);
    motivo(await radios('DELETE', `/${R2K}`), 204);
    assert.deepEqual((await radios('GET')).json.radios.map(x => x.radioM), [500]);
  });

  /* ── Punto Cero ── */

  test('CU-36 · con el operativo en curso, mover el Punto Cero pide motivo; queda en el historial con la distancia', async () => {
    const antes = (await ctx.api('GET', `/operativos/${ctx.op}/punto-cero`)).json;
    const destino = { lat: antes.puntoCero.lat + 0.01, lng: antes.puntoCero.lng };   // ~1,1 km al norte
    motivo(await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, destino), 400, 'motivo_requerido');
    motivo(await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { lat: 91, lng: 0, motivo: 'x' }), 400, 'coordenadas_invalidas');

    const r = await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { ...destino, motivo: 'Hallazgo de la campera roja' });
    motivo(r, 200);
    assert.ok(Math.abs(r.json.puntoCero.lat - destino.lat) < 1e-9);
    const [ultimo] = r.json.historial;
    assert.equal(ultimo.motivo, 'Hallazgo de la campera roja');
    assert.ok(ultimo.distanciaM > 1000 && ultimo.distanciaM < 1200, `distancia ${ultimo.distanciaM}`);
    assert.ok(Math.abs(ultimo.desdeLat - antes.puntoCero.lat) < 1e-9);
    assert.equal(r.json.historial.length, antes.historial.length + 1);
    motivo(await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { ...destino, motivo: 'otra vez' }), 400, 'sin_cambios');
  });

  test('CU-08 / CU-09 · el historial arranca al crear el operativo; en NUEVO se corrige sin motivo; en curso, «Editar operativo» también pide motivo', async () => {
    const titulo = `PRUEBAS AUTOMÁTICAS - Punto Cero ${Date.now()}`;
    const c = await ctx.api('POST', '/operativos', {
      titulo, localidad: 'Córdoba', fiscalInstruccion: 'Pruebas automatizadas',
      puntoCeroLat: -31.5, puntoCeroLng: -64.5, fechaHoraInicio: new Date().toISOString(),
    });
    motivo(c, 201);
    opNuevo = c.json.operativo.id;
    let h = (await ctx.api('GET', `/operativos/${opNuevo}/punto-cero`)).json.historial;
    assert.equal(h.length, 1);
    assert.equal(h[0].desdeLat, null, 'la definición inicial no tiene «desde»');

    // NUEVO (nadie entró todavía): se corrige sin motivo.
    motivo(await ctx.api('PUT', `/operativos/${opNuevo}/punto-cero`, { lat: -31.51, lng: -64.5 }), 200);

    await ctx.api('POST', `/operativos/${opNuevo}/activar`, {});
    const base = { titulo, localidad: 'Córdoba', fiscalInstruccion: 'Pruebas automatizadas' };
    // Sin mover el punto, editar el operativo no pide motivo.
    motivo(await ctx.api('PUT', `/operativos/${opNuevo}`, { ...base, puntoCeroLat: -31.51, puntoCeroLng: -64.5 }), 200);
    motivo(await ctx.api('PUT', `/operativos/${opNuevo}`, { ...base, puntoCeroLat: -31.52, puntoCeroLng: -64.5 }), 400, 'motivo_requerido');
    motivo(await ctx.api('PUT', `/operativos/${opNuevo}`, {
      ...base, puntoCeroLat: -31.52, puntoCeroLng: -64.5, motivoPuntoCero: 'Testigo lo vio más al sur',
    }), 200);
    h = (await ctx.api('GET', `/operativos/${opNuevo}/punto-cero`)).json.historial;
    assert.deepEqual(h.map(x => x.motivo), ['Testigo lo vio más al sur', null, null]);
  });

  test('CU-36 / CU-38 · con el operativo finalizado el mapa es de sólo lectura', async () => {
    motivo(await ctx.api('POST', `/operativos/${opNuevo}/finalizar`, {}), 200);
    motivo(await ctx.api('PUT', `/operativos/${opNuevo}/punto-cero`, { lat: -31.6, lng: -64.5, motivo: 'x' }), 409, 'operativo_cerrado');
    motivo(await ctx.api('POST', `/operativos/${opNuevo}/radios`, { radioM: 1000, color: '#000000' }), 409, 'operativo_cerrado');
    motivo(await ctx.api('POST', `/operativos/${opNuevo}/marcadores`, { clase: 'POI', nombre: 'X', lat: -31.5, lng: -64.5 }), 409, 'operativo_cerrado');
    motivo(await ctx.api('GET', `/operativos/${opNuevo}/punto-cero`), 200);
  });

  test('Roles · un agente no marca ni mueve nada del mapa (403)', async () => {
    const agente = ctx.usuarios.alfa.token;
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/marcadores`, { clase: 'POI', nombre: 'X', lat: -31.4, lng: -64.8 }, agente), 403);
    motivo(await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { lat: -31.4, lng: -64.8, motivo: 'x' }, agente), 403);
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/radios`, { radioM: 1000, color: '#000000' }, agente), 403);
  });
});
