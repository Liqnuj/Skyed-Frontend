import AsistentesPanel from "../../features/asistentes/AsistentesPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Lock,
  LifeBuoy,
  LogOut,
  House,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  UserPlus,
  Wrench,
  X,
  BarChart3,
} from "lucide-react";
import { ResumenEventoModal, Indicador, ListaValores } from "../../components/shared/ResumenEvento";

import { createPortal } from "react-dom";
import { prepararImagen } from "../../utils/prepararImagen";

import Protected from "../../components/Protected";
import { useAuth } from "../../context/AuthContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import AccessibilityWidget from "../../components/shared/AccessibilityWidget";
import ExportMenu from "../../components/shared/ExportMenu";
import type { ExportFiltro } from "../../components/shared/ExportMenu";
import AdminAjustes from "../../components/shared/AdminAjustes";
import CopiasSeguridad from "../../components/shared/CopiasSeguridad";
import AyudaAdmin from "../admin/AyudaAdmin";
import { apiFetch } from "../../services/api";
import { useConfirmacion } from "../../components/shared/ConfirmDialog";
import { useAvisos, type Avisar } from "../../components/shared/Avisos";
import { CargandoPanel, NumeroAnimado } from "../../components/shared/AdminMotion";
import AdminFooter from "../../components/shared/AdminFooter";
import type { EstadoPqr, Pqr, ResumenReservas } from "../../services/socialService";
import { reservaService } from "../../services/socialService";
import AdminReservasLista from "../../components/social/reservas/AdminReservasLista";
import AdminReservaDetalle from "../../components/social/reservas/AdminReservaDetalle";
import AdminCalendarioReservas from "../../components/social/reservas/AdminCalendarioReservas";
import { ESTADO_VISUAL_LABEL, FECHA_TIPO_LABEL, fechaCorta } from "../../utils/reservasAdmin";
import PqrGestion from "../../components/social/pqr/AdminPqrManager";
import { UsuarioModal, EditarUsuarioModal, RolesModal, puedeEditarUsuario, RolesDeUsuario, Avatar, esSuperAdminRoles, perteneceAlModulo, type UsuarioFila } from "../../components/deportivo/UsuariosAdmin";
import { usePermisos } from "../../context/PermisosContext";
import { primeraSeccionPermitida } from "../../types/permisos";
import "../../styles/social/Admin.css";

type Section =
  | "inicio"
  | "eventos"
  | "reservas"
  | "usuarios"
  | "pqr"
  | "lugares"
  | "servicios"
  | "copias"
  | "asistentes"
  | "ajustes"
  | "ayuda";

const SECCIONES: Section[] = ["inicio", "eventos", "reservas", "usuarios", "pqr", "lugares", "servicios", "copias", "asistentes", "ajustes", "ayuda"];

/* ---------- Persistencia de la vista (sección + formulario abierto) ----------
   Al recargar la página se vuelve a la misma sección y al mismo formulario.
   Se guarda en sessionStorage: sobrevive al F5 pero no a cerrar la pestaña. */
type ModalKind = "ambiente" | "servicio" | "evento" | "reserva" | "pqr" | "usuario" | "editar-usuario" | "roles";
type SavedView = { section: Section; modal: ModalKind | null; editId: number | string | null };

const VIEW_KEY = "skyed_admin_social_view";
const SECTION_IDS: Section[] = ["inicio", "eventos", "reservas", "usuarios", "pqr", "lugares", "servicios", "copias", "asistentes", "ajustes", "ayuda"];
const MODAL_KINDS: ModalKind[] = ["ambiente", "servicio", "evento", "reserva", "pqr"];

function readSavedView(): SavedView {
  const empty: SavedView = { section: "inicio", modal: null, editId: null };
  try {
    const raw = sessionStorage.getItem(VIEW_KEY);
    if (!raw) return empty;
    const v = JSON.parse(raw);
    return {
      section: SECTION_IDS.includes(v.section) ? v.section : "inicio",
      modal: MODAL_KINDS.includes(v.modal) ? v.modal : null,
      editId: v.editId ?? null,
    };
  } catch {
    return empty;
  }
}

function writeSavedView(view: SavedView) {
  try {
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* sin almacenamiento disponible: simplemente no se persiste */
  }
}

const editIdOf = (modal: ModalKind | null, item: any): number | string | null => {
  if (!item) return null;
  switch (modal) {
    case "ambiente": return item.id_a ?? null;
    case "servicio": return item.id_s ?? item.id ?? null;
    case "evento": return item.id_er ?? null;
    case "pqr": return item.id_pqr ?? null;
    default: return null;
  }
};

type Ambiente = {
  id_a: number;
  nombre_a: string;
  descripcion_a?: string | null;
  capacidad_a: number;
  precio_referencia_a?: number | string | null;
  imagen_principal_a?: string | null;
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
  modulo_tipo_eves?: "deportivo" | "social";
};

type EventoSocial = {
  id_er: number;
  nombre_er: string;
  descripcion_er?: string | null;
  fecha_er?: string | null;
  imagen_er?: string | null;
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

/** Mensaje o evento del historial de una PQR (tabla pqr_seguimientos). */
type PqrSeg = {
  id_seguimiento: number;
  id_admin?: number | null;
  tipo_evento?: string | null;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  comentario_publico?: string | null;
  nota_interna?: string | null;
  created_at?: string | null;
};



type UserRow = UsuarioFila;

/** "1 confirmada", "2 confirmadas". */
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

type CifrasEventoSocial = {
  reservas: number; confirmadas: number; pendientes: number; invitados: number;
  ingresos: number; por_confirmar: number; promedio: number;
  servicios_top: Array<{ nombre: string; reservas: number }>;
};

const CIFRAS_SOCIAL_VACIAS: CifrasEventoSocial = {
  reservas: 0, confirmadas: 0, pendientes: 0, invitados: 0, ingresos: 0, por_confirmar: 0, promedio: 0, servicios_top: [],
};

/** Resumen completo de un evento social. */
function ResumenSocial({ evento, cifras, onClose }: { evento: EventoSocial; cifras?: CifrasEventoSocial; onClose: () => void }) {
  const c = cifras ?? CIFRAS_SOCIAL_VACIAS;
  return (
    <ResumenEventoModal titulo={evento.nombre_er} subtitulo={`Resumen del evento · ${formatDate(evento.fecha_er)}`} onClose={onClose}>
      <Indicador titulo="Reservas" valor={c.reservas} detalle={`${plural(c.confirmadas, "confirmada o completada", "confirmadas o completadas")} · ${plural(c.pendientes, "pendiente", "pendientes")}`} />
      <Indicador titulo="Invitados" valor={c.invitados.toLocaleString("es-CO")} detalle="Suma de los invitados de todas las reservas no canceladas." />
      <Indicador titulo="Ingresos" valor={money(c.ingresos)} detalle="Solo reservas confirmadas o completadas.">
        {c.por_confirmar > 0 && <ListaValores filas={[{ nombre: "Por confirmar (aún no cuenta)", valor: money(c.por_confirmar), destacado: true }]} />}
      </Indicador>
      <Indicador
        titulo="Valor promedio por reserva"
        valor={money(c.promedio)}
        detalle={c.confirmadas ? `Promedio de ${plural(c.confirmadas, "reserva confirmada o completada", "reservas confirmadas o completadas")}.` : "Aún no hay reservas confirmadas."}
      />
      <Indicador
        titulo="Servicios más pedidos"
        valor={c.servicios_top.length ? c.servicios_top[0].nombre : "Ninguno todavía"}
        detalle={c.servicios_top.length ? undefined : "Aparecen cuando las reservas de este evento incluyan servicios."}
        ancho
      >
        {c.servicios_top.length > 0 && (
          <ListaValores filas={c.servicios_top.map((s) => ({ nombre: s.nombre, valor: `${s.reservas} ${s.reservas === 1 ? "reserva" : "reservas"}` }))} />
        )}
      </Indicador>
    </ResumenEventoModal>
  );
}

/** Reservas e ingresos de un evento, con el detalle de lo pendiente debajo. */
function CeldasCifrasEventoSocial({ cifras }: { cifras?: CifrasEventoSocial }) {
  const c = cifras ?? CIFRAS_SOCIAL_VACIAS;
  return <>
    <td className="evt-cifra" title={`${c.confirmadas} confirmadas o completadas · ${c.pendientes} pendientes`}>
      <strong>{c.reservas}</strong>
      {c.invitados > 0 && <small>{c.invitados.toLocaleString("es-CO")} invitados</small>}
      {c.pendientes > 0 && <small className="evt-pendiente">{c.pendientes} por confirmar</small>}
    </td>
    <td className="evt-cifra" title="Solo cuenta las reservas confirmadas o completadas">
      <strong>{money(c.ingresos)}</strong>
      {c.por_confirmar > 0 && <small className="evt-pendiente">{money(c.por_confirmar)} por confirmar</small>}
    </td>
  </>;
}

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
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]/g, "")
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
          <button title="Cerrar" className="icon-btn" onClick={onClose} aria-label="Cerrar">
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

