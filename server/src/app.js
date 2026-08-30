/**
 * La aplicación Express del Sistema DUAR, sin arrancarla.
 *
 * Está separada de `index.js` a propósito: la MISMA app se usa de dos formas.
 *   · En desarrollo, `index.js` le hace `listen()` en el puerto 3001.
 *   · En Vercel, `/api/index.js` la exporta como función serverless — ahí no
 *     existe un puerto que escuchar, la plataforma invoca la app por request.
 *
 * Por eso acá no hay `listen`, ni `process.exit`, ni nada que asuma un proceso
 * de vida larga.
 *
 * Arquitectura MVC:
 *   · models/      → acceso a datos (SQL). No conocen HTTP.
 *   · controllers/ → reglas de negocio. Traducen entre HTTP y modelos.
 *   · routes/      → mapeo URL → controlador. Sin lógica.
 *   · middleware/  → sesión y permisos, transversales a todas las rutas.
 *
 * La Vista es la app React, que consume esta API.
 */
import express from 'express';
import cors from 'cors';
import { verificarConexion } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import operativoRoutes from './routes/operativo.routes.js';
import qrRoutes from './routes/qr.routes.js';
import agenteRoutes from './routes/agente.routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' })); // las fotos del objetivo viajan en base64
app.set('trust proxy', true);            // para registrar la IP real en las sesiones

/** Chequeo de salud: confirma que la API responde y que la base está viva. */
app.get('/api/health', async (_req, res) => {
  try {
    const info = await verificarConexion();
    res.json({ ok: true, db: info.db, host: info.host });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/catalogos', catalogoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/operativos', operativoRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api', agenteRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

/** Manejador de errores centralizado: ningún stack trace llega al cliente. */
app.use((err, _req, res, _next) => {
  console.error('[API]', err);
  // 23505 = unique_violation, 23503 = foreign_key_violation (PostgreSQL)
  if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (err.code === '23503') return res.status(409).json({ error: 'Referencia inválida entre entidades.' });
  res.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;
