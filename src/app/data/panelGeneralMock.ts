/**
 * DATOS DE EJEMPLO del panel general (CU-43). Se usan mientras se acuerda la
 * pantalla con el equipo; después se reemplazan por la respuesta de la API, que
 * va a tener esta misma forma (OperativoPanel). Se generan siempre iguales
 * (semilla fija) y relativos a hoy, para que las cifras no salten ni envejezcan.
 */
import type { OperativoPanel, EstadoOperativoPanel, ResultadoOperativo } from '../utils/panelGeneral';
import { catDotaciones, catInstituciones } from './mockData';

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

const INSTITUCIONES = ['Policía', 'Bomberos Voluntarios', 'Defensa Civil', 'Guardia Local', 'Gendarmería', 'Policía Federal', 'Secretaría Gestión de Riesgo', 'Otros'];
const ESPECIALIDADES = ['Caminante', 'Buceo', 'Caballería', 'Motos', 'Investigación', 'Drones', 'Altura', 'K-9', 'Acuático'];
const COORDINADORES = ['Laura Medina', 'Martín Ferreyra', 'Sofía Quiroga', 'Diego Bustos'];
const OBJETIVOS: { tipo: 'persona' | 'objeto'; descripcion: string }[] = [
  { tipo: 'persona', descripcion: 'Varón de 34 años, campera roja, mochila gris' },
  { tipo: 'persona', descripcion: 'Niña de 9 años, remera amarilla' },
  { tipo: 'persona', descripcion: 'Mujer de 71 años, desorientada' },
  { tipo: 'objeto', descripcion: 'Mochila con documentación' },
];
const TIPOS = ['Excursionista extraviado', 'Turista desaparecido', 'Menor extraviado', 'Adulto mayor desorientado', 'Ciclista no regresó', 'Búsqueda de objeto'];

const RESULTADOS: ResultadoOperativo[] = ['HALLADA_CON_VIDA', 'HALLADA_CON_VIDA', 'HALLADA_CON_VIDA', 'HALLADA_CON_VIDA',
  'HALLADA_SIN_VIDA', 'SIN_HALLAZGO', 'SIN_HALLAZGO', 'SUSPENDIDA', 'OBJETO_HALLADO'];

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
  for (let i = 0; i < 80; i++) {
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
    const instituciones = ['Policía', ...[...INSTITUCIONES.slice(1)].sort(() => r() - 0.5).slice(0, nInst - 1)];
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
      agentesAsignados: Math.floor(entre(4, 26)),
      instituciones,
      especialidades,
      areas: Array.from({ length: nAreas }, () => area(lat + entre(-0.02, 0.02), lng + entre(-0.02, 0.02), entre(0.6, 2.2))),
      puntoCero: [lat, lng],
      coordinador: null,
      objetivo: elegir(OBJETIVOS),
      grupos: { total: 0, enTerreno: 0 },
    });
  }
  // Los de ahora (ciclo de estados del 24/10): en proceso, en planificación (uno sin coordinador),
  // uno recién iniciado, uno nuevo sin activar y uno inactivo hace más de 48 h.
  const actuales: [number, number, boolean, EstadoOperativoPanel][] = [[0, 1.2, true, 'EN_PROCESO'], [1, 3.5, false, 'EN_PLANIFICACION'], [6, 0.4, true, 'EN_PROCESO'],
    [2, 0.8, true, 'EN_PLANIFICACION'], [5, 0.2, true, 'INICIADO'], [4, 0.1, true, 'NUEVO'], [8, 4.5, true, 'INACTIVO']];
  for (const [zi, dias, conCoord, estado] of actuales) {
    const zz = ZONAS[zi];
    const enCurso = estado !== 'NUEVO' && estado !== 'INICIADO';
    const agentes = enCurso ? { terreno: Math.floor(entre(6, 20)), base: Math.floor(entre(3, 10)), noDisponible: Math.floor(entre(0, 3)) } : { terreno: 0, base: 0, noDisponible: 0 };
    ops.push({
      id: `mock-actual-${zi}`, titulo: `${elegir(TIPOS)} — ${zz.localidad}`, localidad: `${zz.localidad}, Córdoba`,
      estado, inicio: new Date(ahora - dias * DIA).toISOString(), fin: null, resultado: null, conCoordinador: conCoord,
      agentes, agentesAsignados: agentes.terreno + agentes.base + agentes.noDisponible,
      instituciones: ['Policía', ...[...INSTITUCIONES.slice(1)].sort(() => r() - 0.5).slice(0, 2 + Math.floor(entre(0, 4)))],
      especialidades: ['Caminante', ...[...ESPECIALIDADES.slice(1)].sort(() => r() - 0.5).slice(0, 3 + Math.floor(entre(0, 4)))],
      areas: enCurso ? [area(zz.lat, zz.lng, 1.5), area(zz.lat - 0.015, zz.lng + 0.01, 1.1)] : [],
      puntoCero: [zz.lat + 0.004, zz.lng - 0.006],
      coordinador: conCoord ? COORDINADORES[zi % COORDINADORES.length] : null,
      objetivo: OBJETIVOS[zi % 3],
      grupos: enCurso ? { total: 2 + (zi % 4), enTerreno: 1 + (zi % 3) } : { total: 0, enTerreno: 0 },
      recursosCriticos: enCurso ? { 'K-9': 2 + (zi % 3), Drones: 1 + (zi % 2), Altura: 2, ...(zi % 2 ? { Caballería: 3 } : {}), ...(zi === 6 ? { Buceo: 2 } : {}) } : {},
    });
  }
  // Uno finalizado hoy (la tarjeta «Operativos finalizados» muestra los de hoy).
  const zf = ZONAS[2];
  ops.push({
    id: 'mock-fin-hoy', titulo: `Excursionista extraviado — ${zf.localidad}`, localidad: `${zf.localidad}, Córdoba`,
    estado: 'FINALIZADO', inicio: new Date(ahora - 30 * 3_600_000).toISOString(), fin: new Date(ahora - 2 * 3_600_000).toISOString(),
    resultado: 'HALLADA_CON_VIDA', conCoordinador: true, agentes: { terreno: 0, base: 0, noDisponible: 0 }, agentesAsignados: 9,
    instituciones: ['Policía', 'Defensa Civil'], especialidades: ['Caminante', 'K-9'],
    areas: [area(zf.lat, zf.lng, 1.6)], puntoCero: [zf.lat, zf.lng], coordinador: null,
    objetivo: OBJETIVOS[0], grupos: { total: 0, enTerreno: 0 },
  });
  // Uno abierto hace más de 30 días, para que se vea la alerta.
  const z = ZONAS[3];
  ops.push({
    id: 'mock-largo', titulo: `Turista desaparecido — ${z.localidad}`, localidad: `${z.localidad}, Córdoba`,
    estado: 'EN_PROCESO', inicio: new Date(ahora - 41 * DIA).toISOString(), fin: null, resultado: null,
    conCoordinador: false, agentes: { terreno: 3, base: 4, noDisponible: 1 }, agentesAsignados: 8,
    instituciones: ['Policía', 'Gendarmería'], especialidades: ['K-9', 'Drones'],
    areas: [area(z.lat, z.lng, 2.5), area(z.lat + 0.02, z.lng - 0.02, 1.8)],
    puntoCero: [z.lat + 0.01, z.lng - 0.01], coordinador: null,
    objetivo: { tipo: 'persona', descripcion: 'Turista extranjero, 28 años, campera azul' },
    grupos: { total: 2, enTerreno: 1 },
    recursosCriticos: { 'K-9': 2, Drones: 1 },
  });
  ops.forEach(completar);
  return ops.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/**
 * Panel v2 (11/11): cuántos agentes aportó cada institución y cuántos hubo de cada especialidad
 * (catálogo real), y la cobertura de rastrillaje. Se reparte el total de agentes del operativo.
 */
