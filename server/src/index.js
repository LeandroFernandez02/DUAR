/**
 * Arranque de la API en DESARROLLO local.
 *
 * En producción (Vercel) este archivo no se usa: ahí la plataforma invoca
 * directamente la app exportada desde `app.js` a través de `/api/index.js`.
 * Acá vive todo lo que sólo tiene sentido en un proceso de vida larga:
 * escuchar un puerto y dejar el pool de conexiones caliente.
 */
import app from './app.js';
import { verificarConexionConReintentos, calentarPool } from './config/db.js';

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, async () => {
  try {
    const info = await verificarConexionConReintentos();
    console.log(`API DUAR escuchando en http://localhost:${PORT}`);
    console.log(`Base de datos conectada: ${info.db} @ ${info.host}`);
    const listas = await calentarPool();
    console.log(`Pool caliente: ${listas} conexiones listas`);
  } catch (err) {
    console.error('No se pudo conectar a PostgreSQL:', err.message);
  }
});
