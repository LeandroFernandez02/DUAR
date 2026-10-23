/**
 * Símbolo de accesibilidad universal (figura humana dentro de un anillo), del diseño CALÍVAR.
 * No existe en lucide; se dibuja con el mismo trazo que sus íconos.
 */
export default function IconoAccesibilidad({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx={12} cy={12} r={10.4} strokeWidth={1.7} />
      <circle cx={12} cy={6} r={1.8} strokeWidth={1.6} />
      <path d="M10.2 9.2L6.4 8.1L6.7 10L10 11.3L9.4 12.8L8.3 17.1L9.5 17.6L12 13.2L14.5 17.6L15.7 17.1L14.6 12.8L14 11.3L17.3 10L17.6 8.1L13.8 9.2Z" strokeWidth={1.6} />
    </svg>
  );
}
