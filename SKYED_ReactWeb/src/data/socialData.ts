export type SocialEvent = {
  id: number;
  cat: 'bodas' | 'quinceaneras' | 'cumpleanios' | 'corporativos' | 'baby';
  title: string;
  emoji: string;
  image: string;
  guests: number;
  hours: number;
  price: string;
  tag: string;
  desc: string;
  includes: string[];
};

export const socialEvents: SocialEvent[] = [
  { id: 1, cat: 'bodas', title: 'Boda en jardín', emoji: '💐', image: '/assets/social/boda_jardin.png', guests: 120, hours: 8, price: '$18.500.000', tag: 'BODA', desc: 'Ceremonia al aire libre con arco floral, banquete de 5 tiempos y pista de baile iluminada.', includes: ['Arco floral natural', 'Banquete 5 tiempos', 'DJ toda la noche', 'Fotografía profesional', 'Decoración mesas', 'Iluminación ambiental', 'Coordinador en sitio', 'Pastel nupcial'] },
  { id: 2, cat: 'bodas', title: 'Boda de salón', emoji: '🕊️', image: '/assets/social/boda_salon.png', guests: 200, hours: 10, price: '$22.000.000', tag: 'BODA', desc: 'Salón premium con chandeliers de cristal, decoración floral elaborada y catering de autor.', includes: ['Salón premium', 'Chandeliers de cristal', 'Catering de autor', 'Orquesta en vivo', 'Video 4K', 'Fotos y álbum', 'Fuegos de pista', 'Open bar premium'] },
  { id: 3, cat: 'quinceaneras', title: 'XV años de gala', emoji: '👑', image: '/assets/social/xv_gala.png', guests: 150, hours: 8, price: '$14.500.000', tag: 'QUINCEAÑERA', desc: 'Vals coreografiado, decoración temática de ensueño, fotografía y video profesional.', includes: ['Vals coreografiado', 'Decoración temática', 'Foto y video', 'DJ profesional', 'Mesa de dulces', 'Corona y cetro', 'Trono decorado', 'Show de luces'] },
  { id: 4, cat: 'quinceaneras', title: 'XV Princesa encantada', emoji: '🌟', image: '/assets/social/xv_princesa.png', guests: 100, hours: 6, price: '$11.200.000', tag: 'QUINCEAÑERA', desc: 'Tema de cuento de hadas con carruaje, decoración etérea y experiencia mágica de principio a fin.', includes: ['Carruaje decorativo', 'Decoración etérea', 'DJ y música', 'Mesa de fotos', 'Animación personalizada', 'Recordatorios', 'Torta temática', 'Orquestación completa'] },
  { id: 5, cat: 'cumpleanios', title: 'Cumpleaños temático', emoji: '🎂', image: '/assets/social/cumpleaños.png', guests: 80, hours: 5, price: '$6.800.000', tag: 'CUMPLEAÑOS', desc: 'Decoración a medida, animación temática, catering y mesa de postres de ensueño.', includes: ['Decoración temática', 'Mesa de postres', 'Catering completo', 'Animador profesional', 'Juegos y actividades', 'DJ o playlist', 'Torta personalizada', 'Recordatorios'] },
  { id: 6, cat: 'corporativos', title: 'Evento corporativo', emoji: '🏢', image: '/assets/social/evento_corporativo.png', guests: 200, hours: 6, price: '$16.000.000', tag: 'CORPORATIVO', desc: 'Lanzamientos de producto, convenciones y cenas de gala con producción audiovisual completa.', includes: ['Producción audiovisual', 'Pantallas y sonido', 'Catering ejecutivo', 'Ambientación corporativa', 'Fotografía del evento', 'Streaming en vivo', 'Coordinación total', 'Soporte técnico'] },
  { id: 7, cat: 'baby', title: 'Baby shower de lujo', emoji: '🍼', image: '/assets/social/baby_shower.png', guests: 60, hours: 4, price: '$5.200.000', tag: 'BABY SHOWER', desc: 'Celebración íntima con decoración pastel, actividades especiales y mesa de dulces elaborada.', includes: ['Decoración pastel', 'Mesa de dulces', 'Juegos temáticos', 'Catering ligero', 'Souvenirs para invitadas', 'Torta de revelación', 'Sesión fotográfica', 'Música ambiental'] },
  { id: 8, cat: 'bodas', title: 'Boda de destino', emoji: '🌺', image: '/assets/social/boda_destino.png', guests: 80, hours: 12, price: '$32.000.000', tag: 'BODA', desc: 'Tu boda ideal en haciendas, playas o montañas de Colombia. Logística completa de principio a fin.', includes: ['Venue exclusivo', 'Alojamiento coordinado', 'Ceremonia y recepción', 'Catering gourmet', 'Fotografía y video', 'Transporte invitados', 'Experiencias locales', 'Coordinación total'] },
  { id: 9, cat: 'cumpleanios', title: 'Fiesta de grado', emoji: '🎓', image: '/assets/social/prom.png', guests: 120, hours: 6, price: '$9.400.000', tag: 'CUMPLEAÑOS', desc: 'Celebración de logros académicos con ambiente de gala, música en vivo y producción de primer nivel.', includes: ['Decoración universitaria', 'DJ profesional', 'Catering completo', 'Barra de bebidas', 'Zona de fotos', 'Animación', 'Torta personalizada', 'Video del evento'] },
];

export type SocialTestimonial = {
  name: string;
  initials: string;
  role: string;
  event: string;
  text: string;
  stars: number;
  featured: boolean;
};

