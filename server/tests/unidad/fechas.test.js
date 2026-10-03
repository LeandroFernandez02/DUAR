/**
 * Hora de Argentina en los formularios (02/10, detectado en producción: la
 * fecha y hora de inicio del operativo quedaba corrida 3 horas).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { conZonaArgentina } from '../../src/utils/fechas.js';

describe('Fechas cargadas a mano: hora de Argentina', () => {
  test('CU-08 · "11:00" del formulario (sin zona) se guarda como 11:00 de Argentina = 14:00 UTC', () => {
    const v = conZonaArgentina('2026-10-02T11:00');
    assert.equal(v, '2026-10-02T11:00-03:00');
    assert.equal(new Date(v).toISOString(), '2026-10-02T14:00:00.000Z');
  });

  test('CU-08 · con segundos también se completa la zona', () => {
    assert.equal(conZonaArgentina('2026-10-02T23:30:15'), '2026-10-02T23:30:15-03:00');
  });

  test('CU-08 · un valor que ya trae zona (Z u offset) no se toca', () => {
    assert.equal(conZonaArgentina('2026-10-02T14:00:00.000Z'), '2026-10-02T14:00:00.000Z');
    assert.equal(conZonaArgentina('2026-10-02T11:00-03:00'), '2026-10-02T11:00-03:00');
  });
});
