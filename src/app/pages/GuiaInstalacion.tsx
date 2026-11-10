import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Download, MoreVertical, PlusSquare, RefreshCw, Ruler, Share, Smartphone, WifiOff } from 'lucide-react';
import { MarcoAcceso, TituloAcceso, BotonAcceso, EnlaceAcceso, AlertaAcceso } from '../components/auth/Acceso';
import { alCambiarInstalacion, esInstalada, instalarDirecto, plataforma, puedeInstalarDirecto, type Plataforma } from '../utils/instalacion';

/**
 * Guía de instalación (10/11): cómo dejar CALÍVAR como app en el celular, para Android
 * y para iPhone. Pública (se llega desde el login sin iniciar sesión). Abre en la pestaña
 * del celular desde el que se entra; la otra queda a un toque.
 */
export default function GuiaInstalacion() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'android' | 'ios'>(() => (plataforma() === 'ios' ? 'ios' : 'android'));
  const [directo, setDirecto] = useState(puedeInstalarDirecto);
  const [instalada, setInstalada] = useState(esInstalada);

  useEffect(() => alCambiarInstalacion(() => setDirecto(puedeInstalarDirecto())), []);

  const instalar = async () => {
    if (await instalarDirecto()) setInstalada(true);
  };

  const sitio = typeof window !== 'undefined' ? window.location.host : 'el sistema';
  const p: Plataforma = plataforma();

  return (
    <MarcoAcceso pie={<EnlaceAcceso onClick={() => navigate('/login')}>Volver al inicio de sesión</EnlaceAcceso>}>
      <TituloAcceso icono={Smartphone} titulo="Guía de instalación"
        texto="Instalá CALÍVAR en tu celular para abrirlo con un toque desde la pantalla de inicio, a pantalla completa, como cualquier app." />

      {instalada && (
        <AlertaAcceso tono="info" icono={CheckCircle2} titulo="Ya está instalada">
          Estás usando CALÍVAR desde el ícono de tu celular. No hace falta hacer nada más.
        </AlertaAcceso>
      )}

      {!instalada && directo && (
        <>
          <BotonAcceso icono={Download} onClick={instalar}>Instalar ahora</BotonAcceso>
          <p style={{ margin: '-4px 0 0', textAlign: 'center', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>
            O seguí los pasos de abajo.
          </p>
        </>
      )}

      {p === 'otro' && !instalada && (
        <AlertaAcceso tono="info" icono={Smartphone}>
          Estás en una computadora. Abrí <strong>{sitio}</strong> desde el celular y seguí estos pasos.
        </AlertaAcceso>
      )}

      {/* Android / iPhone */}
      <div role="tablist" aria-label="Tipo de celular" className="grid grid-cols-2"
        style={{ gap: 4, padding: 4, borderRadius: 'var(--radius-button)', background: 'var(--muted)' }}>
        {([['android', 'Android'], ['ios', 'iPhone']] as const).map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            style={{
              height: 38, border: 'none', borderRadius: 'calc(var(--radius-button) - 2px)', cursor: 'pointer',
              background: tab === v ? 'var(--card)' : 'transparent', boxShadow: tab === v ? 'var(--elevation-sm)' : 'none',
              color: tab === v ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600,
            }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'android' ? (
        <Pasos titulo="En Android, con Google Chrome">
          <Paso n={1}>Abrí <strong>{sitio}</strong> en <strong>Google Chrome</strong>.</Paso>
          <Paso n={2}>Tocá el menú <Icono><MoreVertical size={14} /></Icono> (tres puntos, arriba a la derecha).</Paso>
          <Paso n={3}>Tocá <strong>«Instalar aplicación»</strong>. Si no aparece, tocá <strong>«Agregar a la pantalla principal»</strong>.</Paso>
          <Paso n={4}>Confirmá con <strong>«Instalar»</strong>. El ícono de CALÍVAR aparece en tu pantalla de inicio.</Paso>
        </Pasos>
      ) : (
        <Pasos titulo="En iPhone, con Safari">
          <Paso n={1}>Abrí <strong>{sitio}</strong> en <strong>Safari</strong> (la brújula azul).</Paso>
          <Paso n={2}>Tocá el botón <strong>Compartir</strong> <Icono><Share size={14} /></Icono> (el cuadrado con la flecha hacia arriba, en la barra de abajo).</Paso>
          <Paso n={3}>Deslizá hacia abajo y tocá <strong>«Agregar a inicio»</strong> <Icono><PlusSquare size={14} /></Icono>.</Paso>
          <Paso n={4}>Tocá <strong>«Agregar»</strong> arriba a la derecha. El ícono de CALÍVAR aparece en tu pantalla de inicio.</Paso>
        </Pasos>
      )}

      <div className="flex flex-col" style={{ gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
        <Consejo icono={Smartphone}>Desde ahí, abrí siempre CALÍVAR <strong>tocando el ícono</strong>: entra directo, sin la barra del navegador.</Consejo>
        <Consejo icono={WifiOff}>Sin señal la app abre igual, pero los datos nuevos se ven y se guardan cuando vuelve la conexión.</Consejo>
        <Consejo icono={RefreshCw}>Cuando haya una versión nueva te va a aparecer un aviso. Tocá <strong>«Actualizar»</strong>.</Consejo>
        <Consejo icono={Ruler}>
          ¿Algo no se ve bien en tu celular? <a href="/pantalla" onClick={e => { e.preventDefault(); navigate('/pantalla'); }}
            style={{ color: 'var(--foreground)', textDecoration: 'underline', textDecorationColor: 'var(--primary)', textUnderlineOffset: 3 }}>Información de pantalla</a>.
        </Consejo>
      </div>
    </MarcoAcceso>
  );
}

function Pasos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <p style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{titulo}</p>
      <ol className="flex flex-col" style={{ gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>{children}</ol>
    </div>
  );
}

function Paso({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start" style={{ gap: 12 }}>
      <span className="flex items-center justify-center" aria-hidden="true"
        style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: 'color-mix(in srgb, var(--primary) 16%, transparent)',
          color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 700 }}>{n}</span>
      <span style={{ fontSize: 'var(--text-base)', lineHeight: 1.5, color: 'var(--foreground)', paddingTop: 2 }}>{children}</span>
    </li>
  );
}

/** Ícono dentro del texto de un paso, para reconocer el botón en pantalla. */
function Icono({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center"
      style={{ width: 22, height: 22, borderRadius: 6, verticalAlign: '-5px', background: 'var(--muted)', border: '1px solid var(--border)' }}>
      {children}
    </span>
  );
}

function Consejo({ icono: I, children }: { icono: typeof Smartphone; children: ReactNode }) {
  return (
    <p className="flex items-start" style={{ gap: 10, margin: 0, fontSize: 'var(--text-small)', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
      <I size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
      <span>{children}</span>
    </p>
  );
}
