/**
 * SERVICIO · Fotos del Objetivo Buscado (Supabase Storage)
 *   · CU-12/13/14
 *
 * Única excepción a la decisión "no usar supabase-js/Auth" (ver db/README.md):
 * esa decisión es sobre AUTENTICACIÓN y consulta de datos — acá sólo se habla
 * con el Storage API para subir archivos y firmar URLs de lectura. Todo lo
 * demás del sistema sigue yendo 100% por `pg` contra el pooler.
 *
 * El bucket `objetivos-fotos` es PRIVADO (CU-12 Observaciones — "Aislamiento
 * de Información": la ficha no debe poder verse desde fuera del operativo).
 * Por eso se usa la SERVICE ROLE KEY, no la anon: el backend necesita
 * escribir/leer sin pasar por las políticas RLS de Storage, y las URLs que
 * entrega a las pantallas son firmadas y expiran solas — nunca se persiste
 * una URL pública ni un archivo público.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'objetivos-fotos';

const cliente = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

/** true si SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY están configuradas. */
export function estaConfigurado() {
  return cliente !== null;
}

/**
 * Sube un archivo al bucket privado. Path = `{operativoId}/{uuid}.{ext}` —
 * alcanza con el operativoId porque `objetivo_buscado.operativo_id` es
 * UNIQUE (una ficha por operativo): la carpeta ya aísla la foto por incidente,
 * reforzando a nivel de Storage el mismo aislamiento que exige el CU-12.
 *
 * Lanza si falla — a diferencia de `email.service.js`, subir la foto SÍ es lo
 * que pidió el Coordinador; el controlador decide cómo responder el error.
 */
export async function subir(operativoId, buffer, extension, contentType) {
  const path = `${operativoId}/${randomUUID()}.${extension}`;
  const { error } = await cliente.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir la foto a Storage: ${error.message}`);
  return path;
}

/**
 * Genera una URL firmada de lectura para un path ya guardado. Nunca lanza:
 * si falla (ej. el objeto ya no existe en Storage), se devuelve `null` y el
 * frontend simplemente no muestra esa miniatura — no debe tumbar toda la
 * ficha por una foto vieja/borrada por fuera del sistema.
 */
export async function generarUrlFirmada(path, ttlSegundos = 3600) {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.storage.from(BUCKET).createSignedUrl(path, ttlSegundos);
    if (error) {
      console.error('[storage] No se pudo firmar la URL:', error.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('[storage] No se pudo firmar la URL:', err.message);
    return null;
  }
}

/* ── Archivos GPX originales (Módulo 5 · CU-29) ────────────────────────────
 * Bucket PRIVADO aparte del de las fotos: el .gpx tal como lo subió el agente
 * es la prueba de lo recorrido (los datos del track no se editan, CU-30). El
 * bucket se crea solo la primera vez que hace falta, cerrado y limitado a
 * archivos de texto de hasta 4 MB (el techo de un envío en Vercel).
 */
const BUCKET_GPX = process.env.SUPABASE_BUCKET_GPX ?? 'tracks-gpx';
const GPX_MAX_BYTES = 4 * 1024 * 1024;
let bucketGpxListo = false;

async function asegurarBucketGpx() {
  if (bucketGpxListo) return;
  const { data } = await cliente.storage.getBucket(BUCKET_GPX);
  if (!data) {
    const { error } = await cliente.storage.createBucket(BUCKET_GPX, {
      public: false,
      fileSizeLimit: GPX_MAX_BYTES,
      allowedMimeTypes: ['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream'],
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(`No se pudo crear el bucket de GPX: ${error.message}`);
  }
  bucketGpxListo = true;
}

/** Guarda el .gpx original en `{operativoId}/{trackId}.gpx`. Lanza si falla. */
export async function subirGpx(operativoId, trackId, buffer) {
  if (!cliente) throw new Error('El almacenamiento de archivos no está configurado.');
  await asegurarBucketGpx();
  const path = `${operativoId}/${trackId}.gpx`;
  const { error } = await cliente.storage.from(BUCKET_GPX).upload(path, buffer, {
    contentType: 'application/gpx+xml', upsert: false,
  });
  if (error) throw new Error(`No se pudo guardar el archivo GPX: ${error.message}`);
  return path;
}

/** URL firmada para descargar el .gpx original (o null, sin tumbar la pantalla). */
export async function urlFirmadaGpx(path, ttlSegundos = 600) {
  if (!cliente || !path) return null;
  try {
    const { data, error } = await cliente.storage.from(BUCKET_GPX).createSignedUrl(path, ttlSegundos);
    return error ? null : data.signedUrl;
  } catch { return null; }
}

/** Sólo para el script de limpieza de datos de prueba: borra archivos GPX. */
export async function borrarGpx(paths) {
  if (!cliente || !paths.length) return 0;
  const { data, error } = await cliente.storage.from(BUCKET_GPX).remove(paths);
  if (error) throw new Error(`No se pudieron borrar los GPX de prueba: ${error.message}`);
  return data?.length ?? 0;
}