function completar(o: OperativoPanel) {
  const n = Math.max(o.agentesAsignados, o.estado === 'NUEVO' || o.estado === 'INICIADO' ? 0 : 4);
  const repartir = (claves: string[], pesoPrimero: number) => {
    const m: Record<string, number> = {};
    if (!n || !claves.length) return m;
    const pesos = claves.map((_, i) => (i === 0 ? pesoPrimero : 0.6 + r()));
    const suma = pesos.reduce((a, b) => a + b, 0);
    let resto = n;
    claves.forEach((k, i) => {
      const v = i === claves.length - 1 ? resto : Math.min(resto, Math.max(1, Math.round((n * pesos[i]) / suma)));
      if (v > 0) { m[k] = v; resto -= v; }
    });
    return m;
  };
  o.aporte = repartir(o.instituciones, 2.5);
  // Los de Policía se reparten entre sus dependencias del catálogo (DUAR, la que más aporta).
  const policia = o.aporte['Policía'] ?? 0;
  if (policia) {
    const idPolicia = catInstituciones.find(i => i.nombre === 'Policía')?.id;
    const deps = catDotaciones.filter(d => d.institucionId === idPolicia).map(d => d.nombre).sort(() => r() - 0.5);
    const elegidas = ['DUAR', ...deps.filter(d => d !== 'DUAR').slice(0, 1 + Math.floor(entre(0, 4)))];
    const m: Record<string, number> = {};
    let resto = policia;
    elegidas.forEach((d, i) => {
      const v = i === elegidas.length - 1 ? resto : Math.min(resto, Math.max(1, Math.round(policia * (i === 0 ? 0.5 : 0.5 / (elegidas.length - 1)))));
      if (v > 0) { m[d] = v; resto -= v; }
    });
    o.aporteDependencias = { Policía: m };
  }
  const esp = ['Caminante', 'Conductor', ...o.especialidades.filter(e => e !== 'Caminante')];
  o.porEspecialidad = repartir(esp, 3);
  const enMarcha = o.estado === 'EN_PROCESO' || o.estado === 'FINALIZADO' || o.estado === 'INACTIVO';
  o.coberturaHa = enMarcha ? Math.round(entre(40, 220)) : 0;
  o.tracksKm = enMarcha ? Math.round(entre(8, 45)) : 0;
}

export const OPERATIVOS_PANEL_MOCK: OperativoPanel[] = generar();

/** Usuarios en estado ACTIVO en el sistema (ejemplo). Con datos reales: usuarios.estado = 'INICIADO'. */
export const USUARIOS_ACTIVOS_MOCK = { total: 152, agentes: 140, coordinadores: 10, administradores: 2 };
