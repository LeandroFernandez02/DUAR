/**
 * Módulos 1 y 2 · Arreglos del documento «Testeo» del 13/10 (CU-02, CU-03, CU-05, CU-06).
 *
 * Contraseña con letra, número y carácter especial; correo de confirmación al
 * crear; una cuenta Pendiente se edita pero su estado no se elige; cambiar el
 * correo obliga a confirmarlo de nuevo; espacios de más y fechas imposibles.
 * Usa cuentas propias (auto.testeo*, DNI 98000970–98000973) para no tocar a
 * los agentes fijos de las otras pruebas.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar, confirmarCorreo, api } from '../ayudantes/entorno.js';
import * as TokenEmail from '../../src/models/tokenEmail.model.js';

let ctx;
const CLAVE = 'ClaveTesteo1!';
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

/** Deja libres el DNI y el correo de una cuenta de estas pruebas (de una corrida anterior). */
async function liberar(dni, email) {
  // Como la prueba de la baja (09): eliminada, la próxima alta con ese DNI la reactiva.
  await ctx.query(
    `UPDATE usuarios SET estado = 'ELIMINADO', eliminado_en = now()
      WHERE (dni = $1 OR lower(email) = lower($2)) AND eliminado_en IS NULL`, [dni, email]);
}

async function crear(clave, dni, extra = {}) {
  const email = `auto.${clave}@prueba.duar`;
  await liberar(dni, email);
  return ctx.api('POST', '/usuarios', { dni, nombre: 'Testeo', apellido: 'Prueba Automatica', email, password: CLAVE, rol: 'agente', ...extra });
}

/** Enlaces de confirmación que todavía sirven, y cuántos de ellos se emitieron recién. */
const tokensConfirmacion = async usuarioId => (await ctx.query(
  `SELECT count(*)::int AS vigentes,
          count(*) FILTER (WHERE creado_en > now() - interval '2 minutes')::int AS recientes
     FROM tokens_recuperacion
    WHERE usuario_id = $1 AND tipo = 'CONFIRMACION' AND NOT usado AND expira_en > now()`, [usuarioId])).rows[0];

