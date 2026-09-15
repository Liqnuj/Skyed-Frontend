import { apiConfig, getToken } from './api';

export type SkaiRole = 'user' | 'assistant';

export interface SkaiTurn {
  role: SkaiRole;
  content: string;
}

export type SkaiContext = 'general' | 'social' | 'deportivo';

/**
 * Cliente del asistente SKAI. Pega directo a la nueva ruta de Laravel
 * (POST /api/asistente), que reemplaza al antiguo prototipo en PHP
 * plano (api/asistente.php). Reutiliza el token si el usuario tiene
 * sesión iniciada, pero funciona igual sin él: SKAI está disponible
 * también para visitantes no autenticados.
 */
export async function preguntarSkai(
  message: string,
  context: SkaiContext,
  history: SkaiTurn[],
): Promise<string> {
  const token = getToken();

  const res = await fetch(`${apiConfig.baseURL}/asistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      context,
      // Enviamos solo el historial previo a este mensaje; el backend
      // además limita cuántos turnos usa.
      history: history.slice(0, -1),
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.error) {
    // Mientras se termina de configurar el asistente en el backend,
    // mostramos el motivo real (por ejemplo "Falta GEMINI_API_KEY" o
    // el error que devolvió Gemini) en vez de un mensaje genérico, así
    // se puede diagnosticar sin tener que abrir las herramientas de
    // desarrollador del navegador.
    const motivo = data?.error
      ? data.detail
        ? `${data.error} (${data.detail})`
        : data.error
      : `Error HTTP ${res.status} al llamar /asistente`;

    throw new Error(motivo);
  }

  return data.reply as string;
}
