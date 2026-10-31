/**
 * Filtro de caracteres peligrosos para TODOS los formularios de la página.
 *
 * Se instala una sola vez (main.tsx) y vigila cada campo de texto: lo que el
 * usuario escribe o pega se limpia al instante, antes de que React lo guarde
 * en el estado. Así ningún formulario (actual o futuro) necesita acordarse de
 * limpiar nada, y los caracteres típicos de ataques nunca llegan a la API:
 *
 *  - Inyección SQL:       comillas  ;  --  =  \  y comentarios
 *  - XSS (scripts HTML):  <  >  "  '  `  &  { }
 *  - Comandos del sistema: ;  |  &  `  $(  \  ^  ~
 *
 * IMPORTANTE: esto es la primera barrera (la del navegador) y se puede saltar
 * llamando a la API directamente. La defensa real tiene que estar también en
 * el backend: consultas preparadas (Eloquent / bindings), validación de cada
 * campo y escapar el texto al mostrarlo. Ver notas en la entrega.
 *
 * Para un campo que de verdad necesite esos caracteres: data-permitir-especiales.
 */

/** Caracteres que se eliminan siempre (incluye las versiones de ancho completo ＜ ＞ etc.). */
const PELIGROSOS = /[<>"'`;\\|&{}^~=＜＞＂＇；＆＝｜＄]/g;
/** Caracteres de control (salvo salto de línea y tabulación, que sí se usan en los textareas). */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** `$` solo se acepta como signo de precio ($50.000); `$(` y `${` son comandos. */
const DOLAR_NO_PRECIO = /\$(?!\d)/g;
/** Aperturas y cierres de comentario de SQL / código. */
const COMENTARIOS = /\/\*|\*\//g;
const GUIONES_DOBLES = /-{2,}/g;

/** Texto libre (nombres, descripciones, búsquedas, mensajes…): quita lo peligroso. */
export function limpiarTexto(valor: string): string {
  return valor
    .replace(CONTROL, '')
    .replace(PELIGROSOS, '')
    .replace(DOLAR_NO_PRECIO, '')
    .replace(COMENTARIOS, '')
    .replace(GUIONES_DOBLES, '-');
}

/** Correo: solo lo que puede tener una dirección normal (letras, números y . _ % + - @). */
export function limpiarCorreo(valor: string): string {
  return valor.replace(/[^A-Za-z0-9@._%+-]/g, '');
}

/** True si el texto trae algún carácter que el filtro eliminaría. */
export const tieneCaracteresPeligrosos = (valor: string) => limpiarTexto(valor) !== valor;

/* ---------------- Filtro global sobre los campos ---------------- */

/** Tipos de <input> que se filtran. Los demás (fecha, número, archivo, contraseña…) no aceptan texto libre. */
const TIPOS_FILTRADOS = new Set(['text', 'search', 'tel', 'email', 'url', '']);

let instalado = false;
let aviso: HTMLElement | null = null;
const temporizadores = new WeakMap<HTMLElement, number>();

function avisarBloqueo(el: HTMLElement) {
  // Resalta el campo un instante para que quien escribe vea que el carácter no se acepta.
  el.classList.add('skyed-filtro-aviso');
  window.clearTimeout(temporizadores.get(el));
  temporizadores.set(el, window.setTimeout(() => el.classList.remove('skyed-filtro-aviso'), 900));

  // Y se anuncia para lectores de pantalla.
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    aviso.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
    document.body.appendChild(aviso);
  }
  aviso.textContent = '';
  window.setTimeout(() => { if (aviso) aviso.textContent = 'Ese carácter no está permitido.'; }, 30);
}

function alEscribir(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if ((e as InputEvent).isComposing) return; // teclados con acentos / IME: se limpia al terminar
  if (el.hasAttribute('data-permitir-especiales')) return;
  if (el instanceof HTMLInputElement && !TIPOS_FILTRADOS.has(el.type)) return;

  const original = el.value;
  const limpiar = el.type === 'email' ? limpiarCorreo : limpiarTexto;
  const limpio = limpiar(original);
  if (limpio === original) return;

  let cursor: number | null = null;
  try { cursor = el.selectionStart; } catch { /* type=email no expone el cursor */ }

  // Se usa el setter del prototipo (no el de la instancia) para que React note el cambio
  // y guarde el texto ya limpio en su estado.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, limpio);

  if (cursor !== null) {
    const nuevo = limpiar(original.slice(0, cursor)).length;
    try { el.setSelectionRange(nuevo, nuevo); } catch { /* sin cursor disponible */ }
  }
  avisarBloqueo(el);
}

/** Activa el filtro en todo el documento. Seguro de llamar varias veces. */
export function instalarFiltroDeCaracteres() {
  if (instalado || typeof document === 'undefined') return;
  instalado = true;
  // En captura: corre antes que el onChange de React.
  document.addEventListener('input', alEscribir, true);
  // Al terminar de componer (IME) se vuelve a revisar el campo.
  document.addEventListener('compositionend', (e) => alEscribir(e), true);
}
