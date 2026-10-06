/**
 * REPARACIÓN · Cuentas eliminadas que siguen figurando en un operativo (05/10).
 *
 *   npm run reparar-eliminadas              → ensayo: muestra qué haría y DESCARTA todo
 *   npm run reparar-eliminadas -- --confirmar → lo aplica
 *
 * Hasta el 05/10, eliminar una cuenta (CU-07) no la sacaba de los operativos ni
 * del puesto de comando: quedaba "Disponible" con la cuenta eliminada. Desde el
 * arreglo, la baja de la cuenta hace las dos cosas juntas; esto repara las
 * cuentas eliminadas ANTES, con la misma función
 * (AgenteOperativo.egresarPorCuentaEliminadaCon), registrando en la línea de
 * tiempo "Su cuenta fue eliminada del sistema".
 *
 * Si alguna está en el terreno con un grupo, no se toca nada (hay que retirarla
 * del grupo primero, CU-26). Todo corre en UNA transacción.
 */
import { pool } from '../config/db.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';

const CONFIRMAR = process.argv.includes('--confirmar');

async function main() {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `SELECT DISTINCT u.id, u.nombre, u.apellido, u.dni
         FROM usuarios u
        WHERE u.eliminado_en IS NOT NULL
          AND (EXISTS (SELECT 1 FROM agentes_operativo ao WHERE ao.usuario_id = u.id AND ao.fecha_egreso IS NULL)
            OR EXISTS (SELECT 1 FROM presencias_mando p WHERE p.usuario_id = u.id AND p.egreso_en IS NULL))`
    );
    console.log(`${CONFIRMAR ? 'REPARANDO' : 'ENSAYO (no se cambia nada)'}: ${rows.length} cuenta(s) eliminada(s) que siguen en un operativo.\n`);

    for (const u of rows) {
      const dejados = await AgenteOperativo.egresarPorCuentaEliminadaCon(cliente, u.id, null);
      console.log(`  ${u.apellido}, ${u.nombre} (DNI ${u.dni}) → deja: ${dejados.join(', ') || 'el puesto de comando'}`);
    }

    if (CONFIRMAR) {
      await cliente.query('COMMIT');
      console.log('\nListo.');
    } else {
      await cliente.query('ROLLBACK');
      console.log('\nEnsayo terminado: no se cambió nada. Para aplicarlo: npm run reparar-eliminadas -- --confirmar');
    }
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('\nNo se pudo reparar (se descartó todo, la base quedó como estaba):', err.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
  }
}

main().finally(() => pool.end());
