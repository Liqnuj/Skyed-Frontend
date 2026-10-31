import { apiFetch } from './api';

export type EstadoArticulo = 'borrador' | 'publicado' | 'desactivado';
export type ModuloContenido = 'general' | 'social' | 'deportivo';
export type AudienciaArticulo = 'publico' | 'usuario' | 'admin';

export interface ArticuloAdmin {
  id: number;
  slug: string;
  titulo: string;
  resumen: string | null;
  contenido: string;
  palabras_clave: string | null;
  modulo: ModuloContenido;
  audiencia: AudienciaArticulo;
  estado: EstadoArticulo;
  destacado: boolean;
  faq: boolean;
  orden: number;
  contexto: string | null;
  visitas: number;
  autor_id: number | null;
  categoria?: { id: number; slug: string; nombre: string };
  utiles?: number;
  no_utiles?: number;
  creado_en: string | null;
  actualizado_en: string | null;
}

export interface CategoriaAdmin {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string;
  modulo: ModuloContenido;
  orden: number;
  activa: boolean;
  total_articulos?: number;
}

export interface OpcionCategoria {
  id: number;
  nombre: string;
  modulo: ModuloContenido;
  activa: boolean;
  gestionable: boolean;
}

export interface OpcionesAyuda {
  estados: EstadoArticulo[];
  audiencias: AudienciaArticulo[];
  modulos: ModuloContenido[];
  categorias: OpcionCategoria[];
}

export interface ComentarioAyuda {
  comentario: string;
  fecha: string | null;
}

export interface DatosArticulo {
  categoria_id: number;
  titulo: string;
  slug?: string;
  resumen: string | null;
  contenido: string;
  palabras_clave: string | null;
  modulo: ModuloContenido;
  audiencia: AudienciaArticulo;
  estado: EstadoArticulo;
  destacado: boolean;
  faq: boolean;
  orden: number;
  contexto: string | null;
}

export interface DatosCategoria {
  nombre: string;
  modulo: ModuloContenido;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  activa: boolean;
}

export interface FilaMetrica {
  id: number;
  slug: string;
  titulo: string;
  categoria: string | null;
  estado: EstadoArticulo;
  visitas: number;
  utiles: number;
  no_utiles: number;
  porcentaje_no_util: number;
}

export interface Metricas {
  resumen: {
    articulos: number;
    publicados: number;
    borradores: number;
    desactivados: number;
    visitas: number;
    utiles: number;
    no_utiles: number;
    satisfaccion: number | null;
  };
  mas_vistos: FilaMetrica[];
  por_mejorar: FilaMetrica[];
  categorias: { id: number; nombre: string; articulos: number; visitas: number }[];
}

const BASE = '/ayuda/admin';
const cuerpo = (datos: unknown) => JSON.stringify(datos);

export const ayudaAdminService = {
  opciones: (): Promise<OpcionesAyuda> => apiFetch(`${BASE}/opciones`),

  metricas: (): Promise<Metricas> => apiFetch(`${BASE}/metricas`),

  async articulos(): Promise<ArticuloAdmin[]> {
    const r = await apiFetch(`${BASE}/articulos`);
    return r.articulos;
  },

  articulo: (id: number): Promise<{ articulo: ArticuloAdmin; comentarios: ComentarioAyuda[] }> =>
    apiFetch(`${BASE}/articulos/${id}`),

  crearArticulo: (datos: DatosArticulo) =>
    apiFetch(`${BASE}/articulos`, { method: 'POST', body: cuerpo(datos) }),

  actualizarArticulo: (id: number, datos: Partial<DatosArticulo>) =>
    apiFetch(`${BASE}/articulos/${id}`, { method: 'PATCH', body: cuerpo(datos) }),

  eliminarArticulo: (id: number) => apiFetch(`${BASE}/articulos/${id}`, { method: 'DELETE' }),

  ordenarArticulos: (ids: number[]) =>
    apiFetch(`${BASE}/articulos/orden`, { method: 'POST', body: cuerpo({ ids }) }),

  async categorias(): Promise<CategoriaAdmin[]> {
    const r = await apiFetch(`${BASE}/categorias`);
    return r.categorias;
  },

  crearCategoria: (datos: DatosCategoria) =>
    apiFetch(`${BASE}/categorias`, { method: 'POST', body: cuerpo(datos) }),

  actualizarCategoria: (id: number, datos: Partial<DatosCategoria>) =>
    apiFetch(`${BASE}/categorias/${id}`, { method: 'PATCH', body: cuerpo(datos) }),

  eliminarCategoria: (id: number) => apiFetch(`${BASE}/categorias/${id}`, { method: 'DELETE' }),

  ordenarCategorias: (ids: number[]) =>
    apiFetch(`${BASE}/categorias/orden`, { method: 'POST', body: cuerpo({ ids }) }),
};