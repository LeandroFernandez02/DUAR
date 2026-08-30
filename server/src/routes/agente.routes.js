/**
 * RUTAS · Portal del propio Agente
 * Se separa de operativo.routes.js a propósito: montarlo bajo /api/operativos
 * arriesgaría chocar con /api/operativos/:id según el orden de registro.
 */
import { Router } from 'express';
import * as registro from '../controllers/registro.controller.js';
import { requiereSesion } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/mi-operativo', requiereSesion, registro.miOperativoActual);

export default router;
