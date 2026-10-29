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

export const ayudaService = {
  inicio: (modulo: ModuloAyuda) => ayudaGet<RespuestaInicio>('', { modulo }),

  categoria: (slug: string) =>
    ayudaGet<{ categoria: AyudaCategoria; articulos: AyudaArticuloResumen[] }>(
      `/categorias/${encodeURIComponent(slug)}`,
    ),

  articulo: (slug: string) =>
    ayudaGet<{ articulo: AyudaArticuloDetalle; relacionados: AyudaArticuloResumen[] }>(
      `/articulos/${encodeURIComponent(slug)}`,
    ),

  buscar: (q: string, modulo: ModuloAyuda) => ayudaGet<RespuestaBusqueda>('/buscar', { q, modulo }),
};