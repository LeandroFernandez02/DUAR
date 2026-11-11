/**
 * RUTAS · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-12 Consultar
 *   · CU-13 Registrar Objetivo · CU-14 Actualizar Objetivo · CU-15 Consultar Objetivo
 *   · CU-17 Generar QR de Operativo · CU-21 Listar Personal del Incidente
 *   · Alta del agente en el operativo (CU-17 pasos 6-8)
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
import { requiereSesion, requiereRol } from '../middleware/auth.middleware.js';
import { subirFotosMiddleware, subirGpxMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

// Los CU-08..11 y CU-17 nombran a "Coordinador" como actor; se suma
// administrador con el mismo criterio ya usado en el resto del sistema
// (Usuarios, QR): quien gestiona el sistema puede hacer lo que el Coordinador.
const gestores = requiereRol('administrador', 'coordinador');
// Jefe de Operativo (rol del 02/11): consulta todo, saca informes y asigna al Jefe. No modifica nada más.
const consulta = requiereRol('administrador', 'coordinador', 'jefe de operativo');

router.get( '/',              requiereSesion, consulta, operativos.listar);     // CU-12
router.post('/',              requiereSesion, gestores, operativos.crear);      // CU-08
router.get( '/:id',           requiereSesion, consulta, operativos.obtener);
router.put( '/:id',           requiereSesion, gestores, operativos.actualizar); // CU-09
router.post('/:id/activar',   requiereSesion, gestores, operativos.activar);    // CU-08 paso 8
router.post('/:id/pausar',    requiereSesion, gestores, operativos.pausar);     // pausa manual (24/10)
router.post('/:id/reanudar',  requiereSesion, gestores, operativos.reanudar);   // reanudar (24/10)
router.get( '/:id/finalizar/revision', requiereSesion, consulta, operativos.revisionFinalizar); // CU-10 3.1
router.post('/:id/finalizar', requiereSesion, gestores, operativos.finalizar);  // CU-10
router.delete('/:id',         requiereSesion, gestores, operativos.eliminar);

// El QR lo genera y exhibe quien conduce el operativo (CU-17 precondición).
router.get( '/:id/qr',           requiereSesion, gestores, qr.obtener);
router.post('/:id/qr/refrescar', requiereSesion, gestores, qr.refrescar);

// La grilla del personal: la consulta el Coordinador por polling.
router.get('/:id/personal', requiereSesion, consulta, qr.personal);
// Panel del operativo: cuántos hubo cada día, por institución (incluye a quienes ya se fueron).
router.get('/:id/despliegue', requiereSesion, consulta, qr.despliegue);

// El alta la hace el propio agente con su sesión, tras escanear el QR.
router.post('/:id/alta', requiereSesion, registro.altaEnOperativo);

// CU-19: el Coordinador agrega/edita/quita agentes directamente (sin QR).
router.post(  '/:id/agentes',            requiereSesion, gestores, agentesOperativo.agregar);
router.put(   '/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.actualizar);
router.delete('/:id/agentes/:usuarioId', requiereSesion, gestores, agentesOperativo.quitar);

// CU-13/13/14: ficha del Objetivo Buscado (una por operativo — Aislamiento de Información).
router.get(   '/:id/objetivo',               requiereSesion, consulta, objetivo.obtener);
router.post(  '/:id/objetivo',               requiereSesion, gestores, objetivo.crear);
router.put(   '/:id/objetivo',               requiereSesion, gestores, objetivo.actualizar);
router.post(  '/:id/objetivo/fotos',         requiereSesion, gestores, subirFotosMiddleware, objetivo.subirFotos);
router.delete('/:id/objetivo/fotos/:fotoId', requiereSesion, gestores, objetivo.eliminarFoto);

// Módulo 4 · Grupos de Trabajo (CU-23 a CU-28). /mover y /automatico van antes
// que /:grupoId para que Express no los tome como un id.
router.get(   '/:id/grupos',                  requiereSesion, consulta, grupos.listar);           // CU-25
router.post(  '/:id/grupos',                  requiereSesion, gestores, grupos.crear);            // CU-23
router.post(  '/:id/grupos/automatico',       requiereSesion, gestores, grupos.armadoAutomatico); // CU-24
router.post(  '/:id/grupos/mover',            requiereSesion, gestores, grupos.mover);            // CU-23 6 / CU-26
router.put(   '/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.actualizar);       // CU-26 (nombre, Líder)
router.post(  '/:id/grupos/:grupoId/acciones', requiereSesion, gestores, grupos.accion);          // estados (24/09)
router.post(  '/:id/grupos/:grupoId/extraer', requiereSesion, gestores, grupos.extraer);          // CU-28
router.delete('/:id/grupos/:grupoId',         requiereSesion, gestores, grupos.disolver);         // CU-27

// Puesto de comando (CU-16, migraciones 016 y 030): el turno por puesto (Coordinador u Operador
// Mesa Coordinadora), que lo registran los gestores, y el Jefe de Operativo, que lo asignan
// también los jefes de operativo (02/11).
router.get( '/:id/mando',         requiereSesion, consulta, mando.estado);
router.post('/:id/mando/ingreso', requiereSesion, gestores, mando.ingreso);
router.post('/:id/mando/retiro',  requiereSesion, gestores, mando.retiro);
router.put( '/:id/mando/jefe',    requiereSesion, consulta, mando.jefe);

// Módulo 5 · Mapa Operacional: polígonos y sus grupos (CU-30, 30, 37, 38, 39).
router.get(   '/:id/poligonos',                                     requiereSesion, consulta, poligonos.listar);
router.post(  '/:id/poligonos',                                     requiereSesion, gestores, poligonos.crear);        // CU-30
router.get(   '/:id/poligonos/:poligonoId',                         requiereSesion, consulta, poligonos.obtener);      // CU-40
router.put(   '/:id/poligonos/:poligonoId',                         requiereSesion, gestores, poligonos.actualizar);   // CU-38
router.delete('/:id/poligonos/:poligonoId',                         requiereSesion, gestores, poligonos.eliminar);     // CU-39
router.post(  '/:id/poligonos/:poligonoId/grupos',                  requiereSesion, gestores, poligonos.asignarGrupo); // CU-31
router.post(  '/:id/poligonos/:poligonoId/grupos/:grupoId/quitar',  requiereSesion, gestores, poligonos.quitarGrupo);
router.post(  '/:id/poligonos/:poligonoId/grupos/:grupoId/cambiar', requiereSesion, gestores, poligonos.cambiarGrupo);

// Módulo 5 · Tracks GPX (CU-32, CU-33, CU-39). /analizar va antes que /:trackId.
router.post(  '/:id/tracks/analizar', requiereSesion, gestores, subirGpxMiddleware, tracks.analizar); // CU-32 pasos 3-5
router.post(  '/:id/tracks',          requiereSesion, gestores, subirGpxMiddleware, tracks.crear);    // CU-32
router.get(   '/:id/tracks',          requiereSesion, consulta, tracks.listar);
router.get(   '/:id/tracks/:trackId', requiereSesion, consulta, tracks.obtener);
router.put(   '/:id/tracks/:trackId', requiereSesion, gestores, tracks.actualizar);                    // CU-33
router.delete('/:id/tracks/:trackId', requiereSesion, gestores, tracks.eliminar);                      // CU-39

// Módulo 5 · Marcadores: puntos de interés, hallazgos e instalaciones SCI (CU-35, CU-36, CU-39).
router.get(   '/:id/marcadores',                            requiereSesion, consulta, marcadores.listar);
router.post(  '/:id/marcadores',                            requiereSesion, gestores, marcadores.crear);        // CU-35
// Aviso al coordinador de lo que cargaron los Líderes desde el portal (03/11). Antes de :marcadorId.
router.get(   '/:id/marcadores/novedades',                  requiereSesion, consulta, marcadores.novedades);
router.get(   '/:id/marcadores/:marcadorId',                requiereSesion, consulta, marcadores.obtener);
router.put(   '/:id/marcadores/:marcadorId',                requiereSesion, gestores, marcadores.actualizar);   // CU-36
router.delete('/:id/marcadores/:marcadorId',                requiereSesion, gestores, marcadores.eliminar);     // CU-39
router.post(  '/:id/marcadores/:marcadorId/fotos',          requiereSesion, gestores, subirFotosMiddleware, marcadores.subirFotos);
router.delete('/:id/marcadores/:marcadorId/fotos/:fotoId',  requiereSesion, gestores, marcadores.eliminarFoto);

// Módulo 5 · Punto Cero (con historial) y radios del operativo (CU-37).
router.get(   '/:id/punto-cero',       requiereSesion, consulta, puntoCero.obtener);
router.put(   '/:id/punto-cero',       requiereSesion, gestores, puntoCero.mover);
router.get(   '/:id/radios',           requiereSesion, consulta, puntoCero.listarRadios);
router.post(  '/:id/radios',           requiereSesion, gestores, puntoCero.crearRadio);
router.put(   '/:id/radios/:radioId',  requiereSesion, gestores, puntoCero.actualizarRadio);
router.delete('/:id/radios/:radioId',  requiereSesion, gestores, puntoCero.eliminarRadio);

// Módulo 6 · Informe por operativo (CU-42): qué se emite, generar y descargar copias guardadas.
router.get( '/:id/informes',                     requiereSesion, consulta, informes.listar);
router.post('/:id/informes',                     requiereSesion, consulta, informes.generar);
router.get( '/:id/informes/:informeId/descarga', requiereSesion, consulta, informes.descargar);

// Línea de tiempo del terreno (eventos_estado, migración 010).
router.get('/:id/grupos/:grupoId/linea-tiempo',            requiereSesion, consulta, grupos.lineaTiempoGrupo);
router.get('/:id/agentes/:agenteOperativoId/linea-tiempo', requiereSesion, consulta, grupos.lineaTiempoAgente);

export default router;
