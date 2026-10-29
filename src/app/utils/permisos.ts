/**
 * permisos.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Qué puede hacer cada rol en la interfaz. La última palabra la tiene el
 * backend (middleware `gestores` / `lectores`); esto sólo evita mostrar
 * botones que el servidor va a rechazar.
 *
 * Jefe de operativo (relevamiento del 29/10): ve todo el sistema y extrae
 * informes, pero no modifica nada.
 */
import type { Rol } from '../data/mockData';

type ConRol = { rol?: Rol | string } | null | undefined;

/** Crea y modifica operativos y usuarios: administrador y coordinador. */
export const puedeGestionar = (u: ConRol) => u?.rol === 'administrador' || u?.rol === 'coordinador';

/** El Jefe de operativo: sólo mira y extrae informes. */
export const esJefeOperativo = (u: ConRol) => u?.rol === 'jefe_operativo';

/** Cómo se muestra cada rol. */
export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  jefe_operativo: 'Jefe de operativo',
  agente: 'Agente',
};

/* ── Puesto de comando (migración 029) ──────────────────────────────────── */

export type PuestoMando = 'JEFE_OPERATIVO' | 'COORDINADOR' | 'ENCARGADO';

/** Los tres puestos, en el orden en que se muestran, y el rol que exige cada uno. */
export const PUESTOS: { value: PuestoMando; label: string; rol: Rol; ayuda: string }[] = [
  { value: 'JEFE_OPERATIVO', label: 'Jefe de operativo', rol: 'jefe_operativo', ayuda: 'Usuarios con rol Jefe de operativo' },
  { value: 'COORDINADOR',    label: 'Coordinador',       rol: 'coordinador',    ayuda: 'Usuarios con rol Coordinador' },
  { value: 'ENCARGADO',      label: 'Encargado',         rol: 'coordinador',    ayuda: 'El que está en el campo (rol Coordinador)' },
];

export const ETIQUETA_PUESTO: Record<PuestoMando, string> = {
  JEFE_OPERATIVO: 'Jefe de operativo', COORDINADOR: 'Coordinador', ENCARGADO: 'Encargado',
};