const MAX_IMAGEN_MB = 8;

function ImageUploadField({
  value,
  onChange,
  carpeta,
  onError,
}: {
  value: string;
  onChange: (url: string) => void;
  carpeta: "ambientes" | "eventos";
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file || uploading) return;

    if (!file.type.startsWith("image/")) {
      onError("Selecciona un archivo de imagen (JPG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      onError(`La imagen no debe superar ${MAX_IMAGEN_MB} MB.`);
      return;
    }

    setImgError(false);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("imagen", file);
      body.append("carpeta", carpeta);
      const res = await apiFetch("/social/imagenes", { method: "POST", body });
      onChange(res.url);
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

      {value && !imgError ? (
        <div className="admin-dropzone-preview">
          <img src={value} alt="Vista previa" onError={() => setImgError(true)} />
          {uploading && (
            <div className="admin-dropzone-overlay"><Loader2 size={20} className="admin-spin" /></div>
          )}
          <div className="admin-dropzone-preview-actions">
            <button title="Cambiar la imagen" type="button" className="secondary-btn" disabled={uploading}
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload size={13} /> Cambiar
            </button>
            <button title="Quitar la imagen" type="button" className="secondary-btn danger" disabled={uploading}
              onClick={e => { e.stopPropagation(); onChange(""); }}>
              <X size={13} /> Quitar
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
      {imgError && value && !uploading && (
        <small className="field-hint field-hint-warn">No se pudo cargar esa imagen. Intenta subirla de nuevo.</small>
      )}
    </div>
  );
}

function SectionTable({
  title,
  action,
  onAction,
  exportar,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  exportar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="section-view" aria-label={title}>
      <div className="section-header">
        <div>
          <span className="card-kicker">GESTIÓN</span>
        </div>
        {(action || exportar) && (
          <div className="export-actions">
            {exportar}
            {action && (
              <button title={action} className="primary-btn" onClick={onAction}>
                <Plus size={16} /> {action}
              </button>
            )}
          </div>
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

const FILTRO_ESTADO_EVENTO: ExportFiltro = {
  clave: "estado", etiqueta: "Estado", tipo: "select",
  opciones: [{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }],
};
const FILTRO_ESTADO_RESERVA: ExportFiltro = {
  clave: "estado", etiqueta: "Estado", tipo: "select",
  opciones: [
    { value: "pendiente", label: "Pendiente" }, { value: "confirmada", label: "Confirmada" },
    { value: "cancelada", label: "Cancelada" }, { value: "completada", label: "Completada" },
  ],
};
const FILTRO_ESTADO_USUARIO: ExportFiltro = {
  clave: "estado", etiqueta: "Estado", tipo: "select",
  opciones: [{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }],
};
const FILTROS_FECHA: ExportFiltro[] = [
  { clave: "fecha_desde", etiqueta: "Desde", tipo: "fecha" },
  { clave: "fecha_hasta", etiqueta: "Hasta", tipo: "fecha" },
];

function AdminFotoMenu({
  fotoUrl,
  nombre,
  iniciales,
  subiendo,
  onCambiar,
}: {
  fotoUrl?: string | null;
  nombre?: string;
  iniciales?: string;
  subiendo: boolean;
  onCambiar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [viendo, setViendo] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const alternarMenu = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ left: Math.max(8, r.left), bottom: window.innerHeight - r.top + 8 });
    setMenu((abierto) => !abierto);
  };

  useEffect(() => {
    if (!menu) return;
    // El menú vive fuera del avatar (portal), por eso se revisan los dos contenedores.
    const alClickFuera = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (ref.current?.contains(objetivo) || listaRef.current?.contains(objetivo)) return;
      setMenu(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    const cerrar = () => setMenu(false);
    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alTecla);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alTecla);
      window.removeEventListener("resize", cerrar);
    };
  }, [menu]);

  useEffect(() => {
    if (!viendo) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViendo(false);
    };
    document.addEventListener("keydown", alTecla);
    return () => document.removeEventListener("keydown", alTecla);
  }, [viendo]);

  // Menú y visor se montan en .social-admin: fuera de la barra lateral (que recorta y tiene transform)
  // y dentro del contenedor que trae el modo oscuro y las variables del admin.
  const destino = document.querySelector(".social-admin") ?? document.body;

  return (
    <div className="admin-foto-menu" ref={ref}>
      <div
        className="admin-avatar admin-avatar-btn"
        role="button"
        tabIndex={0}
        title="Foto de perfil"
        aria-label="Opciones de foto de perfil"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={alternarMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alternarMenu();
          }
        }}
      >
        {subiendo ? (
          <Loader2 size={16} className="admin-spin" />
        ) : fotoUrl ? (
          <img src={fotoUrl} alt="" />
        ) : (
          iniciales
        )}
      </div>

      {menu && pos &&
        createPortal(
          <div
            ref={listaRef}
            className="admin-foto-list admin-card"
            role="menu"
            style={{ left: pos.left, bottom: pos.bottom }}
          >
            {fotoUrl && (
              <button
                type="button"
                role="menuitem"
                className="secondary-btn"
                onClick={() => {
                  setMenu(false);
                  setViendo(true);
                }}
              >
                <Eye size={14} /> Ver foto
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="secondary-btn"
              onClick={() => {
                setMenu(false);
                onCambiar();
              }}
            >
              <Upload size={14} /> {fotoUrl ? "Cambiar foto" : "Subir foto"}
            </button>
          </div>,
          destino,
        )}

      {viendo && fotoUrl &&
        createPortal(
          <div
            className="afv-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Foto de perfil"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setViendo(false);
            }}
          >
            <div className="afv-caja">
              <button
                type="button"
                className="afv-cerrar"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={() => setViendo(false)}
              >
                <X size={18} />
              </button>
              <img
                className="afv-img"
                src={fotoUrl}
                alt={`Foto de perfil de ${nombre ?? "tu cuenta"}`}
              />
              <button
                type="button"
                className="primary-btn afv-cambiar"
                onClick={() => {
                  setViendo(false);
                  onCambiar();
                }}
              >
                <Upload size={14} /> Cambiar foto
              </button>
            </div>
          </div>,
          destino,
        )}
    </div>
  );
}

