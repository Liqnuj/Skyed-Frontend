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
  /** Página en la que está la persona: SKAI adapta los pasos a ella. */
  ruta?: string,
): Promise<string> {
  const token = getToken();

  // El backend puede tardar hasta ~45 s en el peor caso (modelo principal
  // agotado + modelo de respaldo); más que eso es que algo se colgó.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${apiConfig.baseURL}/asistente`, {
      method: 'POST',
      signal: controller.signal,
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
        ruta,
      }),
    });
  } catch {
    // Servidor apagado, sin internet o se agotó la espera.
    throw new Error('No pude conectarme con SKAI. Revisa tu conexión e intenta de nuevo.');
  } finally {
    window.clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.error) {
    let motivo: string;
    if (res.status === 429) {
      motivo = 'Enviaste muchos mensajes seguidos. Espera un minuto y vuelve a escribirme.';
    } else if (data?.error) {
      motivo = data.error;
    } else {
      motivo = 'SKAI no pudo responder en este momento. Intenta de nuevo en unos segundos.';
    }

    // El detalle técnico (lo manda el backend solo con APP_DEBUG=true)
    // se muestra únicamente en desarrollo, para diagnosticar rápido.
    if (import.meta.env.DEV && data?.detail) {
      motivo += ` (${data.detail})`;
    }

    throw new Error(motivo);
  }

  return data.reply as string;
}
