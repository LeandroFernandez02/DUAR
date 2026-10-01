/**
 * RUTAS · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 *   · CU-12 Registrar Objetivo · CU-13 Actualizar Objetivo · CU-14 Consultar Objetivo
 *   · CU-15 Generar QR de Operativo · CU-19 Listar Personal del Incidente
 *   · Alta del agente en el operativo (CU-15 pasos 6-8)
 */
import { Router } from 'express';
import * as operativos from '../controllers/operativo.controller.js';
import * as qr from '../controllers/qr.controller.js';
import * as registro from '../controllers/registro.controller.js';
import * as agentesOperativo from '../controllers/agenteOperativo.controller.js';
import * as objetivo from '../controllers/objetivo.controller.js';
import * as grupos from '../controllers/grupo.controller.js';
import * as mando from '../controllers/mando.controller.js';
import { requiereSesion, requiereRol } from '../middleware/auth.middleware.js';
import { subirFotosMiddleware } from '../middleware/upload.middleware.js';

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

// CU-12/13/14: ficha del Objetivo Buscado (una por operativo — Aislamiento de Información).
router.get(   '/:id/objetivo',               requiereSesion, gestores, objetivo.obtener);
router.post(  '/:id/objetivo',               requiereSesion, gestores, objetivo.crear);
router.put(   '/:id/objetivo',               requiereSesion, gestores, objetivo.actualizar);
router.post(  '/:id/objetivo/fotos',         requiereSesion, gestores, subirFotosMiddleware, objetivo.subirFotos);
router.delete('/:id/objetivo/fotos/:fotoId', requiereSesion, gestores, objetivo.eliminarFoto);

// Módulo 4 · Grupos de Trabajo (CU-21 a CU-26). /mover y /automatico van antes
// que /:grupoId para que Express no los tome como un id.
router.get(   '/:id/grupos',                  requiereSesion, gestores, grupos.listar);           // CU-23
router.post(  '/:id/grupos',                  requiereSesion, gestores, grupos.crear);            // CU-21
router.post(  '/:id/grupos/automatico',       requiereSesion, gestores, grupos.armadoAutomatico); // CU-22
router.post(  '/:id/grupos/mover',            requiereSesion, gestores, grupos.mover);            // CU-21 6 / CU-24
router.put(   '/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.actualizar);       // CU-24 (nombre, Líder)
router.post(  '/:id/grupos/:grupoId/acciones', requiereSesion, gestores, grupos.accion);          // estados (24/09)
router.post(  '/:id/grupos/:grupoId/extraer', requiereSesion, gestores, grupos.extraer);          // CU-26
router.delete('/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.disolver);         // CU-25

// Puesto de comando: qué coordinadores están presentes y quién está a cargo
// (presencia de mando, migración 016). Lo ven y lo operan los gestores.
router.get( '/:id/mando',         requiereSesion, gestores, mando.estado);
router.post('/:id/mando/ingreso', requiereSesion, gestores, mando.ingreso);
router.post('/:id/mando/retiro',  requiereSesion, gestores, mando.retiro);
router.post('/:id/mando/a-cargo', requiereSesion, gestores, mando.aCargo);

// Línea de tiempo del terreno (eventos_estado, migración 010).
router.get('/:id/grupos/:grupoId/linea-tiempo',            requiereSesion, gestores, grupos.lineaTiempoGrupo);
router.get('/:id/agentes/:agenteOperativoId/linea-tiempo', requiereSesion, gestores, grupos.lineaTiempoAgente);

export default router;
