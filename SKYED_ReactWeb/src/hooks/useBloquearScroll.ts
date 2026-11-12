import { useEffect } from 'react';

/**
 * Bloquea el scroll de la página mientras una ventana modal está abierta.
 *
 * - Funciona en escritorio y en móvil (iOS incluido): fija el <body> en su
 *   posición actual en lugar de solo poner overflow:hidden.
 * - Conserva el ancho del scrollbar para que la página no "salte" de lado.
 * - Restaura la posición exacta del scroll al cerrar.
 * - Lleva un contador: si hay varias ventanas abiertas a la vez, el scroll
 *   solo se libera cuando se cierra la última.
 */
let bloqueos = 0;
let guardado: {
  scrollY: number;
  position: string; top: string; left: string; right: string; width: string;
  overflowY: string; paddingRight: string;
} | null = null;

function bloquear() {
  if (bloqueos++ > 0) return;
  const b = document.body;
  const scrollY = window.scrollY;
  const teniaBarra = window.innerWidth > document.documentElement.clientWidth;
  guardado = {
    scrollY,
    position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right,
    width: b.style.width, overflowY: b.style.overflowY, paddingRight: b.style.paddingRight,
  };
  b.style.position = 'fixed';
  b.style.top = `-${scrollY}px`;
  b.style.left = '0';
  b.style.right = '0';
  b.style.width = '100%';
  // Deja la pista del scrollbar visible para que el contenido no se corra.
  b.style.overflowY = teniaBarra ? 'scroll' : 'hidden';
}

function liberar() {
  if (--bloqueos > 0 || !guardado) return;
  const b = document.body;
  const g = guardado;
  guardado = null;
  bloqueos = 0;
  b.style.position = g.position;
  b.style.top = g.top;
  b.style.left = g.left;
  b.style.right = g.right;
  b.style.width = g.width;
  b.style.overflowY = g.overflowY;
  b.style.paddingRight = g.paddingRight;
  window.scrollTo(0, g.scrollY);
}

export function useBloquearScroll(activo: boolean = true) {
  useEffect(() => {
    if (!activo) return;
    bloquear();
    return liberar;
  }, [activo]);
}
