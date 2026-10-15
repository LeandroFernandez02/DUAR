/**
 * SERVICIO · PDF del Informe por operativo (CU-41)
 *
 * Arma el documento con pdfmake a partir de `Informe.reunirDatos`, siguiendo el
 * diseño aprobado el 14/10: carátula (datos, cifras, persona buscada) →
 * hallazgos, mapa e historial del Punto Cero → polígonos, grupos, puesto de
 * comando, novedades y bajas → cronología → personal y constancia con firmas.
 *
 * Todo sale de archivos locales (fuentes en server/assets/fuentes) y de los
 * datos: el PDF no descarga nada de internet. Las fotos se achican a 1200 px
 * para que el informe no pese decenas de megas.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import pdfmake from 'pdfmake';
import sharp from 'sharp';
import * as Storage from './storage.service.js';
import { mapaSvg, ATRIBUCION } from './informeMapa.js';
import { coord, fmtDistancia, codigoOperativo } from '../models/informe.model.js';
import { ETIQUETA_GRUPO } from '../models/estados.js';

const FUENTES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fuentes');
const F = archivo => path.join(FUENTES, archivo);

pdfmake.setUrlAccessPolicy(() => false);                       // nada de internet
pdfmake.setLocalAccessPolicy(ruta => path.resolve(ruta).startsWith(FUENTES));
pdfmake.addFonts({
  Inter: {
    normal: F('inter-latin-400-normal.woff'), bold: F('inter-latin-600-normal.woff'),
    italics: F('inter-latin-400-normal.woff'), bolditalics: F('inter-latin-600-normal.woff'),
  },
  InterNegra: {
    normal: F('inter-latin-700-normal.woff'), bold: F('inter-latin-700-normal.woff'),
    italics: F('inter-latin-700-normal.woff'), bolditalics: F('inter-latin-700-normal.woff'),
  },
  InterMedia: {
    normal: F('inter-latin-500-normal.woff'), bold: F('inter-latin-500-normal.woff'),
    italics: F('inter-latin-500-normal.woff'), bolditalics: F('inter-latin-500-normal.woff'),
  },
  Serif: {
    normal: F('source-serif-4-latin-700-normal.woff'), bold: F('source-serif-4-latin-700-normal.woff'),
    italics: F('source-serif-4-latin-700-normal.woff'), bolditalics: F('source-serif-4-latin-700-normal.woff'),
  },
  Mono: {
    normal: F('jetbrains-mono-latin-400-normal.woff'), bold: F('jetbrains-mono-latin-500-normal.woff'),
    italics: F('jetbrains-mono-latin-400-normal.woff'), bolditalics: F('jetbrains-mono-latin-500-normal.woff'),
  },
});

const C = {
  tinta: '#2b2827', tenue: '#6f6866', linea: '#dcd5d2', lineaSuave: '#eee9e7', celda: '#f8f4f3',
  duar: '#e54b4b', duarOscuro: '#b8302f', alerta: '#fdecec',
};
const ZONA = 'America/Argentina/Cordoba';
const ANCHO = 515;   // A4 (595 pt) menos 40 pt de margen a cada lado

/* ── Formatos ──────────────────────────────────────────────────────────── */

const partesFecha = d => Object.fromEntries(new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'long',
}).formatToParts(new Date(d)).map(p => [p.type, p.value]));

