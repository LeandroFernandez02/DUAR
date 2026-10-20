/**
 * DATOS DE EJEMPLO del panel general (CU-42). Se usan mientras se acuerda la
 * pantalla con el equipo; después se reemplazan por la respuesta de la API, que
 * va a tener esta misma forma (OperativoPanel). Se generan siempre iguales
 * (semilla fija) y relativos a hoy, para que las cifras no salten ni envejezcan.
 */
import type { OperativoPanel, EstadoOperativoPanel, ResultadoOperativo } from '../utils/panelGeneral';

/** Generador con semilla: el mismo «azar» en cada carga. */
function semilla(s: number) {
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
const r = semilla(20261019);
const elegir = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
const entre = (a: number, b: number) => a + r() * (b - a);

// Zonas de las sierras de Córdoba donde más se busca (algunas se repiten a propósito: el mapa de calor las marca).
const ZONAS: { localidad: string; lat: number; lng: number; peso: number }[] = [
  { localidad: 'Tanti', lat: -31.355, lng: -64.59, peso: 5 },
  { localidad: 'Capilla del Monte', lat: -30.86, lng: -64.53, peso: 4 },
  { localidad: 'Villa General Belgrano', lat: -31.98, lng: -64.56, peso: 3 },
  { localidad: 'La Cumbrecita', lat: -31.90, lng: -64.77, peso: 3 },
  { localidad: 'Villa Carlos Paz', lat: -31.42, lng: -64.50, peso: 2 },
  { localidad: 'Mina Clavero', lat: -31.72, lng: -65.01, peso: 2 },
  { localidad: 'La Cumbre', lat: -30.98, lng: -64.49, peso: 2 },
  { localidad: 'Río Ceballos', lat: -31.17, lng: -64.32, peso: 1 },
  { localidad: 'Alta Gracia', lat: -31.66, lng: -64.43, peso: 1 },
  { localidad: 'Villa Alpina', lat: -31.95, lng: -64.82, peso: 2 },
];
const BOLSA = ZONAS.flatMap(z => Array(z.peso).fill(z));

const INSTITUCIONES = ['DUAR', 'Bomberos Voluntarios', 'Policía de Córdoba', 'Defensa Civil', 'ETAC', 'Otra'];
const ESPECIALIDADES = ['Paramédico', 'Canes', 'Dron', 'Bombero', 'Caballería', 'Buzos', 'Policía', 'Defensa Civil'];
const TIPOS = ['Excursionista extraviado', 'Turista desaparecido', 'Menor extraviado', 'Adulto mayor desorientado', 'Ciclista no regresó', 'Búsqueda de objeto'];

const RESULTADOS: ResultadoOperativo[] = ['HALLADA_CON_VIDA', 'HALLADA_CON_VIDA', 'HALLADA_CON_VIDA', 'HALLADA_CON_VIDA',
  'HALLADA_SIN_VIDA', 'NO_HALLADA', 'NO_HALLADA', 'SUSPENDIDA', 'OBJETO_HALLADO'];

/** Un polígono aproximado (cuadrilátero torcido) alrededor de un punto. */
function area(lat: number, lng: number, km: number): [number, number][] {
  const dLat = km / 111, dLng = km / (111 * Math.cos(lat * Math.PI / 180));
  return [
    [lat + dLat * entre(0.6, 1), lng - dLng * entre(0.6, 1)],
    [lat + dLat * entre(0.6, 1), lng + dLng * entre(0.6, 1)],
    [lat - dLat * entre(0.6, 1), lng + dLng * entre(0.6, 1)],
    [lat - dLat * entre(0.6, 1), lng - dLng * entre(0.6, 1)],
  ];
}

function generar(): OperativoPanel[] {
  const ahora = Date.now();
  const DIA = 86_400_000;
  const ops: OperativoPanel[] = [];
  for (let i = 0; i < 34; i++) {
    const z = elegir(BOLSA);
    // Más operativos en verano y en las vacaciones de invierno (estacionalidad).
    const haceDias = Math.floor(entre(2, 420));
    const inicio = new Date(ahora - haceDias * DIA - entre(0, 20) * 3_600_000);
    const mes = inicio.getMonth();
    if (![0, 1, 6, 11].includes(mes) && r() < 0.35) continue;

    const estado: EstadoOperativoPanel = 'FINALIZADO';
    if (haceDias < 6) continue;   // los de ahora se agregan aparte, abajo
    const duracionH = entre(5, r() < 0.2 ? 240 : 90);
    const fin = new Date(inicio.getTime() + duracionH * 3_600_000);
    if (fin.getTime() > ahora) continue;

    const nInst = 1 + Math.floor(entre(0, 3.5));
    const instituciones = ['DUAR', ...[...INSTITUCIONES.slice(1)].sort(() => r() - 0.5).slice(0, nInst - 1)];
    const especialidades = [...ESPECIALIDADES].sort(() => r() - 0.5).slice(0, 1 + Math.floor(entre(0, 4)));
    const nAreas = 1 + Math.floor(entre(0, 3));
    const lat = z.lat + entre(-0.03, 0.03), lng = z.lng + entre(-0.03, 0.03);
    ops.push({
      id: `mock-${i}`,
      titulo: `${elegir(TIPOS)} — ${z.localidad}`,
      localidad: `${z.localidad}, Córdoba`,
      estado,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      resultado: elegir(RESULTADOS),
      conCoordinador: true,
      agentes: { terreno: 0, base: 0, noDisponible: 0 },
      instituciones,
      especialidades,
      areas: Array.from({ length: nAreas }, () => area(lat + entre(-0.02, 0.02), lng + entre(-0.02, 0.02), entre(0.6, 2.2))),
    });
  }
  // Tres en curso ahora (uno sin coordinador a cargo) y uno nuevo sin activar.
  const actuales: [number, number, boolean, EstadoOperativoPanel][] = [[0, 1.2, true, 'ACTIVO'], [1, 3.5, false, 'ACTIVO'], [6, 0.4, true, 'EN_PROCESO'], [4, 0.1, true, 'NUEVO']];
  for (const [zi, dias, conCoord, estado] of actuales) {
    const zz = ZONAS[zi];
    const enCurso = estado !== 'NUEVO';
    ops.push({
      id: `mock-actual-${zi}`, titulo: `${elegir(TIPOS)} — ${zz.localidad}`, localidad: `${zz.localidad}, Córdoba`,
      estado, inicio: new Date(ahora - dias * DIA).toISOString(), fin: null, resultado: null, conCoordinador: conCoord,
      agentes: enCurso ? { terreno: Math.floor(entre(6, 20)), base: Math.floor(entre(3, 10)), noDisponible: Math.floor(entre(0, 3)) } : { terreno: 0, base: 0, noDisponible: 0 },
      instituciones: ['DUAR', 'Bomberos Voluntarios', ...(r() > 0.5 ? ['Policía de Córdoba'] : [])],
      especialidades: ['Canes', 'Paramédico', ...(r() > 0.5 ? ['Dron'] : [])],
      areas: enCurso ? [area(zz.lat, zz.lng, 1.5), area(zz.lat - 0.015, zz.lng + 0.01, 1.1)] : [],
    });
  }
  // Uno abierto hace más de 30 días, para que se vea la alerta.
  const z = ZONAS[3];
  ops.push({
    id: 'mock-largo', titulo: `Turista desaparecido — ${z.localidad}`, localidad: `${z.localidad}, Córdoba`,
    estado: 'ACTIVO', inicio: new Date(ahora - 41 * DIA).toISOString(), fin: null, resultado: null,
    conCoordinador: false, agentes: { terreno: 3, base: 4, noDisponible: 1 },
    instituciones: ['DUAR', 'Policía de Córdoba'], especialidades: ['Canes', 'Dron'],
    areas: [area(z.lat, z.lng, 2.5), area(z.lat + 0.02, z.lng - 0.02, 1.8)],
  });
  return ops.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export const OPERATIVOS_PANEL_MOCK: OperativoPanel[] = generar();
