import { useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  ArrowUpRight,
  Eye,
  X,
} from 'lucide-react';

import Protected from '../../components/Protected';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityWidget from '../../components/shared/AccessibilityWidget';

import "../../styles/social/Admin.css";

type Section =
  | 'inicio'
  | 'eventos'
  | 'reservas'
  | 'usuarios'
  | 'pqr'
  | 'lugares'
  | 'servicios';

type Status =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'en_proceso'
  | 'resuelto'
  | 'activo'
  | 'inactivo';

type EventRow = {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  lugar: string;
  precio: number;
  cupos: number;
  estado: 'activo' | 'inactivo';
};

type Reservation = {
  id: number;
  cliente: string;
  evento: string;
  fecha: string;
  invitados: number;
  total: number;
  estado: 'pendiente' | 'confirmada' | 'cancelada';
};

type UserRow = {
  id: number;
  nombre: string;
  correo: string;
  rol: 'admin' | 'usuario';
  estado: 'activo' | 'inactivo';
};

type PqrRow = {
  id: number;
  tipo: 'Petición' | 'Queja' | 'Reclamo';
  asunto: string;
  cliente: string;
  fecha: string;
  estado: 'pendiente' | 'en_proceso' | 'resuelto';
  mensaje: string;
  respuesta?: string;
};

type Venue = {
  id: number;
  nombre: string;
  ubicacion: string;
  capacidad: number;
  precio: number;
  estado: 'disponible' | 'reservado' | 'revision';
};

type Service = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  estado: 'disponible' | 'no_disponible';
};

/* =========================
   DATOS DE DEMOSTRACIÓN
========================= */

const initialEvents: EventRow[] = [
  {
    id: 1,
    nombre: 'Boda Clásica Premium',
    categoria: 'Bodas',
    fecha: '2026-09-12',
    lugar: 'Hacienda El Paraíso',
    precio: 8500000,
    cupos: 120,
    estado: 'activo',
  },
  {
    id: 2,
    nombre: 'XV Años Mágicos',
    categoria: 'Quinceañera',
    fecha: '2026-09-19',
    lugar: 'Salón Cenit',
    precio: 5200000,
    cupos: 80,
    estado: 'activo',
  },
  {
    id: 3,
    nombre: 'Cumpleaños 50',
    categoria: 'Cumpleaños',
    fecha: '2026-09-24',
    lugar: 'Gran Salón Imperial',
    precio: 4200000,
    cupos: 70,
    estado: 'activo',
  },
  {
    id: 4,
    nombre: 'Gala Corporativa',
    categoria: 'Corporativo',
    fecha: '2026-10-03',
    lugar: 'Terraza Sky Garden',
    precio: 6500000,
    cupos: 200,
    estado: 'inactivo',
  },
];

const initialReservations: Reservation[] = [
  {
    id: 101,
    cliente: 'Juan Pérez',
    evento: 'Boda Clásica Premium',
    fecha: '2026-09-12',
    invitados: 80,
    total: 8500000,
    estado: 'confirmada',
  },
  {
    id: 102,
    cliente: 'María Gómez',
    evento: 'XV Años Mágicos',
    fecha: '2026-09-19',
    invitados: 60,
    total: 5200000,
    estado: 'pendiente',
  },
  {
    id: 103,
    cliente: 'Carlos Ruiz',
    evento: 'Cumpleaños 50',
    fecha: '2026-09-24',
    invitados: 45,
    total: 4200000,
    estado: 'pendiente',
  },
  {
    id: 104,
    cliente: 'Laura Torres',
    evento: 'Gala Corporativa',
    fecha: '2026-08-30',
    invitados: 150,
    total: 6500000,
    estado: 'cancelada',
  },
];

const initialUsers: UserRow[] = [
  {
    id: 1,
    nombre: 'Administrador',
    correo: 'admin@skyed.co',
    rol: 'admin',
    estado: 'activo',
  },
  {
    id: 2,
    nombre: 'Juan Pérez',
    correo: 'juan@mail.com',
    rol: 'usuario',
    estado: 'activo',
  },
  {
    id: 3,
    nombre: 'María Gómez',
    correo: 'maria@mail.com',
    rol: 'usuario',
    estado: 'activo',
  },
  {
    id: 4,
    nombre: 'Carlos Ruiz',
    correo: 'carlos@mail.com',
    rol: 'usuario',
    estado: 'inactivo',
  },
];

const initialPqr: PqrRow[] = [
  {
    id: 1,
    tipo: 'Petición',
    asunto: 'Cambio de fecha',
    cliente: 'Juan Pérez',
    fecha: '2026-08-29',
    estado: 'pendiente',
    mensaje:
      'Necesito cambiar la fecha de mi evento por un compromiso familiar.',
  },
  {
    id: 2,
    tipo: 'Queja',
    asunto: 'Atención telefónica',
    cliente: 'María Gómez',
    fecha: '2026-08-30',
    estado: 'en_proceso',
    mensaje:
      'No recibí respuesta durante el horario de atención.',
  },
  {
    id: 3,
    tipo: 'Reclamo',
    asunto: 'Servicio incompleto',
    cliente: 'Carlos Ruiz',
    fecha: '2026-08-27',
    estado: 'resuelto',
    mensaje:
      'Faltaron algunos elementos incluidos en la reserva.',
    respuesta:
      'Se verificó el caso y se gestionó una solución.',
  },
];

