import React, { useState } from 'react';
import { Icon } from './Icon.jsx';

export function FiltroDesplegable({ titulo, opciones = [], seleccion = [], onCambiar, atajos = [] }) {
  const [open, setOpen] = useState(false);
  const n = seleccion.length;
  const igual = vals => vals.length === n && vals.every(v => seleccion.includes(v));
  const atajoActivo = atajos.find(a => igual(a.valores));
  const resumen = n === 0 ? null : atajoActivo ? atajoActivo.label : n === 1 ? (opciones.find(o => o.value === seleccion[0]) || {}).label : n + ' elegidos';
  const toggle = v => onCambiar && onCambiar(seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v]);
  const on = n > 0;
  const fila = { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)', fontSize: 12.5, color: 'var(--popover-foreground)' };
  const caja = sel => ({ width: 15, height: 15, borderRadius: 4, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: sel ? 'var(--primary)' : 'transparent', color: 'var(--primary-foreground)' });
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 12, lineHeight: 1.4, whiteSpace: 'nowrap',
        border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--card)', color: on ? 'var(--primary)' : 'var(--foreground)', fontWeight: on ? 600 : 500 }}>
        {titulo}{resumen && <span style={{ fontWeight: 600 }}>: {resumen}</span>}
        <Icon name="chevron-down" size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && <>
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41, minWidth: 230, padding: 6, background: 'var(--popover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}>
          {atajos.map(a => <button key={a.label} type="button" style={fila} onClick={() => onCambiar && onCambiar(a.valores)}>
            <span style={caja(igual(a.valores))}>{igual(a.valores) && <Icon name="check" size={10} strokeWidth={3} />}</span><span style={{ flex: 1, fontWeight: 600 }}>{a.label}</span>{a.count != null && <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{a.count}</span>}
          </button>)}
          {atajos.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />}
          {opciones.map(o => { const sel = seleccion.includes(o.value); return (
            <button key={o.value} type="button" style={fila} onClick={() => toggle(o.value)}>
              <span style={caja(sel)}>{sel && <Icon name="check" size={10} strokeWidth={3} />}</span>
              {o.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{o.label}</span>{o.count != null && <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{o.count}</span>}
            </button>); })}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
          <button type="button" style={{ ...fila, color: 'var(--muted-foreground)', fontSize: 12 }} onClick={() => onCambiar && onCambiar([])}>Mostrar todos</button>
        </div>
      </>}
    </div>
  );
}
