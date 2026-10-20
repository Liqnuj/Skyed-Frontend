/**
 * Número de WhatsApp de la persona encargada de PQR en SkyedSocial.
 * Se configura con VITE_WHATSAPP_PQR en el .env (código de país + número,
 * sin "+", espacios ni guiones). El historial de conversaciones queda en
 * el propio WhatsApp del encargado — no hace falta un bot ni un servidor
 * aparte para eso.
 */
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_PQR || '573000000000';

export function buildWhatsAppLink(mensaje: string, numero: string = WHATSAPP_NUMBER) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

interface PqrWhatsAppData {
  tipo: string;
  radicado: string;
  nombre: string;
  apellido: string;
  evento?: string;
  fecha?: string;
  asunto: string;
  descripcion: string;
}

export function buildPqrWhatsAppMessage(data: PqrWhatsAppData): string {
  const lineas = [
    `Hola, soy ${data.nombre} ${data.apellido}. Quiero radicar la siguiente solicitud (*${data.tipo}*) en SkyedSocial.`,
    '',
    `*Radicado:* ${data.radicado}`,
    `*Asunto:* ${data.asunto}`,
    data.evento ? `*Tipo de evento:* ${data.evento}` : null,
    data.fecha ? `*Fecha del evento:* ${data.fecha}` : null,
    '',
    `*Detalle:*`,
    data.descripcion,
  ];

  return lineas.filter((linea) => linea !== null).join('\n');
}