export const fechaHora = d => { if (!d) return '—'; const p = partesFecha(d); return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`; };
const fechaCorta = d => { if (!d) return '—'; const p = partesFecha(d); return `${p.day}/${p.month} ${p.hour}:${p.minute}`; };
const hora = d => { const p = partesFecha(d); return `${p.hour}:${p.minute}`; };
const dia = d => { const p = partesFecha(d); return { clave: `${p.year}-${p.month}-${p.day}`, texto: `${p.day}/${p.month}/${p.year}`, nombre: p.weekday }; };
const num = (v, dec = 0) => Number(v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const km2 = m2 => `${num((m2 ?? 0) / 1e6, 2)} km²`;
const coords = (lat, lng) => `${coord(lat)}  ${coord(lng)}`;

function duracion(desde, hasta) {
  const min = Math.max(0, Math.round((new Date(hasta) - new Date(desde)) / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  return `${d ? `${d} d ` : ''}${h} h ${String(m).padStart(2, '0')} min`;
}

/* ── Piezas ────────────────────────────────────────────────────────────── */

const mono = (text, extra = {}) => ({ text, font: 'Mono', fontSize: 7.6, ...extra });
const tenue = (text, extra = {}) => ({ text, color: C.tenue, ...extra });

let numeroSeccion = 0;
function seccion(titulo, nota) {
  numeroSeccion++;
  return [
    { text: [{ text: `${numeroSeccion}  `, font: 'Mono', color: C.duarOscuro, fontSize: 8.5 }, { text: titulo, font: 'InterNegra' }],
      fontSize: 10.5, margin: [0, 14, 0, nota ? 2 : 6], headlineLevel: 1 },
    ...(nota ? [tenue(nota, { fontSize: 7.8, margin: [0, 0, 0, 6], headlineLevel: 2 })] : []),
  ];
}

const vacio = texto => ({ text: texto, color: C.tenue, italics: true, margin: [0, 2, 0, 4] });

const LAYOUT_TABLA = {
  hLineWidth: (i, node) => (i === 1 ? 1 : i === 0 || i === node.table.body.length ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: i => (i === 1 ? C.tinta : C.lineaSuave),
  paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3,
  fillColor: i => (i === 0 ? C.celda : null),
};

function tabla(encabezados, filas, widths, extra = {}) {
  return {
    table: {
      headerRows: 1, keepWithHeaderRows: 1, widths, dontBreakRows: true,
      body: [encabezados.map(h => ({ text: h.toUpperCase(), fontSize: 6.6, bold: true, color: C.tenue, characterSpacing: 0.3 })), ...filas],
    },
    layout: LAYOUT_TABLA, fontSize: 7.8, ...extra,
  };
}

/** Pares rótulo / valor en dos columnas (datos del operativo y de la persona). */
function ficha(pares, columnas = 2) {
  const celdas = pares.map(([r, v, ancho]) => ({
    ancho,
    contenido: { columns: [
      tenue(r, { width: 92, fontSize: 7.6 }),
      v && typeof v === 'object' ? { width: '*', ...v } : { width: '*', text: v ?? '—', font: 'InterMedia' },
    ], columnGap: 6 },
  }));
  const body = [];
  let fila = [];
  for (const c of celdas) {
    if (c.ancho || columnas === 1) {
      if (fila.length) { body.push([...fila, ...Array(columnas - fila.length).fill({})]); fila = []; }
      body.push([{ ...c.contenido, colSpan: columnas }, ...Array(columnas - 1).fill({})]);
    } else {
      fila.push(c.contenido);
      if (fila.length === columnas) { body.push(fila); fila = []; }
    }
  }
  if (fila.length) body.push([...fila, ...Array(columnas - fila.length).fill({})]);
  return {
    table: { widths: Array(columnas).fill('*'), body },
    layout: {
      hLineWidth: i => (i === 0 ? 0.8 : 0.5), vLineWidth: () => 0,
      hLineColor: i => (i === 0 ? C.linea : C.lineaSuave),
      paddingLeft: () => 0, paddingRight: i => (i === 0 ? 12 : 0), paddingTop: () => 3.5, paddingBottom: () => 3.5,
    },
  };
}

function chip(texto, rojo = false) {
  return { text: ` ${texto} `, fontSize: 6.4, bold: true, color: rojo ? C.duarOscuro : C.tenue, background: rojo ? C.alerta : C.celda };
}

/* ── Fotos ─────────────────────────────────────────────────────────────── */

/** Descarga y achica las fotos (JPEG de hasta 1200 px). Las que fallan quedan como null. */
async function prepararFotos(paths) {
  return Promise.all(paths.map(async p => {
    const original = await Storage.descargarFoto(p);
    if (!original) return null;
    try {
      const jpg = await sharp(original).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
      return `data:image/jpeg;base64,${jpg.toString('base64')}`;
    } catch { return null; }
  }));
}

function grillaFotos(fotos, ancho = ANCHO, porFila = 4) {
  if (!fotos.length) return null;
  const w = (ancho - (porFila - 1) * 6) / porFila;
  const filas = [];
  for (let i = 0; i < fotos.length; i += porFila) {
    filas.push({
      columns: fotos.slice(i, i + porFila).map((f, j) => (f
        ? { image: f, fit: [w, w * 0.75], width: w }
        : { width: w, text: `Foto ${i + j + 1}: no se pudo leer el archivo guardado.`, fontSize: 7, color: C.tenue })),
      columnGap: 6, margin: [0, 4, 0, 0],
    });
  }
  return { stack: filas };
}

/* ── Documento ─────────────────────────────────────────────────────────── */

/**
 * @param {object} d    resultado de Informe.reunirDatos
 * @param {object} meta { codigo, numeroEnOperativo, tipo: 'PARCIAL'|'FINAL', generadoPor, generadoEn, urlVerificacion, hostVerificacion }
 * @returns {Promise<Buffer>}
 */
export async function generarPdf(d, meta) {
  numeroSeccion = 0;
  const { operativo: op } = d;
  const final = meta.tipo === 'FINAL';
  const etiquetaTipo = final ? 'Informe final' : 'Informe parcial';
  const opCodigo = codigoOperativo(op.id);

  const [fotosObjetivo, fotosHallazgos] = await Promise.all([
    prepararFotos(d.objetivo?.fotos ?? []),
    Promise.all(d.hallazgos.map(h => prepararFotos(h.fotos))),
  ]);

  const contenido = [];
  const add = (...x) => contenido.push(...x.flat().filter(Boolean));

  /* Carátula */
  add(
    { text: 'INFORME DE OPERATIVO DE BÚSQUEDA Y RESCATE', fontSize: 7.2, bold: true, color: C.tenue, characterSpacing: 1.2, margin: [0, 4, 0, 4] },
    { text: op.titulo, font: 'Serif', fontSize: 21, lineHeight: 1.1, margin: [0, 0, 0, 6] },
    {
      columns: [
        { width: 'auto', table: { body: [[{ text: etiquetaTipo.toUpperCase(), bold: true, fontSize: 7.4, color: C.duarOscuro, characterSpacing: 0.8 }]] },
          layout: { hLineColor: () => C.duarOscuro, vLineColor: () => C.duarOscuro, hLineWidth: () => 1.2, vLineWidth: () => 1.2, paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 2, paddingBottom: () => 1 } },
        { width: '*', text: [tenue('Datos al '), mono(fechaHora(d.corteEn), { color: C.tinta, bold: true }), tenue(' (hora de Argentina, UTC−3)')], fontSize: 8, margin: [10, 3, 0, 0] },
      ],
    },
  );
  if (!final) {
    add({
      table: { widths: ['*'], body: [[{ text: 'El operativo no está finalizado. Este informe reúne lo registrado hasta la hora de corte; lo que ocurra después no figura acá. Al finalizar el operativo se emite el informe final.', fontSize: 7.8 }]] },
      layout: { hLineWidth: () => 0, vLineWidth: i => (i === 0 ? 2.5 : 0), vLineColor: () => C.duar, fillColor: () => C.alerta, paddingLeft: () => 8, paddingTop: () => 5, paddingBottom: () => 5 },
      margin: [0, 10, 0, 0],
    });
  }

  /* 1 · Datos del operativo */
  const aCargo = d.mandos.find(m => !m.hasta) ?? d.mandos[d.mandos.length - 1];
  const pcVigente = d.puntoCero[d.puntoCero.length - 1];
  add(seccion('Datos del operativo'), ficha([
    ['N.º de operativo', opCodigo],
    ['Estado', { text: ESTADO[op.estado] ?? op.estado, font: 'InterMedia' }],
    ['Localidad', op.localidad],
    ['Inicio', fechaHora(op.fechaHoraInicio ?? op.creadoEn)],
    ['Fiscal de instrucción', op.fiscalInstruccion],
    [final ? 'Fin' : 'Duración al corte', final ? fechaHora(op.fechaHoraFin) : duracion(op.fechaHoraInicio ?? op.creadoEn, d.corteEn)],
    ['Creado por', op.creadoPor],
    [final ? 'A cargo al cierre' : 'A cargo al corte', aCargo?.nombre ?? 'Nadie registrado'],
    ['Punto Cero vigente', { text: [mono(coords(op.puntoCeroLat, op.puntoCeroLng)), tenue(pcVigente?.registradoEn ? `  ·  desde ${fechaCorta(pcVigente.registradoEn)}` : '')] }, true],
    ['Descripción', { text: op.descripcion || '—' }, true],
  ]));

  /* 2 · Resumen */
  const instituciones = new Set(d.personal.map(p => p.institucion).filter(Boolean));
  const personas = new Set(d.personal.map(p => p.dni));
  const especiales = d.grupos.filter(g => g.clase === 'ESPECIAL').length;
  const areaTotal = d.poligonos.reduce((s, p) => s + (p.areaM2 ?? 0), 0);
  const revisada = d.poligonos.reduce((s, p) => s + (p.areaM2 ?? 0) * (p.coberturaPct ?? 0) / 100, 0);
  const kmTotal = d.poligonos.reduce((s, p) => s + (p.coberturaKm ?? 0), 0);
  const cifras = [
    [num(personas.size), `${personas.size === 1 ? 'agente intervino' : 'agentes intervinieron'}, de ${instituciones.size} ${instituciones.size === 1 ? 'institución' : 'instituciones'}`],
    [num(d.grupos.length), `grupos: ${d.grupos.length - especiales} de rastrillaje y ${especiales} ${especiales === 1 ? 'especial' : 'especiales'}`],
    [num(d.poligonos.length), `polígonos de búsqueda, ${km2(areaTotal)} en total`],
    [num(d.hallazgos.length), d.hallazgos.length === 1 ? 'hallazgo registrado' : 'hallazgos registrados'],
    [`${num(kmTotal, 1)} km`, 'recorridos dentro de los polígonos'],
    [`${areaTotal ? num(revisada / areaTotal * 100) : 0} %`, 'del área total revisada según los tracks GPX'],
    [num(new Set(d.mandos.map(m => m.nombre)).size), 'coordinadores estuvieron a cargo'],
    [num(d.retiros.length), d.retiros.length === 1 ? 'agente retirado de su grupo' : 'agentes retirados de su grupo'],
  ];
  add(seccion('Resumen al corte'), {
    table: {
      widths: ['*', '*', '*', '*'],
      body: [0, 4].map(i => cifras.slice(i, i + 4).map(([v, t]) => ({ stack: [{ text: v, fontSize: 15, font: 'InterMedia' }, tenue(t, { fontSize: 7, lineHeight: 1.1 })] }))),
    },
    layout: { hLineColor: () => C.linea, vLineColor: () => C.linea, hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 6, paddingBottom: () => 6 },
  });

  /* 3 · Persona u objeto buscado */
  const ob = d.objetivo;
  if (!ob) {
    add(seccion('Persona u objeto buscado'), vacio('No se cargó la ficha de la persona u objeto buscado.'));
  } else if (ob.tipo === 'OBJETO') {
    add(seccion('Objeto buscado'), ficha([
      ['Objeto', TIPO_OBJETO[ob.tipo_objeto] ?? ob.tipo_objeto], ['Color', ob.color], ['Marca', ob.marca], ['Modelo', ob.modelo],
      ['Medidas', [ob.dimension_alto, ob.dimension_ancho, ob.dimension_largo].some(Boolean)
        ? `${ob.dimension_alto ?? '—'} × ${ob.dimension_ancho ?? '—'} × ${ob.dimension_largo ?? '—'} cm (alto × ancho × largo)` : '—'],
      ['Otros detalles', { text: ob.detalles_adicionales || '—' }, true],
    ]), grillaFotos(fotosObjetivo));
  } else {
    const fotoPrincipal = fotosObjetivo[0];
    add(seccion('Persona buscada'), {
      columns: [
        ...(fotoPrincipal ? [{ width: 100, stack: [{ image: fotoPrincipal, fit: [100, 125] }, tenue(`Foto 1 de ${fotosObjetivo.length}`, { fontSize: 6.8, margin: [0, 3, 0, 0] })] }] : []),
        { width: '*', ...ficha([
          ['Apellido y nombre', [ob.apellido, ob.nombre].filter(Boolean).join(', ') || '—'],
          ['DNI', ob.dni ? mono(formatoDni(ob.dni)).text : '—'],
          ['Edad', ob.edad != null ? `${ob.edad} años` : '—'], ['Género', GENERO[ob.genero] ?? '—'],
          ['Estatura', ob.estatura ? `${num(ob.estatura / 100, 2)} m` : '—'], ['Complexión', ob.complexion_fisica],
          ['Piel · ojos · pelo', [ob.color_piel, ob.color_ojos, ob.color_pelo].map(v => v || '—').join(' · ')], ['Nacionalidad', ob.nacionalidad],
          ['Vestimenta', { text: ob.vestimenta || '—' }, true],
          ['Otros detalles', { text: ob.detalles_adicionales || '—' }, true],
        ]) },
      ],
      columnGap: 14,
    }, fotosObjetivo.length > 1 ? grillaFotos(fotosObjetivo.slice(1)) : null);
  }

  /* 4 · Hallazgos */
  add({ text: '', pageBreak: 'before' }, seccion('Hallazgos', 'Un hallazgo no se puede eliminar ni cambiar de tipo en el sistema: lo que figura acá es todo lo registrado.'));
  if (!d.hallazgos.length) add(vacio('No se registraron hallazgos.'));
  d.hallazgos.forEach((h, i) => {
    add({
      unbreakable: true,
      stack: [
        {
          columns: [
            { width: 26, table: { widths: [18], body: [[{ text: `H${i + 1}`, color: '#ffffff', bold: true, fontSize: 8, alignment: 'center' }]] },
              layout: { fillColor: () => C.duar, hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 0, paddingRight: () => 0 } },
            { width: '*', stack: [
              { text: h.nombre, font: 'InterNegra', fontSize: 9.5, margin: [0, 0, 0, 2] },
              ...(h.descripcion ? [{ text: h.descripcion, margin: [0, 0, 0, 2] }] : []),
              ...(h.detalle ? [{ text: h.detalle, color: C.tenue, margin: [0, 0, 0, 3] }] : []),
              ficha([
                ['Registrado', fechaHora(h.creadoEn)], ['Coordenadas', mono(coords(h.lat, h.lng)).text],
                ['Polígono', h.poligono ?? 'Fuera de los polígonos'], ['Registró', h.registradoPor],
              ]),
            ] },
          ],
          columnGap: 8,
        },
        grillaFotos(fotosHallazgos[i]) ?? tenue('Sin fotos.', { fontSize: 7.2, margin: [34, 3, 0, 0] }),
        { ...linea(ANCHO, 0.6, C.linea), margin: [0, 8, 0, 8] },
      ].filter(Boolean),
    });
  });

  /* 5 · Mapa */
  const anteriores = d.puntoCero.filter(h => h.desdeLat != null).map(h => ({ lat: h.desdeLat, lng: h.desdeLng }));
  const mapa = await mapaSvg({
    poligonos: d.poligonos, tracks: d.tracks, marcadores: d.marcadores.filter(m => m.clase !== 'HALLAZGO'),
    hallazgos: d.hallazgos, radios: d.radios,
    puntoCero: op.puntoCeroLat != null ? { lat: op.puntoCeroLat, lng: op.puntoCeroLng } : null,
    puntoCeroAnteriores: anteriores,
  });
  add(seccion('Mapa del operativo', 'Elementos vigentes al corte sobre imagen satelital, con al menos 1 km alrededor del Punto Cero. Las coordenadas de cada hallazgo permiten ubicarlo en cualquier mapa.'));
  if (mapa) {
    // Muestras dibujadas en SVG: las fuentes no traen ■ ● ▲.
    const muestra = (forma, texto) => ({ width: 'auto', columns: [{ width: 9, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9">${forma}</svg>` }, { width: 'auto', text: texto }], columnGap: 3 });
    const cuadro = c => `<rect x="0.5" y="1.5" width="6" height="6" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="0.8"/>`;
    const punto = (c, hueco = false) => `<circle cx="3.5" cy="4.5" r="3" fill="${hueco ? '#ffffff' : c}" stroke="${c}" stroke-width="0.9"/>`;
    const leyenda = [
      ...d.grupos.filter(g => g.color && d.poligonos.some(p => p.color === g.color)).map(g => muestra(cuadro(g.color), g.nombre)),
      ...(d.poligonos.some(p => !p.color) ? [muestra(`<rect x="0.5" y="1.5" width="6" height="6" fill="#ffffff" stroke="#6f6866" stroke-width="0.8" stroke-dasharray="1.5 1"/>`, 'Sin grupo')] : []),
      muestra(punto(C.duarOscuro), 'Punto Cero vigente'),
      ...(anteriores.length ? [muestra(punto('#8a8380', true), 'Punto Cero anterior')] : []),
      muestra(punto(C.duar), 'Hallazgo'),
      ...(d.marcadores.some(m => m.clase === 'POI') ? [muestra(`<path d="M3.5 1 L7 7.5 L0 7.5 Z" fill="${C.tinta}"/>`, 'Punto de interés')] : []),
      ...(d.marcadores.some(m => m.clase === 'INSTALACION') ? [muestra(`<rect x="0.5" y="1.5" width="6" height="6" fill="${C.tinta}"/>`, 'Instalación')] : []),
      muestra(`<line x1="0" y1="4.5" x2="8" y2="4.5" stroke="${C.tinta}" stroke-width="0.8"/>`, 'Tracks GPX'),
      ...(d.radios.length ? [muestra(`<line x1="0" y1="4.5" x2="8" y2="4.5" stroke="${C.duarOscuro}" stroke-width="0.8" stroke-dasharray="2 1.5"/>`, 'Radios desde el Punto Cero')] : []),
    ];
    add({
      table: { widths: ['*'], body: [[{ svg: mapa.svg, width: ANCHO - 2 }], [{ stack: [
        ...Array.from({ length: Math.ceil(leyenda.length / 5) }, (_, i) => ({ columns: leyenda.slice(i * 5, i * 5 + 5), columnGap: 12, margin: [0, i ? 3 : 0, 0, 0] })),
        { text: mapa.conImagen ? ATRIBUCION : 'No se pudo obtener la imagen satelital: el mapa sale sobre fondo liso.', fontSize: 6.2, margin: [0, 4, 0, 0] },
      ], fontSize: 7, color: C.tenue, margin: [6, 0, 6, 0] }]] },
      layout: { hLineColor: () => C.linea, vLineColor: () => C.linea, hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: i => (i ? 4 : 0), paddingBottom: i => (i ? 4 : 0) },
    });
  } else {
    add(vacio('Todavía no hay nada para dibujar.'));
  }

  /* 6 · Historial del Punto Cero */
  add(seccion('Historial del Punto Cero', 'Cómo cambió la hipótesis de dónde estaba la persona.'));
  add(d.puntoCero.length
    ? tabla(['Desde', 'Coordenadas', 'Distancia', 'Motivo', 'Registró'], d.puntoCero.map(h => [
      mono(fechaCorta(h.registradoEn)), mono(coords(h.hastaLat, h.hastaLng)),
      h.distanciaM != null ? fmtDistancia(h.distanciaM) : '—',
      h.desdeLat == null ? 'Definición inicial, al crear el operativo.' : (h.motivo || '—'), h.registradoPor ?? '—',
    ]), [58, 118, 48, '*', 90])
    : vacio('Sin cambios registrados: el Punto Cero es el que se definió al crear el operativo.'));

  /* 7 · Polígonos y cobertura */
  add(seccion('Polígonos y cobertura', 'Cobertura = área revisada ÷ área del polígono, tomando 2 m a cada lado de cada track GPX (4 m de ancho).'));
  if (!d.poligonos.length) add(vacio('No se dibujaron polígonos.'));
  else {
    const totalTracks = d.poligonos.reduce((s, p) => s + p.tracks, 0);
    add(tabla(['Polígono', 'Área', 'Grupos que trabajaron', 'Tracks', 'Km dentro', 'Cobertura'], [
      ...d.poligonos.map(p => [
        { columns: [{ width: 9, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"><rect x="0.5" y="1.5" width="6" height="6" fill="${p.color ?? '#8a8380'}"/></svg>` }, { width: '*', text: p.nombre }], columnGap: 3 },
        { text: km2(p.areaM2), alignment: 'right' },
        p.grupos.length ? p.grupos.join(' · ') : tenue('Ninguno todavía'), { text: num(p.tracks), alignment: 'right' },
        { text: num(p.coberturaKm, 1), alignment: 'right' }, barra(p.coberturaPct ?? 0),
      ]),
      [{ text: 'Total', bold: true }, { text: km2(areaTotal), alignment: 'right', bold: true }, '', { text: num(totalTracks), alignment: 'right', bold: true },
        { text: num(kmTotal, 1), alignment: 'right', bold: true }, { text: `${areaTotal ? num(revisada / areaTotal * 100) : 0} % del área total`, bold: true }],
    ], ['*', 52, 120, 34, 44, 92]));
  }

  /* 8 · Grupos */
  add(seccion('Grupos', 'Líder, integrantes y los períodos en que cada grupo estuvo en el terreno (de la salida a la vuelta a la base).'));
  add(d.grupos.length
    ? tabla(['Grupo', 'Líder', 'Integrantes', 'Polígono', 'En el terreno', 'Estado al corte'], d.grupos.map(g => [
      { stack: [{ text: g.nombre, bold: true }, chip(g.clase === 'ESPECIAL' ? 'Especial' : 'Rastrillaje')] },
      g.lider ?? tenue('Sin Líder'),
      { stack: [num(g.integrantes), ...(g.retiros ? [chip(`${g.retiros} ${g.retiros === 1 ? 'retiro' : 'retiros'}`, true)] : [])] },
      g.poligonos.length ? g.poligonos.join(', ') : '—',
      g.periodos.length ? { stack: g.periodos.map(p => mono(`${fechaCorta(p.desde)} – ${p.hasta ? hora(p.hasta) : 'sigue'}`, { fontSize: 7 })) } : tenue('No salió'),
      g.estado === 'DISUELTO' && g.eliminadoEn ? `Disuelto ${fechaCorta(g.eliminadoEn)}` : (ETIQUETA_GRUPO[g.estado] ?? g.estado),
    ]), [70, 82, 52, 70, '*', 76])
    : vacio('No se formaron grupos.'));

  /* 9 · Puesto de comando */
  add(seccion('Puesto de comando'), {
    columns: [
      d.mandos.length
        ? tabla(['A cargo', 'Desde', 'Hasta'], d.mandos.map(m => [m.nombre, mono(fechaCorta(m.desde)), m.hasta ? mono(fechaCorta(m.hasta)) : tenue('al corte')]), ['*', 54, 54])
        : vacio('Nadie quedó registrado a cargo.'),
      d.presencias.length
        ? tabla(['Presentes', 'Ingreso', 'Retiro'], d.presencias.map(p => [p.nombre, mono(fechaCorta(p.desde)), p.hasta ? mono(fechaCorta(p.hasta)) : tenue('al corte')]), ['*', 54, 54])
        : vacio('No se registraron presencias en el puesto de comando.'),
    ],
    columnGap: 16,
  });

  /* 10 · Novedades del personal y bajas */
  const novedades = [
    ...d.retiros.map(r => ({ en: r.ocurridoEn, que: `${r.agente} retirado del grupo ${r.grupo ?? ''}`.trim(), motivo: r.motivo, quien: r.registradoPor })),
    ...d.bajas.map(b => ({ en: b.eliminadoEn, que: `${b.clase} «${b.nombre}» dado de baja`, motivo: b.motivo, quien: b.eliminadoPor })),
  ].sort((a, b) => new Date(a.en) - new Date(b.en));
  add(seccion('Novedades del personal y bajas de elementos'));
  add(novedades.length
    ? tabla(['Hora', 'Qué pasó', 'Motivo', 'Registró'], novedades.map(n => [mono(fechaCorta(n.en)), n.que, n.motivo || '—', n.quien ?? '—']), [58, '*', 150, 90])
    : vacio('No hubo retiros de agentes ni elementos dados de baja.'));

  /* 11 · Cronología */
  add(seccion('Cronología', 'Hora del hecho. Cuando el dato llegó más tarde (por radio o desde un celular sin señal) se aclara debajo. Resaltados: hallazgos y cambios del Punto Cero.'));
  let diaActual = null;
  const filasCrono = [];
  for (const e of d.cronologia) {
    const di = dia(e.en);
    if (di.clave !== diaActual) {
      diaActual = di.clave;
      filasCrono.push([{ colSpan: 4, columns: [{ text: di.texto, bold: true }, { text: di.nombre, alignment: 'right', color: C.tenue }], margin: [0, 6, 0, 0], border: [false, false, false, true] }, {}, {}, {}]);
    }
    const fondo = e.clave ? C.alerta : null;
    filasCrono.push([
      mono(hora(e.en), { bold: true, color: e.clave ? C.duarOscuro : C.tinta, fillColor: fondo }),
      { ...chip(e.tipo, e.clave), fillColor: fondo },
      { stack: [e.texto, ...(e.nota ? [tenue(e.nota, { fontSize: 7 })] : [])], fillColor: fondo },
      tenue(e.quien, { alignment: 'right', fontSize: 7.2, fillColor: fondo }),
    ]);
  }
  add(filasCrono.length ? {
    table: { widths: [30, 62, '*', 100], body: filasCrono, dontBreakRows: true },
    layout: {
      hLineWidth: (i, node) => (node.table.body[i - 1]?.[0]?.colSpan ? 1 : 0.5), vLineWidth: () => 0,
      hLineColor: (i, node) => (node.table.body[i - 1]?.[0]?.colSpan ? C.tinta : C.lineaSuave),
      paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 3, paddingBottom: () => 3,
    },
    fontSize: 7.8,
  } : vacio('Sin eventos registrados.'));

  /* 12 · Personal */
  add(seccion('Personal interviniente', 'Todas las personas que ingresaron al operativo, incluidas las que ya se retiraron. No se incluyen teléfonos, correos ni datos de salud.'));
  add(d.personal.length
    ? tabla(['Apellido y nombre', 'DNI', 'Institución', 'Especialidad', 'Grupo', 'Ingreso', 'Egreso'], d.personal.map(p => {
      const rol = [p.especialidad, p.fueLider ? 'Líder' : null, p.esConductor ? 'Conductor' : null].filter(Boolean).join(' · ');
      const color = p.egreso && !final ? C.tenue : C.tinta;
      return [
        { text: `${p.apellido}, ${p.nombre}`, color }, mono(formatoDni(p.dni), { color }), { text: p.institucion ?? '—', color },
        { text: rol || '—', color }, { text: p.grupos.length ? p.grupos.join(', ') : '—', color },
        mono(fechaCorta(p.ingreso), { color, fontSize: 6.8 }), p.egreso ? mono(fechaCorta(p.egreso), { color, fontSize: 6.8 }) : '—',
      ];
    }), ['*', 48, 80, 76, 48, 54, 54], { fontSize: 7.3 })
    : vacio('No ingresó personal al operativo.'));

  /* 13 · Constancia */
  add(seccion('Constancia'), {
    unbreakable: true,
    stack: [
      {
        table: { widths: ['*', 72], body: [[
          { stack: [
            { text: [`Este informe se generó automáticamente desde los registros del Sistema DUAR, sin edición manual. Contiene lo registrado hasta el `, mono(fechaHora(d.corteEn), { bold: true }), '.'], margin: [0, 0, 0, 4] },
            { text: [`Generado por `, { text: meta.generadoPor, bold: true }, ` el ${fechaHora(meta.generadoEn)}. Informe `, mono(meta.codigo, { bold: true }),
              ` (${ordinal(meta.numeroEnOperativo)} informe de este operativo${final ? ', final' : ''}).`], margin: [0, 0, 0, 4] },
            { text: ['El sistema guarda una copia idéntica de este archivo y su huella digital. Para comprobar que no fue modificado, escanee el código o ingrese a ',
              mono(meta.hostVerificacion, { bold: true }), ' con el código ', mono(meta.codigo, { bold: true }), ' y cargue el archivo.'] },
          ] },
          { qr: meta.urlVerificacion, fit: 70, alignment: 'right' },
        ]] },
        layout: { hLineColor: () => C.linea, vLineColor: () => C.linea, hLineWidth: () => 0.6, vLineWidth: () => 0.6, fillColor: () => C.celda, paddingLeft: () => 9, paddingRight: () => 9, paddingTop: () => 8, paddingBottom: () => 8 },
        fontSize: 7.8,
      },
      {
        columns: ['Coordinador a cargo', 'Recibido por la Fiscalía'].map((titulo, i) => ({
          stack: [
            linea(230, 0.8, C.tinta),
            { text: titulo, bold: true, margin: [0, 4, 0, 0] },
            tenue(i ? 'Firma, aclaración y fecha' : 'Firma y aclaración', { fontSize: 7.2 }),
          ],
        })),
        columnGap: 40, margin: [0, 46, 0, 0], fontSize: 8,
      },
    ],
  });

  const doc = {
    pageSize: 'A4',
    pageMargins: [40, 64, 40, 46],
    info: { title: `${etiquetaTipo} ${meta.codigo} · ${op.titulo}`, author: 'Sistema DUAR', subject: `Informe del operativo ${opCodigo}`, creator: 'Sistema DUAR' },
    defaultStyle: { font: 'Inter', fontSize: 8.4, lineHeight: 1.22, color: C.tinta },
    header: () => ({
      margin: [40, 24, 40, 0],
      stack: [
        { columns: [
          { width: 22, svg: ESCUDO },
          { width: '*', stack: [{ text: 'DUAR', font: 'InterNegra', fontSize: 9, characterSpacing: 0.5 }, tenue('Dirección de Unidades de Alto Riesgo', { fontSize: 6.6 })], margin: [6, 1, 0, 0] },
          { width: 'auto', alignment: 'right', fontSize: 6.8, color: C.tenue, stack: [
            { text: `${etiquetaTipo} · ${opCodigo}`, bold: true, color: C.tinta },
            { text: `${op.titulo.length > 60 ? op.titulo.slice(0, 59) + '…' : op.titulo} · ${op.localidad ?? ''}` },
          ] },
        ] },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: ANCHO, y2: 6, lineWidth: 1.1, lineColor: C.tinta }] },
      ],
    }),
    footer: (pagina, total) => ({
      margin: [40, 12, 40, 0],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: ANCHO, y2: 0, lineWidth: 0.5, lineColor: C.linea }] },
        { columns: [
          { text: ['Informe ', mono(meta.codigo, { fontSize: 6.4 }), ' · datos al ', mono(fechaHora(d.corteEn), { fontSize: 6.4 }), ' · verificable en ', mono(meta.hostVerificacion, { fontSize: 6.4 })] },
          { text: `Página ${pagina} de ${total}`, alignment: 'right', width: 'auto' },
        ], fontSize: 6.6, color: C.tenue, margin: [0, 5, 0, 0] },
      ],
    }),
    // Un título nunca queda solo al pie: si le quedan menos de ~85 pt (título, nota y una fila), pasa a la hoja siguiente.
    pageBreakBefore: nodo => nodo.headlineLevel === 1 && nodo.startPosition.top > 842 - 46 - 85,
    content: contenido,
  };

  return pdfmake.createPdf(doc).getBuffer();
}

