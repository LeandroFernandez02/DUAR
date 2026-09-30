/**
 * RUTAS · Portal del propio Agente
 * Se separa de operativo.routes.js a propósito: montarlo bajo /api/operativos
 * arriesgaría chocar con /api/operativos/:id según el orden de registro.
 */
import { Router } from 'express';
import * as registro from '../controllers/registro.controller.js';
import * as portal from '../controllers/portal.controller.js';
import { requiereSesion } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/mi-operativo', requiereSesion, registro.miOperativoActual);

// Módulo 4 · portal (modelo del 24/09): el Líder informa lo que pasó en el
// terreno (en lote, porque sin señal se acumulan) y el agente sin grupo se
// marca Disponible o No disponible. La autorización del Líder es por fila
// (grupos.lider_id), en el modelo. El Líder ya no disuelve.
router.get( '/mi-grupo',         requiereSesion, portal.miGrupo);
router.post('/mi-grupo/eventos', requiereSesion, portal.eventosMiGrupo);
router.put( '/mi-estado',        requiereSesion, portal.miEstado);

export default router;
