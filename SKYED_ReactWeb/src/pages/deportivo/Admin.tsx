import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import jsQR from "jsqr";
import ExportMenu from "../../components/shared/ExportMenu";
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Camera,
  CameraOff,
  Check,
  ClipboardList,
  Eye,
  Handshake,
  ImagePlus,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LogOut,
  House,
  Menu,
  Map,
  MapPin,
  Package,
  DatabaseBackup,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  Trophy,
  Upload,
  Users,
  UserPlus,
  Wallet,
  X,
  LifeBuoy,
  BarChart3,
  MessageSquareText,
} from "lucide-react";
import { ResumenEventoModal, Indicador, BarraProgreso, ListaValores } from "../../components/shared/ResumenEvento";

import Protected from "../../components/Protected";
import { useAuth } from "../../context/AuthContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import AccessibilityWidget from "../../components/shared/AccessibilityWidget";
import AdminAjustes from "../../components/shared/AdminAjustes";
import CopiasSeguridad from "../../components/shared/CopiasSeguridad";
import { apiFetch } from "../../services/api";
import AdminPqrManager from "../../components/social/pqr/AdminPqrManager";
import type { Pqr, EstadoPqr } from "../../services/socialService";
import { prepararImagen } from "../../utils/prepararImagen";
import { createPortal } from "react-dom";
import { EstadoPagos, InscritosPorEvento, TendenciaMensual } from "../../components/deportivo/GraficosAdmin";
import { useConfirmacion } from "../../components/shared/ConfirmDialog";
import { useAvisos, type Avisar } from "../../components/shared/Avisos";
import { CargandoPanel, NumeroAnimado } from "../../components/shared/AdminMotion";
import AdminFooter from "../../components/shared/AdminFooter";
import { RolesModal, RolesDeUsuario, UsuarioModal, EditarUsuarioModal, puedeEditarUsuario, Avatar, esAdmin, perteneceAlModulo, type UsuarioFila } from "../../components/deportivo/UsuariosAdmin";
import AdminCatalogos, { EstacionForm, RutaForm, type CatalogoDeportivo, type EventoOpcion, type RutaEvento } from "../../components/deportivo/AdminCatalogos";
import AsistentesPanel from "../../features/asistentes/AsistentesPanel";
import { usePermisos } from "../../context/PermisosContext";
import { primeraSeccionPermitida } from "../../types/permisos";
import AyudaAdmin from "../../pages/admin/AyudaAdmin";
import { limpiarCampoValidacion, validarFormularioDeportivo } from "../../utils/validarFormularioDeportivo";

type Confirmar = ReturnType<typeof useConfirmacion>["confirmar"];
// Base del panel: mismo diseño del panel social con la paleta deportiva
// (aislado bajo .deportivo-admin). Los extras son lo propio de este panel.
import "../../styles/deportivo/Admin.css";
import "../../styles/deportivo/AdminExtras.css";

type Section =
  | "inicio"
  | "eventos"
  | CatalogoDeportivo
  | "inscripciones"
  | "acceso"
  | "resultados"
  | "kits"
  | "pqr"
  | "usuarios"
  | "asistentes"
  | "copias"
  | "ajustes"
  | "ayuda";

const SECCIONES: Section[] = ["inicio", "eventos", "patrocinadores", "rutas", "estaciones", "inscripciones", "acceso", "resultados", "kits", "pqr", "usuarios", "copias", "asistentes", "ajustes", "ayuda"];

const seccionDelegable = (seccion: string) =>
  seccion === "patrocinadores" || seccion === "rutas" || seccion === "estaciones"
    ? "eventos"
    : seccion;

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
  precio_k?: number | string | null;
  imagen_k?: string | null;
  imagen_url?: string | null;
  tallas?: { talla_kt: string; cantidad_kt: number }[];
  eventos?: { id_e: number; nombre_e: string }[];
  fecha_entrega_k?: string | null;
  lugar_entrega_k?: string | null;
  contenido_k?: string | null;
  talla_camiseta_k?: string | null;
  numero_dorsal_k?: number | null;
};

const moneda = (n: number | string | null | undefined) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;

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
    desea_kit_i?: boolean | null;
    talla_camiseta_i?: string | null;
    precio_pagado_i?: number | string | null;
    desglose_precios?: {
      inscripcion?: number | string | null;
      kit?: number | string | null;
      invitado?: number | string | null;
      kit_invitado?: number | string | null;
    } | null;
    invitado?: {
      nombre_inv?: string | null;
      apellido_inv?: string | null;
      desea_kit_inv?: boolean | null;
      talla_kit_inv?: string | null;
    } | null;
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

type UserRow = UsuarioFila;

type Ingreso = {
  ok: boolean;
  titulo: string;
  detalle: string[];
  hora: string;
  // Solo en accesos permitidos: para el historial ("Entrada 1 de 2").
  nombre?: string;
  evento?: string;
  entrada?: string;
};

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

/** Fecha local en formato YYYY-MM-DD (sin el corrimiento de zona horaria de toISOString). */
const isoLocal = (f: Date) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

/** Días antes del evento en que puede empezar la entrega del kit. */
const DIAS_ENTREGA_KIT = 10;

/**
 * Rango permitido para la fecha de entrega de un kit: desde 10 días antes del evento
 * hasta el día del evento.
 */
function rangoEntregaKit(fechaEvento: string | undefined): { min: string; max: string } | null {
  const base = fechaEvento?.slice(0, 10);
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(base)) return null;
  const [y, m, d] = base.split("-").map(Number);
  const max = base;
  const min = isoLocal(new Date(y, m - 1, d - DIAS_ENTREGA_KIT));
  return { min, max };
}

/* ================================================================
   VALIDACIONES (mismas reglas que el backend)
================================================================ */

const sanitizeText = (value: string, maxLength: number) =>
  value.replace(/\s{2,}/g, " ").slice(0, maxLength);

const sanitizeInteger = (value: string, maxLength = 7) =>
  value.replace(/\D/g, "").slice(0, maxLength);

/** Para lugares: sin números. Deja letras (con tildes y ñ), espacios y . , - ( ) */
const sanitizePlace = (value: string, maxLength: number) =>
  sanitizeText(value.replace(/[^\p{L}\s.,\-()]/gu, ""), maxLength);

/** Primera letra en mayúscula (solo para campos de texto libre). */
const capitalizeFirst = (value: string) =>
  value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/* ================================================================
   PERSISTENCIA (recargar la página no debe borrar lo que se escribe)
================================================================ */

const DRAFT_PREFIX = "admin_draft:";
/** Borrador del kit que se crea desde el formulario de un evento. */
const KIT_DESDE_EVENTO = "desde-evento";

/** Igual que useState, pero guarda el valor en sessionStorage bajo `key`. */
function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved !== null ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento disponible: el formulario sigue funcionando, solo no se recupera.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Borra todos los borradores de formularios (al guardar o cancelar). */
const clearDrafts = () => {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(DRAFT_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    // nada que limpiar
  }
};

const SECTION_KEY = "admin_section";
const SECTIONS_VALIDAS: string[] = SECCIONES;
type ModalKind = "evento" | "categorias" | "kit" | "pago" | "resultado" | "roles" | "usuario" | "editar-usuario" | null;

/** "1:05" → "01:05:00"; acepta HH:MM o HH:MM:SS del input type="time". */
const normalizarTiempo = (value: string) => {
  const partes = value.split(":").map((p) => p.padStart(2, "0"));
  while (partes.length < 3) partes.push("00");
  return partes.slice(0, 3).join(":");
};

/** "1 confirmado", "2 confirmados". */
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

type CifrasEventoDeportivo = {
  inscritos: number; confirmadas: number; pendientes: number; invitados: number; cupos_ocupados: number;
  recaudado: number; por_validar: number;
  desglose: { inscripciones: number; kits: number; invitados: number };
  asistencia: { esperados: number; asistieron: number };
  kits: { pedidos: number; entregados: number };
};

const CIFRAS_VACIAS: CifrasEventoDeportivo = {
  inscritos: 0, confirmadas: 0, pendientes: 0, invitados: 0, cupos_ocupados: 0, recaudado: 0, por_validar: 0,
  desglose: { inscripciones: 0, kits: 0, invitados: 0 }, asistencia: { esperados: 0, asistieron: 0 }, kits: { pedidos: 0, entregados: 0 },
};

/** Cupos: ocupados de total, con una barrita (roja si ya no quedan). */
function CeldaCupos({ disponibles, ocupados }: { disponibles: number; ocupados: number }) {
  const total = Number(disponibles || 0) + ocupados;
  const porcentaje = total > 0 ? Math.min(100, Math.round((ocupados / total) * 100)) : 0;
  return (
    <td className="evt-cifra evt-cupos" title={`${disponibles} cupos libres`}>
      <strong>{ocupados} / {total}</strong>
      <div className="evt-barra" aria-hidden="true"><span className={disponibles <= 0 ? "lleno" : ""} style={{ width: `${porcentaje}%` }} /></div>
      <small>{porcentaje} % ocupado</small>
    </td>
  );
}

/** Resumen completo de un evento deportivo. */
function ResumenDeportivo({ evento, cifras, onClose }: { evento: Evento; cifras?: CifrasEventoDeportivo; onClose: () => void }) {
  const c = cifras ?? CIFRAS_VACIAS;
  const totalCupos = Number(evento.cupos_disponibles || 0) + c.cupos_ocupados;
  const yaPaso = !!evento.fecha && new Date(`${evento.fecha.slice(0, 10)}T23:59:59`) < new Date();
  const faltanKits = Math.max(0, c.kits.pedidos - c.kits.entregados);
  return (
    <ResumenEventoModal titulo={evento.nombre} subtitulo={`Resumen del evento · ${formatDate(evento.fecha)}`} onClose={onClose}>
      <Indicador
        titulo="Inscritos"
        valor={c.inscritos}
        detalle={`${plural(c.confirmadas, "confirmado", "confirmados")} · ${c.pendientes} con el pago por validar${c.invitados ? ` · ${c.invitados} con invitado` : ""}`}
      />
      <Indicador titulo="Ocupación de cupos" valor={`${c.cupos_ocupados} de ${totalCupos}`} detalle={evento.cupos_disponibles === 1 ? "Queda 1 cupo libre." : `Quedan ${evento.cupos_disponibles} cupos libres.`}>
        <BarraProgreso actual={c.cupos_ocupados} total={totalCupos} etiqueta="Cupos ocupados" />
      </Indicador>
      <Indicador titulo="Dinero recaudado" valor={money(c.recaudado)} detalle="Solo pagos confirmados." ancho>
        <ListaValores filas={[
          { nombre: "Inscripciones", valor: money(c.desglose.inscripciones) },
          { nombre: "Kits", valor: money(c.desglose.kits) },
          { nombre: "Invitados", valor: money(c.desglose.invitados) },
          ...(c.por_validar > 0 ? [{ nombre: "Por validar (aún no cuenta)", valor: money(c.por_validar), destacado: true }] : []),
        ]} />
      </Indicador>
      <Indicador
        titulo="Asistencia con QR"
        valor={`${c.asistencia.asistieron} de ${c.asistencia.esperados}`}
        detalle={yaPaso || c.asistencia.asistieron > 0
          ? "Personas que entraron con su QR, frente a las inscritas con el pago confirmado (incluye invitados)."
          : "Se cuenta el día del evento, al escanear los QR en Control de acceso."}
      >
        <BarraProgreso actual={c.asistencia.asistieron} total={c.asistencia.esperados} etiqueta="Asistencia" />
      </Indicador>
      <Indicador
        titulo="Kits"
        valor={`${c.kits.entregados} de ${c.kits.pedidos} entregados`}
        detalle={c.kits.pedidos
          ? `${faltanKits ? `Faltan ${faltanKits} por entregar. ` : ""}Se entregan antes del evento, en Kits → Entregas kits.`
          : "Nadie ha pedido kit en este evento."}
      >
        <BarraProgreso actual={c.kits.entregados} total={c.kits.pedidos} etiqueta="Kits entregados" />
      </Indicador>
    </ResumenEventoModal>
  );
}

/** Inscritos y dinero recaudado de un evento, con el detalle de lo pendiente debajo. */
function CeldasCifrasEvento({ cifras }: { cifras?: CifrasEventoDeportivo }) {
  const c = cifras ?? CIFRAS_VACIAS;
  return <>
    <td className="evt-cifra" title={`${c.confirmadas} confirmadas · ${c.pendientes} con el pago por validar`}>
      <strong>{c.inscritos}</strong>
      {c.invitados > 0 && <small>+{c.invitados} {c.invitados === 1 ? "invitado" : "invitados"}</small>}
      {c.pendientes > 0 && <small className="evt-pendiente">{c.pendientes} por confirmar</small>}
    </td>
    <td className="evt-cifra" title="Solo cuenta los pagos confirmados">
      <strong>{money(c.recaudado)}</strong>
      {c.por_validar > 0 && <small className="evt-pendiente">{money(c.por_validar)} por validar</small>}
    </td>
  </>;
}

function Badge({ value }: { value: string }) {
  return <span className={`admin-badge ${value}`}>{human(value)}</span>;
}

