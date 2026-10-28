/*
 * Enlaces de contacto que funcionan en cualquier equipo.
 * "mailto:" y "tel:" dependen de que el computador tenga un programa de
 * correo o de llamadas configurado; si no lo tiene, el navegador muestra
 * "¿Abrir Elegir una aplicación?" y no pasa nada. Por eso se usan Gmail y
 * WhatsApp en el navegador (en el celular abren sus apps).
 */

/** Gmail con un correo nuevo listo para escribir a esa dirección. */
export const enlaceCorreo = (correo: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(correo)}`;

/** Chat de WhatsApp con ese número (acepta "+57 317 703 7517"). */
export const enlaceWhatsApp = (telefono: string) =>
  `https://api.whatsapp.com/send?phone=${telefono.replace(/\D/g, '')}`;
