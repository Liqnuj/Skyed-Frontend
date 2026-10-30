import { apiConfig, getToken } from './api';

export type ModuloAyuda = 'social' | 'deportivo';

export interface AyudaCategoria {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string;
  modulo: string;
  orden: number;
  total_articulos?: number;
}

export interface AyudaArticuloResumen {
  id: number;
  slug: string;
  titulo: string;
  resumen: string | null;
  modulo: string;
  audiencia: string;
  destacado: boolean;
  faq: boolean;
  contexto: string | null;
  categoria?: { id: number; slug: string; nombre: string };
  actualizado_en: string | null;
}

export interface AyudaArticuloDetalle extends AyudaArticuloResumen {
  contenido: string;
  palabras_clave: string[];
  creado_en: string | null;
}

export interface RespuestaInicio {
  categorias: AyudaCategoria[];
  faq: AyudaArticuloResumen[];
  destacados: AyudaArticuloResumen[];
  populares: AyudaArticuloResumen[];
}

export interface MiValoracion {
  util: boolean;
  comentario: string | null;
}

export interface RespuestaArticulo {
  articulo: AyudaArticuloDetalle;
  relacionados: AyudaArticuloResumen[];
  mi_valoracion: MiValoracion | null;
}

export interface RespuestaBusqueda {
  consulta: string;
  total: number;
  resultados: AyudaArticuloResumen[];
}

/** Error del Centro de Ayuda; `status` 0 = no hubo conexión con el servidor. */
export class AyudaError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AyudaError';
    this.status = status;
  }
}

// PHP a veces escribe una advertencia antes del JSON; se lee el JSON que sigue.
function leerJson(texto: string): any {
  try {
    return JSON.parse(texto);
  } catch {
    const inicio = texto.indexOf('{');
    if (inicio > 0) {
      try {
        return JSON.parse(texto.slice(inicio));
      } catch {
        /* no era JSON */
      }
    }
    return {};
  }
}

async function ayudaGet<T>(ruta: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor) query.set(clave, valor);
  });
  const qs = query.toString();
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${apiConfig.baseURL}/ayuda${ruta}${qs ? `?${qs}` : ''}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new AyudaError(
      'No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      0,
    );
  }

  const data = leerJson(await res.text());

  if (!res.ok) {
    if (res.status === 429) {
      throw new AyudaError('Hiciste muchas consultas seguidas. Espera un momento e inténtalo de nuevo.', 429);
    }
    throw new AyudaError(data?.message ?? 'No pudimos cargar la ayuda en este momento.', res.status);
  }

  return data as T;
}

async function ayudaPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${apiConfig.baseURL}/ayuda${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new AyudaError(
      'No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      0,
    );
  }

  const data = leerJson(await res.text());

  if (!res.ok) {
    if (res.status === 401) throw new AyudaError('Inicia sesión para dejar tu opinión.', 401);
    if (res.status === 429) {
      throw new AyudaError('Hiciste muchas peticiones seguidas. Espera un momento e inténtalo de nuevo.', 429);
    }
    if (res.status === 422 && data?.errors) {
      throw new AyudaError(Object.values(data.errors).flat().join(' '), 422);
    }
    throw new AyudaError(data?.message ?? 'No pudimos guardar tu respuesta.', res.status);
  }

  return data as T;
}

/**
 * Cuenta una visita al artículo, una sola vez por artículo y por sesión del
 * navegador (así recargar no infla el contador). Es "silencioso": si falla, no
 * se avisa a la persona.
 */
export function registrarVisita(slug: string): void {
  const clave = `skyed_ayuda_visto_${slug}`;

  try {
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, '1');
  } catch {
    /* sin sessionStorage: se cuenta igual */
  }

  const token = getToken();
  void fetch(`${apiConfig.baseURL}/ayuda/articulos/${encodeURIComponent(slug)}/visita`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    keepalive: true,
  }).catch(() => undefined);
}


export const ayudaService = {
  inicio: (modulo: ModuloAyuda) => ayudaGet<RespuestaInicio>('', { modulo }),

  categoria: (slug: string) =>
    ayudaGet<{ categoria: AyudaCategoria; articulos: AyudaArticuloResumen[] }>(
      `/categorias/${encodeURIComponent(slug)}`,
    ),

  articulo: (slug: string) => ayudaGet<RespuestaArticulo>(`/articulos/${encodeURIComponent(slug)}`),

  valorar: (slug: string, util: boolean, comentario?: string) =>
    ayudaPost<{ message: string; valoracion: MiValoracion }>(
      `/articulos/${encodeURIComponent(slug)}/valoracion`,
      { util, comentario: util ? undefined : comentario?.trim() || undefined },
    ),

  buscar: (q: string, modulo: ModuloAyuda) => ayudaGet<RespuestaBusqueda>('/buscar', { q, modulo }),
};