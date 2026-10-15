/**
 * SERVICIO · Emisión de informes (CU-41)
 *
 * Emitir un informe es una sola operación para quien lo pide: reservar el
 * código, reunir los datos, armar el PDF, calcular su huella SHA-256,
 * guardarlo en Storage y registrarlo. Si algo falla en el camino no queda
 * registro y no se descarga nada (CU-41 6.1): un informe sin copia guardada
 * no se podría verificar.
 *
 * Lo usan el botón «Informe» (parcial, o el final si falta) y la finalización
 * del operativo (CU-10 paso 6, el final).
 */
import { createHash } from 'crypto';
import { query } from '../config/db.js';
import * as Informe from '../models/informe.model.js';
import * as Storage from './storage.service.js';
import { generarPdf } from './informePdf.service.js';

const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export const urlVerificacion = codigo => `${FRONTEND_URL}/verificar/${codigo}`;
const hostVerificacion = () => `${FRONTEND_URL.replace(/^https?:\/\//, '')}/verificar`;

/**
 * Nombre con que se descarga, fácil de distinguir entre varios archivos:
 * «Informe parcial - Búsqueda de … - 2026-10-15 12h03.pdf».
 * La fecha es la hora de corte en Argentina, año primero para que se ordenen
 * solos; «h» en lugar de «:», que Windows no acepta en un nombre de archivo.
 */
export function nombreArchivo(informe, titulo) {
  const limpio = String(titulo ?? '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(informe.corteEn)).map(x => [x.type, x.value]));
  const tipo = informe.tipo === 'FINAL' ? 'Informe final' : 'Informe parcial';
  // Sin el código: va impreso en el PDF y en su QR, que es por donde se verifica.
  return [tipo, limpio, `${p.year}-${p.month}-${p.day} ${p.hour}h${p.minute}`].filter(Boolean).join(' - ') + '.pdf';
}

/**
 * Emite un informe nuevo y devuelve su registro (con `titulo` del operativo).
 * @param {string} operativoId
 * @param {'PARCIAL'|'FINAL'} tipo
 * @param {string} usuarioId quien lo pide (o quien finalizó el operativo)
 */
export async function emitir(operativoId, tipo, usuarioId) {
  const { rows: [u] } = await query(`SELECT nombre || ' ' || apellido AS nombre FROM usuarios WHERE id = $1`, [usuarioId]);

  for (let intento = 1; ; intento++) {
    const { codigo, numeroEnOperativo } = await Informe.reservarCodigo(operativoId);
    const generadoEn = new Date();
    const { rows: [op] } = await query(`SELECT fecha_hora_fin FROM operativos WHERE id = $1`, [operativoId]);
    // El final cubre hasta el fin del operativo; el parcial, hasta ahora.
    const corteEn = tipo === 'FINAL' && op?.fecha_hora_fin ? op.fecha_hora_fin : generadoEn;

    const datos = await Informe.reunirDatos(operativoId, corteEn);
    if (!datos) throw Object.assign(new Error('Operativo no encontrado.'), { status: 404 });

    const pdf = await generarPdf(datos, {
      codigo, numeroEnOperativo, tipo, generadoPor: u?.nombre ?? '—', generadoEn,
      urlVerificacion: urlVerificacion(codigo), hostVerificacion: hostVerificacion(),
    });
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    const archivoRuta = await Storage.subirInforme(operativoId, codigo, pdf);

    try {
      const id = await Informe.registrar({
        codigo, operativoId, numeroEnOperativo, tipo, corteEn, generadoPor: usuarioId, sha256, tamanoBytes: pdf.length, archivoRuta,
      });
      return { ...(await Informe.buscar(operativoId, id)), titulo: datos.operativo.titulo };
    } catch (err) {
      // El archivo subido no tiene registro: se quita para no dejar copias huérfanas.
      await Storage.borrarInformes([archivoRuta]).catch(() => {});
      if (err.code !== '23505') throw err;
      // Otro pedido ganó de mano: si era el final, se usa ese; si era el número, se reintenta.
      if (tipo === 'FINAL') {
        const existente = await Informe.finalDe(operativoId);
        if (existente) return { ...existente, titulo: datos.operativo.titulo };
      }
      if (intento >= 3) throw err;
    }
  }
}
