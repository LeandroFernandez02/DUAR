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