function AdminPage() {
  const { user, logout, updateFotoUrl } = useAuth();
  const esSuperAdmin = esSuperAdminRoles(user?.roles ?? []);
  const controlPermisos = usePermisos();
  const puedeEditar = (seccion: string) => controlPermisos.puede(seccion, "editar");
  const puedeEliminar = (seccion: string) => controlPermisos.puede(seccion, "eliminar");
  // Ventana de confirmación con el diseño del panel (reemplaza window.confirm).
  const { confirmar, dialogo } = useConfirmacion();
  const {
    darkMode,
    toggleDark,
    fontSize,
    setFontSize,
    dyslexia,
    setDyslexia,
    reset,
  } = useAccessibility();

  // Pinta el fondo de la página con el color del admin mientras esta pantalla está montada,
  // así nunca asoma el fondo claro del sitio por debajo del panel (zoom / A-).
  useEffect(() => {
    const bg = darkMode ? "#0e1420" : "#f4f6fa";
    const html = document.documentElement;
    const prevHtml = html.style.background;
    const prevBody = document.body.style.background;
    html.style.background = bg;
    document.body.style.background = bg;
    return () => {
      html.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, [darkMode]);

  // Si se llega con un enlace directo (?seccion=pqr) se ignora la última vista guardada:
  // ni la sección ni el formulario que había abierto se restauran.
  const [saved] = useState<SavedView>(() => {
    const pedida = new URLSearchParams(window.location.search).get("seccion") as Section | null;
    if (pedida && SECCIONES.includes(pedida)) return { section: pedida, modal: null, editId: null };
    return readSavedView();
  });
  const persistReady = useRef(false);

  const [section, setSection] = useState<Section>(saved.section);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Avisos arriba a la derecha (verde si salió bien, rojo si no)
  const { avisar: notify, avisos } = useAvisos();
  const [loading, setLoading] = useState(true); // true desde el inicio: sin "flash" de tarjetas en cero
  // true después de la primera carga: las recargas no vuelven a mostrar la pantalla de carga.
  const [cargoUnaVez, setCargoUnaVez] = useState(false);

  const fotoInputRef = useRef<HTMLInputElement>(null);
const [subiendoFoto, setSubiendoFoto] = useState(false);

const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const original = e.target.files?.[0];
  e.target.value = "";
  if (!original) return;
  if (!original.type.startsWith("image/")) {
    notify("El archivo debe ser una imagen (JPG, PNG o WEBP).", "error");
    return;
  }

  setSubiendoFoto(true);
  try {
    const file = await prepararImagen(original);
    if (file.size > 3 * 1024 * 1024) {
      notify("La imagen no debe superar 3 MB.", "error");
      return;
    }
    const formData = new FormData();
    formData.append("foto", file);
    const data = await apiFetch("/perfil/foto", { method: "POST", body: formData });
    if (data?.foto_url) updateFotoUrl(data.foto_url);
    notify("Foto de perfil actualizada");
  } catch (err) {
    notify(err instanceof Error ? err.message : "No se pudo subir la foto.", "error");
  } finally {
    setSubiendoFoto(false);
  }
};

  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [eventos, setEventos] = useState<EventoSocial[]>([]);
  // Reservas e ingresos por evento (GET /estadisticas/eventos-sociales, solo admins).
  const [cifrasEventos, setCifrasEventos] = useState<Record<number, CifrasEventoSocial>>({});
  // Evento cuyo resumen (cifras completas) está abierto.
  const [resumenEvento, setResumenEvento] = useState<EventoSocial | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  // KPIs reales del módulo de reservas (GET /reservas/resumen).
  const [resumenReservas, setResumenReservas] = useState<ResumenReservas | null>(null);
  // Reserva abierta en el detalle (null = se muestra el listado).
  const [reservaAbierta, setReservaAbierta] = useState<number | null>(null);
  const [pqrs, setPqrs] = useState<Pqr[]>([]);
  const [pqrResumen, setPqrResumen] = useState<Partial<Record<EstadoPqr, number>>>({});
  const [pqrTotal, setPqrTotal] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);

  // Los formularios de "crear" se restauran de inmediato; los de "editar"
  // esperan a que lleguen los datos (ver restauración tras loadAll).
  const [modal, setModal] = useState<ModalKind | null>(
    !controlPermisos.esAsistente && saved.modal && saved.editId == null && saved.modal !== "pqr" ? saved.modal : null
  );
  const [editing, setEditing] = useState<any>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, s, e, r, p, t] = await Promise.all([
        controlPermisos.puedeVerSeccion("lugares") ? apiFetch("/ambientes") : Promise.resolve({ data: [] }),
        controlPermisos.puedeVerSeccion("servicios") ? apiFetch("/servicios") : Promise.resolve({ data: [] }),
        controlPermisos.puedeVerSeccion("eventos") ? apiFetch("/eventos-sociales?per_page=200") : Promise.resolve({ data: [] }),
        controlPermisos.puedeVerSeccion("reservas") ?         apiFetch("/reservas?per_page=100") : Promise.resolve({ data: [] }),

        // El backend pagina de 15 en 15; el panel pide hasta 100 de una vez.
        controlPermisos.puedeVerSeccion("pqr") ? apiFetch("/pqr?per_page=100") : Promise.resolve({ data: [], resumen: {}, total: 0 }), // Filtramos por módulo en el backend; igual filtramos otra vez abajo
        // por si el backend todavía no tiene la migración de modulo_tipo_eves.
        controlPermisos.puedeVerSeccion("eventos") ? apiFetch("/tipos-evento?modulo=social") : Promise.resolve({ data: [] }),
      ]);
      setAmbientes(a.data ?? []);
      setServicios(s.data ?? []);
      setEventos(e.data ?? []);
      // Si falla (p. ej. un asistente sin permiso), la tabla sigue funcionando sin las cifras.
      if (controlPermisos.puedeVerSeccion("eventos")) {
        apiFetch("/estadisticas/eventos-sociales")
          .then((c) => setCifrasEventos(c?.data ?? {}))
          .catch(() => setCifrasEventos({}));
      }
      setReservas(r.data ?? []);
      // Si el resumen falla, el resto del panel sigue funcionando.
      try {
        setResumenReservas(await reservaService.resumen());
      } catch {
        setResumenReservas(null);
      }
      setPqrs(p.data ?? []);

      setPqrResumen(p.resumen ?? {});
      setPqrTotal(p.total ?? 0);
      // Nunca mostramos clasificaciones de Deportivo (ej. Ciclomontañismo)
      // en el selector de "Tipo de evento" de un evento social.
      setTipos((t.data ?? []).filter((tipo: TipoEvento) => tipo.modulo_tipo_eves !== "deportivo"));
      try {
        if (!controlPermisos.puedeVerSeccion("usuarios")) {
          setUsers([]);
          return { ambientes: a.data ?? [], servicios: s.data ?? [], eventos: e.data ?? [], pqrs: p.data ?? [] };
        }
        const u = await apiFetch("/users?per_page=200");
        setUsers(u.data ?? u.users ?? []);
      } catch (error) {
        setUsers([]);
        notify(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.", "error");
      }
      return { ambientes: a.data ?? [], servicios: s.data ?? [], eventos: e.data ?? [], pqrs: p.data ?? [] };
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron cargar los datos.", "error");
    } finally {
      setLoading(false);
      setCargoUnaVez(true);
    }
  };

  useEffect(() => {
    if (controlPermisos.cargando) return;
    loadAll().then(data => {
      // Si se recargó con un formulario de "editar" abierto, se vuelve a abrir
      // con el registro correspondiente (ya cargado desde la API).
      if (!controlPermisos.esAsistente && data && saved.modal && saved.editId != null) {
        const lista: any[] | undefined = {
          ambiente: data.ambientes,
          servicio: data.servicios,
          evento: data.eventos,
          pqr: data.pqrs,
          reserva: undefined,
          usuario: undefined, // el formulario de usuario nunca se restaura (lleva contraseña)
          "editar-usuario": undefined, // se vuelve a abrir desde la tabla, con los datos del servidor
          roles: undefined,
        }[saved.modal];
        const item = lista?.find(x => String(editIdOf(saved.modal, x)) === String(saved.editId));
        if (item) {
          persistReady.current = true;
          setEditing(item);
          setModal(saved.modal);
          return;
        }
      }
      persistReady.current = true;
      // El registro que estaba en edición ya no existe: se limpia lo guardado.
      if (saved.editId != null) writeSavedView({ section: saved.section, modal: null, editId: null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlPermisos.cargando, controlPermisos.permisos]);

  // Guarda la vista cada vez que cambia la sección o el formulario abierto.
  useEffect(() => {
    if (!persistReady.current) return;
    writeSavedView({ section, modal, editId: editIdOf(modal, editing) });
  }, [section, modal, editing]);

  const selectSection = (next: Section) => {
    setSection(next);
    setReservaAbierta(null);
    setSearch("");
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!controlPermisos.cargando && controlPermisos.esAsistente &&
      !controlPermisos.puedeVerSeccion(section)) {
      const primera = controlPermisos.primeraSeccion ?? primeraSeccionPermitida("social", controlPermisos.permisos);
      const primeraDelPanel = SECCIONES.find((key) => key === primera);
      if (primeraDelPanel) selectSection(primeraDelPanel);
    }
  }, [controlPermisos.cargando, controlPermisos.esAsistente, controlPermisos.permisos, section]);

  // Un enlace (p. ej. un botón de SKAI) puede abrir una sección directo:
  // ?seccion=kits. Luego se limpia la URL para que recargar no la fuerce.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const pedida = params.get("seccion") as Section | null;
    if (pedida && SECCIONES.includes(pedida)) {
      selectSection(pedida);
      setParams({}, { replace: true });
    }
  }, [params]);

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
  // Solo los usuarios del módulo social (igual que el panel deportivo con los suyos).
  const usersModulo = users.filter((u) => perteneceAlModulo(u, "social"));
  const visibleUsers = usersModulo.filter((u) => filtered(`${u.nombre_u} ${u.apellido_u ?? ""} ${u.correo_u}`));


  const stats = useMemo(() => ({
    users: usersModulo.length,
    events: eventos.length,
    reservations: reservas.length,
    pending: reservas.filter((r) => r.estado_rese === "pendiente").length,
    pqrs: pqrs.filter((p) => p.estado_pqr !== "resuelto" && p.estado_pqr !== "cerrado").length,
    income: reservas
      .filter((r) => r.estado_rese === "confirmada")
      .reduce((sum, r) => sum + Number(r.total_rese || 0), 0),
  }), [users, eventos, reservas, pqrs]);

  const autorizadoEnModulo = !!user && (
    user.roles.includes("adminSocial") ||
    (controlPermisos.esAsistente && controlPermisos.modulo === "social")
  );
  if (!autorizadoEnModulo) return <Navigate to="/social" replace />;
  if (controlPermisos.cargando) return <CargandoPanel modulo="social" />;
  if (controlPermisos.errorCarga) {
    return <main className="social-admin"><section className="admin-card" role="alert"><h1>No se pudieron cargar tus permisos</h1><p>{controlPermisos.errorCarga}</p><button className="primary-btn" onClick={() => void controlPermisos.refrescar()}>Reintentar</button></section></main>;
  }
  if (controlPermisos.esAsistente && !controlPermisos.primeraSeccion) {
    return <main className="social-admin"><section className="admin-card"><h1>Sin secciones habilitadas</h1><p>Solicita al administrador que te asigne al menos una sección.</p><button className="primary-btn" onClick={logout}>Cerrar sesión</button></section></main>;
  }
  if (controlPermisos.esAsistente &&
    (section === "asistentes" || section === "copias" || section === "ajustes" || !controlPermisos.puedeVerSeccion(section))) {
    return <CargandoPanel modulo="social" />;
  }
  const seccionesPanel = controlPermisos.esAsistente
    ? SECCIONES.filter((key) => key !== "asistentes" && key !== "copias" && key !== "ajustes" && controlPermisos.puedeVerSeccion(key))
    : SECCIONES;

  const sectionMeta: Record<Section, { label: string; icon: any }> = {
    asistentes: { label: "Asistentes", icon: UserPlus },
    inicio: { label: "Inicio", icon: LayoutDashboard },
    eventos: { label: "Eventos", icon: CalendarDays },
    reservas: { label: "Reservas", icon: CalendarCheck2 },
    usuarios: { label: "Usuarios", icon: Users },
    pqr: { label: "PQRS", icon: MessageSquareText },
    lugares: { label: "Lugares", icon: Building2 },
    servicios: { label: "Servicios", icon: Wrench },
    copias: { label: "Copias de seguridad", icon: DatabaseBackup },
    ajustes: { label: "Ajustes", icon: Settings },
    ayuda: { label: "Administrar ayuda", icon: LifeBuoy },
  };

  const accent = "#9c02ae"; // color de marca del panel
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
    if (!(await confirmar({ titulo: "Eliminar ambiente", mensaje: "¿Eliminar este ambiente? Esta acción no se puede deshacer.", confirmar: "Eliminar", tipo: "peligro" }))) return;
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
    if (!(await confirmar({ titulo: "Eliminar servicio", mensaje: "¿Eliminar este servicio? Esta acción no se puede deshacer.", confirmar: "Eliminar", tipo: "peligro" }))) return;
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
    if (!(await confirmar({ titulo: "Eliminar evento", mensaje: "¿Eliminar este evento social? Esta acción no se puede deshacer.", confirmar: "Eliminar", tipo: "peligro" }))) return;
    await apiFetch(`/eventos-sociales/${id}`, { method: "DELETE" });
    notify("Evento eliminado");
    await loadAll();
  };

  // Oculta la reserva solo de la vista del admin; el usuario sigue viéndola.
  const hideReserva = async (id: number) => {
    if (!(await confirmar({ titulo: "Ocultar reserva", mensaje: "¿Ocultar esta reserva de tu panel? El cliente la sigue viendo.", confirmar: "Ocultar" }))) return;
    try {
      await apiFetch(`/reservas/${id}/ocultar`, {
        method: "POST",
        body: JSON.stringify({ vista: "admin" }),
      });
      notify("Reserva oculta");
      await loadAll();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo ocultar la reserva.", "error");
    }
  };

  const updateReserva = async (id: number, estado_rese: Reserva["estado_rese"]) => {
    await apiFetch(`/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado_rese }),
    });
    notify("Reserva actualizada");
    await loadAll();
  };



  return (
    <div
      className={`social-admin ${darkMode ? "dark" : ""} ${dyslexia ? "dyslexia" : ""} ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      style={{ "--admin-accent": accent, "--admin-scale": scale } as React.CSSProperties}
    >
      <header className="admin-header">
        <div className="admin-header-left">
          <button title={'Abrir o cerrar el menú lateral'}
            className="icon-btn header-menu"
            onClick={() => window.innerWidth <= 900 ? setMobileOpen(v => !v) : setCollapsed(v => !v)}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>
          <Link title="Ir al inicio de SKYED Social" to="/social" className="admin-brand">
            <img src="/assets/social/logo_social.png" alt="Skyed Social" />
            <span>Skyed <em>Social</em></span>
          </Link>
        </div>

        {/* Atajos: volver a la página pública del módulo o al inicio de SKYED */}
        <div className="admin-header-right" role="navigation" aria-label="Salir del panel">
          <Link to="/social" className="icon-btn" title="Ir a Skyed Social" aria-label="Ir a la página de Skyed Social">
            <ArrowLeft size={19} />
          </Link>
          <Link to="/" className="icon-btn" title="Volver a SKYED Principal" aria-label="Volver al inicio principal">
            <House size={19} />
          </Link>
        </div>
      </header>

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/assets/social/logo_social.png" alt="Skyed Social" width={37} height={37} style={{ width: 37, height: 37, maxWidth: 37, flex: "0 0 37px" }} />
          {/* El nombre del módulo ya está en el encabezado; aquí solo "Administración" */}
          <div className="sidebar-brand-text">
            <span>ADMINISTRACIÓN</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-caption">GESTIÓN</p>
          {seccionesPanel.filter(key => key !== "ajustes" && key !== "asistentes").map(key => {
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
          {!controlPermisos.esAsistente && <>
            <p className="nav-caption">CUENTA</p>
            <button
              className={`admin-nav-item ${section === "asistentes" ? "active" : ""}`}
              onClick={() => selectSection("asistentes")}
              title={sectionMeta.asistentes.label}
            >
              <UserPlus size={18} />
              <span>{sectionMeta.asistentes.label}</span>
            </button>
            <button
              className={`admin-nav-item ${section === "ajustes" ? "active" : ""}`}
              onClick={() => selectSection("ajustes")}
              title={sectionMeta.ajustes.label}
            >
              <Settings size={18} />
              <span>{sectionMeta.ajustes.label}</span>
            </button>
          </>}
        </nav>

        <div className="sidebar-footer">
          <AdminFotoMenu
            fotoUrl={user.foto_url}
            nombre={user.name}
            iniciales={user.name?.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()}
            subiendo={subiendoFoto}
            onCambiar={() => fotoInputRef.current?.click()}
          />
          <input ref={fotoInputRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />
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
          {section !== "ajustes" && section !== "copias" && section !== "ayuda" && <label className="admin-search">
            <Search size={17} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en esta sección..."
            />
            {search && (
              <button title="Borrar la búsqueda" onClick={() => setSearch("")} aria-label="Limpiar">
                <X size={15} />
              </button>
            )}
          </label>}
        </div>

        {/* Solo en la carga inicial; al recargar tras una acción no se muestra
            (así la pantalla no salta). */}
        {loading && !cargoUnaVez && <CargandoPanel modulo="social" />}

        {section === "asistentes" && (
          <AsistentesPanel
            modulo="social"
            search={search}
            notify={notify}
            correoAdmin={user.email}
            confirmar={confirmar}
          />
        )}

        {section === "inicio" && (
          <section className="dashboard-content">
            <div className="kpi-grid">
              {controlPermisos.puedeVerSeccion("usuarios") && <Kpi icon={<Users size={19} />} label="Usuarios" value={stats.users} />}
              {controlPermisos.puedeVerSeccion("eventos") && <Kpi icon={<CalendarDays size={19} />} label="Eventos" value={stats.events} />}
              {controlPermisos.puedeVerSeccion("reservas") && <>
                <Kpi icon={<CalendarCheck2 size={19} />} label="Reservas" value={stats.reservations} />
                <Kpi icon={<Wrench size={19} />} label="Ingresos confirmados" value={stats.income} formato={money} compact />
              </>}
              {controlPermisos.puedeVerSeccion("pqr") && <Kpi icon={<MessageSquareText size={19} />} label="PQR pendientes" value={stats.pqrs} />}
            </div>

            {resumenReservas && (
              <>


                <div className="dashboard-grid-main">
                  <section className="admin-card upcoming-card">
                    <div className="card-head">
                      <div>
                        <span className="card-kicker">AGENDA</span>
                        <h2>Próximos eventos</h2>
                      </div>
                      <button className="link-button" onClick={() => selectSection("reservas")}>Ver reservas →</button>
                    </div>
                    <div className="reservation-list">
                      {resumenReservas.proximos.map((p) => (
                        <div className="reservation-item" key={p.id_rese} role="button" tabIndex={0} style={{ cursor: "pointer" }}
                          onClick={() => { setSection("reservas"); setReservaAbierta(p.id_rese); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { setSection("reservas"); setReservaAbierta(p.id_rese); } }}>
                          <div className="mini-avatar">R{p.id_rese}</div>
                          <div className="reservation-main">
                            <strong>{p.titulo}</strong>
                            <span>{fechaCorta(p.fecha_inicio)} · {FECHA_TIPO_LABEL[p.fecha_tipo]}</span>
                          </div>
                          <div className="reservation-side">
                            <span className={`admin-badge ${p.estado_visual}`}>{ESTADO_VISUAL_LABEL[p.estado_visual]}</span>
                          </div>
                        </div>
                      ))}
                      {!resumenReservas.proximos.length && <p>No hay eventos próximos.</p>}
                    </div>
                  </section>

                  <section className="admin-card upcoming-card">
                    <div className="card-head">
                      <div>
                        <span className="card-kicker">ATENCIÓN</span>
                        <h2>Alertas</h2>
                      </div>
                    </div>
                    <div className="resx-alertas">
                      {resumenReservas.alertas.map((a, i) => (
                        <div className={`resx-alerta ${a.nivel}`} key={`${a.tipo}-${a.id_rese}-${i}`}>
                          <span>{a.mensaje}</span>
                          <button className="link-button" style={{ marginLeft: "auto" }} onClick={() => { setSection("reservas"); setReservaAbierta(a.id_rese); }}>Ver →</button>
                        </div>
                      ))}
                      {!resumenReservas.alertas.length && <p>Todo al día. No hay alertas.</p>}
                    </div>
                  </section>
                </div>
              </>
            )}

            <AdminCalendarioReservas
              version={resumenReservas}
              onVer={(id) => { setSection("reservas"); setReservaAbierta(id); }}
            />

            <div className="dashboard-grid-main">
              <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">ACTIVIDAD</span>
                    
                    <h2>Últimas reservas</h2>
                  </div>
                  <button title="Ver todas las reservas" className="link-button" onClick={() => selectSection("reservas")}>Ver todas →</button>
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

              {(controlPermisos.puedeVerSeccion("lugares") || controlPermisos.puedeVerSeccion("servicios") || controlPermisos.puedeVerSeccion("eventos")) && <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">CATÁLOGO</span>
                    <h2>Resumen</h2>
                  </div>
                </div>
                <div className="resource-list">
                  {controlPermisos.puedeVerSeccion("lugares") && <div className="resource-item">
                    <div className="resource-icon"><Building2 size={18} /></div>
                    <div className="resource-main"><strong>Ambientes </strong><span>  {ambientes.length} registrados</span></div>
                  </div>}
                  {controlPermisos.puedeVerSeccion("servicios") && <div className="resource-item">
                    <div className="resource-icon"><Wrench size={18} /></div>
                    <div className="resource-main"><strong>Servicios </strong><span>  {servicios.length} registrados</span></div>
                  </div>}
                  {controlPermisos.puedeVerSeccion("eventos") && <div className="resource-item">
                    <div className="resource-icon"><CalendarDays size={18} /></div>
                    <div className="resource-main"><strong>Eventos sociales </strong><span>  {eventos.filter(e => e.estado_er === "activo").length} activos</span></div>
                  </div>}
                </div>
              </section>}
            </div>
          </section>
        )}

        {section === "lugares" && (
<SectionTable
            title="Gestión de ambientes"
            action={puedeEditar("lugares") ? "Nuevo ambiente" : undefined}
            onAction={() => { setEditing(null); setModal("ambiente"); }}
            exportar={<ExportMenu ruta="social/ambientes" archivo="skyed-social-ambientes" params={{ q: search }} onMensaje={notify} />}
          >

            <thead><tr><th>Foto</th><th>ID</th><th>Nombre</th><th>Capacidad</th><th>Precio referencia</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleAmbientes.map(a => (
                <tr key={a.id_a}>
                  <td>
                    {a.imagen_principal_a
                      ? <img className="admin-thumb" src={a.imagen_principal_a} alt={a.nombre_a} onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                      : <span className="admin-thumb admin-thumb-empty" title="Sin foto">—</span>}
                  </td>
                  <td>#{a.id_a}</td><td><strong>{a.nombre_a}</strong></td><td>{a.capacidad_a}</td>
                  <td>{money(a.precio_referencia_a)}</td>
                  <td><div className="row-actions">
                    {puedeEditar("lugares") && <button title="Editar este ambiente" className="table-action" onClick={() => { setEditing(a); setModal("ambiente"); }}><Pencil size={15} /></button>}
                    {puedeEliminar("lugares") && <button title="Eliminar este ambiente" className="table-action danger" onClick={() => deleteAmbiente(a.id_a)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
              {!visibleAmbientes.length && <tr><td colSpan={6}>No hay ambientes.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "servicios" && (
<SectionTable
            title="Gestión de servicios"
            action={puedeEditar("servicios") ? "Nuevo servicio" : undefined}
            onAction={() => { setEditing(null); setModal("servicio"); }}
            exportar={<ExportMenu ruta="social/servicios" archivo="skyed-social-servicios" params={{ q: search }} onMensaje={notify} />}
          >
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
                    {puedeEditar("servicios") && <button title="Editar este servicio" className="table-action" onClick={() => { setEditing(s); setModal("servicio"); }}><Pencil size={15} /></button>}
                    {puedeEliminar("servicios") && <button title="Eliminar este servicio" className="table-action danger" onClick={() => deleteServicio(id)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>;
              })}
              {!visibleServicios.length && <tr><td colSpan={5}>No hay servicios.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "eventos" && (
<SectionTable
            title="Gestión de eventos sociales"
            action={puedeEditar("eventos") ? "Nuevo evento" : undefined}
            onAction={() => { setEditing(null); setModal("evento"); }}
            exportar={<ExportMenu ruta="social/eventos" archivo="skyed-social-eventos" params={{ q: search }} filtros={[FILTRO_ESTADO_EVENTO, ...FILTROS_FECHA]} onMensaje={notify} />}
          >
            <thead><tr><th>Foto</th><th>ID</th><th>Nombre</th><th>Fecha</th><th>Reservas</th><th>Ingresos</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleEventos.map(e => {
                const imageUrl = e.imagen_er ?? e.ambiente?.imagen_principal_a ?? undefined;

                return (
                  <tr key={e.id_er}>
                    <td>
                      {imageUrl
                        ? <img className="admin-thumb" src={imageUrl} alt={e.nombre_er} onError={ev => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />
                        : <span className="admin-thumb admin-thumb-empty" title="Sin foto">—</span>}
                    </td>
                    <td>#{e.id_er}</td><td><strong>{e.nombre_er}</strong></td><td>{formatDate(e.fecha_er)}</td>
                    <CeldasCifrasEventoSocial cifras={cifrasEventos[e.id_er]} />
                    <td><Badge value={e.estado_er} /></td>
                    <td><div className="row-actions">
                      <button title="Ver el resumen: reservas, ingresos y servicios más pedidos" className="table-action" onClick={() => setResumenEvento(e)}><BarChart3 size={15} /></button>
                      {puedeEditar("eventos") && <>
                        <button title="Editar este evento" className="table-action" onClick={() => { setEditing(e); setModal("evento"); }}><Pencil size={15} /></button>
                        <button title={e.estado_er === "activo" ? 'Desactivar este evento' : 'Activar este evento'} className="table-action" onClick={() => toggleEvento(e)}>{e.estado_er === "activo" ? "Desactivar" : "Activar"}</button>
                      </>}
                      {puedeEliminar("eventos") && <button title="Eliminar este evento" className="table-action danger" onClick={() => deleteEvento(e.id_er)}><Trash2 size={15} /></button>}
                    </div></td>
                  </tr>
                );
              })}
              {!visibleEventos.length && <tr><td colSpan={8}>No hay eventos sociales.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        {section === "reservas" && (
          reservaAbierta !== null ? (
            <AdminReservaDetalle
              key={reservaAbierta}
              id={reservaAbierta}
              onBack={() => { setReservaAbierta(null); void loadAll(); }}
              onChanged={async () => { await loadAll(); }}
              notify={notify}
              confirmar={confirmar}
            />
          ) : (
            <AdminReservasLista
              onVer={setReservaAbierta}
              tipos={tipos.map((t) => ({ id: t.id_tipo_eves, nombre: t.nombre_tipo_eves }))}
              ambientes={ambientes.map((x) => ({ id: x.id_a, nombre: x.nombre_a }))}
              onChanged={async () => { await loadAll(); }}
              notify={notify}
              confirmar={confirmar}
            />
          )
        )}

        {section === "pqr" && (
          <PqrGestion
            pqrs={pqrs}
            resumen={pqrResumen}
            total={pqrTotal}
            search={search}
            onChanged={async () => { await loadAll(); }}
            notify={notify}
            permitirGestion={puedeEditar("pqr")}
          />
        )}

        {section === "copias" && (
          <CopiasSeguridad modulo="social" notify={notify} confirmar={confirmar} />
        )}

        {section === "ayuda" && (
          <AyudaAdmin modulo="social" />
        )}

        {section === "ajustes" && (
          <AdminAjustes
            notify={notify}
            avisos={[
              { key: "reservas", title: "Nuevas reservas", desc: "Aviso cuando un cliente solicite una reserva" },
              { key: "pqr", title: "Nuevas PQRS", desc: "Aviso cuando se radique una petición, queja o reclamo" },
              { key: "eventos", title: "Eventos próximos", desc: "Recordatorio de eventos sociales de la semana", defecto: false },
            ]}
          />
        )}

        {section === "usuarios" && (
<SectionTable
            title="Usuarios registrados"
            exportar={<ExportMenu ruta="social/usuarios" archivo="skyed-social-usuarios" params={{ q: search }} filtros={[FILTRO_ESTADO_USUARIO]} onMensaje={notify} />}
          
            action={puedeEditar("usuarios") ? "Nuevo usuario" : undefined}
            onAction={() => { setEditing(null); setModal("usuario"); }}
          >
            <thead><tr><th>ID</th><th>Usuario</th><th>Roles</th><th>Estado</th>{puedeEditar("usuarios") && <th>Acciones</th>}</tr></thead>
            <tbody>
              {visibleUsers.map(u => (
                <tr key={u.id_u}>
                  <td><span className="usr-id">#{u.id_u}</span></td>
                  <td>
                    <div className="usr-celda">
                      <Avatar usuario={u} />
                      <div className="usr-celda-texto">
                        <strong>{u.nombre_u} {u.apellido_u ?? ""}</strong>
                        <small>{u.correo_u}</small>
                      </div>
                    </div>
                  </td>
                  <td><RolesDeUsuario usuario={u} modulo="social" /></td>
                  <td><Badge value={u.estado_u ?? "activo"} /></td>
                  {puedeEditar("usuarios") && (
                    <td>
                      <button type="button" className="usr-btn-roles usr-btn-editar" disabled={!puedeEditarUsuario(u, user)} title={puedeEditarUsuario(u, user) ? `Editar los datos de ${u.nombre_u}` : "Solo el super administrador puede editar a otro administrador"} onClick={() => { setEditing({ id_u: u.id_u }); setModal("editar-usuario"); }}>
                        <Pencil size={14} /> Editar
                      </button>
                      {esSuperAdmin && <button type="button" className="usr-btn-roles" title={`Gestionar los roles de ${u.nombre_u}`} onClick={() => { setEditing({ id_u: u.id_u }); setModal("roles"); }}>
                        <ShieldCheck size={14} /> Roles
                      </button>}
                    </td>
                  )}
                </tr>
              ))}
              {!usersModulo.length && <tr><td colSpan={puedeEditar("usuarios") ? 5 : 4}>No hay usuarios del módulo social.</td></tr>}
              {!!usersModulo.length && !visibleUsers.length && <tr><td colSpan={puedeEditar("usuarios") ? 5 : 4}>Ningún usuario coincide con la búsqueda.</td></tr>}
            </tbody>
          </SectionTable>
        )}

        <AdminFooter modulo="social" />
      </main>

      <AccessibilityWidget
        fontSize={fontSize}
        onFontSize={setFontSize}
        dyslexia={dyslexia}
        onDyslexia={setDyslexia}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onReset={reset}
      />

      {modal === "ambiente" && puedeEditar("lugares") && (
        <AmbienteModal
          item={editing}
          onClose={() => setModal(null)}
          onSave={editing ? data => updateAmbiente(editing.id_a, data) : createAmbiente}
          notify={notify}
        />
      )}

      {modal === "servicio" && puedeEditar("servicios") && (
        <ServicioModal
          item={editing}
          onClose={() => setModal(null)}
          onSave={editing
            ? data => updateServicio(editing.id_s ?? editing.id, data)
            : createServicio}
        />
      )}

      {modal === "evento" && puedeEditar("eventos") && (
        <EventoModal
          item={editing}
          ambientes={ambientes}
          tipos={tipos}
          onClose={() => setModal(null)}
          onSave={editing ? data => updateEvento(editing.id_er, data) : createEvento}
          notify={notify}
        />
      )}


      {modal === "editar-usuario" && editing?.id_u && puedeEditar("usuarios") && (
        <EditarUsuarioModal
          usuarioId={editing.id_u}
          yoId={user.id}
          existentes={users}
          onClose={() => setModal(null)}
          notify={notify}
          onGuardado={async () => { setModal(null); await loadAll(); }}
        />
      )}

      {modal === "roles" && puedeEditar("usuarios") && esSuperAdmin && (
        <RolesModal
          users={users}
          inicialId={editing?.id_u ?? null}
          yoId={user.id}
          modulo="social"
          esSuperAdmin={esSuperAdmin}
          onClose={() => setModal(null)}
          onCambio={async () => { await loadAll(); }}
          notify={notify}
          confirmar={confirmar}
        />
      )}

      {resumenEvento && (
        <ResumenSocial evento={resumenEvento} cifras={cifrasEventos[resumenEvento.id_er]} onClose={() => setResumenEvento(null)} />
      )}

      {modal === "usuario" && puedeEditar("usuarios") && (
        <UsuarioModal
          modulo="social"
          esSuperAdmin={esSuperAdmin}
          existentes={users}
          onClose={() => setModal(null)}
          notify={notify}
          onCreado={async () => { setModal(null); await loadAll(); }}
        />
      )}

      {avisos}
      {dialogo}
    </div>
  );
}

export default function Admin() {
  return <Protected><AdminPage /></Protected>;
}

function Kpi({ icon, label, value, compact, formato }: { icon: React.ReactNode; label: string; value: React.ReactNode; compact?: boolean; formato?: (v: number) => string }) {
  // Los números "cuentan" hasta su valor al aparecer.
  const contenido = typeof value === "number" ? <NumeroAnimado valor={value} formato={formato} /> : value;
  return <div className="kpi-card"><div className="kpi-icon">{icon}</div><span>{label}</span><strong className={compact ? "compact" : ""}>{contenido}</strong></div>;
}

function AmbienteModal({ item, onClose, onSave, notify }: { item?: Ambiente; onClose: () => void; onSave: (data: any) => Promise<void>; notify: Avisar }) {
  const [form, setForm] = useState({
    nombre_a: item?.nombre_a ?? "",
    descripcion_a: item?.descripcion_a ?? "",
    capacidad_a: item?.capacidad_a?.toString() ?? "",
    precio_referencia_a: item?.precio_referencia_a?.toString() ?? "",
    imagen_principal_a: item?.imagen_principal_a ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = sanitizeName(form.nombre_a).trim();
    const descripcion = sanitizeDescription(form.descripcion_a).trim();
    const capacidad = Number(form.capacidad_a);
    const precio = form.precio_referencia_a === "" ? undefined : Number(form.precio_referencia_a);
    const imagen = form.imagen_principal_a.trim();

    if (!nombre || !Number.isInteger(capacidad) || capacidad < 1) return;
    if (precio !== undefined && (!Number.isFinite(precio) || precio < 0 || precio > 9999999999)) return;
    if (!imagen) return;

    setSaving(true);
    try {
      await onSave({
        nombre_a: nombre,
        descripcion_a: descripcion || undefined,
        capacidad_a: capacidad,
        precio_referencia_a: precio,
        imagen_principal_a: imagen,
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
            pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-]+"
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
            max="9999999999"
            step="1"
            inputMode="numeric"
            value={form.precio_referencia_a}
            onChange={e => setForm({...form, precio_referencia_a: sanitizeMoney(e.target.value, 10)})}
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

      <Field label="Foto principal (obligatoria)">
        <ImageUploadField
          value={form.imagen_principal_a}
          onChange={url => setForm({...form, imagen_principal_a: url})}
          carpeta="ambientes"
          onError={notify}
        />
        <small className="field-hint">Esta foto es la que verán los clientes al elegir el lugar.</small>
      </Field>

      <div className="modal-actions">
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button title={saving ? 'Guardando…' : 'Guardar los cambios'} className="primary-btn" disabled={saving || !form.imagen_principal_a.trim()}>{saving ? "Guardando…" : "Guardar"}</button>
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
          pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-]+"
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
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button title={saving ? 'Guardando…' : 'Guardar los cambios'} className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

function EventoModal({ item, ambientes, tipos, onClose, onSave, notify }: { item?: EventoSocial; ambientes: Ambiente[]; tipos: TipoEvento[]; onClose: () => void; onSave: (data: any) => Promise<void>; notify: Avisar }) {
  const [form, setForm] = useState({
    nombre_er: item?.nombre_er ?? "",
    descripcion_er: item?.descripcion_er ?? "",
    fecha_er: item?.fecha_er?.slice(0,10) ?? "",
    imagen_er: item?.imagen_er ?? "",
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
        imagen_er: form.imagen_er.trim() || null,
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
            pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-]+"
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
          {!tipos.length && (
            <small className="field-hint field-hint-warn">
              No se pudieron cargar los tipos de evento. Recarga la página e intenta de nuevo.
            </small>
          )}
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

      <Field label="Imagen del evento (opcional)">
        <ImageUploadField
          value={form.imagen_er}
          onChange={url => setForm({...form, imagen_er: url})}
          carpeta="eventos"
          onError={notify}
        />
        <small className="field-hint">Si no subes una foto, se usará la del ambiente asignado.</small>
      </Field>

      <div className="modal-actions">
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button title={saving ? 'Guardando…' : 'Guardar los cambios'} className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

const PQR_ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};
const pqrEstadoLabel = (e: string) => PQR_ESTADO_LABEL[e] ?? human(e);

const dateTime = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
};

type PqrMsg = {
  key: string;
  de: "cliente" | "equipo" | "nota" | "sistema";
  texto: string;
  fecha?: string | null;
};

const PQR_RESPUESTA_GENERICA = "Se ha publicado una respuesta a tu solicitud.";

/** Une el mensaje inicial, los mensajes del cliente, las respuestas y las notas internas. */
function buildPqrThread(item: Pqr): PqrMsg[] {
  const segs = [...(item.seguimientos ?? [])].sort(
    (a, b) =>
      (Date.parse(a.created_at ?? "") || 0) - (Date.parse(b.created_at ?? "") || 0) ||
      a.id_seguimiento - b.id_seguimiento,
  );

  let ultimaRespuesta = -1;
  segs.forEach((sg, i) => { if (sg.tipo_evento === "respuesta") ultimaRespuesta = i; });

  const out: PqrMsg[] = [{ key: "inicio", de: "cliente", texto: item.mensaje_pqr, fecha: item.creado_en_pqr }];

  segs.forEach((sg, i) => {
    const key = `seg-${sg.id_seguimiento}`;
    let texto = (sg.comentario_publico ?? "").trim();

    if ((sg.tipo_evento as string) === "respuesta_cliente") {
      out.push({ key, de: "cliente", texto, fecha: sg.created_at });
    } else if ((sg.tipo_evento as string) === "respuesta" || (sg.tipo_evento as string) === "solicitud_informacion") {
      // Respuestas antiguas guardaban un texto genérico: la última se completa con la real.
      if (i === ultimaRespuesta && item.respuesta_pqr && (texto === "" || texto === PQR_RESPUESTA_GENERICA)) {
        texto = item.respuesta_pqr;
      }
      out.push({ key, de: "equipo", texto: texto || PQR_RESPUESTA_GENERICA, fecha: sg.created_at });
    } else if (sg.estado_anterior && sg.estado_nuevo) {
      out.push({
        key,
        de: "sistema",
        texto: `Estado: ${pqrEstadoLabel(sg.estado_anterior)} → ${pqrEstadoLabel(sg.estado_nuevo)}`,
        fecha: sg.created_at,
      });
    } else if (texto) {
      out.push({ key, de: "sistema", texto, fecha: sg.created_at });
    }

    const nota = (sg.nota_interna ?? "").trim();
    if (nota) out.push({ key: `${key}-nota`, de: "nota", texto: nota, fecha: sg.created_at });
  });

  // PQR respondidas antes de que existiera el historial.
  if (ultimaRespuesta === -1 && item.respuesta_pqr) {
    out.push({ key: "respuesta-antigua", de: "equipo", texto: item.respuesta_pqr, fecha: item.respondido_en_pqr });
  }

  return out;
}

function AdminPqrManager({
  pqrs,
  resumen,
  total,
  search,
  onChanged,
  notify,
  confirmar,
}: {
  pqrs: Pqr[];
  resumen: Partial<Record<EstadoPqr, number>>;
  total: number;
  search: string;
  onChanged: () => Promise<unknown>;
  notify: Avisar;
  confirmar: ReturnType<typeof useConfirmacion>["confirmar"];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // La lista /pqr no trae los seguimientos; el detalle sí (GET /pqr/{id}).
  const [detail, setDetail] = useState<Pqr | null>(null);
  const [texto, setTexto] = useState("");
  // "" = sin cambio manual. Solo "resuelto" y "cerrado" se eligen a mano.
  const [manual, setManual] = useState("");
  const [sending, setSending] = useState(false);

  const visible = pqrs.filter((item) =>
    `${item.id_pqr} ${item.mensaje_pqr} ${item.estado_pqr}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selected = visible.find((item) => item.id_pqr === selectedId) ?? visible[0];
  const selectedKey = selected?.id_pqr ?? null;
  const current = detail && detail.id_pqr === selectedKey ? detail : selected;

  // Carga el historial completo de la solicitud seleccionada.
  useEffect(() => {
    setTexto("");
    setManual("");
    setDetail((d) => (d && d.id_pqr === selectedKey ? d : null));
    if (selectedKey == null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/pqr/${selectedKey}`);
        if (!cancelled) setDetail(res.pqr ?? null);
      } catch (error) {
        if (!cancelled) notify(error instanceof Error ? error.message : "No se pudo cargar el historial.", "error");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedKey]);

  // Resuelta cierra el chat para el admin y para el usuario ("cerrado" queda por PQR antiguas).
  const cerrada = current?.estado_pqr === "resuelto" || current?.estado_pqr === "cerrado";
  const puedeOcultar = !!current && !["en_proceso", "en_revision"].includes(current.estado_pqr);

  // Oculta la solicitud solo de la vista del admin; el usuario sigue viéndola.
  const ocultar = async () => {
    if (!current) return;
    if (!(await confirmar({ titulo: "Ocultar solicitud", mensaje: "¿Ocultar esta solicitud de tu panel? El usuario la sigue viendo.", confirmar: "Ocultar" }))) return;
    try {
      await apiFetch(`/pqr/${current.id_pqr}/ocultar`, {
        method: "POST",
        body: JSON.stringify({ vista: "admin" }),
      });
      setSelectedId(null);
      setDetail(null);
      notify("Solicitud oculta");
      await onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo ocultar la solicitud.", "error");
    }
  };
  const manualOpciones = [
    { value: "", label: "Sin cambiar el estado" },
    { value: "resuelto", label: "Marcar como resuelta (cierra el chat)" },
  ];

  const enviar = async () => {
    if (!current || sending) return;
    const mensaje = texto.trim();
    if (!mensaje && !manual) {
      notify("Escribe una respuesta o elige cómo cerrar la solicitud.");
      return;
    }
    if (manual === "resuelto" && !mensaje && !current.respuesta_pqr) {
      notify("Para resolver la solicitud escribe la respuesta que recibirá el usuario.");
      return;
    }
    // Responder pasa la solicitud a "En proceso"; resolver y cerrar son manuales.
    const auto = mensaje && (current.estado_pqr === "abierto" || current.estado_pqr === "en_revision") ? "en_proceso" : "";
    const nuevo = manual || auto;
    setSending(true);
    try {
      const body: Record<string, string> = {};
      if (mensaje) body.respuesta_pqr = mensaje;
      if (nuevo && nuevo !== current.estado_pqr) body.estado_pqr = nuevo;
      const res = await apiFetch(`/pqr/${current.id_pqr}/seguimiento`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.pqr) setDetail(res.pqr);
      setTexto("");
      setManual("");
      notify("Respuesta enviada");
      await onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo enviar la respuesta.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section-view" aria-label="Solicitudes PQR">
      <div className="section-header">
        <div><span className="card-kicker">GESTIÓN</span></div>
      </div>
      <div className="kpi-grid">
        <Kpi icon={<MessageSquareText size={19} />} label="Total" value={total} />
        {Object.entries(resumen).map(([estadoKey, cantidad]) => (
          <Kpi key={estadoKey} icon={<Check size={19} />} label={pqrEstadoLabel(estadoKey)} value={cantidad ?? 0} />
        ))}
      </div>
      <div className="dashboard-grid-main">
        <div className="admin-card table-card">
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Solicitud</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id_pqr}
                    className={item.id_pqr === selectedKey ? "apqr-row-active" : undefined}
                    onClick={() => setSelectedId(item.id_pqr)}
                  >
                    <td>#{item.id_pqr}</td>
                    <td>{item.mensaje_pqr}</td>
                    <td>{dateTime(item.creado_en_pqr)}</td>
                    <td><Badge value={item.estado_pqr} /></td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={4}>No hay solicitudes PQR.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {current && (
          <section className="admin-card upcoming-card apqr-panel">
            <div className="card-head"><div><span className="card-kicker">SOLICITUD #{current.id_pqr}</span><h2>Historial</h2></div>
              {puedeOcultar && (
                <button title="Ocultar esta PQR de la lista" type="button" className="apqr-hide-btn" onClick={ocultar}><EyeOff size={15} /> Ocultar</button>
              )}
            </div>
            <div className="apqr-thread">
              {buildPqrThread(current).map((message) => (
                <div className={`apqr-msg apqr-msg--${message.de}`} key={message.key}>
                  {message.de === "sistema" ? (
                    <span className="apqr-system">{message.texto}</span>
                  ) : (
                    <div className="apqr-bubble">
                      <strong>{message.de === "cliente" ? "Cliente" : message.de === "equipo" ? "Equipo" : "Nota interna"}</strong>
                      <p>{message.texto}</p>
                      {message.fecha && <small>{dateTime(message.fecha)}</small>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {cerrada ? (
              <p className="apqr-closed">Esta solicitud fue resuelta y el chat está cerrado para ambas partes.</p>
            ) : (
              <div className="apqr-reply">
                <textarea
                  className="apqr-textarea"
                  rows={3}
                  maxLength={2000}
                  value={texto}
                  placeholder="Escribe tu respuesta al cliente"
                  onChange={(e) => setTexto(e.target.value)}
                />
                <p className="apqr-hint">Al enviar un mensaje, la solicitud pasa a En proceso.</p>
                <div className="apqr-reply-actions">
                  <select className="apqr-select" value={manual} onChange={(e) => setManual(e.target.value)}>
                    {manualOpciones.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button title={sending ? 'Enviando…' : 'Enviar la respuesta al usuario'} type="button" className="primary-btn" disabled={sending} onClick={enviar}>
                    {sending ? "Enviando…" : "Enviar respuesta"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}