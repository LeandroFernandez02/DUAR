/**
 * Tercera tanda del doc «Testeo» (25/10): fecha de inicio fija (punto 26), título único (29),
 * cambios de carátula en la cronología del informe (33) y aviso al cambiar el rol de alguien
 * que está en un operativo (44). El grupo en el terreno que no se quita del polígono (43) está
 * en 10-poligonos.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { preparar, terminar } from '../ayudantes/entorno.js';
import { armarCronologia } from '../../src/models/informe.model.js';

let ctx;
const motivo = (r, status, mot) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (mot) assert.equal(r.json?.motivo, mot, JSON.stringify(r.json));
};
// El prefijo «PRUEBAS AUTOMÁTICAS - Informe » es el que borra `npm run limpiar-pruebas`.
const titulo = sufijo => `PRUEBAS AUTOMÁTICAS - Informe testeo ${Date.now()}${Math.floor(Math.random() * 1000)} ${sufijo}`;
const crear = (t, extra = {}) => ctx.api('POST', '/operativos', {
  titulo: t, localidad: 'Córdoba', puntoCeroLat: -31.5, puntoCeroLng: -64.5, ...extra,
});

describe('Testeo 25/10', () => {
  before(async () => { ctx = await preparar(); });
  after(async () => { await terminar(); });

  test('punto 26 · la fecha y hora de inicio es la de creación: la que se mande se ignora, al crear y al editar', async () => {
    const antes = Date.now();
    const c = await crear(titulo('fecha'), { fechaHoraInicio: '2001-01-01T00:00' });
    motivo(c, 201);
    const inicio = new Date(c.json.operativo.fechaHoraInicio).getTime();
    assert.ok(Math.abs(inicio - antes) < 120_000, `inicio ${c.json.operativo.fechaHoraInicio} debería ser ahora`);
    const e = await ctx.api('PUT', `/operativos/${c.json.operativo.id}`, { fechaHoraInicio: '2001-01-01T00:00', descripcion: 'x' });
    motivo(e, 200);
    assert.equal(new Date(e.json.operativo.fechaHoraInicio).getTime(), inicio, 'no cambia al editar');
  });

  test('punto 29 · el título no se repite con ningún operativo vigente, al crear ni al editar', async () => {
    const t = titulo('repetido');
    const a = await crear(t);
    motivo(a, 201);
    motivo(await crear(`  ${t.toUpperCase()} `), 409, 'titulo_duplicado');
    const b = await crear(`${t} b`);
    motivo(b, 201);
    motivo(await ctx.api('PUT', `/operativos/${b.json.operativo.id}`, { titulo: t }), 409, 'titulo_duplicado');
    // El propio título no choca consigo mismo.
    motivo(await ctx.api('PUT', `/operativos/${a.json.operativo.id}`, { titulo: t, descripcion: 'y' }), 200);
  });

  test('punto 33 · los cambios de título y fiscal quedan en la auditoría y en la cronología del informe', async () => {
    const t = titulo('caratula');
    const c = await crear(t, { fiscalInstruccion: 'Dra. Laura Medina' });
    motivo(c, 201);
    const id = c.json.operativo.id;
    motivo(await ctx.api('PUT', `/operativos/${id}`, { titulo: `${t} v2`, fiscalInstruccion: 'Dr. Pablo Sosa' }), 200);
    const { rows } = await ctx.query(
      `SELECT valores_previos->>'titulo' AS tp, valores_nuevos->>'titulo' AS tn,
              valores_previos->>'fiscalInstruccion' AS fp, valores_nuevos->>'fiscalInstruccion' AS fn
         FROM logs_auditoria WHERE entidad_afectada = 'operativos' AND registro_id = $1 AND accion = 'MODIFICAR'
          AND valores_nuevos ? 'titulo' ORDER BY creado_en DESC LIMIT 1`, [id]);
    assert.deepEqual(rows[0], { tp: t, tn: `${t} v2`, fp: 'Dra. Laura Medina', fn: 'Dr. Pablo Sosa' });

    const base = {
      operativo: { creadoEn: new Date('2026-10-25T10:00:00Z'), titulo: t, creadoPor: 'Ana' },
      auditoriaOperativo: [], mandos: [], presencias: [], eventosAgente: [], grupos: [], eventosGrupo: [],
      hallazgos: [], puntoCero: [], eventosPoligono: [], otrosMarcadores: [], bajas: [], informesPrevios: [],
    };
    const lista = armarCronologia({
      ...base,
      cambiosCaratula: [{
        creadoEn: new Date('2026-10-25T11:00:00Z'), tituloPrevio: t, tituloNuevo: `${t} v2`,
        fiscalPrevio: 'Dra. Laura Medina', fiscalNuevo: 'Dr. Pablo Sosa', localidadPrevia: 'Córdoba', localidadNueva: 'Córdoba',
        cambiaDescripcion: false, registradoPor: 'Ana',
      }],
    });
    const texto = lista.map(e => e.texto).join(' | ');
    assert.match(texto, /Se cambia el título de «.+» a «.+ v2»\./);
    assert.match(texto, /Se cambia el fiscal de instrucción de Dra\. Laura Medina a Dr\. Pablo Sosa\./);
  });

  test('punto 44 · cambiar el rol de alguien que está en un operativo avisa dónde y en qué estado; confirmado, se cambia', async () => {
    const clave = Object.keys(ctx.agentes)[0];
    const u = ctx.usuarios[clave];
    const r = await ctx.api('PUT', `/usuarios/${u.uid}`, { rol: 'coordinador' });
    motivo(r, 409, 'cambio_rol_en_operativo');
    assert.match(r.json.error, /está en el operativo «.+» como agente \(Disponible\)/);
    motivo(await ctx.api('PUT', `/usuarios/${u.uid}`, { rol: 'coordinador', confirmarCambioRol: true }), 200);
    // Se deja como estaba (también confirmando: sigue en el operativo).
    motivo(await ctx.api('PUT', `/usuarios/${u.uid}`, { rol: 'agente', confirmarCambioRol: true }), 200);
  });
});
