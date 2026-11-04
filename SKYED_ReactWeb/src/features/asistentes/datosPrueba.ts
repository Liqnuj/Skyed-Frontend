import type { Asistente, Modulo } from '../../types/permisos';

/** Semilla local para ver la sección antes de que exista GET /asistentes. */
export function asistentesDePrueba(modulo: Modulo): Asistente[] {
  if (modulo === 'social') {
    return [
      {
        id: -1,
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: 'ana.asistente@skyed.test',
        telefono: '3001112233',
        foto_url: null,
        activo: true,
        modulo: 'social',
        permisos: { eventos: 'editar', reservas: 'ver', pqr: 'editar' },
      },
      {
        id: -2,
        nombre: 'Luis',
        apellido: 'Gómez',
        correo: 'luis.asistente@skyed.test',
        telefono: '3104445566',
        foto_url: null,
        activo: false,
        modulo: 'social',
        permisos: { usuarios: 'ver', lugares: 'eliminar' },
      },
      {
        id: -3,
        nombre: 'Marta',
        apellido: 'Díaz',
        correo: 'marta.asistente@skyed.test',
        telefono: '3207778899',
        foto_url: null,
        activo: true,
        modulo: 'social',
        permisos: { inicio: 'ver', servicios: 'editar' },
      },
    ];
  }

  return [
    {
      id: -1,
      nombre: 'Camila',
      apellido: 'Rojas',
      correo: 'camila.asistente@skyed.test',
      telefono: '3012223344',
      foto_url: null,
      activo: true,
      modulo: 'deportivo',
      permisos: { eventos: 'editar', inscripciones: 'ver', acceso: 'editar' },
    },
    {
      id: -2,
      nombre: 'Diego',
      apellido: 'Soto',
      correo: 'diego.asistente@skyed.test',
      telefono: '3155556677',
      foto_url: null,
      activo: false,
      modulo: 'deportivo',
      permisos: { resultados: 'eliminar', kits: 'ver' },
    },
    {
      id: -3,
      nombre: 'Elena',
      apellido: 'Vargas',
      correo: 'elena.asistente@skyed.test',
      telefono: '3188889900',
      foto_url: null,
      activo: true,
      modulo: 'deportivo',
      permisos: { inicio: 'ver', usuarios: 'ver' },
    },
  ];
}