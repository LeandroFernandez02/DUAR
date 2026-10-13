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

console.log(JSON.stringify({ operativo: ctx.op, token: ctx.admin }));
await terminar();
