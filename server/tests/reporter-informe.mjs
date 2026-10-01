/**
 * Reporter de node:test que escribe el informe de pruebas en Markdown, en
 * tablas por suite (caso, CU, resultado, tiempo), para usar como evidencia en
 * el capítulo de pruebas de la tesis.
 *
 * Uso: npm run test:informe  →  server/tests/INFORME-PRUEBAS.md
 *
 * El nombre de cada prueba empieza con el CU o la regla que verifica, separado
 * por " · " (ej. "CU-21 · crear un grupo..."): de ahí sale la columna CU.
 */
const escapar = t => String(t).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function separar(nombre) {
  const i = nombre.indexOf(' · ');
  return i > 0 ? { cu: nombre.slice(0, i), caso: nombre.slice(i + 3) } : { cu: '—', caso: nombre };
}

const ms = d => (d >= 1000 ? `${(d / 1000).toFixed(1)} s` : `${Math.round(d)} ms`);

export default async function* informe(source) {
  const casos = [];               // { archivo, nombre, ok, duracion, error }
  const suites = new Map();       // archivo → nombre de la suite

  for await (const evento of source) {
    if (evento.type !== 'test:pass' && evento.type !== 'test:fail') continue;
    const d = evento.data;
    if (d.details?.type === 'suite') {
      if (d.nesting === 0) suites.set(d.file, d.name);
      continue;
    }
    // Un fallo fuera de una prueba (ej. el before() de la preparación) también se informa.
    casos.push({
      archivo: d.file, nombre: d.name, ok: evento.type === 'test:pass',
      duracion: d.details?.duration_ms ?? 0,
      error: d.details?.error?.cause?.message ?? d.details?.error?.message ?? null,
    });
  }

  const total = casos.length;
  const fallidas = casos.filter(c => !c.ok);
  const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba', dateStyle: 'short', timeStyle: 'short' });

  let md = '# Informe de pruebas automatizadas · Sistema DUAR\n\n';
  md += `- **Fecha:** ${fecha} (hora de Córdoba)\n`;
  md += `- **Resultado:** ${total - fallidas.length} de ${total} pruebas OK`
    + (fallidas.length ? ` · **${fallidas.length} fallidas**` : '') + '\n';
  md += '- **Cómo se corre:** `cd server && npm run test:informe`, con la API local levantada (`npm run dev`).\n';
  md += '- **Alcance:** reglas puras del modelo de estados y de composición, y casos de uso de los Módulos 1, 2 y 4 '
    + 'contra la API real. Las pruebas de API corren sobre un operativo y usuarios propios '
    + '("PRUEBAS AUTOMÁTICAS - no tocar", auto.*@prueba.duar) y se detienen si encuentran datos ajenos.\n';

  const archivos = [...new Set(casos.map(c => c.archivo))];
  let n = 0;
  for (const archivo of archivos) {
    const titulo = suites.get(archivo) ?? archivo.split(/[\\/]/).pop();
    md += `\n## ${escapar(titulo)}\n\n| # | Caso | CU / regla | Resultado | Tiempo |\n|---|---|---|---|---|\n`;
    for (const c of casos.filter(x => x.archivo === archivo)) {
      const { cu, caso } = separar(c.nombre);
      md += `| ${++n} | ${escapar(caso)} | ${escapar(cu)} | ${c.ok ? '✅ OK' : '❌ Falla'} | ${ms(c.duracion)} |\n`;
    }
  }

  if (fallidas.length) {
    md += '\n## Detalle de las fallas\n\n';
    for (const c of fallidas) md += `- **${escapar(c.nombre)}:** ${escapar(c.error ?? 'sin detalle')}\n`;
  }

  yield md;
}
