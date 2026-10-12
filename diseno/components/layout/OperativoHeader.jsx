import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusBadge } from '../core/StatusBadge.jsx';

const ff = 'var(--font-family-primary)';
const btnBase = { display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, paddingBottom: 6, borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--button-font-family)', textTransform: 'var(--button-transform)', letterSpacing: 'var(--button-tracking)', cursor: 'pointer', transition: 'all .15s', lineHeight: 1.5 };

function HBtn({ icon, label, title, compacto, tone = 'muted', onClick, size, truncar }) {
  const [h, setH] = useState(false);
  const px = compacto ? 10 : 12;
  const tones = {
    muted: { background: h ? 'var(--border)' : 'var(--muted)', border: '1.5px solid ' + (h ? 'var(--muted-foreground)' : 'var(--border)'), color: 'var(--foreground)' },
    soft: { background: h ? 'color-mix(in srgb, var(--primary) 18%, transparent)' : 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)', color: 'var(--primary)' },
    primary: { background: 'var(--primary)', border: '1.5px solid var(--primary)', color: 'var(--primary-foreground)', opacity: h ? 0.88 : 1 },
    warn: { background: 'color-mix(in srgb, rgba(217,119,6,0.16) var(--tinte-oscuro, 0%), #fef3c7)', border: '1.5px solid color-mix(in srgb, rgba(217,119,6,0.6) var(--tinte-oscuro, 0%), #fcd34d)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)' },
  };
  return (
    <button type="button" title={title || label} aria-label={title || label} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ ...btnBase, paddingLeft: px, paddingRight: px, flexShrink: truncar ? 1 : 0, minWidth: truncar ? 0 : undefined, maxWidth: truncar ? 180 : undefined, ...tones[tone] }}>
      <Icon name={icon} size={size || (compacto ? 15 : 13)} style={{ flexShrink: 0 }} />
      {!compacto && <span style={truncar ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 } : { whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  );
}

export function OperativoHeader({ nombre, estado = 'activo', ubicacion, fechaInicio, dia = 1, clima, hasObjetivo = true, aCargo, compacto: compactoProp, defaultCompacto = false, onCompacto, onInfo, onPuestoComando, onObjetivo, onQR, onInforme }) {
  const [h, setH] = useState(false);
  const [c, setC] = useState(defaultCompacto);
  const compacto = compactoProp != null ? compactoProp : c;
  const alternar = () => { if (onCompacto) onCompacto(!compacto); if (compactoProp == null) setC(!compacto); };
  const [hc, setHc] = useState(false);
  const meta = { display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' };
  const soloLectura = estado === 'finalizado' || estado === 'eliminado';
  const sinMando = !aCargo && !soloLectura;
  return (
    <div style={{ flexShrink: 0, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'var(--card)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 0 var(--border)', fontFamily: ff }}>
      <div onClick={onInfo} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title="Ver información del operativo" style={{ minWidth: 0, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</h2>
          <StatusBadge estado={estado} size="sm" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={meta}><Icon name="map-pin" size={11} />{ubicacion}</span>
          <span style={meta}><Icon name="calendar" size={11} />Inicio: {fechaInicio}</span>
          <span style={{ ...meta, color: 'var(--primary)', opacity: h ? 1 : 0, transition: 'opacity .15s' }}>Ver detalles →</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        <button type="button" onClick={alternar} onMouseEnter={() => setHc(true)} onMouseLeave={() => setHc(false)} title={compacto ? 'Agrandar los botones' : 'Achicar los botones'} aria-label={compacto ? 'Agrandar los botones' : 'Achicar los botones'} aria-pressed={compacto}
          style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-button)', border: 'none', cursor: 'pointer', background: hc ? 'var(--muted)' : 'transparent', color: 'var(--muted-foreground)' }}>
          <Icon name="chevron-left" size={15} style={{ transform: compacto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        <HBtn icon="radio-tower" truncar compacto={compacto} tone={sinMando ? 'warn' : 'muted'} onClick={onPuestoComando}
          label={aCargo || 'Sin coordinador a cargo'} title={compacto ? 'Puesto de comando · ' + (aCargo ? 'a cargo: ' + aCargo : 'sin coordinador a cargo') : 'Puesto de comando: quién está presente y quién está a cargo'} />
        <HBtn icon="target" label="Objetivo" title="Ver / editar objetivo buscado" compacto={compacto} tone={hasObjetivo ? 'soft' : 'primary'} onClick={onObjetivo} />
        <HBtn icon="qr-code" label="QR Agentes" title="Código QR para registro de agentes" compacto={compacto} onClick={onQR} />
        <HBtn icon="file-text" label="Informe" title="Generar el informe del operativo" compacto={compacto} onClick={onInforme} />
        <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <Icon name="clock" size={compacto ? 14 : 12} color="var(--primary)" />
          <span title={compacto ? 'Día ' + dia + ' del operativo' : undefined} style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontWeight: 600 }}>{compacto ? dia : 'Día ' + dia}</span>
          {!compacto && <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>del operativo</span>}
        </div>
        {clima && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <Icon name="cloud" size={compacto ? 14 : 12} color="var(--muted-foreground)" />
          <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 600 }}>{clima.temperatura}°C</span>
          {!compacto && <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{clima.descripcion}</span>}
        </div>}
      </div>
    </div>
  );
}
