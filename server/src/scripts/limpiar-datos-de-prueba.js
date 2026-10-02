/**
 * LIMPIEZA · Borra los datos de prueba de la base (02/10, antes de publicar).
 *
 *   npm run limpiar-pruebas              → ensayo: cuenta lo que borraría y DESCARTA todo
 *   npm run limpiar-pruebas -- --confirmar → borra de verdad
 *
 * Qué es "de prueba": los usuarios con correo @prueba.duar (los de las pruebas
 * a mano y los auto.* de las pruebas automáticas) y los operativos de la lista
 * de abajo, con todo lo que cuelga de ellos (agentes, grupos, eventos, QR,
 * presencias de mando, sesiones) y los renglones de auditoría que los nombran.
 *
 * Qué NO toca: nada que no sea de prueba. Las filas se borran por su relación
 * con lo de prueba y no por la fecha; y las claves foráneas son la red de
 * seguridad: si algo real todavía dependiera de un dato de prueba, el borrado
 * falla y se descarta completo en vez de dejar la base a medias.
 *
 * Todo corre en UNA transacción. Sin `--confirmar` se hace ROLLBACK al final,
 * así el ensayo muestra los números exactos sin cambiar nada.
 *
 * Después de publicar, la base es la real: las pruebas automáticas (npm test)
 * vuelven a crear sus usuarios y su operativo, y hay que correr esto de nuevo.
 */
import { pool } from '../config/db.js';

const OPERATIVOS_DE_PRUEBA = [
  'PRUEBA Modulo 4 destino - borrar',
  'PRUEBA Modulo 4 UI - borrar',
  'PRUEBAS AUTOMÁTICAS - no tocar',
];
const CONFIRMAR = process.argv.includes('--confirmar');

const PASOS = [
  ['eventos_estado (línea de tiempo)', `
    DELETE FROM eventos_estado
     WHERE operativo_id IN (SELECT id FROM t_ops) OR agente_operativo_id IN (SELECT id FROM t_agentes)
        OR grupo_id IN (SELECT id FROM t_grupos) OR registrado_por IN (SELECT id FROM t_usuarios)`],
  ['agentes_grupo_historial', `
    DELETE FROM agentes_grupo_historial
     WHERE agente_operativo_id IN (SELECT id FROM t_agentes) OR grupo_id IN (SELECT id FROM t_grupos)
        OR registrado_por IN (SELECT id FROM t_usuarios)`],
  // Primero los agentes: al borrarlos, grupos.lider_id se suelta solo (ON DELETE SET NULL). Al revés, soltar
  // a un agente de su grupo viola el CHECK de la Regla 1 (Agrupado exige grupo).
  ['agentes_operativo', `DELETE FROM agentes_operativo WHERE id IN (SELECT id FROM t_agentes)`],
  ['grupos', `DELETE FROM grupos WHERE id IN (SELECT id FROM t_grupos)`],
  ['presencias_mando', `
    DELETE FROM presencias_mando
     WHERE operativo_id IN (SELECT id FROM t_ops) OR usuario_id IN (SELECT id FROM t_usuarios)`],
  ['mando_operativo', `
    DELETE FROM mando_operativo
     WHERE operativo_id IN (SELECT id FROM t_ops) OR usuario_id IN (SELECT id FROM t_usuarios)`],
  ['tokens_operativo (QR)', `DELETE FROM tokens_operativo WHERE operativo_id IN (SELECT id FROM t_ops)`],
  ['operativos de prueba', `DELETE FROM operativos WHERE id IN (SELECT id FROM t_ops)`],
  ['logs_auditoria', `
    DELETE FROM logs_auditoria
     WHERE usuario_id IN (SELECT id FROM t_usuarios)
        OR registro_id IN (SELECT id FROM t_usuarios UNION SELECT id FROM t_ops
                           UNION SELECT id FROM t_grupos UNION SELECT id FROM t_agentes)`],
  ['intentos_login de prueba', `
    DELETE FROM intentos_login WHERE clave LIKE 'email:%@prueba.duar' OR clave LIKE 'email:auto.%'`],
  ['usuarios de prueba (con sus sesiones y alergias)', `DELETE FROM usuarios WHERE id IN (SELECT id FROM t_usuarios)`],
];

async function main() {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`CREATE TEMP TABLE t_usuarios ON COMMIT DROP AS SELECT id FROM usuarios WHERE email ILIKE '%@prueba.duar'`);
    await cliente.query(`CREATE TEMP TABLE t_ops ON COMMIT DROP AS SELECT id FROM operativos WHERE titulo = ANY($1::text[])`, [OPERATIVOS_DE_PRUEBA]);
    await cliente.query(`CREATE TEMP TABLE t_agentes ON COMMIT DROP AS
      SELECT id FROM agentes_operativo WHERE operativo_id IN (SELECT id FROM t_ops) OR usuario_id IN (SELECT id FROM t_usuarios)`);
    await cliente.query(`CREATE TEMP TABLE t_grupos ON COMMIT DROP AS SELECT id FROM grupos WHERE operativo_id IN (SELECT id FROM t_ops)`);

    const { rows: [n] } = await cliente.query(
      `SELECT (SELECT count(*) FROM t_usuarios)::int AS usuarios, (SELECT count(*) FROM t_ops)::int AS operativos`);
    console.log(`${CONFIRMAR ? 'BORRANDO' : 'ENSAYO (no se borra nada)'}: ${n.usuarios} usuarios y ${n.operativos} operativos de prueba.\n`);

    for (const [nombre, sql] of PASOS) {
      const r = await cliente.query(sql);
      console.log(`  ${nombre.padEnd(52)} ${r.rowCount}`);
    }

    if (CONFIRMAR) {
      await cliente.query('COMMIT');
      console.log('\nListo: los datos de prueba se borraron.');
    } else {
      await cliente.query('ROLLBACK');
      console.log('\nEnsayo terminado: no se cambió nada. Para borrar de verdad: npm run limpiar-pruebas -- --confirmar');
    }
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('\nNo se pudo limpiar (se descartó todo, la base quedó como estaba):', err.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
  }
}

main().finally(() => pool.end());
