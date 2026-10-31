import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

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

  return (
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
          <button type="button" className="ay-adm-icono" onClick={onCerrar} disabled={bloqueado} aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}