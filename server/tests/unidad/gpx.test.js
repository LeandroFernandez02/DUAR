/**
 * Lectura de GPX (CU-29): puntos, elevación, horas y desnivel, sin base.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { leerGpx, resumirGpx, lineaWkt } from '../../src/utils/gpx.js';

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="Wikiloc">
  <metadata><name>Metadato</name></metadata>
  <trk><name>Rastrillaje Quebrada</name><trkseg>
    <trkpt lat="-31.970" lon="-64.930"><ele>1900</ele><time>2026-10-12T11:00:00Z</time></trkpt>
    <trkpt lon="-64.929" lat="-31.971"><ele>1910.5</ele><time>2026-10-12T11:10:00Z</time></trkpt>
    <trkpt lat="-31.972" lon="-64.928"><ele>1905</ele><time>2026-10-12T11:25:00Z</time></trkpt>
    <trkpt lat="no-es-numero" lon="-64.9"><ele>1</ele></trkpt>
  </trkseg></trk>
</gpx>`;

describe('Lectura de archivos GPX (CU-29)', () => {
  test('lee puntos con elevación y hora, en cualquier orden de atributos, y descarta los inválidos', () => {
    const { puntos, nombre } = leerGpx(GPX);
    assert.equal(nombre, 'Rastrillaje Quebrada');
    assert.equal(puntos.length, 3);
    assert.deepEqual([puntos[1].lat, puntos[1].lng, puntos[1].ele], [-31.971, -64.929, 1910.5]);
    assert.equal(puntos[2].t.toISOString(), '2026-10-12T11:25:00.000Z');
  });

  test('resume inicio, fin, duración y desnivel (sube 10,5 m y baja 5,5 m)', () => {
    const r = resumirGpx(leerGpx(GPX).puntos);
    assert.equal(r.inicio.toISOString(), '2026-10-12T11:00:00.000Z');
    assert.equal(r.fin.toISOString(), '2026-10-12T11:25:00.000Z');
    assert.equal(r.duracionS, 25 * 60);
    assert.equal(r.conElevacion, true);
    assert.equal(r.desnivelPositivoM, 11);
    assert.equal(r.desnivelNegativoM, 6);
  });

  test('sin horas ni elevación: duración y desnivel quedan vacíos (no se inventan)', () => {
    const r = resumirGpx(leerGpx('<gpx><rte><rtept lat="1" lon="2"/><rtept lat="1.1" lon="2.1"/></rte></gpx>').puntos);
    assert.equal(r.inicio, null);
    assert.equal(r.duracionS, null);
    assert.equal(r.conElevacion, false);
    assert.equal(r.desnivelPositivoM, null);
  });

  test('arma la línea en 3D para la base (sin elevación, cero)', () => {
    assert.equal(lineaWkt([{ lat: 1, lng: 2, ele: null }, { lat: 3, lng: 4, ele: 5 }]), 'LINESTRING Z(2 1 0,4 3 5)');
  });
});
