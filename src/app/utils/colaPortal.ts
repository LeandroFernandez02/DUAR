/**
 * Cola del celular para lo que marca el Líder de Grupo sin señal (pedido del 03/11).
 *
 * En el terreno casi nunca hay conexión: el punto de interés o hallazgo y sus fotos se guardan
 * en el celular (IndexedDB, porque las fotos no entran en localStorage) con la hora en que se
 * marcó, y se mandan solos al volver la señal: al guardar, al recuperar la conexión y cada
 * tanto mientras el portal está abierto. Cada punto y cada foto llevan un id generado acá, así
 * que si un envío se corta y se repite, la API no duplica nada.
 *
 * Si la API rechaza algo (no es por la señal: por ejemplo, ya no es Líder), queda en la cola
 * con el motivo para que el Líder lo vea y lo descarte.
 */
import { portalApi, ApiError, type MarcadorLiderNuevo } from '../services/api';

export interface FotoPendiente { clienteId: string; blob: Blob; nombre: string }

export interface Pendiente {
  /** El id del punto (el mismo que se manda como clienteId) o, para fotos sueltas, uno propio. */
  id: string;
  /** Punto nuevo, o fotos para un punto ya cargado (`marcadorId`). */
  tipo: 'marcador' | 'fotos';
  datos?: MarcadorLiderNuevo;
  /** Id del punto en la API: lo trae el envío del punto, o viene dado para fotos sueltas. */
  marcadorId?: string;
  nombre: string;
  clase: 'POI' | 'HALLAZGO';
  fotos: FotoPendiente[];
  guardadoEn: string;
  /** Rechazado por la API (no por falta de señal): el motivo. */
  error?: string;
}

const BASE = 'calivar-portal';
const ALMACEN = 'pendientes';

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Contexto no seguro (http en la red local): v4 con getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => { pedido.result.createObjectStore(ALMACEN, { keyPath: 'id' }); };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => mal(pedido.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((ok, mal) => {
      const tx = db.transaction(ALMACEN, modo);
      const pedido = fn(tx.objectStore(ALMACEN));
      tx.oncomplete = () => ok(pedido.result);
      tx.onerror = () => mal(tx.error);
    });
  } finally { db.close(); }
}

const escuchas = new Set<() => void>();
const avisar = () => escuchas.forEach(f => f());

/** Para que la pantalla se actualice cuando algo entra, sale o cambia en la cola. */
export function escucharCola(f: () => void): () => void {
  escuchas.add(f);
  return () => { escuchas.delete(f); };
}

export async function listarPendientes(): Promise<Pendiente[]> {
  try {
    const todos = await operar<Pendiente[]>('readonly', s => s.getAll() as IDBRequest<Pendiente[]>);
    return todos.sort((a, b) => a.guardadoEn.localeCompare(b.guardadoEn));
  } catch { return []; }
}

const guardar = (p: Pendiente) => operar('readwrite', s => s.put(p)).then(avisar);
const borrar = (id: string) => operar('readwrite', s => s.delete(id)).then(avisar);

export async function encolar(p: Pendiente): Promise<void> {
  await guardar(p);
  void enviarPendientes();
}

export const descartar = borrar;

/** ¿Falló por la señal (y conviene reintentar) o lo rechazó la API? */
const esFaltaDeSenal = (err: unknown) => !(err instanceof ApiError) || err.status === 0 || err.status >= 500;

let enCurso: Promise<number> | null = null;

/**
 * Manda lo pendiente, en el orden en que se guardó. Devuelve cuántos puntos quedaron cargados
 * del todo en esta pasada. Si ya hay un envío en curso, espera ese.
 */
export function enviarPendientes(): Promise<number> {
  if (!enCurso) enCurso = enviar().finally(() => { enCurso = null; });
  return enCurso;
}

async function enviar(): Promise<number> {
  let listos = 0;
  for (const p of await listarPendientes()) {
    if (p.error) continue;
    try {
      if (p.tipo === 'marcador' && !p.marcadorId && p.datos) {
        const { marcador } = await portalApi.crearMiMarcador(p.datos);
        p.marcadorId = marcador.id;
        await guardar(p);
      }
      while (p.marcadorId && p.fotos.length) {
        const [foto] = p.fotos;
        await portalApi.subirFotoMiMarcador(p.marcadorId, foto.blob, foto.nombre, foto.clienteId);
        p.fotos = p.fotos.slice(1);
        await guardar(p);
      }
      await borrar(p.id);
      listos += 1;
    } catch (err) {
      if (esFaltaDeSenal(err)) break;   // sin señal: se reintenta todo más tarde
      p.error = err instanceof ApiError ? err.message : 'No se pudo cargar.';
      await guardar(p);
    }
  }
  return listos;
}

/**
 * Achica la foto antes de guardarla (el celular saca 4–12 MB; en producción un envío admite
 * unos 4,5 MB). Lado mayor 1920 px, JPEG. Si el navegador no puede, va la original.
 */
export async function achicarFoto(archivo: File): Promise<{ blob: Blob; nombre: string }> {
  const LADO = 1920;
  try {
    const img = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO / Math.max(img.width, img.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.width * escala);
    lienzo.height = Math.round(img.height * escala);
    lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    img.close();
    const blob = await new Promise<Blob | null>(ok => lienzo.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob) throw new Error('sin blob');
    return { blob, nombre: archivo.name.replace(/\.[^.]+$/, '') + '.jpg' };
  } catch {
    return { blob: archivo, nombre: archivo.name || 'foto.jpg' };
  }
}
