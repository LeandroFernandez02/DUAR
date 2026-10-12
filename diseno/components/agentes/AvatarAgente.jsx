import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function AvatarAgente({ esDuar, esConductor, esRecursoCritico, tamano = 40, iniciales }) {
  const t = esConductor ? { icon: 'truck', fondo: '#c026d3', titulo: 'Conductor' }
    : esRecursoCritico ? { icon: 'star', fondo: '#d97706', titulo: 'Recurso especial' }
    : { icon: 'footprints', fondo: esDuar ? 'var(--primary)' : 'var(--accent)', titulo: 'Agente de rastrillaje' + (esDuar ? ' · DUAR' : '') };
  return (
    <span title={t.titulo} style={{ width: tamano, height: tamano, borderRadius: '50%', background: t.fondo, color: t.fondo === 'var(--primary)' ? 'var(--primary-foreground)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-family-primary)', fontSize: Math.round(tamano * 0.34), fontWeight: 700 }}>
      {iniciales || <Icon name={t.icon} size={Math.round(tamano * 0.45)} />}
    </span>
  );
}
