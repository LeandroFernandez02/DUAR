/**
 * RUTAS · Usuarios (Módulo 2, CU-04..07)
 *
 * Según los CU, tanto el Administrador como el Coordinador pueden gestionar
 * usuarios. El Jefe de operativo (29/10) los consulta, sin modificar nada.
 * Un Agente no: sólo consulta lo suyo.
 */
import { Router } from 'express';
import * as usuarios from '../controllers/usuario.controller.js';
import { requiereSesion, gestores, lectores } from '../middleware/auth.middleware.js';

const router = Router();

// Todo el módulo exige sesión activa (CU-01 es precondición de los cuatro CU)
router.use(requiereSesion);

router.get('/',              lectores, usuarios.listar);      // CU-04
router.get('/:id',           lectores, usuarios.obtener);
router.get('/:id/auditoria', lectores, usuarios.auditoria);
router.post('/',             gestores, usuarios.crear);       // CU-05
router.put('/:id',           gestores, usuarios.actualizar);  // CU-06
router.delete('/:id',        gestores, usuarios.eliminar);    // CU-07
router.post('/:id/reenviar-confirmacion', gestores, usuarios.reenviarConfirmacion);

export default router;
