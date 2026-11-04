import type { EspacioAyuda } from '../../services/ayudaService';

/** Base de las rutas del Centro de Ayuda: /ayuda (principal), /social/ayuda o /deportivo/ayuda. */
export const rutaAyuda = (espacio: EspacioAyuda) => (espacio === 'principal' ? '/ayuda' : `/${espacio}/ayuda`);

/** Página de inicio del espacio (primera miga del recorrido): / (principal), /social o /deportivo. */
export const rutaInicio = (espacio: EspacioAyuda) => (espacio === 'principal' ? '/' : `/${espacio}`);