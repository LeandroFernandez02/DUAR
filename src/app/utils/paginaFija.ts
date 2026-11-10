import { useEffect } from 'react';

/**
 * Pantallas de la app (con menú inferior): la página en sí NO se mueve, sólo el contenido que
 * tiene su propio scroll. En el iPhone, arrastrar con el dedo una zona que no se desplaza (como
 * el menú de abajo) levantaba toda la app como un elástico y dejaba un hueco blanco (prueba en
 * iPhone, 10/11). No se usa en login, registro y guías: ahí la página es la que se desplaza.
 */
export function usePaginaFija() {
  useEffect(() => {
    document.documentElement.classList.add('pagina-fija');
    return () => document.documentElement.classList.remove('pagina-fija');
  }, []);
}
