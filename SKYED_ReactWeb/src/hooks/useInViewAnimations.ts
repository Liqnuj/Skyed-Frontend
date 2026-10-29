import { useLayoutEffect } from 'react';
import type { CSSProperties, RefObject } from 'react';

export type AnimType = 'fade-up' | 'fade-left' | 'fade-right' | 'zoom-in' | 'wipe' | 'draw' | 'draw-x';

/**
 * Props para animar un elemento cuando entra en pantalla:
 *   <div {...anim('fade-up', 2)}>  ->  entra con 2 "pasos" de retraso (escalonado).
 *
 * - `fade-left` / `fade-right`: el elemento llega desde ese lado.
 * - `zoom-in`: aparece creciendo desde un poco más pequeño.
 * - `wipe`: se revela como una cortina (ideal para imágenes).
 * - `draw` / `draw-x`: dibuja una línea (los estilos de cada página dicen cuál).
 * - `base` suma segundos extra de retraso (por ejemplo, esperar a que se dibuje una línea).
 */
export function anim(type: AnimType, index = 0, base = 0) {
  return {
    'data-anim': type,
    style: { '--anim-delay': `${(base + index * 0.1).toFixed(2)}s` } as CSSProperties,
  };
}

/**
 * Activa las animaciones de entrada dentro de `rootRef`: marca la raíz con
 * `anim-ready` (los elementos con `data-anim` quedan ocultos) y, al entrar cada
 * uno en pantalla, le agrega `is-inview` para que se anime. Solo corre una vez
 * por elemento.
 *
 * Si el visitante pidió reducir el movimiento, o el navegador no tiene
 * IntersectionObserver, no se toca nada: el contenido se ve completo y estático.
 */
export function useInViewAnimations(rootRef: RefObject<HTMLElement | null>) {
  // useLayoutEffect: se oculta antes del primer pintado, así no hay "parpadeo".
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    root.classList.add('anim-ready');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );

    // Observa los [data-anim] que existan ahora y los que se agreguen después
    // (tarjetas que llegan de la API o que cambian al filtrar).
    const seen = new WeakSet<Element>();
    const scan = () => {
      root.querySelectorAll('[data-anim]').forEach((el) => {
        if (seen.has(el) || el.classList.contains('is-inview')) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      root.classList.remove('anim-ready');
    };
  }, [rootRef]);
}
