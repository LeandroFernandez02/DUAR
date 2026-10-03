/**
 * Módulos 1 y 2 · Sesión, roles y cuentas (CU-01, CU-04 a CU-07), con las
 * reglas de la auditoría del 30/09: para el coordinador los administradores
 * no existen; nadie cambia su propio rol ni se desactiva; un id mal formado
 * es un pedido inválido, no un error del servidor.
 * Ningún caso prohibido escribe: se rechazan antes.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
let adminId;
let coordinadorId;
const comoCoord = (m, ruta, body) => ctx.api(m, ruta, body, ctx.coordinador);
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

describe('Sesión, roles y cuentas (CU-01, CU-04 a CU-07)', () => {
  before(async () => {
    ctx = await preparar();
    adminId = (await ctx.api('GET', '/auth/me')).json.usuario.id;
    coordinadorId = ctx.usuarios.hotel.uid;
  });
  after(terminar);

  test('CU-01 · sin sesión no se accede a la API → 401', async () => {
    assert.equal((await ctx.api('GET', '/usuarios', undefined, null)).status, 401);
  });

  test('CU-01 · una sesión inventada → 401', async () => {
    assert.equal((await ctx.api('GET', '/usuarios', undefined, 'token-falso')).status, 401);
  });

  test('CU-04 · un agente no gestiona usuarios ni operativos → 403', async () => {
    const t = ctx.usuarios.alfa.token;
    assert.equal((await ctx.api('GET', '/usuarios', undefined, t)).status, 403);
    assert.equal((await ctx.api('GET', '/operativos', undefined, t)).status, 403);
  });

  test('CU-04 · el administrador ve a los administradores en la lista', async () => {
    const lista = (await ctx.api('GET', '/usuarios')).json.usuarios;
    assert.ok(lista.some(u => u.id === adminId));
  });

  test('CU-04 · el coordinador no ve a ningún administrador en la lista', async () => {
    const lista = (await comoCoord('GET', '/usuarios')).json.usuarios;
    assert.ok(lista.length > 0);
    assert.ok(lista.every(u => u.rol.toLowerCase() !== 'administrador'));
  });

  test('CU-04 · el coordinador no puede abrir a un administrador ni ver su auditoría → 404', async () => {
    assert.equal((await comoCoord('GET', `/usuarios/${adminId}`)).status, 404);
    assert.equal((await comoCoord('GET', `/usuarios/${adminId}/auditoria`)).status, 404);
  });

  test('CU-06 · el coordinador no puede editar a un administrador ni cambiarle la clave → 404', async () => {
    assert.equal((await comoCoord('PUT', `/usuarios/${adminId}`, { nombre: 'Intruso' })).status, 404);
    assert.equal((await comoCoord('PUT', `/usuarios/${adminId}`, { password: 'OtraClave123' })).status, 404);
  });

  test('CU-07 · el coordinador no puede eliminar a un administrador → 404', async () => {
    assert.equal((await comoCoord('DELETE', `/usuarios/${adminId}`)).status, 404);
  });

  test('CU-05 · el coordinador no puede crear un administrador → 403 rol_no_permitido', async () => {
    const r = await comoCoord('POST', '/usuarios', {
      dni: '98000999', nombre: 'Rechazado', apellido: 'Prueba Automatica',
      email: 'auto.rechazado@prueba.duar', password: 'NoSeCrea123', rol: 'administrador',
    });
    motivo(r, 403, 'rol_no_permitido');
    const lista = (await ctx.api('GET', '/usuarios')).json.usuarios;
    assert.ok(!lista.some(u => u.email === 'auto.rechazado@prueba.duar'), 'no quedó creado');
  });

  test('CU-07 · el DNI y el correo de un usuario eliminado se pueden volver a usar (migración 018)', async () => {
    const datos = {
      dni: '98000998', nombre: 'Reuso', apellido: 'Prueba Automatica',
      email: 'auto.reuso@prueba.duar', password: 'ClaveReuso123', rol: 'agente',
    };
    // Si una corrida anterior quedó a medias, su usuario se da de baja primero.
    await ctx.query(
      `UPDATE usuarios SET estado = 'ELIMINADO', eliminado_en = now()
        WHERE (dni = $1 OR lower(email) = $2) AND eliminado_en IS NULL`, [datos.dni, datos.email]);

    const primero = await ctx.api('POST', '/usuarios', datos);
    motivo(primero, 201);
    // Mientras está vigente, el DNI y el correo siguen siendo únicos (también en mayúsculas).
    motivo(await ctx.api('POST', '/usuarios', { ...datos, email: 'otro.reuso@prueba.duar' }), 409);
    motivo(await ctx.api('POST', '/usuarios', { ...datos, dni: '98000997', email: 'AUTO.REUSO@prueba.duar' }), 409);

    assert.ok([200, 204].includes((await ctx.api('DELETE', `/usuarios/${primero.json.usuario.id}`)).status));

    const segundo = await ctx.api('POST', '/usuarios', datos);
    motivo(segundo, 201);
    assert.notEqual(segundo.json.usuario.id, primero.json.usuario.id, 'es un alta nueva, no la cuenta vieja');
    assert.equal((await ctx.api('GET', `/usuarios/${primero.json.usuario.id}`)).status, 404, 'el eliminado sigue oculto');
    const lista = (await ctx.api('GET', '/usuarios')).json.usuarios.filter(u => u.email === datos.email);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].id, segundo.json.usuario.id);
  });

  test('CU-06 · el coordinador no puede ascender a nadie a administrador → 403', async () => {
    motivo(await comoCoord('PUT', `/usuarios/${ctx.usuarios.delta.uid}`, { rol: 'administrador' }), 403, 'rol_no_permitido');
  });

  test('CU-06 · nadie cambia su propio rol → 409 propio_rol', async () => {
    motivo(await comoCoord('PUT', `/usuarios/${coordinadorId}`, { rol: 'administrador' }), 409, 'propio_rol');
    motivo(await ctx.api('PUT', `/usuarios/${adminId}`, { rol: 'agente' }), 409, 'propio_rol');
  });

  test('CU-06/07 · nadie se desactiva ni se elimina a sí mismo → 409 autobloqueo', async () => {
    motivo(await comoCoord('PUT', `/usuarios/${coordinadorId}`, { estado: 'INACTIVO' }), 409, 'autobloqueo');
    motivo(await ctx.api('PUT', `/usuarios/${adminId}`, { estado: 'INACTIVO' }), 409, 'autobloqueo');
    motivo(await ctx.api('DELETE', `/usuarios/${adminId}`), 409, 'autobloqueo');
  });

  test('CU-06 · el coordinador sí edita a un agente', async () => {
    const r = await comoCoord('PUT', `/usuarios/${ctx.usuarios.delta.uid}`, { nombre: 'Delta', rol: 'agente' });
    motivo(r, 200);
  });

  test('Errores · un id mal formado en la dirección responde 400, no 500', async () => {
    motivo(await ctx.api('GET', '/usuarios/no-es-un-id'), 400, 'valor_invalido');
    const r = await ctx.api('GET', `/operativos/${ctx.op}/grupos/undefined/linea-tiempo`);
    assert.equal(r.status, 400, JSON.stringify(r.json));
  });

  test('Errores · un grupo que no es de este operativo no se encuentra → 404 grupo_no_encontrado', async () => {
    const ajeno = '00000000-0000-4000-8000-000000000000';
    motivo(await ctx.api('POST', `/operativos/${ctx.op}/grupos/${ajeno}/acciones`, { accion: 'confirmar' }), 404, 'grupo_no_encontrado');
  });
});
