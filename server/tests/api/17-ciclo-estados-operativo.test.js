/**
 * Ciclo de estados del operativo (decisiones del 24/10, migración 026):
 *   Nuevo → Iniciado (al entrar) → En planificación (primer agente) → En proceso (grupo en el terreno),
 *   y Inactivo por pausa manual (con motivo) o a las 48 h sin actividad.
 * Cada cambio queda auditado con su motivo.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, confirmarCorreo } from '../ayudantes/entorno.js';
import { INICIADO } from '../../src/models/operativoEstado.model.js';

let ctx;
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const nuevoOperativo = () => ctx.api('POST', '/operativos', {
  titulo: `PRUEBAS AUTOMÁTICAS - Informe estados ${Date.now()}${Math.floor(Math.random() * 1000)}`, localidad: 'Córdoba',
  puntoCeroLat: -31.5, puntoCeroLng: -64.5, fechaHoraInicio: new Date().toISOString(),
});
const leer = async id => (await ctx.api('GET', `/operativos/${id}`)).json.operativo;
const auditoria = async (id, estado) => (await ctx.query(
  `SELECT usuario_id, valores_nuevos->>'motivo' AS motivo FROM logs_auditoria
    WHERE entidad_afectada = 'operativos' AND registro_id = $1 AND valores_nuevos->>'estado' = $2 ORDER BY creado_en DESC`, [id, estado])).rows;

/** Un agente nuevo se suma por QR (cuenta creada y confirmada en el momento). */
async function unirse(opId) {
  const qr = (await ctx.api('GET', `/operativos/${opId}/qr`));
  if (qr.status !== 200) return { status: qr.status, json: qr.json, etapa: 'qr' };
  const dni = `8${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 10)}`;
  const reg = await ctx.api('POST', '/auth/registro', {
    qrToken: qr.json.qr.token, dni, nombre: 'Estados', apellido: 'Prueba Automatica', email: `auto.e${dni}@prueba.duar`,
    password: 'ClaveEstados1!', fechaNacimiento: '1990-05-15',
  }, null);
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  await confirmarCorreo(reg.json.usuario.id);
  const alta = await ctx.api('POST', `/operativos/${opId}/alta`, { qrToken: qr.json.qr.token }, reg.json.token);
  return { ...alta, etapa: 'alta' };
}

