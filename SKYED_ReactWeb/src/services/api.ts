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
  // Un 500 con HTML o un 204 sin cuerpo hacían fallar res.json() con un
  // error críptico ("Unexpected token <"); así el mensaje sigue siendo útil.
  const data = await res.json().catch(() => ({}));
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
      throw new Error(detalle || data.message || 'Error en la petición');
    }
    throw new Error(data.message ?? 'Error en la petición');
  }
  return data;
}