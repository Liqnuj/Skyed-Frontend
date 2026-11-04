import { createContext } from 'react';
import type { EspacioAyuda } from '../../services/ayudaService';

/** Espacio (principal / social / deportivo) al que pertenece la página de ayuda que se está mostrando. */
export const ModuloAyudaContext = createContext<EspacioAyuda>('deportivo');
