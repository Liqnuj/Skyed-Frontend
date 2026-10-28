import SkyFooter, { type DatosFooter } from '../shared/SkyFooter';

const DATOS: DatosFooter = {
  modulo: 'deportivo',
  logo: '/assets/deportivo/logo_deportivo.png',
  descripcion: 'La plataforma profesional para eventos de ciclismo en Boyacá.',
  enlaces: [
    { texto: 'Inicio', a: '/deportivo' },
    { texto: 'Eventos', a: '/deportivo/eventos' },
    { texto: 'Nosotros', a: '/deportivo/nosotros' },
  ],
  correo: 'skyeddeportivo@gmail.com',
  telefono: '+57 313 201 3573',
  ubicacion: 'Sogamoso, Boyacá',
  redes: [
    { nombre: 'Facebook', icono: 'ti-brand-facebook', url: 'https://www.facebook.com/?locale=es_LA' },
    { nombre: 'Instagram', icono: 'ti-brand-instagram', url: 'https://www.instagram.com/?hl=es' },
    { nombre: 'X', icono: 'ti-brand-x', url: 'https://twitter.com/?lang=es' },
  ],
};

export default function SportFooter() {
  return <SkyFooter datos={DATOS} />;
}
