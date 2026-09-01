/**
 * RUTAS · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 *   · CU-15 Generar QR de Operativo · CU-19 Listar Personal del Incidente
 *   · Alta del agente en el operativo (CU-15 pasos 6-8)
 */
import { Router } from 'express';
import * as operativos from '../controllers/operativo.controller.js';
import * as qr from '../controllers/qr.controller.js';
import * as registro from '../controllers/registro.controller.js';
import * as agentesOperativo from '../controllers/agenteOperativo.controller.js';
import { requiereSesion, requiereRol } from '../middleware/auth.middleware.js';

const router = Router();

// Los CU-08..11 y CU-15 nombran a "Coordinador" como actor; se suma
// administrador con el mismo criterio ya usado en el resto del sistema
// (Usuarios, QR): quien gestiona el sistema puede hacer lo que el Coordinador.
const gestores = requiereRol('administrador', 'coordinador');

router.get( '/',              requiereSesion, gestores, operativos.listar);     // CU-11
router.post('/',              requiereSesion, gestores, operativos.crear);      // CU-08
router.get( '/:id',           requiereSesion, gestores, operativos.obtener);
router.put( '/:id',           requiereSesion, gestores, operativos.actualizar); // CU-09
router.post('/:id/activar',   requiereSesion, gestores, operativos.activar);    // CU-08 paso 8
router.post('/:id/finalizar', requiereSesion, gestores, operativos.finalizar);  // CU-10
router.delete('/:id',         requiereSesion, gestores, operativos.eliminar);

// El QR lo genera y exhibe quien conduce el operativo (CU-15 precondición).
router.get( '/:id/qr',           requiereSesion, gestores, qr.obtener);
router.post('/:id/qr/refrescar', requiereSesion, gestores, qr.refrescar);

// La grilla del personal: la consulta el Coordinador por polling.
router.get('/:id/personal', requiereSesion, gestores, qr.personal);

// El alta la hace el propio agente con su sesión, tras escanear el QR.
router.post('/:id/alta', requiereSesion, registro.altaEnOperativo);

// CU-17: el Coordinador agrega/edita/quita agentes directamente (sin QR).
router.post(  '/:id/agentes',            requiereSesion, gestores, agentesOperativo.agregar);
router.put(   '/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.actualizar);
router.delete('/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.quitar);

export default router;
