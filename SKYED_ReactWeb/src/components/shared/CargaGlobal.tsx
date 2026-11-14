import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { CARGA_CAMBIO, type AccionCarga } from '../../services/api';
import '../../styles/shared/cargaGlobal.css';

/**
 * Ventana de carga de toda la app: aparece mientras se crea, guarda o elimina
 * algo (cualquier POST/PUT/PATCH/DELETE hecho con apiFetch) y bloquea los
 * clics para que no se repita la acción.
 *
 * - Solo aparece si la acción tarda más de 300 ms (las rápidas no parpadean).
 * - Una vez visible se queda al menos 450 ms (no destella).
 * - Toma los colores del módulo (Social, Deportivo o la principal).
 */
const RETRASO_MS = 300;
const MINIMO_MS = 450;

const TEXTO: Record<AccionCarga, string> = {
  guardar: 'Guardando…',
  actualizar: 'Actualizando…',
  eliminar: 'Eliminando…',
};

export default function CargaGlobal() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [accion, setAccion] = useState<AccionCarga>('guardar');
  const mostrarTimer = useRef<number | undefined>(undefined);
  const ocultarTimer = useRef<number | undefined>(undefined);
  const visibleDesde = useRef(0);

  useEffect(() => {
    const alCambiar = (e: Event) => {
      const { activas, accion: nueva } = (e as CustomEvent<{ activas: number; accion: AccionCarga | null }>).detail;
      if (activas > 0) {
        if (nueva) setAccion(nueva);
        window.clearTimeout(ocultarTimer.current);
        if (!mostrarTimer.current) {
          mostrarTimer.current = window.setTimeout(() => {
            visibleDesde.current = performance.now();
            setVisible(true);
          }, RETRASO_MS);
        }
        return;
      }
      // Ya no hay acciones en curso.
      window.clearTimeout(mostrarTimer.current);
      mostrarTimer.current = undefined;
      const lleva = performance.now() - visibleDesde.current;
      ocultarTimer.current = window.setTimeout(() => setVisible(false), Math.max(0, MINIMO_MS - lleva));
    };
    window.addEventListener(CARGA_CAMBIO, alCambiar);
    return () => {
      window.removeEventListener(CARGA_CAMBIO, alCambiar);
      window.clearTimeout(mostrarTimer.current);
      window.clearTimeout(ocultarTimer.current);
    };
  }, []);

  // Mientras está visible, el teclado tampoco dispara otra acción (Enter / Espacio).
  useEffect(() => {
    if (!visible) return;
    const bloquear = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', bloquear, true);
    return () => window.removeEventListener('keydown', bloquear, true);
  }, [visible]);

  if (!visible) return null;

  const modulo = pathname.startsWith('/social') ? 'social' : pathname.startsWith('/deportivo') ? 'deportivo' : 'principal';

  return createPortal(
    <div className={`carga-global carga-global--${modulo}`} role="alert" aria-live="assertive" aria-busy="true">
      <div className="carga-global-caja">
        <span className="carga-global-giro" aria-hidden="true" />
        <strong>{TEXTO[accion]}</strong>
        <small>Espera un momento, no cierres ni recargues la página.</small>
      </div>
    </div>,
    document.body,
  );
}
