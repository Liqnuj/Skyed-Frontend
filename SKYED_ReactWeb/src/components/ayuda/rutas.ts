import type { ModuloAyuda } from '../../services/ayudaService';

/** Base de las rutas del Centro de Ayuda de cada módulo. */
export const rutaAyuda = (modulo: ModuloAyuda) => `/${modulo}/ayuda`;