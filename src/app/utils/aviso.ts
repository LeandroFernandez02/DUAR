import { toast } from 'sonner';

/**
 * Avisos del sistema (13/11): todos con la misma estructura — ícono del tipo, un título corto y
 * el detalle debajo — en una caja horizontal (estilos en theme.css, `.aviso`). Usar esto en vez
 * de llamar a `toast` directo, así ninguna notificación queda con otro formato.
 */
type Opciones = {
  /** Título en negrita; si falta, el del tipo («Listo», «Error», «Atención», «Aviso»). */
  titulo?: string;
  duracion?: number;
  accion?: { label: string; onClick: () => void };
};

const TITULO = { exito: 'Listo', error: 'Error', atencion: 'Atención', info: 'Aviso' } as const;

function armar(tipo: keyof typeof TITULO, texto: string, o: Opciones = {}) {
  const fn = { exito: toast.success, error: toast.error, atencion: toast.warning, info: toast.info }[tipo];
  return fn(o.titulo ?? TITULO[tipo], {
    description: texto,
    duration: o.duracion ?? (tipo === 'error' ? 6000 : tipo === 'exito' ? 4000 : 5000),
    action: o.accion,
  });
}

export const aviso = {
  exito: (texto: string, o?: Opciones) => armar('exito', texto, o),
  error: (texto: string, o?: Opciones) => armar('error', texto, o),
  atencion: (texto: string, o?: Opciones) => armar('atencion', texto, o),
  info: (texto: string, o?: Opciones) => armar('info', texto, o),
};
