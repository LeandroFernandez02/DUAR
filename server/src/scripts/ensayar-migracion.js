/**
 * ENSAYO de una migración: la corre dentro de una transacción, ejecuta las
 * comprobaciones que se le pasen y SIEMPRE hace ROLLBACK. No deja nada aplicado.
 *
 *   node src/scripts/ensayar-migracion.js ../db/migrations/019_mapa_operacional.sql [comprobaciones.sql]
 *
 * Sirve para probar una migración contra la base real (que es la de
 * producción) antes de aplicarla de verdad.
 */
import fs from 'node:fs';
import { pool } from '../config/db.js';

const [archivo, comprobaciones] = process.argv.slice(2);
if (!archivo) {
  console.error('Uso: node src/scripts/ensayar-migracion.js <migracion.sql> [comprobaciones.sql]');
  process.exit(1);
}

const cliente = await pool.connect();
try {
  await cliente.query('BEGIN');
  await cliente.query(fs.readFileSync(archivo, 'utf8'));
  console.log('Migración: se aplicó sin errores (dentro de la transacción).');
  if (comprobaciones) {
    for (const bloque of fs.readFileSync(comprobaciones, 'utf8').split(/^-- ##/m).filter(b => b.trim())) {
      const [titulo, ...sql] = bloque.split('\n');
      // Un bloque puede tener varias sentencias: se muestra el resultado de la última.
      const res = await cliente.query(sql.join('\n'));
      const { rows } = Array.isArray(res) ? res[res.length - 1] : res;
      console.log(`\n## ${titulo.trim()}`);
      if (rows?.length) console.table(rows);
    }
  }
} catch (err) {
  console.error('\nFALLÓ:', err.message);
  process.exitCode = 1;
} finally {
  await cliente.query('ROLLBACK').catch(() => {});
  console.log('\nROLLBACK: la base quedó como estaba.');
  cliente.release();
  await pool.end();
}
