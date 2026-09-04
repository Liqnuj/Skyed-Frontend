import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";

import Protected from "../../components/Protected";
import { useAuth } from "../../context/AuthContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import AccessibilityWidget from "../../components/shared/AccessibilityWidget";
import { apiFetch } from "../../services/api";
import "../../styles/social/Admin.css";

type Section =
  | "inicio"
  | "eventos"
  | "reservas"
  | "usuarios"
  | "pqr"
  | "lugares"
  | "servicios";

type Ambiente = {
  id_a: number;
  nombre_a: string;
  descripcion_a?: string | null;
  capacidad_a: number;
  precio_referencia_a?: number | string | null;
  servicios?: Array<{ id_s: number; nombre_s: string }>;
};

type Servicio = {
  id_s?: number;
  nombre_s?: string;
  descripcion_s?: string | null;
  id?: number;
  nombre?: string;
  descripcion?: string | null;
  ambientes?: Ambiente[];
};

type TipoEvento = {
  id_tipo_eves: number;
  nombre_tipo_eves: string;
};

type EventoSocial = {
  id_er: number;
  nombre_er: string;
  descripcion_er?: string | null;
  fecha_er?: string | null;
  estado_er: "activo" | "inactivo";
  id_a?: number;
  id_tipo_eves?: number;
  ambiente?: Ambiente;
  tipo_evento?: TipoEvento;
};

type Reserva = {
  id_rese: number;
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese?: number | string | null;
  ubicacion_rese?: string | null;
  Observaciones_rese?: string | null;
  total_rese?: number | string | null;
  estado_rese: "pendiente" | "confirmada" | "cancelada" | "completada";
  id_er?: number;
  usuario?: { nombre_u?: string; apellido_u?: string; correo_u?: string };
  evento_realizado?: EventoSocial;
};

type Pqr = {
  id_pqr: number;
  tipo_pqr: string;
  asunto_pqr: string;
  mensaje_pqr: string;
  estado_pqr: "abierto" | "en_proceso" | "resuelto" | "cerrado";
  respuesta_pqr?: string | null;
  creado_en_pqr?: string | null;
  id_u?: number;
  usuario?: { nombre_u?: string; apellido_u?: string; correo_u?: string };
};

type UserRow = {
  id_u: number;
  nombre_u: string;
  apellido_u?: string;
  correo_u: string;
  estado_u?: string;
};

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const human = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
};

/* ================================================================
   VALIDACIONES DEL PANEL ADMIN
================================================================ */

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

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="admin-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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

