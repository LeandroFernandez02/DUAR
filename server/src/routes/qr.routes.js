/**
 * RUTAS · Validación pública del QR (CU-15 pasos 4-5)
 *
 * Deliberadamente SIN sesión: el agente acaba de escanear con su celular y
 * todavía puede no tener cuenta. Recién después el flujo lo deriva a iniciar
 * sesión (CU-01) o a registrarse (CU-02).
 */
import { Router } from 'express';
import * as qr from '../controllers/qr.controller.js';

const router = Router();

router.get('/:token', qr.validar);

export default router;
