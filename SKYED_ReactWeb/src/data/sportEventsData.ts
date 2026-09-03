export type SportEvent = {
  id: number;
  title: string;
  category: string;
  categoryLabel: string;
  image: string;
  date: string;
  location: string;
  description: string;
  distance: string;
  elevation: string;
  capacity: string;
  price: number;
};

export const sportEvents: SportEvent[] = [
  { id: 1, title: 'Gran Fondo de Los Andes', category: 'ruta', categoryLabel: 'Ruta', image: '/assets/deportivo/event1.jpg', date: '15 Jun 2026', location: 'Bogotá, Colombia', description: 'Recorrido de alta montaña con vistas espectaculares para ciclistas de élite y aficionados.', distance: '120 km', elevation: '2 800 m', capacity: '500', price: 75000 },
  { id: 2, title: 'Copa Nacional MTB Downhill', category: 'mtb', categoryLabel: 'MTB', image: '/assets/deportivo/event2.jpg', date: '22 Jul 2026', location: 'Manizales, Colombia', description: 'Descenso técnico y rápido en pista cerrada. Solo aptos para riders avanzados.', distance: '4 km', elevation: '-650 m', capacity: '120', price: 90000 },
  { id: 3, title: 'Velódromo Open Pista', category: 'pista', categoryLabel: 'Pista', image: '/assets/deportivo/event3.jpg', date: '10 Ago 2026', location: 'Cali, Colombia', description: 'Competencia de pista en velódromo cubierto: scratch, persecución y keirin.', distance: '250 m/vuelta', elevation: '—', capacity: '80', price: 60000 },
  { id: 4, title: 'Gravel Adventure Boyacá', category: 'gravel', categoryLabel: 'Gravel', image: '/assets/deportivo/event4.jpg', date: '02 Sep 2026', location: 'Tunja, Boyacá', description: 'Aventura en gravilla cruzando paisajes andinos. Apta para todos los niveles.', distance: '85 km', elevation: '1 500 m', capacity: '300', price: 65000 },
  { id: 5, title: 'BMX Race Championship', category: 'bmx', categoryLabel: 'BMX', image: '/assets/deportivo/event5.jpg', date: '20 Sep 2026', location: 'Medellín, Colombia', description: 'Adrenalina pura en pista BMX con saltos y peraltes para todas las categorías.', distance: '400 m', elevation: '—', capacity: '200', price: 55000 },
  { id: 6, title: 'Ruta Solidaria Costa Caribe', category: 'ruta', categoryLabel: 'Ruta', image: '/assets/deportivo/event6.jpg', date: '15 Oct 2026', location: 'Cartagena, Colombia', description: 'Pedaleada benéfica al lado del mar. Lo recaudado apoya a fundaciones locales.', distance: '60 km', elevation: '350 m', capacity: '1000', price: 45000 },
];

export const eventFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'ruta', label: 'Ruta' },
  { value: 'mtb', label: 'MTB' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'pista', label: 'Pista' },
  { value: 'bmx', label: 'BMX' },
];