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
