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