function Modal({
  title,
  subtitle,
  onClose,
  closeOnBackdrop = true,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** En formularios va en false: un clic fuera no debe descartar lo escrito. */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => {
      if (closeOnBackdrop && e.target === e.currentTarget) onClose();
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
            <button title="Cambiar la imagen" type="button" className="secondary-btn" disabled={uploading}
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

/** Filas por página en las tablas del panel. */
const POR_PAGINA = 10;

/** Botones de paginación: Anterior, números de página y Siguiente. No se muestra si todo cabe en una página. */
function Paginador({ actual, ultima, total, onCambiar }: {
  actual: number;
  ultima: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) {
  if (ultima <= 1) return null;
  const desde = (actual - 1) * POR_PAGINA + 1;
  const hasta = Math.min(actual * POR_PAGINA, total);

  // Ventana de números alrededor de la página actual, con la primera y la última siempre visibles.
  const numeros: Array<number | "…"> = [];
  for (let n = 1; n <= ultima; n++) {
    if (n === 1 || n === ultima || Math.abs(n - actual) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== "…") numeros.push("…");
  }

  return (
    <div role="navigation" aria-label="Paginación" className="adp-barra">
      <button type="button" className="secondary-btn" disabled={actual <= 1} onClick={() => onCambiar(actual - 1)}>Anterior</button>
      {numeros.map((n, i) => n === "…"
        ? <span key={`p${i}`} className="adp-puntos" aria-hidden="true">…</span>
        : (
          <button
            key={n}
            type="button"
            className={n === actual ? "primary-btn" : "secondary-btn"}
            aria-current={n === actual ? "page" : undefined}
            aria-label={`Ir a la página ${n}`}
            onClick={() => onCambiar(n)}
          >{n}</button>
        ))}
      <button type="button" className="secondary-btn" disabled={actual >= ultima} onClick={() => onCambiar(actual + 1)}>Siguiente</button>
      <span className="adp-resumen">Mostrando {desde}–{hasta} de {total}</span>
    </div>
  );
}

function SectionTable({
  title,
  action,
  onAction,
  toolbar,
  exportar,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  toolbar?: React.ReactNode;
  /** Botón de exportar (PDF / Excel) que se muestra junto a la acción principal. */
  exportar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="section-view" aria-label={title}>
      <div className="section-header">
        <div>
          <span className="card-kicker">GESTIÓN</span>
        </div>
        {(exportar || action) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {exportar}
            {action && (
              <button title={action} className="primary-btn" onClick={onAction}>
                <Plus size={16} /> {action}
              </button>
            )}
          </div>
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

  // Menú y visor se montan en .deportivo-admin: fuera de la barra lateral (que recorta y tiene transform)
  // y dentro del contenedor que trae el modo oscuro y las variables del admin.
  const destino = document.querySelector(".deportivo-admin") ?? document.body;

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
  const controlPermisos = usePermisos();
  const puedeEditar = (seccion: string) => controlPermisos.puede(seccionDelegable(seccion), "editar");
  const puedeEliminar = (seccion: string) => controlPermisos.puede(seccionDelegable(seccion), "eliminar");
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

  const [section, setSection] = useState<Section>(() => {
    try {
      const saved = localStorage.getItem(SECTION_KEY);
      return saved && SECTIONS_VALIDAS.includes(saved) ? (saved as Section) : "inicio";
    } catch {
      return "inicio";
    }
  });
  useEffect(() => {
    try { localStorage.setItem(SECTION_KEY, section); } catch { /* sin almacenamiento */ }
  }, [section]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Página actual de cada tabla (clave = nombre de la sección).
  const [paginas, setPaginas] = useState<Record<string, number>>({});
  // Avisos arriba a la derecha (verde si salió bien, rojo si no)
  const { avisar: notify, avisos } = useAvisos();

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

  const [loading, setLoading] = useState(true); // true desde el inicio: sin "flash" de tarjetas en cero

  const [eventos, setEventos] = useState<Evento[]>([]);
  // Inscritos y dinero por evento (GET /estadisticas/eventos-deportivos, solo admins).
  const [cifrasEventos, setCifrasEventos] = useState<Record<number, CifrasEventoDeportivo>>({});
  // Evento cuyo resumen (cifras completas) está abierto.
  const [resumenEvento, setResumenEvento] = useState<Evento | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pqrs, setPqrs] = useState<Pqr[]>([]);
const [pqrResumen, setPqrResumen] = useState<Partial<Record<EstadoPqr, number>>>({});
const [pqrTotal, setPqrTotal] = useState(0);

  const [filtroPago, setFiltroPago] = useState<"todos" | Pago["estado_p"]>("pendiente");
  const [filtroEvento, setFiltroEvento] = useState("");
  // Filtros por sección (cadena vacía = "todos")
  const [filtroCategoriaEvento, setFiltroCategoriaEvento] = useState("");
  const [filtroEstadoEvento, setFiltroEstadoEvento] = useState("");
  const [filtroFechaEvento, setFiltroFechaEvento] = useState(""); // proximos | pasados
  const [filtroCuposEvento, setFiltroCuposEvento] = useState(""); // con | agotado
  const [filtroMetodoPago, setFiltroMetodoPago] = useState("");
  const [filtroEstadoResultado, setFiltroEstadoResultado] = useState("");
  const [filtroStockKit, setFiltroStockKit] = useState(""); // con | bajo | agotado
  const [filtroLugarKit, setFiltroLugarKit] = useState("");
  const [kitsTab, setKitsTab] = useState<"catalogo" | "entregas">("catalogo");
  const [filtroRolUsuario, setFiltroRolUsuario] = useState("");
  const [filtroEstadoUsuario, setFiltroEstadoUsuario] = useState("");

  const [modal, setModal] = usePersistentState<ModalKind>("admin_modal", null);
  const [editing, setEditing] = usePersistentState<any>("admin_editing", null);

  /** Cierra el modal y descarta el borrador: solo al guardar o al pulsar Cancelar/X. */
  const closeModal = () => {
    clearDrafts();
    setModal(null);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, k, p, r] = await Promise.all([
        controlPermisos.puedeVerSeccion("eventos") ? apiFetch("/eventos?per_page=200") : Promise.resolve(null),
        controlPermisos.puedeVerSeccion("kits") ? apiFetch("/kits?per_page=200") : Promise.resolve(null),
        controlPermisos.puedeVerSeccion("inscripciones") ? apiFetch("/pagos?per_page=500") : Promise.resolve(null),
        controlPermisos.puedeVerSeccion("resultados") ? apiFetch("/resultados?per_page=500") : Promise.resolve(null),
      ]);
      setEventos(e?.data ?? []);
      // Si falla (p. ej. un asistente sin permiso), la tabla sigue funcionando sin las cifras.
      if (controlPermisos.puedeVerSeccion("eventos")) {
        apiFetch("/estadisticas/eventos-deportivos")
          .then((c) => setCifrasEventos(c?.data ?? {}))
          .catch(() => setCifrasEventos({}));
      }
      setKits(k?.data ?? []);
      setPagos(p?.pagos?.data ?? []);
      setResultados(r?.resultados?.data ?? []);

      if (controlPermisos.puedeVerSeccion("pqr")) {
  try {
    const q = await apiFetch("/pqr?contexto=deportivo&per_page=100");
    setPqrs(q?.data ?? []);
    setPqrResumen(q?.resumen ?? {});
    setPqrTotal(q?.total ?? 0);
  } catch {
    setPqrs([]);
  }
}
      try {
        if (!controlPermisos.puedeVerSeccion("usuarios")) {
          setUsers([]);
          return;
        }
        const u = await apiFetch("/users?per_page=200");
        setUsers(u.data ?? []);
      } catch (error) {
        setUsers([]);
        notify(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron cargar los datos.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!controlPermisos.cargando) void loadAll();
  }, [controlPermisos.cargando, controlPermisos.permisos]);

  /**
   * Ejecuta una acción contra la API, muestra el resultado y recarga.
   * Devuelve false si falló, para que el modal siga abierto.
   */
  const run = async (accion: () => Promise<unknown>, okMessage: string, cerrarModal = true) => {
    try {
      await accion();
      notify(okMessage);
      if (cerrarModal) closeModal();
      await loadAll();
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo completar la acción.", "error");
      return false;
    }
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setSearch("");
    setFiltroEvento("");
    setFiltroCategoriaEvento("");
    setFiltroEstadoEvento("");
    setFiltroFechaEvento("");
    setFiltroCuposEvento("");
    setFiltroMetodoPago("");
    setFiltroEstadoResultado("");
    setFiltroStockKit("");
    setFiltroLugarKit("");
    setFiltroRolUsuario("");
    setFiltroEstadoUsuario("");
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!controlPermisos.cargando && controlPermisos.esAsistente &&
      (!controlPermisos.puedeVerSeccion(section) || section === "asistentes" || section === "copias" || section === "ajustes")) {
      const primera = controlPermisos.primeraSeccion ?? primeraSeccionPermitida("deportivo", controlPermisos.permisos);
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

  const STOCK_BAJO = 10; // kits con este stock o menos se consideran "stock bajo"

  const visibleEventos = eventos
    .filter((e) => !filtroCategoriaEvento || e.categoria === filtroCategoriaEvento)
    .filter((e) => !filtroEstadoEvento || e.estado === filtroEstadoEvento)
    .filter((e) => {
      if (!filtroFechaEvento) return true;
      const fecha = (e.fecha ?? "").slice(0, 10);
      return filtroFechaEvento === "proximos" ? fecha >= hoy() : fecha < hoy();
    })
    .filter((e) => {
      if (!filtroCuposEvento) return true;
      return filtroCuposEvento === "con"
        ? Number(e.cupos_disponibles) > 0
        : Number(e.cupos_disponibles) <= 0;
    })
    .filter((e) =>
      filtered(`${e.nombre} ${e.categoria} ${e.ubicacion} ${e.estado}`)
    );
  const visiblePagos = pagos
    .filter((p) => filtroPago === "todos" || p.estado_p === filtroPago)
    .filter((p) => !filtroEvento || String(p.inscripcion?.evento?.id_e) === filtroEvento)
    .filter((p) => !filtroMetodoPago || p.metodo_pago_p === filtroMetodoPago)
    .filter((p) =>
      filtered(`${nombreDe(p.inscripcion?.usuario)} ${p.inscripcion?.usuario?.correo_u ?? ""} ${p.inscripcion?.evento?.nombre_e ?? ""} ${p.referencia_p ?? ""}`)
    );
  const visibleResultados = resultados
    .filter((r) => !filtroEvento || String(r.inscripcion?.evento?.id_e) === filtroEvento)
    .filter((r) => !filtroEstadoResultado || r.estado_r === filtroEstadoResultado)
    .filter((r) => filtered(`${nombreDe(r.inscripcion?.usuario)} ${r.inscripcion?.evento?.nombre_e ?? ""} ${r.estado_r}`))
    .sort((a, b) =>
      (a.inscripcion?.evento?.nombre_e ?? "").localeCompare(b.inscripcion?.evento?.nombre_e ?? "")
      || (a.posicion_general_r ?? 9999) - (b.posicion_general_r ?? 9999));
  const visibleKits = kits
    .filter((k) => {
      if (!filtroStockKit) return true;
      const stock = Number(k.stock_k);
      if (filtroStockKit === "agotado") return stock <= 0;
      if (filtroStockKit === "bajo") return stock > 0 && stock <= STOCK_BAJO;
      return stock > 0; // "con"
    })
    .filter((k) => !filtroLugarKit || (k.lugar_entrega_k ?? "") === filtroLugarKit)
    .filter((k) => filtered(`${k.nombre_k} ${k.lugar_entrega_k ?? ""} ${k.contenido_k ?? ""}`));

  // Solo los usuarios del módulo deportivo (nunca los admin sociales).
  const usersVisibles = users.filter((u) => perteneceAlModulo(u, "deportivo"));
  const visibleUsers = usersVisibles
    .filter((u) => !filtroRolUsuario || (u.roles ?? []).some((r) => r.nombre_rol === filtroRolUsuario
      // En Deportivo todo usuario normal es participante, aunque en la base solo sea cliente.
      || (filtroRolUsuario === "participante" && r.nombre_rol === "cliente")))
    .filter((u) => !filtroEstadoUsuario || (u.estado_u ?? "activo") === filtroEstadoUsuario)
    .filter((u) => filtered(`${u.nombre_u} ${u.apellido_u ?? ""} ${u.correo_u}`));

  /** Corta una lista en páginas de POR_PAGINA filas y devuelve la que se está viendo. */
  const paginar = <T,>(clave: string, lista: T[]) => {
    const ultima = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    const actual = Math.min(Math.max(1, paginas[clave] ?? 1), ultima);
    const desde = (actual - 1) * POR_PAGINA;
    return { items: lista.slice(desde, desde + POR_PAGINA), actual, ultima, total: lista.length };
  };
  const irAPagina = (clave: string) => (n: number) => setPaginas((p) => ({ ...p, [clave]: n }));
  const pagEventos = paginar("eventos", visibleEventos);
  const pagPagos = paginar("inscripciones", visiblePagos);
  const pagResultados = paginar("resultados", visibleResultados);
  const pagKits = paginar("kits", visibleKits);
  const pagUsuarios = paginar("usuarios", visibleUsers);

  // Al buscar, filtrar o cambiar de sección se vuelve a la primera página.
  useEffect(() => { setPaginas({}); }, [
    section, search, kitsTab,
    filtroPago, filtroEvento, filtroMetodoPago,
    filtroCategoriaEvento, filtroEstadoEvento, filtroFechaEvento, filtroCuposEvento,
    filtroEstadoResultado, filtroStockKit, filtroLugarKit, filtroRolUsuario, filtroEstadoUsuario,
  ]);

  // Opciones que salen de los propios datos
  const metodosPago = Array.from(new Set(pagos.map((p) => p.metodo_pago_p).filter(Boolean) as string[])).sort();
  const lugaresKit = Array.from(new Set(kits.map((k) => k.lugar_entrega_k).filter(Boolean) as string[])).sort();
  // Solo los roles de este módulo (el cliente es del Social y no se muestra aquí).
  const rolesUsuario = Array.from(new Set(usersVisibles.flatMap((u) => (u.roles ?? [])
    .filter((r) => ["deportivo", "general"].includes((r.pivot?.contexto ?? "deportivo").toLowerCase()))
    .map((r) => r.nombre_rol)))).sort();

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

  const autorizadoEnModulo = !!user && (
    user.roles.includes("adminDeportivo") ||
    (controlPermisos.esAsistente && controlPermisos.modulo === "deportivo")
  );
  if (!autorizadoEnModulo) return <Navigate to="/deportivo" replace />;
  if (controlPermisos.cargando) return <CargandoPanel modulo="deportivo" />;
  if (controlPermisos.errorCarga) {
    return <main className="deportivo-admin"><section className="admin-card" role="alert"><h1>No se pudieron cargar tus permisos</h1><p>{controlPermisos.errorCarga}</p><button className="primary-btn" onClick={() => void controlPermisos.refrescar()}>Reintentar</button></section></main>;
  }
  if (controlPermisos.esAsistente && !controlPermisos.primeraSeccion) {
    return <main className="deportivo-admin"><section className="admin-card"><h1>Sin secciones habilitadas</h1><p>Solicita al administrador que te asigne al menos una sección.</p><button className="primary-btn" onClick={logout}>Cerrar sesión</button></section></main>;
  }
  if (controlPermisos.esAsistente &&
    (section === "asistentes" || section === "copias" || section === "ajustes" || !controlPermisos.puedeVerSeccion(seccionDelegable(section)))) {
    return <CargandoPanel modulo="deportivo" />;
  }
  const seccionesPanel = controlPermisos.esAsistente
    ? SECCIONES.filter((key) => key !== "asistentes" && key !== "copias" && key !== "ajustes" && controlPermisos.puedeVerSeccion(seccionDelegable(key)))
    : SECCIONES;

  const sectionMeta: Record<Section, { label: string; icon: any }> = {
    inicio: { label: "Inicio", icon: LayoutDashboard },
    eventos: { label: "Eventos", icon: CalendarDays },
    patrocinadores: { label: "Patrocinadores", icon: Handshake },
    rutas: { label: "Rutas", icon: Map },
    estaciones: { label: "Estaciones", icon: MapPin },
    inscripciones: { label: "Inscripciones y pagos", icon: Wallet },
    acceso: { label: "Control de acceso", icon: QrCode },
    resultados: { label: "Resultados", icon: Trophy },
    kits: { label: "Kits", icon: Package },
    pqr: { label: "PQRS", icon: MessageSquareText },
    usuarios: { label: "Usuarios", icon: Users },
    asistentes: { label: "Asistentes", icon: UserPlus },
    copias: { label: "Copias de seguridad", icon: DatabaseBackup },
    ajustes: { label: "Ajustes", icon: Settings },
    ayuda: { label: "Administrar ayuda", icon: LifeBuoy },
  };

  const gruposNavegacion: Array<{ titulo: string; secciones: Section[] }> = [
    { titulo: "PRINCIPAL", secciones: ["inicio", "eventos", "usuarios", "inscripciones"] },
    { titulo: "GESTIÓN", secciones: ["acceso", "kits", "patrocinadores", "resultados"] },
    { titulo: "LOGÍSTICA", secciones: ["rutas", "estaciones"] },
    { titulo: "CUENTA", secciones: ["asistentes", "copias", "ajustes", "ayuda"] },
    { titulo: "GESTIÓN", secciones: ["acceso", "kits", "patrocinadores", "resultados", "pqr"] },
  ];
  const conteosNavegacion: Partial<Record<Section, number>> = {
    eventos: eventos.length,
    pqr: pqrs.filter((p) => p.estado_pqr !== "resuelto" && p.estado_pqr !== "cerrado").length,
    usuarios: usersVisibles.length,
    inscripciones: pagos.length,
    kits: kits.length,
    resultados: resultados.length,
  };

  const accent = "#2c9caf";
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

  /** Un <select> de filtro con el estilo del panel. */
  const filtroSelect = (
    value: string,
    onChange: (v: string) => void,
    label: string,
    todos: string,
    opciones: Array<{ value: string; label: string }>,
  ) => (
    <select className="admin-select" value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
      <option value="">{todos}</option>
      {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  /** Botón "Limpiar filtros" + contador "Mostrando X de Y". */
  const filtroPie = (activo: boolean, limpiar: () => void, mostrando: number, total: number) => (
    <>
      {activo && (
        <button title="Quitar todos los filtros aplicados" type="button" className="secondary-btn filter-clear" onClick={limpiar}>
          <X size={14} /> Limpiar filtros
        </button>
      )}
      <span className="filter-count">Mostrando {mostrando} de {total}</span>
    </>
  );

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
          <button title="Abrir o cerrar el menú lateral"
            className="icon-btn header-menu"
            onClick={() => window.innerWidth <= 900 ? setMobileOpen(v => !v) : setCollapsed(v => !v)}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>
          <Link title="Ir al inicio de SKYED Deportivo" to="/deportivo" className="admin-brand">
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
          {gruposNavegacion.map(({ titulo, secciones }) => {
            const visibles = secciones.filter(key => seccionesPanel.includes(key));
            if (!visibles.length) return null;

            return (
              <div className="sidebar-nav-group" key={titulo}>
                <p className="nav-caption">{titulo}</p>
                {visibles.map(key => {
                  const Icon = sectionMeta[key].icon;
                  const conteo = conteosNavegacion[key];
                  return (
                    <button
                      key={key}
                      className={`admin-nav-item ${section === key ? "active" : ""}`}
                      onClick={() => selectSection(key)}
                      title={sectionMeta[key].label}
                    >
                      <Icon size={18} />
                      <span>{sectionMeta[key].label}</span>
                      {conteo !== undefined && <i className="nav-count">{conteo}</i>}
                    </button>
                  );
                })}
              </div>
            );
          })}
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
          {section !== "acceso" && section !== "inicio" && section !== "ajustes" && section !== "copias" && (
            <label className="admin-search">
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
            </label>
          )}
        </div>

        {/* Solo en la carga inicial: al recargar tras cada acción no se
            muestra, para que la pantalla no salte (p. ej. al validar QR). */}
        {loading && !eventos.length && <CargandoPanel modulo="deportivo" />}

        {section === "asistentes" && (
          <AsistentesPanel
            modulo="deportivo"
            search={search}
            notify={notify}
            correoAdmin={user.email}
            confirmar={confirmar}
          />
        )}

        {section === "inicio" && (
          <section className="dashboard-content">
            <div className="kpi-grid">
              {controlPermisos.puedeVerSeccion("eventos") && <>
                <Kpi icon={<CalendarDays size={19} />} label="Eventos activos" value={stats.activos} />
                <Kpi icon={<Bike size={19} />} label="Cupos disponibles" value={stats.cupos} />
              </>}
              {controlPermisos.puedeVerSeccion("inscripciones") && <>
                <Kpi icon={<ClipboardList size={19} />} label="Inscripciones" value={stats.inscripciones} />
                <Kpi icon={<Wallet size={19} />} label="Pagos por validar" value={stats.pendientes} />
                <Kpi icon={<Check size={19} />} label="Ingresos confirmados" value={stats.ingresos} formato={money} compact />
              </>}
              {controlPermisos.puedeVerSeccion("resultados") && <Kpi icon={<Trophy size={19} />} label="Resultados publicados" value={stats.resultados} />}
            </div>

            <div className="dashboard-grid-main">
              {controlPermisos.puedeVerSeccion("inscripciones") && <TendenciaMensual pagos={pagos} />}

              {controlPermisos.puedeVerSeccion("eventos") && <section className="admin-card upcoming-card">
                <div className="card-head">
                  <div>
                    <span className="card-kicker">CALENDARIO</span>
                    <h2>Próximos eventos</h2>
                  </div>
                  <button title="Ver todos los eventos" className="link-button" onClick={() => selectSection("eventos")}>Ver todos →</button>
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
              </section>}
            </div>

            {controlPermisos.puedeVerSeccion("inscripciones") && <div className="dashboard-grid-charts">
              <InscritosPorEvento pagos={pagos} />
              <EstadoPagos pagos={pagos} onVerPendientes={() => { setFiltroPago("pendiente"); selectSection("inscripciones"); }} />
            </div>}
          </section>
        )}

        {section === "eventos" && (
          <>
          <SectionTable
            title="Gestión de eventos deportivos"
            exportar={<ExportMenu ruta="deportivo/eventos" archivo="skyed-deportivo-eventos" params={{
              q: search,
              categoria: filtroCategoriaEvento || undefined,
              estado: filtroEstadoEvento || undefined,
              fecha: filtroFechaEvento || undefined,
              cupos: filtroCuposEvento || undefined,
            }} onMensaje={notify} />}
            action={puedeEditar("eventos") ? "Nuevo evento" : undefined}
            onAction={() => { setEditing(null); setModal("evento"); }}
            toolbar={<>
              {filtroSelect(filtroCategoriaEvento, setFiltroCategoriaEvento, "Filtrar por categoría", "Todas las categorías", CATEGORIAS_EVENTO)}
              {filtroSelect(filtroEstadoEvento, setFiltroEstadoEvento, "Filtrar por estado", "Todos los estados", [
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
                { value: "inhabilitado", label: "Inhabilitado" },
              ])}
              {filtroSelect(filtroFechaEvento, setFiltroFechaEvento, "Filtrar por fecha", "Todas las fechas", [
                { value: "proximos", label: "Próximos" },
                { value: "pasados", label: "Ya realizados" },
              ])}
              {filtroSelect(filtroCuposEvento, setFiltroCuposEvento, "Filtrar por cupos", "Todos los cupos", [
                { value: "con", label: "Con cupos" },
                { value: "agotado", label: "Sin cupos" },
              ])}
              {filtroPie(
                !!(filtroCategoriaEvento || filtroEstadoEvento || filtroFechaEvento || filtroCuposEvento),
                () => { setFiltroCategoriaEvento(""); setFiltroEstadoEvento(""); setFiltroFechaEvento(""); setFiltroCuposEvento(""); },
                pagEventos.items.length, visibleEventos.length,
              )}
            </>}
          >
            <thead><tr><th>Foto</th><th>Nombre</th><th>Categoría</th><th>Fecha</th><th>Precio</th><th>Cupos</th><th>Inscritos</th><th>Recaudado</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {pagEventos.items.map(e => (
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
                  <CeldaCupos disponibles={e.cupos_disponibles} ocupados={cifrasEventos[e.id]?.cupos_ocupados ?? 0} />
                  <CeldasCifrasEvento cifras={cifrasEventos[e.id]} />
                  <td>
                    {puedeEditar("eventos") ? <select className="admin-select" value={e.estado} onChange={ev => cambiarEstadoEvento(e, ev.target.value as Evento["estado"])} aria-label="Estado del evento">
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="inhabilitado">Inhabilitado</option>
                    </select> : <Badge value={e.estado} />}
                  </td>
                  <td><div className="row-actions">
                    <button className="table-action" title="Ver el resumen: inscritos, dinero, asistencia y kits" onClick={() => setResumenEvento(e)}><BarChart3 size={15} /></button>
                    {puedeEditar("eventos") && <>
                      <button className="table-action" title="Editar" onClick={() => { setEditing(e); setModal("evento"); }}><Pencil size={15} /></button>
                    </>}
                    {(puedeEditar("eventos") || puedeEliminar("eventos")) && <button className="table-action" title="Categorías" onClick={() => { setEditing(e); setModal("categorias"); }}><Tags size={15} /></button>}
                    {puedeEliminar("eventos") && <button className="table-action danger" title="Eliminar" onClick={() => eliminarEvento(e)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
              {!visibleEventos.length && <tr><td colSpan={10}>{eventos.length ? "No hay eventos con estos filtros." : "No hay eventos deportivos."}</td></tr>}
            </tbody>
          </SectionTable>
          <Paginador actual={pagEventos.actual} ultima={pagEventos.ultima} total={pagEventos.total} onCambiar={irAPagina("eventos")} />
          </>
        )}

        {section === "patrocinadores" && (
          <AdminCatalogos
            key="patrocinadores"
            seccion="patrocinadores"
            eventos={eventos}
            search={search}
            notify={notify}
            confirmar={confirmar}
            puedeEditar={puedeEditar("patrocinadores")}
            puedeEliminar={puedeEliminar("patrocinadores")}
          />
        )}

        {section === "rutas" && (
          <AdminCatalogos
            key="rutas"
            seccion="rutas"
            eventos={eventos}
            search={search}
            notify={notify}
            confirmar={confirmar}
            puedeEditar={puedeEditar("rutas")}
            puedeEliminar={puedeEliminar("rutas")}
          />
        )}

        {section === "estaciones" && (
          <AdminCatalogos
            key="estaciones"
            seccion="estaciones"
            eventos={eventos}
            search={search}
            notify={notify}
            confirmar={confirmar}
            puedeEditar={puedeEditar("estaciones")}
            puedeEliminar={puedeEliminar("estaciones")}
          />
        )}

        {section === "inscripciones" && (
          <>
          <SectionTable
            title="Inscripciones y pagos"
            exportar={<ExportMenu ruta="deportivo/inscripciones-pagos" archivo="skyed-deportivo-inscripciones-pagos" params={{
              q: search,
              estado: filtroPago === "todos" ? undefined : filtroPago,
              evento: filtroEvento || undefined,
              metodo: filtroMetodoPago || undefined,
            }} onMensaje={notify} />}
            toolbar={<>
              <select className="admin-select" value={filtroPago} onChange={e => setFiltroPago(e.target.value as typeof filtroPago)} aria-label="Filtrar por estado del pago">
                <option value="pendiente">Pagos por validar</option>
                <option value="confirmado">Confirmados</option>
                <option value="rechazado">Rechazados</option>
                <option value="cancelado">Cancelados</option>
                <option value="todos">Todos</option>
              </select>
              {filtroEventoSelect}
              {filtroSelect(filtroMetodoPago, setFiltroMetodoPago, "Filtrar por método de pago", "Todos los métodos",
                metodosPago.map(m => ({ value: m, label: human(m) })))}
              {filtroPie(
                !!(filtroPago !== "todos" || filtroEvento || filtroMetodoPago),
                () => { setFiltroPago("todos"); setFiltroEvento(""); setFiltroMetodoPago(""); },
                pagPagos.items.length, visiblePagos.length,
              )}
            </>}
          >
            <thead><tr><th>Participante</th><th>Evento</th><th>Inscripción</th><th>Monto</th><th>Método</th><th>Pago</th><th>Acciones</th></tr></thead>
            <tbody>
              {pagPagos.items.map(p => (
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
                    {puedeEditar("inscripciones") && p.estado_p === "pendiente" && <>
                      <button className="table-action" title="Confirmar pago" onClick={() => cambiarEstadoPago(p, "confirmado")}><Check size={15} /></button>
                      <button className="table-action danger" title="Rechazar pago" onClick={() => cambiarEstadoPago(p, "rechazado")}><X size={15} /></button>
                    </>}
                  </div></td>
                </tr>
              ))}
              {!visiblePagos.length && <tr><td colSpan={7}>No hay inscripciones con este filtro.</td></tr>}
            </tbody>
          </SectionTable>
          <Paginador actual={pagPagos.actual} ultima={pagPagos.ultima} total={pagPagos.total} onCambiar={irAPagina("inscripciones")} />
          </>
        )}

        {section === "acceso" && (puedeEditar("acceso")
          ? <ControlAcceso notify={notify} onValidado={loadAll} />
          : <section className="admin-card"><p>El control de acceso requiere permiso para editar.</p></section>)}

        {section === "resultados" && (
          <>
          <SectionTable
            title="Resultados oficiales"
            exportar={<ExportMenu ruta="deportivo/resultados" archivo="skyed-deportivo-resultados" params={{
              q: search,
              evento: filtroEvento || undefined,
              estado: filtroEstadoResultado || undefined,
            }} onMensaje={notify} />}
            action={puedeEditar("resultados") ? "Registrar resultado" : undefined}
            onAction={() => { setEditing(null); setModal("resultado"); }}
            toolbar={<>
              {filtroEventoSelect}
              {filtroSelect(filtroEstadoResultado, setFiltroEstadoResultado, "Filtrar por estado del resultado", "Todos los estados", [
                { value: "oficial", label: "Oficial" },
                { value: "en revision", label: "En revisión" },
                { value: "descalificado", label: "Descalificado" },
              ])}
              {filtroPie(
                !!(filtroEvento || filtroEstadoResultado),
                () => { setFiltroEvento(""); setFiltroEstadoResultado(""); },
                pagResultados.items.length, visibleResultados.length,
              )}
            </>}
          >
            <thead><tr><th>Pos.</th><th>Participante</th><th>Evento</th><th>Tiempo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {pagResultados.items.map(r => (
                <tr key={r.id_r}>
                  <td><strong>{r.posicion_general_r ?? "—"}</strong></td>
                  <td>{nombreDe(r.inscripcion?.usuario)}</td>
                  <td>{r.inscripcion?.evento?.nombre_e ?? "—"}</td>
                  <td>{r.tiempo_final_r}</td>
                  <td><Badge value={r.estado_r} /></td>
                  <td><div className="row-actions">
                    {puedeEditar("resultados") && <button className="table-action" title="Editar" onClick={() => { setEditing(r); setModal("resultado"); }}><Pencil size={15} /></button>}
                    {puedeEliminar("resultados") && <button className="table-action danger" title="Eliminar" onClick={() => eliminarResultado(r)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
              {!visibleResultados.length && <tr><td colSpan={6}>{resultados.length ? "No hay resultados con estos filtros." : "No hay resultados registrados."}</td></tr>}
            </tbody>
          </SectionTable>
          <Paginador actual={pagResultados.actual} ultima={pagResultados.ultima} total={pagResultados.total} onCambiar={irAPagina("resultados")} />
          </>
        )}

        {section === "kits" && (
          <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }} role="tablist" aria-label="Vistas de kits">
            <button type="button" role="tab" title= "Catalogo kits" aria-selected={kitsTab === "catalogo"} className={kitsTab === "catalogo" ? "primary-btn" : "secondary-btn"} onClick={() => setKitsTab("catalogo")}>
              <Package size={15} /> Catálogo
            </button>
            <button type="button" role="tab" title= "Entregas kits" aria-selected={kitsTab === "entregas"} className={kitsTab === "entregas" ? "primary-btn" : "secondary-btn"} onClick={() => setKitsTab("entregas")}>
              <ClipboardList size={15} /> Entregas
            </button>
          </div>
          {kitsTab === "entregas" ? (
            <EntregasKit eventos={eventos} search={search} notify={notify} />
          ) : (
          <>
          <SectionTable
            title="Kits del participante"
            exportar={<ExportMenu ruta="deportivo/kits" archivo="skyed-deportivo-kits" params={{
              q: search,
              stock: filtroStockKit || undefined,
              lugar: filtroLugarKit || undefined,
            }} onMensaje={notify} />}
            action={puedeEditar("kits") ? "Nuevo kit" : undefined}
            onAction={() => { setEditing(null); setModal("kit"); }}
            toolbar={<>
              {filtroSelect(filtroStockKit, setFiltroStockKit, "Filtrar por stock", "Todo el stock", [
                { value: "con", label: "Con stock" },
                { value: "bajo", label: `Stock bajo (${STOCK_BAJO} o menos)` },
                { value: "agotado", label: "Agotado" },
              ])}
              {filtroSelect(filtroLugarKit, setFiltroLugarKit, "Filtrar por lugar de entrega", "Todos los lugares",
                lugaresKit.map(l => ({ value: l, label: l })))}
              {filtroPie(
                !!(filtroStockKit || filtroLugarKit),
                () => { setFiltroStockKit(""); setFiltroLugarKit(""); },
                pagKits.items.length, visibleKits.length,
              )}
            </>}
          >
            <thead><tr><th>Imagen</th><th>Nombre</th><th>Stock</th><th>Precio</th><th>Entrega</th><th>Lugar</th><th>Contenido</th><th>Evento</th><th>Acciones</th></tr></thead>
            <tbody>
              {pagKits.items.map(k => (
                <tr key={k.id_k}>
                  <td>
                    {k.imagen_url
                      ? <img className="admin-thumb" src={k.imagen_url} alt={k.nombre_k} onError={ev => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />
                      : <span>—</span>}
                  </td>
                  <td><strong>{k.nombre_k}</strong></td>
                  <td>
                    <strong>{k.stock_k}</strong>
                    {!!k.tallas?.length && (
                      <small style={{ display: "block", opacity: .75 }}>
                        {k.tallas.map(t => `${t.talla_kt}: ${t.cantidad_kt}`).join(" · ")}
                      </small>
                    )}
                  </td>
                  <td>{moneda(k.precio_k)}</td>
                  <td>{formatDate(k.fecha_entrega_k)}</td>
                  <td>{k.lugar_entrega_k ?? "—"}</td>
                  <td>{k.contenido_k ?? "—"}</td>
                  <td>{k.eventos?.length ? k.eventos.map(e => e.nombre_e).join(", ") : "Sin asignar"}</td>
                  <td><div className="row-actions">
                    {puedeEditar("kits") && <button className="table-action" title="Editar" onClick={() => { setEditing(k); setModal("kit"); }}><Pencil size={15} /></button>}
                    {puedeEliminar("kits") && <button className="table-action danger" title="Eliminar" onClick={() => eliminarKit(k)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
              {!visibleKits.length && <tr><td colSpan={9}>{kits.length ? "No hay kits con estos filtros." : "No hay kits registrados."}</td></tr>}
            </tbody>
          </SectionTable>
          <Paginador actual={pagKits.actual} ultima={pagKits.ultima} total={pagKits.total} onCambiar={irAPagina("kits")} />
          </>
          )}
          </>
        )}

        {section === "copias" && (
          <CopiasSeguridad modulo="deportivo" notify={notify} confirmar={confirmar} />
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

        {section === "pqr" && (
  <AdminPqrManager
    pqrs={pqrs}
    resumen={pqrResumen}
    total={pqrTotal}
    search={search}
    permitirGestion={puedeEditar("pqr")}
    onChanged={async () => { await loadAll(); }}
    notify={notify}
  />
)}


        {section === "usuarios" && (
          <>
          <SectionTable
            title="Usuarios registrados"
            exportar={<ExportMenu ruta="deportivo/usuarios" archivo="skyed-deportivo-usuarios" params={{ q: search, rol: filtroRolUsuario || undefined, estado: filtroEstadoUsuario || undefined }} onMensaje={notify} />}
            action={puedeEditar("usuarios") ? "Nuevo usuario" : undefined}
            onAction={() => { setEditing(null); setModal("usuario"); }}
            toolbar={<>
              {puedeEditar("usuarios") && <button type="button" className="secondary-btn" title="Asignar o quitar roles a los usuarios" onClick={() => { setEditing(null); setModal("roles"); }}>
                <ShieldCheck size={15} /> Gestionar roles
              </button>}
              {filtroSelect(filtroRolUsuario, setFiltroRolUsuario, "Filtrar por rol", "Todos los roles",
                rolesUsuario.map(r => ({ value: r, label: r })))}
              {filtroSelect(filtroEstadoUsuario, setFiltroEstadoUsuario, "Filtrar por estado", "Todos los estados", [
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ])}
              {filtroPie(
                !!(filtroRolUsuario || filtroEstadoUsuario),
                () => { setFiltroRolUsuario(""); setFiltroEstadoUsuario(""); },
                pagUsuarios.items.length, visibleUsers.length,
              )}
            </>}
          >
            <thead><tr><th>ID</th><th>Usuario</th><th>Roles</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {pagUsuarios.items.map(u => (
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
                  <td><RolesDeUsuario usuario={u} modulo="deportivo" /></td>
                  <td><Badge value={u.estado_u ?? "activo"} /></td>
                  <td>
                    {puedeEditar("usuarios") && (
                    <div className="usr-acciones">
                      <button type="button" className="usr-btn-roles usr-btn-editar" disabled={!puedeEditarUsuario(u, user)} title={puedeEditarUsuario(u, user) ? `Editar los datos de ${u.nombre_u}` : "Solo el super administrador puede editar a otro administrador"} onClick={() => { setEditing({ id_u: u.id_u }); setModal("editar-usuario"); }}>
                        <Pencil size={14} /> Editar
                      </button>
                      <button type="button" className="usr-btn-roles" title={esAdmin(u) && u.id_u !== user.id ? `Ver los roles de ${u.nombre_u} (es administrador)` : `Gestionar los roles de ${u.nombre_u}`} onClick={() => { setEditing({ id_u: u.id_u }); setModal("roles"); }}>
                        <ShieldCheck size={14} /> {esAdmin(u) && u.id_u !== user.id ? "Ver roles" : "Roles"}
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleUsers.length && <tr><td colSpan={5}>{usersVisibles.length ? "No hay usuarios con estos filtros." : "La API de usuarios no devolvió registros."}</td></tr>}
            </tbody>
          </SectionTable>
          <Paginador actual={pagUsuarios.actual} ultima={pagUsuarios.ultima} total={pagUsuarios.total} onCambiar={irAPagina("usuarios")} />
          </>
        )}
        {section === "ayuda" && (
          <AyudaAdmin modulo="deportivo" />
        )}

        <AdminFooter modulo="deportivo" />
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

      {modal === "evento" && puedeEditar("eventos") && (
        <EventoModal
          item={editing}
          kits={kits}
          eventos={eventos}
          onClose={closeModal}
          notify={notify}
          onKitCreado={kit => setKits(actual => [...actual, kit])}
          onSave={async (data, mantenerAbierto, eventoId) => {
            try {
              const id = eventoId ?? editing?.id;
              const respuesta = await apiFetch(id ? `/eventos/${id}` : "/eventos", {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(data),
              });
              notify(id ? "Evento actualizado" : "Evento creado. Ahora agrégale sus categorías.");
              if (!mantenerAbierto) closeModal();
              await loadAll();
              return respuesta.evento as Evento;
            } catch (error) {
              notify(error instanceof Error ? error.message : "No se pudo guardar el evento.", "error");
              return null;
            }
          }}
        />
      )}

      {resumenEvento && (
        <ResumenDeportivo evento={resumenEvento} cifras={cifrasEventos[resumenEvento.id]} onClose={() => setResumenEvento(null)} />
      )}

      {modal === "categorias" && editing && (puedeEditar("eventos") || puedeEliminar("eventos")) && (
        <CategoriasModal evento={editing} onClose={() => { closeModal(); loadAll(); }} notify={notify} confirmar={confirmar} permitirEditar={puedeEditar("eventos")} permitirEliminar={puedeEliminar("eventos")} />
      )}

      {modal === "kit" && puedeEditar("kits") && (
        <KitModal
          item={editing}
          eventos={eventos}
          notify={notify}
          onClose={closeModal}
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
          onClose={closeModal}
          onCambiar={estado => cambiarEstadoPago(editing, estado)}
          permitirCambiar={puedeEditar("inscripciones")}
        />
      )}

      {modal === "resultado" && puedeEditar("resultados") && (
        <ResultadoModal
          item={editing}
          eventos={eventos}
          onClose={closeModal}
          notify={notify}
          onSave={data => run(
            () => editing
              ? apiFetch(`/resultados/${editing.id_r}`, { method: "PUT", body: JSON.stringify(data) })
              : apiFetch("/resultados", { method: "POST", body: JSON.stringify(data) }),
            editing ? "Resultado actualizado" : "Resultado registrado",
          )}
        />
      )}

      {modal === "roles" && puedeEditar("usuarios") && (
        <RolesModal
          users={users}
          inicialId={editing?.id_u ?? null}
          yoId={user.id}
          onClose={closeModal}
          notify={notify}
          confirmar={confirmar}
          onCambio={loadAll}
        />
      )}

      {modal === "editar-usuario" && editing?.id_u && puedeEditar("usuarios") && (
        <EditarUsuarioModal
          usuarioId={editing.id_u}
          yoId={user.id}
          existentes={users}
          onClose={closeModal}
          notify={notify}
          onGuardado={async () => { closeModal(); await loadAll(); }}
        />
      )}

      {modal === "usuario" && puedeEditar("usuarios") && (
        <UsuarioModal
          modulo="deportivo"
          existentes={users}
          onClose={closeModal}
          notify={notify}
          onCreado={async () => { closeModal(); await loadAll(); }}
        />
      )}

      {avisos}
      {dialogo}
    </div>
  );
}

/* ================================================================
   EVENTOS
================================================================ */

function EventoModal({ item, kits, eventos, onClose, onSave, notify, onKitCreado }: {
  item?: Evento | null;
  kits: Kit[];
  eventos: Evento[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>, mantenerAbierto?: boolean, eventoId?: number) => Promise<Evento | null>;
  notify: Avisar;
  /** Un kit creado desde este formulario: se agrega a la lista del panel. */
  onKitCreado: (kit: Kit) => void;
}) {
  const [creandoKit, setCreandoKit] = useState(false);
  const [creandoRuta, setCreandoRuta] = useState(false);
  const [creandoEstacion, setCreandoEstacion] = useState(false);
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(item ?? null);
  const [rutas, setRutas] = useState<RutaEvento[]>([]);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const formularioRef = useRef<HTMLFormElement>(null);
  const accionDespuesDeGuardar = useRef<"estacion" | null>(null);

  useEffect(() => {
    let vigente = true;
    const eventoId = eventoActivo?.id ?? item?.id;
    const query = new URLSearchParams({ per_page: "200" });
    if (eventoId) query.set("evento_id_e", String(eventoId));
    setCargandoRutas(true);
    apiFetch(`/rutas-disponibles?${query}`)
      .then((respuesta) => {
        if (!vigente) return;
        const disponibles: RutaEvento[] = respuesta.data ?? [];
        setRutas(disponibles);
        setForm((actual) => {
          if (disponibles.some((ruta) => String(ruta.id_re) === (actual.ruta_id_re ?? ""))) return actual;
          const asignada = eventoId ? disponibles.find((ruta) => ruta.id_e === eventoId) : undefined;
          return { ...actual, ruta_id_re: asignada ? String(asignada.id_re) : "" };
        });
      })
      .catch((error) => {
        if (vigente) notify(error instanceof Error ? error.message : "No se pudieron cargar las rutas.", "error");
      })
      .finally(() => { if (vigente) setCargandoRutas(false); });
    return () => { vigente = false; };
  }, [eventoActivo?.id, item?.id]);

  const opcionesEventos: EventoOpcion[] = [
    ...eventos.map((evento) => ({ id: evento.id, nombre: evento.nombre, distancia: evento.distancia })),
    ...(eventoActivo && !eventos.some((evento) => evento.id === eventoActivo.id)
      ? [{ id: eventoActivo.id, nombre: eventoActivo.nombre, distancia: eventoActivo.distancia }]
      : []),
  ];

  // El kit se guarda ya (sin evento) y queda elegido; al guardar el evento se le asigna.
  const crearKit = async (datos: Record<string, unknown>) => {
    try {
      const { id_e: _sinEvento, ...kit } = datos;
      const respuesta = await apiFetch("/kits", { method: "POST", body: JSON.stringify(kit) });
      onKitCreado(respuesta.kit);
      set("id_k", String(respuesta.kit.id_k));
      try {
        Object.keys(sessionStorage)
          .filter(k => k.startsWith(DRAFT_PREFIX) && k.endsWith(`:${KIT_DESDE_EVENTO}`))
          .forEach(k => sessionStorage.removeItem(k));
      } catch {
        // sin almacenamiento: no hay borrador que limpiar
      }
      notify("Kit creado y elegido para este evento. También aparece en la sección Kits.");
      setCreandoKit(false);
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo crear el kit.", "error");
      return false;
    }
  };

  const [form, setForm] = usePersistentState(`${DRAFT_PREFIX}evento:${item?.id ?? "nuevo"}`, {
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
    ruta_id_re: "",
    imagen_e: item?.imagen ?? "",
  });
  const [preview, setPreview] = usePersistentState(`${DRAFT_PREFIX}evento-img:${item?.id ?? "nuevo"}`, item?.imagen_url ?? "");
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  const submit = async (e: React.FormEvent) => {
    const crearEstacionDespues = accionDespuesDeGuardar.current === "estacion";
    accionDespuesDeGuardar.current = null;
    const camposAdicionales = form.imagen_e ? [] : [{
      etiqueta: "Foto del evento",
      elemento: e.currentTarget.querySelector<HTMLElement>('[data-validacion="imagen-evento"]'),
    }];
    if (!validarFormularioDeportivo(e, notify, camposAdicionales)) return;

    setSaving(true);
    const respuesta = await onSave({
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
      ruta_id_re: Number(form.ruta_id_re),
    }, crearEstacionDespues, eventoActivo?.id ?? item?.id);
    setSaving(false);
    if (crearEstacionDespues && respuesta) {
      setEventoActivo(respuesta);
      setCreandoEstacion(true);
    }
  };

  return <>
  <Modal title={item ? "Editar evento" : "Nuevo evento deportivo"} subtitle="Se publica en SKYED Deportivo apenas quede activo." onClose={onClose} closeOnBackdrop={false}>
    <form ref={formularioRef} className="modal-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Nombre">
          <input required maxLength={120} value={form.nombre_e} onChange={e => set("nombre_e", capitalizeFirst(sanitizeText(e.target.value, 120)))} placeholder="Ej. Vuelta al Lago de Tota" />
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
          <input required maxLength={120} value={form.ubicacion_e} onChange={e => set("ubicacion_e", capitalizeFirst(sanitizePlace(e.target.value, 120)))} placeholder="Ej. Aquitania, Boyacá" />
        </Field>

        <Field label="Kit (opcional)">
          <div className="kit-fila">
            <select value={form.id_k} onChange={e => set("id_k", e.target.value)}>
              <option value="">Sin kit</option>
              {kits
                .filter(k => !k.eventos?.length || k.eventos.some(e => e.id_e === item?.id))
                .map(k => <option key={k.id_k} value={k.id_k}>{k.nombre_k} · {moneda(k.precio_k)}</option>)}
            </select>
            <button title="Crear un kit nuevo para este evento sin salir de aquí" type="button" className="crear-kit-btn" onClick={() => setCreandoKit(true)}>
              <Plus size={15} /> Crear kit
            </button>
          </div>
          <small className="field-hint">Solo aparecen los kits sin evento asignado. Cada kit es de un solo evento.</small>
        </Field>

        <Field label="Ruta obligatoria">
          <div className="kit-fila">
            <select required={!item} value={form.ruta_id_re ?? ""} onChange={(e) => set("ruta_id_re", e.target.value)} aria-label="Ruta del evento">
              <option value="">{cargandoRutas ? "Cargando rutas…" : "Selecciona una ruta"}</option>
              {rutas.map((ruta) => (
                <option key={ruta.id_re} value={ruta.id_re}>
                  {ruta.nombre_re}{ruta.distancia_re ? ` · ${ruta.distancia_re}` : ""}
                </option>
              ))}
            </select>
            <button type="button" className="crear-kit-btn" onClick={() => setCreandoRuta(true)}>
              <Plus size={15} /> Crear ruta
            </button>
          </div>
          {!cargandoRutas && !rutas.length && <small className="field-hint">No hay rutas disponibles. Crea una ruta para continuar.</small>}
        </Field>
      </div>

      <Field label="Descripción">
        <textarea required rows={3} maxLength={255} value={form.descripcion_e} onChange={e => set("descripcion_e", capitalizeFirst(e.target.value.slice(0, 255)))} />
        <small className="field-hint">{form.descripcion_e.length}/255 caracteres</small>
      </Field>

      <Field label="Requisitos">
        <textarea required rows={2} maxLength={255} value={form.requisitos_e} onChange={e => set("requisitos_e", capitalizeFirst(e.target.value.slice(0, 255)))} placeholder="Ej. Casco obligatorio, bicicleta en buen estado." />
        <small className="field-hint">{form.requisitos_e.length}/255 caracteres</small>
      </Field>

      <Field label="Foto del evento (obligatoria)">
        <div data-validacion="imagen-evento">
        <ImageUploadField
          path={form.imagen_e}
          previewUrl={preview}
          onChange={(path, url) => {
            set("imagen_e", path);
            setPreview(url);
            limpiarCampoValidacion(document.querySelector('[data-validacion="imagen-evento"]'));
          }}
          onError={notify}
        />
        </div>
      </Field>

      <div className="modal-actions">
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button type="button" className="secondary-btn" disabled={saving || cargandoRutas} onClick={() => {
          accionDespuesDeGuardar.current = "estacion";
          formularioRef.current?.requestSubmit();
        }}>{saving ? "Guardando…" : "Guardar y crear estación"}</button>
        <button title={saving ? 'Guardando…' : 'Guardar los cambios'} className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>

  {creandoKit && (
    <KitModal desdeEvento fechaEvento={form.fecha_e} eventos={[]} notify={notify} onClose={() => setCreandoKit(false)} onSave={crearKit} />
  )}
  {creandoRuta && (
    <RutaForm
      eventos={eventoActivo ? [{ id: eventoActivo.id, nombre: eventoActivo.nombre, distancia: eventoActivo.distancia }] : []}
      eventoInicialId={eventoActivo ? String(eventoActivo.id) : ""}
      onClose={() => setCreandoRuta(false)}
      notify={notify}
      onSave={async (datos) => {
        try {
          const eventoId = datos.id_e ? Number(datos.id_e) : null;
          const payload = { ...datos };
          delete payload.id_e;
          const respuesta = await apiFetch(eventoId ? `/eventos/${eventoId}/rutas` : "/rutas", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return respuesta.ruta as RutaEvento;
        } catch (error) {
          notify(error instanceof Error ? error.message : "No se pudo crear la ruta.", "error");
          return false;
        }
      }}
      onCreada={(ruta) => {
        setRutas((actuales) => [...actuales.filter((existente) => existente.id_re !== ruta.id_re), ruta]);
        set("ruta_id_re", String(ruta.id_re));
      }}
    />
  )}
  {creandoEstacion && eventoActivo && (
    <EstacionForm
      eventos={opcionesEventos}
      eventoInicialId={String(eventoActivo.id)}
      onClose={() => setCreandoEstacion(false)}
      notify={notify}
      onSave={async (datos) => {
        const eventoId = Number(datos.id_e);
        const payload = { ...datos };
        delete payload.id_e;
        try {
          await apiFetch(`/eventos/${eventoId}/estaciones`, { method: "POST", body: JSON.stringify(payload) });
          notify("Estación creada y asignada al evento.");
          return true;
        } catch (error) {
          notify(error instanceof Error ? error.message : "No se pudo crear la estación.", "error");
          return false;
        }
      }}
    />
  )}
  </>;
}

function CategoriasModal({ evento, onClose, notify, confirmar, permitirEditar, permitirEliminar }: {
  evento: Evento;
  onClose: () => void;
  notify: Avisar;
  confirmar: Confirmar;
  permitirEditar: boolean;
  permitirEliminar: boolean;
}) {
  const vacio = { nombre_cc: "", edad_minima_cc: "", edad_maxima_cc: "", genero_cc: "mixto", distancia_cc: "", descripcion_cc: "" };
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = usePersistentState(`${DRAFT_PREFIX}categoria:${evento.id}`, vacio);
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));

  const cargar = async () => {
    try {
      const res = await apiFetch(`/eventos/${evento.id}/categorias?per_page=100`);
      setCategorias(res.categorias ?? []);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudieron cargar las categorías.", "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const agregar = async (e: React.FormEvent) => {
    const min = form.edad_minima_cc === "" ? null : Number(form.edad_minima_cc);
    const max = form.edad_maxima_cc === "" ? null : Number(form.edad_maxima_cc);
    const camposAdicionales = min !== null && max !== null && max < min
      ? [{
          etiqueta: "Edad máxima",
          elemento: e.currentTarget.querySelector<HTMLElement>('[data-validacion="edad-maxima"]'),
        }]
      : [];
    if (!validarFormularioDeportivo(e, notify, camposAdicionales)) return;

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
      notify(err instanceof Error ? err.message : "No se pudo agregar la categoría.", "error");
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
      notify(err instanceof Error ? err.message : "No se pudo eliminar la categoría.", "error");
    }
  };

  const rango = (c: Categoria) => {
    if (c.edad_minima != null && c.edad_maxima != null) return `${c.edad_minima} a ${c.edad_maxima} años`;
    if (c.edad_minima != null) return `desde ${c.edad_minima} años`;
    if (c.edad_maxima != null) return `hasta ${c.edad_maxima} años`;
    return "todas las edades";
  };

  return <Modal title={`Categorías · ${evento.nombre}`} subtitle="El participante debe elegir una al inscribirse: un evento sin categorías no recibe inscripciones." onClose={onClose} closeOnBackdrop={false}>
    <div className="cat-list">
      {cargando && <p>Cargando…</p>}
      {!cargando && !categorias.length && <p className="field-hint field-hint-warn">Este evento todavía no tiene categorías.</p>}
      {categorias.map(c => (
        <div className="cat-item" key={c.id}>
          <div>
            <strong>{c.nombre}</strong>
            <span> · {rango(c)} · {human(c.genero ?? "mixto")}{c.distancia ? ` · ${c.distancia}` : ""}</span>
          </div>
          {permitirEliminar && <button type="button" className="table-action danger" title="Eliminar" onClick={() => eliminar(c)}><Trash2 size={15} /></button>}
        </div>
      ))}
    </div>

    {permitirEditar && <form className="modal-form" onSubmit={agregar} noValidate>
      <div className="form-grid">
        <Field label="Nombre de la categoría">
          <input required maxLength={50} value={form.nombre_cc} onChange={e => set("nombre_cc", capitalizeFirst(sanitizeText(e.target.value, 50)))} placeholder="Ej. Élite, Master A, Juvenil" />
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
          <input data-validacion="edad-maxima" type="number" min="0" max="120" inputMode="numeric" value={form.edad_maxima_cc} onChange={e => { set("edad_maxima_cc", sanitizeInteger(e.target.value, 3)); limpiarCampoValidacion(e.currentTarget); }} />
        </Field>
        <Field label="Distancia (opcional)">
          <input maxLength={45} value={form.distancia_cc} onChange={e => set("distancia_cc", sanitizeText(e.target.value, 45))} placeholder="Ej. 60 km" />
        </Field>
        <Field label="Descripción (opcional)">
          <input maxLength={255} value={form.descripcion_cc} onChange={e => set("descripcion_cc", capitalizeFirst(e.target.value.slice(0, 255)))} />
        </Field>
      </div>
      <div className="modal-actions">
        <button title="Terminar y cerrar" type="button" className="secondary-btn" onClick={onClose}>Listo</button>
        <button title={saving ? 'Agregando…' : 'Agregar la categoría'} className="primary-btn" disabled={saving}><Plus size={15} /> {saving ? "Agregando…" : "Agregar categoría"}</button>
      </div>
    </form>}
  </Modal>;
}

/* ================================================================
   PAGOS
================================================================ */

function PagoModal({ item, onClose, onCambiar, permitirCambiar }: {
  item: Pago;
  onClose: () => void;
  onCambiar: (estado: "confirmado" | "rechazado") => void;
  permitirCambiar: boolean;
}) {
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

  // Detalle de lo pagado: solo los conceptos que sí hubo (kit, invitado, kit del invitado).
  const desglose = ins?.desglose_precios;
  const inv = ins?.invitado;
  const nombreInv = inv ? `${inv.nombre_inv ?? ""} ${inv.apellido_inv ?? ""}`.trim() : "";
  const filasPago: { concepto: string; detalle?: string; valor: number }[] = [];
  if (desglose) {
    filasPago.push({ concepto: "Inscripción", valor: Number(desglose.inscripcion) || 0 });
    if (ins?.desea_kit_i) {
      filasPago.push({ concepto: "Kit de bienvenida", detalle: ins.talla_camiseta_i ? `Talla ${ins.talla_camiseta_i}` : undefined, valor: Number(desglose.kit) || 0 });
    }
    if (inv) {
      filasPago.push({ concepto: "Inscripción del invitado", detalle: nombreInv || undefined, valor: Number(desglose.invitado) || 0 });
      if (inv.desea_kit_inv) {
        filasPago.push({ concepto: "Kit del invitado", detalle: inv.talla_kit_inv ? `Talla ${inv.talla_kit_inv}` : undefined, valor: Number(desglose.kit_invitado) || 0 });
      }
    }
  }
  const sumaFilas = filasPago.reduce((acc, f) => acc + f.valor, 0);
  const hayMontos = sumaFilas > 0;
  const totalPagado = Number(item.monto_p ?? ins?.precio_pagado_i) || 0;
  const ajustePago = hayMontos ? Math.round(totalPagado - sumaFilas) : 0;
  const lineaPago = "1px solid color-mix(in srgb, currentColor 12%, transparent)";

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
      {filasPago.length > 0 && (
        <div className="message-box">
          <span>Detalle de lo que pagó</span>
          {filasPago.map(f => (
            <div key={f.concepto} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".5rem 0", borderBottom: lineaPago }}>
              <span>{f.concepto}{f.detalle ? ` · ${f.detalle}` : ""}</span>
              {hayMontos && <strong>{money(f.valor)}</strong>}
            </div>
          ))}
          {ajustePago !== 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".5rem 0", borderBottom: lineaPago }}>
              <span>{ajustePago < 0 ? "Descuento" : "Otros cargos"}</span>
              <strong>{ajustePago < 0 ? "-" : ""}{money(Math.abs(ajustePago))}</strong>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".65rem 0 .1rem" }}>
            <strong>Total</strong>
            <strong>{money(totalPagado)}</strong>
          </div>
        </div>
      )}
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
                <a title="Abrir el comprobante en una pestaña nueva a tamaño grande" className="secondary-btn" href={comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
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
        <button title="Cerrar esta ventana" type="button" className="secondary-btn" onClick={onClose}>Cerrar</button>
        {permitirCambiar && item.estado_p === "pendiente" && <>
          <button title="Rechazar el pago" type="button" className="secondary-btn danger" onClick={() => onCambiar("rechazado")}><X size={15} /> Rechazar</button>
          <button title="Confirmar el pago" type="button" className="primary-btn" onClick={() => onCambiar("confirmado")}><Check size={15} /> Confirmar pago</button>
        </>}
      </div>
    </div>
  </Modal>;
}

/* ================================================================
   ENTREGAS DE KITS (a quién, de qué evento y en qué estado)
================================================================ */

type EntregaFila = {
  id_ek: number;
  id_i: number | null;
  id_inv: number | null;
  rol: "titular" | "invitado";
  nombre?: string | null;
  documento?: string | number | null;
  titular?: string | null;
  evento?: { id: number; nombre: string } | null;
  kit?: string | null;
  talla?: string | null;
  estado: string; // pendiente | entregado
  fecha_entrega?: string | null;
  entregado_por?: string | null;
};

const ESTADO_ENTREGA: Record<string, string> = { pendiente: "Pendiente", entregado: "Entregado" };

const fechaHoraEntrega = (f?: string | null) => {
  if (!f) return "—";
  const d = new Date(String(f).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

function EntregasKit({ eventos, search, notify }: { eventos: Evento[]; search: string; notify: Avisar }) {
  const [filas, setFilas] = useState<EntregaFila[]>([]);
  const [resumen, setResumen] = useState({ pendiente: 0, entregado: 0 });
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [ultima, setUltima] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState("");
  const [evento, setEvento] = useState("");
  const [rol, setRol] = useState("");
  const [q, setQ] = useState("");

  // La búsqueda del encabezado se aplica con una pequeña espera para no pedir en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPagina(1); }, [q, estado, evento, rol]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = new URLSearchParams({ page: String(pagina), per_page: "25" });
    if (q) params.set("q", q);
    if (estado) params.set("estado", estado);
    if (evento) params.set("id_e", evento);
    if (rol) params.set("rol", rol);

    apiFetch(`/entregas-kit?${params.toString()}`)
      .then(res => {
        if (!activo) return;
        const e = res?.entregas;
        setFilas(e?.data ?? []);
        setTotal(e?.total ?? 0);
        setUltima(e?.last_page ?? 1);
        setResumen({
          pendiente: res?.resumen?.pendiente ?? 0,
          entregado: res?.resumen?.entregado ?? 0,
        });
      })
      .catch(err => { if (activo) notify(err instanceof Error ? err.message : "No se pudieron cargar las entregas."); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [pagina, q, estado, evento, rol]);

  const hayFiltros = !!(estado || evento || rol);

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi icon={<Check size={19} />} label="Entregados" value={resumen.entregado} />
        <Kpi icon={<Package size={19} />} label="Pendientes" value={resumen.pendiente} />
      </div>

      <SectionTable
        title="Entrega de kits"
        exportar={<ExportMenu ruta="deportivo/entregas-kits" archivo="skyed-deportivo-entregas-kits" params={{
          q,
          estado: estado || undefined,
          evento: evento || undefined,
          rol: rol || undefined,
        }} onMensaje={notify} />}
        toolbar={<>
          <select className="admin-select" value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
          </select>
          <select className="admin-select" value={evento} onChange={e => setEvento(e.target.value)} aria-label="Filtrar por evento">
            <option value="">Todos los eventos</option>
            {eventos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select className="admin-select" value={rol} onChange={e => setRol(e.target.value)} aria-label="Filtrar por persona">
            <option value="">Titulares e invitados</option>
            <option value="titular">Solo titulares</option>
            <option value="invitado">Solo invitados</option>
          </select>
          {hayFiltros && (
            <button title="Quitar todos los filtros aplicados" type="button" className="secondary-btn filter-clear" onClick={() => { setEstado(""); setEvento(""); setRol(""); }}>
              <X size={14} /> Limpiar filtros
            </button>
          )}
          <span className="filter-count">{total} {total === 1 ? "kit" : "kits"}</span>
        </>}
      >
        <thead><tr><th>Persona</th><th>Documento</th><th>Evento</th><th>Kit</th><th>Estado</th><th>Fecha de entrega</th><th>Entregado por</th></tr></thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.id_ek}>
              <td>
                <strong>{f.nombre || "—"}</strong>
                <small style={{ display: "block", opacity: .75 }}>
                  {f.rol === "invitado" ? `Invitado${f.titular ? ` de ${f.titular}` : ""}` : "Titular"}
                </small>
              </td>
              <td>{f.documento ?? "—"}</td>
              <td>{f.evento?.nombre ?? "—"}</td>
              <td>{f.kit ?? "—"}{f.talla ? <small style={{ display: "block", opacity: .75 }}>Talla {f.talla}</small> : null}</td>
              <td><span className={`admin-badge ${f.estado}`}>{ESTADO_ENTREGA[f.estado] ?? f.estado}</span></td>
              <td>{f.estado === "entregado" ? fechaHoraEntrega(f.fecha_entrega) : "—"}</td>
              <td>{f.estado === "entregado" ? (f.entregado_por || "—") : "—"}</td>
            </tr>
          ))}
          {!filas.length && (
            <tr><td colSpan={7}>{cargando ? "Cargando entregas…" : (q || hayFiltros ? "No hay entregas con estos filtros." : "Aún no hay kits por entregar.")}</td></tr>
          )}
        </tbody>
      </SectionTable>

      {ultima > 1 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 14 }}>
          <button type="button" className="secondary-btn" disabled={pagina <= 1 || cargando} onClick={() => setPagina(p => Math.max(1, p - 1))}>Anterior</button>
          <span className="filter-count">Página {pagina} de {ultima}</span>
          <button type="button" className="secondary-btn" disabled={pagina >= ultima || cargando} onClick={() => setPagina(p => Math.min(ultima, p + 1))}>Siguiente</button>
        </div>
      )}
    </>
  );
}

/* ================================================================
   CONTROL DE ACCESO (QR)
================================================================ */

function ControlAcceso({ notify, onValidado }: { notify: Avisar; onValidado: () => void }) {
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
      const acceso = res.acceso;
      const total: number = acceso?.usos_permitidos ?? 1;
      const numero: number = acceso?.ingreso_numero ?? 1;
      const faltan: number = acceso?.usos_restantes ?? 0;
      const personas: Array<{ rol: string; nombre: string; documento?: string | number | null }> = acceso?.personas ?? [];
      const nombreTitular = nombreDe(ins?.usuario);
      const nombreEvento = ins?.evento?.nombre_e ?? "";
      // Con invitado el QR sirve para 2 personas: se muestra cuántas van y quiénes
      // deben presentarse, con su documento, para verificarlas en la puerta.
      const entrada = total > 1 ? `Entrada ${numero} de ${total}` : "";
      const estadoEntradas = total > 1
        ? (faltan > 0
            ? `Falta que ingrese ${faltan} persona${faltan > 1 ? "s" : ""} más.`
            : "Ya ingresaron todas las personas.")
        : "";
      ingreso = {
        ok: true,
        titulo: "Acceso permitido",
        detalle: [
          entrada,
          nombreEvento,
          ...personas.map(p => `${p.rol === "invitado" ? "Invitado" : "Titular"}: ${p.nombre}${p.documento ? ` · Doc. ${p.documento}` : ""}`),
          estadoEntradas,
        ].filter(Boolean),
        hora,
        nombre: nombreTitular,
        evento: nombreEvento,
        entrada,
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
    <>
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
            Cada QR sirve una vez por persona: una entrada si va solo el titular y dos si lleva invitado.
            Solo funciona si el pago está confirmado.
          </p>
          <form className="qr-check-form" noValidate onSubmit={e => { if (validarFormularioDeportivo(e, notify)) validar(codigo); }}>
            <input
              required
              value={codigo}
              onChange={e => setCodigo(e.target.value.slice(0, 255))}
              placeholder="Código del QR"
              aria-label="Código del QR"
              autoFocus
            />
            <button title={validando ? 'Validando…' : 'Validar el código de entrada'} className="primary-btn" disabled={validando}>
              {validando ? <Loader2 size={16} className="admin-spin" /> : <ScanLine size={16} />} Validar
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {camara
              ? <button title="Apagar la cámara" type="button" className="secondary-btn" onClick={detenerCamara}><CameraOff size={15} /> Apagar cámara</button>
              : <button title="Escanear el código QR con la cámara" type="button" className="secondary-btn" onClick={iniciarCamara}><Camera size={15} /> Escanear con la cámara</button>}
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
                    <strong>{h.ok ? (h.nombre ?? h.detalle[0]) : h.titulo}</strong>
                    <span>{h.hora} · {h.ok ? [h.entrada, h.evento].filter(Boolean).join(" · ") : h.detalle[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </section>
    <ControlKit notify={notify} onValidado={onValidado} />
    </>
  );
}

/* ================================================================
   CONTROL DE ACCESO: RETIRO DEL KIT (QR "KIT-…")
================================================================ */

type KitPersona = {
  id_inv: number | null;
  rol: string;
  nombre: string | null;
  documento?: string | number | null;
  talla?: string | null;
  estado: string;
};
type KitConsulta = {
  codigo: string;
  evento?: { id: number; nombre: string };
  kit?: string | null;
  kits: KitPersona[];
  pendientes: number;
};

function ControlKit({ notify, onValidado }: { notify: Avisar; onValidado: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const [consulta, setConsulta] = useState<KitConsulta | null>(null);
  const [errorKit, setErrorKit] = useState("");
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

  const aConsulta = (cod: string, res: any): KitConsulta => ({
    codigo: cod,
    evento: res.evento,
    kit: res.kit,
    kits: res.kits ?? [],
    pendientes: res.pendientes ?? 0,
  });

  const consultar = async (valor: string) => {
    const limpio = valor.trim();
    if (!limpio || consultando) return;
    setConsultando(true);
    setErrorKit("");
    try {
      const res = await apiFetch("/qr/kit/consultar", { method: "POST", body: JSON.stringify({ codigo_kit: limpio }) });
      setConsulta(aConsulta(limpio, res));
    } catch (err) {
      setConsulta(null);
      setErrorKit(err instanceof Error ? err.message : "No se pudo consultar el código del kit.");
    }
    setCodigo("");
    setConsultando(false);
  };

  const entregar = async () => {
    if (!consulta || entregando) return;
    setEntregando(true);
    try {
      const res = await apiFetch("/qr/kit/entregar", { method: "POST", body: JSON.stringify({ codigo_kit: consulta.codigo }) });
      setConsulta(aConsulta(consulta.codigo, res));
      notify(res.message ?? "Kit entregado.");
      onValidado();
    } catch (err) {
      setErrorKit(err instanceof Error ? err.message : "No se pudo registrar la entrega.");
      setConsulta(null);
    }
    setEntregando(false);
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
            consultar(qr.data);
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
    <section className="section-view" style={{ marginTop: 32 }}>
      <div className="section-header">
        <div>
          <span className="card-kicker">ENTREGA DE KITS</span>
          <h2>Validar retiro del kit con QR</h2>
        </div>
      </div>
      <div className="qr-check">
        <div className="admin-card">
          <p style={{ margin: 0 }}>
            Escanea el QR de "Retiro del kit" del participante o escribe el código que aparece debajo de él.
            Primero verás quién retira y de qué talla; luego confirmas la entrega.
            Solo funciona si el pago está confirmado.
          </p>
          <form className="qr-check-form" noValidate onSubmit={e => { if (validarFormularioDeportivo(e, notify)) consultar(codigo); }}>
            <input
              required
              value={codigo}
              onChange={e => setCodigo(e.target.value.slice(0, 255))}
              placeholder="Código del kit (KIT-…)"
              aria-label="Código del QR del kit"
            />
            <button title={consultando ? "Consultando…" : "Consultar el código del kit"} className="primary-btn" disabled={consultando}>
              {consultando ? <Loader2 size={16} className="admin-spin" /> : <ScanLine size={16} />} Validar
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {camara
              ? <button title="Apagar la cámara" type="button" className="secondary-btn" onClick={detenerCamara}><CameraOff size={15} /> Apagar cámara</button>
              : <button title="Escanear el código QR del kit con la cámara" type="button" className="secondary-btn" onClick={iniciarCamara}><Camera size={15} /> Escanear con la cámara</button>}
          </div>
          <video ref={videoRef} className="qr-video" muted playsInline hidden={!camara} />
        </div>

        <div className="admin-card">
          {consulta ? (
            <div className={`qr-result ${consulta.pendientes > 0 ? "ok" : ""}`} role="status">
              <strong>{consulta.pendientes > 0 ? "✓ Kit por entregar" : "Los kits ya fueron entregados"}</strong>
              {consulta.evento?.nombre && <p>{consulta.evento.nombre}{consulta.kit ? ` · ${consulta.kit}` : ""}</p>}
              {consulta.kits.map((k, i) => (
                <p key={i}>
                  {k.rol === "invitado" ? "Invitado" : "Titular"}: {k.nombre ?? "—"}
                  {k.documento ? ` · Doc. ${k.documento}` : ""} · Talla {k.talla || "—"} · {k.estado === "entregado" ? "Entregado" : "Por entregar"}
                </p>
              ))}
              {consulta.pendientes > 0 && (
                <button title="Confirmar la entrega del kit" type="button" className="primary-btn" style={{ marginTop: 10 }} disabled={entregando} onClick={entregar}>
                  {entregando ? <Loader2 size={16} className="admin-spin" /> : <Package size={16} />}{" "}
                  {consulta.pendientes === 1 ? "Entregar kit" : `Entregar ${consulta.pendientes} kits`}
                </button>
              )}
            </div>
          ) : errorKit ? (
            <div className="qr-result error" role="status">
              <strong>✕ No se puede entregar</strong>
              <p>{errorKit}</p>
            </div>
          ) : (
            <div className="qr-result" role="status">
              <strong>Esperando un código…</strong>
              <p>Aquí verás quién retira el kit y su talla.</p>
            </div>
          )}
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
  notify: Avisar;
}) {
  const [eventoId, setEventoId] = usePersistentState(`${DRAFT_PREFIX}resultado-evento:${item?.id_r ?? "nuevo"}`, item?.inscripcion?.evento?.id_e ? String(item.inscripcion.evento.id_e) : "");
  const [inscripciones, setInscripciones] = useState<InscripcionOpcion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = usePersistentState(`${DRAFT_PREFIX}resultado:${item?.id_r ?? "nuevo"}`, {
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
      .catch(err => notify(err instanceof Error ? err.message : "No se pudieron cargar los inscritos.", "error"));
    return () => { cancelado = true; };
  }, [eventoId]);

  const submit = async (e: React.FormEvent) => {
    if (!validarFormularioDeportivo(e, notify)) return;
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
    closeOnBackdrop={false}
    title={item ? "Editar resultado" : "Registrar resultado"}
    subtitle={item ? `${nombreDe(item.inscripcion?.usuario)} · ${item.inscripcion?.evento?.nombre_e ?? ""}` : "Solo aparecen participantes con el pago confirmado."}
    onClose={onClose}
  >
    <form className="modal-form" onSubmit={submit} noValidate>
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
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button title={saving ? 'Guardando…' : 'Guardar el orden'} className="primary-btn" disabled={saving}><ListOrdered size={15} /> {saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

/* ================================================================
   KITS
================================================================ */

const TALLAS_RAPIDAS = ["XS", "S", "M", "L", "XL", "XXL"];
type FilaTalla = { talla: string; cantidad: string };

/**
 * Inventario del kit por talla: una fila por talla con su cantidad.
 * El stock total del kit es la suma de las cantidades.
 */
function TallasTabla({ filas, onChange, obligatorio, legacy, existentes }: {
  filas: FilaTalla[];
  onChange: (filas: FilaTalla[]) => void;
  obligatorio: boolean;
  legacy: boolean;
  /** Tallas que ya estaban guardadas en el kit: solo ellas pueden quedar en 0 (agotadas). */
  existentes: string[];
}) {
  const usadas = new Set(filas.map(f => f.talla.trim().toUpperCase()));
  const total = filas.reduce((suma, f) => suma + (Number(f.cantidad) || 0), 0);

  const agregar = (talla = "") => onChange([...filas, { talla, cantidad: "" }]);
  const cambiar = (i: number, campo: keyof FilaTalla, valor: string) =>
    onChange(filas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const quitar = (i: number) => onChange(filas.filter((_, j) => j !== i));

  const celda: React.CSSProperties = { padding: ".35rem .5rem", textAlign: "left" };
  const borde = "1px solid color-mix(in srgb, currentColor 18%, transparent)";

  return (
    <div className="admin-field" data-validacion="tallas-kit">
      <span>{obligatorio ? "Tallas y cantidades (obligatorio)" : "Tallas y cantidades"}</span>

      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center" }}>
        {TALLAS_RAPIDAS.filter(t => !usadas.has(t)).map(t => (
          <button key={t} type="button" title={`Agregar la talla ${t}`} className="secondary-btn" onClick={() => agregar(t)}>
            <Plus size={13} /> {t}
          </button>
        ))}
        <button type="button" title="Agregar otra talla" className="secondary-btn" onClick={() => agregar("")}>
          <Plus size={13} /> Otra talla
        </button>
      </div>

      {filas.length > 0 ? (
        <div style={{ overflowX: "auto", marginTop: 8, border: borde, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: borde, opacity: .8 }}>
                <th style={celda}>Talla</th>
                <th style={celda}>Cantidad disponible</th>
                <th style={{ ...celda, width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} style={{ borderBottom: i < filas.length - 1 ? borde : "none" }}>
                  <td style={celda}>
                    <input
                      value={f.talla}
                      maxLength={10}
                      aria-label="Talla"
                      data-validacion={`kit-talla-${i}`}
                      placeholder="Ej. M"
                      onChange={e => { cambiar(i, "talla", sanitizeText(e.target.value, 10).toUpperCase()); limpiarCampoValidacion(e.currentTarget); }}
                    />
                  </td>
                  <td style={celda}>
                    <input
                      type="number"
                      min={existentes.includes(f.talla.trim().toUpperCase()) ? 0 : 1}
                      inputMode="numeric"
                      aria-label={`Cantidad de la talla ${f.talla || i + 1}`}
                      data-validacion={`kit-cantidad-${i}`}
                      placeholder="Ej. 10"
                      value={f.cantidad}
                      onChange={e => { cambiar(i, "cantidad", sanitizeInteger(e.target.value, 5)); limpiarCampoValidacion(e.currentTarget); }}
                    />
                  </td>
                  <td style={celda}>
                    <button type="button" className="table-action danger" title="Quitar talla" onClick={() => quitar(i)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: borde }}>
                <td style={celda}><strong>Total de kits</strong></td>
                <td style={celda}><strong>{total}</strong></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p style={{ margin: ".6rem 0 0", opacity: .75, fontSize: ".85rem" }}>
          {legacy
            ? "Este kit aún no tiene tallas con cantidad. Agrégalas para llevar el inventario por talla."
            : "Agrega las tallas del kit con las unidades que hay de cada una."}
        </p>
      )}

      <small className="field-hint">
        Las unidades se descuentan al inscribirse y vuelven si la inscripción se cancela.
      </small>
    </div>
  );
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
const normalizarBusqueda = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Selector de evento con foto, nombre y buscador.
 * La lista es visible (no flota), así que funciona igual en claro/oscuro y en móvil.
 */
function EventoPicker({ eventos, value, onChange, obligatorio }: {
  eventos: Evento[];
  value: string;
  onChange: (id: string) => void;
  obligatorio: boolean;
}) {
  const [q, setQ] = useState("");
  const termino = normalizarBusqueda(q);
  const lista = eventos.filter(e =>
    !termino || normalizarBusqueda(`${e.nombre} ${e.ubicacion ?? ""} ${e.categoria ?? ""} ${e.fecha ?? ""}`).includes(termino)
  );
  const seleccionado = eventos.find(e => String(e.id) === value);

  const fila = (activo: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: ".7rem", width: "100%", textAlign: "left",
    padding: ".5rem .6rem", borderRadius: 10, cursor: "pointer", color: "inherit", font: "inherit",
    border: `1px solid ${activo ? "var(--admin-accent, #2c9caf)" : "transparent"}`,
    background: activo ? "color-mix(in srgb, var(--admin-accent, #2c9caf) 14%, transparent)" : "transparent",
  });
  const miniatura: React.CSSProperties = {
    width: 52, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0,
    background: "color-mix(in srgb, currentColor 10%, transparent)",
  };

  return (
    <div className="admin-field" data-validacion="kit-evento">
      <span>{obligatorio ? "Evento (obligatorio)" : "Evento"}</span>

      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
        <Search size={16} style={{ opacity: .6, flexShrink: 0 }} aria-hidden="true" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar evento por nombre, lugar o fecha…"
          aria-label="Buscar evento"
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      <div
        role="listbox"
        aria-label="Eventos disponibles"
        style={{
          maxHeight: 230, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4,
          padding: 6, borderRadius: 12, marginTop: 6,
          border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
        }}
      >
        {lista.map(e => {
          const activo = String(e.id) === value;
          return (
            <button key={e.id} type="button" title={`Seleccionar ${e.nombre}`} role="option" aria-selected={activo} style={fila(activo)} onClick={ev => { onChange(String(e.id)); limpiarCampoValidacion(ev.currentTarget.closest(".admin-field")); }}>
              {e.imagen_url
                ? <img src={e.imagen_url} alt="" style={miniatura} onError={ev => { (ev.target as HTMLImageElement).style.visibility = "hidden"; }} />
                : <span style={{ ...miniatura, display: "grid", placeItems: "center", opacity: .7 }}><ImagePlus size={16} /></span>}
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nombre}</strong>
                <small style={{ opacity: .7 }}>{e.fecha?.slice(0, 10)} · {e.ubicacion}</small>
              </span>
              {activo && <Check size={16} style={{ color: "var(--admin-accent, #2c9caf)", flexShrink: 0 }} />}
            </button>
          );
        })}

        {!lista.length && (
          <p style={{ margin: ".6rem", opacity: .7, fontSize: ".85rem" }}>
            {eventos.length ? "Ningún evento coincide con la búsqueda." : "No hay eventos sin kit. Libera uno o crea un evento nuevo."}
          </p>
        )}
      </div>

      <small className="field-hint">
        {seleccionado ? `Seleccionado: ${seleccionado.nombre}. ` : (obligatorio ? "Debes elegir un evento. " : "")}Solo aparecen los eventos que aún no tienen kit.
      </small>
    </div>
  );
}

function KitModal({ item, eventos, onClose, onSave, notify, desdeEvento = false, fechaEvento }: {
  item?: Kit | null;
  eventos: Evento[];
  /** Fecha del evento (YYYY-MM-DD) cuando el kit se crea desde el formulario del evento. */
  fechaEvento?: string;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  notify: (m: string) => void;
  /** Se abre desde el formulario del evento: el kit queda asignado a ese evento al guardarlo, así que no se elige aquí. */
  desdeEvento?: boolean;
}) {
  // Eventos que pueden recibir este kit: los que no tienen kit, o el que ya lo tiene asignado.
  const eventosDisponibles = eventos.filter(e => !e.kit || e.kit.id === item?.id_k);
  // Borrador aparte del de la sección Kits, para no mezclar lo escrito en uno y otro.
  const borrador = item?.id_k ?? (desdeEvento ? KIT_DESDE_EVENTO : "nuevo");
  const [form, setForm] = usePersistentState(`${DRAFT_PREFIX}kit:${borrador}`, {
    id_e: item?.eventos?.[0]?.id_e ? String(item.eventos[0].id_e) : "",
    nombre_k: item?.nombre_k ?? "",
    precio_k: item?.precio_k != null ? String(Math.round(Number(item.precio_k))) : "",
    fecha_entrega_k: item?.fecha_entrega_k?.slice(0, 10) ?? "",
    lugar_entrega_k: item?.lugar_entrega_k ?? "",
    contenido_k: item?.contenido_k ?? "",
    imagen_k: item?.imagen_k ?? "",
  });
  // Al editar, una talla que ya existía puede quedar en 0 (agotada); una talla nueva siempre debe tener al menos 1.
  const tallasGuardadas = item?.tallas?.map(t => t.talla_kt.toUpperCase()) ?? [];
  const [tallas, setTallas] = usePersistentState<FilaTalla[]>(`${DRAFT_PREFIX}kit-tallas:${borrador}`,
    item?.tallas?.map(t => ({ talla: t.talla_kt, cantidad: String(t.cantidad_kt) })) ?? []
  );
  const [preview, setPreview] = usePersistentState(`${DRAFT_PREFIX}kit-img:${borrador}`, item?.imagen_url ?? "");
  const [saving, setSaving] = useState(false);
  const set = (campo: keyof typeof form, valor: string) => setForm(f => ({ ...f, [campo]: valor }));
  // Al crear un kit todos los datos son obligatorios; al editar solo se cambia lo que se quiera.
  const esNuevo = !item;
  // La entrega va desde 10 días antes del evento hasta el día del evento.
  const fechaDelEvento = fechaEvento ?? eventos.find(ev => String(ev.id) === form.id_e)?.fecha?.slice(0, 10);
  const rangoEntrega = rangoEntregaKit(fechaDelEvento);

  const submit = async (e: React.FormEvent) => {
    const camposAdicionales: Array<{ etiqueta: string; elemento: HTMLElement | null }> = [];
    if (esNuevo && !form.id_e && !desdeEvento) {
      camposAdicionales.push({ etiqueta: "Evento", elemento: e.currentTarget.querySelector('[data-validacion="kit-evento"]') });
    }
    if (esNuevo && !form.imagen_k) {
      camposAdicionales.push({ etiqueta: "Imagen del kit", elemento: e.currentTarget.querySelector('[data-validacion="imagen-kit"]') });
    }
    if (esNuevo && !tallas.length) {
      camposAdicionales.push({ etiqueta: "Tallas y cantidades", elemento: e.currentTarget.querySelector('[data-validacion="tallas-kit"]') });
    }

    if (rangoEntrega && form.fecha_entrega_k && (form.fecha_entrega_k < rangoEntrega.min || form.fecha_entrega_k > rangoEntrega.max)) {
      camposAdicionales.push({ etiqueta: `Fecha de entrega (entre ${formatDate(rangoEntrega.min)} y ${formatDate(rangoEntrega.max)})`, elemento: e.currentTarget.querySelector("#kit-fecha-entrega") });
    }

    tallas.forEach((fila, i) => {
      if (!fila.talla.trim()) {
        camposAdicionales.push({ etiqueta: `Talla ${i + 1}`, elemento: e.currentTarget.querySelector(`[data-validacion="kit-talla-${i}"]`) });
      }
      if (fila.cantidad === "" || (Number(fila.cantidad) < 1 && !tallasGuardadas.includes(fila.talla.trim().toUpperCase()))) {
        camposAdicionales.push({ etiqueta: `Cantidad de la talla ${fila.talla.trim() || i + 1}`, elemento: e.currentTarget.querySelector(`[data-validacion="kit-cantidad-${i}"]`) });
      }
    });

    const nombresTalla = tallas.map(f => f.talla.trim().toUpperCase());
    const repetidas = new Set(nombresTalla.filter((nombre, i) => nombre && nombresTalla.indexOf(nombre) !== i));
    repetidas.forEach(nombre => {
      const i = nombresTalla.indexOf(nombre);
      camposAdicionales.push({ etiqueta: `Talla ${nombre} (repetida)`, elemento: e.currentTarget.querySelector(`[data-validacion="kit-talla-${i}"]`) });
    });

    if (!validarFormularioDeportivo(e, notify, camposAdicionales)) return;

    // Al editar solo se envían los campos que tienen valor; los vacíos se dejan como estaban.
    const datos: Record<string, unknown> = {
      nombre_k: form.nombre_k.trim(),
      precio_k: form.precio_k === "" ? "" : Number(form.precio_k),
      id_e: form.id_e ? Number(form.id_e) : "",
      fecha_entrega_k: form.fecha_entrega_k,
      lugar_entrega_k: form.lugar_entrega_k.trim(),
      contenido_k: form.contenido_k.trim(),
      imagen_k: form.imagen_k,
      tallas: tallas.length ? tallas.map(f => ({ talla: f.talla.trim().toUpperCase(), cantidad: Number(f.cantidad) })) : "",
    };
    const payload = esNuevo
      ? datos
      : Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== ""));

    setSaving(true);
    await onSave(payload);
    setSaving(false);
  };

  return <Modal
    title={item ? "Editar kit" : "Nuevo kit"}
    subtitle={desdeEvento ? "Queda asignado al evento que estás creando o editando." : "Cada kit es individual: se asigna a un solo evento."}
    onClose={onClose}
    closeOnBackdrop={false}
  >
    <form className="modal-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Nombre">
          <input required={esNuevo} maxLength={45} value={form.nombre_k} onChange={e => set("nombre_k", capitalizeFirst(sanitizeText(e.target.value, 45)))} placeholder="Ej. Kit Gran Fondo 2026" />
        </Field>
        <Field label="Precio del kit (COP)">
          <input required={esNuevo} type="number" min="0" inputMode="numeric" value={form.precio_k} onChange={e => set("precio_k", sanitizeInteger(e.target.value, 8))} placeholder="Ej. 45000" />
          <small className="field-hint">Se suma al total que paga el participante si pide el kit.</small>
        </Field>
        <Field label="Fecha de entrega">
          <input id="kit-fecha-entrega" required={esNuevo} type="date" min={rangoEntrega?.min} max={rangoEntrega?.max} value={form.fecha_entrega_k} onChange={e => set("fecha_entrega_k", e.target.value)} />
          <small className="field-hint">
            {rangoEntrega
              ? `Desde ${formatDate(rangoEntrega.min)} hasta el día del evento (${formatDate(rangoEntrega.max)}).`
              : desdeEvento
                ? "Primero elige la fecha del evento: la entrega puede ser hasta ese día y desde 10 días antes."
                : "Elige un evento abajo: la entrega puede ser hasta el día del evento y desde 10 días antes."}
          </small>
        </Field>
        <Field label="Lugar de entrega">
          <input required={esNuevo} maxLength={45} value={form.lugar_entrega_k} onChange={e => set("lugar_entrega_k", capitalizeFirst(sanitizePlace(e.target.value, 45)))} />
        </Field>
      </div>
      <TallasTabla filas={tallas} onChange={setTallas} obligatorio={esNuevo} legacy={!esNuevo} existentes={tallasGuardadas} />
      {!desdeEvento && <EventoPicker eventos={eventosDisponibles} value={form.id_e} onChange={id => set("id_e", id)} obligatorio={esNuevo} />}
      <Field label={esNuevo ? "Imagen del kit (obligatoria)" : "Imagen del kit"}>
        <div data-validacion="imagen-kit">
        <ImageUploadField
          path={form.imagen_k}
          previewUrl={preview}
          onChange={(path, url) => {
            set("imagen_k", path);
            setPreview(url);
            limpiarCampoValidacion(document.querySelector('[data-validacion="imagen-kit"]'));
          }}
          onError={notify}
        />
        </div>
        <small className="field-hint">Una foto de cómo se ve el kit. Se muestra cuadrada a los participantes, así que usa una foto cuadrada o con el kit al centro para que no se recorte.</small>
      </Field>
      <Field label="Contenido">
        <textarea required={esNuevo} rows={3} maxLength={255} value={form.contenido_k} onChange={e => set("contenido_k", capitalizeFirst(e.target.value.slice(0, 255)))} placeholder="Ej. Jersey, número, chip de cronometraje, hidratación." />
        <small className="field-hint">{form.contenido_k.length}/255 caracteres</small>
      </Field>
      <div className="modal-actions">
        <button title="Cancelar y cerrar sin guardar" type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button title={saving ? 'Guardando…' : 'Guardar los cambios'} className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </Modal>;
}

export default function Admin() {
  return <Protected><AdminPage /></Protected>;
}