function SectionTable({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="section-view">
      <div className="section-header">
        <div>
          <span className="card-kicker">GESTIÓN</span>
          <h2>{title}</h2>
        </div>
        {action && (
          <button className="primary-btn" onClick={onAction}>
            <Plus size={16} /> {action}
          </button>
        )}
      </div>
      <div className="admin-card table-card">
        <div className="table-scroll">
          <table className="admin-table">{children}</table>
        </div>
      </div>
    </section>
  );
}

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

  const [section, setSection] = useState<Section>("inicio");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [eventos, setEventos] = useState<EventoSocial[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pqrs, setPqrs] = useState<Pqr[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);

  const [modal, setModal] = useState<
    "ambiente" | "servicio" | "evento" | "reserva" | "pqr" | null
  >(null);
  const [editing, setEditing] = useState<any>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, s, e, r, p, t] = await Promise.all([
        apiFetch("/ambientes"),
        apiFetch("/servicios"),
        apiFetch("/eventos-sociales"),
        apiFetch("/reservas"),
        apiFetch("/pqr"),
        apiFetch("/tipos-evento"),
      ]);
      setAmbientes(a.data ?? []);
      setServicios(s.data ?? []);
      setEventos(e.data ?? []);
      setReservas(r.data ?? []);
      setPqrs(p.data ?? []);
      setTipos(t.data ?? []);
      try {
        const u = await apiFetch("/users");
        setUsers(u.data ?? u.users ?? []);
      } catch {
        // El módulo social funciona aunque la API de usuarios no esté expuesta.
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const selectSection = (next: Section) => {
    setSection(next);
    setSearch("");
    setMobileOpen(false);
  };

  const filtered = (text: string) =>
    text.toLowerCase().includes(search.toLowerCase());

  const visibleAmbientes = ambientes.filter((a) =>
    filtered(`${a.nombre_a} ${a.descripcion_a ?? ""}`)
  );
  const visibleServicios = servicios.filter((s) =>
    filtered(`${s.nombre ?? s.nombre_s ?? ""} ${s.descripcion ?? s.descripcion_s ?? ""}`)
  );
  const visibleEventos = eventos.filter((e) =>
    filtered(`${e.nombre_er} ${e.descripcion_er ?? ""} ${e.estado_er}`)
  );
  const visibleReservas = reservas.filter((r) =>
    filtered(`${r.id_rese} ${r.fecha_evento_rese} ${r.estado_rese}`)
  );
  const visiblePqrs = pqrs.filter((p) =>
    filtered(`${p.tipo_pqr} ${p.asunto_pqr} ${p.estado_pqr}`)
  );

  const stats = useMemo(() => ({
    users: users.length,
    events: eventos.length,
    reservations: reservas.length,
    pending: reservas.filter((r) => r.estado_rese === "pendiente").length,
    pqrs: pqrs.filter((p) => p.estado_pqr !== "resuelto" && p.estado_pqr !== "cerrado").length,
    income: reservas
      .filter((r) => r.estado_rese === "confirmada")
      .reduce((sum, r) => sum + Number(r.total_rese || 0), 0),
  }), [users, eventos, reservas, pqrs]);

  if (!user || user.role !== "admin") return <Navigate to="/social" replace />;

  const sectionMeta: Record<Section, { label: string; icon: any }> = {
    inicio: { label: "Inicio", icon: LayoutDashboard },
    eventos: { label: "Eventos", icon: CalendarDays },
    reservas: { label: "Reservas", icon: CalendarCheck2 },
    usuarios: { label: "Usuarios", icon: Users },
    pqr: { label: "PQRS", icon: MessageSquareText },
    lugares: { label: "Lugares", icon: Building2 },
    servicios: { label: "Servicios", icon: Wrench },
  };

  const accent = accentOverride ?? "#9c02ae";
  const scale = parseInt(fontSize, 10) / 16;

  const createAmbiente = async (data: any) => {
    await apiFetch("/ambientes", { method: "POST", body: JSON.stringify(data) });
    notify("Ambiente creado correctamente");
    setModal(null);
    await loadAll();
  };

  const updateAmbiente = async (id: number, data: any) => {
    await apiFetch(`/ambientes/${id}`, { method: "PUT", body: JSON.stringify(data) });
    notify("Ambiente actualizado correctamente");
    setModal(null);
    await loadAll();
  };

  const deleteAmbiente = async (id: number) => {
    if (!window.confirm("¿Eliminar este ambiente?")) return;
    await apiFetch(`/ambientes/${id}`, { method: "DELETE" });
    notify("Ambiente eliminado");
    await loadAll();
  };

  const createServicio = async (data: any) => {
    await apiFetch("/servicios", { method: "POST", body: JSON.stringify(data) });
    notify("Servicio creado correctamente");
    setModal(null);
    await loadAll();
  };

  const updateServicio = async (id: number, data: any) => {
    await apiFetch(`/servicios/${id}`, { method: "PUT", body: JSON.stringify(data) });
    notify("Servicio actualizado correctamente");
    setModal(null);
    await loadAll();
  };

  const deleteServicio = async (id: number) => {
    if (!window.confirm("¿Eliminar este servicio?")) return;
    await apiFetch(`/servicios/${id}`, { method: "DELETE" });
    notify("Servicio eliminado");
    await loadAll();
  };

  const createEvento = async (data: any) => {
    await apiFetch("/eventos-sociales", { method: "POST", body: JSON.stringify(data) });
    notify("Evento social creado correctamente");
    setModal(null);
    await loadAll();
  };

  const updateEvento = async (id: number, data: any) => {
    await apiFetch(`/eventos-sociales/${id}`, { method: "PUT", body: JSON.stringify(data) });
    notify("Evento social actualizado");
    setModal(null);
    await loadAll();
  };

  const toggleEvento = async (e: EventoSocial) => {
    await apiFetch(`/eventos-sociales/${e.id_er}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado_er: e.estado_er === "activo" ? "inactivo" : "activo" }),
    });
    notify("Estado del evento actualizado");
    await loadAll();
  };

  const deleteEvento = async (id: number) => {
    if (!window.confirm("¿Eliminar este evento social?")) return;
    await apiFetch(`/eventos-sociales/${id}`, { method: "DELETE" });
    notify("Evento eliminado");
    await loadAll();
  };

  const updateReserva = async (id: number, estado_rese: Reserva["estado_rese"]) => {
    await apiFetch(`/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado_rese }),
    });
    notify("Reserva actualizada");
    await loadAll();
  };

  const updatePqr = async (id: number, data: any) => {
    await apiFetch(`/pqr/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    notify("PQR actualizada");
    setModal(null);
    await loadAll();
  };

  return (
    <div
      className={`social-admin ${darkMode ? "dark" : ""} ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      style={{ "--admin-accent": accent, "--admin-scale": scale } as React.CSSProperties}
    >
      <header className="admin-header">
        <div className="admin-header-left">
          <button
            className="icon-btn header-menu"
            onClick={() => window.innerWidth <= 900 ? setMobileOpen(v => !v) : setCollapsed(v => !v)}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>
          <Link to="/social" className="admin-brand">
            <img src="/assets/social/logo_social.png" alt="Skyed Social" />
            <span>Skyed Social</span>
          </Link>
        </div>
      </header>

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <strong>Skyed Social</strong>
          <span>ADMINISTRACIÓN</span>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-caption">GESTIÓN</p>
          {(Object.keys(sectionMeta) as Section[]).map(key => {
            const Icon = sectionMeta[key].icon;
            return (
              <button
                key={key}
                className={`admin-nav-item ${section === key ? "active" : ""}`}
                onClick={() => selectSection(key)}
                title={sectionMeta[key].label}
              >
                <Icon size={18} />
                <span>{sectionMeta[key].label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-avatar">
            {user.name?.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="admin-user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button className="icon-btn logout-btn" onClick={logout} title="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <span className="admin-eyebrow">ADMINISTRACIÓN</span>
            <h1>{sectionMeta[section].label}</h1>
          </div>
          <label className="admin-search">
            <Search size={17} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en esta sección..."
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Limpiar">
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        {loading && <div className="admin-card" style={{ padding: 18 }}>Cargando información…</div>}

        {section === "inicio" && (
          <section className="dashboard-content">
            <div className="kpi-grid">
              <Kpi icon={<Users size={19} />} label="Usuarios" value={stats.users} />
              <Kpi icon={<CalendarDays size={19} />} label="Eventos" value={stats.events} />
              <Kpi icon={<CalendarCheck2 size={19} />} label="Reservas" value={stats.reservations} />
              <Kpi icon={<MessageSquareText size={19} />} label="PQR pendientes" value={stats.pqrs} />
              <Kpi icon={<Check size={19} />} label="Reservas pendientes" value={stats.pending} />
              <Kpi icon={<Wrench size={19} />} label="Ingresos confirmados" value={money(stats.income)} compact />
            </div>

            <div className="dashboard-grid-main">
              <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">ACTIVIDAD</span>
                    <h2>Últimas reservas</h2>
                  </div>
                  <button className="link-button" onClick={() => selectSection("reservas")}>Ver todas →</button>
                </div>
                <div className="reservation-list">
                  {reservas.slice(0, 5).map(r => (
                    <div className="reservation-item" key={r.id_rese}>
                      <div className="mini-avatar">R{r.id_rese}</div>
                      <div className="reservation-main">
                        <strong>Reserva #{r.id_rese}</strong>
                        <span>{formatDate(r.fecha_evento_rese)} · {r.invitados_rese} invitados</span>
                      </div>
                      <div className="reservation-side">
                        <strong>{money(r.total_rese)}</strong>
                        <Badge value={r.estado_rese} />
                      </div>
                    </div>
                  ))}
                  {!reservas.length && <p>No hay reservas todavía.</p>}
                </div>
              </section>

              <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">CATÁLOGO</span>
                    <h2>Resumen</h2>
                  </div>
                </div>
                <div className="resource-list">
                  <div className="resource-item">
                    <div className="resource-icon"><Building2 size={18} /></div>
                    <div className="resource-main"><strong>Ambientes</strong><span>{ambientes.length} registrados</span></div>
                  </div>
                  <div className="resource-item">
                    <div className="resource-icon"><Wrench size={18} /></div>
                    <div className="resource-main"><strong>Servicios</strong><span>{servicios.length} registrados</span></div>
                  </div>
                  <div className="resource-item">
                    <div className="resource-icon"><CalendarDays size={18} /></div>
                    <div className="resource-main"><strong>Eventos sociales</strong><span>{eventos.filter(e => e.estado_er === "activo").length} activos</span></div>
                  </div>
                </div>
              </section>
            </div>
          </section>
        )}

        {section === "lugares" && (
          <SectionTable title="Gestión de ambientes" action="Nuevo ambiente" onAction={() => { setEditing(null); setModal("ambiente"); }}>
            <thead><tr><th>ID</th><th>Nombre</th><th>Capacidad</th><th>Precio referencia</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleAmbientes.map(a => (
                <tr key={a.id_a}>
                  <td>#{a.id_a}</td><td><strong>{a.nombre_a}</strong></td><td>{a.capacidad_a}</td>
                  <td>{money(a.precio_referencia_a)}</td>
                  <td><div className="row-actions">
                    <button className="table-action" onClick={() => { setEditing(a); setModal("ambiente"); }}><Pencil size={15} /></button>
                    <button className="table-action danger" onClick={() => deleteAmbiente(a.id_a)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleAmbientes.length && <tr><td colSpan={5}>No hay ambientes.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "servicios" && (
          <SectionTable title="Gestión de servicios" action="Nuevo servicio" onAction={() => { setEditing(null); setModal("servicio"); }}>
            <thead><tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Ambientes</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleServicios.map(s => {
                const id = s.id_s ?? s.id!;
                return <tr key={id}>
                  <td>#{id}</td>
                  <td><strong>{s.nombre ?? s.nombre_s}</strong></td>
                  <td>{s.descripcion ?? s.descripcion_s ?? "—"}</td>
                  <td>{s.ambientes?.length ?? 0}</td>
                  <td><div className="row-actions">
                    <button className="table-action" onClick={() => { setEditing(s); setModal("servicio"); }}><Pencil size={15} /></button>
                    <button className="table-action danger" onClick={() => deleteServicio(id)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>;
              })}
              {!visibleServicios.length && <tr><td colSpan={5}>No hay servicios.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "eventos" && (
          <SectionTable title="Gestión de eventos sociales" action="Nuevo evento" onAction={() => { setEditing(null); setModal("evento"); }}>
            <thead><tr><th>ID</th><th>Nombre</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleEventos.map(e => (
                <tr key={e.id_er}>
                  <td>#{e.id_er}</td><td><strong>{e.nombre_er}</strong></td><td>{formatDate(e.fecha_er)}</td>
                  <td><Badge value={e.estado_er} /></td>
                  <td><div className="row-actions">
                    <button className="table-action" onClick={() => { setEditing(e); setModal("evento"); }}><Pencil size={15} /></button>
                    <button className="table-action" onClick={() => toggleEvento(e)}>{e.estado_er === "activo" ? "Desactivar" : "Activar"}</button>
                    <button className="table-action danger" onClick={() => deleteEvento(e.id_er)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleEventos.length && <tr><td colSpan={5}>No hay eventos sociales.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "reservas" && (
          <SectionTable title="Gestión de reservas">
            <thead><tr><th>ID</th><th>Fecha</th><th>Invitados</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {visibleReservas.map(r => (
                <tr key={r.id_rese}>
                  <td>#{r.id_rese}</td><td>{formatDate(r.fecha_evento_rese)}</td><td>{r.invitados_rese}</td>
                  <td>{money(r.total_rese)}</td>
                  <td>
                    <select className="admin-select" value={r.estado_rese} onChange={e => updateReserva(r.id_rese, e.target.value as Reserva["estado_rese"])}>
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="completada">Completada</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!visibleReservas.length && <tr><td colSpan={5}>No hay reservas.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "pqr" && (
          <SectionTable title="Gestión de PQRS">
            <thead><tr><th>ID</th><th>Tipo</th><th>Asunto</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visiblePqrs.map(p => (
                <tr key={p.id_pqr}>
                  <td>#{p.id_pqr}</td><td>{human(p.tipo_pqr)}</td><td>{p.asunto_pqr}</td>
                  <td><Badge value={p.estado_pqr} /></td>
                  <td><button className="table-action" onClick={() => { setEditing(p); setModal("pqr"); }}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {!visiblePqrs.length && <tr><td colSpan={5}>No hay PQRS.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "usuarios" && (
          <SectionTable title="Usuarios registrados">
            <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Estado</th></tr></thead>
            <tbody>
              {users.filter(u => filtered(`${u.nombre_u} ${u.apellido_u ?? ""} ${u.correo_u}`)).map(u => (
                <tr key={u.id_u}>
                  <td>#{u.id_u}</td><td>{u.nombre_u} {u.apellido_u ?? ""}</td><td>{u.correo_u}</td>
                  <td><Badge value={u.estado_u ?? "activo"} /></td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={4}>La API de usuarios no devolvió registros.</td></tr>}
            </tbody>
          </SectionTable>
        )}
      </main>

      <div className="admin-footer-note">SKYED SOCIAL · Panel administrativo <span>•</span> Gestión interna</div>

      <AccessibilityWidget
        open={false}
        onToggleOpen={() => {}}
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

      {modal === "ambiente" && (
        <AmbienteModal
          item={editing}
          onClose={() => setModal(null)}
          onSave={editing ? data => updateAmbiente(editing.id_a, data) : createAmbiente}
        />
      )}

      {modal === "servicio" && (
        <ServicioModal
          item={editing}
          onClose={() => setModal(null)}
          onSave={editing
            ? data => updateServicio(editing.id_s ?? editing.id, data)
            : createServicio}
        />
      )}

      {modal === "evento" && (
        <EventoModal
          item={editing}
          ambientes={ambientes}
          tipos={tipos}
          onClose={() => setModal(null)}
          onSave={editing ? data => updateEvento(editing.id_er, data) : createEvento}
        />
      )}

      {modal === "pqr" && editing && (
        <PqrModal item={editing} onClose={() => setModal(null)} onSave={data => updatePqr(editing.id_pqr, data)} />
      )}

      {toast && <div className="admin-toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function Kpi({ icon, label, value, compact }: { icon: React.ReactNode; label: string; value: React.ReactNode; compact?: boolean }) {
  return <div className="kpi-card"><div className="kpi-icon">{icon}</div><span>{label}</span><strong className={compact ? "compact" : ""}>{value}</strong></div>;
}

function AmbienteModal({ item, onClose, onSave }: { item?: Ambiente; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    nombre_a: item?.nombre_a ?? "",
    descripcion_a: item?.descripcion_a ?? "",
    capacidad_a: item?.capacidad_a?.toString() ?? "",
    precio_referencia_a: item?.precio_referencia_a?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = sanitizeName(form.nombre_a).trim();
    const descripcion = sanitizeDescription(form.descripcion_a).trim();
    const capacidad = Number(form.capacidad_a);
    const precio = form.precio_referencia_a === "" ? undefined : Number(form.precio_referencia_a);

    if (!nombre || !Number.isInteger(capacidad) || capacidad < 1) return;
    if (precio !== undefined && (!Number.isFinite(precio) || precio < 0)) return;

    setSaving(true);
    try {
      await onSave({
        nombre_a: nombre,
        descripcion_a: descripcion || undefined,
        capacidad_a: capacidad,
        precio_referencia_a: precio,
      });
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={item ? "Editar ambiente" : "Nuevo ambiente"} subtitle="Los cambios se guardan directamente en PostgreSQL." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Nombre">
          <input
            required
            maxLength={50}
            pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+"
            title="Usa solamente letras, espacios, guiones o apóstrofes."
            value={form.nombre_a}
            onChange={e => setForm({...form, nombre_a: sanitizeName(e.target.value)})}
          />
          <small className="field-hint">{form.nombre_a.length}/50 caracteres</small>
        </Field>

        <Field label="Capacidad">
          <input
            required
            type="number"
            min="1"
            max="9999999"
            step="1"
            inputMode="numeric"
            value={form.capacidad_a}
            onChange={e => setForm({...form, capacidad_a: sanitizeInteger(e.target.value)})}
          />
        </Field>

        <Field label="Precio de referencia">
          <input
            type="number"
            min="0"
            max="999999999999"
            step="1"
            inputMode="numeric"
            value={form.precio_referencia_a}
            onChange={e => setForm({...form, precio_referencia_a: sanitizeMoney(e.target.value)})}
          />
        </Field>

        <Field label="Descripción">
          <textarea
            rows={4}
            maxLength={120}
            value={form.descripcion_a}
            onChange={e => setForm({...form, descripcion_a: sanitizeDescription(e.target.value)})}
          />
          <small className="field-hint">{form.descripcion_a.length}/120 caracteres</small>
        </Field>
      </div>

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

function ServicioModal({ item, onClose, onSave }: { item?: Servicio; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    nombre_s: item?.nombre_s ?? item?.nombre ?? "",
    descripcion_s: item?.descripcion_s ?? item?.descripcion ?? ""
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = sanitizeName(form.nombre_s).trim();
    const descripcion = sanitizeDescription(form.descripcion_s).trim();

    if (!nombre) return;

    setSaving(true);
    try {
      await onSave({
        nombre_s: nombre,
        descripcion_s: descripcion || undefined
      });
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={item ? "Editar servicio" : "Nuevo servicio"} subtitle="Catálogo de servicios sociales." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <Field label="Nombre">
        <input
          required
          maxLength={50}
          pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+"
          title="Usa solamente letras, espacios, guiones o apóstrofes."
          value={form.nombre_s}
          onChange={e => setForm({...form, nombre_s: sanitizeName(e.target.value)})}
        />
        <small className="field-hint">{form.nombre_s.length}/50 caracteres</small>
      </Field>

      <Field label="Descripción">
        <textarea
          rows={5}
          maxLength={120}
          value={form.descripcion_s}
          onChange={e => setForm({...form, descripcion_s: sanitizeDescription(e.target.value)})}
        />
        <small className="field-hint">{form.descripcion_s.length}/120 caracteres</small>
      </Field>

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

function EventoModal({ item, ambientes, tipos, onClose, onSave }: { item?: EventoSocial; ambientes: Ambiente[]; tipos: TipoEvento[]; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    nombre_er: item?.nombre_er ?? "",
    descripcion_er: item?.descripcion_er ?? "",
    fecha_er: item?.fecha_er?.slice(0,10) ?? "",
    id_a: item?.id_a?.toString() ?? "",
    id_tipo_eves: item?.id_tipo_eves?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = sanitizeName(form.nombre_er).trim();
    const descripcion = sanitizeDescription(form.descripcion_er).trim();

    if (!nombre || !form.id_a || !form.id_tipo_eves) return;

    setSaving(true);
    try {
      await onSave({
        nombre_er: nombre,
        descripcion_er: descripcion || undefined,
        fecha_er: form.fecha_er || undefined,
        id_a: Number(form.id_a),
        id_tipo_eves: Number(form.id_tipo_eves),
      });
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={item ? "Editar evento social" : "Nuevo evento social"} subtitle="El evento se guarda en la base de datos." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Nombre">
          <input
            required
            maxLength={50}
            pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+"
            title="Usa solamente letras, espacios, guiones o apóstrofes."
            value={form.nombre_er}
            onChange={e => setForm({...form, nombre_er: sanitizeName(e.target.value)})}
          />
          <small className="field-hint">{form.nombre_er.length}/50 caracteres</small>
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={form.fecha_er}
            onChange={e => setForm({...form, fecha_er:e.target.value})}
          />
        </Field>

        <Field label="Ambiente">
          <select required value={form.id_a} onChange={e => setForm({...form,id_a:e.target.value})}>
            <option value="">Seleccionar…</option>
            {ambientes.map(a => <option key={a.id_a} value={a.id_a}>{a.nombre_a}</option>)}
          </select>
        </Field>

        <Field label="Tipo de evento">
          <select required value={form.id_tipo_eves} onChange={e => setForm({...form,id_tipo_eves:e.target.value})}>
            <option value="">Seleccionar…</option>
            {tipos.map(t => <option key={t.id_tipo_eves} value={t.id_tipo_eves}>{t.nombre_tipo_eves}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Descripción">
        <textarea
          rows={4}
          maxLength={120}
          value={form.descripcion_er}
          onChange={e => setForm({...form,descripcion_er: sanitizeDescription(e.target.value)})}
        />
        <small className="field-hint">{form.descripcion_er.length}/120 caracteres</small>
      </Field>

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

function PqrModal({ item, onClose, onSave }: { item: Pqr; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [estado, setEstado] = useState(item.estado_pqr);
  const [respuesta, setRespuesta] = useState(item.respuesta_pqr ?? "");
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ estado_pqr: estado, respuesta_pqr: respuesta || null }); } finally { setSaving(false); }
  };
  return <Modal title={`PQR #${item.id_pqr}`} subtitle={item.asunto_pqr} onClose={onClose}>
    <div className="pqr-detail">
      <div className="pqr-meta"><span><strong>Tipo</strong>{human(item.tipo_pqr)}</span><span><strong>Estado</strong><Badge value={estado} /></span></div>
      <div className="message-box"><span>Mensaje recibido</span><p>{item.mensaje_pqr}</p></div>
      <form className="modal-form" onSubmit={submit}>
        <Field label="Estado"><select value={estado} onChange={e => setEstado(e.target.value as Pqr["estado_pqr"])}><option value="abierto">Abierto</option><option value="en_proceso">En proceso</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select></Field>
        <Field label="Respuesta">
          <textarea
            rows={5}
            maxLength={1000}
            value={respuesta}
            onChange={e => setRespuesta(e.target.value.slice(0, 1000))}
            placeholder="Respuesta para el usuario…"
          />
          <small className="field-hint">{respuesta.length}/1000 caracteres</small>
        </Field>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar respuesta"}</button></div>
      </form>
    </div>
  </Modal>;
}

export default function Admin() {
  return <Protected><AdminPage /></Protected>;
}