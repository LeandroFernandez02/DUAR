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
import * as Storage from '../services/storage.service.js';

const OPERATIVOS_DE_PRUEBA = [
  'PRUEBA Modulo 4 destino - borrar',
  'PRUEBA Modulo 4 UI - borrar',
  'PRUEBAS AUTOMÁTICAS - no tocar',
];
// Los que crea cada corrida de las pruebas del Punto Cero y del Informe (uno por corrida: el título no se repite en 24 h).
const PREFIJOS_OPERATIVOS_DE_PRUEBA = ['PRUEBAS AUTOMÁTICAS - Punto Cero %', 'PRUEBAS AUTOMÁTICAS - Informe %'];
const CONFIRMAR = process.argv.includes('--confirmar');

const PASOS = [
  // Informes (CU-41, migración 021): la base no deja borrarlos salvo en esta
  // transacción, que lo habilita con SET LOCAL duar.limpieza_pruebas.
  ['informes_operativo', `
    DELETE FROM informes_operativo
     WHERE operativo_id IN (SELECT id FROM t_ops) OR generado_por IN (SELECT id FROM t_usuarios)
     RETURNING archivo_ruta AS informe_ruta`],
  // Módulo 5 (migración 019): antes que grupos, agentes y operativos, que estas tablas referencian.
  ['poligono_eventos', `
    DELETE FROM poligono_eventos
     WHERE operativo_id IN (SELECT id FROM t_ops) OR grupo_id IN (SELECT id FROM t_grupos)
        OR registrado_por IN (SELECT id FROM t_usuarios)`],
  ['poligono_grupos', `
    DELETE FROM poligono_grupos
     WHERE grupo_id IN (SELECT id FROM t_grupos)
        OR poligono_id IN (SELECT id FROM poligonos WHERE operativo_id IN (SELECT id FROM t_ops))
        OR asignado_por IN (SELECT id FROM t_usuarios) OR salida_por IN (SELECT id FROM t_usuarios)`],
  ['tracks_gpx', `
    DELETE FROM tracks_gpx
     WHERE operativo_id IN (SELECT id FROM t_ops) OR agente_operativo_id IN (SELECT id FROM t_agentes)
        OR cargado_por IN (SELECT id FROM t_usuarios)
     RETURNING archivo_ruta`],
  ['marcador_fotos', `
    DELETE FROM marcador_fotos
     WHERE marcador_id IN (SELECT id FROM marcadores WHERE operativo_id IN (SELECT id FROM t_ops))
        OR subido_por IN (SELECT id FROM t_usuarios)
     RETURNING url_foto`],
  ['marcadores', `DELETE FROM marcadores WHERE operativo_id IN (SELECT id FROM t_ops) OR creado_por IN (SELECT id FROM t_usuarios)`],
  ['radios_operativo', `DELETE FROM radios_operativo WHERE operativo_id IN (SELECT id FROM t_ops) OR creado_por IN (SELECT id FROM t_usuarios)`],
  ['punto_cero_historial', `DELETE FROM punto_cero_historial WHERE operativo_id IN (SELECT id FROM t_ops) OR registrado_por IN (SELECT id FROM t_usuarios)`],
  ['poligonos', `DELETE FROM poligonos WHERE operativo_id IN (SELECT id FROM t_ops) OR creado_por IN (SELECT id FROM t_usuarios)`],
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
  // El Módulo 5 nunca borra de verdad (todo es baja con registro): si la fila
  // ya no existe, era un elemento de prueba borrado por este script. Las
  // pruebas usan la cuenta del administrador real, por eso no alcanza con el autor.
  ['logs_auditoria del mapa (elementos de prueba ya borrados)', `
    DELETE FROM logs_auditoria l
     WHERE (l.entidad_afectada = 'poligonos'        AND NOT EXISTS (SELECT 1 FROM poligonos x        WHERE x.id = l.registro_id))
        OR (l.entidad_afectada = 'tracks_gpx'       AND NOT EXISTS (SELECT 1 FROM tracks_gpx x       WHERE x.id = l.registro_id))
        OR (l.entidad_afectada = 'marcadores'       AND NOT EXISTS (SELECT 1 FROM marcadores x       WHERE x.id = l.registro_id))
        OR (l.entidad_afectada = 'radios_operativo' AND NOT EXISTS (SELECT 1 FROM radios_operativo x WHERE x.id = l.registro_id))
        OR (l.entidad_afectada = 'marcador_fotos'   AND NOT EXISTS (SELECT 1 FROM marcadores x       WHERE x.id = l.registro_id)
                                                    AND NOT EXISTS (SELECT 1 FROM marcador_fotos x   WHERE x.id = l.registro_id))`],
  ['intentos_login de prueba', `
    DELETE FROM intentos_login WHERE clave LIKE 'email:%@prueba.duar' OR clave LIKE 'email:auto.%'`],
  ['usuarios de prueba (con sus sesiones y alergias)', `DELETE FROM usuarios WHERE id IN (SELECT id FROM t_usuarios)`],
];

