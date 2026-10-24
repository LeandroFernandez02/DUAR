/**
 * Lo que apareció en el recorrido completo de la aplicación del 19/10 (admin, coordinador y agente):
 *   · CU-02 / CU-16: una cuenta Pendiente que quiere sumarse por QR recibía «tu cuenta no está
 *     activa, contactá al administrador» en vez de «confirmá tu correo»;
 *   · CU-10: la reseña que se escribe al finalizar pisaba la descripción del operativo
 *     (ahora va en su propia columna, migración 024);
 *   · CU-16: el QR de un operativo Nuevo explicaba «el operativo está nuevo»;
 *   · CU-10: el resultado del operativo es obligatorio al finalizar (migración 025).
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';
import { INICIADO } from '../../src/models/operativoEstado.model.js';

let ctx;
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
const nuevoOperativo = (extra = {}) => ctx.api('POST', '/operativos', {
  titulo: `PRUEBAS AUTOMÁTICAS - Informe recorrido ${Date.now()}`, localidad: 'Córdoba',
  puntoCeroLat: -31.5, puntoCeroLng: -64.5, fechaHoraInicio: new Date().toISOString(), ...extra,
});

describe('Recorrido del 19/10', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-02 / CU-16 · una cuenta Pendiente que se suma por QR recibe «confirmá tu correo» (email_no_confirmado)', async () => {
    const qr = (await ctx.api('GET', `/operativos/${ctx.op}/qr`)).json.qr.token;
    const dni = `9${String(Date.now()).slice(-7)}`;
    const r = await ctx.api('POST', '/auth/registro', {
      qrToken: qr, dni, nombre: 'Pendiente', apellido: 'Prueba Automatica', email: `auto.p${dni}@prueba.duar`,
      password: 'ClavePendiente1!', fechaNacimiento: '1990-05-15',
    }, null);
    motivo(r, 201);
    assert.equal(r.json.usuario.estado, 'PENDIENTE');

    const alta = await ctx.api('POST', `/operativos/${ctx.op}/alta`, { qrToken: qr }, r.json.token);
    motivo(alta, 403, 'email_no_confirmado');
    assert.match(alta.json.error, /Confirmá tu cuenta/);
  });

  test('CU-10 · la reseña del cierre va en notaFinal y la descripción del operativo queda como estaba', async () => {
    const c = await nuevoOperativo({ descripcion: 'Contexto original del operativo.' });
    motivo(c, 201);
    const id = c.json.operativo.id;
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    motivo(await ctx.api('POST', `/operativos/${id}/finalizar`, { notaFinal: 'Persona hallada con vida.', resultado: 'HALLADA_CON_VIDA' }), 200);

    const o = (await ctx.api('GET', `/operativos/${id}`)).json.operativo;
    assert.equal(o.descripcion, 'Contexto original del operativo.', 'la descripción no se pisa');
    assert.equal(o.notaFinal, 'Persona hallada con vida.');
    assert.equal(o.resultado, 'HALLADA_CON_VIDA');
  });

  test('CU-10 · finalizar exige el resultado (lista cerrada, migración 025); sin él no se cierra nada', async () => {
    const c = await nuevoOperativo();
    motivo(c, 201);
    const id = c.json.operativo.id;
    motivo(await ctx.api('POST', `/operativos/${id}/activar`, {}), 200);
    for (const body of [{}, { resultado: '' }, { resultado: 'HALLADO' }]) {
      const r = await ctx.api('POST', `/operativos/${id}/finalizar`, body);
      motivo(r, 400, 'resultado_requerido');
    }
    assert.equal((await ctx.api('GET', `/operativos/${id}`)).json.operativo.estado, INICIADO, 'sigue abierto');
    motivo(await ctx.api('POST', `/operativos/${id}/finalizar`, { resultado: 'SUSPENDIDA' }), 200);
    const o = (await ctx.api('GET', `/operativos/${id}`)).json.operativo;
    assert.equal(o.estado, 'FINALIZADO');
    assert.equal(o.resultado, 'SUSPENDIDA');
  });

  test('CU-16 · el QR de un operativo Nuevo explica que hay que iniciarlo desde su panel', async () => {
    const c = await nuevoOperativo();
    motivo(c, 201);
    const r = await ctx.api('GET', `/operativos/${c.json.operativo.id}/qr`);
    motivo(r, 409, 'operativo_cerrado');
    assert.match(r.json.error, /todavía no está iniciado: entrá a su panel para iniciarlo/);
  });
});
