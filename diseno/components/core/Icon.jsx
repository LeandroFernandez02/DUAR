import React from 'react';

/** Lucide icon (same set as the product: lucide-react 0.487). Needs the lucide UMD script on the page. */
export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style }) {
  const lib = typeof window !== 'undefined' ? window.lucide : null;
  const key = String(name || '').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  let node = lib && ((lib.icons && lib.icons[key]) || lib[key]);
  if (Array.isArray(node) && node[0] === 'svg') node = node[2];
  if (!Array.isArray(node)) return <span style={{ display: 'inline-block', width: size, height: size, flexShrink: 0, ...style }} />;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block', ...style }} aria-hidden="true">
      {node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
