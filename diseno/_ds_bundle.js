/* @ds-bundle: {"format":4,"namespace":"DUARDiseOMapa_7e942c","components":[{"name":"AvatarAgente","sourcePath":"components/agentes/AvatarAgente.jsx"},{"name":"ESTADOS_AGENTE","sourcePath":"components/agentes/EstadoAgenteBadge.jsx"},{"name":"EstadoAgenteBadge","sourcePath":"components/agentes/EstadoAgenteBadge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"FilterPill","sourcePath":"components/core/FilterPill.jsx"},{"name":"FiltroDesplegable","sourcePath":"components/core/FiltroDesplegable.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Modal","sourcePath":"components/core/Modal.jsx"},{"name":"SelectField","sourcePath":"components/core/SelectField.jsx"},{"name":"ESTADOS","sourcePath":"components/core/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/core/StatusBadge.jsx"},{"name":"TextField","sourcePath":"components/core/TextField.jsx"},{"name":"OperativoHeader","sourcePath":"components/layout/OperativoHeader.jsx"},{"name":"Sidebar","sourcePath":"components/layout/Sidebar.jsx"},{"name":"CoverageBar","sourcePath":"components/map/CoverageBar.jsx"},{"name":"ElementRow","sourcePath":"components/map/ElementRow.jsx"},{"name":"ElevationProfile","sourcePath":"components/map/ElevationProfile.jsx"},{"name":"LayerPanel","sourcePath":"components/map/LayerPanel.jsx"},{"name":"MapLegend","sourcePath":"components/map/MapLegend.jsx"},{"name":"TIPOS_MARCADOR","sourcePath":"components/map/MapMarker.jsx"},{"name":"TIPOS_SCI","sourcePath":"components/map/MapMarker.jsx"},{"name":"MapMarker","sourcePath":"components/map/MapMarker.jsx"},{"name":"MapPopup","sourcePath":"components/map/MapPopup.jsx"},{"name":"MapToolbar","sourcePath":"components/map/MapToolbar.jsx"},{"name":"TreeSection","sourcePath":"components/map/TreeSection.jsx"},{"name":"TreeRow","sourcePath":"components/map/TreeSection.jsx"}],"sourceHashes":{"components/agentes/AvatarAgente.jsx":"4eb883c16412","components/agentes/EstadoAgenteBadge.jsx":"af1edda31f48","components/core/Button.jsx":"14bf656b1b18","components/core/Card.jsx":"04035161d06e","components/core/FilterPill.jsx":"e6e3091d5310","components/core/FiltroDesplegable.jsx":"e3ec2abc630f","components/core/Icon.jsx":"7e380a35cda4","components/core/Modal.jsx":"deecb9ddffdb","components/core/SelectField.jsx":"6074e0075429","components/core/StatusBadge.jsx":"9de01659702d","components/core/TextField.jsx":"47ca54622a85","components/layout/OperativoHeader.jsx":"0e4816f3acfc","components/layout/Sidebar.jsx":"8b34a83605ba","components/map/CoverageBar.jsx":"a87045136cd8","components/map/ElementRow.jsx":"b80ca22b7832","components/map/ElevationProfile.jsx":"6e84fe3ad402","components/map/LayerPanel.jsx":"f1fc5709f9f4","components/map/MapLegend.jsx":"8ae9e79899cb","components/map/MapMarker.jsx":"b0b4e402c180","components/map/MapPopup.jsx":"8ef40f101bda","components/map/MapToolbar.jsx":"e2805356dfec","components/map/TreeSection.jsx":"4cb909925d0d","ui_kits/mapa-v1/AppV1.jsx":"89bbb2a4f7ce","ui_kits/mapa-v1/MapCanvasV1.jsx":"277e8ca5ab62","ui_kits/mapa-v1/ModalsV1.jsx":"4a5d17cbbf7a","ui_kits/mapa-v1/PanelsV1.jsx":"15a2150ef928","ui_kits/mapa-v1/data.js":"e92c1ddc8b90","ui_kits/mapa/App.jsx":"dfa298d6525b","ui_kits/mapa/LeftTree.jsx":"eeac8ae8af15","ui_kits/mapa/MapCanvas.jsx":"b6484072c84b","ui_kits/mapa/MapChrome.jsx":"8edfc5fe300f","ui_kits/mapa/Modals.jsx":"3dba52024d86","ui_kits/mapa/Panels.jsx":"e83817495a50","ui_kits/mapa/data.js":"85478fedd597","ui_kits/paleta.js":"425e22092516","ui_kits/sistema/AgentesModulo.jsx":"4ac648633cfb","ui_kits/sistema/Comunes.jsx":"d7bad581e68c","ui_kits/sistema/Operativos.jsx":"fab4fbce2aac","ui_kits/sistema/SistemaApp.jsx":"b0771b7a7e97","ui_kits/sistema/Usuarios.jsx":"e0590d288487","ui_kits/sistema/data.js":"43eafc0ec188","ui_kits/sistema/tweaks-panel.jsx":"d259e3a86f73"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DUARDiseOMapa_7e942c = window.DUARDiseOMapa_7e942c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/agentes/EstadoAgenteBadge.jsx
try { (() => {
const ESTADOS_AGENTE = {
  disponible: {
    label: 'Disponible',
    color: '#0d9488',
    dot: '#0d9488'
  },
  agrupado: {
    label: 'Agrupado',
    color: '#4f46e5',
    dot: '#4f46e5'
  },
  desplegado: {
    label: 'Desplegado',
    color: '#ca8a04',
    dot: '#ca8a04'
  },
  replegado: {
    label: 'Replegado',
    color: '#6b7280',
    dot: '#6b7280'
  },
  en_espera: {
    label: 'En espera',
    color: '#0891b2',
    dot: '#0891b2'
  },
  no_disponible: {
    label: 'No disponible',
    color: '#b91c1c',
    dot: '#b91c1c'
  }
};
function EstadoAgenteBadge({
  estado,
  size = 'sm'
}) {
  const c = ESTADOS_AGENTE[estado] || {
    label: estado,
    color: '#6b7280',
    dot: '#6b7280'
  };
  const xs = size === 'xs';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: xs ? '1px 7px' : '2px 9px',
      borderRadius: 999,
      fontFamily: 'var(--chip-font-family)',
      textTransform: 'var(--chip-transform)',
      letterSpacing: 'var(--chip-tracking)',
      fontSize: xs ? 10 : 11,
      fontWeight: 600,
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      color: 'color-mix(in srgb, color-mix(in srgb, ' + c.color + ' 62%, #fff) var(--tinte-oscuro, 0%), ' + c.color + ')',
      background: 'color-mix(in srgb, ' + c.color + ' calc(10% + var(--tinte-oscuro, 0%) * 0.05), transparent)',
      border: '1px solid color-mix(in srgb, ' + c.color + ' 30%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: xs ? 5 : 6,
      height: xs ? 5 : 6,
      borderRadius: '50%',
      background: c.dot
    }
  }), c.label);
}
Object.assign(__ds_scope, { ESTADOS_AGENTE, EstadoAgenteBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agentes/EstadoAgenteBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  padding = 20,
  elevated = true,
  dashed,
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: 'var(--card)',
      color: 'var(--card-foreground)',
      borderRadius: 'var(--radius-card)',
      boxShadow: elevated && !dashed ? 'var(--elevation-sm)' : 'none',
      border: dashed ? '1px dashed var(--border)' : '1px solid transparent',
      padding,
      fontFamily: 'var(--font-family-primary)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/FilterPill.jsx
try { (() => {
function FilterPill({
  children,
  count,
  selected,
  onClick,
  dot
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "radio",
    "aria-checked": !!selected,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      border: selected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
      background: selected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
      color: selected ? 'var(--primary)' : 'var(--muted-foreground)',
      fontSize: 11,
      fontFamily: 'var(--font-family-primary)',
      cursor: 'pointer',
      fontWeight: selected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
      lineHeight: 1.5
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: dot
    }
  }), children, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '0 5px',
      borderRadius: 999,
      background: selected ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--muted)'
    }
  }, count));
}
Object.assign(__ds_scope, { FilterPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FilterPill.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
/** Lucide icon (same set as the product: lucide-react 0.487). Needs the lucide UMD script on the page. */
function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  style
}) {
  const lib = typeof window !== 'undefined' ? window.lucide : null;
  const key = String(name || '').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  let node = lib && (lib.icons && lib.icons[key] || lib[key]);
  if (Array.isArray(node) && node[0] === 'svg') node = node[2];
  if (!Array.isArray(node)) return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    "aria-hidden": "true"
  }, node.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/agentes/AvatarAgente.jsx
try { (() => {
function AvatarAgente({
  esDuar,
  esConductor,
  esRecursoCritico,
  tamano = 40,
  iniciales
}) {
  const t = esConductor ? {
    icon: 'truck',
    fondo: '#c026d3',
    titulo: 'Conductor'
  } : esRecursoCritico ? {
    icon: 'star',
    fondo: '#d97706',
    titulo: 'Recurso especial'
  } : {
    icon: 'footprints',
    fondo: esDuar ? 'var(--primary)' : 'var(--accent)',
    titulo: 'Agente de rastrillaje' + (esDuar ? ' · DUAR' : '')
  };
  return /*#__PURE__*/React.createElement("span", {
    title: t.titulo,
    style: {
      width: tamano,
      height: tamano,
      borderRadius: '50%',
      background: t.fondo,
      color: t.fondo === 'var(--primary)' ? 'var(--primary-foreground)' : '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontFamily: 'var(--font-family-primary)',
      fontSize: Math.round(tamano * 0.34),
      fontWeight: 700
    }
  }, iniciales || /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: Math.round(tamano * 0.45)
  }));
}
Object.assign(__ds_scope, { AvatarAgente });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agentes/AvatarAgente.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const {
  useState
} = React;
const V = {
  primary: {
    bg: 'var(--primary)',
    fg: 'var(--primary-foreground)',
    bd: 'var(--boton-primario-borde, var(--primary))',
    bw: 'var(--boton-primario-borde-ancho, 1.5px)',
    hover: {
      opacity: 0.88
    }
  },
  soft: {
    bg: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    fg: 'var(--primary)',
    bd: 'color-mix(in srgb, var(--primary) 35%, transparent)',
    hover: {
      background: 'color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  },
  muted: {
    bg: 'var(--muted)',
    fg: 'var(--foreground)',
    bd: 'var(--border)',
    hover: {
      background: 'var(--border)',
      borderColor: 'var(--muted-foreground)'
    }
  },
  outline: {
    bg: 'var(--card)',
    fg: 'var(--foreground)',
    bd: 'var(--border)',
    hover: {
      borderColor: 'var(--foreground)'
    }
  },
  ghost: {
    bg: 'transparent',
    fg: 'var(--muted-foreground)',
    bd: 'transparent',
    hover: {
      color: 'var(--foreground)',
      background: 'var(--muted)'
    }
  },
  danger: {
    bg: '#dc2626',
    fg: '#fff',
    bd: '#dc2626',
    hover: {
      opacity: 0.88
    }
  }
};
function Button({
  variant = 'primary',
  size = 'sm',
  icon,
  iconRight,
  children,
  disabled,
  fullWidth,
  onClick,
  title,
  type = 'button',
  style
}) {
  const [h, setH] = useState(false);
  const v = V[variant] || V.primary;
  const pad = size === 'md' ? '8px 16px' : size === 'lg' ? '10px 16px' : '6px 12px';
  const fs = size === 'lg' ? 'var(--text-base)' : 'var(--text-label)';
  const off = !!disabled;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    title: title,
    disabled: off,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: pad,
      borderRadius: 'var(--radius-button)',
      border: (v.bw || '1.5px') + ' solid ' + (off ? 'var(--border)' : v.bd),
      background: off ? 'var(--muted)' : v.bg,
      color: off ? 'var(--muted-foreground)' : v.fg,
      fontFamily: 'var(--button-font-family)',
      textTransform: 'var(--button-transform)',
      letterSpacing: 'var(--button-tracking)',
      fontSize: fs,
      fontWeight: 'var(--font-weight-semibold)',
      lineHeight: 1.5,
      cursor: off ? 'not-allowed' : 'pointer',
      opacity: off ? 0.55 : 1,
      transition: 'all .15s ease',
      width: fullWidth ? '100%' : undefined,
      whiteSpace: 'nowrap',
      ...(h && !off ? v.hover : null),
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: 13
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/FiltroDesplegable.jsx
try { (() => {
const {
  useState
} = React;
function FiltroDesplegable({
  titulo,
  opciones = [],
  seleccion = [],
  onCambiar,
  atajos = []
}) {
  const [open, setOpen] = useState(false);
  const n = seleccion.length;
  const igual = vals => vals.length === n && vals.every(v => seleccion.includes(v));
  const atajoActivo = atajos.find(a => igual(a.valores));
  const resumen = n === 0 ? null : atajoActivo ? atajoActivo.label : n === 1 ? (opciones.find(o => o.value === seleccion[0]) || {}).label : n + ' elegidos';
  const toggle = v => onCambiar && onCambiar(seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v]);
  const on = n > 0;
  const fila = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '7px 10px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-family-primary)',
    fontSize: 12.5,
    color: 'var(--popover-foreground)'
  };
  const caja = sel => ({
    width: 15,
    height: 15,
    borderRadius: 4,
    flexShrink: 0,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
    background: sel ? 'var(--primary)' : 'transparent',
    color: 'var(--primary-foreground)'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    "aria-expanded": open,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 10px',
      borderRadius: 999,
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
      background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--card)',
      color: on ? 'var(--primary)' : 'var(--foreground)',
      fontWeight: on ? 600 : 500
    }
  }, titulo, resumen && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, ": ", resumen), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 13,
    style: {
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform .15s'
    }
  })), open && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(false),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      zIndex: 41,
      minWidth: 230,
      padding: 6,
      background: 'var(--popover)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)'
    }
  }, atajos.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.label,
    type: "button",
    style: fila,
    onClick: () => onCambiar && onCambiar(a.valores)
  }, /*#__PURE__*/React.createElement("span", {
    style: caja(igual(a.valores))
  }, igual(a.valores) && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 10,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontWeight: 600
    }
  }, a.label), a.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, a.count))), atajos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border)',
      margin: '4px 6px'
    }
  }), opciones.map(o => {
    const sel = seleccion.includes(o.value);
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      style: fila,
      onClick: () => toggle(o.value)
    }, /*#__PURE__*/React.createElement("span", {
      style: caja(sel)
    }, sel && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 10,
      strokeWidth: 3
    })), o.dot && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: o.dot,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, o.label), o.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--muted-foreground)'
      }
    }, o.count));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border)',
      margin: '4px 6px'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...fila,
      color: 'var(--muted-foreground)',
      fontSize: 12
    },
    onClick: () => onCambiar && onCambiar([])
  }, "Mostrar todos"))));
}
Object.assign(__ds_scope, { FiltroDesplegable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FiltroDesplegable.jsx", error: String((e && e.message) || e) }); }

// components/core/Modal.jsx
try { (() => {
function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  width = 520,
  open = true
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'min(92vw, ' + width + 'px)',
      maxHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--card)',
      color: 'var(--card-foreground)',
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      padding: '18px 20px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      minWidth: 0
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h3)',
      fontWeight: 'var(--font-weight-semibold)',
      lineHeight: 1.4
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-label)',
      color: 'var(--muted-foreground)'
    }
  }, subtitle))), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      overflowY: 'auto',
      overflowX: 'hidden',
      flex: 1
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
      padding: '14px 20px',
      borderTop: '1px solid var(--border)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Modal.jsx", error: String((e && e.message) || e) }); }

// components/core/SelectField.jsx
try { (() => {
function SelectField({
  label,
  value,
  onChange,
  options = [],
  required,
  overline,
  disabled,
  style
}) {
  const lab = overline ? {
    color: 'var(--muted-foreground)',
    fontSize: 11,
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-label)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  } : {
    color: 'var(--foreground)',
    fontSize: 'var(--text-label)',
    fontWeight: 'var(--font-weight-semibold)'
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-family-primary)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      ...lab,
      lineHeight: 1.5
    }
  }, label, required ? ' *' : ''), /*#__PURE__*/React.createElement("select", {
    value: value,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.value),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '8px 10px',
      borderRadius: 'var(--radius-input)',
      outline: 'none',
      background: 'var(--input-background)',
      border: '1px solid var(--border)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--text-base)',
      lineHeight: 1.5,
      opacity: disabled ? 0.55 : 1
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))));
}
Object.assign(__ds_scope, { SelectField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SelectField.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusBadge.jsx
try { (() => {
const ESTADOS = {
  activo: {
    label: 'Activo',
    bg: '#dcfce7',
    text: '#15803d',
    dot: '#16a34a'
  },
  inactivo: {
    label: 'Inactivo',
    bg: '#fee2e2',
    text: '#b91c1c',
    dot: '#dc2626'
  },
  'planificación': {
    label: 'En Planificación',
    bg: '#fef9c3',
    text: '#a16207',
    dot: '#ca8a04'
  },
  nuevo: {
    label: 'Nuevo',
    bg: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    text: 'var(--foreground)',
    dot: 'var(--accent)'
  },
  en_proceso: {
    label: 'En Proceso',
    bg: '#dbeafe',
    text: '#1d4ed8',
    dot: '#2563eb'
  },
  finalizado: {
    label: 'Finalizado',
    bg: '#e5e7eb',
    text: '#374151',
    dot: '#6b7280'
  },
  eliminado: {
    label: 'Eliminado',
    bg: '#fce7f3',
    text: '#9d174d',
    dot: '#be185d'
  },
  rastrillando: {
    label: 'Rastrillando',
    bg: '#dcfce7',
    text: '#15803d',
    dot: '#16a34a'
  },
  en_formacion: {
    label: 'En Formación',
    bg: '#f3f4f6',
    text: '#4b5563',
    dot: '#9ca3af'
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'rgba(79,70,229,0.12)',
    text: '#4338ca',
    dot: '#4f46e5'
  },
  asignado: {
    label: 'Asignado',
    bg: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    text: 'var(--accent-strong)',
    dot: 'var(--accent)'
  },
  desplegado: {
    label: 'Desplegado',
    bg: '#fef3c7',
    text: '#92400e',
    dot: '#d97706'
  },
  replegado: {
    label: 'Replegado',
    bg: '#e5e7eb',
    text: '#374151',
    dot: '#6b7280'
  },
  en_espera: {
    label: 'En Espera',
    bg: 'rgba(8,145,178,0.12)',
    text: '#0e7490',
    dot: '#0891b2'
  },
  disuelto: {
    label: 'Disuelto',
    bg: '#fce7f3',
    text: '#9d174d',
    dot: '#be185d'
  },
  pendiente: {
    label: 'Pendiente',
    bg: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    text: 'var(--accent-strong)',
    dot: 'var(--accent)'
  },
  completado: {
    label: 'Completado',
    bg: '#dcfce7',
    text: '#15803d',
    dot: '#16a34a'
  }
};
function StatusBadge({
  estado,
  size = 'md',
  label
}) {
  const c = ESTADOS[estado] || {
    label: estado,
    bg: '#f3f4f6',
    text: '#374151',
    dot: '#9ca3af'
  };
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: sm ? '2px 8px' : '3px 10px',
      borderRadius: 999,
      fontSize: sm ? 10 : 11,
      fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--chip-font-family)',
      textTransform: 'var(--chip-transform)',
      letterSpacing: 'var(--chip-tracking)',
      background: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 15%, transparent) var(--tinte-oscuro, 0%), ${c.bg})`,
      color: `color-mix(in srgb, color-mix(in srgb, ${c.dot} 62%, #fff) var(--tinte-oscuro, 0%), ${c.text})`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.dot} calc(var(--tinte-oscuro, 0%) * 0.6), transparent)`,
      whiteSpace: 'nowrap',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: sm ? 5 : 6,
      height: sm ? 5 : 6,
      borderRadius: '50%',
      background: c.dot,
      flexShrink: 0
    }
  }), label || c.label);
}
Object.assign(__ds_scope, { ESTADOS, StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/TextField.jsx
try { (() => {
function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 4,
  required,
  overline,
  type = 'text',
  readOnly,
  style
}) {
  const box = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    borderRadius: 'var(--radius-input)',
    outline: 'none',
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)',
    fontSize: 'var(--text-base)',
    lineHeight: multiline ? 1.55 : 1.5,
    resize: 'none'
  };
  const lab = overline ? {
    color: 'var(--muted-foreground)',
    fontSize: 11,
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-label)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  } : {
    color: 'var(--foreground)',
    fontSize: 'var(--text-label)',
    fontWeight: 'var(--font-weight-semibold)'
  };
  const h = e => onChange && onChange(e.target.value);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-family-primary)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      ...lab,
      lineHeight: 1.5
    }
  }, label, required ? ' *' : ''), multiline ? /*#__PURE__*/React.createElement("textarea", {
    rows: rows,
    value: value,
    onChange: h,
    placeholder: placeholder,
    readOnly: readOnly,
    style: box
  }) : /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: h,
    placeholder: placeholder,
    readOnly: readOnly,
    style: box
  }));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextField.jsx", error: String((e && e.message) || e) }); }

// components/layout/OperativoHeader.jsx
try { (() => {
const {
  useState
} = React;
const ff = 'var(--font-family-primary)';
const btnBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  paddingTop: 6,
  paddingBottom: 6,
  borderRadius: 'var(--radius-button)',
  fontSize: 'var(--text-label)',
  fontWeight: 'var(--font-weight-semibold)',
  fontFamily: 'var(--button-font-family)',
  textTransform: 'var(--button-transform)',
  letterSpacing: 'var(--button-tracking)',
  cursor: 'pointer',
  transition: 'all .15s',
  lineHeight: 1.5
};
function HBtn({
  icon,
  label,
  title,
  compacto,
  tone = 'muted',
  onClick,
  size,
  truncar
}) {
  const [h, setH] = useState(false);
  const px = compacto ? 10 : 12;
  const tones = {
    muted: {
      background: h ? 'var(--border)' : 'var(--muted)',
      border: '1.5px solid ' + (h ? 'var(--muted-foreground)' : 'var(--border)'),
      color: 'var(--foreground)'
    },
    soft: {
      background: h ? 'color-mix(in srgb, var(--primary) 18%, transparent)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
      border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)',
      color: 'var(--primary)'
    },
    primary: {
      background: 'var(--primary)',
      border: '1.5px solid var(--primary)',
      color: 'var(--primary-foreground)',
      opacity: h ? 0.88 : 1
    },
    warn: {
      background: 'color-mix(in srgb, rgba(217,119,6,0.16) var(--tinte-oscuro, 0%), #fef3c7)',
      border: '1.5px solid color-mix(in srgb, rgba(217,119,6,0.6) var(--tinte-oscuro, 0%), #fcd34d)',
      color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: title || label,
    "aria-label": title || label,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      ...btnBase,
      paddingLeft: px,
      paddingRight: px,
      flexShrink: truncar ? 1 : 0,
      minWidth: truncar ? 0 : undefined,
      maxWidth: truncar ? 180 : undefined,
      ...tones[tone]
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size || (compacto ? 15 : 13),
    style: {
      flexShrink: 0
    }
  }), !compacto && /*#__PURE__*/React.createElement("span", {
    style: truncar ? {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      minWidth: 0
    } : {
      whiteSpace: 'nowrap'
    }
  }, label));
}
function OperativoHeader({
  nombre,
  estado = 'activo',
  ubicacion,
  fechaInicio,
  dia = 1,
  clima,
  hasObjetivo = true,
  aCargo,
  compacto: compactoProp,
  defaultCompacto = false,
  onCompacto,
  onInfo,
  onPuestoComando,
  onObjetivo,
  onQR,
  onInforme
}) {
  const [h, setH] = useState(false);
  const [c, setC] = useState(defaultCompacto);
  const compacto = compactoProp != null ? compactoProp : c;
  const alternar = () => {
    if (onCompacto) onCompacto(!compacto);
    if (compactoProp == null) setC(!compacto);
  };
  const [hc, setHc] = useState(false);
  const meta = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--muted-foreground)',
    fontSize: 'var(--text-label)'
  };
  const soloLectura = estado === 'finalizado' || estado === 'eliminado';
  const sinMando = !aCargo && !soloLectura;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 0 var(--border)',
      fontFamily: ff
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onInfo,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    title: "Ver informaci\xF3n del operativo",
    style: {
      minWidth: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h3)',
      fontWeight: 600,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, nombre), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    estado: estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 11
  }), ubicacion), /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 11
  }), "Inicio: ", fechaInicio), /*#__PURE__*/React.createElement("span", {
    style: {
      ...meta,
      color: 'var(--primary)',
      opacity: h ? 1 : 0,
      transition: 'opacity .15s'
    }
  }, "Ver detalles \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: alternar,
    onMouseEnter: () => setHc(true),
    onMouseLeave: () => setHc(false),
    title: compacto ? 'Agrandar los botones' : 'Achicar los botones',
    "aria-label": compacto ? 'Agrandar los botones' : 'Achicar los botones',
    "aria-pressed": compacto,
    style: {
      width: 30,
      height: 30,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-button)',
      border: 'none',
      cursor: 'pointer',
      background: hc ? 'var(--muted)' : 'transparent',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    size: 15,
    style: {
      transform: compacto ? 'rotate(180deg)' : 'none',
      transition: 'transform .2s'
    }
  })), /*#__PURE__*/React.createElement(HBtn, {
    icon: "radio-tower",
    truncar: true,
    compacto: compacto,
    tone: sinMando ? 'warn' : 'muted',
    onClick: onPuestoComando,
    label: aCargo || 'Sin coordinador a cargo',
    title: compacto ? 'Puesto de comando · ' + (aCargo ? 'a cargo: ' + aCargo : 'sin coordinador a cargo') : 'Puesto de comando: quién está presente y quién está a cargo'
  }), /*#__PURE__*/React.createElement(HBtn, {
    icon: "target",
    label: "Objetivo",
    title: "Ver / editar objetivo buscado",
    compacto: compacto,
    tone: hasObjetivo ? 'soft' : 'primary',
    onClick: onObjetivo
  }), /*#__PURE__*/React.createElement(HBtn, {
    icon: "qr-code",
    label: "QR Agentes",
    title: "C\xF3digo QR para registro de agentes",
    compacto: compacto,
    onClick: onQR
  }), /*#__PURE__*/React.createElement(HBtn, {
    icon: "file-text",
    label: "Informe",
    title: "Generar el informe del operativo",
    compacto: compacto,
    onClick: onInforme
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 28,
      background: 'var(--border)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
      flexShrink: 0,
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: compacto ? 14 : 12,
    color: "var(--primary)"
  }), /*#__PURE__*/React.createElement("span", {
    title: compacto ? 'Día ' + dia + ' del operativo' : undefined,
    style: {
      color: 'var(--primary)',
      fontSize: 'var(--text-label)',
      fontWeight: 600
    }
  }, compacto ? dia : 'Día ' + dia), !compacto && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)',
      fontSize: 11
    }
  }, "del operativo")), clima && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--muted)',
      flexShrink: 0,
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "cloud",
    size: compacto ? 14 : 12,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--foreground)',
      fontSize: 'var(--text-label)',
      fontWeight: 600
    }
  }, clima.temperatura, "\xB0C"), !compacto && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)',
      fontSize: 11
    }
  }, clima.descripcion))));
}
Object.assign(__ds_scope, { OperativoHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/OperativoHeader.jsx", error: String((e && e.message) || e) }); }

// components/layout/Sidebar.jsx
try { (() => {
const {
  useState
} = React;
function NavBtn({
  icon,
  label,
  active,
  collapsed,
  onClick,
  dim = 0.75,
  iconSize = 18,
  bg
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: label,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      justifyContent: collapsed ? 'center' : 'flex-start',
      textAlign: 'left',
      background: active ? 'var(--sidebar-activo, var(--primary))' : h ? 'var(--sidebar-accent)' : bg || 'transparent',
      color: active ? 'var(--sidebar-texto-activo, var(--primary-foreground))' : 'var(--sidebar-foreground)',
      opacity: active || h ? 1 : 'var(--sidebar-dim, ' + dim + ')',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--font-weight-medium)',
      transition: 'all .2s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: active ? 1 : 0.7,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize
  })), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      color: active ? undefined : 'var(--sidebar-texto, inherit)'
    }
  }, label));
}
function Sidebar({
  items = [],
  context = 'operativo',
  user,
  isDark,
  onToggleDark,
  onNavigate,
  onBack,
  onLogout,
  defaultCollapsed = false
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [menu, setMenu] = useState(false);
  const [hl, setHl] = useState(false);
  const ini = user ? (user.nombre[0] + user.apellido[0]).toUpperCase() : '??';
  const sb = {
    borderColor: 'var(--sidebar-border)'
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: collapsed ? 80 : 260,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sidebar)',
      color: 'var(--sidebar-foreground)',
      fontFamily: 'var(--font-family-primary)',
      transition: 'width .2s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: collapsed ? '20px 8px' : '20px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderBottom: '1px solid',
      ...sb
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": "Sistema Integral de B\xFAsqueda y Rescate",
    className: "duar-logo-escudo",
    style: {
      width: 34,
      height: 44,
      flexShrink: 0
    }
  }), !collapsed && /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      opacity: 'var(--sidebar-dim, 0.7)',
      lineHeight: 1.3
    }
  }, "Sistema Integral de"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 700,
      lineHeight: 1.25
    }
  }, "B\xFAsqueda y Rescate"))), context === 'operativo' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 12px 0'
    }
  }, /*#__PURE__*/React.createElement(NavBtn, {
    icon: "chevron-left",
    label: "Volver a Operativos",
    collapsed: collapsed,
    onClick: onBack,
    bg: "var(--sidebar-accent)",
    iconSize: 15,
    dim: 0.7
  })), !collapsed && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: '20px 20px 4px',
      fontSize: 10,
      fontWeight: 600,
      opacity: 'var(--sidebar-dim-titulo, 0.4)',
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, context === 'operativo' ? 'Módulos' : 'Navegación'), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: '8px 12px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflowY: 'auto'
    }
  }, items.map(it => /*#__PURE__*/React.createElement(NavBtn, {
    key: it.label,
    icon: it.icon,
    label: it.label,
    active: it.active,
    collapsed: collapsed,
    onClick: () => onNavigate && onNavigate(it)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderTop: '1px solid',
      ...sb
    }
  }, /*#__PURE__*/React.createElement(NavBtn, {
    icon: collapsed ? 'panel-left-open' : 'panel-left-close',
    label: "Colapsar men\xFA",
    collapsed: collapsed,
    onClick: () => setCollapsed(c => !c),
    iconSize: 16,
    dim: 0.7
  }), /*#__PURE__*/React.createElement(NavBtn, {
    icon: isDark ? 'sun' : 'moon',
    label: isDark ? 'Modo Claro' : 'Modo Oscuro',
    collapsed: collapsed,
    onClick: onToggleDark,
    iconSize: 16,
    dim: 0.7
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: 4
    }
  }, menu && /*#__PURE__*/React.createElement("div", {
    onClick: () => setMenu(false),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 45
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMenu(m => !m),
    title: user ? user.nombre + ' ' + user.apellido : 'Cuenta',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      background: 'var(--sidebar-accent)',
      justifyContent: collapsed ? 'center' : 'flex-start',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--primary)',
      color: 'var(--sidebar-texto-activo, var(--primary-foreground))',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, ini), !collapsed && user && /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      color: 'var(--sidebar-texto, var(--sidebar-foreground))',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, user.nombre, " ", user.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10,
      opacity: 'var(--sidebar-dim, 0.55)',
      color: 'var(--sidebar-texto, var(--sidebar-foreground))',
      textTransform: 'capitalize'
    }
  }, user.rol))), menu && /*#__PURE__*/React.createElement("div", {
    role: "menu",
    style: {
      position: 'absolute',
      zIndex: 50,
      left: 0,
      bottom: 'calc(100% + 8px)',
      width: 230,
      background: 'var(--popover)',
      color: 'var(--popover-foreground)',
      boxShadow: 'var(--elevation-md)',
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, user ? user.nombre + ' ' + user.apellido : 'Usuario'), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 11,
      opacity: 0.6,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, user && user.email)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "menuitem",
    onClick: () => {
      setMenu(false);
      onLogout && onLogout();
    },
    onMouseEnter: () => setHl(true),
    onMouseLeave: () => setHl(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--text-base)',
      background: hl ? 'color-mix(in srgb, var(--destructive) 12%, transparent)' : 'none',
      color: hl ? 'var(--destructive)' : 'var(--popover-foreground)',
      opacity: hl ? 1 : 0.85
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "log-out",
    size: 15
  }), "Cerrar sesi\xF3n"))))));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/map/CoverageBar.jsx
try { (() => {
function CoverageBar({
  value = 0,
  label = 'Cobertura',
  showValue = true,
  height = 8,
  color
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const c = color || (v >= 75 ? '#16a34a' : v >= 40 ? '#ca8a04' : '#dc2626');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-family-primary)'
    }
  }, (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)',
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-h3)',
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, v, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      borderRadius: 999,
      background: 'var(--muted)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: v + '%',
      height: '100%',
      borderRadius: 999,
      background: c,
      transition: 'width .6s ease'
    }
  })));
}
Object.assign(__ds_scope, { CoverageBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/CoverageBar.jsx", error: String((e && e.message) || e) }); }

// components/map/ElementRow.jsx
try { (() => {
const {
  useState
} = React;
function ElementRow({
  color = '#E0662B',
  icon = 'pentagon',
  title,
  meta,
  estado,
  selected,
  visible = true,
  onClick,
  onToggleVisible,
  right
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 10px',
      borderRadius: 'var(--radius-input)',
      cursor: 'pointer',
      background: selected ? 'color-mix(in srgb, var(--primary) 7%, transparent)' : h ? 'var(--muted)' : 'transparent',
      border: selected ? '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' : '1px solid transparent',
      fontFamily: 'var(--font-family-primary)',
      opacity: visible ? 1 : 0.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color + '1f',
      color
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: 1.3
    }
  }, title), meta && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '1px 0 0',
      fontSize: 11,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: 1.35
    }
  }, meta)), estado && /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    estado: estado,
    size: "sm"
  }), right, onToggleVisible && /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: visible ? 'Ocultar' : 'Mostrar',
    onClick: e => {
      e.stopPropagation();
      onToggleVisible();
    },
    style: {
      background: 'none',
      border: 'none',
      padding: 3,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: visible ? 'eye' : 'eye-off',
    size: 14
  })));
}
Object.assign(__ds_scope, { ElementRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/ElementRow.jsx", error: String((e && e.message) || e) }); }

// components/map/ElevationProfile.jsx
try { (() => {
function ElevationProfile({
  values = [],
  distances,
  color = '#E0662B',
  height = 64,
  width = 272
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const dmax = distances ? distances[distances.length - 1] || 1 : values.length - 1;
  const x = i => (distances ? distances[i] / dmax : i / (values.length - 1)) * width;
  const y = v => 6 + (1 - (v - min) / span) * (height - 12);
  const line = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
  const km = n => (n / 1000).toLocaleString('es-AR', {
    maximumFractionDigits: 1
  }) + ' km';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: '0 0 ' + width + ' ' + height,
    preserveAspectRatio: "none",
    style: {
      display: 'block',
      height,
      borderRadius: 'var(--radius-md)',
      background: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: line + 'L' + width + ',' + height + 'L0,' + height + 'Z',
    fill: color,
    fillOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    vectorEffect: "non-scaling-stroke",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 4,
      fontSize: 10,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-family-mono)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "0 km"), /*#__PURE__*/React.createElement("span", null, Math.round(min).toLocaleString('es-AR'), "\u2013", Math.round(max).toLocaleString('es-AR'), " m"), /*#__PURE__*/React.createElement("span", null, distances ? km(dmax) : '')));
}
Object.assign(__ds_scope, { ElevationProfile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/ElevationProfile.jsx", error: String((e && e.message) || e) }); }

// components/map/LayerPanel.jsx
try { (() => {
function LayerPanel({
  bases = [],
  base,
  onBase,
  overlays = [],
  onToggle,
  onClose
}) {
  const over = {
    color: 'var(--muted-foreground)',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-label)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 8px'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 260,
      background: 'var(--card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--elevation-md)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-family-primary)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "layers",
    size: 15,
    color: "var(--primary)"
  }), "Capas del mapa"), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex',
      padding: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: over
  }, "Mapa base"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + Math.max(bases.length, 1) + ', 1fr)',
      gap: 6,
      marginBottom: 16
    }
  }, bases.map(b => {
    const sel = b.id === base;
    return /*#__PURE__*/React.createElement("button", {
      key: b.id,
      type: "button",
      onClick: () => onBase && onBase(b.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: '8px 4px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
        background: sel ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
        color: sel ? 'var(--primary)' : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 11,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: b.icon || 'map',
      size: 16
    }), b.label);
  })), /*#__PURE__*/React.createElement("p", {
    style: over
  }, "Elementos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, overlays.map(o => /*#__PURE__*/React.createElement("label", {
    key: o.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 6px',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      fontSize: 'var(--text-label)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!o.checked,
    onChange: () => onToggle && onToggle(o.id),
    style: {
      accentColor: 'var(--primary)',
      width: 14,
      height: 14,
      margin: 0
    }
  }), o.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: o.icon,
    size: 13,
    color: o.color || 'var(--muted-foreground)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, o.label), o.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--muted-foreground)',
      padding: '0 6px',
      borderRadius: 999,
      background: 'var(--muted)'
    }
  }, o.count))))));
}
Object.assign(__ds_scope, { LayerPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/LayerPanel.jsx", error: String((e && e.message) || e) }); }

// components/map/MapMarker.jsx
try { (() => {
const cssVar = (n, f) => {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  } catch (e) {
    return f;
  }
};
const SCI = {
  color: '#2563eb',
  bg: '#dbeafe',
  sci: true
};
const TIPOS_MARCADOR = {
  puntoCero: {
    get color() {
      return cssVar('--marker-punto-cero', '#E0662B');
    },
    label: 'Punto Cero',
    get bg() {
      return cssVar('--marker-punto-cero-bg', '#fee2e2');
    },
    icon: 'crosshair'
  },
  poi: {
    color: '#ca8a04',
    label: 'Punto de Interés',
    bg: '#fef9c3',
    icon: 'map-pin'
  },
  hallazgo: {
    color: '#16a34a',
    label: 'Hallazgo',
    bg: '#dcfce7',
    icon: 'triangle-alert'
  },
  puestoComando: {
    ...SCI,
    label: 'Puesto de Comando',
    icon: 'flag',
    glyph: 'PC'
  },
  base: {
    ...SCI,
    label: 'Base',
    glyph: 'B'
  },
  campamento: {
    ...SCI,
    label: 'Campamento',
    glyph: 'C'
  },
  helipunto: {
    ...SCI,
    label: 'Helipunto',
    glyph: 'H'
  },
  espera: {
    ...SCI,
    label: 'Área de Espera',
    glyph: 'E'
  },
  acv: {
    ...SCI,
    label: 'Área de Concentración de Víctimas',
    glyph: 'ACV'
  }
};
const TIPOS_SCI = ['puestoComando', 'base', 'campamento', 'helipunto', 'espera', 'acv'];
function Glyph({
  c,
  size,
  icon
}) {
  if (c.icon && (icon || !c.sci || c.glyph === 'PC')) return /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: c.icon,
    size: icon,
    strokeWidth: 2.4
  });
  const fs = c.glyph.length > 2 ? size * 0.3 : c.glyph.length > 1 ? size * 0.36 : size * 0.44;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: fs,
      fontWeight: 800,
      letterSpacing: '0.02em',
      lineHeight: 1
    }
  }, c.glyph);
}
function MapMarker({
  tipo = 'poi',
  label,
  selected,
  variant = 'pin'
}) {
  const c = TIPOS_MARCADOR[tipo] || TIPOS_MARCADOR.poi;
  const ff = 'var(--font-family-primary)';
  if (variant === 'chip' || variant === 'mini') {
    const s = variant === 'mini' ? 16 : 32;
    const solid = variant === 'mini';
    return /*#__PURE__*/React.createElement("span", {
      title: c.label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        height: s,
        borderRadius: c.sci ? solid ? 4 : 8 : solid ? '50%' : 8,
        background: solid ? c.color : c.bg,
        color: solid ? '#fff' : c.color,
        flexShrink: 0,
        fontFamily: ff
      }
    }, /*#__PURE__*/React.createElement(Glyph, {
      c: c,
      size: s,
      icon: solid ? 9 : 13
    }));
  }
  const s = tipo === 'puntoCero' ? 34 : c.sci ? 30 : 28;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: ff
    }
  }, tipo === 'puntoCero' && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -6,
      left: '50%',
      width: s + 12,
      height: s + 12,
      marginLeft: -(s + 12) / 2,
      borderRadius: '50%',
      border: '2px solid ' + c.color,
      opacity: 0.35
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: s,
      height: s,
      borderRadius: c.sci ? 7 : '50%',
      background: c.color,
      color: '#fff',
      border: '2.5px solid #fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: selected ? '0 0 0 3px ' + c.color + '55, 0 4px 12px rgba(0,0,0,.3)' : '0 2px 8px rgba(0,0,0,.3)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(Glyph, {
    c: c,
    size: s,
    icon: tipo === 'puntoCero' ? 16 : 13
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 0,
      height: 0,
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: '7px solid ' + c.color,
      marginTop: -1
    }
  }), label && /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 3,
      padding: '1px 6px',
      borderRadius: 4,
      background: 'rgba(0,0,0,.6)',
      color: '#fff',
      fontSize: 10,
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }
  }, label));
}
Object.assign(__ds_scope, { TIPOS_MARCADOR, TIPOS_SCI, MapMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapMarker.jsx", error: String((e && e.message) || e) }); }

// components/map/MapLegend.jsx
try { (() => {
const {
  useState
} = React;
function Sw({
  it
}) {
  const b = {
    flexShrink: 0,
    boxSizing: 'border-box'
  };
  if (it.kind === 'line') return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 18,
      height: 3,
      borderRadius: 2,
      background: it.color
    }
  });
  if (it.kind === 'area') return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 16,
      height: 11,
      borderRadius: 3,
      background: it.color + '40',
      border: '1.5px solid ' + it.color
    }
  });
  if (it.kind === 'areaDashed') return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 16,
      height: 11,
      borderRadius: 3,
      background: it.color + '22',
      border: '1.5px dashed ' + it.color
    }
  });
  if (it.kind === 'ring') return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: it.color + '1a',
      border: '1.5px solid ' + it.color
    }
  });
  if (it.kind === 'gap') return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 16,
      height: 11,
      borderRadius: 2,
      background: 'rgba(220,38,38,0.38)'
    }
  });
  if (it.kind === 'marker') return /*#__PURE__*/React.createElement(__ds_scope.MapMarker, {
    tipo: it.tipo,
    variant: "mini"
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...b,
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: it.color
    }
  });
}
function MapLegend({
  title = 'Simbología táctica',
  items = [],
  defaultOpen = true,
  width = 220
}) {
  const [o, setO] = useState(defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      background: 'var(--card)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setO(!o),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '8px 12px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: o ? 'chevron-down' : 'chevron-up',
    size: 14,
    color: "var(--muted-foreground)"
  })), o && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '2px 12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      fontSize: 11.5,
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Sw, {
    it: it
  })), it.label))));
}
Object.assign(__ds_scope, { MapLegend });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapLegend.jsx", error: String((e && e.message) || e) }); }

