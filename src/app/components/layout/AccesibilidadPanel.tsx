/**
 * Panel de Accesibilidad (WCAG 2.1 AA, diseño CALÍVAR del 23/10): tamaño de texto (Normal /
 * Grande / Muy grande), alto contraste y resaltar foco (encendido por defecto). Va junto al
 * cambio de tema: en escritorio se abre desde «Accesibilidad» del menú lateral; en mobile, en la
 * hoja de Perfil (`tactil`: filas de 52 px). `sinFoco` lo oculta en pantallas sólo táctiles.
 */
import { Contrast, Scan, Type } from 'lucide-react';
import { useAccesibilidad, type TamanoTexto } from '../../context/accesibilidad';

const TAMANOS: [TamanoTexto, string, number][] = [['normal', 'Normal', 13], ['grande', 'Grande', 16], ['muy-grande', 'Muy grande', 19]];

function Interruptor({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" style={{
      width: 40, height: 24, borderRadius: 999, padding: 2, boxSizing: 'border-box', flexShrink: 0,
      background: on ? 'var(--primary)' : 'var(--muted)', border: '1px solid var(--border)',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .15s',
    }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </span>
  );
}

export default function AccesibilidadPanel({ tactil = false, sinFoco = false }: { tactil?: boolean; sinFoco?: boolean }) {
  const [a, cambiar] = useAccesibilidad();
  const alto = tactil ? 52 : 44;
  const fila = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: alto, padding: '0 12px', border: 'none',
    borderRadius: 'var(--radius-md)', background: 'none', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', color: 'var(--popover-foreground)',
  } as const;
  const sub = { display: 'block', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)', marginTop: 1 } as const;
  return (
    <div className="flex flex-col gap-0.5">
      <div style={{ padding: '6px 12px 8px' }}>
        <div className="flex items-center gap-3 mb-2" style={{ fontSize: 'var(--text-base)', color: 'var(--popover-foreground)' }}>
          <Type size={18} style={{ color: 'var(--muted-foreground)' }} />Tamaño de texto
        </div>
        <div role="radiogroup" aria-label="Tamaño de texto" className="grid grid-cols-3 gap-1"
          style={{ padding: 3, borderRadius: 'var(--radius-md)', background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {TAMANOS.map(([v, l, px]) => {
            const on = a.texto === v;
            return (
              <button key={v} type="button" role="radio" aria-checked={on} aria-label={l} onClick={() => cambiar({ texto: v })}
                className="flex flex-col items-center justify-center gap-px"
                style={{ minHeight: alto - 6, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
                  background: on ? 'var(--card)' : 'transparent', boxShadow: on ? 'var(--elevation-sm)' : 'none',
                  color: on ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                <span style={{ fontSize: px, fontWeight: 700, lineHeight: 1 }}>A</span>
                <span style={{ fontSize: 'var(--text-micro)', fontWeight: on ? 600 : 500 }}>{l}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={a.contraste} onClick={() => cambiar({ contraste: !a.contraste })} style={fila}>
        <Contrast size={18} style={{ color: 'var(--muted-foreground)' }} />
        <span className="flex-1 min-w-0">Alto contraste<span style={sub}>Textos y bordes más marcados</span></span>
        <Interruptor on={a.contraste} />
      </button>
      {!sinFoco && (
        <button type="button" role="switch" aria-checked={a.foco} onClick={() => cambiar({ foco: !a.foco })} style={fila}>
          <Scan size={18} style={{ color: 'var(--muted-foreground)' }} />
          <span className="flex-1 min-w-0">Resaltar foco<span style={sub}>Contorno al navegar con teclado</span></span>
          <Interruptor on={a.foco} />
        </button>
      )}
    </div>
  );
}
