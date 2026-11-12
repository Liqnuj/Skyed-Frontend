import type { TipoPqr } from '../../../services/socialService';

/** Textos e iconos de cada tipo de solicitud, pensados para SKYED Deportivo. */
export const TIPOS_META: Record<
  TipoPqr,
  { icono: string; nombre: string; descripcion: string; plazo: string }
> = {
  peticion: {
    icono: 'ti-file-text',
    nombre: 'Petición',
    descripcion: 'Pide información, un documento o una aclaración sobre tu inscripción, pago o kit.',
    plazo: '3 días hábiles',
  },
  queja: {
    icono: 'ti-alert-triangle',
    nombre: 'Queja',
    descripcion: 'Inconformidad con la atención o con la organización de un evento.',
    plazo: '5 días hábiles',
  },
  reclamo: {
    icono: 'ti-flag-3',
    nombre: 'Reclamo',
    descripcion: 'Algo no salió como se acordó (cobro, kit, cupo) y necesitas una solución.',
    plazo: '5 días hábiles',
  },
  sugerencia: {
    icono: 'ti-bulb',
    nombre: 'Sugerencia',
    descripcion: 'Una idea para mejorar las rutas, los eventos o nuestros servicios.',
    plazo: 'acuse de recibo en 2 días hábiles',
  },
  felicitacion: {
    icono: 'ti-heart',
    nombre: 'Felicitación',
    descripcion: 'Reconoce al equipo o a un evento que superó tus expectativas.',
    plazo: '¡siempre bien recibida!',
  },
};

/** Temas frecuentes: rellenan el asunto para que escribir sea más rápido. */
export const TEMAS_PQR: { id: string; label: string; icono: string; asunto: string }[] = [
  { id: 'inscripcion', label: 'Mi inscripción', icono: 'ti-clipboard-check', asunto: 'Problema con mi inscripción' },
  { id: 'pago', label: 'Pagos', icono: 'ti-credit-card', asunto: 'Consulta sobre mi pago' },
  { id: 'kit', label: 'Kit de competencia', icono: 'ti-package', asunto: 'Consulta sobre la entrega de mi kit' },
  { id: 'acceso', label: 'Acceso y QR', icono: 'ti-qrcode', asunto: 'Problema con mi código QR de acceso' },
  { id: 'resultados', label: 'Resultados', icono: 'ti-trophy', asunto: 'Duda sobre mi resultado' },
  { id: 'evento', label: 'Organización', icono: 'ti-calendar-event', asunto: 'Comentario sobre la organización del evento' },
];