describe('Ciclo de estados del operativo (24/10)', () => {
  before(async () => { ctx = await preparar(); });
  // Los agentes que se sumaron a los operativos de esta prueba se dan de baja: si no, la comprobación de
  // aislamiento de los demás archivos (usuarios de prueba en otro operativo) se detiene.
  after(async () => {
    await ctx.query(`UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP
                      WHERE fecha_egreso IS NULL AND usuario_id IN (SELECT id FROM usuarios WHERE email ~* '^auto\.e[0-9]+@prueba\.duar$')`);
    await terminar();
  });

  test('CU-08 · un operativo nace Nuevo; al entrar a su panel pasa a Iniciado y queda auditado', async () => {
    const c = await nuevoOperativo();
    motivo(c, 201);
    const id = c.json.operativo.id;
    assert.equal(c.json.operativo.estado, 'NUEVO');
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    assert.equal((await leer(id)).estado, INICIADO);
    const [fila] = await auditoria(id, INICIADO);
    assert.ok(fila, 'hay un registro de auditoría');
    assert.match(fila.motivo, /primera vez/);
    // Idempotente: volver a entrar no cambia nada ni duplica el registro.
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    assert.equal((await auditoria(id, INICIADO)).length, 1);
  });

  test('CU-16 · el primer agente que ingresa por QR lo pasa a En planificación; el segundo no cambia nada', async () => {
    const c = await nuevoOperativo();
    const id = c.json.operativo.id;
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    const uno = await unirse(id);
    assert.equal(uno.status, 201, JSON.stringify(uno.json));
    const o1 = await leer(id);
    assert.equal(o1.estado, 'EN_PLANIFICACION');
    assert.match(o1.estadoMotivo, /primer agente/);
    assert.equal((await unirse(id)).status, 201);
    assert.equal((await auditoria(id, 'EN_PLANIFICACION')).length, 1, 'un solo cambio');
  });

  test('CU-24 · cuando un grupo sale al terreno el operativo pasa a En proceso, y no vuelve atrás al regresar', async () => {
    await ctx.query(`UPDATE operativos SET estado = $2::estado_operativo, pausa_manual = false, estado_previo_pausa = NULL WHERE id = $1`, [ctx.op, 'EN_PLANIFICACION']);
    const G = (await ctx.crearGrupo('Estados', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
    motivo(await ctx.accion(G, { accion: 'confirmar' }), 200);
    motivo(await ctx.accion(G, { accion: 'asignar', zona: 'Polígono de estados' }), 200);
    assert.equal((await leer(ctx.op)).estado, 'EN_PLANIFICACION', 'asignar todavía no es estar en el terreno');
    motivo(await ctx.accion(G, { accion: 'salir' }), 200);
    const o = await leer(ctx.op);
    assert.equal(o.estado, 'EN_PROCESO');
    assert.match(o.estadoMotivo, /grupos en el terreno/);
    motivo(await ctx.accion(G, { accion: 'volver' }), 200);
    motivo(await ctx.accion(G, { accion: 'llegar_base' }), 200);
    assert.equal((await leer(ctx.op)).estado, 'EN_PROCESO', 'se queda En proceso');
  });

  test('Inactivo · la pausa manual exige motivo, bloquea los ingresos y sólo se reanuda a mano', async () => {
    await ctx.query(`UPDATE operativos SET estado = 'EN_PROCESO', pausa_manual = false WHERE id = $1`, [ctx.op]);
    for (const body of [{}, { motivo: '' }, { motivo: 'no' }]) motivo(await ctx.api('POST', `/operativos/${ctx.op}/pausar`, body), 400, 'motivo_requerido');
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/pausar`, { motivo: 'Se suspende por tormenta eléctrica' }), 200);
    const o = await leer(ctx.op);
    assert.equal(o.estado, 'INACTIVO');
    assert.equal(o.pausaManual, true);
    assert.equal(o.estadoMotivo, 'Se suspende por tormenta eléctrica');
    assert.ok((await auditoria(ctx.op, 'INACTIVO')).some(f => f.usuario_id), 'queda a nombre de quien lo pausó');
    // No admite ingresos, ni aunque haya actividad.
    const qr = await ctx.api('GET', `/operativos/${ctx.op}/qr`);
    motivo(qr, 409, 'operativo_cerrado');
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/pausar`, { motivo: 'Otra vez la misma pausa' }), 409, 'estado_invalido');
    // Reanudar vuelve al estado de antes.
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/reanudar`, {}), 200);
    const r = await leer(ctx.op);
    assert.equal(r.estado, 'EN_PROCESO');
    assert.equal(r.pausaManual, false);
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/reanudar`, {}), 409, 'estado_invalido');
  });

  test('Inactivo · a las 48 h sin actividad pasa solo a Inactivo y un ingreso lo reanuda', async () => {
    const c = await nuevoOperativo();
    const id = c.json.operativo.id;
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    // Se envejece todo lo que cuenta como actividad: 3 días atrás.
    await ctx.query(`UPDATE operativos SET creado_en = now() - interval '3 days', actualizado_en = now() - interval '3 days' WHERE id = $1`, [id]);
    await ctx.query(`UPDATE punto_cero_historial SET registrado_en = now() - interval '3 days' WHERE operativo_id = $1`, [id]);

    const o = await leer(id);
    assert.equal(o.estado, 'INACTIVO');
    assert.equal(o.pausaManual, false);
    assert.match(o.estadoMotivo, /Sin actividad durante 48 horas/);
    const [fila] = await auditoria(id, 'INACTIVO');
    assert.equal(fila.usuario_id, null, 'lo hizo el sistema');
    // Sigue en la lista de vigentes.
    const lista = (await ctx.api('GET', '/operativos?estado=vigentes')).json.operativos;
    assert.ok(lista.some(x => x.id === id));
    // Un ingreso lo reanuda (y, como es el primero, queda En planificación).
    const alta = await unirse(id);
    assert.equal(alta.status, 201, JSON.stringify(alta.json));
    assert.equal((await leer(id)).estado, 'EN_PLANIFICACION');
  });

  test('CU-10 · un operativo Inactivo se puede finalizar', async () => {
    const c = await nuevoOperativo();
    const id = c.json.operativo.id;
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    motivo(await ctx.api('POST', `/operativos/${id}/pausar`, { motivo: 'Pausa de prueba' }), 200);
    motivo(await ctx.api('POST', `/operativos/${id}/finalizar`, { resultado: 'SUSPENDIDA' }), 200);
    assert.equal((await leer(id)).estado, 'FINALIZADO');
    motivo(await ctx.api('POST', `/operativos/${id}/pausar`, { motivo: 'Ya está finalizado' }), 409, 'estado_invalido');
  });

  test('CU-37 · un polígono puede tener color propio; null vuelve al del grupo y queda en su historial', async () => {
    const pid = await ctx.poligono('Color propio');
    const ruta = `/operativos/${ctx.op}/poligonos/${pid}`;
    for (const color of ['rojo', '#12345', '#GGGGGG', 123]) motivo(await ctx.api('PUT', ruta, { color }), 400, 'color_invalido');
    const r = await ctx.api('PUT', ruta, { color: '#7c3aed' });
    motivo(r, 200);
    assert.equal(r.json.poligono.color, '#7C3AED');
    // El mismo color otra vez no ensucia el historial.
    motivo(await ctx.api('PUT', ruta, { color: '#7C3AED' }), 200);
    motivo(await ctx.api('PUT', ruta, { color: null }), 200);
    const d = (await ctx.api('GET', ruta)).json.poligono;
    assert.equal(d.color, null);
    const cambios = d.historial.filter(e => e.tipo === 'COLOR');
    assert.equal(cambios.length, 2, 'uno al elegirlo y otro al volver al del grupo');
  });
});
