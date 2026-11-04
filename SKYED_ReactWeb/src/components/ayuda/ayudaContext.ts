import { createContext } from 'react';
import type { ModuloAyuda } from '../../services/ayudaService';

/** Módulo (social / deportivo) al que pertenece la página de ayuda que se está mostrando. */
export const ModuloAyudaContext = createContext<ModuloAyuda>('deportivo');