// components/map/MapPopup.jsx
try { (() => {
function MapPopup({
  icon,
  chip,
  color = '#444140',
  bg,
  kicker,
  title,
  subtitle,
  centrado,
  onClose,
  children,
  actions,
  width = 300
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      fontFamily: 'var(--font-family-primary)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '14px 14px 10px',
      alignItems: centrado ? 'center' : 'flex-start'
    }
  }, chip || icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: bg || color + '1f',
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, kicker && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color,
      textAlign: centrado ? 'center' : undefined
    }
  }, kicker), title && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '1px 0 0',
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.3
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, subtitle)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      padding: 2,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 15
  }))), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: '10px 14px',
      borderTop: '1px solid var(--border)',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
    }
  }, actions));
}
Object.assign(__ds_scope, { MapPopup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapPopup.jsx", error: String((e && e.message) || e) }); }

// components/map/MapToolbar.jsx
try { (() => {
const {
  useState
} = React;
function Tool({
  t,
  active,
  onSelect,
  showLabel
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: t.label,
    disabled: t.disabled,
    onClick: () => onSelect && onSelect(t.id),
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      minWidth: 36,
      padding: showLabel ? '0 10px' : 0,
      justifyContent: showLabel ? 'flex-start' : 'center',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: t.disabled ? 'not-allowed' : 'pointer',
      opacity: t.disabled ? 0.4 : 1,
      background: active ? 'var(--primary)' : h ? 'var(--muted)' : 'transparent',
      color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      transition: 'background .15s'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16
  }), showLabel && /*#__PURE__*/React.createElement("span", null, t.label));
}
function MapToolbar({
  tools = [],
  active,
  onSelect,
  orientation = 'vertical',
  showLabels = false
}) {
  const v = orientation === 'vertical';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: v ? 'column' : 'row',
      gap: 2,
      padding: 4,
      background: 'var(--card)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--elevation-md)',
      border: '1px solid var(--border)'
    }
  }, tools.map((t, i) => t.sep ? /*#__PURE__*/React.createElement("div", {
    key: 's' + i,
    style: {
      [v ? 'height' : 'width']: 1,
      [v ? 'margin' : 'margin']: v ? '3px 4px' : '4px 3px',
      background: 'var(--border)',
      alignSelf: 'stretch'
    }
  }) : /*#__PURE__*/React.createElement(Tool, {
    key: t.id,
    t: t,
    active: active === t.id,
    onSelect: onSelect,
    showLabel: showLabels
  })));
}
Object.assign(__ds_scope, { MapToolbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapToolbar.jsx", error: String((e && e.message) || e) }); }

// components/map/TreeSection.jsx
try { (() => {
const {
  useState
} = React;
const chk = {
  accentColor: 'var(--primary)',
  margin: 0,
  width: 14,
  height: 14,
  flexShrink: 0,
  cursor: 'pointer'
};
function TreeSection({
  title,
  icon,
  badge,
  open,
  defaultOpen = false,
  onToggle,
  checked,
  onCheck,
  children
}) {
  const [o, setO] = useState(defaultOpen);
  const isOpen = open != null ? open : o;
  const toggle = () => {
    if (onToggle) onToggle(!isOpen);
    if (open == null) setO(!isOpen);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--border)',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: toggle,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '11px 12px',
      cursor: 'pointer',
      background: isOpen ? 'var(--muted)' : 'transparent',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 4,
      border: '1.5px solid var(--border)',
      background: 'var(--card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted-foreground)',
      flexShrink: 0,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: isOpen ? 'minus' : 'plus',
    size: 10,
    strokeWidth: 2.8
  })), onCheck && /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    onClick: e => e.stopPropagation(),
    onChange: e => onCheck(e.target.checked),
    style: chk
  }), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    color: isOpen ? 'var(--primary)' : 'var(--muted-foreground)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 7px',
      borderRadius: 999,
      background: isOpen ? 'var(--card)' : 'var(--muted)',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, badge)), isOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '6px 8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, children));
}
function TreeRow({
  label,
  meta,
  swatch,
  checked,
  onCheck,
  selected,
  onClick,
  indent = 0,
  strong,
  radio,
  name
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      paddingLeft: 8 + indent * 18,
      borderRadius: 'var(--radius-sm)',
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : h && onClick ? 'var(--muted)' : 'transparent',
      opacity: checked === false && !radio ? 0.55 : 1,
      fontFamily: 'var(--font-family-primary)'
    }
  }, onCheck && /*#__PURE__*/React.createElement("input", {
    type: radio ? 'radio' : 'checkbox',
    name: name,
    checked: !!checked,
    onClick: e => e.stopPropagation(),
    onChange: e => onCheck(e.target.checked),
    style: chk
  }), swatch, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: strong ? 11 : 12.5,
      fontWeight: strong ? 700 : selected ? 600 : 500,
      textTransform: strong ? 'uppercase' : 'none',
      letterSpacing: strong ? '0.04em' : 0,
      color: selected ? 'var(--primary)' : strong ? 'var(--muted-foreground)' : 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, label), meta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, meta));
}
Object.assign(__ds_scope, { TreeSection, TreeRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/TreeSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa-v1/AppV1.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Módulo 5 — Mapa Operacional (CU-26 a CU-38). Estado de la pantalla y orquestación. */
const {
  useState,
  useEffect,
  useMemo,
  useCallback
} = React;
const NS = window.DUARDiseOMapa_7e942c;
const D = window.MapaData;
const uid = p => p + Math.random().toString(36).slice(2, 7);
const hora = () => new Date().toLocaleTimeString('es-AR', {
  hour: '2-digit',
  minute: '2-digit'
});
function Toast({
  t
}) {
  const {
    Icon
  } = NS;
  if (!t) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 16px',
      borderRadius: 10,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 13,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon || 'circle-check',
    size: 16,
    color: t.color || '#16a34a'
  }), t.msg);
}
function ModoBanner({
  tool,
  draft,
  onUndo,
  onFinish,
  onCancel,
  editing,
  onSaveGeom
}) {
  const {
    Button,
    Icon
  } = NS;
  let txt = null,
    acciones = null;
  if (tool === 'poligono') {
    txt = draft.length < 3 ? `Hacé clic para marcar vértices (${draft.length}/3 mínimo)` : 'Doble clic o clic en el primer vértice para cerrar';
    acciones = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "undo-2",
      disabled: !draft.length,
      onClick: onUndo,
      style: {
        color: '#fff'
      }
    }, "Deshacer"), /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      disabled: draft.length < 3,
      onClick: onFinish
    }, "Terminar"));
  } else if (tool === 'poi') txt = 'Hacé clic en el mapa para marcar el punto de interés';else if (tool === 'puntoCero') txt = 'Hacé clic en el mapa para colocar el nuevo Punto Cero / LSP';else if (editing) {
    txt = 'Arrastrá los vértices para modificar la geometría';
    acciones = /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      onClick: onSaveGeom
    }, "Guardar geometr\xEDa");
  }
  if (!txt) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 6px 6px 14px',
      borderRadius: 10,
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      width: 'max-content',
      maxWidth: 'calc(100% - 150px)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '1 1 auto',
      minWidth: 150
    }
  }, txt), acciones, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: onCancel,
    style: {
      color: '#fff',
      padding: '6px 8px'
    },
    title: "Cancelar (Esc)"
  }));
}
function Placeholder({
  label,
  icon
}) {
  const {
    Icon
  } = NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 20,
      fontWeight: 700
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: 56,
      borderRadius: 14,
      background: 'var(--card)',
      border: '1px dashed var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 32,
    color: "var(--muted-foreground)",
    style: {
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600
    }
  }, "Fuera del alcance de este kit"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Este UI kit cubre el M\xF3dulo 5 (Mapa). Volv\xE9 a \"Mapa\" en el men\xFA.")));
}
function App() {
  const {
    Sidebar,
    OperativoHeader,
    MapToolbar,
    LayerPanel,
    Button,
    Icon
  } = NS;
  const [dark, setDark] = useState(false);
  const [modulo, setModulo] = useState('Mapa');
  const [pols, setPols] = useState(D.poligonos);
  const [trazas, setTrazas] = useState(D.trazas);
  const [puntos, setPuntos] = useState(D.puntos);
  const [grupos, setGrupos] = useState(D.grupos);
  const [p0, setP0] = useState(D.puntoCero);
  const [base, setBase] = useState('fisico');
  const [overlays, setOverlays] = useState({
    poligonos: true,
    trazas: true,
    puntos: true,
    instalaciones: true,
    brechas: false
  });
  const [tool, setTool] = useState('select');
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState([]);
  const [editVerts, setEditVerts] = useState(null);
  const [modal, setModal] = useState(null);
  const [capas, setCapas] = useState(false);
  const [tab, setTab] = useState('poligonos');
  const [left, setLeft] = useState(window.innerWidth > 1000);
  const [toast, setToast] = useState(null);
  const [calc, setCalc] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const avisar = (msg, icon, color) => {
    setToast({
      msg,
      icon,
      color
    });
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => {
    setTimeout(() => window.__duarMap && window.__duarMap.invalidateSize(), 220);
  }, [left, modulo]);
  const cancelarModo = useCallback(() => {
    setTool('select');
    setDraft([]);
    setEditVerts(null);
  }, []);
  const terminarPoligono = () => {
    const v = draft.filter((p, i) => i === 0 || window.Geo.length([draft[i - 1], p]) > 5);
    if (v.length < 3) return;
    setModal({
      type: 'nuevoPoligono',
      vertices: v
    });
  };
  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape' && !modal) {
        cancelarModo();
        setCapas(false);
      }
      if (e.key === 'Enter' && tool === 'poligono' && !modal) terminarPoligono();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  const elegirTool = id => {
    if (id === 'gpx') {
      setModal({
        type: 'gpx'
      });
      return;
    }
    setEditVerts(null);
    setDraft([]);
    setTool(id);
    if (id !== 'select') setSel(null);
  };
  const onMapClick = ll => {
    if (tool === 'poligono') setDraft(d => [...d, ll]);else if (tool === 'poi') {
      const p = {
        id: uid('i'),
        tipo: 'poi',
        nombre: 'Nuevo punto de interés',
        lat: ll[0],
        lng: ll[1],
        descripcion: '',
        detalle: '',
        fotos: 0
      };
      setPuntos(x => [...x, p]);
      setSel({
        type: 'punto',
        id: p.id
      });
      setTool('select');
      setTab('puntos');
      avisar('Punto marcado. Completá sus datos en el panel.');
    } else if (tool === 'puntoCero') setModal({
      type: 'puntoCero',
      to: ll
    });else if (!editVerts) setSel(null);
  };
  const patchPol = (id, patch) => setPols(ps => ps.map(p => p.id === id ? {
    ...p,
    ...patch
  } : p));
  const asignar = (pol, gid) => {
    const estado = gid ? pol.estado === 'pendiente' ? 'asignado' : pol.estado : 'pendiente';
    patchPol(pol.id, {
      grupoId: gid,
      estado
    });
    if (gid) setGrupos(gs => gs.map(g => g.id === gid && ['en_formacion', 'confirmado'].includes(g.estado) ? {
      ...g,
      estado: 'asignado'
    } : g));
    const g = grupos.find(x => x.id === gid);
    avisar(gid ? `${pol.nombre.split(' — ')[0]} asignado a ${g.nombre}` : 'Polígono sin grupo asignado');
  };
  const calcular = pol => {
    setCalc(pol.id);
    setTimeout(() => {
      const tz = trazas.filter(t => t.poligonoId === pol.id);
      const r = window.Geo.coverage(pol.vertices, tz);
      patchPol(pol.id, {
        cobertura: {
          ...r,
          hora: hora()
        }
      });
      setOverlays(o => ({
        ...o,
        brechas: true
      }));
      setCalc(null);
      avisar(`Cobertura de ${pol.nombre.split(' — ')[0]}: ${Math.round(r.pct)}%`, 'scan', 'var(--primary)');
    }, 700);
  };
  const toggleVis = (kind, id) => (kind === 'poligonos' ? setPols : setTrazas)(xs => xs.map(x => x.id === id ? {
    ...x,
    visible: !x.visible
  } : x));
  const seleccionar = (s, pts) => {
    setSel(s);
    if (s && window.innerWidth < 1280) setLeft(false);
    if (pts) setFlyTo({
      pts,
      k: Math.random()
    });
  };
  const selPol = sel && sel.type === 'poligono' && pols.find(p => p.id === sel.id);
  const selTr = sel && sel.type === 'traza' && trazas.find(t => t.id === sel.id);
  const selPt = sel && sel.type === 'punto' && puntos.find(p => p.id === sel.id);
  const eliminar = () => {
    const m = modal;
    if (m.kind === 'poligono') {
      setPols(ps => ps.filter(p => p.id !== m.id));
      setTrazas(ts => ts.map(t => t.poligonoId === m.id ? {
        ...t,
        poligonoId: null
      } : t));
    }
    if (m.kind === 'traza') {
      setTrazas(ts => ts.filter(t => t.id !== m.id));
      setPols(ps => ps.map(p => p.cobertura ? {
        ...p,
        cobertura: null
      } : p));
    }
    if (m.kind === 'punto') setPuntos(ps => ps.filter(p => p.id !== m.id));
    setModal(null);
    setSel(null);
    avisar(m.nombre + ' eliminado', 'trash-2', '#dc2626');
  };
  const tools = [{
    id: 'select',
    icon: 'mouse-pointer-2',
    label: 'Seleccionar'
  }, {
    sep: true
  }, {
    id: 'poligono',
    icon: 'pentagon',
    label: 'Dibujar polígono'
  }, {
    id: 'poi',
    icon: 'map-pin-plus',
    label: 'Marcar punto de interés'
  }, {
    id: 'puntoCero',
    icon: 'crosshair',
    label: 'Definir Punto Cero'
  }, {
    sep: true
  }, {
    id: 'gpx',
    icon: 'route',
    label: 'Cargar traza GPX'
  }];
  const navItems = [{
    icon: 'layout-dashboard',
    label: 'Panel'
  }, {
    icon: 'user-check',
    label: 'Agentes'
  }, {
    icon: 'map',
    label: 'Mapa'
  }].map(i => ({
    ...i,
    active: i.label === modulo
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    context: "operativo",
    items: navItems,
    user: D.usuario,
    isDark: dark,
    onToggleDark: () => setDark(d => !d),
    onNavigate: it => setModulo(it.label),
    onBack: () => avisar('Volver a Operativos no forma parte de este kit', 'info', 'var(--muted-foreground)'),
    defaultCollapsed: window.innerWidth < 900
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(OperativoHeader, _extends({}, D.operativo, {
    hasObjetivo: true,
    onObjetivo: () => avisar('Objetivo buscado: ver módulo 3', 'target', 'var(--primary)'),
    onQR: () => avisar('QR de agentes: ver módulo 4', 'qr-code', 'var(--foreground)'),
    onInforme: () => avisar('Informe: ver módulo 6', 'file-text', 'var(--foreground)')
  })), modulo !== 'Mapa' ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    label: modulo === 'Panel' ? 'Panel de Control' : 'Agentes y Grupos',
    icon: modulo === 'Panel' ? 'layout-dashboard' : 'users'
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      position: 'relative'
    }
  }, left && /*#__PURE__*/React.createElement(LeftPanel, {
    tab: tab,
    setTab: setTab,
    poligonos: pols,
    trazas: trazas,
    puntos: puntos,
    grupos: grupos,
    sel: sel,
    onSelect: seleccionar,
    onToggleVis: toggleVis,
    onDibujar: () => elegirTool('poligono'),
    onGpx: () => setModal({
      type: 'gpx'
    }),
    onMarcar: () => elegirTool('poi'),
    onClose: () => setLeft(false)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(MapCanvas, {
    base: base,
    overlays: overlays,
    poligonos: pols,
    trazas: trazas,
    puntos: puntos,
    grupos: grupos,
    sel: sel,
    tool: tool,
    draft: draft,
    editVerts: editVerts,
    puntoCero: p0,
    puestoComando: D.puestoComando,
    flyTo: flyTo,
    onMapClick: onMapClick,
    onMapDblClick: () => tool === 'poligono' && terminarPoligono(),
    onSelect: s => {
      setSel(s);
      if (window.innerWidth < 1280) setLeft(false);
    },
    onVertexMove: (i, ll) => setEditVerts(ev => {
      const v = ev.verts.slice();
      v[i] = ll;
      return {
        ...ev,
        verts: v
      };
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: 14,
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, !left && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setLeft(true),
    title: "Mostrar panel",
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--card)',
      boxShadow: 'var(--elevation-md)',
      color: 'var(--foreground)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panel-left-open",
    size: 16
  })), /*#__PURE__*/React.createElement(MapToolbar, {
    tools: tools,
    active: editVerts ? null : tool,
    onSelect: elegirTool
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      right: selPol || selTr || selPt || sel && sel.type !== 'poligono' ? 354 : 14,
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      transition: 'right .2s'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: capas ? 'primary' : 'outline',
    icon: "layers",
    onClick: () => setCapas(c => !c),
    style: {
      boxShadow: 'var(--elevation-md)',
      padding: '8px 12px'
    }
  }, "Capas"), capas && /*#__PURE__*/React.createElement(LayerPanel, {
    bases: D.bases,
    base: base,
    onBase: setBase,
    onClose: () => setCapas(false),
    onToggle: id => setOverlays(o => ({
      ...o,
      [id]: !o[id]
    })),
    overlays: [{
      id: 'poligonos',
      label: 'Polígonos',
      icon: 'pentagon',
      checked: overlays.poligonos,
      count: pols.length
    }, {
      id: 'trazas',
      label: 'Trazas GPX',
      icon: 'route',
      checked: overlays.trazas,
      count: trazas.length
    }, {
      id: 'puntos',
      label: 'Puntos de interés',
      icon: 'map-pin',
      checked: overlays.puntos,
      count: puntos.length
    }, {
      id: 'instalaciones',
      label: 'Punto Cero y Comando',
      icon: 'crosshair',
      checked: overlays.instalaciones
    }, {
      id: 'brechas',
      label: 'Análisis de brechas',
      icon: 'scan',
      color: '#dc2626',
      checked: overlays.brechas,
      count: pols.filter(p => p.cobertura).length
    }]
  })), /*#__PURE__*/React.createElement(ModoBanner, {
    tool: tool,
    draft: draft,
    editing: !!editVerts,
    onUndo: () => setDraft(d => d.slice(0, -1)),
    onFinish: terminarPoligono,
    onCancel: cancelarModo,
    onSaveGeom: () => {
      patchPol(editVerts.id, {
        vertices: editVerts.verts,
        cobertura: null
      });
      setEditVerts(null);
      avisar('Geometría actualizada. Recalculá la cobertura.');
    }
  }), selPol && !editVerts && /*#__PURE__*/React.createElement(PoligonoPanel, {
    pol: selPol,
    grupos: grupos,
    poligonos: pols,
    trazas: trazas,
    onClose: () => setSel(null),
    onPatch: p => {
      patchPol(selPol.id, p);
      avisar(p.estado ? 'Estado actualizado: ' + NS.ESTADOS[p.estado].label : 'Cambios guardados');
    },
    onAsignar: g => asignar(selPol, g),
    onCalcular: () => calcular(selPol),
    calculando: calc === selPol.id,
    brechas: overlays.brechas,
    onToggleBrechas: () => setOverlays(o => ({
      ...o,
      brechas: !o.brechas
    })),
    onEditGeom: () => {
      setTool('select');
      setEditVerts({
        id: selPol.id,
        verts: selPol.vertices.slice()
      });
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'poligono',
      id: selPol.id,
      nombre: selPol.nombre,
      extra: 'Las trazas asociadas se conservan pero quedan fuera de polígono.'
    }),
    onSelectTraza: id => {
      const t = trazas.find(x => x.id === id);
      seleccionar({
        type: 'traza',
        id
      }, t.puntos);
      setTab('trazas');
    }
  }), selTr && /*#__PURE__*/React.createElement(TrazaPanel, {
    t: selTr,
    grupos: grupos,
    poligonos: pols,
    onClose: () => setSel(null),
    onSave: f => {
      setTrazas(ts => ts.map(t => t.id === f.id ? f : t));
      avisar('Traza actualizada');
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'traza',
      id: selTr.id,
      nombre: selTr.etiqueta,
      extra: 'Las coberturas calculadas se descartan y hay que recalcularlas.'
    })
  }), selPt && /*#__PURE__*/React.createElement(PuntoPanel, {
    p: selPt,
    onClose: () => setSel(null),
    onSave: f => {
      setPuntos(ps => ps.map(p => p.id === f.id ? f : p));
      avisar('Punto actualizado');
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'punto',
      id: selPt.id,
      nombre: selPt.nombre
    })
  }), sel && sel.type === 'puntoCero' && /*#__PURE__*/React.createElement(PuntoCeroPanel, {
    pc: p0,
    onClose: () => setSel(null),
    onMover: () => {
      setSel(null);
      setTool('puntoCero');
    }
  }), sel && sel.type === 'comando' && /*#__PURE__*/React.createElement(ComandoPanel, {
    pc: D.puestoComando,
    puntoCero: p0,
    onClose: () => setSel(null)
  }), /*#__PURE__*/React.createElement(Toast, {
    t: toast
  })))), modal && modal.type === 'nuevoPoligono' && /*#__PURE__*/React.createElement(NuevoPoligonoModal, {
    vertices: modal.vertices,
    grupos: grupos,
    n: pols.length + 1,
    onCancel: () => setModal(null),
    onSave: f => {
      const p = {
        id: uid('p'),
        ...f,
        estado: f.grupoId ? 'asignado' : 'pendiente',
        vertices: modal.vertices,
        visible: true
      };
      setPols(ps => [...ps, p]);
      if (f.grupoId) setGrupos(gs => gs.map(g => g.id === f.grupoId && ['en_formacion', 'confirmado'].includes(g.estado) ? {
        ...g,
        estado: 'asignado'
      } : g));
      setModal(null);
      cancelarModo();
      setSel({
        type: 'poligono',
        id: p.id
      });
      setTab('poligonos');
      avisar('Polígono creado');
    }
  }), modal && modal.type === 'gpx' && /*#__PURE__*/React.createElement(GpxModal, {
    grupos: grupos,
    poligonos: pols,
    onCancel: () => setModal(null),
    onUpload: f => {
      const t = {
        id: uid('t'),
        ...f,
        duracion: '—',
        notas: '',
        visible: true
      };
      setTrazas(ts => [...ts, t]);
      if (f.poligonoId) patchPol(f.poligonoId, {
        cobertura: null
      });
      setModal(null);
      setTab('trazas');
      seleccionar({
        type: 'traza',
        id: t.id
      }, t.puntos);
      avisar('Traza cargada: ' + window.Geo.fmtKm(window.Geo.length(t.puntos)));
    }
  }), modal && modal.type === 'eliminar' && /*#__PURE__*/React.createElement(EliminarModal, {
    tipo: {
      poligono: 'polígono',
      traza: 'traza GPX',
      punto: 'punto'
    }[modal.kind],
    nombre: modal.nombre,
    extra: modal.extra,
    onCancel: () => setModal(null),
    onConfirm: eliminar
  }), modal && modal.type === 'puntoCero' && /*#__PURE__*/React.createElement(PuntoCeroModal, {
    from: p0,
    to: modal.to,
    onCancel: () => setModal(null),
    onConfirm: () => {
      setP0({
        ...p0,
        lat: modal.to[0],
        lng: modal.to[1],
        actualizado: new Date().toLocaleDateString('es-AR') + ' ' + hora()
      });
      setModal(null);
      setTool('select');
      setSel({
        type: 'puntoCero',
        id: 'p0'
      });
      avisar('Punto Cero actualizado');
    }
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(NS ? /*#__PURE__*/React.createElement(App, null) : /*#__PURE__*/React.createElement("p", {
  style: {
    padding: 24,
    fontFamily: 'Inter, sans-serif',
    color: '#444140'
  }
}, "No se pudo cargar la librer\xEDa de componentes (_ds_bundle.js). Recarg\xE1 la p\xE1gina."));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa-v1/AppV1.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa-v1/MapCanvasV1.jsx
try { (() => {
/* Lienzo Leaflet del mapa operacional. Se redibuja entero ante cada cambio (pocos elementos). */
const {
  useEffect: useEffectMC,
  useRef: useRefMC
} = React;
function markerIcon(tipo, label, selected) {
  const {
    MapMarker
  } = window.DUARDiseOMapa_7e942c;
  const el = document.createElement('div');
  el.style.cssText = 'width:120px;display:flex;justify-content:center;';
  ReactDOM.createRoot(el).render(/*#__PURE__*/React.createElement(MapMarker, {
    tipo: tipo,
    label: label,
    selected: selected
  }));
  const h = tipo === 'puntoCero' ? 40 : 34;
  return L.divIcon({
    html: el,
    className: 'duar-divicon',
    iconSize: [120, h + 22],
    iconAnchor: [60, h]
  });
}
function vertexIcon(color) {
  return L.divIcon({
    className: 'duar-divicon',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:border-box"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}
function MapCanvas(props) {
  const elRef = useRefMC(null),
    mapRef = useRefMC(null),
    g = useRefMC({}),
    cb = useRefMC(props),
    coordRef = useRefMC(null);
  cb.current = props;
  const D = window.MapaData;
  useEffectMC(() => {
    const map = L.map(elRef.current, {
      zoomControl: false,
      preferCanvas: true,
      doubleClickZoom: false,
      attributionControl: true
    }).setView(D.centro, 14);
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);
    L.control.scale({
      position: 'bottomleft',
      imperial: false
    }).addTo(map);
    ['gap', 'pol', 'tr', 'pts', 'draft'].forEach(k => g.current[k] = L.layerGroup().addTo(map));
    g.current.rubber = L.polyline([], {
      color: '#E54B4B',
      weight: 2,
      dashArray: '4 6',
      interactive: false
    }).addTo(map);
    map.on('click', e => cb.current.onMapClick && cb.current.onMapClick([e.latlng.lat, e.latlng.lng]));
    map.on('dblclick', () => cb.current.onMapDblClick && cb.current.onMapDblClick());
    map.on('mousemove', e => {
      if (coordRef.current) coordRef.current.textContent = window.Geo.fmtCoord(e.latlng.lat, e.latlng.lng);
      const d = cb.current.draft;
      if (cb.current.tool === 'poligono' && d && d.length) g.current.rubber.setLatLngs([d[d.length - 1], [e.latlng.lat, e.latlng.lng], d[0]]);else g.current.rubber.setLatLngs([]);
    });
    mapRef.current = map;
    map.fitBounds(L.latLngBounds(D.poligonos.flatMap(p => p.vertices)).pad(0.15));
    window.__duarMap = map;
    return () => map.remove();
  }, []);
  useEffectMC(() => {
    const map = mapRef.current;
    const b = D.bases.find(x => x.id === props.base) || D.bases[0];
    if (g.current.tiles) map.removeLayer(g.current.tiles);
    g.current.tiles = L.tileLayer(b.url, {
      attribution: b.attr,
      maxZoom: 18,
      subdomains: 'abc'
    }).addTo(map);
    g.current.tiles.bringToBack();
  }, [props.base]);
  useEffectMC(() => {
    if (props.flyTo && mapRef.current) mapRef.current.flyToBounds(L.latLngBounds(props.flyTo.pts).pad(0.3), {
      duration: 0.6,
      maxZoom: 16
    });
  }, [props.flyTo]);
  const {
    poligonos,
    trazas,
    puntos,
    grupos,
    sel,
    overlays,
    tool,
    editVerts,
    puntoCero,
    puestoComando
  } = props;
  useEffectMC(() => {
    const {
      pol,
      tr,
      pts,
      gap
    } = g.current;
    [pol, tr, pts, gap].forEach(l => l.clearLayers());
    const colorDe = id => (grupos.find(x => x.id === id) || {}).color;
    const interactivo = tool === 'select';
    const isSel = (t, id) => sel && sel.type === t && sel.id === id;
    if (overlays.brechas) poligonos.forEach(p => {
      if (!p.cobertura || !p.visible) return;
      const {
        gaps,
        dLat,
        dLng
      } = p.cobertura;
      gaps.forEach(([la, ln]) => L.rectangle([[la - dLat / 2, ln - dLng / 2], [la + dLat / 2, ln + dLng / 2]], {
        stroke: false,
        fillColor: '#dc2626',
        fillOpacity: 0.38,
        interactive: false
      }).addTo(gap));
    });
    if (overlays.poligonos) poligonos.forEach(p => {
      if (!p.visible || editVerts && editVerts.id === p.id) return;
      const c = colorDe(p.grupoId) || '#475569',
        s = isSel('poligono', p.id);
      const shape = L.polygon(p.vertices, {
        color: c,
        weight: s ? 3.5 : 2,
        fillColor: c,
        fillOpacity: s ? 0.26 : overlays.brechas && p.cobertura ? 0.06 : 0.13,
        dashArray: p.estado === 'pendiente' ? '7 6' : null,
        interactive: interactivo,
        bubblingMouseEvents: false
      });
      shape.bindTooltip(p.nombre.split(' — ')[0], {
        permanent: true,
        direction: 'center',
        className: 'duar-tip'
      });
      shape.on('click', () => cb.current.onSelect({
        type: 'poligono',
        id: p.id
      }));
      shape.addTo(pol);
    });
    if (overlays.trazas) trazas.forEach(t => {
      if (!t.visible || t.puntos.length < 2) return;
      const c = colorDe(t.grupoId) || '#444140',
        s = isSel('traza', t.id);
      L.polyline(t.puntos, {
        color: '#fff',
        weight: s ? 7 : 5,
        opacity: 0.85,
        interactive: false
      }).addTo(tr);
      const line = L.polyline(t.puntos, {
        color: c,
        weight: s ? 4 : 2.5,
        opacity: 0.95,
        interactive: interactivo,
        bubblingMouseEvents: false
      });
      line.on('click', () => cb.current.onSelect({
        type: 'traza',
        id: t.id
      }));
      line.addTo(tr);
      L.circleMarker(t.puntos[0], {
        radius: 4,
        color: '#fff',
        weight: 2,
        fillColor: c,
        fillOpacity: 1,
        interactive: false
      }).addTo(tr);
      L.circleMarker(t.puntos[t.puntos.length - 1], {
        radius: 4,
        color: c,
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: false
      }).addTo(tr);
    });
    if (overlays.puntos) puntos.forEach(p => {
      const m = L.marker([p.lat, p.lng], {
        icon: markerIcon(p.tipo, null, isSel('punto', p.id)),
        interactive: interactivo,
        bubblingMouseEvents: false,
        zIndexOffset: isSel('punto', p.id) ? 500 : 0
      });
      m.on('click', () => cb.current.onSelect({
        type: 'punto',
        id: p.id
      }));
      m.addTo(pts);
    });
    if (overlays.instalaciones) {
      const pc = L.marker([puestoComando.lat, puestoComando.lng], {
        icon: markerIcon('puestoComando', 'Puesto de Comando', isSel('comando', 'pc')),
        interactive: interactivo,
        bubblingMouseEvents: false
      });
      pc.on('click', () => cb.current.onSelect({
        type: 'comando',
        id: 'pc'
      }));
      pc.addTo(pts);
      const p0 = L.marker([puntoCero.lat, puntoCero.lng], {
        icon: markerIcon('puntoCero', 'Punto 0', isSel('puntoCero', 'p0')),
        interactive: interactivo,
        bubblingMouseEvents: false,
        zIndexOffset: 1000
      });
      p0.on('click', () => cb.current.onSelect({
        type: 'puntoCero',
        id: 'p0'
      }));
      p0.addTo(pts);
    }
  }, [poligonos, trazas, puntos, grupos, sel, overlays, tool, editVerts, puntoCero, puestoComando]);
  const {
    draft
  } = props;
  useEffectMC(() => {
    const d = g.current.draft;
    d.clearLayers();
    if (tool === 'poligono' && draft.length) {
      L.polyline(draft, {
        color: '#E54B4B',
        weight: 2.5,
        interactive: false
      }).addTo(d);
      if (draft.length > 2) L.polygon(draft, {
        stroke: false,
        fillColor: '#E54B4B',
        fillOpacity: 0.12,
        interactive: false
      }).addTo(d);
      draft.forEach((p, i) => L.marker(p, {
        icon: vertexIcon(i === 0 ? '#444140' : '#E54B4B'),
        interactive: i === 0 && draft.length > 2
      }).on('click', () => cb.current.onMapDblClick && cb.current.onMapDblClick()).addTo(d));
    } else g.current.rubber.setLatLngs([]);
    if (editVerts) {
      const pol = poligonos.find(p => p.id === editVerts.id);
      const c = (grupos.find(x => x.id === (pol && pol.grupoId)) || {}).color || '#475569';
      const shape = L.polygon(editVerts.verts, {
        color: c,
        weight: 2.5,
        fillColor: c,
        fillOpacity: 0.2,
        dashArray: '4 4',
        interactive: false
      }).addTo(d);
      editVerts.verts.forEach((p, i) => {
        const m = L.marker(p, {
          icon: vertexIcon(c),
          draggable: true
        }).addTo(d);
        m.on('drag', e => {
          const v = editVerts.verts.slice();
          v[i] = [e.latlng.lat, e.latlng.lng];
          shape.setLatLngs(v);
        });
        m.on('dragend', e => cb.current.onVertexMove(i, [e.target.getLatLng().lat, e.target.getLatLng().lng]));
      });
    }
  }, [draft, tool, editVerts]);
  useEffectMC(() => {
    if (elRef.current) elRef.current.style.cursor = tool === 'select' ? '' : 'crosshair';
  }, [tool]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: elRef,
    style: {
      position: 'absolute',
      inset: 0,
      background: '#e8e4df'
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: coordRef,
    style: {
      position: 'absolute',
      left: 12,
      bottom: 34,
      zIndex: 500,
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(255,255,255,.88)',
      color: '#444140',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 11,
      pointerEvents: 'none'
    }
  }, window.Geo.fmtCoord(D.centro[0], D.centro[1])));
}
window.MapCanvas = MapCanvas;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa-v1/MapCanvasV1.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa-v1/ModalsV1.jsx
try { (() => {
/* Modales del mapa: nuevo polígono (CU-27), cargar GPX (CU-29), eliminar (CU-36), Punto Cero (CU-34). */
const {
  useState: useStateM,
  useRef: useRefM
} = React;
const NSM = window.DUARDiseOMapa_7e942c;
function NuevoPoligonoModal({
  vertices,
  grupos,
  n,
  onCancel,
  onSave
}) {
  const {
    Modal,
    Button,
    TextField,
    SelectField
  } = NSM;
  const [nombre, setNombre] = useStateM('Sector ' + n + ' — ');
  const [grupoId, setGrupoId] = useStateM('');
  const [notas, setNotas] = useStateM('');
  const [err, setErr] = useStateM(false);
  const guardar = () => {
    if (nombre.replace(/ — ?$/, '').trim().length < 3) {
      setErr(true);
      return;
    }
    onSave({
      nombre: nombre.replace(/ — $/, ''),
      grupoId: grupoId || null,
      notas
    });
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Nuevo pol\xEDgono",
    subtitle: 'Sector de rastrillaje · ' + vertices.length + ' vértices · ' + window.Geo.fmtArea(window.Geo.area(vertices)),
    icon: "pentagon",
    onClose: onCancel,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      onClick: guardar
    }, "Guardar pol\xEDgono"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Nombre",
    required: true,
    value: nombre,
    onChange: v => {
      setNombre(v);
      setErr(false);
    }
  }), err && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '-8px 0 0',
      fontSize: 12,
      color: '#E54B4B'
    }
  }, "Ingres\xE1 un nombre para el pol\xEDgono."), /*#__PURE__*/React.createElement(SelectField, {
    label: "Asignar a grupo",
    value: grupoId,
    onChange: setGrupoId,
    options: [{
      value: '',
      label: '— Asignar más tarde —'
    }, ...grupos.map(g => ({
      value: g.id,
      label: g.nombre + ' · ' + g.integrantes + ' integrantes'
    }))]
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Notas",
    multiline: true,
    rows: 3,
    value: notas,
    onChange: setNotas,
    placeholder: "Tipo de terreno, accesos, riesgos\u2026"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, grupoId ? 'El polígono queda en estado Asignado y el grupo pasa a Asignado.' : 'El polígono queda en estado Pendiente hasta que le asignes un grupo.')));
}
function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pts = [...doc.querySelectorAll('trkpt, rtept')].map(n => [parseFloat(n.getAttribute('lat')), parseFloat(n.getAttribute('lon'))]).filter(p => !isNaN(p[0]));
  const name = (doc.querySelector('trk > name, metadata > name') || {}).textContent;
  return {
    pts,
    name
  };
}
function GpxModal({
  grupos,
  poligonos,
  onCancel,
  onUpload
}) {
  const {
    Modal,
    Button,
    TextField,
    SelectField,
    Icon
  } = NSM;
  const fileRef = useRefM(null);
  const [archivo, setArchivo] = useStateM(null);
  const [err, setErr] = useStateM('');
  const [etiqueta, setEtiqueta] = useStateM('');
  const [grupoId, setGrupoId] = useStateM('');
  const [poligonoId, setPoligonoId] = useStateM('');
  const [fecha, setFecha] = useStateM('2026-03-02');
  const [over, setOver] = useStateM(false);
  const cargar = file => {
    if (!file) return;
    if (!/\.gpx$/i.test(file.name)) {
      setErr('El archivo tiene que ser .gpx');
      return;
    }
    file.text().then(t => {
      const {
        pts,
        name
      } = parseGpx(t);
      if (pts.length < 2) {
        setErr('No se encontraron puntos de recorrido en el archivo.');
        return;
      }
      setErr('');
      setArchivo({
        nombre: file.name,
        pts
      });
      if (!etiqueta) setEtiqueta(name || file.name.replace(/\.gpx$/i, ''));
    });
  };
  const ejemplo = () => {
    const pol = poligonos.find(p => p.id === poligonoId) || poligonos.find(p => p.estado === 'rastrillando') || poligonos[0];
    const pts = window.MapaData.barrido(pol.vertices.map(v => [v[0] - 0.0035, v[1]]), 0.45, 16, 17).filter(p => window.Geo.inside(p, pol.vertices));
    setArchivo({
      nombre: 'bravo_0203_pm.gpx',
      pts
    });
    setErr('');
    if (!poligonoId) setPoligonoId(pol.id);
    if (!grupoId && pol.grupoId) setGrupoId(pol.grupoId);
    if (!etiqueta) setEtiqueta('Bravo — Tarde');
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Cargar traza GPX",
    subtitle: "Archivo exportado desde Wikiloc u otro GPS",
    icon: "route",
    onClose: onCancel,
    width: 540,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "upload",
      disabled: !archivo || !etiqueta.trim(),
      onClick: () => onUpload({
        archivo: archivo.nombre,
        puntos: archivo.pts,
        etiqueta: etiqueta.trim(),
        grupoId: grupoId || null,
        poligonoId: poligonoId || null,
        fecha
      })
    }, "Cargar traza"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".gpx",
    style: {
      display: 'none'
    },
    onChange: e => cargar(e.target.files[0])
  }), archivo ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 10,
      background: 'rgba(22,163,74,0.08)',
      border: '1px solid rgba(22,163,74,0.3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: '#dcfce7',
      color: '#15803d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-check",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, archivo.nombre), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, archivo.pts.length, " puntos \xB7 ", window.Geo.fmtKm(window.Geo.length(archivo.pts)))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: () => setArchivo(null)
  }, "Quitar")) : /*#__PURE__*/React.createElement("div", {
    onClick: () => fileRef.current.click(),
    onDragOver: e => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      setOver(false);
      cargar(e.dataTransfer.files[0]);
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '26px 16px',
      borderRadius: 12,
      cursor: 'pointer',
      border: '2px dashed ' + (over ? 'var(--primary)' : 'var(--border)'),
      background: over ? 'rgba(229,75,75,0.06)' : 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-up",
    size: 28,
    style: {
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, "Arrastr\xE1 el archivo .gpx o hac\xE9 clic para buscarlo"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5
    }
  }, "Se lee el recorrido (trkpt) y se dibuja sobre el mapa"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      ejemplo();
    },
    style: {
      marginTop: 4,
      background: 'none',
      border: 'none',
      color: 'var(--primary)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Usar archivo de ejemplo")), err && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '-6px 0 0',
      fontSize: 12,
      color: '#E54B4B'
    }
  }, err), /*#__PURE__*/React.createElement(TextField, {
    label: "Etiqueta",
    required: true,
    value: etiqueta,
    onChange: setEtiqueta,
    placeholder: "Ej: Bravo \u2014 Tarde"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(SelectField, {
    label: "Grupo",
    value: grupoId,
    onChange: setGrupoId,
    options: [{
      value: '',
      label: '—'
    }, ...grupos.map(g => ({
      value: g.id,
      label: g.nombre
    }))]
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Pol\xEDgono",
    value: poligonoId,
    onChange: setPoligonoId,
    options: [{
      value: '',
      label: '—'
    }, ...poligonos.map(p => ({
      value: p.id,
      label: p.nombre.split(' — ')[0]
    }))]
  })), /*#__PURE__*/React.createElement(TextField, {
    label: "Fecha de la jornada",
    type: "date",
    value: fecha,
    onChange: setFecha
  })));
}
function EliminarModal({
  tipo,
  nombre,
  extra,
  onCancel,
  onConfirm
}) {
  const {
    Modal,
    Button,
    Icon
  } = NSM;
  return /*#__PURE__*/React.createElement(Modal, {
    title: 'Eliminar ' + tipo,
    onClose: onCancel,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "md",
      icon: "trash-2",
      onClick: onConfirm
    }, "Eliminar"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: '#fee2e2',
      color: '#dc2626',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "triangle-alert",
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: 'var(--foreground)',
      lineHeight: 1.55
    }
  }, "\xBFEliminar ", /*#__PURE__*/React.createElement("strong", null, nombre), " del mapa?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 12,
      color: 'var(--muted-foreground)',
      lineHeight: 1.55
    }
  }, extra || 'Deja de verse en el mapa. El registro queda en la auditoría del operativo.'))));
}
function PuntoCeroModal({
  from,
  to,
  onCancel,
  onConfirm
}) {
  const {
    Modal,
    Button
  } = NSM;
  const d = window.Geo.length([[from.lat, from.lng], to]);
  const box = (l, v, on) => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '10px 12px',
      borderRadius: 8,
      background: on ? 'rgba(229,75,75,0.07)' : 'var(--muted)',
      border: on ? '1px solid rgba(229,75,75,0.3)' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--muted-foreground)'
    }
  }, l), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 12,
      color: 'var(--foreground)'
    }
  }, v));
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Actualizar Punto Cero",
    subtitle: "\xDAltimo punto de avistamiento (LSP)",
    icon: "crosshair",
    onClose: onCancel,
    width: 480,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      onClick: onConfirm
    }, "Confirmar punto"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, box('Actual', window.Geo.fmtCoord(from.lat, from.lng)), box('Nuevo', window.Geo.fmtCoord(to[0], to[1]), true)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: 'var(--muted-foreground)',
      lineHeight: 1.55
    }
  }, "El marcador se mueve ", window.Geo.fmtKm(d), ". Todos los usuarios del operativo van a ver el nuevo centro de operaciones.")));
}
Object.assign(window, {
  NuevoPoligonoModal,
  GpxModal,
  EliminarModal,
  PuntoCeroModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa-v1/ModalsV1.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa-v1/PanelsV1.jsx
try { (() => {
/* Paneles del mapa: lista lateral (izquierda) y detalle del elemento seleccionado (derecha). */
const {
  useState: useStateP,
  useEffect: useEffectP
} = React;
const NSP = window.DUARDiseOMapa_7e942c;
const ovP = {
  color: 'var(--muted-foreground)',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: 0
};
function Tabs({
  tabs,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      padding: 3,
      borderRadius: 10,
      background: 'var(--muted)'
    }
  }, tabs.map(t => {
    const on = t.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      onClick: () => onChange(t.id),
      style: {
        flex: 1,
        padding: '6px 8px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--card)' : 'transparent',
        boxShadow: on ? '0 1px 3px rgba(68,65,64,.14)' : 'none',
        color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 12,
        fontWeight: 600
      }
    }, t.label, " (", t.count, ")");
  }));
}
function Vacio({
  icon,
  titulo,
  texto,
  accion
}) {
  const {
    Icon
  } = NSP;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 8,
      padding: '28px 16px',
      borderRadius: 'var(--radius-card)',
      border: '1px dashed var(--border)',
      margin: '4px 0'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 26,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, titulo), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)',
      maxWidth: 240
    }
  }, texto), accion);
}
function LeftPanel({
  tab,
  setTab,
  poligonos,
  trazas,
  puntos,
  grupos,
  sel,
  onSelect,
  onToggleVis,
  onDibujar,
  onGpx,
  onMarcar,
  onClose
}) {
  const {
    ElementRow,
    FilterPill,
    Button,
    CoverageBar,
    Icon
  } = NSP;
  const [filtro, setFiltro] = useStateP('todos');
  const G = id => grupos.find(g => g.id === id);
  const estados = ['pendiente', 'asignado', 'rastrillando', 'completado'];
  const polFil = filtro === 'todos' ? poligonos : poligonos.filter(p => p.estado === filtro);
  const conCob = poligonos.filter(p => p.cobertura);
  const areaTot = conCob.reduce((s, p) => s + window.Geo.area(p.vertices), 0);
  const cobGral = areaTot ? conCob.reduce((s, p) => s + p.cobertura.pct * window.Geo.area(p.vertices), 0) / areaTot : null;
  const km = trazas.reduce((s, t) => s + window.Geo.length(t.puntos), 0);
  const isSel = (t, id) => sel && sel.type === t && sel.id === id;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 320,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      fontFamily: 'var(--font-family-primary)',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h2)',
      fontWeight: 700,
      color: 'var(--foreground)',
      lineHeight: 1.3
    }
  }, "Mapa operacional"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, poligonos.length, " pol\xEDgonos \xB7 ", trazas.length, " trazas \xB7 ", puntos.length, " puntos")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    title: "Ocultar panel",
    style: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panel-left-close",
    size: 16
  }))), /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      id: 'poligonos',
      label: 'Polígonos',
      count: poligonos.length
    }, {
      id: 'trazas',
      label: 'Trazas',
      count: trazas.length
    }, {
      id: 'puntos',
      label: 'Puntos',
      count: puntos.length
    }]
  }), tab === 'poligonos' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(FilterPill, {
    selected: filtro === 'todos',
    count: poligonos.length,
    onClick: () => setFiltro('todos')
  }, "Todos"), estados.map(e => /*#__PURE__*/React.createElement(FilterPill, {
    key: e,
    selected: filtro === e,
    count: poligonos.filter(p => p.estado === e).length,
    onClick: () => setFiltro(e)
  }, NSP.ESTADOS[e].label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '0 10px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, tab === 'poligonos' && (polFil.length ? polFil.map(p => {
    const gr = G(p.grupoId);
    return /*#__PURE__*/React.createElement(ElementRow, {
      key: p.id,
      color: gr ? gr.color : '#475569',
      icon: "pentagon",
      title: p.nombre,
      meta: (gr ? gr.nombre : 'Sin grupo') + ' · ' + window.Geo.fmtArea(window.Geo.area(p.vertices)) + (p.cobertura ? ' · ' + Math.round(p.cobertura.pct) + '% cubierto' : ''),
      estado: p.estado,
      selected: isSel('poligono', p.id),
      visible: p.visible,
      onClick: () => onSelect({
        type: 'poligono',
        id: p.id
      }, p.vertices),
      onToggleVisible: () => onToggleVis('poligonos', p.id)
    });
  }) : /*#__PURE__*/React.createElement(Vacio, {
    icon: "pentagon",
    titulo: poligonos.length ? 'Ningún polígono en este estado' : 'Aún no hay polígonos dibujados',
    texto: "Dibuj\xE1 los sectores de rastrillaje sobre el mapa y asignalos a un grupo.",
    accion: /*#__PURE__*/React.createElement(Button, {
      icon: "pentagon",
      onClick: onDibujar
    }, "Dibujar pol\xEDgono")
  })), tab === 'trazas' && (trazas.length ? trazas.map(t => {
    const gr = G(t.grupoId);
    return /*#__PURE__*/React.createElement(ElementRow, {
      key: t.id,
      color: gr ? gr.color : '#444140',
      icon: "route",
      title: t.etiqueta,
      meta: window.Geo.fmtKm(window.Geo.length(t.puntos)) + ' · ' + t.duracion + ' · ' + t.fecha.split('-').reverse().join('/'),
      selected: isSel('traza', t.id),
      visible: t.visible,
      onClick: () => onSelect({
        type: 'traza',
        id: t.id
      }, t.puntos),
      onToggleVisible: () => onToggleVis('trazas', t.id)
    });
  }) : /*#__PURE__*/React.createElement(Vacio, {
    icon: "route",
    titulo: "Sin trazas cargadas",
    texto: "Sub\xED el archivo .gpx que exportan los l\xEDderes desde Wikiloc al final de la jornada.",
    accion: /*#__PURE__*/React.createElement(Button, {
      icon: "upload",
      onClick: onGpx
    }, "Cargar GPX")
  })), tab === 'puntos' && (puntos.length ? puntos.map(p => {
    const c = NSP.TIPOS_MARCADOR[p.tipo];
    return /*#__PURE__*/React.createElement(ElementRow, {
      key: p.id,
      color: c.color,
      icon: c.icon,
      title: p.nombre,
      meta: c.label + (p.descripcion ? ' · ' + p.descripcion : ''),
      selected: isSel('punto', p.id),
      onClick: () => onSelect({
        type: 'punto',
        id: p.id
      }, [[p.lat, p.lng]])
    });
  }) : /*#__PURE__*/React.createElement(Vacio, {
    icon: "map-pin",
    titulo: "Sin puntos marcados",
    texto: "Marc\xE1 pistas, hallazgos o referencias del terreno.",
    accion: /*#__PURE__*/React.createElement(Button, {
      icon: "map-pin-plus",
      onClick: onMarcar
    }, "Marcar punto")
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: 'var(--card)'
    }
  }, cobGral != null ? /*#__PURE__*/React.createElement(CoverageBar, {
    value: cobGral,
    label: "Cobertura calculada"
  }) : /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Calcul\xE1 la cobertura desde el detalle de cada pol\xEDgono."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "KM rastrillados"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, window.Geo.fmtKm(km))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Completados"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, poligonos.filter(p => p.estado === 'completado').length, " / ", poligonos.length)))));
}
function DetailShell({
  tipoIcon,
  color,
  bg,
  title,
  badge,
  onClose,
  sub,
  children,
  footer
}) {
  const {
    Icon
  } = NSP;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 340,
      maxWidth: '100%',
      zIndex: 800,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--card)',
      borderLeft: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: tipoIcon,
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--foreground)',
      lineHeight: 1.25,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, badge))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: 'var(--muted)',
      borderBottom: '1px solid var(--border)',
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "crosshair",
    size: 12
  }), sub), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderTop: '1px solid var(--border)',
      display: 'flex',
      gap: 8
    }
  }, footer));
}
const pill = (txt, color) => /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: color + '1f',
    color,
    fontSize: 10,
    fontWeight: 600
  }
}, txt);
function PoligonoPanel({
  pol,
  grupos,
  poligonos,
  trazas,
  onClose,
  onPatch,
  onAsignar,
  onCalcular,
  calculando,
  onEditGeom,
  onDelete,
  brechas,
  onToggleBrechas,
  onSelectTraza
}) {
  const {
    StatusBadge,
    CoverageBar,
    Button,
    TextField,
    Icon,
    ESTADOS
  } = NSP;
  const [nombre, setNombre] = useStateP(pol.nombre);
  useEffectP(() => setNombre(pol.nombre), [pol.id]);
  const gr = grupos.find(g => g.id === pol.grupoId);
  const color = gr ? gr.color : '#475569';
  const tz = trazas.filter(t => t.poligonoId === pol.id);
  const area = window.Geo.area(pol.vertices),
    per = window.Geo.length(pol.vertices, true);
  const estados = ['pendiente', 'asignado', 'rastrillando', 'completado'];
  return /*#__PURE__*/React.createElement(DetailShell, {
    tipoIcon: "pentagon",
    color: color,
    bg: color + '1f',
    title: pol.nombre,
    badge: /*#__PURE__*/React.createElement(StatusBadge, {
      estado: pol.estado,
      size: "sm"
    }),
    onClose: onClose,
    sub: 'Área ' + window.Geo.fmtArea(area) + ' · Perímetro ' + window.Geo.fmtKm(per),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      icon: "spline",
      onClick: onEditGeom,
      style: {
        flex: 1
      }
    }, "Editar geometr\xEDa"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "trash-2",
      onClick: onDelete,
      style: {
        color: '#dc2626'
      }
    }, "Eliminar"))
  }, /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nombre",
    value: nombre,
    onChange: setNombre
  }), nombre !== pol.nombre && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: -10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "save",
    onClick: () => onPatch({
      nombre
    })
  }, "Guardar nombre")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Estado del pol\xEDgono"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6
    }
  }, estados.map(e => {
    const on = pol.estado === e,
      c = ESTADOS[e];
    const bloqueado = !pol.grupoId && (e === 'asignado' || e === 'rastrillando');
    return /*#__PURE__*/React.createElement("button", {
      key: e,
      type: "button",
      disabled: bloqueado,
      title: bloqueado ? 'Primero asigná un grupo' : '',
      onClick: () => onPatch({
        estado: e
      }),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 10px',
        borderRadius: 8,
        cursor: bloqueado ? 'not-allowed' : 'pointer',
        opacity: bloqueado ? 0.4 : 1,
        border: on ? '1.5px solid ' + c.dot : '1.5px solid var(--border)',
        background: on ? c.bg : 'transparent',
        color: on ? c.text : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 12,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: c.dot
      }
    }), c.label, on && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    })));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Grupo asignado"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, [{
    id: null
  }, ...grupos].map(g => {
    const on = (pol.grupoId || null) === g.id;
    const otro = g.id && poligonos.find(p => p.grupoId === g.id && p.id !== pol.id);
    return /*#__PURE__*/React.createElement("button", {
      key: g.id || 'none',
      type: "button",
      onClick: () => onAsignar(g.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        border: on ? '1.5px solid ' + (g.color || 'var(--border)') : '1.5px solid transparent',
        background: on ? g.color ? g.color + '12' : 'var(--muted)' : 'var(--muted)',
        fontFamily: 'var(--font-family-primary)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: g.color || 'transparent',
        border: g.color ? 'none' : '1.5px dashed var(--muted-foreground)',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--foreground)'
      }
    }, g.id ? g.nombre : 'Sin asignar'), g.id && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 10.5,
        color: 'var(--muted-foreground)'
      }
    }, "L\xEDder ", g.lider, " \xB7 ", g.integrantes, " integrantes", otro ? ' · en ' + otro.nombre.split(' — ')[0] : '')), g.id && /*#__PURE__*/React.createElement(StatusBadge, {
      estado: g.estado,
      size: "sm"
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Cobertura por GPX"), pol.cobertura ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CoverageBar, {
    value: pol.cobertura.pct,
    label: ""
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, window.Geo.fmtKm(pol.cobertura.kmDentro * 1000), " recorridos dentro del sector \xB7 ", pol.cobertura.gaps.length, " celdas sin cubrir \xB7 calculado ", pol.cobertura.hora), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--foreground)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: brechas,
    onChange: onToggleBrechas,
    style: {
      accentColor: 'var(--primary)',
      margin: 0
    }
  }), "Mostrar brechas en el mapa"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "muted",
    icon: "refresh-cw",
    onClick: onCalcular,
    disabled: calculando || !tz.length
  }, calculando ? 'Calculando…' : 'Recalcular'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, tz.length ? 'Cruza las trazas GPX con el área del polígono y marca las zonas que quedaron sin recorrer.' : 'Este polígono todavía no tiene trazas GPX asociadas.'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    icon: calculando ? 'loader-circle' : 'scan',
    onClick: onCalcular,
    disabled: calculando || !tz.length
  }, calculando ? 'Calculando…' : 'Calcular cobertura')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Trazas en este pol\xEDgono \xB7 ", tz.length), tz.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    onClick: () => onSelectTraza(t.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 8,
      border: 'none',
      background: 'var(--muted)',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 13,
    color: color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, t.etiqueta), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, window.Geo.fmtKm(window.Geo.length(t.puntos)))))), pol.notas ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Notas"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 12.5,
      color: 'var(--foreground)',
      lineHeight: 1.55
    }
  }, pol.notas)) : null);
}
function TrazaPanel({
  t,
  grupos,
  poligonos,
  onClose,
  onSave,
  onDelete
}) {
  const {
    TextField,
    SelectField,
    Button
  } = NSP;
  const [f, setF] = useStateP(t);
  useEffectP(() => setF(t), [t.id]);
  const gr = grupos.find(g => g.id === f.grupoId);
  const color = gr ? gr.color : '#444140';
  const dirty = ['etiqueta', 'grupoId', 'poligonoId', 'fecha', 'notas'].some(k => f[k] !== t[k]);
  const stat = (l, v) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      borderRadius: 8,
      background: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, l), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '3px 0 0',
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, v));
  return /*#__PURE__*/React.createElement(DetailShell, {
    tipoIcon: "route",
    color: color,
    bg: color + '1f',
    title: t.etiqueta,
    badge: pill('Traza GPX · ' + t.archivo, color),
    onClose: onClose,
    sub: 'Inicio ' + window.Geo.fmtCoord(t.puntos[0][0], t.puntos[0][1]),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "save",
      disabled: !dirty,
      onClick: () => onSave(f),
      style: {
        flex: 1
      }
    }, "Guardar cambios"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "trash-2",
      onClick: onDelete,
      style: {
        color: '#dc2626'
      }
    }, "Eliminar"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 6
    }
  }, stat('Distancia', window.Geo.fmtKm(window.Geo.length(t.puntos))), stat('Duración', t.duracion.replace(' min', '′')), stat('Puntos', t.puntos.length)), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Etiqueta",
    value: f.etiqueta,
    onChange: v => setF({
      ...f,
      etiqueta: v
    })
  }), /*#__PURE__*/React.createElement(SelectField, {
    overline: true,
    label: "Grupo",
    value: f.grupoId || '',
    onChange: v => setF({
      ...f,
      grupoId: v || null
    }),
    options: [{
      value: '',
      label: '— Sin grupo —'
    }, ...grupos.map(g => ({
      value: g.id,
      label: g.nombre
    }))]
  }), /*#__PURE__*/React.createElement(SelectField, {
    overline: true,
    label: "Pol\xEDgono",
    value: f.poligonoId || '',
    onChange: v => setF({
      ...f,
      poligonoId: v || null
    }),
    options: [{
      value: '',
      label: '— Fuera de polígono —'
    }, ...poligonos.map(p => ({
      value: p.id,
      label: p.nombre
    }))]
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Fecha",
    type: "date",
    value: f.fecha,
    onChange: v => setF({
      ...f,
      fecha: v
    })
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Notas",
    multiline: true,
    rows: 3,
    value: f.notas,
    onChange: v => setF({
      ...f,
      notas: v
    }),
    placeholder: "Observaciones del l\xEDder sobre el recorrido\u2026"
  }));
}
function PuntoPanel({
  p,
  onClose,
  onSave,
  onDelete
}) {
  const {
    TextField,
    Button,
    Icon,
    TIPOS_MARCADOR
  } = NSP;
  const [f, setF] = useStateP(p);
  useEffectP(() => setF(p), [p.id]);
  const c = TIPOS_MARCADOR[f.tipo];
  const dirty = ['tipo', 'nombre', 'descripcion', 'detalle'].some(k => f[k] !== p[k]);
  return /*#__PURE__*/React.createElement(DetailShell, {
    tipoIcon: c.icon,
    color: c.color,
    bg: c.bg,
    title: f.nombre || 'Sin nombre',
    badge: pill(c.label, c.color),
    onClose: onClose,
    sub: window.Geo.fmtCoord(p.lat, p.lng),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "save",
      disabled: !dirty,
      onClick: () => onSave(f),
      style: {
        flex: 1
      }
    }, "Guardar cambios"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "trash-2",
      onClick: onDelete,
      style: {
        color: '#dc2626'
      }
    }, "Eliminar"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Tipo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6
    }
  }, ['poi', 'hallazgo'].map(tp => {
    const k = TIPOS_MARCADOR[tp],
      on = f.tipo === tp;
    return /*#__PURE__*/React.createElement("button", {
      key: tp,
      type: "button",
      onClick: () => setF({
        ...f,
        tipo: tp
      }),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        border: on ? '1.5px solid ' + k.color : '1.5px solid var(--border)',
        background: on ? k.bg : 'transparent',
        color: on ? k.color : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 12,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: k.icon,
      size: 13
    }), k.label);
  }))), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nombre",
    value: f.nombre,
    onChange: v => setF({
      ...f,
      nombre: v
    })
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Descripci\xF3n",
    value: f.descripcion,
    onChange: v => setF({
      ...f,
      descripcion: v
    }),
    placeholder: "Descripci\xF3n breve\u2026"
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Detalle / Notas de pista",
    multiline: true,
    rows: 5,
    value: f.detalle,
    onChange: v => setF({
      ...f,
      detalle: v
    }),
    placeholder: "Ingres\xE1 informaci\xF3n detallada: condiciones del lugar, evidencias encontradas, observaciones, hora de hallazgo\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Fotos de pista"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: 22,
      borderRadius: 12,
      border: '2px dashed var(--border)',
      background: 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image-off",
    size: 26,
    style: {
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      textAlign: 'center'
    }
  }, "Sin fotos cargadas.", /*#__PURE__*/React.createElement("br", null), "Hac\xE9 clic o arrastr\xE1 im\xE1genes aqu\xED"))));
}
function PuntoCeroPanel({
  pc,
  onClose,
  onMover
}) {
  const {
    Button,
    TIPOS_MARCADOR
  } = NSP;
  const c = TIPOS_MARCADOR.puntoCero;
  return /*#__PURE__*/React.createElement(DetailShell, {
    tipoIcon: c.icon,
    color: c.color,
    bg: c.bg,
    title: "Punto Cero (LSP)",
    badge: pill('Último punto de avistamiento', c.color),
    onClose: onClose,
    sub: window.Geo.fmtCoord(pc.lat, pc.lng),
    footer: /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "crosshair",
      onClick: onMover,
      fullWidth: true
    }, "Actualizar Punto Cero")
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--foreground)',
      lineHeight: 1.6
    }
  }, pc.descripcion), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "\xDAltima actualizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 13,
      color: 'var(--foreground)'
    }
  }, pc.actualizado)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, "Es el centro del operativo: el clima y los c\xE1lculos de distancia se toman desde este punto. Cada cambio queda en la auditor\xEDa."));
}
function ComandoPanel({
  pc,
  puntoCero,
  onClose
}) {
  const {
    TIPOS_MARCADOR
  } = NSP;
  const c = TIPOS_MARCADOR.puestoComando;
  const d = window.Geo.length([[pc.lat, pc.lng], [puntoCero.lat, puntoCero.lng]]);
  return /*#__PURE__*/React.createElement(DetailShell, {
    tipoIcon: c.icon,
    color: c.color,
    bg: c.bg,
    title: pc.nombre,
    badge: pill('Instalación SCI', c.color),
    onClose: onClose,
    sub: window.Geo.fmtCoord(pc.lat, pc.lng)
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--foreground)',
      lineHeight: 1.6
    }
  }, "Lugar donde se encuentra la mesa coordinadora. A ", window.Geo.fmtKm(d), " del Punto Cero."));
}
Object.assign(window, {
  LeftPanel,
  PoligonoPanel,
  TrazaPanel,
  PuntoPanel,
  PuntoCeroPanel,
  ComandoPanel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa-v1/PanelsV1.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa-v1/data.js
try { (() => {
/* Datos de ejemplo del Módulo 5 (Mapa Operacional) + geometría. Todo en window.MapaData / window.Geo. */
(function () {
  const R = 6371000;
  const toXY = (lat, lng, lat0) => [lng * Math.PI / 180 * R * Math.cos(lat0 * Math.PI / 180), lat * Math.PI / 180 * R];
  const lat0Of = pts => pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const Geo = {
    area(poly) {
      if (!poly || poly.length < 3) return 0;
      const l0 = lat0Of(poly);
      const xy = poly.map(p => toXY(p[0], p[1], l0));
      let a = 0;
      for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i],
          [x2, y2] = xy[(i + 1) % xy.length];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(a / 2);
    },
    length(pts, closed) {
      if (!pts || pts.length < 2) return 0;
      const l0 = lat0Of(pts);
      let d = 0;
      const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = toXY(...pts[i], l0),
          b = toXY(...pts[(i + 1) % pts.length], l0);
        d += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      return d;
    },
    inside(pt, poly) {
      let c = false;
      const [y, x] = pt;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [yi, xi] = poly[i],
          [yj, xj] = poly[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    },
    /** CU-38: muestrea una grilla dentro del polígono; una celda está cubierta si alguna traza pasa a < radio metros. */
    coverage(poly, trazas, spacing = 45, radio = 38) {
      const l0 = lat0Of(poly);
      const dLat = spacing / 110540,
        dLng = spacing / (111320 * Math.cos(l0 * Math.PI / 180));
      const lats = poly.map(p => p[0]),
        lngs = poly.map(p => p[1]);
      const segs = [];
      trazas.forEach(t => {
        const xy = t.puntos.map(p => toXY(p[0], p[1], l0));
        for (let i = 0; i < xy.length - 1; i++) segs.push([xy[i], xy[i + 1]]);
      });
      const cells = [];
      let cov = 0,
        total = 0,
        dentro = 0;
      for (let la = Math.min(...lats) + dLat / 2; la < Math.max(...lats); la += dLat) {
        for (let ln = Math.min(...lngs) + dLng / 2; ln < Math.max(...lngs); ln += dLng) {
          if (!Geo.inside([la, ln], poly)) continue;
          total++;
          const [px, py] = toXY(la, ln, l0);
          let ok = false;
          for (const [a, b] of segs) {
            const vx = b[0] - a[0],
              vy = b[1] - a[1],
              L = vx * vx + vy * vy;
            let t = L ? ((px - a[0]) * vx + (py - a[1]) * vy) / L : 0;
            t = Math.max(0, Math.min(1, t));
            if (Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy)) < radio) {
              ok = true;
              break;
            }
          }
          if (ok) cov++;else cells.push([la, ln]);
        }
      }
      trazas.forEach(t => t.puntos.forEach((p, i) => {
        if (i && Geo.inside(p, poly)) dentro += Geo.length([t.puntos[i - 1], p]);
      }));
      return {
        pct: total ? cov / total * 100 : 0,
        gaps: cells,
        dLat,
        dLng,
        kmDentro: dentro / 1000
      };
    },
    fmtArea: m2 => (m2 / 1e6).toLocaleString('es-AR', {
      maximumFractionDigits: 2
    }) + ' km²',
    fmtKm: m => (m / 1000).toLocaleString('es-AR', {
      maximumFractionDigits: 1
    }) + ' km',
    fmtCoord: (lat, lng) => lat.toFixed(5) + '°, ' + lng.toFixed(5) + '°',
    centroid(poly) {
      return [lat0Of(poly), poly.reduce((s, p) => s + p[1], 0) / poly.length];
    }
  };

  /* Recorrido "cortadora de césped" dentro del polígono, como el que deja Wikiloc en un rastrillaje. */
  function barrido(poly, fraccion, filas, semilla) {
    let s = semilla || 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const lats = poly.map(p => p[0]),
      lngs = poly.map(p => p[1]);
    const top = Math.max(...lats) - 0.0003,
      bot = Math.min(...lats) + 0.0003;
    const west = Math.min(...lngs),
      east = Math.max(...lngs);
    const n = Math.max(2, Math.round(filas * fraccion));
    const step = (top - bot) / (filas - 1);
    const pts = [];
    for (let r = 0; r < n; r++) {
      const la = top - r * step;
      const fila = [];
      for (let k = 0; k <= 16; k++) {
        const p = [la + (rnd() - 0.5) * step * 0.35, west + (east - west) * k / 16];
        if (Geo.inside(p, poly)) fila.push(p);
      }
      if (r % 2) fila.reverse();
      pts.push(...fila);
    }
    return pts;
  }
  const P = {
    s1: [[-31.9680, -64.9450], [-31.9700, -64.9280], [-31.9800, -64.9300], [-31.9790, -64.9480]],
    s2: [[-31.9700, -64.9280], [-31.9680, -64.9100], [-31.9810, -64.9080], [-31.9800, -64.9300]],
    s3: [[-31.9800, -64.9300], [-31.9810, -64.9080], [-31.9940, -64.9120], [-31.9930, -64.9310]],
    s4: [[-31.9790, -64.9480], [-31.9800, -64.9300], [-31.9930, -64.9310], [-31.9910, -64.9500]]
  };
  const grupos = [{
    id: 'g1',
    nombre: 'Grupo Alfa',
    color: '#E54B4B',
    estado: 'replegado',
    lider: 'Lucía Zamora',
    integrantes: 6
  }, {
    id: 'g2',
    nombre: 'Grupo Bravo',
    color: '#2563EB',
    estado: 'rastrillando',
    lider: 'Ramiro Sosa',
    integrantes: 7
  }, {
    id: 'g3',
    nombre: 'Grupo Charlie',
    color: '#16A34A',
    estado: 'desplegado',
    lider: 'Camila Morales',
    integrantes: 5
  }, {
    id: 'g4',
    nombre: 'Grupo Delta',
    color: '#D97706',
    estado: 'confirmado',
    lider: 'Martín Aguirre',
    integrantes: 6
  }, {
    id: 'g5',
    nombre: 'Canes K9',
    color: '#7C3AED',
    estado: 'en_espera',
    lider: 'Diego Herrera',
    integrantes: 3,
    especial: true
  }];
  const poligonos = [{
    id: 'p1',
    nombre: 'Sector 1 — Arroyo Seco',
    grupoId: 'g1',
    estado: 'completado',
    vertices: P.s1,
    notas: 'Zona de pastizal con dos pircas. Terreno firme.',
    visible: true
  }, {
    id: 'p2',
    nombre: 'Sector 2 — Quebrada Norte',
    grupoId: 'g2',
    estado: 'rastrillando',
    vertices: P.s2,
    notas: 'Pendiente fuerte en el borde este.',
    visible: true
  }, {
    id: 'p3',
    nombre: 'Sector 3 — Filo del Cerro',
    grupoId: 'g3',
    estado: 'asignado',
    vertices: P.s3,
    notas: '',
    visible: true
  }, {
    id: 'p4',
    nombre: 'Sector 4 — Bosque de Tabaquillos',
    grupoId: null,
    estado: 'pendiente',
    vertices: P.s4,
    notas: 'Vegetación cerrada, requiere caminantes.',
    visible: true
  }];
  const trazas = [{
    id: 't1',
    etiqueta: 'Alfa — Jornada 1',
    grupoId: 'g1',
    poligonoId: 'p1',
    fecha: '2026-03-01',
    duracion: '3 h 40 min',
    archivo: 'alfa_0103.gpx',
    notas: '',
    puntos: barrido(P.s1, 1, 16, 3),
    visible: true
  }, {
    id: 't2',
    etiqueta: 'Alfa — Jornada 2',
    grupoId: 'g1',
    poligonoId: 'p1',
    fecha: '2026-03-02',
    duracion: '1 h 05 min',
    archivo: 'alfa_0203.gpx',
    notas: 'Repaso del borde sur.',
    puntos: barrido(P.s1.map(p => [p[0] - 0.0004, p[1]]), 0.35, 6, 11),
    visible: true
  }, {
    id: 't3',
    etiqueta: 'Bravo — Mañana',
    grupoId: 'g2',
    poligonoId: 'p2',
    fecha: '2026-03-02',
    duracion: '2 h 15 min',
    archivo: 'bravo_0203_am.gpx',
    notas: 'Reporte de media mañana.',
    puntos: barrido(P.s2, 0.5, 16, 5),
    visible: true
  }];
  const puntos = [{
    id: 'i1',
    tipo: 'hallazgo',
    nombre: 'Prenda roja',
    lat: -31.9742,
    lng: -64.9205,
    descripcion: 'Campera roja talle M',
    detalle: 'Encontrada por Grupo Bravo a 30 m del sendero, 10:42 h. Coincide con la vestimenta del objetivo.',
    fotos: 0
  }, {
    id: 'i2',
    tipo: 'poi',
    nombre: 'Refugio abandonado',
    lat: -31.9868,
    lng: -64.9395,
    descripcion: 'Puesto de piedra sin techo',
    detalle: '',
    fotos: 0
  }, {
    id: 'i3',
    tipo: 'poi',
    nombre: 'Cruce de arroyo',
    lat: -31.9765,
    lng: -64.9345,
    descripcion: 'Vado con piedras sueltas',
    detalle: 'Peligroso con lluvia.',
    fotos: 0
  }];
  window.Geo = Geo;
  window.MapaData = {
    barrido,
    centro: [-31.981, -64.929],
    operativo: {
      nombre: 'Búsqueda Cerro Champaquí',
      estado: 'activo',
      ubicacion: 'Cerro Champaquí, Córdoba',
      fechaInicio: '28/2/2026',
      dia: 3,
      clima: {
        temperatura: 14,
        descripcion: 'Parcialmente nublado'
      }
    },
    usuario: {
      nombre: 'Miguel',
      apellido: 'Giménez',
      rol: 'coordinador',
      email: 'mgimenez@duar.gob.ar'
    },
    puntoCero: {
      lat: -31.9812,
      lng: -64.9262,
      actualizado: '28/2/2026 18:20',
      descripcion: 'Último punto de avistamiento (LSP). Estacionamiento del sendero al Champaquí.'
    },
    puestoComando: {
      lat: -31.9965,
      lng: -64.9080,
      nombre: 'Puesto de Comando'
    },
    grupos,
    poligonos,
    trazas,
    puntos,
    bases: [{
      id: 'politico',
      label: 'Político',
      icon: 'map',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap'
    }, {
      id: 'fisico',
      label: 'Físico',
      icon: 'mountain',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap (CC-BY-SA)'
    }, {
      id: 'satelital',
      label: 'Satelital',
      icon: 'satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri'
    }]
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa-v1/data.js", error: String((e && e.message) || e) }); }

// ui_kits/mapa/App.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Módulo 5 — Mapa Operacional (CU-26 a CU-38). Organización tipo Google Earth: árbol a la izquierda, controles sobre el mapa, globos de información y detalle de sector a la derecha. */
const {
  useState,
  useEffect,
  useRef
} = React;
const NS = window.DUARDiseOMapa_7e942c;
const D = window.MapaData;
const uid = p => p + Math.random().toString(36).slice(2, 7);
const hora = () => new Date().toLocaleTimeString('es-AR', {
  hour: '2-digit',
  minute: '2-digit'
});
window.formaDesde = (tipo, c, ll) => {
  const kx = 111320 * Math.cos(c[0] * Math.PI / 180),
    dy = (ll[0] - c[0]) * 111320,
    dx = (ll[1] - c[1]) * kx;
  const m = ([y, x]) => [c[0] + y / 111320, c[1] + x / kx];
  if (tipo === 'circulo') {
    const r = Math.hypot(dx, dy);
    return Array.from({
      length: 48
    }, (_, i) => m([r * Math.sin(i * Math.PI / 24), r * Math.cos(i * Math.PI / 24)]));
  }
  const h = Math.max(Math.abs(dx), Math.abs(dy));
  return [[h, -h], [h, h], [-h, h], [-h, -h]].map(m);
};
// Forma por arrastre libre: desde el punto donde se pulsa hasta donde se suelta (no hace falta pulsar en el centro)
window.formaArrastre = (tipo, a, b) => {
  const kx = 111320 * Math.cos(a[0] * Math.PI / 180),
    dy = (b[0] - a[0]) * 111320,
    dx = (b[1] - a[1]) * kx;
  if (tipo === 'circulo') return window.formaDesde('circulo', [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b);
  const l = Math.max(Math.abs(dx), Math.abs(dy)),
    sx = dx < 0 ? -1 : 1,
    sy = dy < 0 ? -1 : 1;
  const m = ([y, x]) => [a[0] + y / 111320, a[1] + x / kx];
  return [[0, 0], [0, sx * l], [sy * l, sx * l], [sy * l, 0]].map(m);
};
const ahora = () => {
  const d = new Date(),
    z = n => String(n).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
};
const OV0 = {
  herramientas: true,
  zoom: true,
  escala: true,
  poligonos: true,
  trazas: true,
  marcadores: true,
  puntoCero: true,
  instalaciones: true,
  poi: true,
  hallazgos: true,
  etiquetas: true,
  brechas: false,
  leyenda: true,
  radios: true,
  coords: true,
  gruposFlot: true
};
const LEYENDA = [{
  kind: 'line',
  color: '#2563EB',
  label: 'Track GPX (color del grupo)'
}, {
  kind: 'area',
  color: '#16A34A',
  label: 'Sector asignado'
}, {
  kind: 'areaDashed',
  color: '#475569',
  label: 'Sector pendiente'
}, {
  kind: 'ring',
  color: '#7C3AED',
  label: 'Radio desde Punto Cero'
}, {
  kind: 'gap',
  label: 'Brecha sin cubrir'
}, {
  kind: 'marker',
  tipo: 'puntoCero',
  label: 'Punto Cero (LSP)'
}, {
  kind: 'marker',
  tipo: 'puestoComando',
  label: 'Puesto de Comando'
}, {
  kind: 'marker',
  tipo: 'base',
  label: 'Otras instalaciones SCI'
}, {
  kind: 'marker',
  tipo: 'hallazgo',
  label: 'Hallazgo'
}, {
  kind: 'marker',
  tipo: 'poi',
  label: 'Punto de interés'
}];
function Placeholder({
  label,
  icon
}) {
  const {
    Icon
  } = NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 20,
      fontWeight: 700
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: 56,
      borderRadius: 'var(--radius-card)',
      background: 'var(--card)',
      border: '1px dashed var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 32,
    color: "var(--muted-foreground)",
    style: {
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600
    }
  }, "Fuera del alcance de este kit"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Este UI kit cubre el M\xF3dulo 5 (Mapa). Volv\xE9 a \"Mapa\" en el men\xFA.")));
}
const EMBED = new URLSearchParams(location.search).get('embed') === '1' || (() => {
  try {
    return !!(window.frameElement && window.frameElement.hasAttribute('data-embed'));
  } catch (e) {
    return false;
  }
})();
function App() {
  const {
    Sidebar,
    OperativoHeader,
    MapToolbar,
    MapLegend,
    Icon,
    ESTADOS
  } = NS;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const f = () => {
      setDark(document.documentElement.classList.contains('dark'));
      setRev(r => r + 1);
    };
    window.addEventListener('duar-paleta', f);
    return () => window.removeEventListener('duar-paleta', f);
  }, []);
  const [modulo, setModulo] = useState('Mapa');
  const [pols, setPols] = useState(D.poligonos);
  const [trazas, setTrazas] = useState(D.trazas);
  const [puntos, setPuntos] = useState(D.puntos);
  const [inst, setInst] = useState(D.instalaciones);
  const [grupos, setGrupos] = useState(D.grupos);
  const [p0, setP0] = useState(D.puntoCero);
  const [radios, setRadios] = useState(D.radios);
  const [base, setBase] = useState('satelital');
  const [overlays, setOverlays] = useState(OV0);
  const [tool, setTool] = useState('select');
  const [sel, setSel] = useState(null);
  const [popup, setPopup] = useState(null);
  const [draft, setDraft] = useState([]);
  const [measure, setMeasure] = useState([]);
  const [editVerts, setEditVerts] = useState(null);
  const [moving, setMoving] = useState(null);
  const [modal, setModal] = useState(null);
  const [left, setLeft] = useState(true);
  const [inmersivo, setInmersivo] = useState(false);
  const [open, setOpen] = useState({
    sectores: true,
    radios: true,
    tracks: false,
    marcadores: false,
    capas: false
  });
  const [q, setQ] = useState('');
  const [gruposOpen, setGruposOpen] = useState(false);
  const [basePop, setBasePop] = useState(false);
  const [toast, setToast] = useState(null);
  const [calc, setCalc] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const mapRef = useRef(null);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  useEffect(() => {
    setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 230);
  }, [left, modulo, inmersivo]);
  const avisar = (msg, icon, color) => {
    setToast({
      msg,
      icon,
      color
    });
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 2600);
  };
  const setOv = (k, v) => setOverlays(o => ({
    ...o,
    [k]: v
  }));
  const patchRadio = (id, patch) => setRadios(rs => rs.map(r => r.id === id ? {
    ...r,
    ...patch
  } : r));
  const delRadio = id => {
    const r = radios.find(x => x.id === id);
    setRadios(rs => rs.filter(x => x.id !== id));
    avisar('Radio de ' + window.Geo.fmtRadio(r.km) + ' quitado', 'circle-dot', 'var(--muted-foreground)');
  };
  const addRadio = km => {
    if (radios.some(r => r.km === km)) {
      avisar('Ya existe un radio de ' + window.Geo.fmtRadio(km), 'info', 'var(--muted-foreground)');
      return;
    }
    const pal = D.paletaRadios,
      usados = radios.map(r => r.color);
    const color = pal.find(c => !usados.includes(c)) || pal[radios.length % pal.length];
    setRadios(rs => [...rs, {
      id: uid('r'),
      km,
      color,
      visible: true
    }]);
    setOv('radios', true);
    avisar('Radio de ' + window.Geo.fmtRadio(km) + ' agregado', 'circle-dot', color);
  };
  const fly = (pts, extra) => setFlyTo({
    pts,
    k: Math.random(),
    ...extra
  });
  const abrirPopup = (type, id, latlng, conVuelo) => {
    const off = type === 'traza' ? -4 : type === 'puntoCero' ? -42 : -38;
    const go = () => setPopup({
      type,
      id,
      latlng,
      offset: off,
      k: Math.random()
    });
    if (conVuelo) {
      setPopup(null);
      fly([latlng], {
        then: go
      });
    } else go();
  };
  const cancelarModo = () => {
    setTool('select');
    setDraft([]);
    setMeasure([]);
    setEditVerts(null);
    setMoving(null);
  };
  const elegirTool = id => {
    if (id === 'gpx') {
      setModal({
        type: 'gpx'
      });
      return;
    }
    cancelarModo();
    setTool(id);
    if (id !== 'select') setPopup(null);
  };
  const terminarPoligono = () => {
    const v = draft.filter((p, i) => i === 0 || window.Geo.length([draft[i - 1], p]) > 5);
    if (v.length >= 3) setModal({
      type: 'nuevoPoligono',
      vertices: v
    });
  };
  useEffect(() => {
    const k = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && !modal) {
        cancelarModo();
        setPopup(null);
        setBasePop(false);
      }
      if (e.key === 'Enter' && tool === 'poligono' && !modal) terminarPoligono();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  const onMapClick = ll => {
    setBasePop(false);
    if (moving) {
      setMoving(m => ({
        ...m,
        ll
      }));
      return;
    }
    if (tool === 'poligono') setDraft(d => [...d, ll]);else if (tool === 'circulo' || tool === 'cuadrado') return;else if (tool === 'medir') setMeasure(m => [...m, ll]);else if (tool === 'poi' || tool === 'hallazgo') {
      const p = {
        id: uid('i'),
        tipo: tool,
        nombre: tool === 'poi' ? 'Nuevo punto de interés' : 'Nuevo hallazgo',
        lat: ll[0],
        lng: ll[1],
        descripcion: '',
        detalle: '',
        visible: true
      };
      setPuntos(x => [...x, p]);
      setSel({
        type: 'punto',
        id: p.id
      });
      setTool('select');
      setOpen(o => ({
        ...o,
        marcadores: true
      }));
      avisar('Marcador creado. Completá sus datos en el panel.');
    } else if (tool === 'instalacion') setModal({
      type: 'instalacion',
      ll
    });else if (tool === 'puntoCero') setModal({
      type: 'puntoCero',
      to: ll
    });else if (!editVerts) {
      setPopup(null);
      setSel(null);
    }
  };
  const onSelectMap = (s, ll) => {
    if (s.type === 'poligono') {
      setSel(s);
      setPopup(null);
    } else abrirPopup(s.type, s.id, ll);
  };
  const patchPol = (id, patch) => setPols(ps => ps.map(p => p.id === id ? {
    ...p,
    ...patch
  } : p));
  const asignar = (pol, gid) => {
    const prev = pol.grupoId,
      f = ahora();
    const hist = [...(pol.historial || []), ...(prev ? [{
      ev: 'quitado',
      grupoId: prev,
      fecha: f
    }] : []), ...(gid ? [{
      ev: 'asignado',
      grupoId: gid,
      fecha: f
    }] : [])];
    patchPol(pol.id, {
      grupoId: gid,
      historial: hist,
      estado: gid ? pol.estado === 'pendiente' ? 'asignado' : pol.estado : 'pendiente'
    });
    setGrupos(gs => gs.map(g => g.id === gid && ['en_formacion', 'confirmado', 'en_espera'].includes(g.estado) ? {
      ...g,
      estado: 'asignado'
    } : g.id === prev && g.estado === 'asignado' ? {
      ...g,
      estado: 'confirmado'
    } : g));
    avisar(gid ? `${pol.nombre.split(' — ')[0]} asignado a ${grupos.find(x => x.id === gid).nombre}` : 'Sector sin grupo asignado');
  };
  // Al pasar a Replegado el grupo sale solo del sector
  useEffect(() => {
    const salen = pols.filter(p => p.grupoId && (grupos.find(g => g.id === p.grupoId) || {}).estado === 'replegado');
    if (!salen.length) return;
    const f = ahora();
    setPols(ps => ps.map(p => salen.some(s => s.id === p.id) ? {
      ...p,
      grupoId: null,
      historial: [...(p.historial || []), {
        ev: 'replegado',
        grupoId: p.grupoId,
        fecha: f
      }]
    } : p));
    avisar(salen.map(s => grupos.find(g => g.id === s.grupoId).nombre).join(', ') + ' se replegó y salió de ' + salen.map(s => s.nombre.split(' — ')[0]).join(', '), 'log-out', 'var(--muted-foreground)');
  }, [grupos]);
  const calcular = pol => {
    setCalc(pol.id);
    setTimeout(() => {
      const r = window.Geo.coverage(pol.vertices, trazas.filter(t => t.poligonoId === pol.id));
      patchPol(pol.id, {
        cobertura: {
          ...r,
          hora: hora()
        }
      });
      setOv('brechas', true);
      setCalc(null);
      avisar(`Cobertura de ${pol.nombre.split(' — ')[0]}: ${Math.round(r.pct)}%`, 'scan', 'var(--primary)');
    }, 700);
  };
  const toggleItem = (kind, id) => {
    const f = xs => xs.map(x => x.id === id ? {
      ...x,
      visible: x.visible === false
    } : x);
    ({
      pols: setPols,
      trazas: setTrazas,
      puntos: setPuntos,
      inst: setInst
    })[kind](f);
  };
  const encuadrar = () => mapRef.current && mapRef.current.flyToBounds(L.latLngBounds(pols.flatMap(p => p.vertices).concat(inst.map(i => [i.lat, i.lng]))).pad(0.1), {
    duration: 0.6
  });
  const DIBUJO = ['select', 'poligono', 'circulo', 'cuadrado', 'poi', 'hallazgo', 'instalacion', 'puntoCero', 'medir', 'gpx'];
  useEffect(() => {
    const f = () => {
      if (!document.fullscreenElement) setInmersivo(false);
    };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const pantallaCompleta = () => {
    if (inmersivo) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setInmersivo(false);
    } else {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      setInmersivo(true);
    }
  };
  const onRail = id => {
    const m = mapRef.current;
    if (!m) return;
    if (DIBUJO.includes(id)) elegirTool(tool === id && id !== 'select' ? 'select' : id);
    if (id === 'zin') m.zoomIn();
    if (id === 'zout') m.zoomOut();
    if (id === 'capas') setBasePop(b => !b);
    if (id === 'home') encuadrar();
    if (id === 'p0') abrirPopup('puntoCero', 'p0', [p0.lat, p0.lng], true);
    if (id === 'full') pantallaCompleta();
  };
  const rail = [{
    id: 'select',
    icon: 'mouse-pointer-2',
    label: 'Seleccionar'
  }, {
    id: 'medir',
    icon: 'ruler',
    label: 'Medir distancia'
  }, {
    sep: true
  }, {
    id: 'poligono',
    icon: 'pentagon',
    label: 'Dibujar sector (Enter cierra · Esc cancela)'
  }, {
    id: 'circulo',
    icon: 'circle',
    label: 'Sector circular (pulsar y arrastrar)'
  }, {
    id: 'cuadrado',
    icon: 'square',
    label: 'Sector cuadrado (pulsar y arrastrar)'
  }, {
    sep: true
  }, {
    id: 'poi',
    icon: 'map-pin-plus',
    label: 'Punto de interés'
  }, {
    id: 'instalacion',
    icon: 'flag',
    label: 'Instalación SCI'
  }, {
    id: 'puntoCero',
    icon: 'crosshair',
    label: 'Mover Punto Cero'
  }, {
    sep: true
  }, {
    id: 'home',
    icon: 'house',
    label: 'Encuadrar operativo'
  }];
  const railVista = [{
    id: 'capas',
    icon: 'layers',
    label: 'Capas · mapa base'
  }, {
    sep: true
  }, {
    id: 'zin',
    icon: 'plus',
    label: 'Acercar'
  }, {
    id: 'zout',
    icon: 'minus',
    label: 'Alejar'
  }, {
    sep: true
  }, {
    id: 'full',
    icon: inmersivo ? 'minimize' : 'maximize',
    label: inmersivo ? 'Salir de pantalla completa' : 'Pantalla completa'
  }];
  const selPol = sel && sel.type === 'poligono' && pols.find(p => p.id === sel.id);
  const selTr = sel && sel.type === 'traza' && trazas.find(t => t.id === sel.id);
  const selPt = sel && sel.type === 'punto' && puntos.find(p => p.id === sel.id);
  const selIn = sel && sel.type === 'instalacion' && inst.find(i => i.id === sel.id);
  const selP0 = sel && sel.type === 'puntoCero';
  const panel = !!(selPol || selTr || selPt || selIn || selP0) && !editVerts;
  const editar = (type, id) => {
    setSel({
      type,
      id
    });
    setPopup(null);
  };
  const reubicar = i => {
    cancelarModo();
    setPopup(null);
    setSel(null);
    setMoving({
      id: i.id,
      ll: [i.lat, i.lng]
    });
  };
  let popupNode = null;
  if (popup) {
    const close = () => setPopup(null);
    if (popup.type === 'traza') {
      const t = trazas.find(x => x.id === popup.id);
      if (t) {
        const pol = pols.find(p => p.id === t.poligonoId);
        popupNode = /*#__PURE__*/React.createElement(TrazaPopup, {
          t: t,
          grupo: grupos.find(g => g.id === t.grupoId),
          pol: pol,
          onClose: close,
          onEliminar: () => {
            setPopup(null);
            setModal({
              type: 'eliminar',
              kind: 'traza',
              id: t.id,
              nombre: t.etiqueta,
              extra: 'Se eliminará este track del mapa. Esta acción no podrá ser revertida.'
            });
          },
          onPoligono: () => {
            setSel({
              type: 'poligono',
              id: pol.id
            });
            setPopup(null);
            fly(pol.vertices, {
              panel: true
            });
          }
        });
      }
    }
    if (popup.type === 'punto') {
      const p = puntos.find(x => x.id === popup.id);
      if (p) popupNode = /*#__PURE__*/React.createElement(PuntoPopup, {
        p: p,
        onClose: close,
        onEditar: () => editar('punto', p.id)
      });
    }
    if (popup.type === 'instalacion') {
      const i = inst.find(x => x.id === popup.id);
      if (i) popupNode = /*#__PURE__*/React.createElement(InstalacionPopup, {
        i: i,
        onClose: close,
        onEditar: () => editar('instalacion', i.id),
        onReubicar: () => reubicar(i)
      });
    }
    if (popup.type === 'puntoCero') popupNode = /*#__PURE__*/React.createElement(PuntoCeroPopup, {
      pc: p0,
      onClose: close,
      onActualizar: () => {
        setPopup(null);
        setModal({
          type: 'puntoCero',
          to: [p0.lat, p0.lng]
        });
      }
    });
  }
  const eliminar = () => {
    const m = modal;
    if (m.kind === 'poligono') {
      setPols(ps => ps.filter(p => p.id !== m.id));
      setTrazas(ts => ts.map(t => t.poligonoId === m.id ? {
        ...t,
        poligonoId: null
      } : t));
    }
    if (m.kind === 'traza') {
      setTrazas(ts => ts.filter(t => t.id !== m.id));
      setPols(ps => ps.map(p => p.cobertura ? {
        ...p,
        cobertura: null
      } : p));
    }
    if (m.kind === 'punto') setPuntos(ps => ps.filter(p => p.id !== m.id));
    if (m.kind === 'instalacion') setInst(is => is.filter(i => i.id !== m.id));
    setModal(null);
    setSel(null);
    setPopup(null);
    avisar(m.nombre + ' eliminado', 'trash-2', '#dc2626');
  };
  const navItems = [{
    icon: 'layout-dashboard',
    label: 'Panel'
  }, {
    icon: 'user-check',
    label: 'Agentes'
  }, {
    icon: 'map',
    label: 'Mapa'
  }].map(i => ({
    ...i,
    active: i.label === modulo
  }));
  const derecha = panel ? 352 : 12;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: EMBED ? 'transparent' : 'var(--background)',
      color: 'var(--foreground)',
      overflow: 'hidden'
    }
  }, !inmersivo && !EMBED && /*#__PURE__*/React.createElement(Sidebar, {
    context: "operativo",
    items: navItems,
    user: D.usuario,
    isDark: dark,
    onToggleDark: () => setDark(d => !d),
    onNavigate: it => setModulo(it.label),
    onLogout: () => avisar('Cerrar sesión no forma parte de este kit', 'log-out', 'var(--muted-foreground)'),
    onBack: () => avisar('Volver a Operativos no forma parte de este kit', 'info', 'var(--muted-foreground)'),
    defaultCollapsed: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, !inmersivo && !EMBED && /*#__PURE__*/React.createElement(OperativoHeader, _extends({}, D.operativo, {
    hasObjetivo: true,
    aCargo: "Miguel Gim\xE9nez",
    defaultCompacto: (() => {
      try {
        return localStorage.getItem('duar-encabezado-compacto') === '1';
      } catch (e) {
        return false;
      }
    })(),
    onCompacto: v => {
      try {
        localStorage.setItem('duar-encabezado-compacto', v ? '1' : '0');
      } catch (e) {}
    },
    onPuestoComando: () => avisar('Puesto de comando: coordinadores presentes y a cargo (ver encabezado)', 'radio-tower', 'var(--foreground)'),
    onObjetivo: () => avisar('Objetivo buscado: ver módulo 3', 'target', 'var(--primary)'),
    onQR: () => avisar('QR de agentes: ver módulo 4', 'qr-code', 'var(--foreground)'),
    onInforme: () => avisar('Informe: ver módulo 6', 'file-text', 'var(--foreground)')
  })), modulo !== 'Mapa' ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    label: modulo === 'Panel' ? 'Panel de Control' : 'Agentes y Grupos',
    icon: modulo === 'Panel' ? 'layout-dashboard' : 'users'
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      position: 'relative'
    }
  }, left && /*#__PURE__*/React.createElement(LeftTree, {
    radios: radios,
    p0: p0,
    onRadio: patchRadio,
    onDelRadio: delRadio,
    onAddRadio: addRadio,
    q: q,
    setQ: setQ,
    open: open,
    setOpen: setOpen,
    pols: pols,
    trazas: trazas,
    puntos: puntos,
    inst: inst,
    grupos: grupos,
    overlays: overlays,
    setOv: setOv,
    base: base,
    setBase: setBase,
    tool: moving ? null : tool,
    onTool: elegirTool,
    sel: sel,
    popup: popup,
    onToggleItem: toggleItem,
    onClose: () => setLeft(false),
    onPol: p => {
      setSel({
        type: 'poligono',
        id: p.id
      });
      setPopup(null);
      fly(p.vertices, {
        panel: true
      });
    },
    onTraza: t => {
      setSel(null);
      abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true);
    },
    onPunto: p => abrirPopup('punto', p.id, [p.lat, p.lng], true),
    onInst: i => abrirPopup('instalacion', i.id, [i.lat, i.lng], true),
    onP0: () => abrirPopup('puntoCero', 'p0', [p0.lat, p0.lng], true),
    onReset: () => {
      setOverlays(OV0);
      setBase('satelital');
      setQ('');
      setPopup(null);
      setSel(null);
      cancelarModo();
      encuadrar();
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(MapCanvas, {
    rev: rev,
    radios: radios,
    radiosCentro: modal && modal.type === 'puntoCero' ? {
      lat: modal.to[0],
      lng: modal.to[1]
    } : p0,
    radiosPreview: !!(modal && modal.type === 'puntoCero'),
    base: base,
    overlays: overlays,
    poligonos: pols,
    trazas: trazas,
    puntos: puntos,
    instalaciones: inst,
    grupos: grupos,
    puntoCero: p0,
    sel: sel,
    popup: popup,
    popupNode: popupNode,
    tool: tool,
    draft: draft,
    measure: measure,
    editVerts: editVerts,
    moving: moving,
    flyTo: flyTo,
    onReady: m => mapRef.current = m,
    onMapClick: onMapClick,
    onShapeDrawn: (t, c, ll) => {
      if (window.Geo.length([c, ll]) > 5) setModal({
        type: 'nuevoPoligono',
        vertices: window.formaArrastre(t, c, ll)
      });
    },
    onMapDblClick: () => tool === 'poligono' && terminarPoligono(),
    onSelect: onSelectMap,
    onMoveDrag: ll => setMoving(m => ({
      ...m,
      ll
    })),
    onVertexMove: (i, ll) => setEditVerts(ev => {
      const v = ev.verts.slice();
      v[i] = ll;
      return {
        ...ev,
        verts: v
      };
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, !left && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setLeft(true),
    title: "Mostrar panel",
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      background: 'var(--card)',
      boxShadow: 'var(--elevation-md)',
      color: 'var(--foreground)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "panel-left-open",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start'
    }
  }, overlays.herramientas && /*#__PURE__*/React.createElement(MapToolbar, {
    tools: rail,
    active: moving ? null : tool,
    onSelect: onRail
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      right: derecha,
      zIndex: 900,
      transition: 'right .2s'
    }
  }, overlays.gruposFlot && /*#__PURE__*/React.createElement(GruposFloat, {
    grupos: grupos,
    poligonos: pols,
    open: gruposOpen,
    setOpen: setGruposOpen,
    onGrupo: (g, pol) => {
      if (pol) {
        setSel({
          type: 'poligono',
          id: pol.id
        });
        setPopup(null);
        fly(pol.vertices, {
          panel: true
        });
        setGruposOpen(false);
      } else avisar(g.nombre + ' no tiene sector asignado', 'info', 'var(--muted-foreground)');
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 26,
      right: derecha,
      zIndex: 900,
      transition: 'right .2s'
    }
  }, overlays.zoom && /*#__PURE__*/React.createElement(MapToolbar, {
    tools: railVista,
    active: basePop ? 'capas' : inmersivo ? 'full' : null,
    onSelect: onRail
  }), overlays.zoom && basePop && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 54,
      top: 0
    }
  }, /*#__PURE__*/React.createElement(BasePopover, {
    base: base,
    onBase: b => {
      setBase(b);
      setBasePop(false);
    }
  }))), overlays.leyenda && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 26,
      right: derecha + (overlays.zoom ? 58 : 0),
      zIndex: 900,
      transition: 'right .2s'
    }
  }, /*#__PURE__*/React.createElement(MapLegend, {
    items: LEYENDA,
    defaultOpen: window.innerHeight > 820
  })), /*#__PURE__*/React.createElement(ModoBanner, {
    tool: tool,
    draft: draft,
    measure: measure,
    editing: !!editVerts,
    moving: moving,
    onUndo: () => setDraft(d => d.slice(0, -1)),
    onFinish: terminarPoligono,
    onCancel: cancelarModo,
    onClearMeasure: () => setMeasure([]),
    onSaveGeom: () => {
      patchPol(editVerts.id, {
        vertices: editVerts.verts,
        cobertura: null
      });
      setSel({
        type: 'poligono',
        id: editVerts.id
      });
      setEditVerts(null);
      avisar('Geometría actualizada. Recalculá la cobertura.');
    },
    onSaveMove: () => {
      setInst(is => is.map(i => i.id === moving.id ? {
        ...i,
        lat: moving.ll[0],
        lng: moving.ll[1]
      } : i));
      const n = inst.find(i => i.id === moving.id).nombre;
      setMoving(null);
      avisar(n + ' reubicado');
    }
  }), selPol && !editVerts && /*#__PURE__*/React.createElement(PoligonoPanel, {
    pol: selPol,
    grupos: grupos,
    poligonos: pols,
    trazas: trazas,
    onClose: () => setSel(null),
    onPatch: p => {
      patchPol(selPol.id, p);
      avisar(p.notas !== undefined ? 'Nota guardada' : 'Cambios guardados');
    },
    onAsignar: g => asignar(selPol, g),
    onQuitar: (gr, enTerreno) => enTerreno ? setModal({
      type: 'quitarGrupo',
      polId: selPol.id,
      grupo: gr
    }) : asignar(selPol, null),
    onSimularRepliegue: () => setGrupos(gs => gs.map(g => g.id === selPol.grupoId ? {
      ...g,
      estado: 'replegado'
    } : g)),
    onCalcular: () => calcular(selPol),
    calculando: calc === selPol.id,
    brechas: overlays.brechas,
    onToggleBrechas: () => setOv('brechas', !overlays.brechas),
    onEditGeom: () => {
      cancelarModo();
      setEditVerts({
        id: selPol.id,
        verts: selPol.vertices.slice()
      });
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'poligono',
      id: selPol.id,
      nombre: selPol.nombre,
      extra: 'Los tracks asociados se conservan pero quedan fuera de sector.'
    }),
    onSelectTraza: t => abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true)
  }), selTr && /*#__PURE__*/React.createElement(TrazaPanel, {
    t: selTr,
    grupos: grupos,
    poligonos: pols,
    onClose: () => setSel(null),
    onSave: f => {
      setTrazas(ts => ts.map(t => t.id === f.id ? f : t));
      avisar('Track actualizado');
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'traza',
      id: selTr.id,
      nombre: selTr.etiqueta,
      extra: 'Se eliminará este track del mapa. Esta acción no podrá ser revertida.'
    })
  }), selPt && /*#__PURE__*/React.createElement(PuntoPanel, {
    p: selPt,
    onClose: () => setSel(null),
    onSave: f => {
      setPuntos(ps => ps.map(p => p.id === f.id ? f : p));
      avisar('Marcador actualizado');
    },
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'punto',
      id: selPt.id,
      nombre: selPt.nombre
    })
  }), selIn && !moving && /*#__PURE__*/React.createElement(InstalacionPanel, {
    i: selIn,
    onClose: () => setSel(null),
    onSave: f => {
      setInst(is => is.map(i => i.id === f.id ? f : i));
      avisar('Instalación actualizada');
    },
    onReubicar: () => reubicar(selIn),
    onDelete: () => setModal({
      type: 'eliminar',
      kind: 'instalacion',
      id: selIn.id,
      nombre: selIn.nombre
    })
  }), selP0 && /*#__PURE__*/React.createElement(PuntoCeroPanel, {
    pc: p0,
    onClose: () => setSel(null),
    onMover: () => {
      setSel(null);
      setModal({
        type: 'puntoCero',
        to: [p0.lat, p0.lng]
      });
    }
  }), /*#__PURE__*/React.createElement(Toast, {
    t: toast
  })))), modal && modal.type === 'nuevoPoligono' && /*#__PURE__*/React.createElement(NuevoPoligonoModal, {
    vertices: modal.vertices,
    grupos: grupos,
    n: pols.length + 1,
    onCancel: () => setModal(null),
    onSave: f => {
      const p = {
        id: uid('p'),
        ...f,
        estado: f.grupoId ? 'asignado' : 'pendiente',
        vertices: modal.vertices,
        visible: true,
        historial: f.grupoId ? [{
          ev: 'asignado',
          grupoId: f.grupoId,
          fecha: ahora()
        }] : []
      };
      setPols(ps => [...ps, p]);
      if (f.grupoId) setGrupos(gs => gs.map(g => g.id === f.grupoId && ['en_formacion', 'confirmado', 'en_espera'].includes(g.estado) ? {
        ...g,
        estado: 'asignado'
      } : g));
      setModal(null);
      cancelarModo();
      setSel({
        type: 'poligono',
        id: p.id
      });
      setOpen(o => ({
        ...o,
        sectores: true
      }));
      avisar('Sector creado');
    }
  }), modal && modal.type === 'gpx' && /*#__PURE__*/React.createElement(GpxModal, {
    grupos: grupos,
    poligonos: pols,
    onCancel: () => setModal(null),
    onUpload: f => {
      const t = {
        id: uid('t'),
        horaInicio: hora(),
        ...f,
        fecha: f.inicio ? f.inicio.slice(0, 10) : f.fecha,
        notas: '',
        visible: true,
        agente: f.agente || D.usuario.nombre + ' ' + D.usuario.apellido,
        cargado: ahora()
      };
      setTrazas(ts => [...ts, t]);
      if (f.poligonoId) patchPol(f.poligonoId, {
        cobertura: null
      });
      setModal(null);
      setOpen(o => ({
        ...o,
        tracks: true
      }));
      abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true);
      avisar('Track cargado: ' + window.Geo.fmtKm(window.Geo.length(t.puntos)));
    }
  }), modal && modal.type === 'instalacion' && /*#__PURE__*/React.createElement(NuevaInstalacionModal, {
    ll: modal.ll,
    onCancel: () => setModal(null),
    onSave: f => {
      const i = {
        id: uid('s'),
        ...f,
        lat: modal.ll[0],
        lng: modal.ll[1],
        visible: true
      };
      setInst(is => [...is, i]);
      setModal(null);
      setTool('select');
      setOpen(o => ({
        ...o,
        marcadores: true
      }));
      abrirPopup('instalacion', i.id, [i.lat, i.lng]);
      avisar(i.nombre + ' marcado en el mapa');
    }
  }), modal && modal.type === 'quitarGrupo' && (() => {
    const {
      Modal,
      Button
    } = NS;
    const pol = pols.find(x => x.id === modal.polId);
    return /*#__PURE__*/React.createElement(Modal, {
      title: "Quitar grupo del sector",
      icon: "triangle-alert",
      width: 440,
      onClose: () => setModal(null),
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        variant: "outline",
        size: "md",
        onClick: () => setModal(null)
      }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
        variant: "danger",
        size: "md",
        icon: "x",
        onClick: () => {
          asignar(pol, null);
          setModal(null);
        }
      }, "Quitar igualmente"))
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 13,
        color: 'var(--muted-foreground)',
        lineHeight: 1.55
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--foreground)'
      }
    }, modal.grupo.nombre), " est\xE1 ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--foreground)'
      }
    }, ESTADOS[modal.grupo.estado].label.toLowerCase()), " en ", pol.nombre.split(' — ')[0], ". Si lo quit\xE1s, el sector queda sin grupo mientras el personal sigue en terreno. Queda registrado en el historial del sector."));
  })(), modal && modal.type === 'eliminar' && /*#__PURE__*/React.createElement(EliminarModal, {
    tipo: {
      poligono: 'sector',
      traza: 'track GPX',
      punto: 'marcador',
      instalacion: 'instalación'
    }[modal.kind],
    nombre: modal.nombre,
    extra: modal.extra,
    onCancel: () => setModal(null),
    onConfirm: eliminar
  }), modal && modal.type === 'puntoCero' && /*#__PURE__*/React.createElement(PuntoCeroModal, {
    nRadios: overlays.radios ? radios.filter(r => r.visible).length : 0,
    from: p0,
    to: modal.to,
    onChange: to => setModal(mm => mm && mm.type === 'puntoCero' ? {
      ...mm,
      to
    } : mm),
    onCancel: () => {
      setModal(null);
      cancelarModo();
    },
    onConfirm: to => {
      setP0({
        ...p0,
        lat: to[0],
        lng: to[1],
        actualizado: new Date().toLocaleDateString('es-AR') + ' ' + hora()
      });
      setModal(null);
      setTool('select');
      abrirPopup('puntoCero', 'p0', to);
      avisar('Punto Cero actualizado');
    }
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/LeftTree.jsx
try { (() => {
/* Panel izquierdo "Gestión del mapa": buscador + árbol de secciones al estilo Google Earth. */
const NST = window.DUARDiseOMapa_7e942c;
const swPol = (c, dashed) => /*#__PURE__*/React.createElement("span", {
  style: {
    width: 12,
    height: 12,
    borderRadius: 3,
    background: c + '40',
    border: '1.5px ' + (dashed ? 'dashed ' : 'solid ') + c,
    flexShrink: 0,
    boxSizing: 'border-box'
  }
});
const swLine = c => /*#__PURE__*/React.createElement("span", {
  style: {
    width: 14,
    height: 3,
    borderRadius: 2,
    background: c,
    flexShrink: 0
  }
});
const chkR = {
  accentColor: 'var(--primary)',
  margin: 0,
  width: 14,
  height: 14,
  flexShrink: 0,
  cursor: 'pointer'
};
const kmTxt = km => String(km).replace('.', ',');
function RadioRow({
  r,
  onChange,
  onDelete
}) {
  const {
    Icon
  } = NST;
  const [v, setV] = React.useState(kmTxt(r.km));
  React.useEffect(() => setV(kmTxt(r.km)), [r.km]);
  const pal = window.MapaData.paletaRadios;
  const commit = () => {
    const n = parseFloat(v.replace(',', '.'));
    if (n > 0 && n <= 50) onChange({
      km: Math.round(n * 100) / 100
    });else setV(kmTxt(r.km));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      opacity: r.visible ? 1 : 0.55
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: r.visible,
    onChange: () => onChange({
      visible: !r.visible
    }),
    style: chkR
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: "Cambiar color",
    onClick: () => onChange({
      color: pal[(pal.indexOf(r.color) + 1) % pal.length]
    }),
    style: {
      width: 15,
      height: 15,
      borderRadius: '50%',
      border: '2px solid ' + r.color,
      background: r.color + '2e',
      padding: 0,
      cursor: 'pointer',
      flexShrink: 0,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: 500,
      color: 'var(--foreground)'
    }
  }, "Radio"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 7px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'var(--input-background)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: v,
    inputMode: "decimal",
    onChange: e => setV(e.target.value),
    onBlur: commit,
    onKeyDown: e => {
      if (e.key === 'Enter') e.target.blur();
    },
    style: {
      width: 36,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      textAlign: 'right',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12.5,
      fontWeight: 600,
      padding: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, "km")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: "Quitar radio",
    onClick: onDelete,
    style: {
      background: 'none',
      border: 'none',
      padding: 2,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })));
}
function LeftTree(p) {
  const {
    TreeSection,
    TreeRow,
    MapMarker,
    Icon,
    ESTADOS
  } = NST;
  const {
    radios,
    p0
  } = p;
  const {
    q,
    setQ,
    open,
    setOpen,
    pols,
    trazas,
    puntos,
    inst,
    grupos,
    overlays,
    setOv,
    base,
    setBase,
    tool,
    onTool,
    sel,
    popup
  } = p;
  const m = s => !q || s.toLowerCase().includes(q.toLowerCase());
  const G = id => grupos.find(g => g.id === id);
  const on = (t, id) => sel && sel.type === t && sel.id === id || popup && popup.type === t && popup.id === id;
  const fPols = pols.filter(x => m(x.nombre)),
    fTr = trazas.filter(x => m(x.etiqueta + ' ' + (x.agente || ''))),
    fInst = inst.filter(x => m(x.nombre));
  const fPoi = puntos.filter(x => x.tipo === 'poi' && m(x.nombre)),
    fHal = puntos.filter(x => x.tipo === 'hallazgo' && m(x.nombre));
  const showP0 = m('Punto Cero LSP');
  const [cerrados, setCerrados] = React.useState({});
  const trPorGrupo = [...pols.map(pl => ({
    id: pl.id,
    nombre: pl.nombre,
    color: (G(pl.grupoId) || {}).color || '#94a3b8',
    items: fTr.filter(t => t.poligonoId === pl.id)
  })), {
    id: '_sin',
    nombre: 'Sin sector',
    color: '#94a3b8',
    items: fTr.filter(t => !t.poligonoId || !pols.some(pl => pl.id === t.poligonoId))
  }].filter(b => b.items.length);
  const isOpen = (k, n) => q ? n > 0 : open[k];
  const tog = k => v => setOpen(o => ({
    ...o,
    [k]: v
  }));
  // Un hijo sólo aparece tildado si su grupo (y la sección) están visibles
  const sub = (grupo, it) => overlays.marcadores && overlays[grupo] && it.visible !== false;
  const child = (grupo, kind, it) => {
    if (!overlays.marcadores || !overlays[grupo]) {
      setOv('marcadores', true);
      setOv(grupo, true);
      if (it.visible === false) p.onToggleItem(kind, it.id);
    } else p.onToggleItem(kind, it.id);
  };
  const nMarc = puntos.length + inst.length + 1;
  const vacio = txt => /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 8px',
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, txt);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 320,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      fontFamily: 'var(--font-family-primary)',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-md)',
      background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
      color: 'var(--primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--foreground)',
      lineHeight: 1.3
    }
  }, "Gesti\xF3n del mapa"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, pols.length, " sectores \xB7 ", trazas.length, " tracks \xB7 ", nMarc, " marcadores")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onClose,
    title: "Ocultar panel",
    style: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 17
  }))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'var(--input-background)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Buscar sectores, tracks, marcadores\u2026",
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12.5
    }
  }), q && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setQ(''),
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden'
    }
  }, !q && /*#__PURE__*/React.createElement(TreeSection, {
    title: "Radios desde Punto Cero",
    icon: "circle-dot",
    badge: radios.filter(r => r.visible).length + '/' + radios.length,
    open: open.radios,
    onToggle: tog('radios'),
    checked: overlays.radios,
    onCheck: v => setOv('radios', v)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '2px 8px 6px'
    }
  }, /*#__PURE__*/React.createElement(MapMarker, {
    tipo: "puntoCero",
    variant: "mini"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-family-mono)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Centro ", window.Geo.fmtCoord(p0.lat, p0.lng))), radios.slice().sort((a, b) => a.km - b.km).map(r => /*#__PURE__*/React.createElement(RadioRow, {
    key: r.id,
    r: r,
    onChange: patch => p.onRadio(r.id, patch),
    onDelete: () => p.onDelRadio(r.id)
  })), !radios.length && vacio('Sin radios. Agregá uno para guiarte desde el Punto Cero.'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      rowGap: 6,
      flexWrap: 'wrap',
      padding: '8px 8px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexBasis: '100%',
      fontSize: 11,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, "Agregar"), [0.5, 1, 2, 3, 5, 10].map(km => {
    const ya = radios.some(r => r.km === km);
    return /*#__PURE__*/React.createElement("button", {
      key: km,
      type: "button",
      disabled: ya,
      onClick: () => p.onAddRadio(km),
      style: {
        whiteSpace: 'nowrap',
        flexShrink: 0,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1.5px solid var(--border)',
        background: 'transparent',
        color: ya ? 'var(--muted-foreground)' : 'var(--foreground)',
        opacity: ya ? 0.45 : 1,
        cursor: ya ? 'default' : 'pointer',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 11,
        fontWeight: 600
      }
    }, window.Geo.fmtRadio(km));
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      const max = radios.reduce((m, r) => Math.max(m, r.km), 0);
      p.onAddRadio(max ? Math.round(max * 1.5 * 10) / 10 : 1);
    },
    style: {
      whiteSpace: 'nowrap',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 8px',
      borderRadius: 999,
      border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)',
      background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
      color: 'var(--primary)',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 11,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), "Otro")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 8px 0',
      fontSize: 10.5,
      color: 'var(--muted-foreground)',
      lineHeight: 1.45
    }
  }, "Se recentran solos cuando el coordinador actualiza el Punto Cero. Quedan debajo de los sectores.")), /*#__PURE__*/React.createElement(TreeSection, {
    title: "Sectores y pol\xEDgonos",
    icon: "pentagon",
    badge: pols.length,
    open: isOpen('sectores', fPols.length),
    onToggle: tog('sectores'),
    checked: overlays.poligonos,
    onCheck: v => setOv('poligonos', v)
  }, fPols.map(x => {
    const gr = G(x.grupoId),
      c = gr ? gr.color : '#475569';
    return /*#__PURE__*/React.createElement(TreeRow, {
      key: x.id,
      checked: x.visible,
      onCheck: () => p.onToggleItem('pols', x.id),
      swatch: swPol(c, !x.grupoId),
      label: x.nombre,
      selected: on('poligono', x.id),
      onClick: () => p.onPol(x),
      meta: x.cobertura ? Math.round(x.cobertura.pct) + '%' : null
    });
  }), !fPols.length && vacio(q ? 'Sin coincidencias.' : 'Aún no hay sectores dibujados.')), /*#__PURE__*/React.createElement(TreeSection, {
    title: "Marcadores t\xE1cticos / POI",
    icon: "map-pin",
    badge: nMarc,
    open: isOpen('marcadores', fInst.length + fPoi.length + fHal.length + (showP0 ? 1 : 0)),
    onToggle: tog('marcadores'),
    checked: overlays.marcadores,
    onCheck: v => setOv('marcadores', v)
  }, showP0 && /*#__PURE__*/React.createElement(TreeRow, {
    checked: overlays.marcadores && overlays.puntoCero,
    onCheck: v => {
      if (v && !overlays.marcadores) setOv('marcadores', true);
      setOv('puntoCero', v);
    },
    swatch: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: "puntoCero",
      variant: "mini"
    }),
    label: "Punto Cero (LSP)",
    selected: on('puntoCero', 'p0'),
    onClick: p.onP0
  }), (!q || fInst.length > 0) && /*#__PURE__*/React.createElement(TreeRow, {
    strong: true,
    label: "Instalaciones SCI",
    checked: overlays.marcadores && overlays.instalaciones,
    onCheck: v => {
      if (v && !overlays.marcadores) setOv('marcadores', true);
      setOv('instalaciones', v);
    },
    meta: inst.length
  }), fInst.map(i => /*#__PURE__*/React.createElement(TreeRow, {
    key: i.id,
    indent: 1,
    checked: sub('instalaciones', i),
    onCheck: () => child('instalaciones', 'inst', i),
    swatch: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: i.tipo,
      variant: "mini"
    }),
    label: i.nombre,
    selected: on('instalacion', i.id),
    onClick: () => p.onInst(i)
  })), (!q || fHal.length > 0) && /*#__PURE__*/React.createElement(TreeRow, {
    strong: true,
    label: "Hallazgos",
    checked: overlays.marcadores && overlays.hallazgos,
    onCheck: v => {
      if (v && !overlays.marcadores) setOv('marcadores', true);
      setOv('hallazgos', v);
    },
    meta: puntos.filter(x => x.tipo === 'hallazgo').length
  }), fHal.map(x => /*#__PURE__*/React.createElement(TreeRow, {
    key: x.id,
    indent: 1,
    checked: sub('hallazgos', x),
    onCheck: () => child('hallazgos', 'puntos', x),
    swatch: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: "hallazgo",
      variant: "mini"
    }),
    label: x.nombre,
    selected: on('punto', x.id),
    onClick: () => p.onPunto(x)
  })), (!q || fPoi.length > 0) && /*#__PURE__*/React.createElement(TreeRow, {
    strong: true,
    label: "Puntos de inter\xE9s",
    checked: overlays.marcadores && overlays.poi,
    onCheck: v => {
      if (v && !overlays.marcadores) setOv('marcadores', true);
      setOv('poi', v);
    },
    meta: puntos.filter(x => x.tipo === 'poi').length
  }), fPoi.map(x => /*#__PURE__*/React.createElement(TreeRow, {
    key: x.id,
    indent: 1,
    checked: sub('poi', x),
    onCheck: () => child('poi', 'puntos', x),
    swatch: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: "poi",
      variant: "mini"
    }),
    label: x.nombre,
    selected: on('punto', x.id),
    onClick: () => p.onPunto(x)
  }))), /*#__PURE__*/React.createElement(TreeSection, {
    title: "Trazabilidad y tracks GPX",
    icon: "route",
    badge: trazas.length,
    open: isOpen('tracks', fTr.length),
    onToggle: tog('tracks'),
    checked: overlays.trazas,
    onCheck: v => setOv('trazas', v)
  }, trPorGrupo.map(b => {
    const abierto = q || !cerrados[b.id];
    const vis = b.items.every(t => t.visible);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: b.id
    }, /*#__PURE__*/React.createElement(TreeRow, {
      checked: vis,
      onCheck: v => b.items.filter(t => !!t.visible !== v).forEach(t => p.onToggleItem('trazas', t.id)),
      onClick: () => setCerrados(c => ({
        ...c,
        [b.id]: !c[b.id]
      })),
      swatch: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "chevron-right",
        size: 12,
        color: "var(--muted-foreground)",
        style: {
          transform: abierto ? 'rotate(90deg)' : 'none',
          transition: 'transform .15s'
        }
      }), /*#__PURE__*/React.createElement(Icon, {
        name: b.id === '_sin' ? 'route' : 'pentagon',
        size: 13,
        color: b.color
      })),
      label: /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600
        }
      }, b.nombre)
    }), abierto && b.items.map(t => /*#__PURE__*/React.createElement(TreeRow, {
      key: t.id,
      indent: 1,
      checked: t.visible,
      onCheck: () => p.onToggleItem('trazas', t.id),
      swatch: swLine((G(t.grupoId) || {}).color || '#444140'),
      label: t.agente || 'Sin agente',
      meta: (t.fecha ? t.fecha.split('-').reverse().join('/') : '—') + (t.horaInicio ? ' · ' + t.horaInicio + ' h' : ''),
      selected: on('traza', t.id),
      onClick: () => p.onTraza(t)
    })));
  }), !fTr.length && vacio(q ? 'Sin coincidencias.' : 'Sin tracks cargados.'), !q && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onTool('gpx'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '4px 8px 0',
      padding: 0,
      background: 'none',
      border: 'none',
      color: 'var(--primary)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 13
  }), "Cargar archivo GPX")), !q && /*#__PURE__*/React.createElement(TreeSection, {
    title: "Ajustes de mapa",
    icon: "settings",
    open: open.capas,
    onToggle: tog('capas')
  }, /*#__PURE__*/React.createElement(TreeRow, {
    strong: true,
    label: "Superposiciones"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.etiquetas,
    onCheck: v => setOv('etiquetas', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "tag",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Etiquetas de sectores"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.brechas,
    onCheck: v => setOv('brechas', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "scan",
      size: 13,
      color: "#dc2626"
    }),
    label: "An\xE1lisis de brechas",
    meta: pols.filter(x => x.cobertura).length || null
  }), /*#__PURE__*/React.createElement(TreeRow, {
    strong: true,
    label: "Ventanas del mapa"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.herramientas !== false,
    onCheck: v => setOv('herramientas', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "pencil-ruler",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Herramientas"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.zoom !== false,
    onCheck: v => setOv('zoom', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "zoom-in",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Zoom y vista"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.leyenda,
    onCheck: v => setOv('leyenda', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "list",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Simbolog\xEDa t\xE1ctica"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.coords,
    onCheck: v => setOv('coords', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "locate-fixed",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Lat / Long / Elevaci\xF3n"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.escala !== false,
    onCheck: v => setOv('escala', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "ruler",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Escala gr\xE1fica"
  }), /*#__PURE__*/React.createElement(TreeRow, {
    indent: 1,
    checked: overlays.gruposFlot,
    onCheck: v => setOv('gruposFlot', v),
    swatch: /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 13,
      color: "var(--muted-foreground)"
    }),
    label: "Grupos operativos"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '10px 14px',
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#16a34a'
    }
  }), "Servidor GIS en l\xEDnea"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onReset,
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--primary)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 11.5,
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }
  }, "Restablecer vista")));
}
window.LeftTree = LeftTree;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/LeftTree.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/MapCanvas.jsx
try { (() => {
/* Lienzo Leaflet del mapa operacional. Redibuja las capas ante cada cambio (pocos elementos). */
const {
  useEffect: useEffectMC,
  useRef: useRefMC,
  useState: useStateMC
} = React;
const cssC = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
const PRI = () => cssC('--primary', '#E0662B'),
  FG = () => cssC('--foreground', '#444140');
function markerIcon(tipo, label, selected) {
  const {
    MapMarker,
    TIPOS_MARCADOR
  } = window.DUARDiseOMapa_7e942c;
  const c = TIPOS_MARCADOR[tipo] || {};
  const el = document.createElement('div');
  el.style.cssText = 'width:140px;display:flex;justify-content:center;';
  ReactDOM.createRoot(el).render(/*#__PURE__*/React.createElement(MapMarker, {
    tipo: tipo,
    label: label,
    selected: selected
  }));
  const h = tipo === 'puntoCero' ? 40 : c.sci ? 36 : 34;
  return L.divIcon({
    html: el,
    className: 'duar-divicon',
    iconSize: [140, h + 24],
    iconAnchor: [70, h]
  });
}
const vertexIcon = color => L.divIcon({
  className: 'duar-divicon',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:border-box"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});
function MapCanvas(props) {
  const elRef = useRefMC(null),
    mapRef = useRefMC(null),
    g = useRefMC({}),
    cb = useRefMC(props);
  const [escala, setEscala] = useStateMC({
    px: 80,
    label: ''
  });
  const coordRef = useRefMC(null),
    elevRef = useRefMC(null),
    popRef = useRefMC(null),
    popEl = useRefMC(null);
  if (!popEl.current) popEl.current = document.createElement('div');
  cb.current = props;
  const D = window.MapaData,
    G = window.Geo;
  useEffectMC(() => {
    const map = L.map(elRef.current, {
      zoomControl: false,
      preferCanvas: true,
      doubleClickZoom: false
    }).setView(D.centro, 14);
    // Radios: debajo de los polígonos (overlayPane = 400) pero sobre el mapa base
    map.createPane('radios').style.zIndex = 350;
    map.getPane('radios').style.pointerEvents = 'none';
    map.createPane('radiosLbl').style.zIndex = 390;
    map.getPane('radiosLbl').style.pointerEvents = 'none';
    g.current.radR = L.svg({
      pane: 'radios'
    });
    g.current.rad = L.layerGroup().addTo(map);
    ['gap', 'pol', 'tr', 'pts', 'meas', 'draft'].forEach(k => g.current[k] = L.layerGroup().addTo(map));
    g.current.rubber = L.polyline([], {
      color: PRI(),
      weight: 2,
      dashArray: '4 6',
      interactive: false
    }).addTo(map);
    map.on('click', e => cb.current.onMapClick([e.latlng.lat, e.latlng.lng]));
    map.on('dblclick', () => cb.current.onMapDblClick());
    const esForma = () => cb.current.tool === 'circulo' || cb.current.tool === 'cuadrado';
    map.on('mousedown', e => {
      if (!esForma() || e.originalEvent.button !== 0) return;
      g.current.forma = [e.latlng.lat, e.latlng.lng];
      g.current.rubber.setStyle({
        color: PRI(),
        dashArray: null
      });
    });
    const soltar = e => {
      const c = g.current.forma;
      if (!c) return;
      g.current.forma = null;
      g.current.rubber.setStyle({
        dashArray: '4 6'
      });
      g.current.rubber.setLatLngs([]);
      if (e && e.latlng && cb.current.onShapeDrawn) cb.current.onShapeDrawn(cb.current.tool, c, [e.latlng.lat, e.latlng.lng]);
    };
    map.on('mouseup', soltar);
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && g.current.forma) {
        g.current.forma = null;
        g.current.rubber.setLatLngs([]);
      }
    });
    const upd = () => {
      const y = map.getSize().y / 2,
        mpp = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([100, y])) / 100;
      const pasos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
      const d = pasos.filter(s => s / mpp <= 130).pop() || 1;
      setEscala({
        px: Math.round(d / mpp),
        label: d >= 1000 ? d / 1000 + ' km' : d + ' m'
      });
    };
    map.on('zoomend moveend', upd);
    upd();
    map.on('mousemove', e => {
      const ll = [e.latlng.lat, e.latlng.lng];
      if (coordRef.current && elevRef.current) {
        coordRef.current.textContent = 'Lat ' + ll[0].toFixed(5) + '°  Lon ' + ll[1].toFixed(5) + '°';
        elevRef.current.textContent = 'Elev. ' + G.fmtM(G.elev(ll));
      }
      const p = cb.current,
        d = p.tool === 'poligono' ? p.draft : p.tool === 'medir' ? p.measure : null;
      if (p.tool === 'circulo' || p.tool === 'cuadrado') {
        const c = g.current.forma;
        if (c) {
          const v = window.formaArrastre(p.tool, c, ll);
          g.current.rubber.setLatLngs(v.concat([v[0]]));
        } else g.current.rubber.setLatLngs([]);
        return;
      }
      if (d && d.length) {
        g.current.rubber.setStyle({
          color: p.tool === 'medir' ? FG() : PRI()
        });
        g.current.rubber.setLatLngs(p.tool === 'poligono' ? [d[d.length - 1], ll, d[0]] : [d[d.length - 1], ll]);
      } else g.current.rubber.setLatLngs([]);
    });
    popRef.current = L.popup({
      closeButton: false,
      autoClose: false,
      closeOnClick: false,
      closeOnEscapeKey: false,
      autoPanPaddingTopLeft: L.point(80, 90),
      autoPanPaddingBottomRight: L.point(80, 70),
      maxWidth: 360,
      minWidth: 280,
      className: 'duar-popup'
    });
    mapRef.current = map;
    map.fitBounds(L.latLngBounds(D.poligonos.flatMap(p => p.vertices)).pad(0.12));
    props.onReady && props.onReady(map);
    return () => map.remove();
  }, []);
  useEffectMC(() => {
    const map = mapRef.current,
      b = D.bases.find(x => x.id === props.base) || D.bases[0];
    if (g.current.tiles) map.removeLayer(g.current.tiles);
    g.current.tiles = L.tileLayer(b.url, {
      attribution: b.attr,
      maxZoom: 18,
      subdomains: 'abc'
    }).addTo(map);
    g.current.tiles.bringToBack();
  }, [props.base]);
  useEffectMC(() => {
    const f = props.flyTo,
      map = mapRef.current;
    if (!f || !map) return;
    const w = map.getSize().x,
      opts = {
        maxZoom: 16,
        paddingTopLeft: [80, 80],
        paddingBottomRight: [f.panel ? Math.min(380, w * 0.45) : 80, 60]
      };
    const one = f.pts.length === 1,
      z = Math.max(map.getZoom(), 15);
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      f.then && f.then();
    };
    map.once('moveend', fin);
    setTimeout(() => {
      if (!done) {
        map.stop();
        one ? map.setView(f.pts[0], z, {
          animate: false
        }) : map.fitBounds(L.latLngBounds(f.pts), {
          ...opts,
          animate: false
        });
        fin();
      }
    }, 1200);
    if (one) map.flyTo(f.pts[0], z, {
      duration: 0.6
    });else map.flyToBounds(L.latLngBounds(f.pts), {
      ...opts,
      duration: 0.6
    });
  }, [props.flyTo]);
  useEffectMC(() => {
    const map = mapRef.current,
      pop = popRef.current,
      p = props.popup;
    if (p) {
      pop.options.offset = L.point(0, p.offset != null ? p.offset : -36);
      pop.setLatLng(p.latlng).setContent(popEl.current);
      if (!map.hasLayer(pop)) pop.openOn(map);else pop.update();
    } else if (map.hasLayer(pop)) map.closePopup(pop);
  }, [props.popup]);
  const {
    poligonos,
    trazas,
    puntos,
    instalaciones,
    grupos,
    sel,
    popup,
    overlays,
    tool,
    editVerts,
    moving,
    puntoCero
  } = props;
  useEffectMC(() => {
    const {
      pol,
      tr,
      pts,
      gap
    } = g.current;
    [pol, tr, pts, gap].forEach(l => l.clearLayers());
    const colorDe = id => (grupos.find(x => x.id === id) || {}).color;
    const inter = tool === 'select' && !editVerts && !moving;
    const isSel = (t, id) => sel && sel.type === t && sel.id === id || popup && popup.type === t && popup.id === id;
    const ev = e => [e.latlng.lat, e.latlng.lng];
    if (overlays.brechas) poligonos.forEach(p => {
      if (!p.cobertura || !p.visible || !overlays.poligonos) return;
      const {
        gaps,
        dLat,
        dLng
      } = p.cobertura;
      gaps.forEach(([la, ln]) => L.rectangle([[la - dLat / 2, ln - dLng / 2], [la + dLat / 2, ln + dLng / 2]], {
        stroke: false,
        fillColor: '#dc2626',
        fillOpacity: 0.38,
        interactive: false
      }).addTo(gap));
    });
    if (overlays.poligonos) poligonos.forEach(p => {
      if (!p.visible || editVerts && editVerts.id === p.id) return;
      const c = colorDe(p.grupoId) || '#475569',
        s = isSel('poligono', p.id);
      const shape = L.polygon(p.vertices, {
        color: c,
        weight: s ? 3.5 : 2,
        fillColor: c,
        fillOpacity: s ? 0.26 : overlays.brechas && p.cobertura ? 0.06 : 0.14,
        dashArray: !p.grupoId ? '7 6' : null,
        interactive: inter,
        bubblingMouseEvents: false
      });
      if (overlays.etiquetas) shape.bindTooltip(`<span class="dot" style="background:${c}"></span>${p.nombre.split(' — ')[0]}${p.cobertura ? ' · ' + Math.round(p.cobertura.pct) + '%' : ''}`, {
        permanent: true,
        direction: 'center',
        className: 'duar-tip'
      });
      shape.on('click', e => cb.current.onSelect({
        type: 'poligono',
        id: p.id
      }, ev(e)));
      shape.addTo(pol);
    });
    if (overlays.trazas) trazas.forEach(t => {
      if (!t.visible || t.puntos.length < 2) return;
      const c = colorDe(t.grupoId) || FG(),
        s = isSel('traza', t.id);
      L.polyline(t.puntos, {
        color: '#fff',
        weight: s ? 8 : 5,
        opacity: 0.85,
        interactive: false
      }).addTo(tr);
      const line = L.polyline(t.puntos, {
        color: c,
        weight: s ? 4.5 : 2.5,
        opacity: 0.95,
        interactive: inter,
        bubblingMouseEvents: false
      });
      line.on('click', e => cb.current.onSelect({
        type: 'traza',
        id: t.id
      }, ev(e)));
      line.addTo(tr);
      L.circleMarker(t.puntos[0], {
        radius: 4,
        color: '#fff',
        weight: 2,
        fillColor: c,
        fillOpacity: 1,
        interactive: false
      }).addTo(tr);
      L.circleMarker(t.puntos[t.puntos.length - 1], {
        radius: 4,
        color: c,
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: false
      }).addTo(tr);
    });
    if (overlays.marcadores) {
      puntos.forEach(p => {
        if (p.visible === false || p.tipo === 'poi' && !overlays.poi || p.tipo === 'hallazgo' && !overlays.hallazgos) return;
        const m = L.marker([p.lat, p.lng], {
          icon: markerIcon(p.tipo, null, isSel('punto', p.id)),
          interactive: inter,
          bubblingMouseEvents: false,
          zIndexOffset: isSel('punto', p.id) ? 500 : 0
        });
        m.on('click', () => cb.current.onSelect({
          type: 'punto',
          id: p.id
        }, [p.lat, p.lng]));
        m.addTo(pts);
      });
      if (overlays.instalaciones) instalaciones.forEach(i => {
        if (i.visible === false) return;
        const mv = moving && moving.id === i.id,
          pos = mv ? moving.ll : [i.lat, i.lng];
        const m = L.marker(pos, {
          icon: markerIcon(i.tipo, i.nombre, isSel('instalacion', i.id) || mv),
          draggable: mv,
          interactive: inter || mv,
          bubblingMouseEvents: false,
          zIndexOffset: mv ? 2000 : 200
        });
        if (mv) m.on('dragend', e => cb.current.onMoveDrag([e.target.getLatLng().lat, e.target.getLatLng().lng]));else m.on('click', () => cb.current.onSelect({
          type: 'instalacion',
          id: i.id
        }, pos));
        m.addTo(pts);
      });
      if (overlays.puntoCero) {
        const p0 = L.marker([puntoCero.lat, puntoCero.lng], {
          icon: markerIcon('puntoCero', 'Punto 0', isSel('puntoCero', 'p0')),
          interactive: inter,
          bubblingMouseEvents: false,
          zIndexOffset: 1000
        });
        p0.on('click', () => cb.current.onSelect({
          type: 'puntoCero',
          id: 'p0'
        }, [puntoCero.lat, puntoCero.lng]));
        p0.addTo(pts);
      }
    }
  }, [poligonos, trazas, puntos, instalaciones, grupos, sel, popup, overlays, tool, editVerts, moving, puntoCero, props.rev]);
  const {
    radios,
    radiosCentro,
    radiosPreview
  } = props;
  useEffectMC(() => {
    const r = g.current.rad;
    if (!r) return;
    r.clearLayers();
    if (!overlays.radios || !radios || !radiosCentro) return;
    const c = [radiosCentro.lat, radiosCentro.lng];
    radios.filter(x => x.visible).sort((a, b) => b.km - a.km).forEach(x => {
      const m = x.km * 1000;
      L.circle(c, {
        radius: m,
        renderer: g.current.radR,
        pane: 'radios',
        color: x.color,
        weight: 2,
        opacity: 0.9,
        fillColor: x.color,
        fillOpacity: radiosPreview ? 0.03 : 0.07,
        dashArray: radiosPreview ? '6 6' : null,
        interactive: false
      }).addTo(r);
      L.marker([c[0] + m / 110540, c[1]], {
        pane: 'radiosLbl',
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'duar-divicon',
          html: '<div class="duar-ring-lbl" style="color:' + x.color + ';border-color:' + x.color + '">' + G.fmtRadio(x.km) + '</div>',
          iconSize: [70, 18],
          iconAnchor: [35, 9]
        })
      }).addTo(r);
    });
  }, [radios, radiosCentro, radiosPreview, overlays.radios]);
  const {
    draft,
    measure
  } = props;
  useEffectMC(() => {
    const d = g.current.draft;
    d.clearLayers();
    if ((tool === 'poligono' || tool === 'circulo' || tool === 'cuadrado') && draft.length) {
      L.polyline(draft, {
        color: PRI(),
        weight: 2.5,
        interactive: false
      }).addTo(d);
      if (draft.length > 2) L.polygon(draft, {
        stroke: false,
        fillColor: PRI(),
        fillOpacity: 0.12,
        interactive: false
      }).addTo(d);
      draft.forEach((p, i) => L.marker(p, {
        icon: vertexIcon(i === 0 ? FG() : PRI()),
        interactive: i === 0 && draft.length > 2
      }).on('click', () => cb.current.onMapDblClick()).addTo(d));
    }
    if (tool !== 'poligono' && tool !== 'medir' && tool !== 'circulo' && tool !== 'cuadrado') g.current.rubber.setLatLngs([]);
    const mp = mapRef.current;
    if (mp) {
      if (tool === 'circulo' || tool === 'cuadrado') mp.dragging.disable();else mp.dragging.enable();
    }
    if (editVerts) {
      const pol = poligonos.find(p => p.id === editVerts.id);
      const c = (grupos.find(x => x.id === (pol && pol.grupoId)) || {}).color || '#475569';
      const shape = L.polygon(editVerts.verts, {
        color: c,
        weight: 2.5,
        fillColor: c,
        fillOpacity: 0.2,
        dashArray: '4 4',
        interactive: false
      }).addTo(d);
      editVerts.verts.forEach((p, i) => {
        const m = L.marker(p, {
          icon: vertexIcon(c),
          draggable: true
        }).addTo(d);
        m.on('drag', e => {
          const v = editVerts.verts.slice();
          v[i] = [e.latlng.lat, e.latlng.lng];
          shape.setLatLngs(v);
        });
        m.on('dragend', e => cb.current.onVertexMove(i, [e.target.getLatLng().lat, e.target.getLatLng().lng]));
      });
    }
    const ms = g.current.meas;
    ms.clearLayers();
    if (tool === 'medir' && measure.length) {
      L.polyline(measure, {
        color: '#fff',
        weight: 6,
        opacity: 0.8,
        interactive: false
      }).addTo(ms);
      L.polyline(measure, {
        color: FG(),
        weight: 2.5,
        dashArray: '6 5',
        interactive: false
      }).addTo(ms);
      measure.forEach(p => L.circleMarker(p, {
        radius: 4.5,
        color: FG(),
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: false
      }).addTo(ms));
      if (measure.length > 1) L.marker(measure[measure.length - 1], {
        opacity: 0,
        interactive: false
      }).bindTooltip(G.fmtDist(G.length(measure)), {
        permanent: true,
        direction: 'right',
        offset: [8, 0],
        className: 'duar-tip'
      }).addTo(ms);
    }
  }, [draft, measure, tool, editVerts, props.rev]);
  useEffectMC(() => {
    if (elRef.current) elRef.current.style.cursor = tool === 'select' && !moving ? '' : 'crosshair';
  }, [tool, moving]);
  const sep = /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 12,
      background: 'var(--border)'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: elRef,
    style: {
      position: 'absolute',
      inset: 0,
      background: '#e8e4df'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      bottom: 26,
      zIndex: 500,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      pointerEvents: 'none',
      height: 30
    }
  }, props.overlays.coords !== false && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '5px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-sm)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 11,
      whiteSpace: 'pre',
      height: 19
    }
  }, /*#__PURE__*/React.createElement("span", {
    ref: coordRef
  }, 'Lat ' + D.centro[0].toFixed(5) + '°  Lon ' + D.centro[1].toFixed(5) + '°'), sep, /*#__PURE__*/React.createElement("span", {
    ref: elevRef
  }, 'Elev. ' + G.fmtM(G.elev(D.centro)))), props.overlays.escala !== false && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      justifyContent: 'center',
      padding: '5px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-sm)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      width: escala.px,
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, escala.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      width: escala.px,
      height: 5,
      border: '1px solid var(--foreground)',
      boxSizing: 'border-box'
    }
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      background: i % 2 ? 'transparent' : 'var(--foreground)'
    }
  }))))), ReactDOM.createPortal(props.popupNode || null, popEl.current));
}
window.MapCanvas = MapCanvas;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/MapCanvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/MapChrome.jsx
try { (() => {
/* Elementos flotantes sobre el mapa: grupos, banner de modo, aviso y globos de información. */
const NSC = window.DUARDiseOMapa_7e942c;
const corto = n => n.split(' — ')[0];
const fecha = f => f ? f.split('-').reverse().join('/') : '—';
function BasePopover({
  base,
  onBase
}) {
  const {
    Icon
  } = NSC;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: 6,
      background: 'var(--card)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)'
    }
  }, window.MapaData.bases.map(b => {
    const on = b.id === base;
    return /*#__PURE__*/React.createElement("button", {
      key: b.id,
      type: "button",
      onClick: () => onBase(b.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        width: 72,
        padding: '8px 4px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--border)'),
        background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
        color: on ? 'var(--primary)' : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 11,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: b.icon,
      size: 16
    }), b.label);
  }));
}
function GruposFloat({
  grupos,
  poligonos,
  open,
  setOpen,
  onGrupo
}) {
  const {
    Icon,
    StatusBadge
  } = NSC;
  const terreno = grupos.filter(g => ['rastrillando', 'desplegado'].includes(g.estado)).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 290,
      background: 'var(--card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      overflow: 'hidden',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(!open),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#16a34a',
      boxShadow: '0 0 0 3px color-mix(in srgb, rgba(22,163,74,0.3) var(--tinte-oscuro, 0%), #dcfce7)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11.5,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--foreground)'
    }
  }, "Grupos operativos"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, terreno, " en terreno \xB7 ", grupos.length - terreno, " en base")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 7px',
      borderRadius: 999,
      background: 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, grupos.length), /*#__PURE__*/React.createElement(Icon, {
    name: open ? 'chevron-up' : 'chevron-down',
    size: 15,
    color: "var(--muted-foreground)"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      padding: 6,
      maxHeight: 320,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, grupos.map(g => {
    const pol = poligonos.find(p => p.grupoId === g.id);
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      type: "button",
      onClick: () => onGrupo(g, pol),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-family-primary)'
      },
      onMouseEnter: e => e.currentTarget.style.background = 'var(--muted)',
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: g.color,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--foreground)'
      }
    }, g.nombre), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 10.5,
        color: 'var(--muted-foreground)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, pol ? corto(pol.nombre) : 'Sin sector', " \xB7 ", g.integrantes, " integrantes")), /*#__PURE__*/React.createElement(StatusBadge, {
      estado: g.estado,
      size: "sm"
    }));
  })));
}
function ModoBanner({
  tool,
  draft,
  measure,
  editing,
  moving,
  onUndo,
  onFinish,
  onCancel,
  onSaveGeom,
  onSaveMove,
  onClearMeasure
}) {
  const {
    Button,
    Icon
  } = NSC;
  const w = {
    color: '#fff'
  };
  let txt = null,
    acc = null;
  if (moving) {
    txt = 'Arrastrá el marcador o hacé clic donde se trasladó la instalación';
    acc = /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      onClick: onSaveMove
    }, "Guardar ubicaci\xF3n");
  } else if (editing) {
    txt = 'Arrastrá los vértices para modificar el sector';
    acc = /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      onClick: onSaveGeom
    }, "Guardar geometr\xEDa");
  } else if (tool === 'poligono') {
    txt = draft.length < 3 ? `Hacé clic para marcar vértices (${draft.length}/3 mínimo)` : 'Doble clic o clic en el primer vértice para cerrar';
    acc = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "undo-2",
      disabled: !draft.length,
      onClick: onUndo,
      style: w
    }, "Deshacer"), /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      disabled: draft.length < 3,
      onClick: onFinish
    }, "Terminar"));
  } else if (tool === 'circulo' || tool === 'cuadrado') txt = 'Pulsá y arrastrá en el mapa para dibujar el sector ' + (tool === 'circulo' ? 'circular' : 'cuadrado') + ' · Esc cancela';else if (tool === 'medir') {
    txt = measure.length > 1 ? 'Distancia total: ' + window.Geo.fmtDist(window.Geo.length(measure)) + ' · ' + (measure.length - 1) + ' tramos' : 'Hacé clic en el mapa para medir una distancia';
    acc = measure.length ? /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "eraser",
      onClick: onClearMeasure,
      style: w
    }, "Limpiar") : null;
  } else if (tool === 'poi') txt = 'Hacé clic en el mapa para marcar el punto de interés';else if (tool === 'hallazgo') txt = 'Hacé clic en el mapa donde se encontró la pista';else if (tool === 'instalacion') txt = 'Hacé clic en el mapa para ubicar la instalación';else if (tool === 'puntoCero') txt = 'Hacé clic en el mapa para colocar el nuevo Punto Cero / LSP';
  if (!txt) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 68,
      zIndex: 950,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 6px 6px 14px',
      borderRadius: 'var(--radius)',
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      width: 'max-content',
      maxWidth: 'calc(100% - 390px)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '1 1 auto'
    }
  }, txt), acc, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: onCancel,
    style: {
      color: '#fff',
      padding: '6px 8px'
    },
    title: "Cancelar (Esc)"
  }));
}
function Toast({
  t
}) {
  const {
    Icon
  } = NSC;
  if (!t) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 72,
      transform: 'translateX(-50%)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 16px',
      borderRadius: 'var(--radius)',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 13,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon || 'circle-check',
    size: 16,
    color: t.color || '#16a34a'
  }), t.msg);
}
const stat = (l, v) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
  style: {
    margin: 0,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--muted-foreground)'
  }
}, l), /*#__PURE__*/React.createElement("p", {
  style: {
    margin: '2px 0 0',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--foreground)'
  }
}, v));
const fechaHora = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const z = n => String(n).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
};
const duracionGpx = (a, b) => {
  const ms = new Date(b) - new Date(a);
  if (!a || !b || isNaN(ms) || ms < 0) return '—';
  const min = Math.round(ms / 60000),
    h = Math.floor(min / 60);
  return h ? h + ' h ' + String(min % 60).padStart(2, '0') + ' min' : min + ' min';
};
const filaDato = (l, v) => /*#__PURE__*/React.createElement("p", {
  style: {
    margin: 0,
    fontSize: 12,
    color: 'var(--muted-foreground)',
    lineHeight: 1.5
  }
}, l, " ", /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--foreground)',
    fontWeight: 600
  }
}, v));
function TrazaPopup({
  t,
  grupo,
  pol,
  onClose,
  onEliminar,
  onPoligono
}) {
  const {
    MapPopup,
    ElevationProfile,
    Button
  } = NSC;
  const c = grupo ? grupo.color : '#444140',
    pf = window.Geo.perfil(t.puntos);
  return /*#__PURE__*/React.createElement(MapPopup, {
    icon: "route",
    color: c,
    kicker: "Track GPX",
    centrado: true,
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, pol && /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "pentagon",
      onClick: onPoligono
    }, corto(pol.nombre)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      title: "Eliminar track",
      "aria-label": "Eliminar track",
      onClick: onEliminar,
      onMouseEnter: e => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--destructive) 10%, transparent)';
        e.currentTarget.style.color = 'var(--destructive)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--muted-foreground)';
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        marginLeft: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: 'transparent',
        color: 'var(--muted-foreground)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(NSC.Icon, {
      name: "trash-2",
      size: 15
    })))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      marginTop: -4
    }
  }, filaDato('Recorrido de', t.agente || 'Sin agente'), filaDato('Inicio:', /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)',
      fontWeight: 400,
      color: '#2A2F2AE6'
    }
  }, fechaHora(t.inicio))), filaDato('Fin:', /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)',
      fontStyle: 'normal',
      fontWeight: 400,
      color: '#2A2F2AE6'
    }
  }, fechaHora(t.fin)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, stat('Distancia', window.Geo.fmtKm(pf.dist[pf.dist.length - 1])), stat('Duración', duracionGpx(t.inicio, t.fin)), stat('Desnivel', '↑ ' + window.Geo.fmtM(pf.up))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2A2F2A9E'
    }
  }, "Cargado por"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2A2F2A9E',
      fontWeight: 400
    }
  }, t.agente || '—'), t.cargado && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, t.cargado))));
}
function PuntoPopup({
  p,
  onClose,
  onEditar
}) {
  const {
    MapPopup,
    MapMarker,
    Button,
    TIPOS_MARCADOR
  } = NSC;
  const c = TIPOS_MARCADOR[p.tipo];
  return /*#__PURE__*/React.createElement(MapPopup, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: p.tipo,
      variant: "chip"
    }),
    color: c.color,
    kicker: c.label,
    title: p.nombre,
    subtitle: window.Geo.fmtCoord(p.lat, p.lng),
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      icon: "pencil",
      onClick: onEditar
    }, "Ver y editar")
  }, p.descripcion && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--foreground)'
    }
  }, p.descripcion), p.detalle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)',
      lineHeight: 1.5,
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, p.detalle), !p.descripcion && !p.detalle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Sin descripci\xF3n cargada."));
}
function InstalacionPopup({
  i,
  onClose,
  onEditar,
  onReubicar
}) {
  const {
    MapPopup,
    MapMarker,
    Button,
    TIPOS_MARCADOR
  } = NSC;
  const c = TIPOS_MARCADOR[i.tipo];
  return /*#__PURE__*/React.createElement(MapPopup, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: i.tipo,
      variant: "chip"
    }),
    color: c.color,
    kicker: 'Instalación SCI · ' + c.glyph,
    title: i.nombre,
    subtitle: window.Geo.fmtCoord(i.lat, i.lng),
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "move",
      onClick: onReubicar
    }, "Reubicar"), /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      icon: "pencil",
      onClick: onEditar
    }, "Editar"))
  }, i.notas && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: 'var(--foreground)',
      lineHeight: 1.5
    }
  }, i.notas), i.responsable && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Responsable: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--foreground)',
      fontWeight: 600
    }
  }, i.responsable)));
}
function PuntoCeroPopup({
  pc,
  onClose,
  onActualizar
}) {
  const {
    MapPopup,
    MapMarker,
    Button
  } = NSC;
  return /*#__PURE__*/React.createElement(MapPopup, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: "puntoCero",
      variant: "chip"
    }),
    color: "var(--marker-punto-cero)",
    kicker: "Punto Cero \xB7 LSP",
    title: "\xDAltimo punto de avistamiento",
    subtitle: window.Geo.fmtCoord(pc.lat, pc.lng),
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      icon: "crosshair",
      onClick: onActualizar
    }, "Actualizar Punto Cero")
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: 'var(--foreground)',
      lineHeight: 1.5
    }
  }, pc.descripcion), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, "Actualizado ", pc.actualizado));
}
Object.assign(window, {
  BasePopover,
  GruposFloat,
  ModoBanner,
  Toast,
  TrazaPopup,
  PuntoPopup,
  InstalacionPopup,
  PuntoCeroPopup
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/MapChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/Modals.jsx
try { (() => {
/* Modales del mapa: nuevo polígono (CU-27), cargar GPX (CU-29), eliminar (CU-36), Punto Cero (CU-34). */
const {
  useState: useStateM,
  useRef: useRefM,
  useEffect: useEffectM
} = React;
const NSM = window.DUARDiseOMapa_7e942c;
function NuevoPoligonoModal({
  vertices,
  grupos,
  n,
  onCancel,
  onSave
}) {
  const {
    Modal,
    Button,
    TextField,
    SelectField
  } = NSM;
  const [nombre, setNombre] = useStateM('Sector ' + n + ' — ');
  const [grupoId, setGrupoId] = useStateM('');
  const [notas, setNotas] = useStateM('');
  const [err, setErr] = useStateM(false);
  const guardar = () => {
    if (nombre.replace(/ — ?$/, '').trim().length < 3) {
      setErr(true);
      return;
    }
    onSave({
      nombre: nombre.replace(/ — $/, ''),
      grupoId: grupoId || null,
      notas
    });
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Nuevo pol\xEDgono",
    subtitle: 'Sector de rastrillaje · ' + vertices.length + ' vértices · ' + window.Geo.fmtArea(window.Geo.area(vertices)),
    icon: "pentagon",
    onClose: onCancel,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      onClick: guardar
    }, "Guardar pol\xEDgono"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Nombre",
    required: true,
    value: nombre,
    onChange: v => {
      setNombre(v);
      setErr(false);
    }
  }), err && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '-8px 0 0',
      fontSize: 12,
      color: 'var(--destructive)'
    }
  }, "Ingres\xE1 un nombre para el pol\xEDgono."), /*#__PURE__*/React.createElement(SelectField, {
    label: "Asignar a grupo",
    value: grupoId,
    onChange: setGrupoId,
    options: [{
      value: '',
      label: '— Asignar más tarde —'
    }, ...grupos.map(g => ({
      value: g.id,
      label: g.nombre + ' · ' + g.integrantes + ' integrantes'
    }))]
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Notas",
    multiline: true,
    rows: 3,
    value: notas,
    onChange: setNotas,
    placeholder: "Tipo de terreno, accesos, riesgos\u2026"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, grupoId ? 'El polígono queda en estado Asignado y el grupo pasa a Asignado.' : 'El polígono queda en estado Pendiente hasta que le asignes un grupo.')));
}
function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pts = [...doc.querySelectorAll('trkpt, rtept')].map(n => [parseFloat(n.getAttribute('lat')), parseFloat(n.getAttribute('lon'))]).filter(p => !isNaN(p[0]));
  const name = (doc.querySelector('trk > name, metadata > name') || {}).textContent;
  const tiempos = [...doc.querySelectorAll('trkpt > time, rtept > time')].map(n => n.textContent.trim()).filter(Boolean);
  return {
    pts,
    name,
    inicio: tiempos[0] || null,
    fin: tiempos[tiempos.length - 1] || null
  };
}
function GpxModal({
  grupos,
  poligonos,
  onCancel,
  onUpload
}) {
  const {
    Modal,
    Button,
    TextField,
    SelectField,
    Icon
  } = NSM;
  const fileRef = useRefM(null);
  const [archivo, setArchivo] = useStateM(null);
  const [err, setErr] = useStateM('');
  const [etiqueta, setEtiqueta] = useStateM('');
  const todos = grupos.flatMap(g => (g.agentes || []).map(a => ({
    ...a,
    grupoId: g.id,
    grupo: g
  })));
  const [agenteDni, setAgenteDni] = useStateM('');
  const [qa, setQa] = useStateM('');
  const [lista, setLista] = useStateM(false);
  const agente = todos.find(a => a.dni === agenteDni);
  const grupo = agente && agente.grupo;
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sugeridos = todos.filter(a => !qa.trim() || norm(a.nombre + ' ' + a.dni + ' ' + a.grupo.nombre + ' ' + a.dotacion).includes(norm(qa.trim()))).slice(0, 8);
  const detectar = pts => {
    const c = poligonos.map(p => ({
      p,
      n: pts.filter(x => window.Geo.inside(x, p.vertices)).length
    })).sort((a, b) => b.n - a.n)[0];
    return c && c.n / pts.length >= 0.3 ? {
      pol: c.p,
      pct: Math.round(c.n / pts.length * 100)
    } : {
      pol: null,
      pct: 0
    };
  };
  const sector = archivo ? detectar(archivo.pts) : null;
  const [poligonoId, setPoligonoId] = useStateM('');
  const [fecha, setFecha] = useStateM('2026-03-02');
  const [over, setOver] = useStateM(false);
  const cargar = file => {
    if (!file) return;
    if (!/\.gpx$/i.test(file.name)) {
      setErr('El archivo tiene que ser .gpx');
      return;
    }
    file.text().then(t => {
      const {
        pts,
        name,
        inicio,
        fin
      } = parseGpx(t);
      if (pts.length < 2) {
        setErr('No se encontraron puntos de recorrido en el archivo.');
        return;
      }
      setErr('');
      setArchivo({
        nombre: file.name,
        pts,
        inicio,
        fin
      });
      if (!etiqueta) setEtiqueta(name || file.name.replace(/\.gpx$/i, ''));
    });
  };
  const ejemplo = () => {
    const pol = poligonos.find(p => p.id === poligonoId) || poligonos.find(p => p.grupoId) || poligonos[0];
    const pts = window.MapaData.barrido(pol.vertices.map(v => [v[0] - 0.0035, v[1]]), 0.45, 16, 17).filter(p => window.Geo.inside(p, pol.vertices));
    setArchivo({
      nombre: 'bravo_0203_pm.gpx',
      pts,
      inicio: '2026-03-02T14:20:05',
      fin: '2026-03-02T17:02:44'
    });
    setErr('');
    if (!agenteDni && pol.grupoId) {
      const g = grupos.find(x => x.id === pol.grupoId);
      if (g && g.agentes) setAgenteDni(g.agentes[0].dni);
    }
    if (!etiqueta) setEtiqueta('Bravo — Tarde');
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Cargar traza GPX",
    subtitle: "Archivo exportado desde Wikiloc u otro GPS",
    icon: "route",
    onClose: onCancel,
    width: 540,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "upload",
      disabled: !archivo || !agente,
      onClick: () => onUpload({
        archivo: archivo.nombre,
        puntos: archivo.pts,
        inicio: archivo.inicio,
        fin: archivo.fin,
        etiqueta: (etiqueta || archivo.nombre.replace(/\.gpx$/i, '')).trim(),
        grupoId: agente.grupoId,
        agente: agente.nombre,
        agenteDni: agente.dni,
        poligonoId: sector && sector.pol ? sector.pol.id : null,
        fecha
      })
    }, "Cargar traza"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".gpx",
    style: {
      display: 'none'
    },
    onChange: e => cargar(e.target.files[0])
  }), archivo ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 'var(--radius)',
      background: 'rgba(22,163,74,0.08)',
      border: '1px solid rgba(22,163,74,0.3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'color-mix(in srgb, rgba(22,163,74,0.18) var(--tinte-oscuro, 0%), #dcfce7)',
      color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-check",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, archivo.nombre), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, archivo.pts.length, " puntos \xB7 ", window.Geo.fmtKm(window.Geo.length(archivo.pts)))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: () => setArchivo(null)
  }, "Quitar")) : /*#__PURE__*/React.createElement("div", {
    onClick: () => fileRef.current.click(),
    onDragOver: e => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      setOver(false);
      cargar(e.dataTransfer.files[0]);
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '26px 16px',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      border: '2px dashed ' + (over ? 'var(--primary)' : 'var(--border)'),
      background: over ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-up",
    size: 28,
    style: {
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, "Arrastr\xE1 el archivo .gpx o hac\xE9 clic para buscarlo"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5
    }
  }, "Se lee el recorrido (trkpt) y se dibuja sobre el mapa"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      ejemplo();
    },
    style: {
      marginTop: 4,
      background: 'none',
      border: 'none',
      color: 'var(--primary)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Usar archivo de ejemplo")), err && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '-6px 0 0',
      fontSize: 12,
      color: 'var(--destructive)'
    }
  }, err), sector && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderRadius: 'var(--radius)',
      marginTop: -4,
      background: sector.pol ? 'var(--muted)' : 'color-mix(in srgb, rgba(217,119,6,0.16) var(--tinte-oscuro, 0%), #fef3c7)',
      border: '1px solid ' + (sector.pol ? 'var(--border)' : 'color-mix(in srgb, rgba(217,119,6,0.5) var(--tinte-oscuro, 0%), #fcd34d)')
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: sector.pol ? 'pentagon' : 'triangle-alert',
    size: 15,
    color: sector.pol ? 'var(--primary)' : 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #b45309)'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--muted-foreground)'
    }
  }, "Sector detectado por coordenadas"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 13,
      fontWeight: 600,
      color: sector.pol ? 'var(--foreground)' : 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)'
    }
  }, sector.pol ? sector.pol.nombre : 'Fuera de los sectores del operativo', sector.pol && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--muted-foreground)',
      fontSize: 11.5
    }
  }, " \xB7 ", sector.pct, "% del recorrido dentro")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, agente ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--foreground)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)',
      lineHeight: 1.5
    }
  }, "Agente *"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 'var(--radius-input)',
      background: 'var(--input-background)',
      border: '1px solid var(--primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: grupo.color,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "footprints",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, agente.nombre), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, "DNI ", agente.dni), " \xB7 ", grupo.nombre, agente.lider ? ' (líder)' : '', " \xB7 ", agente.dotacion)), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: () => {
      setAgenteDni('');
      setQa('');
    }
  }, "Cambiar"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onFocus: () => setLista(true)
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Agente",
    required: true,
    value: qa,
    onChange: v => {
      setQa(v);
      setLista(true);
    },
    placeholder: "Buscar agente asignado por nombre, DNI o grupo\u2026"
  })), lista && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => setLista(false),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 'calc(100% + 4px)',
      zIndex: 2,
      maxHeight: 240,
      overflowY: 'auto',
      padding: 4,
      borderRadius: 'var(--radius-md)',
      background: 'var(--popover)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)'
    }
  }, sugeridos.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.dni,
    type: "button",
    onClick: () => {
      setAgenteDni(a.dni);
      setLista(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '7px 8px',
      borderRadius: 'var(--radius-sm)',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-family-primary)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--muted)',
    onMouseLeave: e => e.currentTarget.style.background = 'none'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      flexShrink: 0,
      background: a.grupo.color
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 12.5,
      fontWeight: 500,
      color: 'var(--popover-foreground)'
    }
  }, a.nombre), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, a.grupo.nombre, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, a.dni)))), !sugeridos.length && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: '8px',
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Ning\xFAn agente asignado coincide con \"", qa, "\".")))))));
}
function EliminarModal({
  tipo,
  nombre,
  extra,
  onCancel,
  onConfirm
}) {
  const {
    Modal,
    Button,
    Icon
  } = NSM;
  return /*#__PURE__*/React.createElement(Modal, {
    title: 'Eliminar ' + tipo,
    onClose: onCancel,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "md",
      icon: "trash-2",
      onClick: onConfirm
    }, "Eliminar"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'color-mix(in srgb, rgba(220,38,38,0.18) var(--tinte-oscuro, 0%), #fee2e2)',
      color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #dc2626)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "triangle-alert",
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: 'var(--foreground)',
      lineHeight: 1.55
    }
  }, "\xBFEliminar ", /*#__PURE__*/React.createElement("strong", null, nombre), " del mapa?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 12,
      color: 'var(--muted-foreground)',
      lineHeight: 1.55
    }
  }, extra || 'Deja de verse en el mapa. El registro queda en la auditoría del operativo.'))));
}
function PuntoCeroModal({
  from,
  to,
  nRadios,
  onCancel,
  onConfirm,
  onChange
}) {
  const {
    Modal,
    Button,
    TextField
  } = NSM;
  const [lat, setLat] = useStateM(String(to[0].toFixed(5)));
  const [lng, setLng] = useStateM(String(to[1].toFixed(5)));
  const num = s => parseFloat(String(s).replace(',', '.'));
  const la = num(lat),
    lo = num(lng);
  const ok = isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  useEffectM(() => {
    if (ok) onChange([la, lo]);
  }, [lat, lng]);
  const d = ok ? window.Geo.length([[from.lat, from.lng], [la, lo]]) : 0;
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Actualizar Punto Cero",
    subtitle: "\xDAltimo punto de avistamiento (LSP)",
    icon: "crosshair",
    onClose: onCancel,
    width: 480,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      disabled: !ok,
      onClick: () => onConfirm([la, lo])
    }, "Confirmar punto"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--muted)',
      border: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--muted-foreground)'
    }
  }, "Actual"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 12,
      color: 'var(--foreground)'
    }
  }, window.Geo.fmtCoord(from.lat, from.lng))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nueva latitud",
    value: lat,
    onChange: setLat,
    placeholder: "-31.98120"
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nueva longitud",
    value: lng,
    onChange: setLng,
    placeholder: "-64.92620"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: ok ? 'var(--muted-foreground)' : 'var(--destructive)',
      lineHeight: 1.55
    }
  }, ok ? /*#__PURE__*/React.createElement(React.Fragment, null, "El marcador se mueve ", window.Geo.fmtKm(d), ". Todos los usuarios del operativo van a ver el nuevo centro de operaciones.", nRadios ? ` Los ${nRadios} radios se recentran en el nuevo punto (vista previa punteada en el mapa).` : '') : 'Ingresá coordenadas válidas en grados decimales (latitud entre -90 y 90, longitud entre -180 y 180).')));
}
Object.assign(window, {
  NuevoPoligonoModal,
  GpxModal,
  EliminarModal,
  PuntoCeroModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/Modals.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/Panels.jsx
try { (() => {
/* Paneles de detalle a la derecha (polígono, traza, punto, instalación, Punto Cero) + modal de nueva instalación. */
const {
  useState: useStateP,
  useEffect: useEffectP
} = React;
const NSP = window.DUARDiseOMapa_7e942c;
const ovP = {
  color: 'var(--muted-foreground)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-label)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: 0
};
const cortoP = n => n.split(' — ')[0];
function DetailShell({
  chip,
  title,
  badge,
  onClose,
  sub,
  children,
  footer
}) {
  const {
    Icon
  } = NSP;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 340,
      maxWidth: '100%',
      zIndex: 800,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--card)',
      borderLeft: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 2,
      display: 'flex'
    }
  }, chip), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--foreground)',
      lineHeight: 1.25
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, badge))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: 'var(--muted)',
      borderBottom: '1px solid var(--border)',
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "crosshair",
    size: 12
  }), sub), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderTop: '1px solid var(--border)',
      display: 'flex',
      gap: 8
    }
  }, footer));
}
const iconChip = (icon, color) => {
  const {
    Icon
  } = NSP;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: color + '1f',
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14
  }));
};
const pill = (txt, color) => /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: color + '1f',
    color,
    fontSize: 10,
    fontWeight: 600
  }
}, txt);
const delBtn = onClick => {
  const {
    Button
  } = NSP;
  return /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "trash-2",
    onClick: onClick,
    style: {
      color: '#dc2626'
    }
  }, "Eliminar");
};
function GrupoAsignado({
  pol,
  grupos,
  poligonos,
  onAsignar,
  onQuitar,
  onSimularRepliegue
}) {
  const {
    Icon,
    StatusBadge,
    Button,
    SelectField
  } = NSP;
  const [cambiar, setCambiar] = useStateP(false);
  const [nuevo, setNuevo] = useStateP('');
  useEffectP(() => {
    setCambiar(false);
    setNuevo('');
  }, [pol.id]);
  const gr = grupos.find(g => g.id === pol.grupoId);
  const puedeCambiar = gr && gr.estado === 'asignado';
  const enTerreno = gr && ['desplegado', 'rastrillando'].includes(gr.estado);
  const opciones = [{
    value: '',
    label: 'Elegí un grupo…'
  }, ...grupos.filter(g => g.id !== pol.grupoId).map(g => {
    const otro = poligonos.find(p => p.grupoId === g.id);
    return {
      value: g.id,
      label: g.nombre + (otro ? ' · en ' + cortoP(otro.nombre) : ' · libre')
    };
  })];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Grupo asignado"), gr ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 12,
      borderRadius: 'var(--radius)',
      background: gr.color + '10',
      border: '1.5px solid ' + gr.color + '55'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: gr.color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: gr.especial ? 'dog' : 'users',
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, gr.nombre), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, gr.integrantes, " integrantes")), /*#__PURE__*/React.createElement(StatusBadge, {
    estado: gr.estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user-round",
    size: 13,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "L\xEDder"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, gr.lider)), !cambiar && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, puedeCambiar && /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "repeat",
    onClick: () => setCambiar(true)
  }, "Cambiar grupo"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "x",
    onClick: () => onQuitar(gr, enTerreno)
  }, "Quitar")), enTerreno && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      lineHeight: 1.45
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 12,
    style: {
      marginTop: 2,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", null, "El grupo est\xE1 en terreno: no se puede cambiar. Al pasar a Replegado sale solo del sector. ", /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSimularRepliegue,
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      color: 'var(--primary)',
      fontFamily: 'inherit',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Simular repliegue (demo)")))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 'var(--radius)',
      border: '1px dashed var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 18,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, "Sin grupo asignado"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, "El sector queda Pendiente hasta asignarle un grupo."))), (cambiar && puedeCambiar || !gr) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(SelectField, {
    style: {
      flex: 1,
      minWidth: 0
    },
    value: nuevo,
    onChange: setNuevo,
    options: opciones
  }), /*#__PURE__*/React.createElement(Button, {
    size: "md",
    disabled: !nuevo,
    onClick: () => {
      onAsignar(nuevo);
      setCambiar(false);
      setNuevo('');
    }
  }, "Asignar"), cambiar && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    icon: "x",
    onClick: () => setCambiar(false),
    title: "Cancelar"
  })));
}
function NotasSector({
  notas,
  onSave
}) {
  const {
    Button,
    TextField
  } = NSP;
  const [ed, setEd] = useStateP(false);
  const [v, setV] = useStateP(notas || '');
  useEffectP(() => {
    setEd(false);
    setV(notas || '');
  }, [notas]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Notas"), !ed && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: notas ? 'pencil' : 'plus',
    onClick: () => setEd(true)
  }, notas ? 'Editar nota' : 'Agregar nota')), ed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
    multiline: true,
    rows: 4,
    value: v,
    onChange: setV,
    placeholder: "Terreno, accesos, riesgos, indicaciones para el grupo\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "save",
    disabled: v === (notas || ''),
    onClick: () => onSave(v.trim())
  }, "Guardar nota"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => {
      setEd(false);
      setV(notas || '');
    }
  }, "Cancelar"))) : notas ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: 'var(--foreground)',
      lineHeight: 1.55,
      whiteSpace: 'pre-wrap'
    }
  }, notas) : /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Sin notas para este sector."));
}
const claveFecha = f => {
  const [dd, hh] = (f || '').split(' ');
  const [d, m, y] = (dd || '').split('/');
  return (y || '') + (m || '') + (d || '') + (hh || '');
};
function HistorialSector({
  pol,
  grupos,
  trazas
}) {
  const {
    Icon
  } = NSP;
  const G = id => grupos.find(g => g.id === id);
  const evs = [...(pol.historial || []).map(e => ({
    ...e
  })), ...trazas.filter(t => t.poligonoId === pol.id && t.cargado).map(t => ({
    ev: 'track',
    grupoId: t.grupoId,
    fecha: t.cargado,
    agente: t.agente,
    etiqueta: t.etiqueta
  }))].sort((a, b) => claveFecha(b.fecha).localeCompare(claveFecha(a.fecha)));
  const asistieron = [...new Set((pol.historial || []).filter(e => e.ev === 'asignado').map(e => e.grupoId))].map(G).filter(Boolean);
  const txt = e => {
    const g = G(e.grupoId),
      n = g ? g.nombre : 'Grupo';
    return e.ev === 'asignado' ? n + ' asignado al sector' : e.ev === 'quitado' ? n + ' quitado del sector' : e.ev === 'replegado' ? n + ' se replegó y salió del sector' : 'Track cargado por ' + (e.agente || '—');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Historial del sector"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, "Grupos que asistieron"), asistieron.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, asistieron.map(g => /*#__PURE__*/React.createElement("span", {
    key: g.id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 9px',
      borderRadius: 999,
      border: '1px solid ' + g.color + '66',
      background: g.color + '14',
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: g.color
    }
  }), g.nombre))) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Ning\xFAn grupo trabaj\xF3 todav\xEDa en este sector.")), evs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, evs.map((e, i) => {
    const g = G(e.grupoId),
      c = g ? g.color : '#64748b';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 10,
        position: 'relative',
        paddingBottom: i < evs.length - 1 ? 12 : 0
      }
    }, i < evs.length - 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 10,
        top: 22,
        bottom: 0,
        width: 1,
        background: 'var(--border)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 21,
        height: 21,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: c + '1f',
        color: c
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: e.ev === 'track' ? 'upload' : e.ev === 'asignado' ? 'log-in' : 'log-out',
      size: 11
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--foreground)',
        lineHeight: 1.35
      }
    }, txt(e)), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '1px 0 0',
        fontSize: 11,
        color: 'var(--muted-foreground)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-data)'
      }
    }, e.fecha), e.ev === 'track' ? ' · ' + (g ? g.nombre + ' · ' : '') + e.etiqueta : '')));
  })));
}
function NombreSector({
  nombre,
  onSave
}) {
  const {
    Button,
    TextField
  } = NSP;
  const [ed, setEd] = useStateP(false);
  const [v, setV] = useStateP(nombre);
  useEffectP(() => {
    setEd(false);
    setV(nombre);
  }, [nombre]);
  const ok = v.trim() && v.trim() !== nombre;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Nombre"), !ed && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "pencil",
    onClick: () => setEd(true)
  }, "Editar nombre")), ed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
    value: v,
    onChange: setV,
    onKeyDown: e => {
      if (e.key === 'Enter' && ok) onSave(v.trim());
      if (e.key === 'Escape') {
        setEd(false);
        setV(nombre);
      }
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "save",
    disabled: !ok,
    onClick: () => onSave(v.trim())
  }, "Guardar nombre"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => {
      setEd(false);
      setV(nombre);
    }
  }, "Cancelar"))) : /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--foreground)',
      lineHeight: 1.5
    }
  }, nombre));
}
function PoligonoPanel({
  pol,
  grupos,
  poligonos,
  trazas,
  onClose,
  onPatch,
  onAsignar,
  onQuitar,
  onSimularRepliegue,
  onCalcular,
  calculando,
  onEditGeom,
  onDelete,
  brechas,
  onToggleBrechas,
  onSelectTraza
}) {
  const {
    StatusBadge,
    CoverageBar,
    Button,
    TextField,
    Icon,
    ESTADOS
  } = NSP;
  const [nombre, setNombre] = useStateP(pol.nombre);
  useEffectP(() => setNombre(pol.nombre), [pol.id]);
  const gr = grupos.find(g => g.id === pol.grupoId),
    color = gr ? gr.color : '#475569';
  const tz = trazas.filter(t => t.poligonoId === pol.id);
  return /*#__PURE__*/React.createElement(DetailShell, {
    chip: iconChip('pentagon', color),
    title: pol.nombre,
    onClose: onClose,
    sub: 'Área ' + window.Geo.fmtArea(window.Geo.area(pol.vertices)) + ' · Perímetro ' + window.Geo.fmtKm(window.Geo.length(pol.vertices, true)),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      icon: "spline",
      onClick: onEditGeom,
      style: {
        flex: 1
      }
    }, "Editar geometr\xEDa"), delBtn(onDelete))
  }, /*#__PURE__*/React.createElement(NombreSector, {
    key: 'nombre-' + pol.id,
    nombre: pol.nombre,
    onSave: nombre => onPatch({
      nombre
    })
  }), /*#__PURE__*/React.createElement(GrupoAsignado, {
    pol: pol,
    grupos: grupos,
    poligonos: poligonos,
    onAsignar: onAsignar,
    onQuitar: onQuitar,
    onSimularRepliegue: onSimularRepliegue
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Cobertura por GPX"), pol.cobertura ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CoverageBar, {
    value: pol.cobertura.pct,
    label: ""
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, window.Geo.fmtKm(pol.cobertura.kmDentro * 1000), " recorridos dentro del sector \xB7 ", pol.cobertura.gaps.length, " celdas sin cubrir \xB7 calculado ", pol.cobertura.hora), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--foreground)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: brechas,
    onChange: onToggleBrechas,
    style: {
      accentColor: 'var(--primary)',
      margin: 0
    }
  }), "Mostrar brechas en el mapa"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "muted",
    icon: "refresh-cw",
    onClick: onCalcular,
    disabled: calculando || !tz.length
  }, calculando ? 'Calculando…' : 'Recalcular'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, tz.length ? 'Cruza los tracks GPX con el área del sector y marca las zonas que quedaron sin recorrer.' : 'Este sector todavía no tiene tracks GPX asociados.'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    icon: calculando ? 'loader-circle' : 'scan',
    onClick: onCalcular,
    disabled: calculando || !tz.length
  }, calculando ? 'Calculando…' : 'Calcular cobertura')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Tracks en este sector \xB7 ", tz.length), tz.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    onClick: () => onSelectTraza(t),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      background: 'var(--muted)',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 13,
    color: color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, t.etiqueta), t.agente && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      color: 'var(--muted-foreground)'
    }
  }, "Cargado por ", t.agente)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, window.Geo.fmtKm(window.Geo.length(t.puntos)))))), /*#__PURE__*/React.createElement(NotasSector, {
    key: 'notas-' + pol.id,
    notas: pol.notas,
    onSave: notas => onPatch({
      notas
    })
  }), /*#__PURE__*/React.createElement(HistorialSector, {
    pol: pol,
    grupos: grupos,
    trazas: trazas
  }));
}
function TrazaPanel({
  t,
  grupos,
  poligonos,
  onClose,
  onSave,
  onDelete
}) {
  const {
    TextField,
    SelectField,
    Button
  } = NSP;
  const [f, setF] = useStateP(t);
  useEffectP(() => setF(t), [t.id]);
  const gr = grupos.find(g => g.id === f.grupoId),
    color = gr ? gr.color : '#444140';
  const dirty = ['etiqueta', 'grupoId', 'poligonoId', 'fecha', 'notas'].some(k => f[k] !== t[k]);
  return /*#__PURE__*/React.createElement(DetailShell, {
    chip: iconChip('route', color),
    title: t.etiqueta,
    badge: pill('Track GPX · ' + t.archivo, color),
    onClose: onClose,
    sub: 'Inicio ' + window.Geo.fmtCoord(t.puntos[0][0], t.puntos[0][1]),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "save",
      disabled: !dirty,
      onClick: () => onSave(f),
      style: {
        flex: 1
      }
    }, "Guardar cambios"), delBtn(onDelete))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderRadius: 'var(--radius)',
      background: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement(NSP.Icon, {
    name: "user-round",
    size: 15,
    color: "var(--muted-foreground)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Cargado por"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, t.agente || '—', t.cargado && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-data)',
      fontSize: 11.5
    }
  }, " \xB7 ", t.cargado)))), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Etiqueta",
    value: f.etiqueta,
    onChange: v => setF({
      ...f,
      etiqueta: v
    })
  }), /*#__PURE__*/React.createElement(SelectField, {
    overline: true,
    label: "Grupo",
    value: f.grupoId || '',
    onChange: v => setF({
      ...f,
      grupoId: v || null
    }),
    options: [{
      value: '',
      label: '— Sin grupo —'
    }, ...grupos.map(g => ({
      value: g.id,
      label: g.nombre
    }))]
  }), /*#__PURE__*/React.createElement(SelectField, {
    overline: true,
    label: "Sector",
    value: f.poligonoId || '',
    onChange: v => setF({
      ...f,
      poligonoId: v || null
    }),
    options: [{
      value: '',
      label: '— Fuera de sector —'
    }, ...poligonos.map(p => ({
      value: p.id,
      label: p.nombre
    }))]
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Fecha",
    type: "date",
    value: f.fecha,
    onChange: v => setF({
      ...f,
      fecha: v
    })
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Notas",
    multiline: true,
    rows: 3,
    value: f.notas,
    onChange: v => setF({
      ...f,
      notas: v
    }),
    placeholder: "Observaciones del l\xEDder sobre el recorrido\u2026"
  }));
}
function PuntoPanel({
  p,
  onClose,
  onSave,
  onDelete
}) {
  const {
    TextField,
    Button,
    Icon,
    MapMarker,
    TIPOS_MARCADOR
  } = NSP;
  const [f, setF] = useStateP(p);
  useEffectP(() => setF(p), [p.id]);
  const c = TIPOS_MARCADOR[f.tipo];
  const dirty = ['tipo', 'nombre', 'descripcion', 'detalle'].some(k => f[k] !== p[k]);
  return /*#__PURE__*/React.createElement(DetailShell, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: f.tipo,
      variant: "chip"
    }),
    title: f.nombre || 'Sin nombre',
    badge: pill(c.label, c.color),
    onClose: onClose,
    sub: window.Geo.fmtCoord(p.lat, p.lng),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "save",
      disabled: !dirty,
      onClick: () => onSave(f),
      style: {
        flex: 1
      }
    }, "Guardar cambios"), delBtn(onDelete))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Tipo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6
    }
  }, ['poi', 'hallazgo'].map(tp => {
    const k = TIPOS_MARCADOR[tp],
      on = f.tipo === tp;
    return /*#__PURE__*/React.createElement("button", {
      key: tp,
      type: "button",
      onClick: () => setF({
        ...f,
        tipo: tp
      }),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        border: on ? '1.5px solid ' + k.color : '1.5px solid var(--border)',
        background: on ? k.bg : 'transparent',
        color: on ? k.color : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 12,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: k.icon,
      size: 13
    }), k.label);
  }))), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nombre",
    value: f.nombre,
    onChange: v => setF({
      ...f,
      nombre: v
    })
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Descripci\xF3n",
    value: f.descripcion,
    onChange: v => setF({
      ...f,
      descripcion: v
    }),
    placeholder: "Descripci\xF3n breve\u2026"
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Detalle / Notas de pista",
    multiline: true,
    rows: 5,
    value: f.detalle,
    onChange: v => setF({
      ...f,
      detalle: v
    }),
    placeholder: "Ingres\xE1 informaci\xF3n detallada: condiciones del lugar, evidencias encontradas, observaciones, hora de hallazgo\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Fotos de pista"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: 22,
      borderRadius: 'var(--radius-lg)',
      border: '2px dashed var(--border)',
      background: 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image-off",
    size: 26,
    style: {
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      textAlign: 'center'
    }
  }, "Sin fotos cargadas.", /*#__PURE__*/React.createElement("br", null), "Hac\xE9 clic o arrastr\xE1 im\xE1genes aqu\xED"))));
}
function TipoSciGrid({
  value,
  onChange
}) {
  const {
    MapMarker,
    TIPOS_MARCADOR,
    TIPOS_SCI
  } = NSP;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6
    }
  }, TIPOS_SCI.map(tp => {
    const on = value === tp;
    return /*#__PURE__*/React.createElement("button", {
      key: tp,
      type: "button",
      onClick: () => onChange(tp),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 9px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        border: on ? '1.5px solid #2563eb' : '1.5px solid var(--border)',
        background: on ? '#dbeafe' : 'transparent',
        color: on ? '#1d4ed8' : 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.2
      }
    }, /*#__PURE__*/React.createElement(MapMarker, {
      tipo: tp,
      variant: "mini"
    }), TIPOS_MARCADOR[tp].label);
  }));
}
function InstalacionPanel({
  i,
  onClose,
  onSave,
  onReubicar,
  onDelete
}) {
  const {
    TextField,
    Button,
    MapMarker,
    TIPOS_MARCADOR
  } = NSP;
  const [f, setF] = useStateP(i);
  useEffectP(() => setF(i), [i.id, i.lat, i.lng]);
  const dirty = ['tipo', 'nombre', 'notas', 'responsable'].some(k => f[k] !== i[k]);
  return /*#__PURE__*/React.createElement(DetailShell, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: f.tipo,
      variant: "chip"
    }),
    title: f.nombre || 'Sin nombre',
    badge: pill('Instalación SCI · ' + TIPOS_MARCADOR[f.tipo].glyph, '#2563eb'),
    onClose: onClose,
    sub: window.Geo.fmtCoord(i.lat, i.lng),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "save",
      disabled: !dirty,
      onClick: () => onSave(f),
      style: {
        flex: 1
      }
    }, "Guardar cambios"), delBtn(onDelete))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Tipo de instalaci\xF3n"), /*#__PURE__*/React.createElement(TipoSciGrid, {
    value: f.tipo,
    onChange: tp => setF({
      ...f,
      tipo: tp
    })
  })), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Nombre",
    value: f.nombre,
    onChange: v => setF({
      ...f,
      nombre: v
    })
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Responsable",
    value: f.responsable,
    onChange: v => setF({
      ...f,
      responsable: v
    }),
    placeholder: "Qui\xE9n est\xE1 a cargo"
  }), /*#__PURE__*/React.createElement(TextField, {
    overline: true,
    label: "Notas",
    multiline: true,
    rows: 3,
    value: f.notas,
    onChange: v => setF({
      ...f,
      notas: v
    }),
    placeholder: "Accesos, recursos disponibles, frecuencia de radio\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "Ubicaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Si la instalaci\xF3n se traslad\xF3, reubicala en el mapa. El cambio queda en la auditor\xEDa del operativo."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "move",
    onClick: onReubicar
  }, "Reubicar en el mapa"))));
}
function PuntoCeroPanel({
  pc,
  onClose,
  onMover
}) {
  const {
    Button,
    MapMarker
  } = NSP;
  return /*#__PURE__*/React.createElement(DetailShell, {
    chip: /*#__PURE__*/React.createElement(MapMarker, {
      tipo: "puntoCero",
      variant: "chip"
    }),
    title: "Punto Cero (LSP)",
    badge: pill('Último punto de avistamiento', NSP.TIPOS_MARCADOR.puntoCero.color),
    onClose: onClose,
    sub: window.Geo.fmtCoord(pc.lat, pc.lng),
    footer: /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "crosshair",
      onClick: onMover,
      fullWidth: true
    }, "Actualizar Punto Cero")
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--foreground)',
      lineHeight: 1.6
    }
  }, pc.descripcion), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: ovP
  }, "\xDAltima actualizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 13,
      color: 'var(--foreground)'
    }
  }, pc.actualizado)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11.5,
      color: 'var(--muted-foreground)'
    }
  }, "Es el centro del operativo: el clima y las distancias se toman desde este punto."));
}
function NuevaInstalacionModal({
  ll,
  onCancel,
  onSave
}) {
  const {
    Modal,
    Button,
    TextField,
    TIPOS_MARCADOR
  } = NSP;
  const [tipo, setTipo] = useStateP('base');
  const [nombre, setNombre] = useStateP(TIPOS_MARCADOR.base.label);
  const [tocado, setTocado] = useStateP(false);
  const [responsable, setResponsable] = useStateP('');
  const [notas, setNotas] = useStateP('');
  const elegir = tp => {
    setTipo(tp);
    if (!tocado) setNombre(TIPOS_MARCADOR[tp].label);
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Nueva instalaci\xF3n",
    subtitle: 'Sistema de Comando de Incidentes · ' + window.Geo.fmtCoord(ll[0], ll[1]),
    icon: "flag",
    onClose: onCancel,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      disabled: !nombre.trim(),
      onClick: () => onSave({
        tipo,
        nombre: nombre.trim(),
        responsable,
        notas
      })
    }, "Guardar instalaci\xF3n"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, "Tipo *"), /*#__PURE__*/React.createElement(TipoSciGrid, {
    value: tipo,
    onChange: elegir
  })), /*#__PURE__*/React.createElement(TextField, {
    label: "Nombre",
    required: true,
    value: nombre,
    onChange: v => {
      setNombre(v);
      setTocado(true);
    }
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Responsable",
    value: responsable,
    onChange: setResponsable,
    placeholder: "Qui\xE9n est\xE1 a cargo"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Notas",
    multiline: true,
    rows: 3,
    value: notas,
    onChange: setNotas,
    placeholder: "Accesos, recursos disponibles, frecuencia de radio\u2026"
  })));
}
Object.assign(window, {
  PoligonoPanel,
  TrazaPanel,
  PuntoPanel,
  InstalacionPanel,
  PuntoCeroPanel,
  NuevaInstalacionModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/Panels.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mapa/data.js
try { (() => {
/* Datos de ejemplo del Módulo 5 (Mapa Operacional) + geometría. Todo en window.MapaData / window.Geo. */
(function () {
  const R = 6371000;
  const toXY = (lat, lng, lat0) => [lng * Math.PI / 180 * R * Math.cos(lat0 * Math.PI / 180), lat * Math.PI / 180 * R];
  const lat0Of = pts => pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const Geo = {
    area(poly) {
      if (!poly || poly.length < 3) return 0;
      const l0 = lat0Of(poly);
      const xy = poly.map(p => toXY(p[0], p[1], l0));
      let a = 0;
      for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i],
          [x2, y2] = xy[(i + 1) % xy.length];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(a / 2);
    },
    length(pts, closed) {
      if (!pts || pts.length < 2) return 0;
      const l0 = lat0Of(pts);
      let d = 0;
      const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = toXY(...pts[i], l0),
          b = toXY(...pts[(i + 1) % pts.length], l0);
        d += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      return d;
    },
    inside(pt, poly) {
      let c = false;
      const [y, x] = pt;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [yi, xi] = poly[i],
          [yj, xj] = poly[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    },
    /** CU-38: muestrea una grilla dentro del polígono; una celda está cubierta si alguna traza pasa a < radio metros. */
    coverage(poly, trazas, spacing = 45, radio = 38) {
      const l0 = lat0Of(poly);
      const dLat = spacing / 110540,
        dLng = spacing / (111320 * Math.cos(l0 * Math.PI / 180));
      const lats = poly.map(p => p[0]),
        lngs = poly.map(p => p[1]);
      const segs = [];
      trazas.forEach(t => {
        const xy = t.puntos.map(p => toXY(p[0], p[1], l0));
        for (let i = 0; i < xy.length - 1; i++) segs.push([xy[i], xy[i + 1]]);
      });
      const cells = [];
      let cov = 0,
        total = 0,
        dentro = 0;
      for (let la = Math.min(...lats) + dLat / 2; la < Math.max(...lats); la += dLat) {
        for (let ln = Math.min(...lngs) + dLng / 2; ln < Math.max(...lngs); ln += dLng) {
          if (!Geo.inside([la, ln], poly)) continue;
          total++;
          const [px, py] = toXY(la, ln, l0);
          let ok = false;
          for (const [a, b] of segs) {
            const vx = b[0] - a[0],
              vy = b[1] - a[1],
              L = vx * vx + vy * vy;
            let t = L ? ((px - a[0]) * vx + (py - a[1]) * vy) / L : 0;
            t = Math.max(0, Math.min(1, t));
            if (Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy)) < radio) {
              ok = true;
              break;
            }
          }
          if (ok) cov++;else cells.push([la, ln]);
        }
      }
      trazas.forEach(t => t.puntos.forEach((p, i) => {
        if (i && Geo.inside(p, poly)) dentro += Geo.length([t.puntos[i - 1], p]);
      }));
      return {
        pct: total ? cov / total * 100 : 0,
        gaps: cells,
        dLat,
        dLng,
        kmDentro: dentro / 1000
      };
    },
    fmtArea: m2 => (m2 / 1e6).toLocaleString('es-AR', {
      maximumFractionDigits: 2
    }) + ' km²',
    fmtKm: m => (m / 1000).toLocaleString('es-AR', {
      maximumFractionDigits: 1
    }) + ' km',
    fmtCoord: (lat, lng) => lat.toFixed(5) + '°, ' + lng.toFixed(5) + '°',
    elev: p => Math.round(1880 + 260 * Math.sin((p[0] + 31.96) * 230) + 150 * Math.cos((p[1] + 64.90) * 190) + 6 * Math.sin(p[1] * 2600)),
    perfil(pts) {
      const dist = [0],
        el = [Geo.elev(pts[0])];
      let up = 0,
        down = 0;
      for (let i = 1; i < pts.length; i++) {
        dist.push(dist[i - 1] + Geo.length([pts[i - 1], pts[i]]));
        const e = Geo.elev(pts[i]);
        const de = e - el[i - 1];
        if (de > 0) up += de;else down -= de;
        el.push(e);
      }
      return {
        dist,
        el,
        min: Math.min(...el),
        max: Math.max(...el),
        up,
        down
      };
    },
    escala(lat, z) {
      const r = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z) * 96 / 0.0254;
      return '1:' + (Math.round(r / 500) * 500).toLocaleString('es-AR');
    },
    fmtRadio: km => km < 1 ? Math.round(km * 1000) + ' m' : km.toLocaleString('es-AR', {
      maximumFractionDigits: 2
    }) + ' km',
    fmtM: m => Math.round(m).toLocaleString('es-AR') + ' m',
    fmtDist: m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toLocaleString('es-AR', {
      maximumFractionDigits: 2
    }) + ' km',
    centroid(poly) {
      return [lat0Of(poly), poly.reduce((s, p) => s + p[1], 0) / poly.length];
    }
  };

  /* Recorrido "cortadora de césped" dentro del polígono, como el que deja Wikiloc en un rastrillaje. */
  function barrido(poly, fraccion, filas, semilla) {
    let s = semilla || 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const lats = poly.map(p => p[0]),
      lngs = poly.map(p => p[1]);
    const top = Math.max(...lats) - 0.0003,
      bot = Math.min(...lats) + 0.0003;
    const west = Math.min(...lngs),
      east = Math.max(...lngs);
    const n = Math.max(2, Math.round(filas * fraccion));
    const step = (top - bot) / (filas - 1);
    const pts = [];
    for (let r = 0; r < n; r++) {
      const la = top - r * step;
      const fila = [];
      for (let k = 0; k <= 16; k++) {
        const p = [la + (rnd() - 0.5) * step * 0.35, west + (east - west) * k / 16];
        if (Geo.inside(p, poly)) fila.push(p);
      }
      if (r % 2) fila.reverse();
      pts.push(...fila);
    }
    return pts;
  }
  const P = {
    s1: [[-31.9680, -64.9450], [-31.9700, -64.9280], [-31.9800, -64.9300], [-31.9790, -64.9480]],
    s2: [[-31.9700, -64.9280], [-31.9680, -64.9100], [-31.9810, -64.9080], [-31.9800, -64.9300]],
    s3: [[-31.9800, -64.9300], [-31.9810, -64.9080], [-31.9940, -64.9120], [-31.9930, -64.9310]],
    s4: [[-31.9790, -64.9480], [-31.9800, -64.9300], [-31.9930, -64.9310], [-31.9910, -64.9500]]
  };
  const grupos = [{
    id: 'g1',
    nombre: 'Grupo Alfa',
    color: '#E0662B',
    estado: 'replegado',
    lider: 'Lucía Zamora',
    integrantes: 6,
    agentes: [{
      nombre: 'Lucía Zamora',
      dni: '33.781.006',
      especialidad: 'Guía canino',
      dotacion: 'DUAR',
      lider: true
    }, {
      nombre: 'Valentina Paz',
      dni: '39.874.115',
      especialidad: null,
      dotacion: 'BV Alta Gracia'
    }, {
      nombre: 'Federico Luna',
      dni: '36.402.118',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Alta Gracia'
    }, {
      nombre: 'Mariana Ortiz',
      dni: '38.551.270',
      especialidad: 'Paramédico',
      dotacion: 'Defensa Civil Córdoba'
    }, {
      nombre: 'Gonzalo Vera',
      dni: '35.118.904',
      especialidad: 'Rastrillaje',
      dotacion: 'DUAR'
    }, {
      nombre: 'Rocío Funes',
      dni: '40.233.617',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Alta Gracia'
    }]
  }, {
    id: 'g2',
    nombre: 'Grupo Bravo',
    color: '#2563EB',
    estado: 'rastrillando',
    lider: 'Ramiro Sosa',
    integrantes: 7,
    agentes: [{
      nombre: 'Ramiro Sosa',
      dni: '36.220.418',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Villa General Belgrano',
      lider: true
    }, {
      nombre: 'Ana Quiroga',
      dni: '41.020.773',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Villa General Belgrano'
    }, {
      nombre: 'Sofía Ledesma',
      dni: '40.112.630',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Villa General Belgrano'
    }, {
      nombre: 'Pablo Cáceres',
      dni: '34.870.552',
      especialidad: 'Rescate en altura',
      dotacion: 'DUAR'
    }, {
      nombre: 'Emilia Torres',
      dni: '39.006.481',
      especialidad: 'Paramédico',
      dotacion: 'Defensa Civil Córdoba'
    }, {
      nombre: 'Bruno Acosta',
      dni: '37.441.209',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Villa General Belgrano'
    }, {
      nombre: 'Joaquín Peralta',
      dni: '38.912.330',
      especialidad: null,
      dotacion: 'BV Villa General Belgrano'
    }]
  }, {
    id: 'g3',
    nombre: 'Grupo Charlie',
    color: '#16A34A',
    estado: 'desplegado',
    lider: 'Camila Morales',
    integrantes: 5,
    agentes: [{
      nombre: 'Camila Morales',
      dni: '38.005.912',
      especialidad: 'Paramédico',
      dotacion: 'Defensa Civil Córdoba',
      lider: true
    }, {
      nombre: 'Nicolás Ibarra',
      dni: '37.556.201',
      especialidad: 'Rescate en altura',
      dotacion: 'DUAR'
    }, {
      nombre: 'Julieta Rivas',
      dni: '39.774.026',
      especialidad: 'Rastrillaje',
      dotacion: 'Defensa Civil Córdoba'
    }, {
      nombre: 'Tomás Benítez',
      dni: '36.118.745',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Tanti'
    }, {
      nombre: 'Florencia Gil',
      dni: '40.552.193',
      especialidad: null,
      dotacion: 'BV Tanti'
    }]
  }, {
    id: 'g4',
    nombre: 'Grupo Delta',
    color: '#D97706',
    estado: 'confirmado',
    lider: 'Martín Aguirre',
    integrantes: 6,
    agentes: [{
      nombre: 'Martín Aguirre',
      dni: '34.419.287',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Alta Gracia',
      lider: true
    }, {
      nombre: 'Agustina Molina',
      dni: '38.330.512',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Alta Gracia'
    }, {
      nombre: 'Lautaro Díaz',
      dni: '39.661.084',
      especialidad: 'Paramédico',
      dotacion: 'Defensa Civil Córdoba'
    }, {
      nombre: 'Carla Romero',
      dni: '37.205.948',
      especialidad: 'Rastrillaje',
      dotacion: 'DUAR'
    }, {
      nombre: 'Matías Suárez',
      dni: '40.887.316',
      especialidad: null,
      dotacion: 'BV Alta Gracia'
    }, {
      nombre: 'Paula Navarro',
      dni: '35.990.627',
      especialidad: 'Rastrillaje',
      dotacion: 'BV Alta Gracia'
    }]
  }, {
    id: 'g5',
    nombre: 'Canes K9',
    color: '#7C3AED',
    estado: 'en_espera',
    lider: 'Diego Herrera',
    integrantes: 3,
    agentes: [{
      nombre: 'Diego Herrera',
      dni: '29.663.140',
      especialidad: 'Guía canino',
      dotacion: 'DUAR',
      lider: true
    }, {
      nombre: 'Leandro Paz',
      dni: '33.402.871',
      especialidad: 'Guía canino',
      dotacion: 'DUAR'
    }, {
      nombre: 'Natalia Ruiz',
      dni: '36.774.590',
      especialidad: 'Guía canino',
      dotacion: 'DUAR'
    }],
    especial: true
  }];
  const poligonos = [{
    id: 'p1',
    nombre: 'Sector 1 — Arroyo Seco',
    grupoId: null,
    estado: 'completado',
    vertices: P.s1,
    notas: 'Zona de pastizal con dos pircas. Terreno firme.',
    visible: true,
    historial: [{
      ev: 'asignado',
      grupoId: 'g1',
      fecha: '01/03/2026 08:10'
    }, {
      ev: 'replegado',
      grupoId: 'g1',
      fecha: '02/03/2026 12:05'
    }]
  }, {
    id: 'p2',
    nombre: 'Sector 2 — Quebrada Norte',
    grupoId: 'g2',
    estado: 'rastrillando',
    vertices: P.s2,
    notas: 'Pendiente fuerte en el borde este.',
    visible: true,
    historial: [{
      ev: 'asignado',
      grupoId: 'g2',
      fecha: '02/03/2026 07:45'
    }]
  }, {
    id: 'p3',
    nombre: 'Sector 3 — Filo del Cerro',
    grupoId: 'g3',
    estado: 'asignado',
    vertices: P.s3,
    notas: '',
    visible: true,
    historial: [{
      ev: 'asignado',
      grupoId: 'g3',
      fecha: '02/03/2026 09:20'
    }]
  }, {
    id: 'p4',
    nombre: 'Sector 4 — Bosque de Tabaquillos',
    grupoId: null,
    estado: 'pendiente',
    vertices: P.s4,
    notas: 'Vegetación cerrada, requiere caminantes.',
    visible: true,
    historial: []
  }];
  const trazas = [{
    id: 't1',
    etiqueta: 'Alfa — Jornada 1',
    grupoId: 'g1',
    poligonoId: 'p1',
    fecha: '2026-03-01',
    horaInicio: '08:35',
    inicio: '2026-03-01T08:35:12',
    fin: '2026-03-01T12:15:40',
    archivo: 'alfa_0103.gpx',
    agente: 'Lucía Zamora',
    cargado: '01/03/2026 13:42',
    notas: '',
    puntos: barrido(P.s1, 1, 16, 3),
    visible: true
  }, {
    id: 't2',
    etiqueta: 'Alfa — Jornada 2',
    grupoId: 'g1',
    poligonoId: 'p1',
    fecha: '2026-03-02',
    horaInicio: '08:50',
    inicio: '2026-03-02T08:50:03',
    fin: '2026-03-02T09:55:21',
    archivo: 'alfa_0203.gpx',
    agente: 'Valentina Paz',
    cargado: '02/03/2026 10:15',
    notas: 'Repaso del borde sur.',
    puntos: barrido(P.s1.map(p => [p[0] - 0.0004, p[1]]), 0.35, 6, 11),
    visible: true
  }, {
    id: 't3',
    etiqueta: 'Bravo — Mañana',
    grupoId: 'g2',
    poligonoId: 'p2',
    fecha: '2026-03-02',
    horaInicio: '08:55',
    inicio: '2026-03-02T08:55:30',
    fin: '2026-03-02T11:10:48',
    archivo: 'bravo_0203_am.gpx',
    agente: 'Ramiro Sosa',
    cargado: '02/03/2026 11:30',
    notas: 'Reporte de media mañana.',
    puntos: barrido(P.s2, 0.5, 16, 5),
    visible: true
  }];
  const puntos = [{
    id: 'i1',
    visible: true,
    tipo: 'hallazgo',
    nombre: 'Prenda roja',
    lat: -31.9742,
    lng: -64.9205,
    descripcion: 'Campera roja talle M',
    detalle: 'Encontrada por Grupo Bravo a 30 m del sendero, 10:42 h. Coincide con la vestimenta del objetivo.',
    fotos: 0
  }, {
    id: 'i2',
    visible: true,
    tipo: 'poi',
    nombre: 'Refugio abandonado',
    lat: -31.9868,
    lng: -64.9395,
    descripcion: 'Puesto de piedra sin techo',
    detalle: '',
    fotos: 0
  }, {
    id: 'i3',
    visible: true,
    tipo: 'poi',
    nombre: 'Cruce de arroyo',
    lat: -31.9765,
    lng: -64.9345,
    descripcion: 'Vado con piedras sueltas',
    detalle: 'Peligroso con lluvia.',
    fotos: 0
  }];
  window.Geo = Geo;
  window.MapaData = {
    barrido,
    centro: [-31.981, -64.929],
    operativo: {
      nombre: 'Búsqueda Cerro Champaquí',
      estado: 'activo',
      ubicacion: 'Cerro Champaquí, Córdoba',
      fechaInicio: '28/2/2026',
      dia: 3,
      clima: {
        temperatura: 14,
        descripcion: 'Parcialmente nublado'
      }
    },
    usuario: {
      nombre: 'Miguel',
      apellido: 'Giménez',
      rol: 'coordinador',
      email: 'mgimenez@duar.gob.ar'
    },
    puntoCero: {
      lat: -31.9812,
      lng: -64.9262,
      actualizado: '28/2/2026 18:20',
      descripcion: 'Último punto de avistamiento (LSP). Estacionamiento del sendero al Champaquí.'
    },
    instalaciones: [{
      id: 's1',
      tipo: 'puestoComando',
      nombre: 'Puesto de Comando',
      lat: -31.9965,
      lng: -64.9080,
      notas: 'Mesa coordinadora y camioneta de comunicaciones.',
      responsable: 'Miguel Giménez',
      visible: true
    }, {
      id: 's2',
      tipo: 'base',
      nombre: 'Base',
      lat: -31.9992,
      lng: -64.9030,
      notas: 'Vehículos, combustible y equipamiento.',
      responsable: '',
      visible: true
    }, {
      id: 's3',
      tipo: 'helipunto',
      nombre: 'Helipunto',
      lat: -31.9880,
      lng: -64.9150,
      notas: 'Claro de 30 × 30 m, apto helicóptero policial.',
      responsable: '',
      visible: true
    }, {
      id: 's4',
      tipo: 'espera',
      nombre: 'Área de Espera',
      lat: -31.9950,
      lng: -64.9125,
      notas: 'Recursos disponibles para asignar.',
      responsable: '',
      visible: true
    }],
    grupos,
    poligonos,
    trazas,
    puntos,
    paletaRadios: ['#0891B2', '#0D9488', '#DB2777', '#7C3AED', '#EA580C', '#475569'],
    radios: [{
      id: 'r1',
      km: 0.5,
      color: '#0891B2',
      visible: true
    }, {
      id: 'r2',
      km: 1,
      color: '#0D9488',
      visible: true
    }, {
      id: 'r3',
      km: 2,
      color: '#DB2777',
      visible: true
    }, {
      id: 'r4',
      km: 4,
      color: '#7C3AED',
      visible: true
    }],
    bases: [{
      id: 'politico',
      label: 'Político',
      icon: 'map',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap'
    }, {
      id: 'fisico',
      label: 'Físico',
      icon: 'mountain',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap (CC-BY-SA)'
    }, {
      id: 'satelital',
      label: 'Satelital',
      icon: 'satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri'
    }]
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mapa/data.js", error: String((e && e.message) || e) }); }

// ui_kits/paleta.js
try { (() => {
/* Paleta activa del sistema: ?paleta= > window.DUAR_PALETA > última elegida > "original". Sincroniza iframes (mapa embebido). */
(function () {
  var qs = new URLSearchParams(location.search),
    root = document.documentElement;
  window.DUAR_PALETAS = [{
    id: 'original',
    nombre: 'Original',
    sub: 'Naranja · tema original',
    colores: ['#444140', '#E0662B', '#FFA987', '#F7EBE8']
  }, {
    id: 'tactico',
    nombre: 'Paleta 2 · Táctico',
    sub: 'Ámbar, verde y caqui · claro',
    colores: ['#2a2f2a', '#4c5a46', '#8a7c53', '#c07a4a', '#efe8da']
  }, {
    id: 'marino',
    nombre: 'Paleta 3 · Marino',
    sub: 'Marino, naranja y celeste',
    colores: ['#023047', '#1f7a8c', '#fb8500', '#8ecae6', '#f8fafc']
  }];
  function set(p) {
    if (p && !window.DUAR_PALETAS.some(x => x.id === p)) p = 'original';
    if (!p || p === 'original') root.removeAttribute('data-paleta');else root.setAttribute('data-paleta', p);
  }
  var par = null,
    parDark = false;
  try {
    if (window.frameElement && window.frameElement.hasAttribute('data-embed')) {
      par = parent.duarPaleta();
      parDark = parent.document.documentElement.classList.contains('dark');
    }
  } catch (e) {}
  var guardada = null;
  try {
    guardada = localStorage.getItem('duar-paleta');
  } catch (e) {}
  set(qs.get('paleta') || par || window.DUAR_PALETA || guardada || 'original');
  if (qs.get('dark') === '1' || parDark) root.classList.add('dark');
  function avisar() {
    window.dispatchEvent(new Event('duar-paleta'));
    var msg = {
      duarPaleta: root.getAttribute('data-paleta') || 'original',
      duarDark: root.classList.contains('dark')
    };
    document.querySelectorAll('iframe').forEach(function (f) {
      try {
        f.contentWindow.postMessage(msg, '*');
      } catch (e) {}
    });
  }
  window.duarPaleta = function () {
    return root.getAttribute('data-paleta') || 'original';
  };
  window.duarSetPaleta = function (p) {
    set(p);
    try {
      localStorage.setItem('duar-paleta', p);
    } catch (e) {}
    avisar();
  };
  window.duarSetDark = function (v) {
    root.classList.toggle('dark', !!v);
    avisar();
  };
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.duarPaleta === undefined && d.duarDark === undefined) return;
    if (d.duarPaleta !== undefined) set(d.duarPaleta);
    if (d.duarDark !== undefined) root.classList.toggle('dark', !!d.duarDark);
    window.dispatchEvent(new Event('duar-paleta'));
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/paleta.js", error: String((e && e.message) || e) }); }

// ui_kits/sistema/AgentesModulo.jsx
try { (() => {
/* Módulo Agentes del operativo (CU-17 a CU-26): pestaña Agentes (tarjetas/lista) y pestaña Grupos (tablero con arrastrar y soltar). */
const {
  useState: useStateA,
  useMemo: useMemoA
} = React;
const NSA = window.DUARDiseOMapa_7e942c;
function Dotacion({
  a
}) {
  const {
    Icon
  } = NSA;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      color: 'var(--foreground)'
    }
  }, a.esDuar && /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 12,
    color: "var(--primary)"
  }), a.dotacion);
}
function PestanaAgentes({
  agentes,
  avisar,
  quitar
}) {
  const {
    AvatarAgente,
    EstadoAgenteBadge,
    FiltroDesplegable,
    ESTADOS_AGENTE
  } = NSA;
  const [vista, setVista] = useStateA('card');
  const [q, setQ] = useStateA('');
  const [est, setEst] = useStateA([]);
  const [esp, setEsp] = useStateA([]);
  const especialidades = [...new Set(agentes.map(a => a.especialidad).filter(Boolean))];
  const lista = useMemoA(() => agentes.filter(a => (!est.length || est.includes(a.estado)) && (!esp.length || esp.some(e => e === 'none' ? !a.especialidad : a.especialidad === e)) && (!q || (a.nombre + ' ' + a.apellido + ' ' + a.dni + ' ' + a.dotacion + ' ' + (a.especialidad || '')).toLowerCase().includes(q.toLowerCase()))), [agentes, est, esp, q]);
  const acciones = a => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "history",
    title: "L\xEDnea de tiempo",
    onClick: () => avisar('Línea de tiempo de ' + a.nombre + ' ' + a.apellido, 'history', 'var(--foreground)')
  }), /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "pencil",
    title: "Editar datos operativos",
    onClick: () => avisar('Editar datos operativos', 'pencil', 'var(--foreground)')
  }), /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "x",
    title: "Quitar del operativo",
    tono: "peligro",
    onClick: () => quitar(a)
  }));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(Buscador, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar por nombre, DNI, dotaci\xF3n, especialidad..."
  }), /*#__PURE__*/React.createElement(SelectorVista, {
    value: vista,
    onChange: setVista
  })), /*#__PURE__*/React.createElement(BarraFiltros, null, /*#__PURE__*/React.createElement(FiltroDesplegable, {
    titulo: "Estado",
    seleccion: est,
    onCambiar: setEst,
    opciones: Object.keys(ESTADOS_AGENTE).map(k => ({
      value: k,
      label: ESTADOS_AGENTE[k].label,
      dot: ESTADOS_AGENTE[k].dot,
      count: agentes.filter(a => a.estado === k).length
    }))
  }), /*#__PURE__*/React.createElement(FiltroDesplegable, {
    titulo: "Especialidad",
    seleccion: esp,
    onCambiar: setEsp,
    opciones: [...especialidades.map(e => ({
      value: e,
      label: e,
      count: agentes.filter(a => a.especialidad === e).length
    })), {
      value: 'none',
      label: 'Sin especialidad',
      count: agentes.filter(a => !a.especialidad).length
    }]
  }), (est.length > 0 || esp.length > 0) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setEst([]);
      setEsp([]);
    },
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--primary)',
      fontWeight: 600,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)'
    }
  }, "Limpiar filtros"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, lista.length, " de ", agentes.length, " agentes")))), lista.length === 0 ? /*#__PURE__*/React.createElement(Vacio, {
    icon: "search",
    titulo: "Sin resultados",
    texto: "Ning\xFAn agente coincide con los filtros aplicados."
  }) : vista === 'card' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16
    }
  }, lista.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      ...tarjetaBase,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(AvatarAgente, {
    esDuar: a.esDuar,
    esConductor: a.esConductor,
    esRecursoCritico: a.esRecursoCritico,
    tamano: 40
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, a.nombre, " ", a.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-data)'
    }
  }, "DNI: ", a.dni))), acciones(a)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(EstadoAgenteBadge, {
    estado: a.estado,
    size: "xs"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-data)'
    }
  }, a.hace)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Dato, {
    titulo: "Dotaci\xF3n"
  }, /*#__PURE__*/React.createElement(Dotacion, {
    a: a
  })), /*#__PURE__*/React.createElement(Dato, {
    titulo: "Especialidad"
  }, a.especialidad || /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)',
      fontWeight: 400
    }
  }, "Sin especialidad")))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--elevation-sm)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--muted)',
      borderBottom: '1px solid var(--border)'
    }
  }, ['Agente', 'Estado Op.', 'Dotación', 'Especialidad', ''].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: 'left',
      padding: '12px 16px',
      color: 'var(--muted-foreground)',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, lista.map((a, i) => /*#__PURE__*/React.createElement("tr", {
    key: a.id,
    style: {
      borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none',
      fontSize: 'var(--text-base)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(AvatarAgente, {
    esDuar: a.esDuar,
    esConductor: a.esConductor,
    esRecursoCritico: a.esRecursoCritico,
    tamano: 32
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 500
    }
  }, a.nombre, " ", a.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-data)'
    }
  }, a.dni)))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(EstadoAgenteBadge, {
    estado: a.estado,
    size: "xs"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-data)'
    }
  }, a.hace))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Dotacion, {
    a: a
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, a.especialidad || /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, acciones(a)))))))));
}
function FilaTablero({
  a,
  lider,
  onDrag
}) {
  const {
    AvatarAgente,
    EstadoAgenteBadge
  } = NSA;
  const tags = [lider ? 'Líder' : null, a.esDuar ? 'DUAR' : null].filter(Boolean);
  return /*#__PURE__*/React.createElement("div", {
    draggable: true,
    onDragStart: e => {
      e.dataTransfer.setData('text/plain', a.id);
      onDrag(a.id);
    },
    onDragEnd: () => onDrag(null),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      cursor: 'grab'
    }
  }, /*#__PURE__*/React.createElement(AvatarAgente, {
    esDuar: a.esDuar,
    esConductor: a.esConductor,
    esRecursoCritico: a.esRecursoCritico,
    tamano: 30
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, a.nombre, " ", a.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10.5,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, a.especialidad || 'Sin especialidad')), tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: 9.5,
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 999,
      background: t === 'Líder' ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--muted)',
      color: t === 'Líder' ? 'var(--primary)' : 'var(--muted-foreground)'
    }
  }, t)), /*#__PURE__*/React.createElement(EstadoAgenteBadge, {
    estado: a.estado,
    size: "xs"
  }));
}
function ZonaSoltar({
  activo,
  onDrop,
  children,
  style
}) {
  const [over, setOver] = useStateA(false);
  return /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      setOver(false);
      onDrop(e.dataTransfer.getData('text/plain'));
    },
    style: {
      ...style,
      outline: activo ? over ? '2px solid var(--primary)' : '2px dashed var(--border)' : 'none',
      outlineOffset: 2,
      background: over ? 'color-mix(in srgb, var(--primary) 5%, ' + (style.background || 'transparent') + ')' : style.background
    }
  }, children);
}
function PestanaGrupos({
  agentes,
  setAgentes,
  grupos,
  avisar
}) {
  const {
    StatusBadge,
    Icon
  } = NSA;
  const [drag, setDrag] = useStateA(null);
  const mover = (id, gid) => {
    const a = agentes.find(x => x.id === id);
    if (!a || a.grupo === gid) return;
    if (gid && a.estado === 'no_disponible') {
      avisar('No se puede agrupar a un agente No disponible', 'triangle-alert', '#b45309');
      return;
    }
    setAgentes(as => as.map(x => x.id === id ? {
      ...x,
      grupo: gid,
      lider: gid ? x.lider === gid ? gid : null : null,
      estado: gid ? x.estado === 'disponible' || x.estado === 'en_espera' ? 'agrupado' : x.estado : x.estado === 'agrupado' ? 'disponible' : x.estado
    } : x));
    const g = grupos.find(x => x.id === gid);
    avisar(a.nombre + ' ' + a.apellido + (g ? ' sumado a ' + g.nombre : ' quedó sin grupo'));
  };
  const sinGrupo = agentes.filter(a => !a.grupo && a.estado !== 'no_disponible' && a.estado !== 'replegado');
  const noAptos = agentes.filter(a => !a.grupo && (a.estado === 'no_disponible' || a.estado === 'replegado')).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(220px, 280px) 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(ZonaSoltar, {
    activo: !!drag,
    onDrop: id => mover(id, null),
    style: {
      background: 'var(--card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--elevation-sm)',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: 'var(--muted-foreground)'
    }
  }, "Sin grupo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 7px',
      borderRadius: 999,
      background: 'var(--muted)',
      color: 'var(--muted-foreground)'
    }
  }, sinGrupo.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, sinGrupo.map(a => /*#__PURE__*/React.createElement(FilaTablero, {
    key: a.id,
    a: a,
    onDrag: setDrag
  }))), !sinGrupo.length && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, "Todo el personal disponible est\xE1 en un grupo."), noAptos > 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      fontSize: 11,
      color: 'var(--muted-foreground)',
      lineHeight: 1.45
    }
  }, noAptos, " sin grupo ", noAptos === 1 ? 'no aparece' : 'no aparecen', " por estar No disponible o Replegado. Cambi\xE1 su estado en la pesta\xF1a Agentes para integrarlos.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 16
    }
  }, grupos.map(g => {
    const miembros = agentes.filter(a => a.grupo === g.id);
    return /*#__PURE__*/React.createElement(ZonaSoltar, {
      key: g.id,
      activo: !!drag,
      onDrop: id => mover(id, g.id),
      style: {
        background: 'var(--muted)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-grupo)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: g.color
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: g.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 'var(--text-base)',
        fontWeight: 600,
        color: 'var(--foreground)'
      }
    }, g.nombre), /*#__PURE__*/React.createElement(StatusBadge, {
      estado: g.estado,
      size: "sm"
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '0 0 12px 20px',
        fontSize: 11,
        color: 'var(--muted-foreground)',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pentagon",
      size: 11
    }), g.sector || 'Sin sector asignado', " \xB7 ", miembros.length, " integrantes"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, miembros.map(a => /*#__PURE__*/React.createElement(FilaTablero, {
      key: a.id,
      a: a,
      lider: a.lider === g.id,
      onDrag: setDrag
    }))), !miembros.length && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border)',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--muted-foreground)'
      }
    }, "Soltar para sumar al grupo")));
  })));
}
function AgentesModulo({
  avisar
}) {
  const {
    Button,
    Modal
  } = NSA;
  const [pestana, setPestana] = useStateA('agentes');
  const [agentes, setAgentes] = useStateA(window.SistemaData.agentes);
  const [grupos, setGrupos] = useStateA(window.SistemaData.grupos);
  const [quitar, setQuitar] = useStateA(null);
  const fonetico = ['Delta', 'Eco', 'Foxtrot', 'Golf', 'Hotel'];
  const colores = ['#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-h2)',
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, pestana === 'grupos' ? 'Grupos' : 'Agentes'), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-label)',
      color: 'var(--muted-foreground)'
    }
  }, agentes.length, " agentes en el operativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Pestanas, {
    value: pestana,
    onChange: setPestana,
    tabs: [['agentes', 'Agentes'], ['grupos', 'Grupos']]
  }), pestana === 'agentes' ? /*#__PURE__*/React.createElement(Button, {
    size: "md",
    icon: "user-plus",
    onClick: () => avisar('Agregar Agentes al Operativo: lista de cuentas activas', 'user-plus', 'var(--foreground)')
  }, "Agregar Agente") : /*#__PURE__*/React.createElement(Button, {
    size: "md",
    icon: "plus",
    onClick: () => {
      const i = grupos.length - 3;
      if (i >= fonetico.length) return;
      setGrupos(gs => [...gs, {
        id: 'g' + Date.now(),
        nombre: 'Grupo ' + fonetico[i],
        color: colores[i],
        estado: 'en_formacion',
        sector: null
      }]);
      avisar('Grupo ' + fonetico[i] + ' creado');
    }
  }, "Nuevo Grupo")), pestana === 'agentes' ? /*#__PURE__*/React.createElement(PestanaAgentes, {
    agentes: agentes,
    avisar: avisar,
    quitar: setQuitar
  }) : /*#__PURE__*/React.createElement(PestanaGrupos, {
    agentes: agentes,
    setAgentes: setAgentes,
    grupos: grupos,
    avisar: avisar
  }), quitar && /*#__PURE__*/React.createElement(Modal, {
    title: "Quitar del operativo",
    icon: "triangle-alert",
    width: 420,
    onClose: () => setQuitar(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: () => setQuitar(null)
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "md",
      onClick: () => {
        setAgentes(as => as.filter(a => a.id !== quitar.id));
        avisar(quitar.nombre + ' ' + quitar.apellido + ' quitado del operativo', 'x', '#dc2626');
        setQuitar(null);
      }
    }, "Quitar"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-label)',
      color: 'var(--muted-foreground)',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--foreground)'
    }
  }, quitar.nombre, " ", quitar.apellido), " deja de figurar como agente activo de este operativo. Su cuenta y su historial no se ven afectados.")));
}
window.AgentesModulo = AgentesModulo;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/AgentesModulo.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema/Comunes.jsx
try { (() => {
/* Piezas compartidas de las pantallas: buscador, selector de vista, pestañas, estados vacíos, aviso y modal en construcción. */
const NSU = window.DUARDiseOMapa_7e942c;
function Buscador({
  value,
  onChange,
  placeholder
}) {
  const {
    Icon
  } = NSU;
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      color: 'var(--muted-foreground)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '8px 36px',
      borderRadius: 'var(--radius-input)',
      outline: 'none',
      background: 'var(--input-background)',
      border: '1px solid ' + (f ? 'var(--primary)' : 'var(--border)'),
      color: 'var(--foreground)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 'var(--text-base)',
      transition: 'border-color .15s'
    }
  }), value && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onChange(''),
    "aria-label": "Limpiar b\xFAsqueda",
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })));
}
function SelectorVista({
  value,
  onChange
}) {
  const {
    Icon
  } = NSU;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: 2,
      borderRadius: 'var(--radius-input)',
      background: 'var(--muted)',
      border: '1px solid var(--border)',
      flexShrink: 0
    }
  }, [['card', 'layout-grid', 'Tarjetas'], ['list', 'list', 'Lista']].map(([m, ic, l]) => {
    const on = value === m;
    return /*#__PURE__*/React.createElement("button", {
      key: m,
      type: "button",
      title: l,
      onClick: () => onChange(m),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 4,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--card)' : 'transparent',
        color: on ? 'var(--primary)' : 'var(--muted-foreground)',
        boxShadow: on ? 'var(--elevation-sm)' : 'none',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 'var(--text-label)',
        fontWeight: on ? 600 : 500,
        transition: 'all .15s'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 15
    }), l);
  }));
}
function Pestanas({
  value,
  onChange,
  tabs
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 'var(--radius-button)',
      background: 'var(--muted)',
      border: '1px solid var(--border)',
      width: 'fit-content'
    }
  }, tabs.map(([v, l]) => {
    const on = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange(v),
      style: {
        padding: '6px 16px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--card)' : 'transparent',
        color: on ? 'var(--primary)' : 'var(--muted-foreground)',
        boxShadow: on ? 'var(--elevation-sm)' : 'none',
        fontFamily: 'var(--font-family-primary)',
        fontSize: 'var(--text-label)',
        fontWeight: on ? 600 : 500
      }
    }, l);
  }));
}
function BarraFiltros({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      padding: '12px 16px',
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--muted-foreground)',
      flexShrink: 0
    }
  }, "Filtrar por:"), children);
}
const tarjetaBase = {
  background: 'var(--card)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--elevation-sm)',
  border: '1px solid var(--card-border, var(--border))'
};
function Vacio({
  icon,
  titulo,
  texto,
  accion
}) {
  const {
    Icon
  } = NSU;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '56px 24px',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
      color: 'var(--primary)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h3)',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, titulo), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px',
      fontSize: 'var(--text-base)',
      color: 'var(--muted-foreground)',
      maxWidth: 420
    }
  }, texto), accion);
}
function EnConstruccion({
  titulo,
  icon
}) {
  const {
    Icon
  } = NSU;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-h2)',
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '64px 24px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
      color: 'var(--primary)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 28
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h3)',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, "Esta secci\xF3n todav\xEDa no est\xE1 disponible"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--muted-foreground)'
    }
  }, "Estamos trabajando en este m\xF3dulo.")));
}
function Aviso({
  t
}) {
  const {
    Icon
  } = NSU;
  if (!t) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 16px',
      borderRadius: 'var(--radius)',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--elevation-md)',
      fontFamily: 'var(--font-family-primary)',
      fontSize: 13,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon || 'circle-check',
    size: 16,
    color: t.color || '#16a34a'
  }), t.msg);
}
function BotonIcono({
  icon,
  title,
  onClick,
  tono
}) {
  const {
    Icon
  } = NSU;
  const [h, setH] = React.useState(false);
  const peligro = tono === 'peligro',
    aviso = tono === 'aviso';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: title,
    "aria-label": title,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      padding: 6,
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      color: aviso ? 'color-mix(in srgb, #fbbf24 var(--tinte-oscuro, 0%), #b45309)' : peligro && h ? 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #dc2626)' : h ? 'var(--primary)' : 'var(--muted-foreground)',
      background: !h ? 'transparent' : aviso ? 'color-mix(in srgb, rgba(217,119,6,0.18) var(--tinte-oscuro, 0%), #fef3c7)' : peligro ? 'color-mix(in srgb, rgba(220,38,38,0.18) var(--tinte-oscuro, 0%), #fee2e2)' : 'color-mix(in srgb, var(--primary) 8%, transparent)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14
  }));
}
function Dato({
  titulo,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 9.5,
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--muted-foreground)'
    }
  }, titulo), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-label)',
      fontWeight: 500,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, children));
}
Object.assign(window, {
  Buscador,
  SelectorVista,
  Pestanas,
  BarraFiltros,
  tarjetaBase,
  Vacio,
  EnConstruccion,
  Aviso,
  BotonIcono,
  Dato
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/Comunes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema/Operativos.jsx
try { (() => {
/* Pantalla Operativos (CU-08 a CU-11): tarjetas / lista, búsqueda, filtro por estado, nuevo operativo, finalizar. */
const {
  useState: useStateO,
  useMemo: useMemoO
} = React;
const NSO = window.DUARDiseOMapa_7e942c;
const SD = window.SistemaData;
function MetaFila({
  icon,
  children,
  alerta,
  title
}) {
  const {
    Icon
  } = NSO;
  return /*#__PURE__*/React.createElement("div", {
    title: title,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 13,
    color: alerta ? '#b45309' : 'var(--primary)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      color: alerta ? '#b45309' : 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, children));
}
function BotonPanel({
  onClick
}) {
  const {
    Icon
  } = NSO;
  const [h, setH] = useStateO(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      color: 'var(--primary)',
      fontFamily: 'var(--button-font-family)',
      textTransform: 'var(--button-transform)',
      letterSpacing: 'var(--button-tracking)',
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      background: h ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'color-mix(in srgb, var(--primary) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  }, "Panel", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 13
  }));
}
function Acciones({
  op,
  on
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "qr-code",
    title: "C\xF3digo QR",
    onClick: () => on('qr', op)
  }), /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "pencil",
    title: "Modificar",
    onClick: () => on('editar', op)
  }), op.estado !== 'finalizado' && /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "flag",
    title: "Finalizar operativo",
    tono: "aviso",
    onClick: () => on('finalizar', op)
  }), op.estado === 'nuevo' && /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "trash-2",
    title: "Eliminar",
    tono: "peligro",
    onClick: () => on('eliminar', op)
  }));
}
function TarjetaOperativo({
  op,
  on,
  entrar
}) {
  const {
    StatusBadge
  } = NSO;
  const [h, setH] = useStateO(false);
  const sinMando = !op.mando;
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      ...tarjetaBase,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: h ? 'var(--elevation-md)' : 'var(--elevation-sm)',
      transition: 'box-shadow .15s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: SD.COLOR_ESTADO_OP[op.estado] || 'var(--primary)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h3)',
      fontWeight: 600,
      color: 'var(--foreground)',
      lineHeight: 1.35
    }
  }, op.nombre), /*#__PURE__*/React.createElement(StatusBadge, {
    estado: op.estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(MetaFila, {
    icon: "map-pin"
  }, op.ubicacion), /*#__PURE__*/React.createElement(MetaFila, {
    icon: "calendar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, op.fechaInicio)), /*#__PURE__*/React.createElement(MetaFila, {
    icon: "users"
  }, op.agentes, " agente", op.agentes !== 1 ? 's' : '', " asignado", op.agentes !== 1 ? 's' : ''), /*#__PURE__*/React.createElement(MetaFila, {
    icon: "radio-tower",
    alerta: sinMando && op.estado === 'activo',
    title: "Coordinador a cargo del puesto de comando"
  }, op.mando || 'Sin coordinador a cargo'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement(Acciones, {
    op: op,
    on: on
  }), /*#__PURE__*/React.createElement(BotonPanel, {
    onClick: () => entrar(op)
  })));
}
function ListaOperativos({
  lista,
  on,
  entrar
}) {
  const {
    StatusBadge,
    Icon
  } = NSO;
  const cols = '3fr 1fr 1.5fr 1fr auto';
  const th = {
    color: 'var(--muted-foreground)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 12,
      padding: '10px 20px',
      background: 'var(--muted)',
      borderBottom: '1px solid var(--border)'
    }
  }, ['Operativo', 'Estado', 'Ubicación', 'Inicio', ''].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: th
  }, c))), lista.map((op, i) => /*#__PURE__*/React.createElement("div", {
    key: op.id,
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 12,
      alignItems: 'center',
      padding: '14px 20px',
      borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 4,
      alignSelf: 'stretch',
      minHeight: 36,
      borderRadius: 999,
      background: SD.COLOR_ESTADO_OP[op.estado]
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, op.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 2,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 10
  }), op.agentes, " agentes"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      color: !op.mando && op.estado === 'activo' ? '#b45309' : undefined
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "radio-tower",
    size: 10
  }), op.mando || 'Sin coordinador a cargo')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StatusBadge, {
    estado: op.estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement(MetaFila, {
    icon: "map-pin"
  }, op.ubicacion), /*#__PURE__*/React.createElement(MetaFila, {
    icon: "calendar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, op.fechaInicio.split(' ')[0])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Acciones, {
    op: op,
    on: on
  }), /*#__PURE__*/React.createElement(BotonPanel, {
    onClick: () => entrar(op)
  })))));
}
function NuevoOperativoModal({
  onCancel,
  onSave
}) {
  const {
    Modal,
    Button,
    TextField,
    Icon
  } = NSO;
  const [f, setF] = useStateO({
    nombre: '',
    ubicacion: '',
    fiscal: '',
    lat: '',
    lng: '',
    fecha: '2026-03-03T08:00',
    descripcion: ''
  });
  const [err, setErr] = useStateO('');
  const set = k => v => {
    setF({
      ...f,
      [k]: v
    });
    setErr('');
  };
  const guardar = () => {
    if (!f.nombre.trim() || !f.ubicacion.trim() || !f.fiscal.trim() || !f.lat || !f.lng) {
      setErr('Completá los campos obligatorios para continuar.');
      return;
    }
    onSave(f);
  };
  const sec = {
    margin: 0,
    color: 'var(--muted-foreground)',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-label)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Nuevo Operativo",
    subtitle: "Estado inicial: Nuevo \u2014 se activar\xE1 al ingresar al panel",
    onClose: onCancel,
    width: 640,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "check",
      onClick: guardar
    }, "Crear operativo"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, err && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderRadius: 'var(--radius-input)',
      background: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)',
      color: 'var(--destructive)',
      fontSize: 'var(--text-label)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "circle-alert",
    size: 15
  }), err), /*#__PURE__*/React.createElement("p", {
    style: sec
  }, "Datos del operativo"), /*#__PURE__*/React.createElement(TextField, {
    label: "T\xEDtulo",
    required: true,
    value: f.nombre,
    onChange: set('nombre'),
    placeholder: "Ej: B\xFAsqueda Cerro Champaqu\xED \u2014 Garc\xEDa Juan"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Localidad",
    required: true,
    value: f.ubicacion,
    onChange: set('ubicacion'),
    placeholder: "Ej: Villa Alpina, C\xF3rdoba"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Fiscal de Instrucci\xF3n",
    required: true,
    value: f.fiscal,
    onChange: set('fiscal'),
    placeholder: "Nombre y apellido del fiscal a cargo"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Fecha y hora de inicio",
    required: true,
    type: "datetime-local",
    value: f.fecha,
    onChange: set('fecha')
  }), /*#__PURE__*/React.createElement("p", {
    style: sec
  }, "Punto Cero (LSP)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Latitud",
    required: true,
    value: f.lat,
    onChange: set('lat'),
    placeholder: "Ej: \u201331.99300"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Longitud",
    required: true,
    value: f.lng,
    onChange: set('lng'),
    placeholder: "Ej: \u201364.92300"
  })), /*#__PURE__*/React.createElement(TextField, {
    label: "Descripci\xF3n",
    multiline: true,
    rows: 3,
    value: f.descripcion,
    onChange: set('descripcion'),
    placeholder: "Contexto general del operativo, objetivos, particularidades..."
  })));
}
function FinalizarModal({
  op,
  onCancel,
  onConfirm
}) {
  const {
    Modal,
    Button,
    TextField,
    Icon
  } = NSO;
  const [nota, setNota] = useStateO('');
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Finalizar operativo",
    subtitle: op.nombre,
    onClose: onCancel,
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "md",
      onClick: onCancel
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      size: "md",
      icon: "flag",
      onClick: () => onConfirm(nota),
      style: {
        background: '#b45309',
        borderColor: '#b45309'
      }
    }, "Finalizar operativo"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 'var(--radius-input)',
      background: 'color-mix(in srgb, rgba(217,119,6,0.16) var(--tinte-oscuro, 0%), #fef3c7)',
      color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, rgba(217,119,6,0.5) var(--tinte-oscuro, 0%), transparent)',
      fontSize: 'var(--text-label)',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "triangle-alert",
    size: 15,
    style: {
      marginTop: 1
    }
  }), "Se libera a todo el personal asignado y el operativo pasa a s\xF3lo lectura."), /*#__PURE__*/React.createElement(TextField, {
    label: "Nota final",
    multiline: true,
    rows: 4,
    value: nota,
    onChange: setNota,
    placeholder: "Ej: Persona hallada con vida en sector norte. Se desactiva el operativo tras 48 hs de b\xFAsqueda\u2026"
  })));
}
function Operativos({
  operativos,
  setOperativos,
  entrar,
  avisar
}) {
  const {
    Button,
    FiltroDesplegable
  } = NSO;
  const [vista, setVista] = useStateO('card');
  const [q, setQ] = useStateO('');
  const [sel, setSel] = useStateO(SD.VIGENTES);
  const [modal, setModal] = useStateO(null);
  const lista = useMemoO(() => operativos.filter(o => (!sel.length || sel.includes(o.estado)) && (!q || (o.nombre + ' ' + o.ubicacion + ' ' + (o.mando || '')).toLowerCase().includes(q.toLowerCase()))), [operativos, sel, q]);
  const vig = operativos.filter(o => SD.VIGENTES.includes(o.estado)).length;
  const sonVig = sel.length === SD.VIGENTES.length && SD.VIGENTES.every(v => sel.includes(v));
  const on = (accion, op) => {
    if (accion === 'qr') avisar('QR de registro de ' + op.nombre.split(' — ')[0], 'qr-code', 'var(--foreground)');
    if (accion === 'editar') avisar('Modificar operativo: mismo formulario que "Nuevo"', 'pencil', 'var(--foreground)');
    if (accion === 'finalizar') setModal({
      tipo: 'finalizar',
      op
    });
    if (accion === 'eliminar') {
      setOperativos(os => os.filter(o => o.id !== op.id));
      avisar('Operativo eliminado', 'trash-2', '#dc2626');
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-h1)',
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, "Sistema de B\xFAsqueda y Rastreo"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--muted-foreground)'
    }
  }, "Direcci\xF3n de Unidades de Alto Riesgo (DUAR) \u2014 C\xF3rdoba")), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: "plus",
    onClick: () => setModal({
      tipo: 'nuevo'
    })
  }, "Nuevo Operativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(Buscador, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar por t\xEDtulo..."
  }), /*#__PURE__*/React.createElement(SelectorVista, {
    value: vista,
    onChange: setVista
  }), (q || !sonVig) && lista.length < operativos.length && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--muted-foreground)',
      flexShrink: 0
    }
  }, lista.length, " de ", operativos.length)), /*#__PURE__*/React.createElement(BarraFiltros, null, /*#__PURE__*/React.createElement(FiltroDesplegable, {
    titulo: "Estado",
    seleccion: sel,
    onCambiar: setSel,
    atajos: [{
      label: 'Vigentes',
      valores: SD.VIGENTES,
      count: vig
    }],
    opciones: SD.ESTADOS_OP.map(e => ({
      ...e,
      count: operativos.filter(o => o.estado === e.value).length
    }))
  }), sel.length > 0 && !sonVig && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSel(SD.VIGENTES),
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--primary)',
      fontWeight: 600,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-family-primary)'
    }
  }, "Ver s\xF3lo vigentes"), sel.length === 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, "Mostrando todos los operativos"))), lista.length === 0 ? /*#__PURE__*/React.createElement(Vacio, {
    icon: "search",
    titulo: "No hay operativos vigentes",
    texto: q ? `No se encontraron resultados para "${q}".` : 'No hay operativos activos o en proceso para el filtro seleccionado.',
    accion: /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      size: "md",
      icon: "x",
      onClick: () => {
        setQ('');
        setSel(SD.VIGENTES);
      }
    }, "Limpiar filtros")
  }) : vista === 'card' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 20
    }
  }, lista.map(op => /*#__PURE__*/React.createElement(TarjetaOperativo, {
    key: op.id,
    op: op,
    on: on,
    entrar: entrar
  }))) : /*#__PURE__*/React.createElement(ListaOperativos, {
    lista: lista,
    on: on,
    entrar: entrar
  }), modal && modal.tipo === 'nuevo' && /*#__PURE__*/React.createElement(NuevoOperativoModal, {
    onCancel: () => setModal(null),
    onSave: f => {
      const fe = f.fecha.split('T');
      const [y, m, d] = fe[0].split('-');
      setOperativos(os => [{
        id: 'op' + Date.now(),
        nombre: f.nombre.trim(),
        estado: 'nuevo',
        ubicacion: f.ubicacion.trim(),
        fechaInicio: +d + '/' + +m + '/' + y + ' ' + fe[1],
        agentes: 0,
        mando: null,
        fiscal: f.fiscal,
        dia: 1,
        clima: {
          temperatura: 16,
          descripcion: 'Despejado'
        }
      }, ...os]);
      setModal(null);
      avisar('Operativo creado');
    }
  }), modal && modal.tipo === 'finalizar' && /*#__PURE__*/React.createElement(FinalizarModal, {
    op: modal.op,
    onCancel: () => setModal(null),
    onConfirm: () => {
      setOperativos(os => os.map(o => o.id === modal.op.id ? {
        ...o,
        estado: 'finalizado',
        mando: null
      } : o));
      setModal(null);
      avisar('Operativo finalizado correctamente. Personal liberado.');
    }
  }));
}
window.Operativos = Operativos;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/Operativos.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema/SistemaApp.jsx
try { (() => {
/* Sistema DUAR completo: contexto global (Panel · Operativos · Usuarios) y contexto de operativo (Panel · Agentes · Mapa). */
const {
  useState,
  useEffect
} = React;
const NS = window.DUARDiseOMapa_7e942c;
function SelectorPaleta({
  actual,
  onElegir
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, window.DUAR_PALETAS.map(p => {
    const on = p.id === actual;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      type: "button",
      onClick: () => onElegir(p.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        border: on ? '1.5px solid #2a2f2a' : '1.5px solid rgba(0,0,0,.12)',
        background: on ? 'rgba(0,0,0,.05)' : '#fff',
        fontFamily: 'Inter, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        borderRadius: 4,
        overflow: 'hidden',
        flexShrink: 0
      }
    }, p.colores.map(c => /*#__PURE__*/React.createElement("span", {
      key: c,
      style: {
        width: 14,
        height: 22,
        background: c
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: '#222'
      }
    }, p.nombre), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 10.5,
        color: '#666'
      }
    }, p.sub)));
  }));
}
function SistemaApp() {
  const {
    Sidebar,
    OperativoHeader
  } = NS;
  const SD = window.SistemaData;
  const [paleta, setPaleta] = useState(window.duarPaleta());
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const [pagina, setPagina] = useState(() => localStorage.getItem('duar-sis-pagina') || 'Operativos');
  const [opId, setOpId] = useState(() => localStorage.getItem('duar-sis-op') || null);
  const [modulo, setModulo] = useState(() => localStorage.getItem('duar-sis-modulo') || 'Agentes');
  const [operativos, setOperativos] = useState(SD.operativos);
  const [compacto, setCompacto] = useState(false);
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    const f = () => {
      setPaleta(window.duarPaleta());
      setDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('duar-paleta', f);
    return () => window.removeEventListener('duar-paleta', f);
  }, []);
  useEffect(() => {
    localStorage.setItem('duar-sis-pagina', pagina);
    localStorage.setItem('duar-sis-modulo', modulo);
    if (opId) localStorage.setItem('duar-sis-op', opId);else localStorage.removeItem('duar-sis-op');
  }, [pagina, modulo, opId]);
  const avisar = (msg, icon, color) => {
    setAviso({
      msg,
      icon,
      color
    });
    clearTimeout(window.__av);
    window.__av = setTimeout(() => setAviso(null), 2600);
  };
  const op = opId && operativos.find(o => o.id === opId);
  const entrar = o => {
    if (o.estado === 'nuevo') setOperativos(os => os.map(x => x.id === o.id ? {
      ...x,
      estado: 'activo'
    } : x));
    setOpId(o.id);
    setModulo('Agentes');
  };
  const enOperativo = !!op;
  const itemsGlobal = [{
    icon: 'layout-dashboard',
    label: 'Panel'
  }, {
    icon: 'clipboard-list',
    label: 'Operativos'
  }, {
    icon: 'users',
    label: 'Usuarios'
  }].map(i => ({
    ...i,
    active: i.label === pagina
  }));
  const itemsOp = [{
    icon: 'layout-dashboard',
    label: 'Panel'
  }, {
    icon: 'user-check',
    label: 'Agentes'
  }, {
    icon: 'map',
    label: 'Mapa'
  }].map(i => ({
    ...i,
    active: i.label === modulo
  }));
  const mapaSrc = useState(() => '../mapa/index.html?embed=1&paleta=' + window.duarPaleta() + (document.documentElement.classList.contains('dark') ? '&dark=1' : ''))[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)',
      overflow: 'hidden',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    key: enOperativo ? 'op' : 'global',
    context: enOperativo ? 'operativo' : 'global',
    items: enOperativo ? itemsOp : itemsGlobal,
    user: SD.usuario,
    isDark: dark,
    onToggleDark: () => window.duarSetDark(!dark),
    onNavigate: it => enOperativo ? setModulo(it.label) : setPagina(it.label),
    onBack: () => {
      setOpId(null);
      setPagina('Operativos');
    },
    onLogout: () => avisar('Cerrar sesión no forma parte de este kit', 'log-out', 'var(--muted-foreground)')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, enOperativo && /*#__PURE__*/React.createElement(OperativoHeader, {
    nombre: op.nombre,
    estado: op.estado,
    ubicacion: op.ubicacion,
    fechaInicio: op.fechaInicio.split(' ')[0],
    dia: op.dia,
    clima: op.clima,
    aCargo: op.mando || '',
    hasObjetivo: true,
    compacto: compacto,
    onCompacto: setCompacto,
    onInfo: () => avisar('Información del operativo · Fiscal: ' + op.fiscal, 'info', 'var(--foreground)'),
    onPuestoComando: () => avisar(op.mando ? op.mando + ' está a cargo del puesto de comando' : 'Nadie a cargo del puesto de comando', 'radio-tower', op.mando ? 'var(--foreground)' : '#b45309'),
    onObjetivo: () => avisar('Objetivo buscado: ficha de la persona', 'target', 'var(--primary)'),
    onQR: () => avisar('QR de registro para agentes', 'qr-code', 'var(--foreground)'),
    onInforme: () => avisar('Informe del operativo: módulo en desarrollo', 'file-text', 'var(--foreground)')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: enOperativo && modulo === 'Mapa' ? 'hidden' : 'auto',
      overflowX: 'hidden',
      position: 'relative',
      background: 'var(--fondo-patron, none)'
    }
  }, !enOperativo && pagina === 'Operativos' && /*#__PURE__*/React.createElement(Operativos, {
    operativos: operativos,
    setOperativos: setOperativos,
    entrar: entrar,
    avisar: avisar
  }), !enOperativo && pagina === 'Usuarios' && /*#__PURE__*/React.createElement(Usuarios, {
    avisar: avisar
  }), !enOperativo && pagina === 'Panel' && /*#__PURE__*/React.createElement(EnConstruccion, {
    titulo: "Panel",
    icon: "layout-dashboard"
  }), enOperativo && modulo === 'Panel' && /*#__PURE__*/React.createElement(EnConstruccion, {
    titulo: "Panel de Control",
    icon: "layout-dashboard"
  }), enOperativo && modulo === 'Agentes' && /*#__PURE__*/React.createElement(AgentesModulo, {
    key: op.id,
    avisar: avisar
  }), enOperativo && /*#__PURE__*/React.createElement("iframe", {
    title: "Mapa operacional",
    allowFullScreen: true,
    allow: "fullscreen",
    src: mapaSrc,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      border: 'none',
      display: modulo === 'Mapa' ? 'block' : 'none',
      background: 'var(--background)'
    }
  }))), /*#__PURE__*/React.createElement(Aviso, {
    t: aviso
  }), /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Paleta"
  }, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Paleta de colores"
  }), /*#__PURE__*/React.createElement(SelectorPaleta, {
    actual: paleta,
    onElegir: p => window.duarSetPaleta(p)
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Modo oscuro",
    value: dark,
    onChange: v => window.duarSetDark(v)
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(SistemaApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/SistemaApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema/Usuarios.jsx
try { (() => {
/* Pantalla Usuarios (CU-03 a CU-07): tarjetas / tabla, búsqueda y filtros por rol y estado. */
const {
  useState: useStateU,
  useMemo: useMemoU
} = React;
const NSUs = window.DUARDiseOMapa_7e942c;
const ROLES = {
  administrador: {
    label: 'Administrador',
    icon: 'shield',
    bg: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    color: 'var(--primary)'
  },
  coordinador: {
    label: 'Coordinador',
    icon: 'user-check',
    bg: 'color-mix(in srgb, rgba(37,99,235,0.18) var(--tinte-oscuro, 0%), #dbeafe)',
    color: 'color-mix(in srgb, #93c5fd var(--tinte-oscuro, 0%), #1d4ed8)'
  },
  agente: {
    label: 'Agente',
    icon: 'footprints',
    bg: 'var(--muted)',
    color: 'var(--muted-foreground)'
  }
};
function RolPill({
  rol
}) {
  const {
    Icon
  } = NSUs;
  const r = ROLES[rol];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 9px',
      borderRadius: 999,
      background: r.bg,
      color: r.color,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--chip-font-family)',
      textTransform: 'var(--chip-transform)',
      letterSpacing: 'var(--chip-tracking)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: r.icon,
    size: 11
  }), r.label);
}
function Dot({
  u
}) {
  const {
    Icon
  } = NSUs;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, u.esDuar && /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 12,
    color: "var(--primary)"
  }), u.dotacion);
}
function Usuarios({
  avisar
}) {
  const {
    Button,
    StatusBadge,
    AvatarAgente,
    FiltroDesplegable
  } = NSUs;
  const usuarios = window.SistemaData.usuarios;
  const [vista, setVista] = useStateU('card');
  const [q, setQ] = useStateU('');
  const [roles, setRoles] = useStateU([]);
  const [estados, setEstados] = useStateU([]);
  const lista = useMemoU(() => usuarios.filter(u => (!roles.length || roles.includes(u.rol)) && (!estados.length || estados.includes(u.estado)) && (!q || (u.nombre + ' ' + u.apellido + ' ' + u.email + ' ' + u.dni).toLowerCase().includes(q.toLowerCase()))), [q, roles, estados]);
  const ini = u => u.nombre[0] + u.apellido[0];
  const acciones = u => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "pencil",
    title: "Editar usuario",
    onClick: () => avisar('Editar ' + u.nombre + ' ' + u.apellido, 'pencil', 'var(--foreground)')
  }), /*#__PURE__*/React.createElement(BotonIcono, {
    icon: "trash-2",
    title: "Dar de baja",
    tono: "peligro",
    onClick: () => avisar('Baja lógica: se conserva el historial', 'info', 'var(--muted-foreground)')
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-h1)',
      fontWeight: 700,
      color: 'var(--foreground)'
    }
  }, "Usuarios"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--muted-foreground)'
    }
  }, usuarios.length, " usuarios registrados")), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: "user-plus",
    onClick: () => avisar('Nuevo Usuario: DNI, nombre, apellido, email, rol…', 'user-plus', 'var(--foreground)')
  }, "Nuevo Usuario")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(Buscador, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar por nombre, email, DNI..."
  }), /*#__PURE__*/React.createElement(SelectorVista, {
    value: vista,
    onChange: setVista
  })), /*#__PURE__*/React.createElement(BarraFiltros, null, /*#__PURE__*/React.createElement(FiltroDesplegable, {
    titulo: "Rol",
    seleccion: roles,
    onCambiar: setRoles,
    opciones: Object.keys(ROLES).map(r => ({
      value: r,
      label: ROLES[r].label,
      count: usuarios.filter(u => u.rol === r).length
    }))
  }), /*#__PURE__*/React.createElement(FiltroDesplegable, {
    titulo: "Estado",
    seleccion: estados,
    onCambiar: setEstados,
    opciones: [['activo', 'Activo', '#16a34a'], ['pendiente', 'Pendiente', 'var(--accent)'], ['inactivo', 'Inactivo', '#dc2626']].map(([v, l, d]) => ({
      value: v,
      label: l,
      dot: d,
      count: usuarios.filter(u => u.estado === v).length
    }))
  }))), lista.length === 0 ? /*#__PURE__*/React.createElement(Vacio, {
    icon: "search",
    titulo: "Sin resultados",
    texto: "Ning\xFAn usuario coincide con la b\xFAsqueda o los filtros.",
    accion: /*#__PURE__*/React.createElement(Button, {
      variant: "muted",
      size: "md",
      icon: "x",
      onClick: () => {
        setQ('');
        setRoles([]);
        setEstados([]);
      }
    }, "Limpiar filtros")
  }) : vista === 'card' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
      gap: 16
    }
  }, lista.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.id,
    style: {
      ...tarjetaBase,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(AvatarAgente, {
    esDuar: u.esDuar,
    iniciales: ini(u),
    tamano: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, u.nombre, " ", u.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, u.email))), acciones(u)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(RolPill, {
    rol: u.rol
  }), /*#__PURE__*/React.createElement(StatusBadge, {
    estado: u.estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Dato, {
    titulo: "DNI"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)'
    }
  }, u.dni)), /*#__PURE__*/React.createElement(Dato, {
    titulo: "Dotaci\xF3n"
  }, /*#__PURE__*/React.createElement(Dot, {
    u: u
  })), /*#__PURE__*/React.createElement(Dato, {
    titulo: "Especialidad"
  }, u.especialidad || /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)',
      fontWeight: 400
    }
  }, "Sin especialidad")))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      ...tarjetaBase,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-family-primary)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--muted)',
      borderBottom: '1px solid var(--border)'
    }
  }, ['Usuario', 'DNI', 'Rol', 'Especialidad', 'Dotación', 'Estado', ''].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: 'left',
      padding: '12px 16px',
      color: 'var(--muted-foreground)',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, lista.map((u, i) => /*#__PURE__*/React.createElement("tr", {
    key: u.id,
    style: {
      borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none',
      fontSize: 'var(--text-base)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(AvatarAgente, {
    esDuar: u.esDuar,
    iniciales: ini(u),
    tamano: 32
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 500
    }
  }, u.nombre, " ", u.apellido), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, u.email)))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-data)',
      fontSize: 'var(--text-label)'
    }
  }, u.dni), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement(RolPill, {
    rol: u.rol
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, u.especialidad || /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Dot, {
    u: u
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    estado: u.estado,
    size: "sm"
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px'
    }
  }, acciones(u)))))))));
}
window.Usuarios = Usuarios;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/Usuarios.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema/data.js
try { (() => {
/* Datos de ejemplo del sistema (Operativos, Usuarios, Agentes, Grupos). window.SistemaData */
(function () {
  const operativos = [{
    id: 'op1',
    nombre: 'Búsqueda Cerro Champaquí — García Juan',
    estado: 'activo',
    ubicacion: 'Villa Alpina, Córdoba',
    fechaInicio: '28/2/2026 07:30',
    agentes: 27,
    mando: 'Miguel Giménez',
    fiscal: 'Dra. Laura Ferreyra',
    dia: 3,
    clima: {
      temperatura: 14,
      descripcion: 'Parcialmente nublado'
    }
  }, {
    id: 'op2',
    nombre: 'Rastrillaje Río Xanaes — Pereyra Sofía',
    estado: 'activo',
    ubicacion: 'Despeñaderos, Córdoba',
    fechaInicio: '1/3/2026 09:00',
    agentes: 14,
    mando: null,
    fiscal: 'Dr. Martín Oviedo',
    dia: 2,
    clima: {
      temperatura: 19,
      descripcion: 'Despejado'
    }
  }, {
    id: 'op3',
    nombre: 'Búsqueda Los Gigantes — Ruiz Tomás',
    estado: 'planificación',
    ubicacion: 'Tanti, Córdoba',
    fechaInicio: '3/3/2026 06:00',
    agentes: 6,
    mando: 'Paula Domínguez',
    fiscal: 'Dra. Inés Molina',
    dia: 1,
    clima: {
      temperatura: 9,
      descripcion: 'Viento fuerte'
    }
  }, {
    id: 'op4',
    nombre: 'Búsqueda Quebrada del Condorito',
    estado: 'en_proceso',
    ubicacion: 'San Antonio de Arredondo, Córdoba',
    fechaInicio: '26/2/2026 18:10',
    agentes: 19,
    mando: 'Miguel Giménez',
    fiscal: 'Dr. Raúl Sánchez',
    dia: 5,
    clima: {
      temperatura: 12,
      descripcion: 'Llovizna'
    }
  }, {
    id: 'op5',
    nombre: 'Búsqueda Dique San Roque — Luna Alberto',
    estado: 'nuevo',
    ubicacion: 'Villa Carlos Paz, Córdoba',
    fechaInicio: '2/3/2026 21:40',
    agentes: 0,
    mando: null,
    fiscal: 'Dra. Carla Bustos',
    dia: 1,
    clima: {
      temperatura: 17,
      descripcion: 'Nublado'
    }
  }, {
    id: 'op6',
    nombre: 'Búsqueda Uritorco — Medina Lucas',
    estado: 'finalizado',
    ubicacion: 'Capilla del Monte, Córdoba',
    fechaInicio: '10/1/2026 08:00',
    agentes: 32,
    mando: null,
    fiscal: 'Dr. Pablo Vera',
    dia: 4,
    clima: {
      temperatura: 22,
      descripcion: 'Despejado'
    }
  }];
  const usuarios = [{
    id: 'u1',
    nombre: 'Miguel',
    apellido: 'Giménez',
    email: 'mgimenez@duar.cba.gob.ar',
    dni: '28.441.903',
    rol: 'coordinador',
    especialidad: 'Rescate en altura',
    dotacion: 'DUAR',
    esDuar: true,
    estado: 'activo'
  }, {
    id: 'u2',
    nombre: 'Andrea',
    apellido: 'Castro',
    email: 'acastro@duar.cba.gob.ar',
    dni: '25.110.874',
    rol: 'administrador',
    especialidad: null,
    dotacion: 'DUAR',
    esDuar: true,
    estado: 'activo'
  }, {
    id: 'u3',
    nombre: 'Paula',
    apellido: 'Domínguez',
    email: 'pdominguez@duar.cba.gob.ar',
    dni: '31.902.557',
    rol: 'coordinador',
    especialidad: 'Rastrillaje',
    dotacion: 'DUAR',
    esDuar: true,
    estado: 'activo'
  }, {
    id: 'u4',
    nombre: 'Ramiro',
    apellido: 'Sosa',
    email: 'ramiro.sosa@gmail.com',
    dni: '36.220.418',
    rol: 'agente',
    especialidad: 'Rastrillaje',
    dotacion: 'BV Villa General Belgrano',
    esDuar: false,
    estado: 'activo'
  }, {
    id: 'u5',
    nombre: 'Lucía',
    apellido: 'Zamora',
    email: 'lzamora@duar.cba.gob.ar',
    dni: '33.781.006',
    rol: 'agente',
    especialidad: 'Guía canino',
    dotacion: 'DUAR',
    esDuar: true,
    estado: 'activo'
  }, {
    id: 'u6',
    nombre: 'Camila',
    apellido: 'Morales',
    email: 'cami.morales@hotmail.com',
    dni: '38.005.912',
    rol: 'agente',
    especialidad: 'Paramédico',
    dotacion: 'Defensa Civil Córdoba',
    esDuar: false,
    estado: 'pendiente'
  }, {
    id: 'u7',
    nombre: 'Diego',
    apellido: 'Herrera',
    email: 'dherrera@duar.cba.gob.ar',
    dni: '29.663.140',
    rol: 'agente',
    especialidad: 'Conductor',
    dotacion: 'DUAR',
    esDuar: true,
    estado: 'activo'
  }, {
    id: 'u8',
    nombre: 'Martín',
    apellido: 'Aguirre',
    email: 'm.aguirre@gmail.com',
    dni: '34.419.287',
    rol: 'agente',
    especialidad: null,
    dotacion: 'BV Alta Gracia',
    esDuar: false,
    estado: 'inactivo'
  }];
  const agentes = [{
    id: 'a1',
    nombre: 'Lucía',
    apellido: 'Zamora',
    dni: '33.781.006',
    estado: 'agrupado',
    hace: 'hace 12 min',
    dotacion: 'DUAR',
    esDuar: true,
    especialidad: 'Guía canino',
    esRecursoCritico: true,
    grupo: 'g1',
    lider: 'g1'
  }, {
    id: 'a2',
    nombre: 'Ramiro',
    apellido: 'Sosa',
    dni: '36.220.418',
    estado: 'desplegado',
    hace: 'hace 1 h',
    dotacion: 'BV Villa General Belgrano',
    especialidad: 'Rastrillaje',
    grupo: 'g2',
    lider: 'g2'
  }, {
    id: 'a3',
    nombre: 'Camila',
    apellido: 'Morales',
    dni: '38.005.912',
    estado: 'desplegado',
    hace: 'hace 1 h',
    dotacion: 'Defensa Civil Córdoba',
    especialidad: 'Paramédico',
    grupo: 'g2'
  }, {
    id: 'a4',
    nombre: 'Diego',
    apellido: 'Herrera',
    dni: '29.663.140',
    estado: 'en_espera',
    hace: 'hace 25 min',
    dotacion: 'DUAR',
    esDuar: true,
    especialidad: 'Conductor',
    esConductor: true,
    grupo: null
  }, {
    id: 'a5',
    nombre: 'Martín',
    apellido: 'Aguirre',
    dni: '34.419.287',
    estado: 'agrupado',
    hace: 'hace 40 min',
    dotacion: 'BV Alta Gracia',
    especialidad: 'Rastrillaje',
    grupo: 'g3',
    lider: 'g3'
  }, {
    id: 'a6',
    nombre: 'Sofía',
    apellido: 'Ledesma',
    dni: '40.112.630',
    estado: 'disponible',
    hace: 'hace 5 min',
    dotacion: 'BV Villa General Belgrano',
    especialidad: 'Rastrillaje',
    grupo: null
  }, {
    id: 'a7',
    nombre: 'Nicolás',
    apellido: 'Ibarra',
    dni: '37.556.201',
    estado: 'disponible',
    hace: 'hace 8 min',
    dotacion: 'DUAR',
    esDuar: true,
    especialidad: 'Rescate en altura',
    grupo: null
  }, {
    id: 'a8',
    nombre: 'Valentina',
    apellido: 'Paz',
    dni: '39.874.115',
    estado: 'replegado',
    hace: 'hace 2 h',
    dotacion: 'BV Alta Gracia',
    especialidad: null,
    grupo: 'g1'
  }, {
    id: 'a9',
    nombre: 'Julián',
    apellido: 'Ríos',
    dni: '35.903.448',
    estado: 'no_disponible',
    hace: 'hace 3 h',
    dotacion: 'Defensa Civil Córdoba',
    especialidad: 'Rastrillaje',
    grupo: null
  }, {
    id: 'a10',
    nombre: 'Ana',
    apellido: 'Quiroga',
    dni: '41.020.773',
    estado: 'desplegado',
    hace: 'hace 1 h',
    dotacion: 'BV Villa General Belgrano',
    especialidad: 'Rastrillaje',
    grupo: 'g2'
  }];
  const grupos = [{
    id: 'g1',
    nombre: 'Grupo Alfa',
    color: '#E0662B',
    estado: 'replegado',
    sector: 'Sector 1 — Arroyo Seco'
  }, {
    id: 'g2',
    nombre: 'Grupo Bravo',
    color: '#2563EB',
    estado: 'rastrillando',
    sector: 'Sector 2 — Quebrada Norte'
  }, {
    id: 'g3',
    nombre: 'Grupo Charlie',
    color: '#16A34A',
    estado: 'en_formacion',
    sector: null
  }];
  window.SistemaData = {
    usuario: {
      nombre: 'Miguel',
      apellido: 'Giménez',
      rol: 'coordinador',
      email: 'mgimenez@duar.cba.gob.ar'
    },
    operativos,
    usuarios,
    agentes,
    grupos,
    VIGENTES: ['nuevo', 'planificación', 'en_proceso', 'activo'],
    ESTADOS_OP: [{
      value: 'nuevo',
      label: 'Nuevo',
      dot: 'var(--accent)'
    }, {
      value: 'activo',
      label: 'Activo',
      dot: '#16a34a'
    }, {
      value: 'planificación',
      label: 'En Planificación',
      dot: '#ca8a04'
    }, {
      value: 'en_proceso',
      label: 'En Proceso',
      dot: '#2563eb'
    }, {
      value: 'inactivo',
      label: 'Inactivo',
      dot: '#dc2626'
    }, {
      value: 'finalizado',
      label: 'Finalizado',
      dot: '#6b7280'
    }],
    COLOR_ESTADO_OP: {
      activo: '#16a34a',
      'planificación': '#ca8a04',
      inactivo: '#dc2626',
      nuevo: 'var(--accent)',
      en_proceso: '#2563eb',
      finalizado: '#6b7280',
      eliminado: '#be185d'
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/data.js", error: String((e && e.message) || e) }); }

// ui_kits/sistema/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // data-om-starter: inert presence marker — Claude Design's starter-usage
  // probe reads it. The closed panel renders nothing, so the marker rides
  // the <html> element as an attribute instead of a rendered node — zero
  // elements added, so page CSS (even structural selectors like
  // :nth-child) can never observe it. It records that the page WIRES a
  // tweaks panel, whether or not the panel is open. Keep this effect.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-om-starter', 'tweaks-panel');
    return () => document.documentElement.removeAttribute('data-om-starter');
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AvatarAgente = __ds_scope.AvatarAgente;

__ds_ns.ESTADOS_AGENTE = __ds_scope.ESTADOS_AGENTE;

__ds_ns.EstadoAgenteBadge = __ds_scope.EstadoAgenteBadge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FilterPill = __ds_scope.FilterPill;

__ds_ns.FiltroDesplegable = __ds_scope.FiltroDesplegable;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.SelectField = __ds_scope.SelectField;

__ds_ns.ESTADOS = __ds_scope.ESTADOS;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.OperativoHeader = __ds_scope.OperativoHeader;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.CoverageBar = __ds_scope.CoverageBar;

__ds_ns.ElementRow = __ds_scope.ElementRow;

__ds_ns.ElevationProfile = __ds_scope.ElevationProfile;

__ds_ns.LayerPanel = __ds_scope.LayerPanel;

__ds_ns.MapLegend = __ds_scope.MapLegend;

__ds_ns.TIPOS_MARCADOR = __ds_scope.TIPOS_MARCADOR;

__ds_ns.TIPOS_SCI = __ds_scope.TIPOS_SCI;

__ds_ns.MapMarker = __ds_scope.MapMarker;

__ds_ns.MapPopup = __ds_scope.MapPopup;

__ds_ns.MapToolbar = __ds_scope.MapToolbar;

__ds_ns.TreeSection = __ds_scope.TreeSection;

__ds_ns.TreeRow = __ds_scope.TreeRow;

})();
