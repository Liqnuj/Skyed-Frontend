import { createContext, useContext, useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Clase y variables de la vista de ayuda: la ventana se monta fuera de ella y las necesita para verse igual. */
export const AyudaContexto = createContext<{ className: string; style: CSSProperties } | null>(null);

const ENFOCABLES =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

interface Props {
  titulo: string;
  onCerrar: () => void;
  /** Mientras se guarda: no se puede cerrar con Escape ni con la X. */
  bloqueado?: boolean;
  ancho?: number;
  children: ReactNode;
}

export default function Modal({ titulo, onCerrar, bloqueado = false, ancho = 760, children }: Props) {
  const idTitulo = useId();
  const contexto = useContext(AyudaContexto);
  const cuadro = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);
  cerrarRef.current = onCerrar;
  bloqueadoRef.current = bloqueado;

  useEffect(() => {
    const quienAbrio = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cuadro.current?.querySelector<HTMLElement>('input,select,textarea')?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloqueadoRef.current) {
        cerrarRef.current();
        return;
      }
      if (e.key !== 'Tab' || !cuadro.current) return;

      const lista = cuadro.current.querySelectorAll<HTMLElement>(ENFOCABLES);
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowAnterior;
      quienAbrio?.focus();
    };
  }, []);

  const ventana = (
    <div className="ay-adm-fondo">
      <div
        ref={cuadro}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="ay-adm-modal"
        style={{ maxWidth: ancho }}
      >
        <div className="ay-adm-modal-cab">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="ay-adm-icono" onClick={onCerrar} disabled={bloqueado} aria-label="Cerrar" title="Cerrar la ventana">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  // Dentro del panel (Deportivo/Social) la ventana se monta en la raíz del panel: el contenido vive en
  // .admin-main, que es un contexto de apilamiento por debajo del encabezado y el menú lateral,
  // y ahí la ventana quedaba tapada por arriba y sin oscurecer esas barras.
  const raiz = document.querySelector<HTMLElement>('.social-admin, .deportivo-admin');
  if (!raiz || !contexto) return ventana;
  return createPortal(<div className={contexto.className} style={contexto.style}>{ventana}</div>, raiz);
}