/* ── Auxiliares ────────────────────────────────────────────────────────── */

const ESTADO = {
  NUEVO: 'Nuevo', ACTIVO: 'Activo', EN_PLANIFICACION: 'En planificación', EN_PROCESO: 'En proceso',
  INACTIVO: 'Inactivo', FINALIZADO: 'Finalizado',
};
const GENERO = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro' };
// Los mismos rótulos que la ficha del objeto en pantalla (ObjetivoBuscado.tsx).
const TIPO_OBJETO = {
  vehiculo: 'Vehículo', embarcacion: 'Embarcación', aeronave: 'Aeronave', paquete: 'Paquete / Encomienda',
  equipaje: 'Equipaje / Mochila', arma: 'Arma', animal: 'Animal', documento: 'Documento', otro: 'Otro',
};
const ORDINALES = ['', 'primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];
const ordinal = n => ORDINALES[n] ?? `${n}.º`;
const formatoDni = dni => String(dni ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function barra(pct) {
  const ancho = 50, lleno = Math.max(0, Math.min(100, pct)) / 100 * ancho;
  return { columns: [
    { width: ancho, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="9"><rect x="0" y="3" width="${ancho}" height="4" fill="${C.lineaSuave}"/>${lleno ? `<rect x="0" y="3" width="${lleno.toFixed(1)}" height="4" fill="${C.tinta}"/>` : ''}</svg>` },
    { width: '*', text: `${num(pct)} %`, margin: [5, 0, 0, 0] },
  ] };
}

/** Línea horizontal (en SVG: los canvas de pdfmake fallan cuando un salto de página obliga a rearmar la hoja). */
function linea(ancho, grosor, color) {
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${grosor + 1}"><rect x="0" y="0.5" width="${ancho}" height="${grosor}" fill="${color}"/></svg>` };
}

const ESCUDO = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <rect x="0" y="0" width="22" height="22" rx="6" fill="${C.duar}"/>
  <path d="M11 17.5s5-2.5 5-6.3V6.8L11 5 6 6.8v4.4c0 3.8 5 6.3 5 6.3z" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
