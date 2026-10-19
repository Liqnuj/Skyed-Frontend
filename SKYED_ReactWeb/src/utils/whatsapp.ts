/**
 * Número de WhatsApp de la persona encargada de PQR en SkyedSocial.
 * Se configura con VITE_WHATSAPP_PQR en el .env (código de país + número,
 * sin "+", espacios ni guiones). El historial de conversaciones queda en
 * el propio WhatsApp del encargado — no hace falta un bot ni un servidor
 * aparte para eso.
 */
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_PQR || '573000000000';

/**
 * Se usa api.whatsapp.com/send y no wa.me: wa.me redirige a esta misma
 * dirección y en ese redirect cambia cada emoji por "�" (comprobado: el
 * Location que devuelve trae %EF%BF%BD en lugar del emoji).
 */
export function buildWhatsAppLink(mensaje: string, numero: string = WHATSAPP_NUMBER) {
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
}

interface PqrWhatsAppData {
  tipo: string;
  icono: string;
  radicado: string;
  nombreCompleto: string;
  correo?: string;
  telefono?: string;
  /** Momento en que se radicó la solicitud. */
  fecha: Date;
  /** Por ejemplo "3 días hábiles" (sale del cuadro "Tiempos de respuesta"). */
  tiempoRespuesta: string;
  asunto: string;
  descripcion: string;
}

const SEPARADOR = '━━━━━━━━━━━━━━━━━━';

/**
 * Mensaje de seguimiento de una PQR para WhatsApp. Usa el formato propio
 * de WhatsApp: *negrita*, _cursiva_ y "> " para citar el detalle.
 */
export function buildPqrWhatsAppMessage(data: PqrWhatsAppData): string {
  const fecha = data.fecha.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // WhatsApp solo cita una línea a la vez, así que cada línea del detalle
  // lleva su propio "> ".
  const detalleCitado = data.descripcion
    .split('\n')
    .map((linea) => `> ${linea}`)
    .join('\n');

  const contacto = [
    data.correo ? `• Correo: ${data.correo}` : null,
    data.telefono ? `• Teléfono: ${data.telefono}` : null,
  ].filter((linea): linea is string => linea !== null);

  const lineas = [
    '✨ *SKYEDSOCIAL · ATENCIÓN AL CLIENTE* ✨',
    SEPARADOR,
    '',
    '¡Hola, equipo Skyed! 👋',
    `Soy *${data.nombreCompleto}* y quiero hacer seguimiento a mi solicitud.`,
    '',
    `${data.icono} *Tipo:* ${data.tipo}`,
    `🔖 *Radicado:* ${data.radicado}`,
    `📅 *Radicada el:* ${fecha}`,
    `⏳ *Respuesta estimada:* ${data.tiempoRespuesta}`,
    '',
    '📝 *Asunto*',
    data.asunto,
    '',
    '💬 *Detalle*',
    detalleCitado,
    ...(contacto.length ? ['', '👤 *Mis datos de contacto*', ...contacto] : []),
    '',
    SEPARADOR,
    '_Quedo pendiente de su respuesta. ¡Muchas gracias!_ 💜',
  ];

  return lineas.join('\n');
}
