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
    </Protected>
  );
}

/* ------------------------------------------------------------------ */
/*  Ambientes                                                          */
/* ------------------------------------------------------------------ */


const sanitizeName = (value: string, maxLength = 50) =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLength);

const sanitizeDescription = (value: string, maxLength = 120) =>
  value.slice(0, maxLength);

const sanitizeInteger = (value: string, maxLength = 7) =>
  value.replace(/\D/g, "").slice(0, maxLength);

const sanitizeMoney = (value: string, maxLength = 12) =>
  value.replace(/\D/g, "").slice(0, maxLength);

function Badge({ value }: { value: string }) {
  return <span className={`admin-badge ${value}`}>{human(value)}</span>;
}
function AmbientesTab() {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [saving, setSaving] = useState(false);

  function cargar() {
    setLoading(true);
    ambienteService
      .listar()
      .then((res) => setAmbientes(res.data))
      .catch(() => setError('No se pudieron cargar los ambientes.'))
      .finally(() => setLoading(false));
  }

  useEffect(cargar, []);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await ambienteService.crear({
        nombre_a: nombre,
        descripcion_a: descripcion || undefined,
        capacidad_a: Number(capacidad),
        precio_referencia_a: precio ? Number(precio) : undefined,
      });

      setNombre('');
      setDescripcion('');
      setCapacidad('');
      setPrecio('');
      setShowForm(false);
      cargar();
    } catch {
      setError('No se pudo crear el ambiente. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="section-head">
        <button className="button social-btn small" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo ambiente'}
        </button>
      </div>

      {error && <p className="form-error error">{error}</p>}

      {showForm && (
        <form onSubmit={crear} className="booking-form" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacidad</label>
              <input
                type="number"
                min={1}
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Precio de referencia (COP)</label>
              <input type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </div>
          </div>
          <button className="form-submit" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear ambiente'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Capacidad</th>
                <th>Precio referencia</th>
              </tr>
            </thead>
            <tbody>
              {ambientes.map((a) => (
                <tr key={a.id_a}>
                  <td>#{a.id_a}</td>
                  <td>{a.nombre_a}</td>
                  <td>{a.capacidad_a}</td>
                  <td>{a.precio_referencia_a ?? '—'}</td>
                </tr>
              ))}
              {ambientes.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay ambientes creados todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Eventos sociales                                                    */
/* ------------------------------------------------------------------ */

function EventosTab() {
  const [eventos, setEventos] = useState<EventoSocial[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [idAmbiente, setIdAmbiente] = useState('');
  const [idTipo, setIdTipo] = useState('');
  const [saving, setSaving] = useState(false);

  function cargar() {
    setLoading(true);
    Promise.all([eventoSocialService.listar(), ambienteService.listar(), tipoEventoService.listar()])
      .then(([ev, amb, tip]) => {
        setEventos(ev.data);
        setAmbientes(amb.data);
        setTipos(tip.data);
      })
      .catch(() => setError('No se pudieron cargar los eventos sociales.'))
      .finally(() => setLoading(false));
  }

  useEffect(cargar, []);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await eventoSocialService.crear({
        nombre_er: nombre,
        descripcion_er: descripcion || undefined,
        fecha_er: fecha || undefined,
        id_a: Number(idAmbiente),
        id_tipo_eves: Number(idTipo),
      });

      setNombre('');
      setDescripcion('');
      setFecha('');
      setIdAmbiente('');
      setIdTipo('');
      setShowForm(false);
      cargar();
    } catch {
      setError('No se pudo crear el evento social. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEstado(ev: EventoSocial) {
    const nuevo = ev.estado_er === 'activo' ? 'inactivo' : 'activo';
    try {
      await eventoSocialService.cambiarEstado(ev.id_er, nuevo);
      cargar();
    } catch {
      setError('No se pudo cambiar el estado del evento.');
    }
  }

  return (
    <>
      <div className="section-head">
        <button className="button social-btn small" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo evento social'}
        </button>
      </div>

      {error && <p className="form-error error">{error}</p>}

      {showForm && (
        <form onSubmit={crear} className="booking-form" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Nombre del evento</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Ambiente</label>
              <select value={idAmbiente} onChange={(e) => setIdAmbiente(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {ambientes.map((a) => (
                  <option key={a.id_a} value={a.id_a}>
                    {a.nombre_a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Tipo de evento</label>
            <select value={idTipo} onChange={(e) => setIdTipo(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {tipos.map((t) => (
                <option key={t.id_tipo_eves} value={t.id_tipo_eves}>
                  {t.nombre_tipo_eves}
                </option>
              ))}
            </select>
          </div>
          <button className="form-submit" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear evento social'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id_er}>
                  <td>#{ev.id_er}</td>
                  <td>{ev.nombre_er}</td>
                  <td>{ev.fecha_er ?? '—'}</td>
                  <td>
                    <span className="eyebrow social">{ev.estado_er}</span>
                  </td>
                  <td>
                    <button className="button social-btn small" onClick={() => toggleEstado(ev)}>
                      {ev.estado_er === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={5}>No hay eventos sociales creados todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Reservas (solo lectura por ahora)                                   */
/* ------------------------------------------------------------------ */

function ReservasTab() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reservaService
      .misReservas()
      .then((res) => setReservas(res.data))
      .catch(() => setError('No se pudieron cargar las reservas.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p className="form-error error">{error}</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha evento</th>
            <th>Invitados</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <tr key={r.id_rese}>
              <td>#{r.id_rese}</td>
              <td>{r.fecha_evento_rese}</td>
              <td>{r.invitados_rese}</td>
              <td>
                <span className="eyebrow social">{r.estado_rese}</span>
              </td>
            </tr>
          ))}
          {reservas.length === 0 && (
            <tr>
              <td colSpan={4}>No hay reservas todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PQR (solo lectura por ahora)                                        */
/* ------------------------------------------------------------------ */

function PqrTab() {
  const [pqrs, setPqrs] = useState<Pqr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    pqrService
      .misPqr()
      .then((res) => setPqrs(res.data))
      .catch(() => setError('No se pudieron cargar las PQR.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p className="form-error error">{error}</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Asunto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pqrs.map((p) => (
            <tr key={p.id_pqr}>
              <td>#{p.id_pqr}</td>
              <td>{p.tipo_pqr}</td>
              <td>{p.asunto_pqr}</td>
              <td>
                <span className="eyebrow social">{p.estado_pqr}</span>
              </td>
            </tr>
          ))}
          {pqrs.length === 0 && (
            <tr>
              <td colSpan={4}>No hay PQR todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