describe('Usuarios: arreglos del Testeo del 13/10 (CU-02, CU-03, CU-05, CU-06)', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-05 3.3 · una contraseña sin carácter especial (o sin número) no se acepta → 400', async () => {
    for (const password of ['SinEspecial123', 'SoloLetras!!', '1234567!']) {
      const r = await crear('testeo1', '98000970', { password });
      assert.equal(r.status, 400, password);
      assert.match(r.json.errores.password, /carácter especial/);
    }
  });

  test('CU-05 5 · crear deja la cuenta Pendiente y emite su enlace de confirmación', async () => {
    const r = await crear('testeo1', '98000970');
    motivo(r, 201);
    assert.equal(r.json.usuario.estado, 'PENDIENTE');
    const t = await tokensConfirmacion(r.json.usuario.id);
    assert.ok(t.recientes >= 1, 'el correo de confirmación sale al crear, no sólo al reenviar');
  });

  test('CU-05 3.1 · DNI repetido → «Ya existe un usuario registrado con el DNI ingresado…»', async () => {
    const r = await ctx.api('POST', '/usuarios', {
      dni: '98000970', nombre: 'Otra', apellido: 'Persona', email: 'auto.testeo-otro@prueba.duar', password: CLAVE, rol: 'agente',
    });
    motivo(r, 409);
    assert.equal(r.json.error, 'Ya existe un usuario registrado con el DNI ingresado. Verificá los datos e intentá nuevamente.');
    assert.equal(r.json.campo, 'dni');
  });

  test('CU-06 · una cuenta Pendiente se edita, pero su estado no se cambia a mano → 409 estado_pendiente', async () => {
    const { rows: [u] } = await ctx.query(`SELECT id FROM usuarios WHERE dni = '98000970' AND estado = 'PENDIENTE'`);
    const r = await ctx.api('PUT', `/usuarios/${u.id}`, { nombre: 'Testeo Editado', estado: 'PENDIENTE' });
    motivo(r, 200);
    assert.equal(r.json.usuario.nombre, 'Testeo Editado');
    assert.equal(r.json.usuario.estado, 'PENDIENTE');
    motivo(await ctx.api('PUT', `/usuarios/${u.id}`, { estado: 'ACTIVO' }), 409, 'estado_pendiente');
    motivo(await ctx.api('PUT', `/usuarios/${u.id}`, { estado: 'INACTIVO' }), 409, 'estado_pendiente');
  });

  test('CU-02 7 · confirmar el correo la pasa a Activo y dice de quién es la cuenta', async () => {
    const { rows: [u] } = await ctx.query(`SELECT id FROM usuarios WHERE dni = '98000970' AND estado = 'PENDIENTE'`);
    const r = await confirmarCorreo(u.id);
    assert.equal(r.estado, 'ok');
    assert.equal(r.email, 'auto.testeo1@prueba.duar');
    const { rows: [despues] } = await ctx.query(`SELECT estado, email_confirmado FROM usuarios WHERE id = $1`, [u.id]);
    assert.equal(despues.estado, 'ACTIVO');
    assert.equal(despues.email_confirmado, true);
  });

  test('CU-06 5.3 · cambiar el correo vuelve la cuenta a Pendiente, anula los enlaces viejos y emite uno nuevo', async () => {
    const { rows: [u] } = await ctx.query(`SELECT id FROM usuarios WHERE dni = '98000970' AND estado = 'ACTIVO'`);
    const viejo = await TokenEmail.emitir(u.id, 'CONFIRMACION');
    const r = await ctx.api('PUT', `/usuarios/${u.id}`, { email: 'auto.testeo1-nuevo@prueba.duar', estado: 'ACTIVO' });
    motivo(r, 200);
    assert.equal(r.json.cambioEmail, true);
    assert.equal(r.json.usuario.estado, 'PENDIENTE');
    assert.equal(r.json.usuario.emailConfirmado, false);
    assert.equal((await tokensConfirmacion(u.id)).vigentes, 1, 'sólo sirve el enlace mandado a la dirección nueva');
    assert.equal((await api('GET', `/auth/confirmar-email/${viejo}`)).status, 410, 'el enlace de la dirección vieja ya no confirma');
  });

  test('CU-06 5.1 · correo de otra cuenta → «Ya existe un usuario registrado con el correo ingresado…»', async () => {
    const { rows: [u] } = await ctx.query(`SELECT id FROM usuarios WHERE dni = '98000970' AND estado <> 'ELIMINADO'`);
    const r = await ctx.api('PUT', `/usuarios/${u.id}`, { email: ctx.usuarios.alfa.email });
    motivo(r, 409);
    assert.equal(r.json.error, 'Ya existe un usuario registrado con el correo ingresado. Verificá los datos e intentá nuevamente.');
  });

  test('CU-05 3.3 · nombre y apellido se guardan sin espacios de más; la fecha de nacimiento vuelve como AAAA-MM-DD', async () => {
    const r = await crear('testeo2', '98000971', { nombre: '  Maria   Celeste ', apellido: 'Rodriguez ', fechaNacimiento: '1995-04-12' });
    motivo(r, 201);
    assert.equal(r.json.usuario.nombre, 'Maria Celeste');
    assert.equal(r.json.usuario.apellido, 'Rodriguez');
    assert.equal(r.json.usuario.fechaNacimiento, '1995-04-12');
  });

  test('CU-05 3.3 · fecha de nacimiento con año imposible o de menos de 16 años → 400', async () => {
    for (const fechaNacimiento of ['0002-01-01', '1899-12-31', '2015-01-01']) {
      const r = await crear('testeo3', '98000972', { fechaNacimiento });
      assert.equal(r.status, 400, fechaNacimiento);
      assert.ok(r.json.errores.fechaNacimiento, fechaNacimiento);
    }
  });

  test('CU-03 8.1 · la contraseña nueva de la recuperación sigue la misma regla', async () => {
    const { rows: [u] } = await ctx.query(`SELECT id FROM usuarios WHERE dni = '98000971' AND estado <> 'ELIMINADO'`);
    const token = await TokenEmail.emitir(u.id, 'RECUPERACION');
    const debil = await api('POST', '/auth/restablecer-contrasena', { token, password: 'sinespecial1' });
    assert.equal(debil.status, 400);
    assert.match(debil.json.error, /carácter especial/);
    motivo(await api('POST', '/auth/restablecer-contrasena', { token, password: 'NuevaClave9#' }), 200);
  });
});
