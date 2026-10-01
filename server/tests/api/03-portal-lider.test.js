/**
 * Portal del Líder (modelo del 24/09, ajustado el 28/09): el Líder informa los
 * hechos del terreno y el coordinador puede registrarlos por radio. Cuando los
 * dos informan lo mismo, queda una confirmación; un aviso viejo nunca hace
 * retroceder el tablero; reenviar el mismo aviso no lo duplica.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { preparar, terminar, esperar } from '../ayudantes/entorno.js';

let ctx;
let G;
let tSalir;
const idCelular = randomUUID();

const aviso = (accion, ocurridoEn, id = randomUUID()) => ({ id, grupoId: G, accion, ocurridoEn: new Date(ocurridoEn).toISOString() });
const enviar = (clave, eventos) => ctx.api('POST', '/mi-grupo/eventos', { eventos }, ctx.usuarios[clave].token);
const resultado = r => r.json?.resultados?.[0]?.resultado;

describe('Portal del Líder: avisos del terreno y radio (CU-23)', () => {
  before(async () => {
    ctx = await preparar();
    G = (await ctx.crearGrupo('Portal', 'alfa')).json.grupo.id;
    await ctx.mover('bravo', G);
    await ctx.mover('delta', G);
    await ctx.accion(G, { accion: 'confirmar' });
    await ctx.accion(G, { accion: 'asignar', zona: 'Margen del arroyo' });
    await ctx.accion(G, { accion: 'salir' });
    tSalir = new Date((await ctx.grupoDb(G)).desde);
    await esperar(2500);
  });
  after(terminar);

  test('Portal · el Líder ve su grupo y sabe que lo lidera', async () => {
    const r = await ctx.api('GET', '/mi-grupo', undefined, ctx.usuarios.alfa.token);
    assert.equal(r.status, 200);
    assert.equal(r.json.grupo?.id, G);
    assert.equal(r.json.grupo?.soyLider, true);
  });

  test('Portal · la radio registra la llegada al polígono → Rastrillando', async () => {
    const r = await ctx.accion(G, { accion: 'llegar_poligono' });
    assert.equal(r.json?.grupo?.estado, 'RASTRILLANDO');
  });

  test('Portal · el mismo hecho informado por el Líder después queda como CONFIRMACIÓN', async () => {
    const tCelular = new Date(tSalir.getTime() + 1000);   // el Líder lo tocó antes de que entrara la radio
    const r = await enviar('alfa', [aviso('llegar_poligono', tCelular, idCelular)]);
    assert.equal(resultado(r), 'CONFIRMACION', JSON.stringify(r.json));
    const g = await ctx.grupoDb(G);
    assert.ok(Math.abs(new Date(g.desde) - tCelular) < 5, 'el "desde" se adelanta a la hora informada por el Líder');
  });

  test('Portal · reenviar el mismo aviso no lo duplica (idempotencia)', async () => {
    const r = await enviar('alfa', [aviso('llegar_poligono', tSalir.getTime() + 1000, idCelular)]);
    assert.equal(resultado(r), 'CONFIRMACION');
    const { rows } = await ctx.query(`SELECT count(*)::int AS n FROM eventos_estado WHERE cliente_evento_id = $1`, [idCelular]);
    assert.equal(rows[0].n, 1);
  });

  test('Portal · un integrante que no es el Líder → RECHAZADO', async () => {
    assert.equal(resultado(await enviar('bravo', [aviso('volver', Date.now())])), 'RECHAZADO');
  });

  test('Portal · una transición imposible (de Rastrillando a la base) → RECHAZADO y el tablero no se mueve', async () => {
    assert.equal(resultado(await enviar('alfa', [aviso('llegar_base', Date.now())])), 'RECHAZADO');
    assert.equal((await ctx.grupoDb(G)).estado, 'RASTRILLANDO');
  });

  test('Portal · con grupo, el agente no cambia su propio estado → 409 agente_en_grupo', async () => {
    const r = await ctx.api('PUT', '/mi-estado', { estado: 'NO_DISPONIBLE' }, ctx.usuarios.bravo.token);
    assert.equal(r.status, 409);
    assert.equal(r.json?.motivo, 'agente_en_grupo');
  });

  test('Portal · sin grupo, el agente se marca No disponible y Disponible', async () => {
    let r = await ctx.api('PUT', '/mi-estado', { estado: 'NO_DISPONIBLE' }, ctx.usuarios.eco.token);
    assert.equal(r.json?.agente?.estado, 'NO_DISPONIBLE', JSON.stringify(r.json));
    r = await ctx.api('PUT', '/mi-estado', { estado: 'DISPONIBLE' }, ctx.usuarios.eco.token);
    assert.equal(r.json?.agente?.estado, 'DISPONIBLE');
  });

  test('Portal · un aviso viejo que llega después de un cambio posterior → SUPERADO; el tablero no retrocede', async () => {
    // Segunda salida: vuelven a la base y salen de nuevo; abortan antes de llegar.
    await ctx.accion(G, { accion: 'volver' });
    await ctx.accion(G, { accion: 'llegar_base' });
    await ctx.accion(G, { accion: 'confirmar' });
    await ctx.accion(G, { accion: 'asignar', zona: 'Quebrada sur' });
    await ctx.accion(G, { accion: 'salir' });
    const tSalir2 = new Date((await ctx.grupoDb(G)).desde);
    await esperar(2500);
    await ctx.accion(G, { accion: 'volver' });
    const r = await enviar('alfa', [aviso('llegar_poligono', tSalir2.getTime() + 1000)]);
    assert.equal(resultado(r), 'SUPERADO', JSON.stringify(r.json));
    assert.equal((await ctx.grupoDb(G)).estado, 'REPLEGADO');
  });

  test('Portal · una hora futura del celular se aplica con la hora del servidor y queda marcada no confiable', async () => {
    const r = await enviar('alfa', [aviso('llegar_base', Date.now() + 3600e3)]);
    assert.equal(resultado(r), 'APLICADO', JSON.stringify(r.json));
    const ev = await ctx.ultimoEventoGrupo(G);
    assert.equal(ev.hora_confiable, false);
    assert.equal((await ctx.grupoDb(G)).estado, 'EN_ESPERA');
  });

  test('Línea de tiempo · la del Líder muestra su agrupamiento y cada cambio por cascada', async () => {
    const r = await ctx.api('GET', `/operativos/${ctx.op}/agentes/${ctx.agentes.alfa.id}/linea-tiempo`);
    const acciones = r.json.eventos.map(e => e.accion);
    assert.ok(acciones.includes('agrupar'), acciones.join(','));
    assert.ok(acciones.filter(a => a === 'cascada').length >= 6, acciones.join(','));
    const conConfirmacion = r.json.eventos.find(e => e.estadoNuevo === 'RASTRILLANDO' && e.confirmaciones?.length > 0);
    assert.equal(conConfirmacion?.confirmaciones[0].fuente, 'PORTAL_LIDER');
  });

  test('Línea de tiempo · la del grupo guarda lo rechazado y lo superado, con su fuente', async () => {
    const r = await ctx.api('GET', `/operativos/${ctx.op}/grupos/${G}/linea-tiempo`);
    const resultados = r.json.eventos.map(e => e.resultado);
    assert.ok(resultados.includes('SUPERADO') && resultados.includes('RECHAZADO'), resultados.join(','));
    const fuentes = new Set(r.json.eventos.map(e => e.fuente));
    for (const f of ['COORDINADOR', 'RADIO', 'PORTAL_LIDER']) assert.ok(fuentes.has(f), `falta la fuente ${f}`);
  });
});
