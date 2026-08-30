/**
 * Punto de entrada de la API en Vercel.
 *
 * Vercel convierte cada archivo dentro de `/api` en una función serverless.
 * Una app de Express es, en el fondo, una función `(req, res)`, así que
 * exportarla alcanza: Vercel la invoca por cada request.
 *
 * El `vercel.json` reescribe TODO `/api/*` hacia acá, de modo que una sola
 * función atiende la API completa. Eso es deliberado: si hubiera un archivo por
 * ruta, cada uno sería una función distinta, con su propio arranque en frío y
 * su propio pool de conexiones a PostgreSQL — justo lo que hay que evitar.
 *
 * La lógica no vive acá: está en `server/src/app.js`, la misma app que corre en
 * desarrollo. Este archivo es sólo el adaptador a la plataforma.
 */
export { default } from '../server/src/app.js';
