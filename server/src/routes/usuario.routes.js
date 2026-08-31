/**
 * RUTAS · Usuarios (Módulo 2, CU-04..07)
 *
 * Según los CU, tanto el Administrador como el Coordinador pueden gestionar
 * usuarios. Un Agente no: sólo consulta lo suyo.
 */
import { Router } from 'express';
import * as usuarios from '../controllers/usuario.controller.js';
import { requiereSesion, requiereRol } from '../middleware/auth.middleware.js';

const router = Router();

// Todo el módulo exige sesión activa (CU-01 es precondición de los cuatro CU)
router.use(requiereSesion);

const gestores = requiereRol('administrador', 'coordinador');

router.get('/',              gestores, usuarios.listar);      // CU-04
router.get('/:id',           gestores, usuarios.obtener);
router.get('/:id/auditoria', gestores, usuarios.auditoria);
router.post('/',             gestores, usuarios.crear);       // CU-05
router.put('/:id',           gestores, usuarios.actualizar);  // CU-06
router.delete('/:id',        gestores, usuarios.eliminar);    // CU-07
router.post('/:id/reenviar-confirmacion', gestores, usuarios.reenviarConfirmacion);

export default router;
