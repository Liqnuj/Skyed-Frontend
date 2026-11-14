export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
};

const TOKEN_KEY = 'skyed_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Evento que avisa a la app que el servidor rechazó el token (sesión vencida o alterada). */
export const SESION_INVALIDA = 'skyed:sesion-invalida';

/**
 * Evento que avisa que el servidor respondió 403 (p. ej. el administrador le
 * quitó un permiso al asistente mientras estaba conectado). El detalle trae
 * el mensaje; PermisosProvider lo escucha para refrescar los permisos.
 */
export const PERMISO_DENEGADO = 'skyed:permiso-denegado';

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Un 500 con HTML o un 204 sin cuerpo hacían fallar res.json() con un error
 * críptico. Además, PHP a veces escribe una advertencia ("<b>Warning</b>:
 * ...") ANTES del JSON de Laravel; en ese caso se lee el JSON que viene
 * después, para mostrar el mensaje real en vez de "Error en la petición".
 */
function leerJson(texto: string): any {
  try {
    return JSON.parse(texto);
  } catch {
    const inicio = texto.indexOf('{');
    if (inicio > 0) {
      try {
        return JSON.parse(texto.slice(inicio));
      } catch {
        // No era JSON después de todo.
      }
    }
    return {};
  }
}

/** Mensaje cuando no hay conexión con el servidor (antes salía "Failed to fetch", en inglés). */
export const MENSAJE_SIN_CONEXION =
  'No pudimos conectarnos con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';

/** Mensaje para errores internos del servidor (500): el detalle técnico va a la consola, no a la pantalla. */
export const MENSAJE_ERROR_SERVIDOR =
  'Ocurrió un problema en el servidor. Inténtalo de nuevo en unos minutos.';

/**
 * fetch que, si no hay conexión (servidor apagado, sin internet, CORS), lanza
 * un Error con un mensaje claro en español en lugar del "Failed to fetch"
 * del navegador. Una cancelación (AbortController) se deja pasar tal cual.
 */
export async function fetchSeguro(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error(MENSAJE_SIN_CONEXION);
  }
}

/** ¿El mensaje es un error técnico (SQL, PHP, excepción) que no debe ver el usuario? */
function esMensajeTecnico(mensaje: unknown): boolean {
  return typeof mensaje !== 'string' || mensaje.trim() === ''
    || /SQLSTATE|Exception|Stack trace|Call to |Undefined (variable|array|index|property|method)|Server Error|syntax error|Class "|\.php\b|Attempt to read/i.test(mensaje);
}

/* ---------------------------------------------------------------------------
 * Pantalla de carga y anti-duplicados para las acciones (crear, guardar, borrar).
 *
 * - Mientras hay una petición que cambia datos (POST/PUT/PATCH/DELETE), la app
 *   muestra una ventana "Guardando…" que bloquea los clics (componente
 *   CargaGlobal, escucha el evento CARGA_CAMBIO).
 * - Si llega la MISMA petición mientras la primera sigue en curso (doble clic,
 *   Enter repetido, internet lento), se devuelve la que ya va: nunca se crea
 *   dos veces lo mismo.
 * - Las acciones de fondo (marcar notificaciones, login/logout, que ya tiene su
 *   propia animación) no muestran la ventana.
 * ------------------------------------------------------------------------- */
export const CARGA_CAMBIO = 'skyed:carga-cambio';
export type AccionCarga = 'guardar' | 'actualizar' | 'eliminar';

const RUTAS_SIN_VENTANA = [/^\/notificaciones/, /^\/login\b/, /^\/logout\b/, /^\/asistente\b/, /^\/verificar-contrasena\b/];
const enCurso = new Map<string, Promise<any>>();
const accionesActivas = new Map<number, AccionCarga>();
let siguienteId = 1;

function avisarCarga() {
  const acciones = [...accionesActivas.values()];
  window.dispatchEvent(new CustomEvent(CARGA_CAMBIO, {
    detail: { activas: acciones.length, accion: acciones[acciones.length - 1] ?? null },
  }));
}