export const socialTestimonials: SocialTestimonial[] = [
  { name: 'María R.', initials: 'MR', role: 'Boda · Bogotá', event: 'Boda en jardín', text: 'Hicieron de mi boda el día más mágico de mi vida. Cada detalle estuvo cuidado al máximo — desde las flores hasta el último segundo de la noche. No podría haber elegido mejor equipo.', stars: 5, featured: true },
  { name: 'Valentina S.', initials: 'VS', role: 'Quinceañera · Medellín', event: 'XV años de gala', text: 'Mis XV fueron un sueño. La coreografía, las luces, la comida... todo perfecto. Mis amigas siguen hablando de esa noche. SkyedSocial superó todo lo que imaginé.', stars: 5, featured: false },
  { name: 'Jorge L.', initials: 'JL', role: 'Cumpleaños · Cali', event: 'Cumpleaños 50', text: 'Organizaron el cumpleaños 50 de mi esposa y nos sorprendieron con cada detalle. El salón quedó espectacular y los invitados quedaron impresionados con la producción.', stars: 5, featured: false },
  { name: 'Carolina M.', initials: 'CM', role: 'Corporativo · Bogotá', event: 'Lanzamiento de producto', text: 'El evento de lanzamiento fue impecable. Producción audiovisual de primer nivel, catering delicioso y coordinación perfecta. Definitivamente los contrataré para el próximo año.', stars: 5, featured: false },
  { name: 'Andrés P.', initials: 'AP', role: 'Boda · Cartagena', event: 'Boda de destino', text: 'Nuestra boda en Cartagena fue exactamente lo que soñamos. Logística sin contratiempos, decoración increíble y un equipo que hizo que todo fluyera. Eternamente agradecidos.', stars: 5, featured: true },
  { name: 'Isabella T.', initials: 'IT', role: 'Baby shower · Bogotá', event: 'Baby shower', text: 'Mi baby shower estuvo hermoso. La decoración fue delicada y elegante, los juegos divirtieron a todas las invitadas y la mesa de dulces era simplemente preciosa.', stars: 5, featured: false },
];

export type SocialVenue = {
  name: string;
  location: string;
  capacity: string;
  emoji: string;
  image: string;
  tags: string[];
  price: string;
  per: string;
};

export const socialVenues: SocialVenue[] = [
  { name: 'Hacienda El Paraíso', location: 'Vía Choachí, Cundinamarca', capacity: 'hasta 300', emoji: '🏡', image: '/assets/social/hacienda_paraiso.png', tags: ['Jardines', 'Piscina', 'Cabaña'], price: '$4.500.000', per: 'arriendo / noche' },
  { name: 'Salón Cenit', location: 'Chapinero Alto, Bogotá', capacity: 'hasta 250', emoji: '✨', image: '/assets/social/salon_cenit.png', tags: ['Vista 360°', 'Terraza', 'AV incluido'], price: '$3.200.000', per: 'arriendo / evento' },
  { name: 'Club de Jardines Rosaleda', location: 'La Calera, Cundinamarca', capacity: 'hasta 180', emoji: '🌿', image: '/assets/social/jardines.png', tags: ['Jardines', 'Íntimo', 'Exclusivo'], price: '$2.800.000', per: 'arriendo / evento' },
  { name: 'Gran Salón Imperial', location: 'Usaquén, Bogotá', capacity: 'hasta 400', emoji: '🏛️', image: '/assets/social/salon_imperial.png', tags: ['Chandeliers', 'Catering propio', 'Parking'], price: '$5.800.000', per: 'arriendo / evento' },
  { name: 'Finca La Esperanza', location: 'Sopó, Cundinamarca', capacity: 'hasta 150', emoji: '🌄', image: '/assets/social/finca_esperanza.png', tags: ['Montaña', 'Aire libre', 'Alojamiento'], price: '$2.200.000', per: 'arriendo / evento' },
  { name: 'Terraza Sky Garden', location: 'Zona Rosa, Bogotá', capacity: 'hasta 120', emoji: '🌆', image: '/assets/social/sky_garden.png', tags: ['Rooftop', 'Vista ciudad', 'DJ booth'], price: '$3.500.000', per: 'arriendo / evento' },
];

export type SocialGalleryItem = { emoji: string; image: string; title: string; sub: string };

export const socialGallery: SocialGalleryItem[] = [
  { emoji: '💐', image: '/assets/social/boda_cesped.png', title: 'Boda en jardín', sub: '150 invitados' },
  { emoji: '👑', image: '/assets/social/xv_dorados.png', title: 'XV años dorados', sub: '200 invitados' },
  { emoji: '🎂', image: '/assets/social/cumple_30.png', title: 'Cumpleaños 30', sub: '80 invitados' },
  { emoji: '🏢', image: '/assets/social/gala_coorporativa.png', title: 'Gala corporativa', sub: '300 invitados' },
  { emoji: '🍼', image: '/assets/social/baby.png', title: 'Baby shower', sub: '60 invitados' },
  { emoji: '🌺', image: '/assets/social/boda_playa.png', title: 'Boda de destino', sub: '90 invitados' },
  { emoji: '💐', image: '/assets/social/salon.png', title: 'Boda de salón', sub: '200 invitados' },
  { emoji: '🎓', image: '/assets/social/fiesta_grado.png', title: 'Fiesta de grado', sub: '120 invitados' },
];

export const heroSlides = [
  { image: '/assets/social/img_1.png', alt: 'Imagen principal' },
  { image: '/assets/social/img_boda.png', alt: 'Boda' },
  { image: '/assets/social/img_quince.png', alt: 'Quince' },
  { image: '/assets/social/img_coorporativo.png', alt: 'Empresarial' },
];
