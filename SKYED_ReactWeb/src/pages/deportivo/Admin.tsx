import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import jsQR from "jsqr";
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Camera,
  CameraOff,
  Check,
  ClipboardList,
  Eye,
  ImagePlus,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LogOut,
  House,
  Menu,
  Package,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Settings,
  Tags,
  Trash2,
  Trophy,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";

import Protected from "../../components/Protected";
import { useAuth } from "../../context/AuthContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import AccessibilityWidget from "../../components/shared/AccessibilityWidget";
import AdminAjustes from "../../components/shared/AdminAjustes";
import { apiFetch } from "../../services/api";
import { prepararImagen } from "../../utils/prepararImagen";
import { EstadoPagos, InscritosPorEvento, TendenciaMensual } from "../../components/deportivo/GraficosAdmin";
import { useConfirmacion } from "../../components/shared/ConfirmDialog";
import { CargandoPanel, NumeroAnimado } from "../../components/shared/AdminMotion";
import AdminFooter from "../../components/shared/AdminFooter";

type Confirmar = ReturnType<typeof useConfirmacion>["confirmar"];
// Base del panel: mismo diseño del panel social con la paleta deportiva
// (aislado bajo .deportivo-admin). Los extras son lo propio de este panel.
import "../../styles/deportivo/Admin.css";
import "../../styles/deportivo/AdminExtras.css";

type Section =
  | "inicio"
  | "eventos"
  | "inscripciones"
  | "acceso"
  | "resultados"
  | "kits"
  | "usuarios"
  | "ajustes";

type Categoria = {
  id: number;
  nombre: string;
  edad_minima?: number | null;
  edad_maxima?: number | null;
  genero?: string | null;
  distancia?: string | null;
  descripcion?: string | null;
};

// GET /eventos devuelve EventoDeportivoResource (claves en español sin sufijo).
type Evento = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  distancia?: string | null;
  desnivel?: string | null;
  fecha: string;
  hora: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string;
  imagen?: string | null;
  imagen_url?: string | null;
  cupos_disponibles: number;
  estado: "activo" | "inactivo" | "inhabilitado";
  kit?: { id: number; nombre: string } | null;
  categorias?: Categoria[];
};

// GET /kits devuelve el modelo tal cual (columnas con sufijo _k).
type Kit = {
  id_k: number;
  nombre_k: string;
  stock_k: number;
  fecha_entrega_k?: string | null;
  lugar_entrega_k?: string | null;
  contenido_k?: string | null;
  talla_camiseta_k?: string | null;
  numero_dorsal_k?: number | null;
};

type Persona = { nombre_u?: string; apellido_u?: string; correo_u?: string; telefono_u?: string };

// GET /pagos devuelve modelos con sus relaciones (columnas originales).
type Pago = {
  id_pago: number;
  metodo_pago_p?: string | null;
  referencia_p?: string | null;
  comprobante_p?: string | null;
  monto_p?: number | string | null;
  fecha_p?: string | null;
  estado_p: "pendiente" | "confirmado" | "rechazado" | "cancelado";
  inscripcion?: {
    id_i: number;
    estado_i: string;
    fecha_i?: string | null;
    contacto_emergencia_nombre?: string | null;
    contacto_emergencia_telefono?: string | null;
    contacto_emergencia_parentesco?: string | null;
    usuario?: Persona;
    evento?: { id_e: number; nombre_e: string; fecha_e?: string };
    qr?: { codigo_qr: string; estado_qr: string } | null;
  };
};

type Resultado = {
  id_r: number;
  tiempo_final_r: string;
  posicion_general_r?: number | null;
  estado_r: "oficial" | "en revision" | "descalificado";
  id_i: number;
  inscripcion?: {
    usuario?: Persona;
    evento?: { id_e: number; nombre_e: string };
  };
};

type UserRow = {
  id_u: number;
  nombre_u: string;
  apellido_u?: string;
  correo_u: string;
  estado_u?: string;
  roles?: Array<{ nombre_rol: string }>;
};

type Ingreso = { ok: boolean; titulo: string; detalle: string[]; hora: string };

const CATEGORIAS_EVENTO: Array<{ value: string; label: string }> = [
  { value: "ruta", label: "Ruta" },
  { value: "mtb", label: "MTB" },
  { value: "gravel", label: "Gravel" },
  { value: "pista", label: "Pista" },
  { value: "bmx", label: "BMX" },
];

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

const nombreDe = (p?: Persona) =>
  p ? `${p.nombre_u ?? ""} ${p.apellido_u ?? ""}`.trim() || "—" : "—";

const hoy = () => new Date().toISOString().slice(0, 10);

/* ================================================================
   VALIDACIONES (mismas reglas que el backend)
================================================================ */

const sanitizeText = (value: string, maxLength: number) =>
  value.replace(/\s{2,}/g, " ").slice(0, maxLength);

const sanitizeInteger = (value: string, maxLength = 7) =>
  value.replace(/\D/g, "").slice(0, maxLength);

/** "1:05" → "01:05:00"; acepta HH:MM o HH:MM:SS del input type="time". */
const normalizarTiempo = (value: string) => {
  const partes = value.split(":").map((p) => p.padStart(2, "0"));
  while (partes.length < 3) partes.push("00");
  return partes.slice(0, 3).join(":");
};

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const MAX_IMAGEN_MB = 8;

/**
 * Igual al de Social, pero sube a /deportivo/imagenes y guarda la ruta
 * relativa (imagen_e), porque EventoDeportivoResource arma la URL pública.
 */