const initialVenues: Venue[] = [
  {
    id: 1,
    nombre: 'Hacienda El Paraíso',
    ubicacion: 'Vía Choachí, Cundinamarca',
    capacidad: 300,
    precio: 4500000,
    estado: 'disponible',
  },
  {
    id: 2,
    nombre: 'Salón Cenit',
    ubicacion: 'Chapinero Alto, Bogotá',
    capacidad: 250,
    precio: 3200000,
    estado: 'disponible',
  },
  {
    id: 3,
    nombre: 'Gran Salón Imperial',
    ubicacion: 'Usaquén, Bogotá',
    capacidad: 400,
    precio: 5800000,
    estado: 'reservado',
  },
];

const initialServices: Service[] = [
  {
    id: 1,
    nombre: 'Arcos florales naturales',
    categoria: 'Decoración',
    precio: 450000,
    estado: 'disponible',
  },
  {
    id: 2,
    nombre: 'DJ profesional',
    categoria: 'Entretenimiento',
    precio: 850000,
    estado: 'disponible',
  },
  {
    id: 3,
    nombre: 'Fotografía profesional',
    categoria: 'Fotografía',
    precio: 700000,
    estado: 'disponible',
  },
  {
    id: 4,
    nombre: 'Catering gourmet',
    categoria: 'Catering',
    precio: 1200000,
    estado: 'no_disponible',
  },
];

/* =========================
   CONFIGURACIÓN DE SECCIONES
========================= */

const sectionMeta: Record<
  Section,
  {
    label: string;
    icon: typeof LayoutDashboard;
  }
> = {
  inicio: {
    label: 'Inicio',
    icon: LayoutDashboard,
  },

  // CORREGIDO: antes estaba Confetti
  eventos: {
    label: 'Eventos',
    icon: CalendarDays,
  },

  reservas: {
    label: 'Reservas',
    icon: CalendarCheck2,
  },

  usuarios: {
    label: 'Usuarios',
    icon: Users,
  },

  pqr: {
    label: 'PQRS',
    icon: MessageSquareText,
  },

  lugares: {
    label: 'Lugares',
    icon: Building2,
  },

  servicios: {
    label: 'Servicios',
    icon: Wrench,
  },
};

/* =========================
   FUNCIONES AUXILIARES
========================= */

const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const date = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));

