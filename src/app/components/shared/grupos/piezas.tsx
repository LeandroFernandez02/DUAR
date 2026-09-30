/**
 * Piezas visuales que comparten los modales de grupos (CU-21 a CU-26) y el
 * portal del Líder. Mismo lenguaje que el modal de extracción original: overlay
 * con desenfoque, encabezado con ícono, botón primario rojo.
 */
import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AccionGrupo, AccionTerreno, ClaseGrupoApi, EstadoGrupoApi } from '../../../services/api';

export const ETIQUETA_ESTADO_GRUPO: Record<EstadoGrupoApi, string> = {
  EN_FORMACION: 'En Formación',
  CONFIRMADO: 'Confirmado',
  ASIGNADO: 'Asignado',
  DESPLEGADO: 'Desplegado',
  RASTRILLANDO: 'Rastrillando',
  REPLEGADO: 'Replegado',
  EN_ESPERA: 'En Espera',
  DISUELTO: 'Disuelto',
};

/** Clase del grupo (migración 012), como se dice en la pantalla. */
export const ETIQUETA_CLASE: Record<ClaseGrupoApi, string> = {
  RASTRILLAJE: 'De rastrillaje',
  ESPECIAL: 'Especial',
};

/** Fases del grupo (espejo de server/src/models/estados.js). */
export const EN_BASE: EstadoGrupoApi[] = ['EN_FORMACION', 'CONFIRMADO', 'ASIGNADO', 'EN_ESPERA'];
export const EN_OPERACION: EstadoGrupoApi[] = ['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'];
export const DISOLUBLES = EN_BASE;
/** Entre éstos se mueve una CORRECCIÓN del coordinador. */
export const CORREGIBLES: EstadoGrupoApi[] = ['ASIGNADO', 'DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA'];

/** Cada acción, dicha como lo que pasó y con lo que provoca en los integrantes. */
export const ACCION_INFO: Record<Exclude<AccionGrupo, 'corregir'>, {
  boton: string; titulo: string; hacia: EstadoGrupoApi; efecto: string; desde: EstadoGrupoApi[];
}> = {
  confirmar: {
    boton: 'Confirmar', titulo: 'Confirmar el grupo', hacia: 'CONFIRMADO', desde: ['EN_FORMACION', 'EN_ESPERA'],
    efecto: 'La composición queda cerrada: para cambiarla hay que reabrirlo. Ya se le puede asignar una zona.',
  },
  asignar: {
    boton: 'Asignar zona', titulo: 'Asignar zona de búsqueda', hacia: 'ASIGNADO', desde: ['CONFIRMADO'],
    efecto: 'El grupo queda listo para salir. Hasta que exista el mapa (CU-28), la zona es una descripción.',
  },
  reabrir: {
    boton: 'Reabrir', titulo: 'Reabrir el grupo', hacia: 'EN_FORMACION', desde: ['CONFIRMADO', 'ASIGNADO', 'EN_ESPERA'],
    efecto: 'Vuelve a En formación para cambiar su composición. Después hay que confirmarlo y asignarle zona de nuevo.',
  },
  salir: {
    boton: 'Registrar salida', titulo: 'Salieron hacia el polígono', hacia: 'DESPLEGADO', desde: ['ASIGNADO'],
    efecto: 'Los integrantes pasan a Desplegado y se abre su período en el historial.',
  },
  llegar_poligono: {
    boton: 'Registrar llegada', titulo: 'Llegaron y empezaron a rastrillar', hacia: 'RASTRILLANDO', desde: ['DESPLEGADO'],
    efecto: 'Los integrantes pasan a Rastrillando; el conductor queda Desplegado, con el vehículo.',
  },
  volver: {
    boton: 'Registrar regreso', titulo: 'Emprendieron la vuelta', hacia: 'REPLEGADO', desde: ['DESPLEGADO', 'RASTRILLANDO'],
    efecto: 'Los integrantes pasan a Replegado.',
  },
  llegar_base: {
    boton: 'Registrar llegada a la base', titulo: 'Llegaron al puesto de comando', hacia: 'EN_ESPERA', desde: ['REPLEGADO'],
    efecto: 'Los integrantes pasan a En espera y se cierra su período en el historial.',
  },
};

export const ACCIONES_TERRENO: AccionTerreno[] = ['salir', 'llegar_poligono', 'volver', 'llegar_base'];

/** Acciones disponibles para un grupo en un estado dado (en el orden en que conviene mostrarlas). */
export function accionesPara(estado: EstadoGrupoApi): Exclude<AccionGrupo, 'corregir'>[] {
  return (Object.keys(ACCION_INFO) as Exclude<AccionGrupo, 'corregir'>[])
    .filter(a => ACCION_INFO[a].desde.includes(estado))
    .sort((a, b) => Number(a === 'reabrir') - Number(b === 'reabrir'));
}

/** Cómo lo dice el Líder desde su celular. */
export const BOTON_LIDER: Record<AccionTerreno, string> = {
  salir: 'Salimos hacia el polígono',
  llegar_poligono: 'Llegamos, empezamos a rastrillar',
  volver: 'Volvemos',
  llegar_base: 'Llegamos a la base',
};

/** Etiqueta del conductor: color propio (fucsia), que ningún estado ni especialidad usa. */
export function EtiquetaConductor() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full shrink-0" style={{
      fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap', lineHeight: 1.3,
      background: 'rgba(192,38,211,0.12)', border: '1px solid rgba(192,38,211,0.35)', color: '#c026d3',
    }}>
      Conductor
    </span>
  );
}

export function Overlay({ children, onClose, ancho = 480 }: { children: ReactNode; onClose: () => void; ancho?: number }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full rounded-[var(--radius-card)] overflow-hidden flex flex-col"
        style={{ maxWidth: ancho, maxHeight: 'calc(100vh - 32px)', background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function IconBox({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      {children}
    </div>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return (
    <p style={{
      color: 'var(--foreground)', fontSize: 'var(--text-base)',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
    }}>{children}</p>
  );
}

export function Texto({ children }: { children: ReactNode }) {
  return (
    <p className="mt-0.5" style={{
      color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
      fontFamily: 'var(--font-family-primary)', lineHeight: 1.5,
    }}>{children}</p>
  );
}

export function Etiqueta({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{
      display: 'block',
      color: 'var(--foreground)', fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
      marginBottom: 8,
    }}>{children}</label>
  );
}

export function BotonSecundario({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-[var(--radius-button)]"
      style={{
        background: 'var(--muted)', border: '1px solid var(--border)',
        color: 'var(--foreground)', fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function BotonPrimario({ children, onClick, habilitado, peligro = false }: {
  children: ReactNode; onClick: () => void; habilitado: boolean; peligro?: boolean;
}) {
  const fondo = peligro ? '#dc2626' : 'var(--primary)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!habilitado}
      className="flex-1 py-2.5 rounded-[var(--radius-button)]"
      style={{
        background: habilitado ? fondo : 'var(--muted)',
        color: habilitado ? '#fff' : 'var(--muted-foreground)',
        fontSize: 'var(--text-base)', border: 'none',
        fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
        opacity: habilitado ? 1 : 0.55,
        cursor: habilitado ? 'pointer' : 'default',
      }}
    >
      {children}
    </button>
  );
}

export function ErrorCaja({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]"
      style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.5 }}>
      <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

export const estiloCampo = {
  background: 'var(--input-background)', border: '1px solid var(--border)',
  color: 'var(--foreground)', borderRadius: 'var(--radius-input)',
  fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)',
} as const;
