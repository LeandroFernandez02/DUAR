/**
 * Arma un escenario para mirar a mano el Módulo 5 en la pantalla (no es una
 * prueba): el operativo de pruebas con dos grupos confirmados y dos polígonos,
 * uno ya ocupado por un grupo de rastrillaje. Imprime el operativo y el token
 * de la sesión de prueba del admin. Después: npm run limpiar-pruebas -- --confirmar
 *
 *   node tests/ayudantes/escenario-mapa.mjs
 */
import 'dotenv/config';
import { preparar, terminar, cuadrado } from './entorno.js';

const ctx = await preparar();
const A = (await ctx.crearGrupo('Grupo Norte', 'alfa')).json.grupo.id;
await ctx.mover('bravo', A);
await ctx.accion(A, { accion: 'confirmar' });
const B = (await ctx.crearGrupo('Grupo Sur', 'charlie')).json.grupo.id;
await ctx.mover('delta', B);
await ctx.accion(B, { accion: 'confirmar' });

const p1 = await ctx.api('POST', `/operativos/${ctx.op}/poligonos`, { nombre: 'Quebrada Norte', geometria: cuadrado(30) });
const p2 = await ctx.api('POST', `/operativos/${ctx.op}/poligonos`, { nombre: 'Filo del Cerro', geometria: cuadrado(31) });
await ctx.api('POST', `/operativos/${ctx.op}/poligonos/${p2.json.poligono.id}/grupos`, { grupoId: B });

// Pasos 2 y 3: un recorrido dentro de «Filo del Cerro», marcadores, el Punto Cero entre los dos polígonos y dos radios.
const t0 = Date.parse('2026-10-13T13:00:00Z');
const pts = Array.from({ length: 13 }, (_, k) =>
  `<trkpt lat="${k % 2 ? -31.9845 : -31.9805}" lon="${-64.9395 + k * 0.00035}"><ele>${1850 + (k % 2) * 14}</ele><time>${new Date(t0 + k * 240000).toISOString()}</time></trkpt>`).join('');
await ctx.subir(`/operativos/${ctx.op}/tracks`, {
  archivo: { nombre: 'charlie-filo.gpx', contenido: `<?xml version="1.0"?><gpx version="1.1"><trk><name>Filo</name><trkseg>${pts}</trkseg></trk></gpx>` },
  campos: { agenteOperativoId: ctx.agentes.charlie.id },
});
await ctx.api('PUT', `/operativos/${ctx.op}/punto-cero`, { lat: -31.9825, lng: -64.9440, motivo: 'Escenario de prueba del mapa' });
await ctx.api('POST', `/operativos/${ctx.op}/marcadores`, { clase: 'HALLAZGO', nombre: 'Campera roja', descripcion: 'Talle M', detalle: 'Junto al arroyo', lat: -31.9822, lng: -64.9370 });
await ctx.api('POST', `/operativos/${ctx.op}/marcadores`, { clase: 'POI', nombre: 'Refugio de piedra', lat: -31.9790, lng: -64.9475 });
await ctx.api('POST', `/operativos/${ctx.op}/marcadores`, { clase: 'INSTALACION', tipoInstalacion: 'PUESTO_COMANDO', responsable: 'Prueba', lat: -31.9870, lng: -64.9450 });
await ctx.api('POST', `/operativos/${ctx.op}/radios`, { radioM: 500, color: '#0891B2' });
await ctx.api('POST', `/operativos/${ctx.op}/radios`, { radioM: 1000, color: '#DB2777' });

// Paso 2 (tracks): también la sesión de un agente (alfa, Líder del Grupo Norte) para su portal.
console.log(JSON.stringify({ operativo: ctx.op, token: ctx.admin, tokenAgente: ctx.usuarios.alfa.token }));
await terminar();
