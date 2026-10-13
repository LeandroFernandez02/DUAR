/**
 * MIDDLEWARE · Subida de fotos del Objetivo Buscado (CU-12/13/14)
 *
 * `memoryStorage`: nunca se escribe a disco — el runtime de producción es
 * serverless (Vercel), sin filesystem persistente entre invocaciones. El
 * buffer en memoria se sube directo a Supabase Storage desde el controlador.
 */
import multer from 'multer';

const MAX_FOTOS = 8;          // mismo máximo ya usado por el formulario del frontend
const MAX_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FOTOS },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      const err = new Error('Sólo se permiten imágenes.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

export const subirFotosMiddleware = upload.array('fotos', MAX_FOTOS);

/* ── Archivo GPX (Módulo 5 · CU-29) ─────────────────────────────────────── */
const GPX_MAX_BYTES = 4 * 1024 * 1024;   // techo de un envío en producción (Vercel ~4,5 MB)

const subirGpx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GPX_MAX_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!/\.gpx$/i.test(file.originalname ?? '')) {
      const err = new Error('El archivo tiene que ser .gpx');
      err.status = 400;
      err.motivo = 'archivo_no_gpx';
      return cb(err);
    }
    cb(null, true);
  },
}).single('archivo');

/** Un solo archivo .gpx en el campo `archivo`; los errores de multer, dichos para el GPX. */
export function subirGpxMiddleware(req, res, next) {
  subirGpx(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo GPX puede pesar hasta 4 MB.', motivo: 'archivo_grande' });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Se carga un archivo GPX por vez, en el campo «archivo».', motivo: 'archivo_invalido' });
    }
    if (err.motivo) return res.status(err.status ?? 400).json({ error: err.message, motivo: err.motivo });
    next(err);
  });
}
