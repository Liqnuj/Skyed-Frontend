// Capa preparada para el futuro.
// En esta fase NO llama a Laravel: usa datos locales para que el frontend
// pueda desarrollarse y probarse completamente antes de conectar el backend.

export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
  connected: false,
};
