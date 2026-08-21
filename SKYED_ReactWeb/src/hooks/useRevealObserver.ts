import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Reproduce el observer del sitio original (shared.js / scrollReveal.js):
 * cualquier elemento con className="reveal" empieza con opacity:0 (ver CSS)
 * y solo pasa a opacity:1 cuando se le agrega la clase "visible" al entrar
 * en pantalla. Un MutationObserver vuelve a escanear cuando se agregan
 * elementos nuevos (ej: filtros de eventos, tarjetas cargadas dinámicamente).
 */
export function useRevealObserver(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    function scan() {
      root!.querySelectorAll('.reveal:not(.visible)').forEach((el) => io.observe(el));
    }
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(root!, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [containerRef]);
}
