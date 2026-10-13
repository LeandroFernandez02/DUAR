/**
 * Lectura de archivos GPX (CU-31). Función pura, sin dependencias: un GPX es un
 * XML simple y sólo hacen falta los puntos del recorrido (trkpt, o rtept si el
 * archivo trae una ruta), con su elevación y su hora si las tiene.
 *
 * Lo que sale de acá es lo que el sistema toma como prueba de por dónde pasó
 * cada persona: no se corrige ni se "limpia" nada, salvo descartar puntos que
 * no son coordenadas válidas.
 */

const RE_PUNTO = /<(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
const attr = (texto, nombre) => {
  const m = texto.match(new RegExp(`\\b${nombre}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : null;
};
const etiqueta = (texto, nombre) => {
  const m = texto?.match(new RegExp(`<${nombre}>\\s*([^<]*?)\\s*</${nombre}>`));
  return m ? m[1] : null;
};

/**
 * @returns {{ puntos: {lat:number, lng:number, ele:number|null, t:Date|null}[], nombre: string|null }}
 */
export function leerGpx(texto) {
  const puntos = [];
  for (const m of String(texto).matchAll(RE_PUNTO)) {
    const lat = Number(attr(m[2], 'lat'));
    const lng = Number(attr(m[2], 'lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const eleTxt = etiqueta(m[3], 'ele');
    const ele = eleTxt !== null && eleTxt !== '' && Number.isFinite(Number(eleTxt)) ? Number(eleTxt) : null;
    const tTxt = etiqueta(m[3], 'time');
    const t = tTxt ? new Date(tTxt) : null;
    puntos.push({ lat, lng, ele, t: t && !Number.isNaN(t.getTime()) ? t : null });
  }
  const nombre = etiqueta(String(texto).match(/<trk>[\s\S]*?<\/trk>/)?.[0], 'name')
    ?? etiqueta(String(texto).match(/<metadata>[\s\S]*?<\/metadata>/)?.[0], 'name');
  return { puntos, nombre: nombre || null };
}

/**
 * Lo que se calcula del recorrido sin la base: horas de inicio y fin (del
 * primer y del último punto con hora), si trae elevación y el desnivel
 * acumulado (suma de subidas y de bajadas entre puntos consecutivos).
 * La distancia la mide la base (geografía exacta).
 */
export function resumirGpx(puntos) {
  const conHora = puntos.filter(p => p.t);
  const inicio = conHora.length ? conHora[0].t : null;
  const fin = conHora.length ? conHora[conHora.length - 1].t : null;
  const elevaciones = puntos.map(p => p.ele).filter(e => e !== null);
  const conElevacion = elevaciones.length >= 2;
  let sube = 0, baja = 0;
  if (conElevacion) {
    for (let i = 1; i < elevaciones.length; i++) {
      const d = elevaciones[i] - elevaciones[i - 1];
      if (d > 0) sube += d; else baja -= d;
    }
  }
  return {
    inicio, fin,
    duracionS: inicio && fin && fin >= inicio ? Math.round((fin - inicio) / 1000) : null,
    conElevacion,
    desnivelPositivoM: conElevacion ? Math.round(sube) : null,
    desnivelNegativoM: conElevacion ? Math.round(baja) : null,
  };
}

/** WKT de la línea en 3D (lng lat ele); sin elevación, ele = 0 y queda marcado con_elevacion = false. */
export function lineaWkt(puntos) {
  return `LINESTRING Z(${puntos.map(p => `${p.lng} ${p.lat} ${p.ele ?? 0}`).join(',')})`;
}
