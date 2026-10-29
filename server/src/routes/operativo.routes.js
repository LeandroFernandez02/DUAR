/**
 * RUTAS · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 *   · CU-12 Registrar Objetivo · CU-13 Actualizar Objetivo · CU-14 Consultar Objetivo
 *   · CU-16 Generar QR de Operativo · CU-20 Listar Personal del Incidente
 *   · Alta del agente en el operativo (CU-16 pasos 6-8)
 */
import { Router } from 'express';
import * as operativos from '../controllers/operativo.controller.js';
import * as qr from '../controllers/qr.controller.js';
import * as registro from '../controllers/registro.controller.js';
import * as agentesOperativo from '../controllers/agenteOperativo.controller.js';
import * as objetivo from '../controllers/objetivo.controller.js';
import * as grupos from '../controllers/grupo.controller.js';
import * as mando from '../controllers/mando.controller.js';
import * as poligonos from '../controllers/poligono.controller.js';
import * as tracks from '../controllers/track.controller.js';
import * as marcadores from '../controllers/marcador.controller.js';
import * as puntoCero from '../controllers/puntoCero.controller.js';
import * as informes from '../controllers/informe.controller.js';
import { requiereSesion, gestores, lectores } from '../middleware/auth.middleware.js';
import { subirFotosMiddleware, subirGpxMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

// Los CU-08..11 y CU-16 nombran a "Coordinador" como actor; se suma
// administrador con el mismo criterio ya usado en el resto del sistema
// (Usuarios, QR): quien gestiona el sistema puede hacer lo que el Coordinador.
// El Jefe de operativo (29/10) es `lectores`: ve todo (las consultas GET) y
// extrae informes, pero no modifica nada.

router.get( '/',              requiereSesion, lectores, operativos.listar);     // CU-11
router.post('/',              requiereSesion, gestores, operativos.crear);      // CU-08
router.get( '/:id',           requiereSesion, lectores, operativos.obtener);
router.put( '/:id',           requiereSesion, gestores, operativos.actualizar); // CU-09
router.post('/:id/activar',   requiereSesion, gestores, operativos.activar);    // CU-08 paso 8
router.post('/:id/pausar',    requiereSesion, gestores, operativos.pausar);     // pausa manual (24/10)
router.post('/:id/reanudar',  requiereSesion, gestores, operativos.reanudar);   // reanudar (24/10)
router.get( '/:id/finalizar/revision', requiereSesion, gestores, operativos.revisionFinalizar); // CU-10 5.1
router.post('/:id/finalizar', requiereSesion, gestores, operativos.finalizar);  // CU-10
router.delete('/:id',         requiereSesion, gestores, operativos.eliminar);

// El QR lo genera y exhibe quien conduce el operativo (CU-16 precondición).
router.get( '/:id/qr',           requiereSesion, gestores, qr.obtener);
router.post('/:id/qr/refrescar', requiereSesion, gestores, qr.refrescar);

// La grilla del personal: la consulta el Coordinador por polling.
router.get('/:id/personal', requiereSesion, lectores, qr.personal);

// El alta la hace el propio agente con su sesión, tras escanear el QR.
router.post('/:id/alta', requiereSesion, registro.altaEnOperativo);

// CU-18: el Coordinador agrega/edita/quita agentes directamente (sin QR).
router.post(  '/:id/agentes',            requiereSesion, gestores, agentesOperativo.agregar);
router.put(   '/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.actualizar);
router.delete('/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.quitar);

// CU-12/13/14: ficha del Objetivo Buscado (una por operativo — Aislamiento de Información).
router.get(   '/:id/objetivo',               requiereSesion, lectores, objetivo.obtener);
router.post(  '/:id/objetivo',               requiereSesion, gestores, objetivo.crear);
router.put(   '/:id/objetivo',               requiereSesion, gestores, objetivo.actualizar);
router.post(  '/:id/objetivo/fotos',         requiereSesion, gestores, subirFotosMiddleware, objetivo.subirFotos);
router.delete('/:id/objetivo/fotos/:fotoId', requiereSesion, gestores, objetivo.eliminarFoto);

// Módulo 4 · Grupos de Trabajo (CU-22 a CU-27). /mover y /automatico van antes
// que /:grupoId para que Express no los tome como un id.
router.get(   '/:id/grupos',                  requiereSesion, lectores, grupos.listar);           // CU-24
router.post(  '/:id/grupos',                  requiereSesion, gestores, grupos.crear);            // CU-22
router.post(  '/:id/grupos/automatico',       requiereSesion, gestores, grupos.armadoAutomatico); // CU-23
router.post(  '/:id/grupos/mover',            requiereSesion, gestores, grupos.mover);            // CU-22 6 / CU-25
router.put(   '/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.actualizar);       // CU-25 (nombre, Líder)
router.post(  '/:id/grupos/:grupoId/acciones', requiereSesion, gestores, grupos.accion);          // estados (24/09)
router.post(  '/:id/grupos/:grupoId/extraer', requiereSesion, gestores, grupos.extraer);          // CU-27
router.delete('/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.disolver);         // CU-26

// Puesto de comando: quién está de turno y en qué puesto — Jefe de operativo,
// Coordinador o Encargado (CU-15, migraciones 016 y 029). Lo ven los lectores
// (también el Jefe de operativo) y registran ingresos y egresos los gestores.
router.get( '/:id/mando',                requiereSesion, lectores, mando.estado);
router.post('/:id/mando/ingreso',        requiereSesion, gestores, mando.ingreso);
router.post('/:id/mando/retiro',         requiereSesion, gestores, mando.retiro);
router.post('/:id/mando/cambiar-puesto', requiereSesion, gestores, mando.cambiarPuesto);

// Módulo 5 · Mapa Operacional: polígonos y sus grupos (CU-29, 30, 37, 38, 39).
router.get(   '/:id/poligonos',                                     requiereSesion, lectores, poligonos.listar);
router.post(  '/:id/poligonos',                                     requiereSesion, gestores, poligonos.crear);        // CU-29
router.get(   '/:id/poligonos/:poligonoId',                         requiereSesion, lectores, poligonos.obtener);      // CU-39
router.put(   '/:id/poligonos/:poligonoId',                         requiereSesion, gestores, poligonos.actualizar);   // CU-37
router.delete('/:id/poligonos/:poligonoId',                         requiereSesion, gestores, poligonos.eliminar);     // CU-38
router.post(  '/:id/poligonos/:poligonoId/grupos',                  requiereSesion, gestores, poligonos.asignarGrupo); // CU-30
router.post(  '/:id/poligonos/:poligonoId/grupos/:grupoId/quitar',  requiereSesion, gestores, poligonos.quitarGrupo);
router.post(  '/:id/poligonos/:poligonoId/grupos/:grupoId/cambiar', requiereSesion, gestores, poligonos.cambiarGrupo);

// Módulo 5 · Tracks GPX (CU-31, CU-32, CU-38). /analizar va antes que /:trackId.
router.post(  '/:id/tracks/analizar', requiereSesion, gestores, subirGpxMiddleware, tracks.analizar); // CU-31 pasos 3-5
router.post(  '/:id/tracks',          requiereSesion, gestores, subirGpxMiddleware, tracks.crear);    // CU-31
router.get(   '/:id/tracks',          requiereSesion, lectores, tracks.listar);
router.get(   '/:id/tracks/:trackId', requiereSesion, lectores, tracks.obtener);
router.put(   '/:id/tracks/:trackId', requiereSesion, gestores, tracks.actualizar);                    // CU-32
router.delete('/:id/tracks/:trackId', requiereSesion, gestores, tracks.eliminar);                      // CU-38

// Módulo 5 · Marcadores: puntos de interés, hallazgos e instalaciones SCI (CU-34, CU-35, CU-38).
router.get(   '/:id/marcadores',                            requiereSesion, lectores, marcadores.listar);
router.post(  '/:id/marcadores',                            requiereSesion, gestores, marcadores.crear);        // CU-34
router.get(   '/:id/marcadores/:marcadorId',                requiereSesion, lectores, marcadores.obtener);
router.put(   '/:id/marcadores/:marcadorId',                requiereSesion, gestores, marcadores.actualizar);   // CU-35
router.delete('/:id/marcadores/:marcadorId',                requiereSesion, gestores, marcadores.eliminar);     // CU-38
router.post(  '/:id/marcadores/:marcadorId/fotos',          requiereSesion, gestores, subirFotosMiddleware, marcadores.subirFotos);
router.delete('/:id/marcadores/:marcadorId/fotos/:fotoId',  requiereSesion, gestores, marcadores.eliminarFoto);

// Módulo 5 · Punto Cero (con historial) y radios del operativo (CU-36).
router.get(   '/:id/punto-cero',       requiereSesion, lectores, puntoCero.obtener);
router.put(   '/:id/punto-cero',       requiereSesion, gestores, puntoCero.mover);
router.get(   '/:id/radios',           requiereSesion, lectores, puntoCero.listarRadios);
router.post(  '/:id/radios',           requiereSesion, gestores, puntoCero.crearRadio);
router.put(   '/:id/radios/:radioId',  requiereSesion, gestores, puntoCero.actualizarRadio);
router.delete('/:id/radios/:radioId',  requiereSesion, gestores, puntoCero.eliminarRadio);

// Módulo 6 · Informe por operativo (CU-41): qué se emite, generar y descargar copias guardadas.
// Extraer informes es lo único que el Jefe de operativo hace además de mirar.
router.get( '/:id/informes',                     requiereSesion, lectores, informes.listar);
router.post('/:id/informes',                     requiereSesion, lectores, informes.generar);
router.get( '/:id/informes/:informeId/descarga', requiereSesion, lectores, informes.descargar);

// Línea de tiempo del terreno (eventos_estado, migración 010).
router.get('/:id/grupos/:grupoId/linea-tiempo',            requiereSesion, lectores, grupos.lineaTiempoGrupo);
router.get('/:id/agentes/:agenteOperativoId/linea-tiempo', requiereSesion, lectores, grupos.lineaTiempoAgente);

export default router;
