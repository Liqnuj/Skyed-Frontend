import SkyFooter, { type DatosFooter } from '../shared/SkyFooter';

const DATOS: DatosFooter = {
  modulo: 'social',
  logo: '/assets/social/logo_social.png',
  descripcion: 'La plataforma profesional para eventos sociales en Boyacá.',
  enlaces: [
    { texto: 'Inicio', a: '/social' },
    { texto: 'Eventos', a: '/social/eventos' },
    { texto: 'Lugares', a: '/social/lugares' },
    { texto: 'Nosotros', a: '/social/nosotros' },
  ],
  ayuda: [{ texto: 'Enviar una PQRS', a: '/social/pqr' }],
  correo: 'skyedsocial@gmail.com',
  telefono: '+57 317 703 7517',
  ubicacion: 'Sogamoso, Boyacá',
  redes: [
    { nombre: 'Facebook', icono: 'ti-brand-facebook', url: 'https://www.facebook.com/?locale=es_LA' },
    { nombre: 'Instagram', icono: 'ti-brand-instagram', url: 'https://www.instagram.com/?hl=es' },
    { nombre: 'X', icono: 'ti-brand-x', url: 'https://twitter.com/?lang=es' },
    { nombre: 'WhatsApp', icono: 'ti-brand-whatsapp', url: 'https://api.whatsapp.com/send?phone=573177037517' },
  ],
};

export default function SocialFooter() {
  return <SkyFooter datos={DATOS} />;
}
