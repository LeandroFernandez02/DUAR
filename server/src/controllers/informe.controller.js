/**
 * CONTROLADOR · Informe por operativo (CU-41)
 *   · GET  /api/operativos/:id/informes                    qué se va a emitir y los ya emitidos (paso 2)
 *   · POST /api/operativos/:id/informes                    genera y guarda (pasos 3-7)
 *   · GET  /api/operativos/:id/informes/:informeId/descarga copia guardada (N2)
 *   · GET  /api/informes/verificar/:codigo                 pública, sin datos personales (N1)
 *
 * La descarga va por una URL firmada de Storage (vence en 5 minutos): el PDF
 * no pasa por la función de Vercel, que corta las respuestas de más de 4,5 MB.
 */
import * as Operativo from '../models/operativo.model.js';
import * as Informe from '../models/informe.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as Storage from '../services/storage.service.js';
import { emitir, nombreArchivo } from '../services/informe.service.js';

const ENTIDAD = 'informes_operativo';

/** Lo que ve la pantalla de un informe: nunca la ruta interna del archivo. */
const publico = ({ archivoRuta, operativoId, ...i }) => i;

async function conUrl(informe, titulo) {
  const url = await Storage.urlFirmadaInforme(informe.archivoRuta, nombreArchivo(informe, titulo));
  if (!url) throw new Error('No se pudo preparar la descarga del informe.');
  return { informe: publico(informe), url, nombreArchivo: nombreArchivo(informe, titulo) };
}

/** GET /api/operativos/:id/informes */
export async function listar(req, res, next) {
  try {
    const op = await Operativo.buscarPorId(req.params.id);
    if (!op) return res.status(404).json({ error: 'Operativo no encontrado.' });
    const informes = await Informe.listar(op.id);
    const finalizado = op.estado === 'FINALIZADO';
    res.json({
      proximo: { tipo: finalizado ? 'FINAL' : 'PARCIAL', yaEmitido: finalizado && informes.some(i => i.tipo === 'FINAL') },
      informes: informes.map(publico),
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/informes
 * Abierto: emite un parcial con corte ahora. Finalizado: devuelve el final
 * (CU-41 2.1); si no se pudo emitir al finalizar, lo emite ahora.
 */
export async function generar(req, res, next) {
  try {
    const op = await Operativo.buscarPorId(req.params.id);
    if (!op) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (op.estado === 'ELIMINADO') return res.status(409).json({ error: 'El operativo fue eliminado: no tiene informe.' });

    if (op.estado === 'FINALIZADO') {
      const existente = await Informe.finalDe(op.id);
      if (existente) return res.json({ ...(await conUrl(existente, op.titulo)), nuevo: false });
    }

    let informe;
    try {
      informe = await emitir(op.id, op.estado === 'FINALIZADO' ? 'FINAL' : 'PARCIAL', req.usuario.id);
    } catch (err) {
      console.error('[informe] No se pudo generar:', err);
      return res.status(500).json({ error: 'No se pudo generar el informe. Intentá de nuevo.' });
    }

    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.CREAR, entidad: ENTIDAD, registroId: informe.id,
      valoresNuevos: { ...publico(informe), operativoId: op.id, motivo: 'Informe por operativo (CU-41)' }, ip: req.ip,
    });
    res.status(201).json({ ...(await conUrl(informe, op.titulo)), nuevo: true });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/informes/:informeId/descarga */
export async function descargar(req, res, next) {
  try {
    const op = await Operativo.buscarPorId(req.params.id);
    const informe = op && await Informe.buscar(op.id, req.params.informeId);
    if (!informe) return res.status(404).json({ error: 'Informe no encontrado.' });
    res.json(await conUrl(informe, op.titulo));
  } catch (err) { next(err); }
}

/** GET /api/informes/verificar/:codigo — pública. */
export async function verificar(req, res, next) {
  try {
    const codigo = String(req.params.codigo ?? '').trim();
    if (!/^INF-\d{4}-\d{4,}$/i.test(codigo)) return res.status(404).json({ error: 'No existe un informe con ese código.' });
    const informe = await Informe.paraVerificar(codigo);
    if (!informe) return res.status(404).json({ error: 'No existe un informe con ese código.' });
    res.json({ informe });
  } catch (err) { next(err); }
}
