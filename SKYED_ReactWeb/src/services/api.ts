export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
};

const TOKEN_KEY = 'skyed_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

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

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${apiConfig.baseURL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const errorData = leerJson(await res.text());
    
    if (path === '/login') {
      throw new Error(errorData.message || 'Credenciales incorrectas.');
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('skyed_user'); 
    window.location.href = '/login'; 
    throw new Error('Sesión expirada');
  }

  const data = leerJson(await res.text());
  
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(data.message && data.message !== 'Too Many Attempts.'
        ? data.message
        : 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.');
    }
    if (res.status === 422 && data.errors) {
      const detalle = Object.values(data.errors).flat().join(' ');
      throw new Error(detalle || data.message || 'Error en la petición');
    }
    throw new Error(data.message ?? 'Error en la petición');
  }
  
  return data;
}

