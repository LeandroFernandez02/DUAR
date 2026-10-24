/**
 * Portal del Agente — «Objetivo buscado» (diseño CALÍVAR, 23/10; CU-14 consultado desde el celular).
 * La ficha de la persona u objeto que se busca en el operativo en el que estoy, con sus fotos.
 * Sólo lectura: cargarla y corregirla es del coordinador (CU-12/13).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Box, Image as ImagenIcono, Loader2, IdCard, Shirt, FileText, Ruler, User } from 'lucide-react';
import { portalApi, type ObjetivoApi } from '../../services/api';
import { formatearDni } from '../../utils/validacionUsuario';
import { tarjetaBase } from '../shared/Listados';
import { rotuloPortal } from './PanelTactico';

const GENERO: Record<string, string> = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro' };

function Campo({ titulo, valor }: { titulo: string; valor: ReactNode }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div className="min-w-0">
      <p style={{ ...rotuloPortal, fontSize: 'calc(10px * var(--escala-texto))' }}>{titulo}</p>
      <p style={{ margin: '2px 0 0', fontSize: 'var(--text-base)', color: 'var(--foreground)', wordBreak: 'break-word' }}>{valor}</p>
    </div>
  );
}

function Bloque({ icono: I, titulo, children }: { icono: typeof User; titulo: string; children: ReactNode }) {
  return (
    <section className="p-4 flex flex-col gap-3" style={tarjetaBase}>
      <p className="flex items-center gap-2" style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--foreground)' }}>
        <I size={14} style={{ color: 'var(--muted-foreground)' }} />{titulo}
      </p>
      {children}
    </section>
  );
}

export default function ObjetivoAgente() {
  const [objetivo, setObjetivo] = useState<ObjetivoApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    portalApi.miObjetivo()
      .then(r => setObjetivo(r.objetivo))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="flex justify-center p-8" style={tarjetaBase}><Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /></div>;
  if (error || !objetivo) {
    return (
      <div className="flex flex-col items-center text-center gap-2 p-8" style={tarjetaBase}>
        <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--muted)', color: 'var(--muted-foreground)' }}><User size={20} /></div>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--foreground)' }}>{error ? 'No se pudo cargar el objetivo' : 'Todavía no se cargó el objetivo'}</p>
        <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          {error ? 'Revisá la conexión e intentá de nuevo.' : 'Cuando el coordinador cargue la ficha de lo que se busca, la vas a ver acá.'}
        </p>
      </div>
    );
  }

  const persona = objetivo.tipo === 'PERSONA';
  const nombre = persona ? [objetivo.nombre, objetivo.apellido].filter(Boolean).join(' ') : objetivo.nombre;
  const resumen = persona
    ? [objetivo.edad != null ? `${objetivo.edad} años` : null, objetivo.genero ? GENERO[objetivo.genero] : null, objetivo.nacionalidad].filter(Boolean).join(' · ')
    : [objetivo.tipoObjeto, objetivo.color, objetivo.marca].filter(Boolean).join(' · ');
  const dims = [objetivo.dimensionAlto, objetivo.dimensionAncho, objetivo.dimensionLargo];

  return (
    <div className="flex flex-col gap-4">
      <section className="p-4 flex flex-col gap-3" style={tarjetaBase}>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 14, background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--foreground)' }}>
            {persona ? <User size={20} /> : <Box size={20} />}
          </span>
          <div className="min-w-0">
            <p style={rotuloPortal}>{persona ? 'Persona' : 'Objeto'}</p>
            <p style={{ margin: '1px 0 0', fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>{nombre || '—'}</p>
            {resumen && <p style={{ margin: '1px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{resumen}</p>}
          </div>
        </div>
        {objetivo.fotos.length > 0 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {objetivo.fotos.map((f, i) => (
              f.url
                ? <a key={f.id} href={f.url} target="_blank" rel="noreferrer" aria-label={`Ver foto ${i + 1}`}
                    style={{ display: 'block', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--muted)' }}>
                    <img src={f.url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </a>
                : <div key={f.id} className="flex flex-col items-center justify-center gap-1" style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))' }}>
                    <ImagenIcono size={16} />Foto {i + 1}
                  </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Sin fotos cargadas.</p>
        )}
      </section>

      {persona ? (
        <>
          <Bloque icono={IdCard} titulo="Datos personales">
            <div className="grid grid-cols-2 gap-3">
              <Campo titulo="Nombre" valor={objetivo.nombre} />
              <Campo titulo="Apellido" valor={objetivo.apellido} />
              <Campo titulo="DNI" valor={objetivo.dni ? formatearDni(objetivo.dni) : null} />
              <Campo titulo="Nacionalidad" valor={objetivo.nacionalidad} />
              <Campo titulo="Edad" valor={objetivo.edad != null ? `${objetivo.edad} años` : null} />
              <Campo titulo="Género" valor={objetivo.genero ? GENERO[objetivo.genero] : null} />
            </div>
          </Bloque>
          <Bloque icono={Shirt} titulo="Descripción física">
            <div className="grid grid-cols-2 gap-3">
              <Campo titulo="Estatura" valor={objetivo.estatura ? `${objetivo.estatura} cm` : null} />
              <Campo titulo="Complexión" valor={objetivo.complexionFisica} />
              <Campo titulo="Color de piel" valor={objetivo.colorPiel} />
              <Campo titulo="Color de ojos" valor={objetivo.colorOjos} />
              <Campo titulo="Color de pelo" valor={objetivo.colorPelo} />
            </div>
            <Campo titulo="Vestimenta" valor={objetivo.vestimenta} />
          </Bloque>
        </>
      ) : (
        <Bloque icono={Ruler} titulo="Características">
          <div className="grid grid-cols-2 gap-3">
            <Campo titulo="Tipo" valor={objetivo.tipoObjeto} />
            <Campo titulo="Color" valor={objetivo.color} />
            <Campo titulo="Marca" valor={objetivo.marca} />
            <Campo titulo="Modelo" valor={objetivo.modelo} />
            <Campo titulo="Dimensiones" valor={dims.some(d => d != null) ? `${dims.map(d => d ?? '—').join(' × ')} cm` : null} />
          </div>
        </Bloque>
      )}
      {objetivo.detallesAdicionales && (
        <Bloque icono={FileText} titulo="Detalles adicionales">
          <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{objetivo.detallesAdicionales}</p>
        </Bloque>
      )}
    </div>
  );
}
