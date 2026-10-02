/**
 * Seguridad del acceso (02/10, antes de publicar): límite de intentos de login
 * (migración 017) y CORS restringido a la propia aplicación.
 * Los bloqueos se hacen sobre un correo inexistente y sobre auto.eco, y al
 * terminar se borran sus contadores: no queda a nadie bloqueado.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

const API = process.env.TEST_API_URL ?? 'http://localhost:3001/api';
let ctx;
const CORREO_FALSO = 'auto.inexistente@prueba.duar';

/** Login directo (se necesitan los encabezados de la respuesta). */
const login = (email, password, origen) => fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(origen ? { Origin: origen } : {}) },
  body: JSON.stringify({ email, password }),
});

async function limpiarContadores() {
  await ctx.query(
    `DELETE FROM intentos_login
      WHERE clave LIKE 'email:auto.%@prueba.duar'
         OR clave IN ('ip:::1', 'ip:127.0.0.1', 'ip:::ffff:127.0.0.1')`);
}

describe('Acceso: límite de intentos de login y CORS (CU-01)', () => {
  before(async () => { ctx = await preparar(); await limpiarContadores(); });
  after(async () => { await limpiarContadores(); await terminar(); });

  test('CU-01 · un correo que no existe y una clave incorrecta responden igual (no se enumera)', async () => {
    const a = await login(CORREO_FALSO, 'no-importa-1');
    const b = await login(ctx.usuarios.eco.email, 'clave-equivocada-1');
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.deepEqual(await a.json(), await b.json());
  });

  test('CU-01 · tras 5 intentos fallidos el correo queda bloqueado → 429 con Retry-After', async () => {
    let r;
    for (let i = 0; i < 4; i++) r = await login(CORREO_FALSO, `intento-${i}`);   // 1 + 4 = 5 fallos
    assert.equal(r.status, 429);
    const cuerpo = await r.json();
    assert.equal(cuerpo.motivo, 'bloqueado');
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    assert.ok(cuerpo.segundos > 0 && cuerpo.segundos <= 15 * 60);
  });

  test('CU-01 · mientras dura el bloqueo, ni la clave correcta entra', async () => {
    const user = ctx.usuarios.eco;
    for (let i = 0; i < 5; i++) await login(user.email, `mal-${i}`);
    const r = await login(user.email, process.env.TEST_USUARIOS_PASSWORD);
    assert.equal(r.status, 429);
    assert.equal((await r.json()).motivo, 'bloqueado');
  });

  test('CU-01 · levantado el bloqueo, la clave correcta entra y borra el contador', async () => {
    await limpiarContadores();
    const r = await login(ctx.usuarios.eco.email, process.env.TEST_USUARIOS_PASSWORD);
    assert.equal(r.status, 200);
    const { rows } = await ctx.query(`SELECT 1 FROM intentos_login WHERE clave = $1`, [`email:${ctx.usuarios.eco.email}`]);
    assert.equal(rows.length, 0);
  });

  test('CU-01 · un login correcto no deja el contador de fallos anteriores', async () => {
    const user = ctx.usuarios.eco;
    for (let i = 0; i < 3; i++) await login(user.email, `mal-${i}`);
    assert.equal((await login(user.email, process.env.TEST_USUARIOS_PASSWORD)).status, 200);
    // Si el contador no se hubiera borrado, estos 3 fallos más sumarían 6 y bloquearían.
    for (let i = 0; i < 3; i++) assert.equal((await login(user.email, `otra-${i}`)).status, 401);
  });

  test('Acceso · un sitio web ajeno no recibe permiso para leer la API (CORS)', async () => {
    const r = await login(CORREO_FALSO + 'x', 'x', 'https://sitio-ajeno.example');
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });

  test('Acceso · la propia aplicación (localhost:5173 en desarrollo) sí recibe permiso', async () => {
    const r = await login(CORREO_FALSO + 'y', 'x', 'http://localhost:5173');
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('Acceso · sin Origin (servidor a servidor) la API responde igual', async () => {
    const r = await fetch(`${API}/health`);
    assert.equal(r.status, 200);
  });
});
