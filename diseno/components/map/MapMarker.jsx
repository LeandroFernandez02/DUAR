import React from 'react';
import { Icon } from '../core/Icon.jsx';

const cssVar = (n, f) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f; } catch (e) { return f; } };
const SCI = { color: '#2563eb', bg: '#dbeafe', sci: true };
export const TIPOS_MARCADOR = {
  puntoCero:     { get color() { return cssVar('--marker-punto-cero', '#E0662B'); }, label: 'Punto Cero', get bg() { return cssVar('--marker-punto-cero-bg', '#fee2e2'); }, icon: 'crosshair' },
  poi:           { color: '#ca8a04', label: 'Punto de Interés',  bg: '#fef9c3', icon: 'map-pin' },
  hallazgo:      { color: '#16a34a', label: 'Hallazgo',          bg: '#dcfce7', icon: 'triangle-alert' },
  puestoComando: { ...SCI, label: 'Puesto de Comando', icon: 'flag', glyph: 'PC' },
  base:          { ...SCI, label: 'Base', glyph: 'B' },
  campamento:    { ...SCI, label: 'Campamento', glyph: 'C' },
  helipunto:     { ...SCI, label: 'Helipunto', glyph: 'H' },
  espera:        { ...SCI, label: 'Área de Espera', glyph: 'E' },
  acv:           { ...SCI, label: 'Área de Concentración de Víctimas', glyph: 'ACV' },
};
export const TIPOS_SCI = ['puestoComando', 'base', 'campamento', 'helipunto', 'espera', 'acv'];

function Glyph({ c, size, icon }) {
  if (c.icon && (icon || !c.sci || c.glyph === 'PC')) return <Icon name={c.icon} size={icon} strokeWidth={2.4} />;
  const fs = c.glyph.length > 2 ? size * 0.3 : c.glyph.length > 1 ? size * 0.36 : size * 0.44;
  return <span style={{ fontSize: fs, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1 }}>{c.glyph}</span>;
}

export function MapMarker({ tipo = 'poi', label, selected, variant = 'pin' }) {
  const c = TIPOS_MARCADOR[tipo] || TIPOS_MARCADOR.poi;
  const ff = 'var(--font-family-primary)';
  if (variant === 'chip' || variant === 'mini') {
    const s = variant === 'mini' ? 16 : 32;
    const solid = variant === 'mini';
    return <span title={c.label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: s, height: s, borderRadius: c.sci ? (solid ? 4 : 8) : (solid ? '50%' : 8), background: solid ? c.color : c.bg, color: solid ? '#fff' : c.color, flexShrink: 0, fontFamily: ff }}>
      <Glyph c={c} size={s} icon={solid ? 9 : 13} />
    </span>;
  }
  const s = tipo === 'puntoCero' ? 34 : c.sci ? 30 : 28;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontFamily: ff }}>
      {tipo === 'puntoCero' && <span style={{ position: 'absolute', top: -6, left: '50%', width: s + 12, height: s + 12, marginLeft: -(s + 12) / 2, borderRadius: '50%', border: '2px solid ' + c.color, opacity: 0.35 }} />}
      <span style={{ width: s, height: s, borderRadius: c.sci ? 7 : '50%', background: c.color, color: '#fff', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: selected ? '0 0 0 3px ' + c.color + '55, 0 4px 12px rgba(0,0,0,.3)' : '0 2px 8px rgba(0,0,0,.3)', boxSizing: 'border-box' }}>
        <Glyph c={c} size={s} icon={tipo === 'puntoCero' ? 16 : 13} />
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid ' + c.color, marginTop: -1 }} />
      {label && <span style={{ marginTop: 3, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>}
    </div>
  );
}
