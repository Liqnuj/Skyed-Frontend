import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Con #ancla (p. ej. /social/nosotros#contactanos) baja a esa sección en
    // lugar de ir al inicio. Se reintenta unos instantes porque la página
    // destino puede tardar un render en montar la sección.
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let intentos = 0;
      const buscar = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (intentos++ < 20) {
          timer = window.setTimeout(buscar, 50);
        }
      };
      let timer = window.setTimeout(buscar, 0);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  return null;
}