async function main() {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`CREATE TEMP TABLE t_usuarios ON COMMIT DROP AS SELECT id FROM usuarios WHERE email ILIKE '%@prueba.duar'`);
    await cliente.query(`CREATE TEMP TABLE t_ops ON COMMIT DROP AS SELECT id FROM operativos
      WHERE titulo = ANY($1::text[]) OR titulo LIKE ANY($2::text[])`, [OPERATIVOS_DE_PRUEBA, PREFIJOS_OPERATIVOS_DE_PRUEBA]);
    await cliente.query(`CREATE TEMP TABLE t_agentes ON COMMIT DROP AS
      SELECT id FROM agentes_operativo WHERE operativo_id IN (SELECT id FROM t_ops) OR usuario_id IN (SELECT id FROM t_usuarios)`);
    await cliente.query(`CREATE TEMP TABLE t_grupos ON COMMIT DROP AS SELECT id FROM grupos WHERE operativo_id IN (SELECT id FROM t_ops)`);

    const { rows: [n] } = await cliente.query(
      `SELECT (SELECT count(*) FROM t_usuarios)::int AS usuarios, (SELECT count(*) FROM t_ops)::int AS operativos`);
    console.log(`${CONFIRMAR ? 'BORRANDO' : 'ENSAYO (no se borra nada)'}: ${n.usuarios} usuarios y ${n.operativos} operativos de prueba.\n`);

    // Los .gpx originales de los tracks y las fotos de los marcadores borrados
    // (buckets privados) se borran después del COMMIT, para no perder un
    // archivo si la base se descarta.
    const archivosGpx = [];
    const fotos = [];
    const informes = [];
    await cliente.query(`SET LOCAL duar.limpieza_pruebas = 'si'`);
    for (const [nombre, sql] of PASOS) {
      const r = await cliente.query(sql);
      for (const f of r.rows ?? []) {
        if (f.archivo_ruta) archivosGpx.push(f.archivo_ruta);
        if (f.url_foto) fotos.push(f.url_foto);
        if (f.informe_ruta) informes.push(f.informe_ruta);
      }
      console.log(`  ${nombre.padEnd(52)} ${r.rowCount}`);
    }
    console.log(`  ${'archivos GPX en el almacenamiento'.padEnd(52)} ${archivosGpx.length}`);
    console.log(`  ${'fotos de marcadores en el almacenamiento'.padEnd(52)} ${fotos.length}`);
    console.log(`  ${'informes PDF en el almacenamiento'.padEnd(52)} ${informes.length}`);

    if (CONFIRMAR) {
      await cliente.query('COMMIT');
      try {
        await Storage.borrarGpx(archivosGpx);
        await Storage.borrarFotos(fotos);
        await Storage.borrarInformes(informes);
      } catch (err) {
        console.error('\nLa base quedó limpia, pero no se pudieron borrar algunos archivos del almacenamiento:', err.message);
        process.exitCode = 1;
      }
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
