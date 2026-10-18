/**
 * Arreglos del documento «Testeo» del 15/10 que se prueban contra la API:
 *   · CU-05 / CU-06 / CU-02: correo con forma y dominio válidos, fecha de nacimiento
 *     obligatoria al crear, que exista de verdad y la edad mínima (puntos 15, 23, 24, 27);
 *   · CU-10 5.1: qué hay que revisar antes de finalizar un operativo (punto 17).
 * Los pedidos rechazados no crean nada: no hay cuentas que limpiar.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';

let ctx;
const CLAVE = 'ClaveTesteo2!';
const BASE = { nombre: 'Testeo', apellido: 'Prueba Automatica', password: CLAVE, rol: 'agente', fechaNacimiento: '1990-05-15' };
const alta = (dni, extra = {}) => ctx.api('POST', '/usuarios', { ...BASE, dni, email: `auto.t${dni}@prueba.duar`, ...extra });

const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};

describe('Testeo 15/10: datos de la cuenta y cierre del operativo', () => {
  before(async () => { ctx = await preparar(); });
  after(terminar);

  test('CU-05 · el correo tiene que tener forma de correo: «.45» como terminación no se acepta → 400', async () => {
    for (const email of ['asfasfasffsfasdf@holaaapipi.45', 'ana@dominio', 'a..b@gmail.com', 'ana@dominio.c1m']) {
      const r = await alta('98000975', { email });
      assert.equal(r.status, 400, email);
      assert.ok(r.json.errores.email, email);
    }
  });

  test('CU-05 · un dominio que no existe no se acepta → 400; al modificar el correo (CU-06) tampoco', async () => {
    const r = await alta('98000975', { email: 'alguien@dominio-inventado-duar.invalid' });
    assert.equal(r.status, 400);
    assert.match(r.json.errores.email, /dominio de ese correo no existe/);

    const antes = ctx.usuarios.alfa.email;
    try {
      const m = await ctx.api('PUT', `/usuarios/${ctx.usuarios.alfa.uid}`, { email: 'alguien@dominio-inventado-duar.invalid' });
      assert.equal(m.status, 400, JSON.stringify(m.json));
      assert.match(m.json.errores.email, /no existe/);
      const { rows: [u] } = await ctx.query(`SELECT email FROM usuarios WHERE id = $1`, [ctx.usuarios.alfa.uid]);
      assert.equal(u.email, antes, 'el correo no cambió');
    } finally {
      // Si el servidor lo hubiera aceptado, la cuenta de prueba no puede quedar con un correo ajeno a las pruebas.
      await ctx.query(`UPDATE usuarios SET email = $2 WHERE id = $1`, [ctx.usuarios.alfa.uid, antes]);
    }
  });

  test('CU-05 · la fecha de nacimiento es obligatoria al crear (ausente o vacía) → 400', async () => {
    for (const fechaNacimiento of [undefined, '']) {
      const r = await alta('98000976', { fechaNacimiento });
      assert.equal(r.status, 400, String(fechaNacimiento));
      assert.equal(r.json.errores.fechaNacimiento, 'Ingresá la fecha de nacimiento.');
    }
  });

  test('CU-05 / CU-06 · una fecha que no existe (31/02) o de un menor de 16 años se rechaza, con su propio mensaje', async () => {
    const inexistente = await alta('98000977', { fechaNacimiento: '2000-02-31' });
    assert.equal(inexistente.status, 400);
    assert.ok(inexistente.json.errores.fechaNacimiento);

    const anio = new Date().getFullYear() - 10;
    const menor = await alta('98000977', { fechaNacimiento: `${anio}-03-10` });
    assert.equal(menor.status, 400);
    assert.match(menor.json.errores.fechaNacimiento, /edad mínima para registrarse es de 16 años/);

    const m = await ctx.api('PUT', `/usuarios/${ctx.usuarios.alfa.uid}`, { fechaNacimiento: '2001-02-30' });
    assert.equal(m.status, 400, JSON.stringify(m.json));
  });

  test('CU-02 · registrarse por QR sin fecha de nacimiento → 400', async () => {
    const qr = (await ctx.api('GET', `/operativos/${ctx.op}/qr`)).json.qr.token;
    const r = await ctx.api('POST', '/auth/registro', {
      qrToken: qr, dni: '98000978', nombre: 'Sin', apellido: 'Fecha', email: 'auto.t98000978@prueba.duar', password: CLAVE,
    }, null);
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.equal(r.json.errores.fechaNacimiento, 'Ingresá la fecha de nacimiento.');
    const { rows } = await ctx.query(`SELECT 1 FROM usuarios WHERE dni = '98000978'`);
    assert.equal(rows.length, 0, 'no quedó creada');
  });

  test('CU-10 5.1 · antes de finalizar se revisan los tracks GPX y los agentes que siguen en actividad', async () => {
    const rev = () => ctx.api('GET', `/operativos/${ctx.op}/finalizar/revision`);

    // Con todos Disponibles no hay agentes en actividad; los tracks son los cargados al operativo.
    const { rows: [t] } = await ctx.query(
      `SELECT count(*)::int AS n FROM tracks_gpx WHERE operativo_id = $1 AND eliminado_en IS NULL`, [ctx.op]);
    const limpio = await rev();
    motivo(limpio, 200);
    assert.deepEqual(limpio.json.agentesEnActividad, []);
    assert.equal(limpio.json.tracksCargados, t.n);

    // Un agente en un grupo (Agrupado) está en actividad: aparece con su estado.
    const g = await ctx.crearGrupo('Revision Cierre', 'alfa');
    motivo(g, 201);
    const conGrupo = await rev();
    assert.equal(conGrupo.json.agentesEnActividad.length, 1);
    assert.equal(conGrupo.json.agentesEnActividad[0].estado, 'AGRUPADO');
    assert.equal(conGrupo.json.agentesEnActividad[0].nombre, 'Alfa');

    // Al disolver el grupo vuelve a estar Disponible y deja de figurar.
    assert.equal((await ctx.disolver(g.json.grupo.id)).status, 204);
    assert.deepEqual((await rev()).json.agentesEnActividad, []);
  });

  test('CU-10 5.1 · la revisión no la pide un agente → 403; de un operativo inexistente → 404', async () => {
    motivo(await ctx.api('GET', `/operativos/${ctx.op}/finalizar/revision`, undefined, ctx.usuarios.alfa.token), 403);
    motivo(await ctx.api('GET', '/operativos/00000000-0000-4000-8000-000000000000/finalizar/revision'), 404);
  });
});