function accionDe(metodo: string): AccionCarga {
  if (metodo === 'DELETE') return 'eliminar';
  if (metodo === 'PUT' || metodo === 'PATCH') return 'actualizar';
  return 'guardar';
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const metodo = (options.method ?? 'GET').toUpperCase();
  if (metodo === 'GET' || metodo === 'HEAD') return peticion(path, options);

  // Clave de la petición: método + ruta + cuerpo (un FormData no se puede comparar: basta método + ruta).
  const cuerpo = typeof options.body === 'string' ? options.body : options.body instanceof FormData ? '[archivo]' : '';
  const clave = `${metodo} ${path} ${cuerpo}`;
  const repetida = enCurso.get(clave);
  if (repetida) return repetida;

  const conVentana = !RUTAS_SIN_VENTANA.some((r) => r.test(path));
  const id = siguienteId++;
  if (conVentana) {
    accionesActivas.set(id, accionDe(metodo));
    avisarCarga();
  }

  const promesa = peticion(path, options).finally(() => {
    enCurso.delete(clave);
    if (conVentana) {
      accionesActivas.delete(id);
      avisarCarga();
    }
  });
  enCurso.set(clave, promesa);
  return promesa;
}

async function peticion(path: string, options: RequestInit = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetchSeguro(`${apiConfig.baseURL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = leerJson(await res.text());
  // El token que mandamos ya no sirve (venció, se revocó o no es válido):
  // se cierra la sesión local. Si no mandamos token (p. ej. un login con
  // clave errónea) no se toca nada.
  if (res.status === 401 && token) {
    window.dispatchEvent(new Event(SESION_INVALIDA));
  }
  if (res.status === 403 && token) {
    window.dispatchEvent(new CustomEvent(PERMISO_DENEGADO, { detail: { mensaje: data.message } }));
  }
  if (!res.ok) {
    // Laravel responde "Too Many Attempts." en inglés cuando se pasa el
    // límite de intentos (por ejemplo 3 logins fallidos en un minuto).
    if (res.status === 429) {
      throw new Error(data.message && data.message !== 'Too Many Attempts.'
        ? data.message
        : 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.');
    }
    if (res.status === 422 && data.errors) {
      const detalle = Object.values(data.errors).flat().join(' ');
      throw new Error(detalle || data.message || 'Revisa los datos e inténtalo de nuevo.');
    }
    // Errores internos: el detalle técnico (que puede venir en inglés) solo va a la consola.
    if (res.status >= 500 && esMensajeTecnico(data.message)) {
      console.error(`Error ${res.status} en ${path}:`, data);
      throw new Error(MENSAJE_ERROR_SERVIDOR);
    }
    throw new Error(esMensajeTecnico(data.message) ? 'No se pudo completar la solicitud. Inténtalo de nuevo.' : data.message);
  }
  return data;
}



/**
 * Descarga un archivo (PDF/Excel) desde la API. Igual que apiFetch envía el
 * token Bearer, pero la respuesta es un archivo (blob), no JSON. Los errores
 * (403, 422, 429…) sí llegan como JSON y se convierten en un Error legible.
 */
export type ParamsDescarga = Record<string, string | number | boolean | null | undefined>;

export async function apiDownload(path: string, params: ParamsDescarga = {}): Promise<Blob> {
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor === null || valor === undefined || valor === '' || valor === false) return;
    query.set(clave, valor === true ? '1' : String(valor));
  });
  const qs = query.toString();

  const res = await fetchSeguro(`${apiConfig.baseURL}${path}${qs ? `?${qs}` : ''}`, {
    headers: {
      Accept: 'application/json, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('skyed_user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const data = leerJson(await res.text());
    if (res.status === 403) throw new Error('No tienes permisos para generar este reporte.');
    if (res.status === 429) throw new Error('Demasiadas descargas seguidas. Espera un minuto e inténtalo de nuevo.');
    if (res.status === 422 && data.errors) {
      throw new Error(Object.values(data.errors).flat().join(' ') || data.message || 'Filtros no válidos.');
    }
    throw new Error(esMensajeTecnico(data.message) ? 'No se pudo generar el reporte. Inténtalo de nuevo.' : data.message);
  }

  return res.blob();
}