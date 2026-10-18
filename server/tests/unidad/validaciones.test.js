/**
 * Validaciones de datos personales (Testeo 15/10, puntos 23 y 24): la forma del correo, que su
 * dominio exista, y la fecha de nacimiento obligatoria al crear. Reglas puras: sin base ni API.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RE_EMAIL, validarDatosPersonales, exigirFechaNacimiento } from '../../src/utils/validaciones.js';
import { dominioDelCorreoExiste } from '../../src/utils/dominioCorreo.js';

describe('Correo: forma válida (CU-02, CU-05, CU-06)', () => {
  for (const ok of ['ana@gmail.com', 'ana.perez@correo.cba.gob.ar', 'a_b-c+d%e@sub.dominio.org', 'A1@x.io', 'auto.hotel@prueba.duar']) {
    test(`acepta ${ok}`, () => assert.ok(RE_EMAIL.test(ok)));
  }
  for (const mal of [
    'asfasfasffsfasdf@holaaapipi.45',   // terminación numérica (el caso del Testeo)
    'ana@dominio.c1m', 'ana@dominio', 'ana@.com', 'ana@dominio..com', '@gmail.com', 'ana@@gmail.com',
    '.ana@gmail.com', 'ana.@gmail.com', 'an a@gmail.com', 'ana@-dominio.com', 'ana@dominio-.com',
  ]) {
    test(`rechaza ${mal}`, () => assert.ok(!RE_EMAIL.test(mal)));
  }
  test('rechaza dos puntos seguidos en la parte local', () => {
    assert.ok(validarDatosPersonales({ email: 'a..b@gmail.com' }).email);
  });
});

describe('Fecha de nacimiento (CU-02, CU-05, CU-06)', () => {
  test('obligatoria al crear: ausente, null o vacía', () => {
    for (const fechaNacimiento of [undefined, null, '', '   ']) {
      assert.ok(exigirFechaNacimiento({ fechaNacimiento }).fechaNacimiento, String(fechaNacimiento));
    }
    assert.deepEqual(exigirFechaNacimiento({ fechaNacimiento: '1990-05-15' }), {});
  });

  test('un menor de 16 años dice cuál es la edad mínima', () => {
    const anio = new Date().getFullYear() - 10;
    assert.match(validarDatosPersonales({ fechaNacimiento: `${anio}-01-01` }).fechaNacimiento, /edad mínima.*16 años/);
  });

  test('una fecha que no existe no es válida', () => {
    assert.ok(validarDatosPersonales({ fechaNacimiento: '2000-02-31' }).fechaNacimiento);
  });
});

describe('Dominio del correo: ¿existe? (CU-02, CU-05, CU-06)', () => {
  test('el dominio de las pruebas automáticas siempre pasa (su correo nunca sale)', async () => {
    assert.equal(await dominioDelCorreoExiste('auto.alfa@prueba.duar'), true);
  });
  test('un dominio inexistente no pasa (.invalid nunca existe)', async () => {
    assert.equal(await dominioDelCorreoExiste('alguien@dominio-inventado-duar.invalid'), false);
  });
  test('un dominio real pasa', async () => {
    assert.equal(await dominioDelCorreoExiste('alguien@gmail.com'), true);
  });
});