const humanStatus = (value: string) =>
  value
    .replace('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());

/* =========================
   COMPONENTES PEQUEÑOS
========================= */

function Badge({
  status,
}: {
  status:
    | Status
    | Venue['estado']
    | Service['estado'];
}) {
  const normalized =
    status === 'revision' ? 'en_proceso' : status;

  return (
    <span className={`admin-badge ${normalized}`}>
      {humanStatus(status)}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="admin-modal-head">
          <div>
            <h2>{title}</h2>

            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================
   PÁGINA PRINCIPAL
========================= */

function AdminPage() {
  const { user, logout } = useAuth();

  const {
    darkMode,
    toggleDark,
    fontSize,
    setFontSize,
    dyslexia,
    setDyslexia,
    accentOverride,
    setAccent,
    reset,
  } = useAccessibility();

  const [section, setSection] =
    useState<Section>('inicio');

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [reservationFilter, setReservationFilter] =
    useState('');

  const [pqrFilter, setPqrFilter] =
    useState('');

  const [modal, setModal] =
    useState<
      | 'event'
      | 'pqr'
      | 'venue'
      | 'service'
      | 'user'
      | null
    >(null);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [events, setEvents] =
    useState<EventRow[]>(initialEvents);

  const [reservations, setReservations] =
    useState<Reservation[]>(initialReservations);

  const [users, setUsers] =
    useState<UserRow[]>(initialUsers);

  const [pqrs, setPqrs] =
    useState<PqrRow[]>(initialPqr);

  const [venues, setVenues] =
    useState<Venue[]>(initialVenues);

  const [services, setServices] =
    useState<Service[]>(initialServices);

  const [toast, setToast] =
    useState<string | null>(null);

  const [calendarDate, setCalendarDate] =
    useState(new Date(2026, 8, 1));

  const [calendarMode, setCalendarMode] =
    useState<'month' | 'week'>('month');

  const [accessibilityOpen, setAccessibilityOpen] =
    useState(false);

  const accent = accentOverride ?? '#9c02ae';

  const scale = parseInt(fontSize, 10) / 16;

  const notify = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 2400);
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setMobileOpen(false);
    setSearch('');
  };

  const stats = useMemo(
    () => ({
      users: users.length,

      events: events.length,

      reservations: reservations.length,

      income: reservations
        .filter((r) => r.estado === 'confirmada')
        .reduce(
          (sum, r) => sum + r.total,
          0
        ),

      pqr: pqrs.filter(
        (p) => p.estado !== 'resuelto'
      ).length,

      confirmed: reservations.filter(
        (r) => r.estado === 'confirmada'
      ).length,
    }),
    [users, events, reservations, pqrs]
  );

  const filtered = (text: string) =>
    text
      .toLowerCase()
      .includes(search.toLowerCase());

  const visibleEvents = events.filter((e) =>
    filtered(
      `${e.nombre} ${e.categoria} ${e.lugar}`
    )
  );

  const visibleReservations =
    reservations.filter(
      (r) =>
        (!reservationFilter ||
          r.estado === reservationFilter) &&
        filtered(
          `${r.cliente} ${r.evento} ${r.estado}`
        )
    );

  const visibleUsers = users.filter((u) =>
    filtered(
      `${u.nombre} ${u.correo} ${u.rol}`
    )
  );

  const visiblePqrs = pqrs.filter(
    (p) =>
      (!pqrFilter || p.estado === pqrFilter) &&
      filtered(
        `${p.tipo} ${p.asunto} ${p.cliente} ${p.estado}`
      )
  );

  const visibleVenues = venues.filter((v) =>
    filtered(
      `${v.nombre} ${v.ubicacion}`
    )
  );

  const visibleServices = services.filter((s) =>
    filtered(
      `${s.nombre} ${s.categoria}`
    )
  );

  const openCreate = (
    kind:
      | 'event'
      | 'pqr'
      | 'venue'
      | 'service'
      | 'user'
      | null
  ) => {
    setEditingId(null);
    setModal(kind);
  };

  const openEdit = (
    kind:
      | 'event'
      | 'pqr'
      | 'venue'
      | 'service'
      | 'user'
      | null,
    id: number
  ) => {
    setEditingId(id);
    setModal(kind);
  };

  const changeReservation = (
    id: number,
    estado: Reservation['estado']
  ) => {
    setReservations((items) =>
      items.map((r) =>
        r.id === id
          ? {
              ...r,
              estado,
            }
          : r
      )
    );

    notify(
      estado === 'confirmada'
        ? 'Reserva confirmada'
        : 'Reserva actualizada'
    );
  };

  const toggleUserRole = (id: number) => {
    setUsers((items) =>
      items.map((u) =>
        u.id === id
          ? {
              ...u,
              rol:
                u.rol === 'admin'
                  ? 'usuario'
                  : 'admin',
            }
          : u
      )
    );

    notify('Rol actualizado');
  };

  const deleteItem = (
    kind: Section,
    id: number
  ) => {
    if (
      !window.confirm(
        '¿Seguro que deseas eliminar este registro?'
      )
    ) {
      return;
    }

    if (kind === 'eventos') {
      setEvents((items) =>
        items.filter((x) => x.id !== id)
      );
    }

    if (kind === 'usuarios') {
      setUsers((items) =>
        items.filter((x) => x.id !== id)
      );
    }

    if (kind === 'lugares') {
      setVenues((items) =>
        items.filter((x) => x.id !== id)
      );
    }

    if (kind === 'servicios') {
      setServices((items) =>
        items.filter((x) => x.id !== id)
      );
    }

    notify('Registro eliminado');
  };

  /* =========================
     CALENDARIO
  ========================= */

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();

    const month = calendarDate.getMonth();

    const first = new Date(
      year,
      month,
      1
    );

    const start = new Date(
      year,
      month,
      1 - first.getDay()
    );

    return Array.from(
      {
        length: 42,
      },
      (_, i) =>
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + i
        )
    );
  }, [calendarDate]);

  const eventsOnDay = (day: Date) =>
    events.filter((e) => {
      const d = new Date(
        `${e.fecha}T12:00:00`
      );

      return (
        d.toDateString() ===
        day.toDateString()
      );
    });

  if (!user || user.role !== 'admin') {
    return (
      <Navigate
        to="/social"
        replace
      />
    );
  }

  return (
    <div
      className={`social-admin ${
        darkMode ? 'dark' : ''
      } ${
        collapsed ? 'is-collapsed' : ''
      } ${
        mobileOpen ? 'mobile-open' : ''
      }`}
      style={
        {
          '--admin-accent': accent,
          '--admin-scale': scale,
        } as React.CSSProperties
      }
    >
      {/* HEADER */}

      <header className="admin-header">
        <div className="admin-header-left">
          <button
            className="icon-btn header-menu"
            onClick={() => {
              if (window.innerWidth <= 900) {
                setMobileOpen((v) => !v);
              } else {
                setCollapsed((v) => !v);
              }
            }}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>

          <Link
            to="/social"
            className="admin-brand"
          >
            <img
              src="/assets/social/logo_social.png"
              alt="SKYED"
            />

            <span>
              SKYED
              <em>SOCIAL</em>
            </span>
          </Link>
        </div>

        <div className="admin-header-right">
          <button
            className="icon-btn header-bell"
            onClick={() =>
              selectSection('reservas')
            }
            title="Reservas pendientes"
          >
            <Bell size={19} />

            <span>
              {stats.reservations -
                stats.confirmed}
            </span>
          </button>

          <span className="admin-role">
            <ShieldCheck size={14} />
            Panel Admin
          </span>

          <Link
            className="back-link"
            to="/social"
          >
            Volver al inicio
          </Link>

          <button
            className="icon-btn mobile-logout"
            onClick={() => logout()}
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* SIDEBAR */}

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">
            <ShieldCheck size={20} />
          </div>

          <div className="sidebar-brand-text">
            <strong>
              Skyed Social
            </strong>

            <span>
              ADMINISTRACIÓN
            </span>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Navegación administrativa"
        >
          <p className="nav-caption">
            GESTIÓN
          </p>

          {(Object.keys(
            sectionMeta
          ) as Section[]).map((key) => {
            const Icon =
              sectionMeta[key].icon;

            return (
              <button
                key={key}
                className={`admin-nav-item ${
                  section === key
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  selectSection(key)
                }
                title={
                  sectionMeta[key].label
                }
              >
                <Icon size={18} />

                <span>
                  {
                    sectionMeta[key]
                      .label
                  }
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-avatar">
            {user.name
              .split(' ')
              .map((x) => x[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>

          <div className="admin-user">
            <strong>
              {user.name}
            </strong>

            <span>
              {user.email}
            </span>
          </div>

          <button
            className="icon-btn logout-btn"
            onClick={() => logout()}
            title="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <span className="admin-eyebrow">
              ADMINISTRACIÓN
            </span>

            <h1>
              {sectionMeta[section].label}
            </h1>
          </div>

          <label className="admin-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar en esta sección..."
              aria-label="Buscar"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch('')
                }
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        {/* DASHBOARD */}

        {section === 'inicio' && (
          <Dashboard
            stats={stats}
            reservations={reservations}
            calendarDate={calendarDate}
            setCalendarDate={
              setCalendarDate
            }
            calendarMode={calendarMode}
            setCalendarMode={
              setCalendarMode
            }
            calendarCells={calendarCells}
            eventsOnDay={eventsOnDay}
            selectSection={
              selectSection
            }
          />
        )}

        {/* EVENTOS */}

        {section === 'eventos' && (
          <SectionTable
            title="Gestión de eventos"
            action="Nuevo evento"
            onAction={() =>
              openCreate('event')
            }
            columns={[
              'ID',
              'Evento',
              'Categoría',
              'Fecha',
              'Lugar',
              'Precio',
              'Estado',
              'Acciones',
            ]}
          >
            {visibleEvents.map((e) => (
              <tr key={e.id}>
                <td>#{e.id}</td>

                <td>
                  <strong>
                    {e.nombre}
                  </strong>
                </td>

                <td>
                  {e.categoria}
                </td>

                <td>
                  {date(e.fecha)}
                </td>

                <td>
                  {e.lugar}
                </td>

                <td>
                  {money(e.precio)}
                </td>

                <td>
                  <Badge
                    status={e.estado}
                  />
                </td>

                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() =>
                        openEdit(
                          'event',
                          e.id
                        )
                      }
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      className="icon-btn danger"
                      onClick={() =>
                        deleteItem(
                          'eventos',
                          e.id
                        )
                      }
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </SectionTable>
        )}

        {/* RESERVAS */}

        {section === 'reservas' && (
          <SectionTable
            title="Gestión de reservas"
            right={
              <select
                className="admin-select"
                value={reservationFilter}
                onChange={(e) =>
                  setReservationFilter(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Todas
                </option>

                <option value="pendiente">
                  Pendientes
                </option>

                <option value="confirmada">
                  Confirmadas
                </option>

                <option value="cancelada">
                  Canceladas
                </option>
              </select>
            }
            columns={[
              'ID',
              'Cliente',
              'Evento',
              'Fecha',
              'Invitados',
              'Total',
              'Estado',
              'Acciones',
            ]}
          >
            {visibleReservations.map(
              (r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>

                  <td>
                    <strong>
                      {r.cliente}
                    </strong>
                  </td>

                  <td>
                    {r.evento}
                  </td>

                  <td>
                    {date(r.fecha)}
                  </td>

                  <td>
                    {r.invitados}
                  </td>

                  <td>
                    {money(r.total)}
                  </td>

                  <td>
                    <Badge
                      status={r.estado}
                    />
                  </td>

                  <td>
                    <div className="row-actions">
                      {r.estado !==
                        'confirmada' && (
                        <button
                          className="action-success"
                          onClick={() =>
                            changeReservation(
                              r.id,
                              'confirmada'
                            )
                          }
                          title="Confirmar"
                        >
                          <Check
                            size={16}
                          />
                        </button>
                      )}

                      {r.estado !==
                        'cancelada' && (
                        <button
                          className="action-danger"
                          onClick={() =>
                            changeReservation(
                              r.id,
                              'cancelada'
                            )
                          }
                          title="Cancelar"
                        >
                          <X
                            size={16}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </SectionTable>
        )}

        {/* USUARIOS */}

        {section === 'usuarios' && (
          <SectionTable
            title="Usuarios registrados"
            action="Nuevo usuario"
            onAction={() =>
              openCreate('user')
            }
            columns={[
              'ID',
              'Usuario',
              'Correo',
              'Rol',
              'Estado',
              'Acciones',
            ]}
          >
            {visibleUsers.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>

                <td>
                  <div className="person-cell">
                    <span className="mini-avatar">
                      {u.nombre
                        .split(' ')
                        .map(
                          (x) => x[0]
                        )
                        .slice(0, 2)
                        .join('')}
                    </span>

                    <strong>
                      {u.nombre}
                    </strong>
                  </div>
                </td>

                <td>
                  {u.correo}
                </td>

                <td>
                  <span className="role-label">
                    {u.rol === 'admin'
                      ? 'Administrador'
                      : 'Usuario'}
                  </span>
                </td>

                <td>
                  <Badge
                    status={u.estado}
                  />
                </td>

                <td>
                  <div className="row-actions">
                    <button
                      className="table-action"
                      onClick={() =>
                        toggleUserRole(
                          u.id
                        )
                      }
                    >
                      Cambiar rol
                    </button>

                    {u.id !== user.id && (
                      <button
                        className="icon-btn danger"
                        onClick={() =>
                          deleteItem(
                            'usuarios',
                            u.id
                          )
                        }
                        title="Eliminar"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </SectionTable>
        )}

        {/* PQRS */}

        {section === 'pqr' && (
          <SectionTable
            title="Peticiones, quejas y reclamos"
            right={
              <select
                className="admin-select"
                value={pqrFilter}
                onChange={(e) =>
                  setPqrFilter(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Todos
                </option>

                <option value="pendiente">
                  Pendientes
                </option>

                <option value="en_proceso">
                  En proceso
                </option>

                <option value="resuelto">
                  Resueltos
                </option>
              </select>
            }
            columns={[
              'ID',
              'Tipo',
              'Asunto',
              'Cliente',
              'Fecha',
              'Estado',
              'Acciones',
            ]}
          >
            {visiblePqrs.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>

                <td>
                  <span className="type-pill">
                    {p.tipo}
                  </span>
                </td>

                <td>
                  <strong>
                    {p.asunto}
                  </strong>
                </td>

                <td>
                  {p.cliente}
                </td>

                <td>
                  {date(p.fecha)}
                </td>

                <td>
                  <Badge
                    status={p.estado}
                  />
                </td>

                <td>
                  <button
                    className="table-action"
                    onClick={() =>
                      openEdit(
                        'pqr',
                        p.id
                      )
                    }
                  >
                    <Eye size={15} />
                    Ver / responder
                  </button>
                </td>
              </tr>
            ))}
          </SectionTable>
        )}

        {/* LUGARES */}

        {section === 'lugares' && (
          <ResourceSection
            title="Gestión de lugares"
            description="Administra los espacios disponibles para las reservas de Skyed Social."
            action="Agregar lugar"
            onAction={() =>
              openCreate('venue')
            }
          >
            {visibleVenues.map((v) => (
              <div
                className="resource-item"
                key={v.id}
              >
                <div className="resource-icon">
                  <Building2
                    size={20}
                  />
                </div>

                <div className="resource-main">
                  <strong>
                    {v.nombre}
                  </strong>

                  <span>
                    {v.ubicacion} · Hasta{' '}
                    {v.capacidad} personas
                  </span>
                </div>

                <div className="resource-price">
                  {money(v.precio)}
                  <small>
                    referencia
                  </small>
                </div>

                <Badge
                  status={v.estado}
                />

                <div className="row-actions">
                  <button
                    className="icon-btn"
                    onClick={() =>
                      openEdit(
                        'venue',
                        v.id
                      )
                    }
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      deleteItem(
                        'lugares',
                        v.id
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </ResourceSection>
        )}

        {/* SERVICIOS */}

        {section === 'servicios' && (
          <ResourceSection
            title="Gestión de servicios"
            description="Mantén actualizado el catálogo de servicios que puede incluir cada evento."
            action="Agregar servicio"
            onAction={() =>
              openCreate('service')
            }
          >
            {visibleServices.map((s) => (
              <div
                className="resource-item"
                key={s.id}
              >
                <div className="resource-icon">
                  <Wrench size={20} />
                </div>

                <div className="resource-main">
                  <strong>
                    {s.nombre}
                  </strong>

                  <span>
                    {s.categoria}
                  </span>
                </div>

                <div className="resource-price">
                  {money(s.precio)}

                  <small>
                    referencia
                  </small>
                </div>

                <Badge
                  status={s.estado}
                />

                <div className="row-actions">
                  <button
                    className="icon-btn"
                    onClick={() =>
                      openEdit(
                        'service',
                        s.id
                      )
                    }
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      deleteItem(
                        'servicios',
                        s.id
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </ResourceSection>
        )}
      </main>

      <div className="admin-footer-note">
        SKYED SOCIAL · Panel administrativo{' '}
        <span>•</span> Gestión interna
      </div>

      <AccessibilityWidget
        open={accessibilityOpen}
        onToggleOpen={() =>
          setAccessibilityOpen(
            (v) => !v
          )
        }
        fontSize={fontSize}
        onFontSize={setFontSize}
        dyslexia={dyslexia}
        onDyslexia={setDyslexia}
        accent={accent}
        onAccent={setAccent}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onReset={reset}
      />

      {/* MODALES */}

      {modal === 'event' && (
        <EventModal
          item={events.find(
            (e) =>
              e.id === editingId
          )}
          onClose={() =>
            setModal(null)
          }
          onSave={(data) => {
            if (editingId) {
              setEvents((items) =>
                items.map((e) =>
                  e.id === editingId
                    ? {
                        ...e,
                        ...data,
                      }
                    : e
                )
              );
            } else {
              setEvents((items) => [
                ...items,
                {
                  id:
                    Math.max(
                      0,
                      ...items.map(
                        (e) => e.id
                      )
                    ) + 1,
                  ...data,
                },
              ]);
            }

            setModal(null);

            notify(
              editingId
                ? 'Evento actualizado'
                : 'Evento creado'
            );
          }}
        />
      )}

      {modal === 'venue' && (
        <VenueModal
          item={venues.find(
            (v) =>
              v.id === editingId
          )}
          onClose={() =>
            setModal(null)
          }
          onSave={(data) => {
            if (editingId) {
              setVenues((items) =>
                items.map((v) =>
                  v.id === editingId
                    ? {
                        ...v,
                        ...data,
                      }
                    : v
                )
              );
            } else {
              setVenues((items) => [
                ...items,
                {
                  id:
                    Math.max(
                      0,
                      ...items.map(
                        (v) => v.id
                      )
                    ) + 1,
                  ...data,
                },
              ]);
            }

            setModal(null);

            notify(
              editingId
                ? 'Lugar actualizado'
                : 'Lugar creado'
            );
          }}
        />
      )}

      {modal === 'service' && (
        <ServiceModal
          item={services.find(
            (s) =>
              s.id === editingId
          )}
          onClose={() =>
            setModal(null)
          }
          onSave={(data) => {
            if (editingId) {
              setServices((items) =>
                items.map((s) =>
                  s.id === editingId
                    ? {
                        ...s,
                        ...data,
                      }
                    : s
                )
              );
            } else {
              setServices((items) => [
                ...items,
                {
                  id:
                    Math.max(
                      0,
                      ...items.map(
                        (s) => s.id
                      )
                    ) + 1,
                  ...data,
                },
              ]);
            }

            setModal(null);

            notify(
              editingId
                ? 'Servicio actualizado'
                : 'Servicio creado'
            );
          }}
        />
      )}

      {modal === 'user' && (
        <UserModal
          onClose={() =>
            setModal(null)
          }
          onSave={(data) => {
            setUsers((items) => [
              ...items,
              {
                id:
                  Math.max(
                    0,
                    ...items.map(
                      (u) => u.id
                    )
                  ) + 1,
                ...data,
              },
            ]);

            setModal(null);

            notify(
              'Usuario creado'
            );
          }}
        />
      )}

      {modal === 'pqr' && (
        <PqrModal
          item={pqrs.find(
            (p) =>
              p.id === editingId
          )}
          onClose={() =>
            setModal(null)
          }
          onSave={(data) => {
            setPqrs((items) =>
              items.map((p) =>
                p.id === editingId
                  ? {
                      ...p,
                      ...data,
                    }
                  : p
              )
            );

            setModal(null);

            notify(
              'PQR actualizada'
            );
          }}
        />
      )}

      {toast && (
        <div className="admin-toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({
  stats,
  reservations,
  calendarDate,
  setCalendarDate,
  calendarMode,
  setCalendarMode,
  calendarCells,
  eventsOnDay,
  selectSection,
}: any) {
  const monthName =
    new Intl.DateTimeFormat(
      'es-CO',
      {
        month: 'long',
        year: 'numeric',
      }
    ).format(calendarDate);

  return (
    <div className="dashboard-content">
      <div className="kpi-grid">
        <Kpi
          icon={<Users size={19} />}
          label="Usuarios"
          value={stats.users}
        />

        {/* CORREGIDO: CalendarDays en lugar de Confetti */}
        <Kpi
          icon={<CalendarDays size={19} />}
          label="Eventos"
          value={stats.events}
        />

        <Kpi
          icon={
            <CalendarCheck2 size={19} />
          }
          label="Reservas"
          value={stats.reservations}
        />

        <Kpi
          icon={
            <CircleDollarSign size={19} />
          }
          label="Ingresos confirmados"
          value={money(stats.income)}
          compact
        />

        <Kpi
          icon={
            <MessageSquareText
              size={19}
            />
          }
          label="PQR abiertos"
          value={stats.pqr}
        />

        <Kpi
          icon={<Check size={19} />}
          label="Confirmadas"
          value={stats.confirmed}
        />
      </div>

      <div className="dashboard-grid-main">
        <section className="admin-card calendar-card">
          <div className="card-head calendar-head">
            <div>
              <span className="card-kicker">
                AGENDA
              </span>

              <h2>
                Calendario de eventos
              </h2>
            </div>

            <div className="calendar-actions">
              <div className="segmented">
                <button
                  className={
                    calendarMode ===
                    'month'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCalendarMode(
                      'month'
                    )
                  }
                >
                  Mes
                </button>

                <button
                  className={
                    calendarMode ===
                    'week'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCalendarMode(
                      'week'
                    )
                  }
                >
                  Semana
                </button>
              </div>

              <button
                className="small-primary"
                onClick={() =>
                  selectSection(
                    'eventos'
                  )
                }
              >
                <Plus size={15} />
                Crear evento
              </button>
            </div>
          </div>

          <div className="calendar-toolbar">
            <div className="calendar-nav">
              <button
                className="icon-btn"
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() -
                        1,
                      1
                    )
                  )
                }
              >
                <ChevronLeft
                  size={18}
                />
              </button>

              <strong>
                {monthName}
              </strong>

              <button
                className="icon-btn"
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() +
                        1,
                      1
                    )
                  )
                }
              >
                <ChevronRight
                  size={18}
                />
              </button>
            </div>

            <button
              className="today-btn"
              onClick={() =>
                setCalendarDate(
                  new Date()
                )
              }
            >
              Hoy
            </button>
          </div>

          {calendarMode === 'month' ? (
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {[
                  'Dom',
                  'Lun',
                  'Mar',
                  'Mié',
                  'Jue',
                  'Vie',
                  'Sáb',
                ].map((d) => (
                  <span key={d}>
                    {d}
                  </span>
                ))}
              </div>

              <div className="calendar-days">
                {calendarCells.map(
                  (day: Date) => {
                    const dayEvents =
                      eventsOnDay(
                        day
                      );

                    const sameMonth =
                      day.getMonth() ===
                      calendarDate.getMonth();

                    const today =
                      day.toDateString() ===
                      new Date().toDateString();

                    return (
                      <div
                        className={`calendar-day ${
                          sameMonth
                            ? ''
                            : 'muted'
                        } ${
                          today
                            ? 'today'
                            : ''
                        }`}
                        key={day.toISOString()}
                      >
                        <span className="day-number">
                          {day.getDate()}
                        </span>

                        {dayEvents
                          .slice(0, 2)
                          .map(
                            (
                              e: EventRow
                            ) => (
                              <button
                                className="calendar-event"
                                key={e.id}
                                title={
                                  e.nombre
                                }
                              >
                                {e.nombre}
                              </button>
                            )
                          )}

                        {dayEvents.length >
                          2 && (
                          <small>
                            +
                            {dayEvents.length -
                              2}{' '}
                            más
                          </small>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          ) : (
            <div className="week-placeholder">
              <Clock3 size={24} />

              <strong>
                Vista semanal
              </strong>

              <p>
                Selecciona un evento
                desde la agenda mensual
                para consultar sus
                detalles.
              </p>
            </div>
          )}

          <div className="calendar-legend">
            <span>
              <i className="dot green" />
              Realizado
            </span>

            <span>
              <i className="dot blue" />
              Pendiente
            </span>

            <span>
              <i className="dot amber" />
              En curso
            </span>

            <span className="legend-note">
              Clic en un evento para
              ver detalles
            </span>
          </div>
        </section>

        <section className="admin-card upcoming-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">
                ACTIVIDAD
              </span>

              <h2>
                Últimas reservas
              </h2>
            </div>

            <button
              className="link-button"
              onClick={() =>
                selectSection(
                  'reservas'
                )
              }
            >
              Ver todas
              <ArrowUpRight
                size={15}
              />
            </button>
          </div>

          <div className="reservation-list">
            {reservations
              .slice(0, 5)
              .map(
                (r: Reservation) => (
                  <div
                    className="reservation-item"
                    key={r.id}
                  >
                    <div className="mini-avatar">
                      {r.cliente
                        .split(' ')
                        .map(
                          (x) => x[0]
                        )
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div className="reservation-main">
                      <strong>
                        {r.cliente}
                      </strong>

                      <span>
                        {r.evento} ·{' '}
                        {date(
                          r.fecha
                        )}
                      </span>
                    </div>

                    <div className="reservation-side">
                      <strong>
                        {money(
                          r.total
                        )}
                      </strong>

                      <Badge
                        status={
                          r.estado
                        }
                      />
                    </div>
                  </div>
                )
              )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================
   KPI
========================= */

function Kpi({
  icon,
  label,
  value,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        {icon}
      </div>

      <span>{label}</span>

      <strong
        className={
          compact ? 'compact' : ''
        }
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================
   TABLAS
========================= */

function SectionTable({
  title,
  action,
  onAction,
  right,
  columns,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  right?: React.ReactNode;
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="section-view">
      <div className="section-header">
        <div>
          <span className="card-kicker">
            GESTIÓN
          </span>

          <h2>{title}</h2>
        </div>

        <div className="section-header-actions">
          {right}

          {action && (
            <button
              className="primary-btn"
              onClick={onAction}
            >
              <Plus size={16} />
              {action}
            </button>
          )}
        </div>
      </div>

      <div className="admin-card table-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map(
                  (c) => (
                    <th key={c}>
                      {c}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {children}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* =========================
   RECURSOS
========================= */

function ResourceSection({
  title,
  description,
  action,
  onAction,
  children,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="section-view">
      <div className="section-header">
        <div>
          <span className="card-kicker">
            CATÁLOGO
          </span>

          <h2>{title}</h2>

          <p>
            {description}
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={onAction}
        >
          <Plus size={16} />
          {action}
        </button>
      </div>

      <div className="admin-card resource-list">
        {children}
      </div>
    </section>
  );
}

/* =========================
   FORMULARIO
========================= */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/* =========================
   MODAL EVENTO
========================= */

function EventModal({
  item,
  onClose,
  onSave,
}: {
  item?: EventRow;
  onClose: () => void;
  onSave: (
    data: Omit<EventRow, 'id'>
  ) => void;
}) {
  const [form, setForm] =
    useState<Omit<EventRow, 'id'>>(
      item
        ? { ...item }
        : {
            nombre: '',
            categoria: 'Bodas',
            fecha: '2026-09-30',
            lugar: '',
            precio: 0,
            cupos: 50,
            estado: 'activo',
          }
    );

  const update = (
    key: keyof typeof form,
    value: string | number
  ) => {
    setForm((f) => ({
      ...f,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={
        item
          ? 'Editar evento'
          : 'Nuevo evento'
      }
      subtitle="Completa la información principal del evento."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <Field label="Nombre">
            <input
              required
              value={form.nombre}
              onChange={(e) =>
                update(
                  'nombre',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Categoría">
            <select
              value={
                form.categoria
              }
              onChange={(e) =>
                update(
                  'categoria',
                  e.target.value
                )
              }
            >
              {[
                'Bodas',
                'Quinceañera',
                'Cumpleaños',
                'Corporativo',
                'Baby Shower',
              ].map((x) => (
                <option key={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha">
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) =>
                update(
                  'fecha',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Lugar">
            <input
              required
              value={form.lugar}
              onChange={(e) =>
                update(
                  'lugar',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Precio (COP)">
            <input
              type="number"
              min="0"
              step="1000"
              value={form.precio}
              onChange={(e) =>
                update(
                  'precio',
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Field>

          <Field label="Cupos">
            <input
              type="number"
              min="1"
              value={form.cupos}
              onChange={(e) =>
                update(
                  'cupos',
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Field>

          <Field label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                update(
                  'estado',
                  e.target.value
                )
              }
            >
              <option value="activo">
                Activo
              </option>

              <option value="inactivo">
                Inactivo
              </option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          label={
            item
              ? 'Guardar cambios'
              : 'Crear evento'
          }
        />
      </form>
    </Modal>
  );
}

/* =========================
   MODAL LUGAR
========================= */

function VenueModal({
  item,
  onClose,
  onSave,
}: {
  item?: Venue;
  onClose: () => void;
  onSave: (
    data: Omit<Venue, 'id'>
  ) => void;
}) {
  const [form, setForm] =
    useState<Omit<Venue, 'id'>>(
      item
        ? { ...item }
        : {
            nombre: '',
            ubicacion: '',
            capacidad: 100,
            precio: 0,
            estado: 'disponible',
          }
    );

  const update = (
    key: keyof typeof form,
    value: string | number
  ) => {
    setForm((f) => ({
      ...f,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={
        item
          ? 'Editar lugar'
          : 'Agregar lugar'
      }
      subtitle="Este espacio estará disponible para la gestión de reservas."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <Field label="Nombre">
            <input
              required
              value={form.nombre}
              onChange={(e) =>
                update(
                  'nombre',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Ubicación">
            <input
              required
              value={
                form.ubicacion
              }
              onChange={(e) =>
                update(
                  'ubicacion',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Capacidad">
            <input
              type="number"
              min="1"
              value={
                form.capacidad
              }
              onChange={(e) =>
                update(
                  'capacidad',
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Field>

          <Field label="Precio de referencia">
            <input
              type="number"
              min="0"
              step="1000"
              value={form.precio}
              onChange={(e) =>
                update(
                  'precio',
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Field>

          <Field label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                update(
                  'estado',
                  e.target.value
                )
              }
            >
              <option value="disponible">
                Disponible
              </option>

              <option value="reservado">
                Reservado
              </option>

              <option value="revision">
                En revisión
              </option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          label={
            item
              ? 'Guardar cambios'
              : 'Agregar lugar'
          }
        />
      </form>
    </Modal>
  );
}

/* =========================
   MODAL SERVICIO
========================= */

function ServiceModal({
  item,
  onClose,
  onSave,
}: {
  item?: Service;
  onClose: () => void;
  onSave: (
    data: Omit<Service, 'id'>
  ) => void;
}) {
  const [form, setForm] =
    useState<Omit<Service, 'id'>>(
      item
        ? { ...item }
        : {
            nombre: '',
            categoria:
              'Decoración',
            precio: 0,
            estado: 'disponible',
          }
    );

  const update = (
    key: keyof typeof form,
    value: string | number
  ) => {
    setForm((f) => ({
      ...f,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={
        item
          ? 'Editar servicio'
          : 'Agregar servicio'
      }
      subtitle="Administra los servicios disponibles para los eventos."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <Field label="Servicio">
            <input
              required
              value={form.nombre}
              onChange={(e) =>
                update(
                  'nombre',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Categoría">
            <select
              value={
                form.categoria
              }
              onChange={(e) =>
                update(
                  'categoria',
                  e.target.value
                )
              }
            >
              {[
                'Decoración',
                'Catering',
                'Fotografía',
                'Entretenimiento',
                'Logística',
              ].map((x) => (
                <option key={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Precio de referencia">
            <input
              type="number"
              min="0"
              step="1000"
              value={form.precio}
              onChange={(e) =>
                update(
                  'precio',
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Field>

          <Field label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                update(
                  'estado',
                  e.target.value
                )
              }
            >
              <option value="disponible">
                Disponible
              </option>

              <option value="no_disponible">
                No disponible
              </option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          label={
            item
              ? 'Guardar cambios'
              : 'Agregar servicio'
          }
        />
      </form>
    </Modal>
  );
}

/* =========================
   MODAL USUARIO
========================= */

function UserModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (
    data: Omit<UserRow, 'id'>
  ) => void;
}) {
  const [form, setForm] =
    useState<Omit<UserRow, 'id'>>({
      nombre: '',
      correo: '',
      rol: 'usuario',
      estado: 'activo',
    });

  return (
    <Modal
      title="Nuevo usuario"
      subtitle="Crea un registro administrativo de prueba."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <Field label="Nombre">
            <input
              required
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  nombre:
                    e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Correo">
            <input
              type="email"
              required
              value={form.correo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  correo:
                    e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Rol">
            <select
              value={form.rol}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  rol:
                    e.target.value as UserRow['rol'],
                }))
              }
            >
              <option value="usuario">
                Usuario
              </option>

              <option value="admin">
                Administrador
              </option>
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  estado:
                    e.target.value as UserRow['estado'],
                }))
              }
            >
              <option value="activo">
                Activo
              </option>

              <option value="inactivo">
                Inactivo
              </option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          label="Crear usuario"
        />
      </form>
    </Modal>
  );
}

/* =========================
   MODAL PQRS
========================= */

function PqrModal({
  item,
  onClose,
  onSave,
}: {
  item?: PqrRow;
  onClose: () => void;
  onSave: (
    data: Partial<PqrRow>
  ) => void;
}) {
  const [estado, setEstado] =
    useState<PqrRow['estado']>(
      item?.estado ??
        'pendiente'
    );

  const [respuesta, setRespuesta] =
    useState(
      item?.respuesta ?? ''
    );

  if (!item) {
    return null;
  }

  return (
    <Modal
      title={`PQR #${item.id} · ${item.tipo}`}
      subtitle={item.asunto}
      onClose={onClose}
    >
      <div className="pqr-detail">
        <div className="pqr-meta">
          <span>
            <strong>
              Cliente
            </strong>

            {item.cliente}
          </span>

          <span>
            <strong>
              Fecha
            </strong>

            {date(item.fecha)}
          </span>

          <span>
            <strong>
              Estado
            </strong>

            <Badge
              status={item.estado}
            />
          </span>
        </div>

        <div className="message-box">
          <span>
            Mensaje recibido
          </span>

          <p>
            {item.mensaje}
          </p>
        </div>

        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault();

            onSave({
              estado,
              respuesta,
            });
          }}
        >
          <Field label="Estado">
            <select
              value={estado}
              onChange={(e) =>
                setEstado(
                  e.target.value as PqrRow['estado']
                )
              }
            >
              <option value="pendiente">
                Pendiente
              </option>

              <option value="en_proceso">
                En proceso
              </option>

              <option value="resuelto">
                Resuelto
              </option>
            </select>
          </Field>

          <Field label="Respuesta">
            <textarea
              rows={5}
              value={respuesta}
              onChange={(e) =>
                setRespuesta(
                  e.target.value
                )
              }
              placeholder="Escribe la respuesta para el cliente..."
            />
          </Field>

          <ModalActions
            onClose={onClose}
            label="Guardar respuesta"
          />
        </form>
      </div>
    </Modal>
  );
}

/* =========================
   BOTONES DEL MODAL
========================= */

function ModalActions({
  onClose,
  label,
}: {
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="modal-actions">
      <button
        type="button"
        className="secondary-btn"
        onClick={onClose}
      >
        Cancelar
      </button>

      <button
        type="submit"
        className="primary-btn"
      >
        {label}
      </button>
    </div>
  );
}

/* =========================
   EXPORTACIÓN
========================= */

export default function Admin() {
  return (
    <Protected>
      <AdminPage />
    </Protected>
  );
}