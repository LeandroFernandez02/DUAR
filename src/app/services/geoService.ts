/**
 * Catálogos geográficos para los formularios (hoy: países).
 *
 * Los países NO vienen de una API externa a propósito: REST Countries pasó a
 * exigir cuenta y API key (v5), y una lista que casi no cambia no justifica
 * depender de un tercero — menos todavía en un Puesto de Comando con mala
 * conectividad (CU-14 pide funcionar "en condiciones de baja conectividad").
 * La lista son los códigos ISO 3166-1 y los nombres en español los da el
 * propio navegador (`Intl.DisplayNames`), así que funciona sin red.
 *
 * Provincias y localidades de Argentina sí conviene traerlas por API — el
 * servicio Georef del Estado (apis.datos.gob.ar/georef) es gratuito y sin
 * clave. Cuando haga falta se agrega acá, junto a `listarPaises`.
 */

// ISO 3166-1 alpha-2 (+ XK, Kosovo). Sin los códigos históricos que el
// navegador todavía reconoce (DY, HV, NH, RH, UK, VD).
const CODIGOS_PAIS = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO ' +
  'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE ' +
  'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO ' +
  'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW ' +
  'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM ' +
  'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

let cache: string[] | null = null;

/** Países en español, Argentina primero (es el contexto del sistema) y el resto en orden alfabético. */
export function listarPaises(): string[] {
  if (cache) return cache;
  const nombres = new Intl.DisplayNames(['es'], { type: 'region', fallback: 'none' });
  const lista = CODIGOS_PAIS
    .map(c => nombres.of(c))
    .filter((n): n is string => !!n && n !== 'Argentina')
    .sort((a, b) => a.localeCompare(b, 'es'));
  cache = ['Argentina', ...lista];
  return cache;
}

/* ── Provincias y localidades de Argentina ──────────────────────────────────
 * Las 24 jurisdicciones son fijas (no cambian), así que van en el código: el
 * selector de provincia funciona siempre, con o sin conexión. Las localidades
 * (cientos por provincia — Córdoba tiene 514) sí vienen de la API Georef del
 * Estado (apis.datos.gob.ar/georef): gratuita, sin clave y con CORS abierto.
 * Se cachean en el navegador para no pedirlas en cada apertura del formulario.
 * Si la API no responde, el formulario cae a texto libre (ver SelectorLocalidad).
 */

export interface Provincia { id: string; nombre: string; }

// `id` = código INDEC, el que usa Georef.
export const PROVINCIAS: Provincia[] = [
  { id: '06', nombre: 'Buenos Aires' },
  { id: '10', nombre: 'Catamarca' },
  { id: '22', nombre: 'Chaco' },
  { id: '26', nombre: 'Chubut' },
  { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires' },
  { id: '14', nombre: 'Córdoba' },
  { id: '18', nombre: 'Corrientes' },
  { id: '30', nombre: 'Entre Ríos' },
  { id: '34', nombre: 'Formosa' },
  { id: '38', nombre: 'Jujuy' },
  { id: '42', nombre: 'La Pampa' },
  { id: '46', nombre: 'La Rioja' },
  { id: '50', nombre: 'Mendoza' },
  { id: '54', nombre: 'Misiones' },
  { id: '58', nombre: 'Neuquén' },
  { id: '62', nombre: 'Río Negro' },
  { id: '66', nombre: 'Salta' },
  { id: '70', nombre: 'San Juan' },
  { id: '74', nombre: 'San Luis' },
  { id: '78', nombre: 'Santa Cruz' },
  { id: '82', nombre: 'Santa Fe' },
  { id: '86', nombre: 'Santiago del Estero' },
  { id: '94', nombre: 'Tierra del Fuego' },
  { id: '90', nombre: 'Tucumán' },
];

const GEOREF = 'https://apis.datos.gob.ar/georef/api';
const CACHE_DIAS = 30;
const memoria = new Map<string, string[]>();

/** Localidades de una provincia, en orden alfabético. Lanza si no hay conexión y no hay copia guardada. */
export async function listarLocalidades(provinciaId: string): Promise<string[]> {
  const enMemoria = memoria.get(provinciaId);
  if (enMemoria) return enMemoria;

  const clave = `duar-localidades-${provinciaId}`;
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) ?? 'null');
    if (guardado && Date.now() - guardado.guardadoEn < CACHE_DIAS * 86_400_000) {
      memoria.set(provinciaId, guardado.datos);
      return guardado.datos;
    }
  } catch { /* localStorage bloqueado o dato corrupto: se pide de nuevo */ }

  const res = await fetch(
    `${GEOREF}/localidades?provincia=${provinciaId}&campos=nombre&max=5000&orden=nombre`
  );
  if (!res.ok) throw new Error(`Georef respondió ${res.status}`);
  const json = await res.json();
  const nombres = Array.from(new Set<string>((json.localidades ?? []).map((l: { nombre: string }) => l.nombre)));

  memoria.set(provinciaId, nombres);
  try { localStorage.setItem(clave, JSON.stringify({ guardadoEn: Date.now(), datos: nombres })); } catch { /* sin caché */ }
  return nombres;
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * La localidad se guarda en una sola columna como "Localidad, Provincia" (el
 * formato que ya se usaba: "La Cumbrecita, Córdoba"). Esto lo desarma para
 * precargar la edición; devuelve null si el valor es texto libre anterior
 * ("Barrio Maipu") y no se puede saber la provincia.
 */
export function separarLocalidad(valor: string): { localidad: string; provincia: Provincia } | null {
  const i = valor.lastIndexOf(',');
  if (i < 0) return null;
  const prov = PROVINCIAS.find(p => sinTildes(p.nombre) === sinTildes(valor.slice(i + 1)));
  if (!prov) return null;
  return { localidad: valor.slice(0, i).trim(), provincia: prov };
}

export const unirLocalidad = (localidad: string, provincia: string) => `${localidad}, ${provincia}`;