function ImageUploadField({
  path,
  previewUrl,
  onChange,
  onError,
}: {
  path: string;
  previewUrl: string;
  onChange: (path: string, url: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFile = async (original?: File | null) => {
    if (!original || uploading) return;

    if (!original.type.startsWith("image/")) {
      onError("Selecciona un archivo de imagen (JPG, PNG o WEBP).");
      return;
    }

    setImgError(false);
    setUploading(true);
    try {
      // Se reduce en el navegador: así no choca con el límite de PHP (2 MB).
      const file = await prepararImagen(original);
      if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
        onError(`La imagen no debe superar ${MAX_IMAGEN_MB} MB.`);
        return;
      }
      const body = new FormData();
      body.append("imagen", file);
      const res = await apiFetch("/deportivo/imagenes", { method: "POST", body });
      onChange(res.path, res.url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`admin-dropzone ${dragOver ? "is-dragover" : ""} ${uploading ? "is-uploading" : ""}`}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      role="button"
      tabIndex={0}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {path && previewUrl && !imgError ? (
        <div className="admin-dropzone-preview">
          <img src={previewUrl} alt="Vista previa" onError={() => setImgError(true)} />
          {uploading && (
            <div className="admin-dropzone-overlay"><Loader2 size={20} className="admin-spin" /></div>
          )}
          <div className="admin-dropzone-preview-actions">
            <button type="button" className="secondary-btn" disabled={uploading}
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload size={13} /> Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-dropzone-empty">
          {uploading ? (
            <>
              <Loader2 size={22} className="admin-spin" />
              <span>Subiendo…</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} />
              <span>Haz clic o arrastra una imagen aquí</span>
              <small>JPG, PNG o WEBP · máx. {MAX_IMAGEN_MB} MB</small>
            </>
          )}
        </div>
      )}
      {imgError && path && !uploading && (
        <small className="field-hint field-hint-warn">No se pudo cargar esa imagen. Intenta subirla de nuevo.</small>
      )}
    </div>
  );
}

function SectionTable({
  title,
  action,
  onAction,
  toolbar,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  toolbar?: React.ReactNode;
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
      {toolbar && <div className="filter-row">{toolbar}</div>}
      <div className="admin-card table-card">
        <div className="table-scroll">
          <table className="admin-table">{children}</table>
        </div>
      </div>
    </section>
  );
}

function Kpi({ icon, label, value, compact, formato }: { icon: React.ReactNode; label: string; value: React.ReactNode; compact?: boolean; formato?: (v: number) => string }) {
  // Los números "cuentan" hasta su valor al aparecer.
  const contenido = typeof value === "number" ? <NumeroAnimado valor={value} formato={formato} /> : value;
  return <div className="kpi-card"><div className="kpi-icon">{icon}</div><span>{label}</span><strong className={compact ? "compact" : ""}>{contenido}</strong></div>;
}

function AdminPage() {
  const { user, logout } = useAuth();
  // Ventana de confirmación con el diseño del panel (reemplaza window.confirm).
  const { confirmar, dialogo } = useConfirmacion();
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
  const [loading, setLoading] = useState(true); // true desde el inicio: sin "flash" de tarjetas en cero
  const [panelOpen, setPanelOpen] = useState(false);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [filtroPago, setFiltroPago] = useState<"todos" | Pago["estado_p"]>("pendiente");
  const [filtroEvento, setFiltroEvento] = useState("");

  const [modal, setModal] = useState<
    "evento" | "categorias" | "kit" | "pago" | "resultado" | null
  >(null);
  const [editing, setEditing] = useState<any>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, k, p, r] = await Promise.all([
        apiFetch("/eventos?per_page=200"),
        apiFetch("/kits?per_page=200"),
        apiFetch("/pagos?per_page=500"),
        apiFetch("/resultados?per_page=500"),
      ]);
      setEventos(e.data ?? []);
      setKits(k.data ?? []);
      setPagos(p.pagos?.data ?? []);
      setResultados(r.resultados?.data ?? []);
      try {
        const u = await apiFetch("/users?per_page=200");
        setUsers(u.data ?? []);
      } catch {
        // El panel funciona aunque la API de usuarios no responda.
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /**
   * Ejecuta una acción contra la API, muestra el resultado y recarga.
   * Devuelve false si falló, para que el modal siga abierto.
   */
  const run = async (accion: () => Promise<unknown>, okMessage: string, cerrarModal = true) => {
    try {
      await accion();
      notify(okMessage);
      if (cerrarModal) setModal(null);
      await loadAll();
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo completar la acción.");
      return false;
    }
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setSearch("");
    setMobileOpen(false);
  };

  const filtered = (text: string) =>
    text.toLowerCase().includes(search.toLowerCase());

  const visibleEventos = eventos.filter((e) =>
    filtered(`${e.nombre} ${e.categoria} ${e.ubicacion} ${e.estado}`)
  );
  const visiblePagos = pagos
    .filter((p) => filtroPago === "todos" || p.estado_p === filtroPago)
    .filter((p) => !filtroEvento || String(p.inscripcion?.evento?.id_e) === filtroEvento)
    .filter((p) =>
      filtered(`${nombreDe(p.inscripcion?.usuario)} ${p.inscripcion?.usuario?.correo_u ?? ""} ${p.inscripcion?.evento?.nombre_e ?? ""} ${p.referencia_p ?? ""}`)
    );
  const visibleResultados = resultados
    .filter((r) => !filtroEvento || String(r.inscripcion?.evento?.id_e) === filtroEvento)
    .filter((r) => filtered(`${nombreDe(r.inscripcion?.usuario)} ${r.inscripcion?.evento?.nombre_e ?? ""} ${r.estado_r}`))
    .sort((a, b) =>
      (a.inscripcion?.evento?.nombre_e ?? "").localeCompare(b.inscripcion?.evento?.nombre_e ?? "")
      || (a.posicion_general_r ?? 9999) - (b.posicion_general_r ?? 9999));
  const visibleKits = kits.filter((k) => filtered(`${k.nombre_k} ${k.lugar_entrega_k ?? ""} ${k.contenido_k ?? ""}`));

  const stats = useMemo(() => {
    const activos = eventos.filter((e) => e.estado === "activo");
    return {
      activos: activos.length,
      inscripciones: pagos.filter((p) => p.inscripcion && p.inscripcion.estado_i !== "cancelada").length,
      pendientes: pagos.filter((p) => p.estado_p === "pendiente").length,
      ingresos: pagos
        .filter((p) => p.estado_p === "confirmado")
        .reduce((sum, p) => sum + Number(p.monto_p || 0), 0),
      cupos: activos.reduce((sum, e) => sum + Number(e.cupos_disponibles || 0), 0),
      resultados: resultados.length,
    };
  }, [eventos, pagos, resultados]);

  const proximos = useMemo(
    () => eventos
      .filter((e) => e.estado === "activo" && e.fecha?.slice(0, 10) >= hoy())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5),
    [eventos]
  );

  if (!user || !user.roles.includes("adminDeportivo")) return <Navigate to="/deportivo" replace />;

  const sectionMeta: Record<Section, { label: string; icon: any }> = {
    inicio: { label: "Inicio", icon: LayoutDashboard },
    eventos: { label: "Eventos", icon: CalendarDays },
    inscripciones: { label: "Inscripciones y pagos", icon: Wallet },
    acceso: { label: "Control de acceso", icon: QrCode },
    resultados: { label: "Resultados", icon: Trophy },
    kits: { label: "Kits", icon: Package },
    usuarios: { label: "Usuarios", icon: Users },
    ajustes: { label: "Ajustes", icon: Settings },
  };

  const accent = accentOverride ?? "#2c9caf";
  const scale = parseInt(fontSize, 10) / 16;

  const cambiarEstadoEvento = (e: Evento, estado_e: Evento["estado"]) =>
    run(() => apiFetch(`/eventos/${e.id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado_e }),
    }), `Evento ${human(estado_e).toLowerCase()}`, false);

  const eliminarEvento = async (e: Evento) => {
    if (!(await confirmar({ titulo: "Eliminar evento", mensaje: `¿Eliminar "${e.nombre}"? Esta acción no se puede deshacer.`, confirmar: "Eliminar", tipo: "peligro" }))) return;
    run(() => apiFetch(`/eventos/${e.id}`, { method: "DELETE" }), "Evento eliminado", false);
  };

  const cambiarEstadoPago = async (p: Pago, estado_p: "confirmado" | "rechazado") => {
    const quien = nombreDe(p.inscripcion?.usuario);
    const pregunta = estado_p === "confirmado"
      ? `¿Confirmar el pago de ${quien}? Su inscripción quedará confirmada y su QR activo.`
      : `¿Rechazar el pago de ${quien}? La inscripción se cancelará y el cupo vuelve a quedar libre.`;
    const ok = await confirmar({
      titulo: estado_p === "confirmado" ? "Confirmar pago" : "Rechazar pago",
      mensaje: pregunta,
      confirmar: estado_p === "confirmado" ? "Confirmar pago" : "Rechazar",
      tipo: estado_p === "confirmado" ? "normal" : "peligro",
    });
    if (!ok) return;
    run(() => apiFetch(`/pagos/${p.id_pago}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado_p }),
    }), estado_p === "confirmado" ? "Pago confirmado" : "Pago rechazado");
  };

  const eliminarResultado = async (r: Resultado) => {
    if (!(await confirmar({ titulo: "Eliminar resultado", mensaje: `¿Eliminar el resultado de ${nombreDe(r.inscripcion?.usuario)}?`, confirmar: "Eliminar", tipo: "peligro" }))) return;
    run(() => apiFetch(`/resultados/${r.id_r}`, { method: "DELETE" }), "Resultado eliminado", false);
  };

  const eliminarKit = async (k: Kit) => {
    if (!(await confirmar({ titulo: "Eliminar kit", mensaje: `¿Eliminar el kit "${k.nombre_k}"? Si un evento lo usa no se podrá borrar.`, confirmar: "Eliminar", tipo: "peligro" }))) return;
    run(() => apiFetch(`/kits/${k.id_k}`, { method: "DELETE" }), "Kit eliminado", false);
  };

  const filtroEventoSelect = (
    <select className="admin-select" value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)} aria-label="Filtrar por evento">
      <option value="">Todos los eventos</option>
      {eventos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
    </select>
  );

  return (
    <div
      className={`deportivo-admin ${darkMode ? "dark" : ""} ${dyslexia ? "dyslexia" : ""} ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
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
          <Link to="/deportivo" className="admin-brand">
            <img src="/assets/deportivo/logo_deportivo.png" alt="Skyed Deportivo" />
            <span>Skyed <em>Deportivo</em></span>
          </Link>
        </div>

        {/* Atajos: volver a la página pública del módulo o al inicio de SKYED */}
        <div className="admin-header-right" role="navigation" aria-label="Salir del panel">
          <Link to="/deportivo" className="icon-btn" title="Ir a Skyed Deportivo" aria-label="Ir a la página de Skyed Deportivo">
            <ArrowLeft size={19} />
          </Link>
          <Link to="/" className="icon-btn" title="Volver a SKYED Principal" aria-label="Volver al inicio principal">
            <House size={19} />
          </Link>
        </div>
      </header>

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/assets/deportivo/logo_deportivo.png" alt="Skyed Deportivo" width={37} height={37} />
          {/* El nombre del módulo ya está en el encabezado; aquí solo "Administración" */}
          <div className="sidebar-brand-text">
            <span>ADMINISTRACIÓN</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-caption">GESTIÓN</p>
          {(Object.keys(sectionMeta) as Section[]).filter(key => key !== "ajustes").map(key => {
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
          <p className="nav-caption">CUENTA</p>
          <button
            className={`admin-nav-item ${section === "ajustes" ? "active" : ""}`}
            onClick={() => selectSection("ajustes")}
            title={sectionMeta.ajustes.label}
          >
            <Settings size={18} />
            <span>{sectionMeta.ajustes.label}</span>
          </button>
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
            <h1 key={section}>{sectionMeta[section].label}</h1>
          </div>
          {section !== "acceso" && section !== "inicio" && section !== "ajustes" && (
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
          )}
        </div>

        {/* Solo en la carga inicial: al recargar tras cada acción no se
            muestra, para que la pantalla no salte (p. ej. al validar QR). */}
        {loading && !eventos.length && <CargandoPanel modulo="deportivo" />}

        {section === "inicio" && (
          <section className="dashboard-content">
            <div className="kpi-grid">
              <Kpi icon={<CalendarDays size={19} />} label="Eventos activos" value={stats.activos} />
              <Kpi icon={<ClipboardList size={19} />} label="Inscripciones" value={stats.inscripciones} />
              <Kpi icon={<Wallet size={19} />} label="Pagos por validar" value={stats.pendientes} />
              <Kpi icon={<Check size={19} />} label="Ingresos confirmados" value={stats.ingresos} formato={money} compact />
              <Kpi icon={<Bike size={19} />} label="Cupos disponibles" value={stats.cupos} />
              <Kpi icon={<Trophy size={19} />} label="Resultados publicados" value={stats.resultados} />
            </div>

            <div className="dashboard-grid-main">
              <TendenciaMensual pagos={pagos} />

              <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">CALENDARIO</span>
                    <h2>Próximos eventos</h2>
                  </div>
                  <button className="link-button" onClick={() => selectSection("eventos")}>Ver todos →</button>
                </div>
                <div className="resource-list">
                  {proximos.map(e => (
                    <div className="resource-item" key={e.id}>
                      <div className="resource-icon"><Bike size={18} /></div>
                      <div className="resource-main">
                        <strong>{e.nombre}</strong>
                        <span>{formatDate(e.fecha)} · {e.cupos_disponibles} cupos libres{e.categorias && !e.categorias.length ? " · ⚠ sin categorías" : ""}</span>
                      </div>
                    </div>
                  ))}
                  {!proximos.length && <p>No hay eventos activos próximos.</p>}
                </div>
              </section>
            </div>

            <div className="dashboard-grid-charts">
              <InscritosPorEvento pagos={pagos} />
              <EstadoPagos pagos={pagos} onVerPendientes={() => { setFiltroPago("pendiente"); selectSection("inscripciones"); }} />
            </div>
          </section>
        )}

        {section === "eventos" && (
          <SectionTable title="Gestión de eventos deportivos" action="Nuevo evento" onAction={() => { setEditing(null); setModal("evento"); }}>
            <thead><tr><th>Foto</th><th>Nombre</th><th>Categoría</th><th>Fecha</th><th>Precio</th><th>Cupos</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleEventos.map(e => (
                <tr key={e.id}>
                  <td>
                    {e.imagen_url
                      ? <img className="admin-thumb" src={e.imagen_url} alt={e.nombre} onError={ev => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />
                      : <span className="admin-thumb admin-thumb-empty" title="Sin foto">—</span>}
                  </td>
                  <td>
                    <strong>{e.nombre}</strong>
                    {e.categorias && !e.categorias.length && (
                      <small className="field-hint field-hint-warn" style={{ display: "block" }}>Sin categorías: nadie puede inscribirse</small>
                    )}
                  </td>
                  <td>{CATEGORIAS_EVENTO.find(c => c.value === e.categoria)?.label ?? e.categoria}</td>
                  <td>{formatDate(e.fecha)}</td>
                  <td>{money(e.precio)}</td>
                  <td>{e.cupos_disponibles}</td>
                  <td>
                    <select className="admin-select" value={e.estado} onChange={ev => cambiarEstadoEvento(e, ev.target.value as Evento["estado"])} aria-label="Estado del evento">
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="inhabilitado">Inhabilitado</option>
                    </select>
                  </td>
                  <td><div className="row-actions">
                    <button className="table-action" title="Editar" onClick={() => { setEditing(e); setModal("evento"); }}><Pencil size={15} /></button>
                    <button className="table-action" title="Categorías" onClick={() => { setEditing(e); setModal("categorias"); }}><Tags size={15} /></button>
                    <button className="table-action danger" title="Eliminar" onClick={() => eliminarEvento(e)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleEventos.length && <tr><td colSpan={8}>No hay eventos deportivos.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "inscripciones" && (
          <SectionTable
            title="Inscripciones y pagos"
            toolbar={<>
              <select className="admin-select" value={filtroPago} onChange={e => setFiltroPago(e.target.value as typeof filtroPago)} aria-label="Filtrar por estado del pago">
                <option value="pendiente">Pagos por validar</option>
                <option value="confirmado">Confirmados</option>
                <option value="rechazado">Rechazados</option>
                <option value="cancelado">Cancelados</option>
                <option value="todos">Todos</option>
              </select>
              {filtroEventoSelect}
            </>}
          >
            <thead><tr><th>Participante</th><th>Evento</th><th>Inscripción</th><th>Monto</th><th>Método</th><th>Pago</th><th>Acciones</th></tr></thead>
            <tbody>
              {visiblePagos.map(p => (
                <tr key={p.id_pago}>
                  <td>
                    <strong>{nombreDe(p.inscripcion?.usuario)}</strong>
                    <small style={{ display: "block", opacity: .7 }}>{p.inscripcion?.usuario?.correo_u ?? ""}</small>
                  </td>
                  <td>{p.inscripcion?.evento?.nombre_e ?? "—"}</td>
                  <td>{formatDate(p.inscripcion?.fecha_i)}</td>
                  <td>{money(p.monto_p)}</td>
                  <td>{human(p.metodo_pago_p ?? "—")}</td>
                  <td><Badge value={p.estado_p} /></td>
                  <td><div className="row-actions">
                    <button className="table-action" title="Ver detalle" onClick={() => { setEditing(p); setModal("pago"); }}><Eye size={15} /></button>
                    {p.estado_p === "pendiente" && <>
                      <button className="table-action" title="Confirmar pago" onClick={() => cambiarEstadoPago(p, "confirmado")}><Check size={15} /></button>
                      <button className="table-action danger" title="Rechazar pago" onClick={() => cambiarEstadoPago(p, "rechazado")}><X size={15} /></button>
                    </>}
                  </div></td>
                </tr>
              ))}
              {!visiblePagos.length && <tr><td colSpan={7}>No hay inscripciones con este filtro.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "acceso" && <ControlAcceso notify={notify} onValidado={loadAll} />}

        {section === "resultados" && (
          <SectionTable
            title="Resultados oficiales"
            action="Registrar resultado"
            onAction={() => { setEditing(null); setModal("resultado"); }}
            toolbar={filtroEventoSelect}
          >
            <thead><tr><th>Pos.</th><th>Participante</th><th>Evento</th><th>Tiempo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleResultados.map(r => (
                <tr key={r.id_r}>
                  <td><strong>{r.posicion_general_r ?? "—"}</strong></td>
                  <td>{nombreDe(r.inscripcion?.usuario)}</td>
                  <td>{r.inscripcion?.evento?.nombre_e ?? "—"}</td>
                  <td>{r.tiempo_final_r}</td>
                  <td><Badge value={r.estado_r} /></td>
                  <td><div className="row-actions">
                    <button className="table-action" title="Editar" onClick={() => { setEditing(r); setModal("resultado"); }}><Pencil size={15} /></button>
                    <button className="table-action danger" title="Eliminar" onClick={() => eliminarResultado(r)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleResultados.length && <tr><td colSpan={6}>No hay resultados registrados.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "kits" && (
          <SectionTable title="Kits del participante" action="Nuevo kit" onAction={() => { setEditing(null); setModal("kit"); }}>
            <thead><tr><th>Nombre</th><th>Stock</th><th>Entrega</th><th>Lugar</th><th>Contenido</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleKits.map(k => (
                <tr key={k.id_k}>
                  <td><strong>{k.nombre_k}</strong></td>
                  <td>{k.stock_k}</td>
                  <td>{formatDate(k.fecha_entrega_k)}</td>
                  <td>{k.lugar_entrega_k ?? "—"}</td>
                  <td>{k.contenido_k ?? "—"}</td>
                  <td><div className="row-actions">
                    <button className="table-action" title="Editar" onClick={() => { setEditing(k); setModal("kit"); }}><Pencil size={15} /></button>
                    <button className="table-action danger" title="Eliminar" onClick={() => eliminarKit(k)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleKits.length && <tr><td colSpan={6}>No hay kits registrados.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "ajustes" && (
          <AdminAjustes
            notify={notify}
            avisos={[
              { key: "pagos", title: "Pagos por validar", desc: "Aviso cuando un participante suba un comprobante de pago" },
              { key: "inscripciones", title: "Nuevas inscripciones", desc: "Aviso cuando alguien se inscriba a un evento" },
              { key: "cierre", title: "Cierre de inscripciones", desc: "Recordatorio antes de que cierre un evento", defecto: false },
            ]}
          />
        )}

        {section === "usuarios" && (
          <SectionTable
            title="Usuarios registrados"
            toolbar={<Link className="secondary-btn" to="/admin/usuarios">Gestionar roles →</Link>}
          >
            <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th></tr></thead>
            <tbody>
              {users.filter(u => filtered(`${u.nombre_u} ${u.apellido_u ?? ""} ${u.correo_u}`)).map(u => (
                <tr key={u.id_u}>
                  <td>#{u.id_u}</td><td>{u.nombre_u} {u.apellido_u ?? ""}</td><td>{u.correo_u}</td>
                  <td>{u.roles?.map(r => r.nombre_rol).join(", ") || "—"}</td>
                  <td><Badge value={u.estado_u ?? "activo"} /></td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={5}>La API de usuarios no devolvió registros.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        <AdminFooter modulo="deportivo" />
      </main>

      <AccessibilityWidget
        open={panelOpen}
        onToggleOpen={() => setPanelOpen(o => !o)}
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

      {modal === "evento" && (
        <EventoModal
          item={editing}
          kits={kits}
          onClose={() => setModal(null)}
          notify={notify}
          onSave={data => run(
            () => editing
              ? apiFetch(`/eventos/${editing.id}`, { method: "PUT", body: JSON.stringify(data) })
              : apiFetch("/eventos", { method: "POST", body: JSON.stringify(data) }),
            editing ? "Evento actualizado" : "Evento creado. Ahora agrégale sus categorías.",
          )}
        />
      )}

      {modal === "categorias" && editing && (
        <CategoriasModal evento={editing} onClose={() => { setModal(null); loadAll(); }} notify={notify} confirmar={confirmar} />
      )}

      {modal === "kit" && (
        <KitModal
          item={editing}
          onClose={() => setModal(null)}
          onSave={data => run(
            () => editing
              ? apiFetch(`/kits/${editing.id_k}`, { method: "PUT", body: JSON.stringify(data) })
              : apiFetch("/kits", { method: "POST", body: JSON.stringify(data) }),
            editing ? "Kit actualizado" : "Kit creado",
          )}
        />
      )}

      {modal === "pago" && editing && (
        <PagoModal
          item={editing}
          onClose={() => setModal(null)}
          onCambiar={estado => cambiarEstadoPago(editing, estado)}
        />
      )}

      {modal === "resultado" && (
        <ResultadoModal
          item={editing}
          eventos={eventos}
          onClose={() => setModal(null)}
          notify={notify}
          onSave={data => run(
            () => editing
              ? apiFetch(`/resultados/${editing.id_r}`, { method: "PUT", body: JSON.stringify(data) })
              : apiFetch("/resultados", { method: "POST", body: JSON.stringify(data) }),
            editing ? "Resultado actualizado" : "Resultado registrado",
          )}
        />
      )}

      {toast && <div className="admin-toast"><Check size={17} />{toast}</div>}
      {dialogo}
    </div>
  );
}

/* ================================================================
   EVENTOS
================================================================ */

function EventoModal({ item, kits, onClose, onSave, notify }: {
  item?: Evento | null;
  kits: Kit[];
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  notify: (message: string) => void;
}) {
  const [form, setForm] = useState({
    nombre_e: item?.nombre ?? "",
    categoria_e: item?.categoria ?? "ruta",
    precio_e: item ? String(Math.round(item.precio)) : "",
    distancia_e: item?.distancia ?? "",
    desnivel_e: item?.desnivel ?? "",
    fecha_e: item?.fecha?.slice(0, 10) ?? "",
    hora_e: item?.hora?.slice(0, 5) ?? "07:00",
    ubicacion_e: item?.ubicacion ?? "",
    descripcion_e: item?.descripcion ?? "",
    requisitos_e: item?.requisitos ?? "",
    cupos_disponibles_e: item ? String(item.cupos_disponibles) : "",
    id_k: item?.kit?.id ? String(item.kit.id) : "",
    imagen_e: item?.imagen ?? "",
  });
  const [preview, setPreview] = useState(item?.imagen_url ?? "");
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imagen_e) { notify("Sube la foto del evento: es la que verán los participantes."); return; }

    setSaving(true);
    await onSave({
      nombre_e: form.nombre_e.trim(),
      categoria_e: form.categoria_e,
      precio_e: Number(form.precio_e || 0),
      distancia_e: form.distancia_e.trim() || null,
      desnivel_e: form.desnivel_e.trim() || null,
      fecha_e: form.fecha_e,
      hora_e: form.hora_e,
      ubicacion_e: form.ubicacion_e.trim(),
      descripcion_e: form.descripcion_e.trim(),
      requisitos_e: form.requisitos_e.trim(),
      cupos_disponibles_e: Number(form.cupos_disponibles_e || 0),
      imagen_e: form.imagen_e,
      id_k: form.id_k ? Number(form.id_k) : null,
    });
    setSaving(false);
  };

  return <Modal title={item ? "Editar evento" : "Nuevo evento deportivo"} subtitle="Se publica en SKYED Deportivo apenas quede activo." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Nombre">
          <input required maxLength={120} value={form.nombre_e} onChange={e => set("nombre_e", sanitizeText(e.target.value, 120))} placeholder="Ej. Vuelta al Lago de Tota" />
          <small className="field-hint">{form.nombre_e.length}/120 caracteres</small>
        </Field>

        <Field label="Categoría">
          <select required value={form.categoria_e} onChange={e => set("categoria_e", e.target.value)}>
            {CATEGORIAS_EVENTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Fecha">
          <input required type="date" min={item ? undefined : hoy()} value={form.fecha_e} onChange={e => set("fecha_e", e.target.value)} />
        </Field>

        <Field label="Hora de salida">
          <input required type="time" value={form.hora_e} onChange={e => set("hora_e", e.target.value)} />
        </Field>

        <Field label="Precio de inscripción (COP)">
          <input required type="number" min="0" step="1" inputMode="numeric" value={form.precio_e} onChange={e => set("precio_e", sanitizeInteger(e.target.value, 9))} />
        </Field>

        <Field label={item ? "Cupos disponibles" : "Cupos"}>
          <input required type="number" min="0" step="1" inputMode="numeric" value={form.cupos_disponibles_e} onChange={e => set("cupos_disponibles_e", sanitizeInteger(e.target.value, 5))} />
          {item && <small className="field-hint">Son los cupos que quedan libres, no el total.</small>}
        </Field>

        <Field label="Distancia (opcional)">
          <input maxLength={30} value={form.distancia_e} onChange={e => set("distancia_e", sanitizeText(e.target.value, 30))} placeholder="Ej. 92 km" />
        </Field>

        <Field label="Desnivel (opcional)">
          <input maxLength={30} value={form.desnivel_e} onChange={e => set("desnivel_e", sanitizeText(e.target.value, 30))} placeholder="Ej. 1.450 m" />
        </Field>

        <Field label="Lugar de salida">
          <input required maxLength={120} value={form.ubicacion_e} onChange={e => set("ubicacion_e", sanitizeText(e.target.value, 120))} placeholder="Ej. Aquitania, Boyacá" />
        </Field>

        <Field label="Kit (opcional)">
          <select value={form.id_k} onChange={e => set("id_k", e.target.value)}>
            <option value="">Sin kit</option>
            {kits.map(k => <option key={k.id_k} value={k.id_k}>{k.nombre_k}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Descripción">
        <textarea required rows={3} maxLength={255} value={form.descripcion_e} onChange={e => set("descripcion_e", e.target.value.slice(0, 255))} />
        <small className="field-hint">{form.descripcion_e.length}/255 caracteres</small>
      </Field>

      <Field label="Requisitos">
        <textarea required rows={2} maxLength={255} value={form.requisitos_e} onChange={e => set("requisitos_e", e.target.value.slice(0, 255))} placeholder="Ej. Casco obligatorio, bicicleta en buen estado." />
        <small className="field-hint">{form.requisitos_e.length}/255 caracteres</small>
      </Field>

      <Field label="Foto del evento (obligatoria)">
        <ImageUploadField
          path={form.imagen_e}
          previewUrl={preview}
          onChange={(path, url) => { set("imagen_e", path); setPreview(url); }}
          onError={notify}
        />
      </Field>

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

function CategoriasModal({ evento, onClose, notify, confirmar }: { evento: Evento; onClose: () => void; notify: (message: string) => void; confirmar: Confirmar }) {
  const vacio = { nombre_cc: "", edad_minima_cc: "", edad_maxima_cc: "", genero_cc: "mixto", distancia_cc: "", descripcion_cc: "" };
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  const cargar = async () => {
    try {
      const res = await apiFetch(`/eventos/${evento.id}/categorias?per_page=100`);
      setCategorias(res.categorias ?? []);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = form.edad_minima_cc === "" ? null : Number(form.edad_minima_cc);
    const max = form.edad_maxima_cc === "" ? null : Number(form.edad_maxima_cc);
    if (min !== null && max !== null && max < min) { notify("La edad máxima no puede ser menor que la mínima."); return; }

    setSaving(true);
    try {
      await apiFetch(`/eventos/${evento.id}/categorias`, {
        method: "POST",
        body: JSON.stringify({
          nombre_cc: form.nombre_cc.trim(),
          edad_minima_cc: min,
          edad_maxima_cc: max,
          genero_cc: form.genero_cc,
          distancia_cc: form.distancia_cc.trim() || null,
          descripcion_cc: form.descripcion_cc.trim() || null,
        }),
      });
      notify("Categoría agregada");
      setForm(vacio);
      await cargar();
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo agregar la categoría.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (c: Categoria) => {
    if (!(await confirmar({ titulo: "Eliminar categoría", mensaje: `¿Eliminar la categoría "${c.nombre}"?`, confirmar: "Eliminar", tipo: "peligro" }))) return;
    try {
      await apiFetch(`/categorias/${c.id}`, { method: "DELETE" });
      notify("Categoría eliminada");
      await cargar();
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo eliminar la categoría.");
    }
  };

  const rango = (c: Categoria) => {
    if (c.edad_minima != null && c.edad_maxima != null) return `${c.edad_minima} a ${c.edad_maxima} años`;
    if (c.edad_minima != null) return `desde ${c.edad_minima} años`;
    if (c.edad_maxima != null) return `hasta ${c.edad_maxima} años`;
    return "todas las edades";
  };

  return <Modal title={`Categorías · ${evento.nombre}`} subtitle="El participante debe elegir una al inscribirse: un evento sin categorías no recibe inscripciones." onClose={onClose}>
    <div className="cat-list">
      {cargando && <p>Cargando…</p>}
      {!cargando && !categorias.length && <p className="field-hint field-hint-warn">Este evento todavía no tiene categorías.</p>}
      {categorias.map(c => (
        <div className="cat-item" key={c.id}>
          <div>
            <strong>{c.nombre}</strong>
            <span> · {rango(c)} · {human(c.genero ?? "mixto")}{c.distancia ? ` · ${c.distancia}` : ""}</span>
          </div>
          <button type="button" className="table-action danger" title="Eliminar" onClick={() => eliminar(c)}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>

    <form className="modal-form" onSubmit={agregar}>
      <div className="form-grid">
        <Field label="Nombre de la categoría">
          <input required maxLength={50} value={form.nombre_cc} onChange={e => set("nombre_cc", sanitizeText(e.target.value, 50))} placeholder="Ej. Élite, Master A, Juvenil" />
        </Field>
        <Field label="Género">
          <select value={form.genero_cc} onChange={e => set("genero_cc", e.target.value)}>
            <option value="mixto">Mixto</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
          </select>
        </Field>
        <Field label="Edad mínima (opcional)">
          <input type="number" min="0" max="120" inputMode="numeric" value={form.edad_minima_cc} onChange={e => set("edad_minima_cc", sanitizeInteger(e.target.value, 3))} />
        </Field>
        <Field label="Edad máxima (opcional)">
          <input type="number" min="0" max="120" inputMode="numeric" value={form.edad_maxima_cc} onChange={e => set("edad_maxima_cc", sanitizeInteger(e.target.value, 3))} />
        </Field>
        <Field label="Distancia (opcional)">
          <input maxLength={45} value={form.distancia_cc} onChange={e => set("distancia_cc", sanitizeText(e.target.value, 45))} placeholder="Ej. 60 km" />
        </Field>
        <Field label="Descripción (opcional)">
          <input maxLength={255} value={form.descripcion_cc} onChange={e => set("descripcion_cc", e.target.value.slice(0, 255))} />
        </Field>
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Listo</button>
        <button className="primary-btn" disabled={saving}><Plus size={15} /> {saving ? "Agregando…" : "Agregar categoría"}</button>
      </div>
    </form>
  </Modal>;
}

/* ================================================================
   PAGOS
================================================================ */

function PagoModal({ item, onClose, onCambiar }: { item: Pago; onClose: () => void; onCambiar: (estado: "confirmado" | "rechazado") => void }) {
  const ins = item.inscripcion;
  // Los pagos viejos solo guardaron el NOMBRE del archivo; los nuevos guardan la imagen en "comprobantes/...".
  const tieneImagen = !!item.comprobante_p?.startsWith("comprobantes/");
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [cargandoImg, setCargandoImg] = useState(false);
  const [errorImg, setErrorImg] = useState<string | null>(null);

  useEffect(() => {
    if (!tieneImagen) return;
    let cancelado = false;
    setCargandoImg(true);
    setErrorImg(null);
    apiFetch(`/pagos/${item.id_pago}/comprobante`)
      .then(res => { if (!cancelado) setComprobanteUrl(res.url); })
      .catch(err => { if (!cancelado) setErrorImg(err instanceof Error ? err.message : "No se pudo cargar el comprobante."); })
      .finally(() => { if (!cancelado) setCargandoImg(false); });
    return () => { cancelado = true; };
  }, [item.id_pago, tieneImagen]);

  return <Modal title={nombreDe(ins?.usuario)} subtitle={ins?.evento?.nombre_e ?? ""} onClose={onClose}>
    <div className="pqr-detail">
      <div className="pqr-meta">
        <span><strong>Pago</strong><Badge value={item.estado_p} /></span>
        <span><strong>Inscripción</strong><Badge value={ins?.estado_i ?? "pendiente"} /></span>
        <span><strong>QR</strong><Badge value={ins?.qr?.estado_qr ?? "pendiente"} /></span>
      </div>
      <div className="message-box">
        <span>Participante</span>
        <p>{ins?.usuario?.correo_u ?? "—"} · {ins?.usuario?.telefono_u ?? "sin teléfono"}</p>
      </div>
      <div className="message-box">
        <span>Pago</span>
        <p>
          {money(item.monto_p)} · {human(item.metodo_pago_p ?? "sin método")}
          {item.referencia_p ? ` · Ref. ${item.referencia_p}` : ""}
          {item.comprobante_p && !tieneImagen ? ` · Comprobante: ${item.comprobante_p}` : ""}
        </p>
      </div>
      <div className="message-box">
        <span>Comprobante</span>
        {!tieneImagen
          ? <p>{item.comprobante_p ? "Sin imagen: de este pago solo se guardó el nombre del archivo. Pídele al participante que lo vuelva a enviar." : "El participante no adjuntó comprobante."}</p>
          : cargandoImg
            ? <p>Cargando comprobante…</p>
            : errorImg
              ? <p>{errorImg}</p>
              : comprobanteUrl && <>
                <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer" title="Abrir en una pestaña nueva">
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante de pago"
                    style={{ display: "block", maxWidth: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 12, border: "1px solid rgba(128,128,128,.35)", background: "rgba(128,128,128,.08)" }}
                    onError={() => setErrorImg("No se pudo mostrar la imagen. Cierra y vuelve a abrir esta ventana.")}
                  />
                </a>
                <a className="secondary-btn" href={comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Eye size={15} /> Ver en grande
                </a>
              </>}
      </div>
      <div className="message-box">
        <span>Contacto de emergencia</span>
        <p>
          {ins?.contacto_emergencia_nombre ?? "—"}
          {ins?.contacto_emergencia_parentesco ? ` (${ins.contacto_emergencia_parentesco})` : ""}
          {ins?.contacto_emergencia_telefono ? ` · ${ins.contacto_emergencia_telefono}` : ""}
        </p>
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cerrar</button>
        {item.estado_p === "pendiente" && <>
          <button type="button" className="secondary-btn danger" onClick={() => onCambiar("rechazado")}><X size={15} /> Rechazar</button>
          <button type="button" className="primary-btn" onClick={() => onCambiar("confirmado")}><Check size={15} /> Confirmar pago</button>
        </>}
      </div>
    </div>
  </Modal>;
}

/* ================================================================
   CONTROL DE ACCESO (QR)
================================================================ */

function ControlAcceso({ notify, onValidado }: { notify: (message: string) => void; onValidado: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<Ingreso | null>(null);
  const [historial, setHistorial] = useState<Ingreso[]>([]);
  const [camara, setCamara] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const detenerCamara = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamara(false);
  };

  // Apaga la cámara al salir de la sección.
  useEffect(() => detenerCamara, []);

  const validar = async (valor: string) => {
    const limpio = valor.trim();
    if (!limpio || validando) return;
    setValidando(true);
    const hora = new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
    let ingreso: Ingreso;
    try {
      const res = await apiFetch("/qr/validar", { method: "POST", body: JSON.stringify({ codigo_qr: limpio }) });
      const ins = res.qr?.inscripcion;
      ingreso = {
        ok: true,
        titulo: "Acceso permitido",
        detalle: [nombreDe(ins?.usuario), ins?.evento?.nombre_e ?? ""].filter(Boolean),
        hora,
      };
      onValidado();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo validar el código.";
      ingreso = {
        ok: false,
        titulo: "Acceso denegado",
        detalle: [mensaje === "El QR no está disponible" ? "Este QR ya fue usado, está cancelado o su pago aún no se confirma." : mensaje],
        hora,
      };
    }
    setResultado(ingreso);
    setHistorial(h => [ingreso, ...h].slice(0, 8));
    setCodigo("");
    setValidando(false);
  };

  const iniciarCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      notify("Este navegador no permite usar la cámara. Escribe el código manualmente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamara(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const leer = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(img.data, img.width, img.height);
          if (qr?.data) {
            detenerCamara();
            validar(qr.data);
            return;
          }
        }
        frameRef.current = requestAnimationFrame(leer);
      };
      frameRef.current = requestAnimationFrame(leer);
    } catch {
      detenerCamara();
      notify("No se pudo abrir la cámara. Revisa el permiso del navegador o escribe el código.");
    }
  };

  return (
    <section className="section-view">
      <div className="section-header">
        <div>
          <span className="card-kicker">DÍA DEL EVENTO</span>
          <h2>Validar entrada con QR</h2>
        </div>
      </div>
      <div className="qr-check">
        <div className="admin-card">
          <p style={{ margin: 0 }}>
            Escanea el QR del participante o escribe el código que aparece debajo de él en "Mi entrada".
            Cada QR sirve una sola vez y solo si el pago está confirmado.
          </p>
          <form className="qr-check-form" onSubmit={e => { e.preventDefault(); validar(codigo); }}>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.slice(0, 255))}
              placeholder="Código del QR"
              aria-label="Código del QR"
              autoFocus
            />
            <button className="primary-btn" disabled={validando || !codigo.trim()}>
              {validando ? <Loader2 size={16} className="admin-spin" /> : <ScanLine size={16} />} Validar
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {camara
              ? <button type="button" className="secondary-btn" onClick={detenerCamara}><CameraOff size={15} /> Apagar cámara</button>
              : <button type="button" className="secondary-btn" onClick={iniciarCamara}><Camera size={15} /> Escanear con la cámara</button>}
          </div>
          <video ref={videoRef} className="qr-video" muted playsInline hidden={!camara} />
        </div>

        <div className="admin-card">
          {resultado ? (
            <div className={`qr-result ${resultado.ok ? "ok" : "error"}`} role="status">
              <strong>{resultado.ok ? "✓" : "✕"} {resultado.titulo}</strong>
              {resultado.detalle.map((d, i) => <p key={i}>{d}</p>)}
            </div>
          ) : (
            <div className="qr-result" role="status">
              <strong>Esperando un código…</strong>
              <p>Aquí verás si la persona puede ingresar.</p>
            </div>
          )}

          {!!historial.length && <>
            <div className="card-head" style={{ marginTop: 18 }}>
              <div><span className="card-kicker">ESTA SESIÓN</span><h2>Últimas validaciones</h2></div>
            </div>
            <div className="resource-list">
              {historial.map((h, i) => (
                <div className="resource-item" key={i}>
                  <div className="resource-icon">{h.ok ? <Check size={16} /> : <X size={16} />}</div>
                  <div className="resource-main">
                    <strong>{h.ok ? h.detalle[0] : h.titulo}</strong>
                    <span>{h.hora} · {h.ok ? (h.detalle[1] ?? "") : h.detalle[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   RESULTADOS
================================================================ */

type InscripcionOpcion = { id: number; estado: string; usuario?: { nombre?: string; apellido?: string } };

function ResultadoModal({ item, eventos, onClose, onSave, notify }: {
  item?: Resultado | null;
  eventos: Evento[];
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  notify: (message: string) => void;
}) {
  const [eventoId, setEventoId] = useState(item?.inscripcion?.evento?.id_e ? String(item.inscripcion.evento.id_e) : "");
  const [inscripciones, setInscripciones] = useState<InscripcionOpcion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState({
    id_i: item ? String(item.id_i) : "",
    tiempo_final_r: item?.tiempo_final_r ?? "",
    posicion_general_r: item?.posicion_general_r ? String(item.posicion_general_r) : "",
    estado_r: item?.estado_r ?? "oficial",
    id_cc: "",
    posicion_categoria: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  // Al elegir el evento se cargan sus inscripciones confirmadas y sus categorías.
  useEffect(() => {
    if (item || !eventoId) return;
    let cancelado = false;
    Promise.all([
      apiFetch(`/eventos/${eventoId}/inscripciones?per_page=500`),
      apiFetch(`/eventos/${eventoId}/categorias?per_page=100`),
    ])
      .then(([ins, cats]) => {
        if (cancelado) return;
        setInscripciones((ins.inscripciones ?? []).filter((i: InscripcionOpcion) => i.estado === "confirmada"));
        setCategorias(cats.categorias ?? []);
      })
      .catch(err => notify(err instanceof Error ? err.message : "No se pudieron cargar los inscritos."));
    return () => { cancelado = true; };
  }, [eventoId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos: Record<string, unknown> = {
      tiempo_final_r: normalizarTiempo(form.tiempo_final_r),
      posicion_general_r: form.posicion_general_r ? Number(form.posicion_general_r) : null,
      estado_r: form.estado_r,
    };
    if (!item) {
      datos.id_i = Number(form.id_i);
      if (form.id_cc && form.posicion_categoria) {
        datos.id_cc = Number(form.id_cc);
        datos.posicion_categoria = Number(form.posicion_categoria);
      }
    }
    setSaving(true);
    await onSave(datos);
    setSaving(false);
  };

  return <Modal
    title={item ? "Editar resultado" : "Registrar resultado"}
    subtitle={item ? `${nombreDe(item.inscripcion?.usuario)} · ${item.inscripcion?.evento?.nombre_e ?? ""}` : "Solo aparecen participantes con el pago confirmado."}
    onClose={onClose}
  >
    <form className="modal-form" onSubmit={submit}>
      {!item && (
        <div className="form-grid">
          <Field label="Evento">
            <select required value={eventoId} onChange={e => { setEventoId(e.target.value); set("id_i", ""); set("id_cc", ""); }}>
              <option value="">Seleccionar…</option>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          </Field>
          <Field label="Participante">
            <select required value={form.id_i} onChange={e => set("id_i", e.target.value)} disabled={!eventoId}>
              <option value="">{eventoId && !inscripciones.length ? "No hay inscritos confirmados" : "Seleccionar…"}</option>
              {inscripciones.map(i => <option key={i.id} value={i.id}>{`${i.usuario?.nombre ?? ""} ${i.usuario?.apellido ?? ""}`.trim()}</option>)}
            </select>
          </Field>
        </div>
      )}

      <div className="form-grid">
        <Field label="Tiempo final (hh:mm:ss)">
          <input required type="time" step="1" value={form.tiempo_final_r} onChange={e => set("tiempo_final_r", e.target.value)} />
        </Field>
        <Field label="Posición general (opcional)">
          <input type="number" min="1" inputMode="numeric" value={form.posicion_general_r} onChange={e => set("posicion_general_r", sanitizeInteger(e.target.value, 5))} />
        </Field>
        <Field label="Estado">
          <select value={form.estado_r} onChange={e => set("estado_r", e.target.value)}>
            <option value="oficial">Oficial</option>
            <option value="en revision">En revisión</option>
            <option value="descalificado">Descalificado</option>
          </select>
        </Field>
        {!item && !!categorias.length && <>
          <Field label="Categoría (opcional)">
            <select value={form.id_cc} onChange={e => set("id_cc", e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          {form.id_cc && (
            <Field label="Posición en la categoría">
              <input required type="number" min="1" inputMode="numeric" value={form.posicion_categoria} onChange={e => set("posicion_categoria", sanitizeInteger(e.target.value, 5))} />
            </Field>
          )}
        </>}
      </div>

      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}><ListOrdered size={15} /> {saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

/* ================================================================
   KITS
================================================================ */

function KitModal({ item, onClose, onSave }: { item?: Kit | null; onClose: () => void; onSave: (data: any) => Promise<boolean> }) {
  const [form, setForm] = useState({
    nombre_k: item?.nombre_k ?? "",
    stock_k: item ? String(item.stock_k) : "",
    fecha_entrega_k: item?.fecha_entrega_k?.slice(0, 10) ?? "",
    lugar_entrega_k: item?.lugar_entrega_k ?? "",
    contenido_k: item?.contenido_k ?? "",
    talla_camiseta_k: item?.talla_camiseta_k ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      nombre_k: form.nombre_k.trim(),
      stock_k: Number(form.stock_k || 0),
      fecha_entrega_k: form.fecha_entrega_k || null,
      lugar_entrega_k: form.lugar_entrega_k.trim() || null,
      contenido_k: form.contenido_k.trim() || null,
      talla_camiseta_k: form.talla_camiseta_k.trim() || null,
    });
    setSaving(false);
  };

  return <Modal title={item ? "Editar kit" : "Nuevo kit"} subtitle="Se puede asignar a uno o varios eventos." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Nombre">
          <input required maxLength={45} value={form.nombre_k} onChange={e => set("nombre_k", sanitizeText(e.target.value, 45))} placeholder="Ej. Kit Gran Fondo 2026" />
        </Field>
        <Field label="Unidades disponibles">
          <input required type="number" min="0" inputMode="numeric" value={form.stock_k} onChange={e => set("stock_k", sanitizeInteger(e.target.value, 6))} />
        </Field>
        <Field label="Fecha de entrega (opcional)">
          <input type="date" value={form.fecha_entrega_k} onChange={e => set("fecha_entrega_k", e.target.value)} />
        </Field>
        <Field label="Lugar de entrega (opcional)">
          <input maxLength={45} value={form.lugar_entrega_k} onChange={e => set("lugar_entrega_k", sanitizeText(e.target.value, 45))} />
        </Field>
        <Field label="Tallas (opcional)">
          <input maxLength={10} value={form.talla_camiseta_k} onChange={e => set("talla_camiseta_k", sanitizeText(e.target.value, 10))} placeholder="Ej. S-XL" />
        </Field>
      </div>
      <Field label="Contenido (opcional)">
        <textarea rows={3} maxLength={255} value={form.contenido_k} onChange={e => set("contenido_k", e.target.value.slice(0, 255))} placeholder="Ej. Jersey, número, chip de cronometraje, hidratación." />
        <small className="field-hint">{form.contenido_k.length}/255 caracteres</small>
      </Field>
      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

export default function Admin() {
  return <Protected><AdminPage /></Protected>;
}