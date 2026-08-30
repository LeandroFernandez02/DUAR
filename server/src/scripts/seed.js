/**
 * SEED · Datos mínimos para poder entrar al sistema.
 *
 * Crea los roles (la tabla `cat_roles` estaba vacía) y un usuario ADMINISTRADOR.
 * Es idempotente: si ya existen, no los duplica.
 *
 *   npm run seed        (desde la carpeta server/)
 */
import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';

const ADMIN = {
  dni: '20123456',
  nombre: 'Admin',
  apellido: 'DUAR',
  email: 'admin@duar.cba.gob.ar',
  password: 'admin1234',
};

const ROLES = ['administrador', 'coordinador', 'agente'];

async function main() {
  console.log('Sembrando datos base...\n');

  // ── Roles ────────────────────────────────────────────────────────────────
  for (const nombre of ROLES) {
    await query(
      `INSERT INTO cat_roles (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING`,
      [nombre]
    );
  }
  const { rows: roles } = await query(`SELECT id, nombre FROM cat_roles ORDER BY nombre`);
  console.log(`Roles disponibles: ${roles.map(r => r.nombre).join(', ')}`);

  const rolAdmin = roles.find(r => r.nombre === 'administrador');
  if (!rolAdmin) throw new Error('No se pudo crear el rol administrador.');

  // ── Usuario administrador ────────────────────────────────────────────────
  const { rows: existentes } = await query(
    `SELECT id, estado FROM usuarios WHERE lower(email) = lower($1)`,
    [ADMIN.email]
  );

  if (existentes.length > 0) {
    // Si ya existe, se reactiva y se le reestablece la clave: así el seed sirve
    // también para recuperar el acceso durante el desarrollo.
    const hash = await bcrypt.hash(ADMIN.password, 10);
    await query(
      `UPDATE usuarios
          SET password_hash = $1, estado = 'ACTIVO', eliminado_en = NULL,
              actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [hash, existentes[0].id]
    );
    console.log(`Administrador ya existía: se reactivó y se reestableció la contraseña.`);
  } else {
    const hash = await bcrypt.hash(ADMIN.password, 10);
    // La institución del admin es el DUAR, si el catálogo ya está cargado.
    const { rows: inst } = await query(
      `SELECT id FROM cat_instituciones WHERE es_duar = true LIMIT 1`
    );
    await query(
      `INSERT INTO usuarios (dni, nombre, apellido, email, password_hash, rol_id, institucion_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [ADMIN.dni, ADMIN.nombre, ADMIN.apellido, ADMIN.email, hash, rolAdmin.id, inst[0]?.id ?? null]
    );
    console.log('Administrador creado.');
  }

  console.log('\n──────────────────────────────────────────');
  console.log('  Acceso al sistema');
  console.log(`  Email:      ${ADMIN.email}`);
  console.log(`  Contraseña: ${ADMIN.password}`);
  console.log('──────────────────────────────────────────\n');
}

main()
  .catch(err => { console.error('Error en el seed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
