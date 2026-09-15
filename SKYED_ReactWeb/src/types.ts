export type EventKind = 'deportivo' | 'social';

export interface SportEvent {
  id: number;
  title: string;
  category: string;
  date: string;
  location: string;
  price: number;
  image: string;
  description: string;
  capacity: number;
}

export interface SocialEvent {
  id: number;
  title: string;
  category: string;
  image: string;
  location: string;
  description: string;
  price: string;
  guests: number;
  hours: number;
  tag: string;
  includes: string[];
}

export interface Venue {
  id: number;
  name: string;
  city: string;
  capacity: string;
  image: string;
  type: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'participante' | 'admin';
  roles: ('adminSocial' | 'adminDeportivo'| 'participante'| 'cliente')[]; 
  telefono?: string;
  ciudad?: string;
}