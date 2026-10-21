import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Estado de un menú desplegable de la barra de navegación: se cierra al
 * hacer clic afuera, con la tecla Escape (devolviendo el foco al botón) y
 * al cambiar de página. Lo usan el menú de la cuenta y el selector de
 * paneles de administración.
 */
export function useMenuDesplegable() {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setAbierto(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!abierto) return;

    const alHacerClic = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  return { abierto, setAbierto, contenedorRef, botonRef };
}
