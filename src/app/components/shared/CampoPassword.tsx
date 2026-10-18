import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Campo de contraseña con el ojito para verla (Testeo 15/10, puntos 21 y 26), así quien la
 * escribe puede comprobar que no se equivocó. Recibe las mismas propiedades que un <input>;
 * `className` y `style` van al campo, que ya deja lugar para el botón.
 */
export default function CampoPassword({ className = '', ...resto }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input {...resto} type={ver ? 'text' : 'password'} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVer(v => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
      >
        {ver ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
