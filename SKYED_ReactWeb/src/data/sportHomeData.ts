export type SportHomeEvent = {
  id: number;
  title: string;
  image: string;
  badge: string;
  badgeColor?: string;
  meta: string;
  desc: string;
  price: string;
};

export const sportHomeEvents: SportHomeEvent[] = [
  { id: 1, title: 'Gran Fondo de Los Andes', image: '/assets/deportivo/event1.jpg', badge: 'Ruta', meta: '📅 15 Jun · 📍 Bogotá', desc: '120 km de alta montaña con vistas espectaculares.', price: '$75.000' },
  { id: 2, title: 'Copa Nacional MTB', image: '/assets/deportivo/event2.jpg', badge: 'MTB', badgeColor: '#16a34a', meta: '📅 22 Jul · 📍 Manizales', desc: 'Descenso técnico y rápido en pista cerrada.', price: '$90.000' },
  { id: 3, title: 'Gravel Adventure Boyacá', image: '/assets/deportivo/event4.jpg', badge: 'Gravel', badgeColor: '#ca8a04', meta: '📅 02 Sep · 📍 Tunja', desc: '85 km en gravilla cruzando paisajes andinos.', price: '$65.000' },
];

export const sportHeroSlides = [
  '/assets/deportivo/hero1.jpg',
  '/assets/deportivo/hero2.jpg',
  '/assets/deportivo/hero3.jpg',
];
