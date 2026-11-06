import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { apiFetch } from "../../services/api";
import ExportMenu from "../shared/ExportMenu";
import type { Avisar } from "../shared/Avisos";
import type { OpcionesConfirmacion } from "../shared/ConfirmDialog";
import { prepararImagen } from "../../utils/prepararImagen";
import { limpiarCampoValidacion, validarFormularioDeportivo } from "../../utils/validarFormularioDeportivo";

export type CatalogoDeportivo = "patrocinadores" | "rutas" | "estaciones";

type EventoOpcion = { id: number; nombre: string };

type Patrocinador = {
  id_p: number;
  nombre_p: string;
  logo_p?: string | null;
  telefono_p?: string | null;
  correo_p?: string | null;
  pagina_web_p?: string | null;
  aporte_p?: string | null;
  estado_p?: string | null;
  eventos?: Array<{
    id_e: number;
    nombre_e: string;
    pivot?: { detalle?: string | null };
  }>;
};

type RutaEvento = {
  id_re: number;
  id_e: number;
  nombre_re: string;
  estado_re?: string | null;
  distancia_re?: string | null;
  desnivel_re?: string | null;
  descripcion_re?: string | null;
  archivo_gpx_re?: string | null;
  precio_re?: number | string | null;
  evento?: { id_e: number; nombre_e: string };
};

type Estacion = {
  id_est: number;
  id_e: number;
  nombre_est?: string | null;
  tipo_est: string;
  kilometro_est?: string | null;
  latitud_est?: number | string | null;
  longitud_est?: number | string | null;
  descripcion_pest?: string | null;
  estado_est?: string | null;
  evento?: { id_e: number; nombre_e: string };
};

type Paginated<T> = {
  data: T[];
  last_page?: number;
  meta?: { last_page?: number };
};

type ModalState =
  | { tipo: "patrocinador"; item?: Patrocinador }
  | { tipo: "ruta"; item?: RutaEvento }
  | { tipo: "estacion"; item?: Estacion }
  | null;

type RegistroEliminable =
  | { tipo: "patrocinador"; item: Patrocinador }
  | { tipo: "ruta"; item: RutaEvento }
  | { tipo: "estacion"; item: Estacion };

const TIPOS_ESTACION = [
  ["hidratacion", "Hidratación"],
  ["primeros_auxilios", "Primeros auxilios"],
  ["control", "Control"],
  ["meta", "Meta"],
  ["general", "General"],
] as const;

const normalizar = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function listarTodo<T>(ruta: string): Promise<T[]> {
  const primera: Paginated<T> = await apiFetch(`${ruta}?per_page=500&page=1`);
  if (!Array.isArray(primera.data)) {
    throw new Error("La respuesta de la API no tiene el formato esperado.");
  }

  const paginas = [primera.data];
  const ultimaPagina = Math.max(1, Number(primera.meta?.last_page ?? primera.last_page ?? 1));
  for (let pagina = 2; pagina <= ultimaPagina; pagina += 1) {
    const respuesta: Paginated<T> = await apiFetch(`${ruta}?per_page=500&page=${pagina}`);
    if (!Array.isArray(respuesta.data)) {
      throw new Error("La respuesta de la API no tiene el formato esperado.");
    }
    paginas.push(respuesta.data);
  }
  return paginas.flat();
}

function TableSection({
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
  toolbar?: ReactNode;
  exportar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-view" aria-label={title}>
      <div className="section-header">
        <div><span className="card-kicker">GESTIÓN</span></div>
        {(exportar || action) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {exportar}
            {action && (
              <button type="button" className="primary-btn" onClick={onAction}>
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

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}

function Dialogo({
  title,
  subtitle,
  onClose,
  closeOnBackdrop = false,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => {
      if (closeOnBackdrop && e.target === e.currentTarget) onClose();
    }}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-modal-head">
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <button type="button" title="Cerrar" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AccionesFormulario({
  guardando,
  onCancel,
  textoGuardar,
  textoProcesando = "Guardando…",
}: {
  guardando: boolean;
  onCancel: () => void;
  textoGuardar: string;
  textoProcesando?: string;
}) {
  return (
    <div className="modal-actions">
      <button type="button" className="secondary-btn" disabled={guardando} onClick={onCancel}>Cancelar</button>
      <button type="submit" className="primary-btn" disabled={guardando}>
        {guardando ? textoProcesando : textoGuardar}
      </button>
    </div>
  );
}

function PatrocinadorForm({
  item,
  onClose,
  onSave,
  notify,
}: {
  item?: Patrocinador;
  onClose: () => void;
  onSave: (datos: Record<string, unknown>) => Promise<boolean>;
  notify: Avisar;
}) {
  const [form, setForm] = useState({
    nombre_p: item?.nombre_p ?? "",
    logo_p: item?.logo_p ?? "",
    telefono_p: item?.telefono_p ?? "",
    correo_p: item?.correo_p ?? "",
    pagina_web_p: item?.pagina_web_p ?? "",
    aporte_p: item?.aporte_p ?? "",
    estado_p: item?.estado_p ?? "activo",
  });
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [arrastrandoLogo, setArrastrandoLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const subirLogo = async (archivo?: File) => {
    if (!archivo || subiendoLogo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      notify("El logo debe ser una imagen JPG, PNG o WEBP.", "error");
      return;
    }

    setSubiendoLogo(true);
    setErrorLogo(false);
    try {
      const imagen = await prepararImagen(archivo);
      if (imagen.size > 8 * 1024 * 1024) {
        notify("El logo no debe superar 8 MB.", "error");
        return;
      }
      const datos = new FormData();
      datos.append("imagen", imagen);
      const respuesta = await apiFetch("/deportivo/imagenes", { method: "POST", body: datos });
      set("logo_p", respuesta.url);
      limpiarCampoValidacion(document.querySelector('[data-validacion="logo-patrocinador"]'));
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo subir el logo.", "error");
    } finally {
      setSubiendoLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    if (guardando) {
      e.preventDefault();
      return;
    }
    if (subiendoLogo) {
      e.preventDefault();
      notify("Espera a que termine de subir el logo antes de guardar.", "error");
      return;
    }
    const camposAdicionales = form.logo_p
      ? []
      : [{
          etiqueta: "Logo (imagen)",
          elemento: e.currentTarget.querySelector<HTMLElement>('[data-validacion="logo-patrocinador"]'),
        }];
    if (!validarFormularioDeportivo(e, notify, camposAdicionales)) return;
    setGuardando(true);
    const guardado = await onSave({
      nombre_p: form.nombre_p.trim(),
      logo_p: form.logo_p.trim() || null,
      telefono_p: form.telefono_p.trim() || null,
      correo_p: form.correo_p.trim() || null,
      pagina_web_p: form.pagina_web_p.trim() || null,
      aporte_p: form.aporte_p.trim() || null,
      estado_p: form.estado_p,
    });
    setGuardando(false);
    if (guardado) onClose();
  };

  return (
    <Dialogo
      title={item ? "Editar patrocinador" : "Nuevo patrocinador"}
      subtitle="Los datos se guardan en el catálogo de patrocinadores."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <Campo label="Nombre">
            <input required maxLength={100} value={form.nombre_p} onChange={(e) => set("nombre_p", e.target.value)} />
          </Campo>
          <Campo label="Estado">
            <select required value={form.estado_p} onChange={(e) => set("estado_p", e.target.value)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="inhabilitado">Inhabilitado</option>
            </select>
          </Campo>
          <Campo label="Logo (imagen) *">
            <div data-validacion="logo-patrocinador">
              <div
                className={`admin-dropzone ${arrastrandoLogo ? "is-dragover" : ""} ${subiendoLogo ? "is-uploading" : ""}`}
                onClick={() => !subiendoLogo && logoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    logoInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); if (!subiendoLogo) setArrastrandoLogo(true); }}
                onDragLeave={() => setArrastrandoLogo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrandoLogo(false);
                  void subirLogo(e.dataTransfer.files?.[0]);
                }}
                role="button"
                tabIndex={0}
                aria-label={form.logo_p ? "Cambiar logo del patrocinador" : "Seleccionar logo del patrocinador"}
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Seleccionar imagen del logo"
                  disabled={subiendoLogo}
                  hidden
                  onChange={(e) => void subirLogo(e.target.files?.[0])}
                />
                {form.logo_p && !errorLogo ? (
                  <div className="admin-dropzone-preview">
                    <img
                      src={form.logo_p}
                      alt="Vista previa del logo del patrocinador"
                      onError={() => setErrorLogo(true)}
                    />
                    {subiendoLogo && <div className="admin-dropzone-overlay"><Loader2 size={20} className="admin-spin" /></div>}
                    <div className="admin-dropzone-preview-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={subiendoLogo}
                        onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                      >
                        <Upload size={13} /> Cambiar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-dropzone-empty">
                    {subiendoLogo ? <Loader2 size={22} className="admin-spin" /> : <ImagePlus size={22} />}
                    <span>{subiendoLogo ? "Subiendo…" : "Haz clic o arrastra una imagen aquí"}</span>
                    {!subiendoLogo && <small>JPG, PNG o WEBP · máx. 8 MB</small>}
                  </div>
                )}
              </div>
              {errorLogo && form.logo_p && !subiendoLogo && (
                <small className="field-hint field-hint-warn">No se pudo cargar ese logo. Selecciona una imagen nueva.</small>
              )}
            </div>
          </Campo>
          <Campo label="Teléfono">
            <input required type="tel" maxLength={15} value={form.telefono_p} onChange={(e) => set("telefono_p", e.target.value)} />
          </Campo>
          <Campo label="Correo">
            <input required type="email" maxLength={80} value={form.correo_p} onChange={(e) => set("correo_p", e.target.value)} />
          </Campo>
          <Campo label="Página web">
            <input maxLength={120} value={form.pagina_web_p} onChange={(e) => set("pagina_web_p", e.target.value)} placeholder="https://…" />
          </Campo>
          <Campo label="Aporte o patrocinio">
            <input required maxLength={100} value={form.aporte_p} onChange={(e) => set("aporte_p", e.target.value)} />
          </Campo>
        </div>
        <AccionesFormulario
          guardando={guardando || subiendoLogo}
          onCancel={onClose}
          textoGuardar={item ? "Guardar cambios" : "Crear patrocinador"}
          textoProcesando={subiendoLogo ? "Subiendo logo…" : "Guardando…"}
        />
      </form>
    </Dialogo>
  );
}

function AsignarPatrocinadorModal({
  patrocinador,
  eventos,
  puedeEditar,
  puedeEliminar,
  onClose,
  onSave,
  onQuitar,
  confirmar,
  notify,
}: {
  patrocinador: Patrocinador;
  eventos: EventoOpcion[];
  puedeEditar: boolean;
  puedeEliminar: boolean;
  onClose: () => void;
  onSave: (eventoId: number, detalle: string) => Promise<boolean>;
  onQuitar: (eventoId: number) => Promise<boolean>;
  confirmar: (opciones: OpcionesConfirmacion) => Promise<boolean>;
  notify: Avisar;
}) {
  const [eventoId, setEventoId] = useState("");
  const [detalle, setDetalle] = useState("");
  const [guardando, setGuardando] = useState(false);
  const asignaciones = patrocinador.eventos ?? [];

  useEffect(() => {
    if (eventoId) {
      const actual = asignaciones.find((e) => String(e.id_e) === eventoId);
      setDetalle(actual?.pivot?.detalle ?? "");
    }
  }, [eventoId, patrocinador]);

  const submit = async (e: FormEvent) => {
    if (!validarFormularioDeportivo(e, notify)) return;
    const id = Number(eventoId);
    if (!id || guardando) return;
    setGuardando(true);
    const guardado = await onSave(id, detalle.trim());
    setGuardando(false);
    if (guardado) onClose();
  };

  const quitar = async (evento: { id_e: number; nombre_e: string }) => {
    if (!(await confirmar({
      titulo: "Desvincular patrocinador",
      mensaje: `¿Quitar a ${patrocinador.nombre_p} del evento "${evento.nombre_e}"?`,
      confirmar: "Desvincular",
      tipo: "peligro",
    }))) return;
    setGuardando(true);
    const quitado = await onQuitar(evento.id_e);
    setGuardando(false);
    if (quitado) onClose();
  };

  return (
    <Dialogo
      title={`Eventos de ${patrocinador.nombre_p}`}
      subtitle="Asigna este patrocinador a uno o más eventos y guarda el detalle de cada aporte."
      onClose={onClose}
    >
      <div className="modal-form">
        <form onSubmit={submit} noValidate>
          <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            <Campo label="Evento">
              <select required value={eventoId} disabled={!puedeEditar} onChange={(e) => setEventoId(e.target.value)}>
                <option value="">Selecciona un evento</option>
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>{evento.nombre}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Detalle del aporte">
              <input required maxLength={255} value={detalle} disabled={!puedeEditar} onChange={(e) => setDetalle(e.target.value)} />
            </Campo>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cerrar</button>
            {puedeEditar && <button type="submit" className="primary-btn" disabled={!eventos.length || guardando}>
              {guardando ? "Guardando…" : "Guardar asignación"}
            </button>}
          </div>
        </form>

        <h3 style={{ margin: "18px 0 8px" }}>Asignaciones actuales</h3>
        {!asignaciones.length ? <p>No hay eventos asignados a este patrocinador.</p> : (
          <ul className="admin-catalog-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {asignaciones.map((evento) => (
              <li key={evento.id_e} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--admin-line)", borderRadius: 10 }}>
                <span><strong>{evento.nombre_e}</strong>{evento.pivot?.detalle ? ` · ${evento.pivot.detalle}` : ""}</span>
                {puedeEliminar && (
                  <button type="button" className="table-action danger" title={`Desvincular de ${evento.nombre_e}`} disabled={guardando} onClick={() => void quitar(evento)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialogo>
  );
}

function RutaForm({
  item,
  onClose,
  onSave,
  notify,
}: {
  item?: RutaEvento;
  onClose: () => void;
  onSave: (datos: Record<string, unknown>) => Promise<boolean>;
  notify: Avisar;
}) {
  const [form, setForm] = useState({
    nombre_re: item?.nombre_re ?? "",
    estado_re: item?.estado_re ?? "activo",
    distancia_re: item?.distancia_re ?? "",
    desnivel_re: item?.desnivel_re ?? "",
    descripcion_re: item?.descripcion_re ?? "",
    archivo_gpx_re: item?.archivo_gpx_re ?? "",
    precio_re: item?.precio_re == null ? "" : String(item.precio_re),
  });
  const [guardando, setGuardando] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    if (!validarFormularioDeportivo(e, notify)) return;
    if (guardando) return;
    setGuardando(true);
    const guardado = await onSave({
      nombre_re: form.nombre_re.trim(),
      estado_re: form.estado_re,
      distancia_re: form.distancia_re.trim() || null,
      desnivel_re: form.desnivel_re.trim() || null,
      descripcion_re: form.descripcion_re.trim() || null,
      archivo_gpx_re: form.archivo_gpx_re.trim() || null,
      precio_re: form.precio_re === "" ? null : Number(form.precio_re),
    });
    setGuardando(false);
    if (guardado) onClose();
  };

  return (
    <Dialogo
      title={item ? "Editar ruta" : "Nueva ruta"}
      subtitle="La ruta quedará asociada al evento seleccionado."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <Campo label="Nombre">
            <input required maxLength={100} value={form.nombre_re} onChange={(e) => set("nombre_re", e.target.value)} />
          </Campo>
          <Campo label="Estado">
            <select required value={form.estado_re} onChange={(e) => set("estado_re", e.target.value)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="deshabilitado">Deshabilitado</option>
            </select>
          </Campo>
          <Campo label="Distancia">
            <input required maxLength={45} value={form.distancia_re} onChange={(e) => set("distancia_re", e.target.value)} placeholder="Ej. 25 km" />
          </Campo>
          <Campo label="Desnivel">
            <input required maxLength={45} value={form.desnivel_re} onChange={(e) => set("desnivel_re", e.target.value)} placeholder="Ej. 850 m" />
          </Campo>
          <Campo label="Precio (COP)">
            <input required type="number" min="0" step="0.01" value={form.precio_re} onChange={(e) => set("precio_re", e.target.value)} />
          </Campo>
          <Campo label="Archivo GPX (URL o ruta)">
            <input maxLength={255} value={form.archivo_gpx_re} onChange={(e) => set("archivo_gpx_re", e.target.value)} placeholder="https://… o rutas/archivo.gpx" />
          </Campo>
          <Campo label="Descripción">
            <textarea required maxLength={255} rows={3} value={form.descripcion_re} onChange={(e) => set("descripcion_re", e.target.value)} />
          </Campo>
        </div>
        <AccionesFormulario guardando={guardando} onCancel={onClose} textoGuardar={item ? "Guardar cambios" : "Crear ruta"} />
      </form>
    </Dialogo>
  );
}

function EstacionForm({
  item,
  onClose,
  onSave,
  notify,
}: {
  item?: Estacion;
  onClose: () => void;
  onSave: (datos: Record<string, unknown>) => Promise<boolean>;
  notify: Avisar;
}) {
  const [form, setForm] = useState({
    nombre_est: item?.nombre_est ?? "",
    tipo_est: item?.tipo_est ?? "general",
    kilometro_est: item?.kilometro_est ?? "",
    latitud_est: item?.latitud_est == null ? "" : String(item.latitud_est),
    longitud_est: item?.longitud_est == null ? "" : String(item.longitud_est),
    descripcion_pest: item?.descripcion_pest ?? "",
    estado_est: item?.estado_est ?? "activa",
  });
  const [guardando, setGuardando] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    if (!validarFormularioDeportivo(e, notify)) return;
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    const guardado = await onSave({
      nombre_est: form.nombre_est.trim(),
      tipo_est: form.tipo_est,
      kilometro_est: form.kilometro_est.trim() || null,
      latitud_est: form.latitud_est === "" ? null : Number(form.latitud_est),
      longitud_est: form.longitud_est === "" ? null : Number(form.longitud_est),
      descripcion_pest: form.descripcion_pest.trim() || null,
      estado_est: form.estado_est,
    });
    setGuardando(false);
    if (guardado) onClose();
  };

  return (
    <Dialogo
      title={item ? "Editar estación" : "Nueva estación"}
      subtitle="La estación quedará asociada al evento seleccionado."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <Campo label="Nombre">
            <input required maxLength={100} value={form.nombre_est} onChange={(e) => set("nombre_est", e.target.value)} />
          </Campo>
          <Campo label="Tipo">
            <select required value={form.tipo_est} onChange={(e) => set("tipo_est", e.target.value)}>
              {TIPOS_ESTACION.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Campo>
          <Campo label="Kilómetro">
            <input required maxLength={20} value={form.kilometro_est} onChange={(e) => set("kilometro_est", e.target.value)} placeholder="Ej. 12.5 km" />
          </Campo>
          <Campo label="Latitud">
            <input required type="number" min="-90" max="90" step="any" value={form.latitud_est} onChange={(e) => set("latitud_est", e.target.value)} />
          </Campo>
          <Campo label="Longitud">
            <input required type="number" min="-180" max="180" step="any" value={form.longitud_est} onChange={(e) => set("longitud_est", e.target.value)} />
          </Campo>
          <Campo label="Estado">
            <select required value={form.estado_est} onChange={(e) => set("estado_est", e.target.value)}>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
              <option value="cerrada">Cerrada</option>
            </select>
          </Campo>
          <Campo label="Descripción">
            <textarea required maxLength={255} rows={3} value={form.descripcion_pest} onChange={(e) => set("descripcion_pest", e.target.value)} />
          </Campo>
        </div>
        <AccionesFormulario guardando={guardando} onCancel={onClose} textoGuardar={item ? "Guardar cambios" : "Crear estación"} />
      </form>
    </Dialogo>
  );
}

export default function AdminCatalogos({
  seccion,
  eventos,
  search,
  notify,
  confirmar,
  puedeEditar,
  puedeEliminar,
}: {
  seccion: CatalogoDeportivo;
  eventos: EventoOpcion[];
  search: string;
  notify: Avisar;
  confirmar: (opciones: OpcionesConfirmacion) => Promise<boolean>;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}) {
  const [patrocinadores, setPatrocinadores] = useState<Patrocinador[]>([]);
  const [rutas, setRutas] = useState<RutaEvento[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [patrocinadorEventos, setPatrocinadorEventos] = useState<Patrocinador | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!eventos.length) {
      setEventoId("");
      return;
    }
    setEventoId((actual) => eventos.some((evento) => String(evento.id) === actual) ? actual : String(eventos[0].id));
  }, [eventos]);

  useEffect(() => {
    let vigente = true;
    if (seccion !== "patrocinadores" && !eventoId) {
      setRutas([]);
      setEstaciones([]);
      setCargando(false);
      return () => { vigente = false; };
    }

    const ruta = seccion === "patrocinadores"
      ? "/patrocinadores"
      : `/eventos/${eventoId}/${seccion}`;
    setCargando(true);
    setErrorCarga("");
    const cargar = async () => {
      if (seccion === "patrocinadores") {
        setPatrocinadores(await listarTodo<Patrocinador>(ruta));
      } else if (seccion === "rutas") {
        setRutas(await listarTodo<RutaEvento>(ruta));
      } else {
        setEstaciones(await listarTodo<Estacion>(ruta));
      }
    };
    cargar()
      .then(() => {
        if (!vigente) return;
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        const mensaje = err instanceof Error ? err.message : "No se pudieron cargar los datos.";
        setErrorCarga(mensaje);
        notify(mensaje, "error");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [seccion, eventoId, recarga, notify]);

  const q = normalizar(search.trim());
  const visiblesPatrocinadores = useMemo(
    () => patrocinadores.filter((p) => !q || normalizar(`${p.nombre_p} ${p.correo_p ?? ""} ${p.telefono_p ?? ""} ${p.aporte_p ?? ""} ${(p.eventos ?? []).map((e) => e.nombre_e).join(" ")}`).includes(q)),
    [patrocinadores, q],
  );
  const visiblesRutas = useMemo(
    () => rutas.filter((r) => !q || normalizar(`${r.nombre_re} ${r.distancia_re ?? ""} ${r.desnivel_re ?? ""} ${r.estado_re ?? ""}`).includes(q)),
    [rutas, q],
  );
  const visiblesEstaciones = useMemo(
    () => estaciones.filter((e) => !q || normalizar(`${e.nombre_est ?? ""} ${e.tipo_est} ${e.kilometro_est ?? ""} ${e.estado_est ?? ""} ${e.descripcion_pest ?? ""}`).includes(q)),
    [estaciones, q],
  );

  const completarAccion = async (
    url: string,
    method: "POST" | "PUT" | "DELETE",
    datos: Record<string, unknown> | undefined,
    mensaje: string,
    cerrar = true,
  ) => {
    try {
      await apiFetch(url, {
        method,
        ...(datos ? { body: JSON.stringify(datos) } : {}),
      });
      notify(mensaje);
      if (cerrar) setModal(null);
      setRecarga((n) => n + 1);
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo completar la acción.", "error");
      return false;
    }
  };

  const guardarPatrocinador = (datos: Record<string, unknown>) =>
    completarAccion(
      modal?.tipo === "patrocinador" && modal.item ? `/patrocinadores/${modal.item.id_p}` : "/patrocinadores",
      modal?.tipo === "patrocinador" && modal.item ? "PUT" : "POST",
      datos,
      modal?.tipo === "patrocinador" && modal.item ? "Patrocinador actualizado." : "Patrocinador creado.",
    );

  const guardarRuta = (datos: Record<string, unknown>) => {
    if (!eventoId) {
      notify("Selecciona un evento para guardar la ruta.", "error");
      return Promise.resolve(false);
    }
    const item = modal?.tipo === "ruta" ? modal.item : undefined;
    return completarAccion(
      item ? `/rutas/${item.id_re}` : `/eventos/${eventoId}/rutas`,
      item ? "PUT" : "POST",
      datos,
      item ? "Ruta actualizada." : "Ruta creada.",
    );
  };

  const guardarEstacion = (datos: Record<string, unknown>) => {
    if (!eventoId) {
      notify("Selecciona un evento para guardar la estación.", "error");
      return Promise.resolve(false);
    }
    const item = modal?.tipo === "estacion" ? modal.item : undefined;
    return completarAccion(
      item ? `/estaciones/${item.id_est}` : `/eventos/${eventoId}/estaciones`,
      item ? "PUT" : "POST",
      datos,
      item ? "Estación actualizada." : "Estación creada.",
    );
  };

  const eliminar = async (registro: RegistroEliminable) => {
    const { tipo, item } = registro;
    const nombre = tipo === "patrocinador"
      ? item.nombre_p
      : tipo === "ruta" ? item.nombre_re : item.nombre_est ?? "esta estación";
    const asignacionesPatrocinador = tipo === "patrocinador" && item.eventos?.length
      ? " También se quitarán sus asignaciones a eventos."
      : "";
    if (!(await confirmar({
      titulo: `Eliminar ${tipo}`,
      mensaje: `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.${asignacionesPatrocinador}`,
      confirmar: "Eliminar",
      tipo: "peligro",
    }))) return;
    const id = tipo === "patrocinador"
      ? item.id_p
      : tipo === "ruta" ? item.id_re : item.id_est;
    const base = tipo === "patrocinador" ? "patrocinadores" : tipo === "ruta" ? "rutas" : "estaciones";
    await completarAccion(`/${base}/${id}`, "DELETE", undefined, `${humanizar(tipo)} eliminado.`);
  };

  const gestionarAsignaciones = async (eventoIdAsignado: number, detalle: string) => {
    if (!patrocinadorEventos) return false;
    return completarAccion(
      `/patrocinadores/${patrocinadorEventos.id_p}/eventos`,
      "POST",
      { evento_id_e: eventoIdAsignado, detalle: detalle || null },
      "Asignación del patrocinador guardada.",
      false,
    );
  };

  const quitarAsignacion = async (eventoIdAsignado: number) => {
    if (!patrocinadorEventos) return false;
    return completarAccion(
      `/patrocinadores/${patrocinadorEventos.id_p}/eventos/${eventoIdAsignado}`,
      "DELETE",
      undefined,
      "Patrocinador desvinculado del evento.",
      false,
    );
  };

  const nombreSeccion = seccion === "patrocinadores" ? "Patrocinadores" : seccion === "rutas" ? "Rutas de eventos" : "Estaciones de eventos";
  const opcionesEventos = eventos.map((evento) => ({ id: evento.id, nombre: evento.nombre }));
  const sinEventos = seccion !== "patrocinadores" && !eventos.length;
  const toolbar = seccion !== "patrocinadores" ? (
    <select className="admin-select" value={eventoId} onChange={(e) => setEventoId(e.target.value)} aria-label="Filtrar por evento">
      {opcionesEventos.map((evento) => <option key={evento.id} value={evento.id}>{evento.nombre}</option>)}
    </select>
  ) : null;

  return (
    <>
      {errorCarga && <div className="admin-card" role="alert"><p>{errorCarga}</p></div>}
      {sinEventos ? (
        <section className="admin-card"><p>Crea primero un evento deportivo para administrar sus {seccion === "rutas" ? "rutas" : "estaciones"}.</p></section>
      ) : seccion === "patrocinadores" ? (
        <TableSection
          title={nombreSeccion}
          exportar={<ExportMenu ruta="deportivo/patrocinadores" archivo="skyed-deportivo-patrocinadores" params={{ q: search }} onMensaje={notify} />}
          action={puedeEditar ? "Nuevo patrocinador" : undefined}
          onAction={() => setModal({ tipo: "patrocinador" })}
          toolbar={toolbar}
        >
          <thead><tr><th>Logo</th><th>Patrocinador</th><th>Contacto</th><th>Aporte</th><th>Eventos</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={7}>Cargando patrocinadores…</td></tr> : visiblesPatrocinadores.map((p) => (
              <tr key={p.id_p}>
                <td>{p.logo_p ? <img className="admin-thumb" src={p.logo_p} alt={`Logo de ${p.nombre_p}`} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /> : "—"}</td>
                <td><strong>{p.nombre_p}</strong>{p.pagina_web_p && <small style={{ display: "block" }}>{p.pagina_web_p}</small>}</td>
                <td>{p.correo_p ?? "—"}<small style={{ display: "block" }}>{p.telefono_p ?? ""}</small></td>
                <td>{p.aporte_p ?? "—"}</td>
                <td>{p.eventos?.length ? p.eventos.map((e) => e.nombre_e).join(", ") : "Sin asignar"}</td>
                <td><span className={`admin-badge ${p.estado_p ?? "activo"}`}>{humanizar(p.estado_p ?? "activo")}</span></td>
                <td><div className="row-actions">
                  {(puedeEditar || puedeEliminar) && <button type="button" className="table-action" title="Asignar a eventos" onClick={() => setPatrocinadorEventos(p)}><Users size={15} /></button>}
                  {puedeEditar && <button type="button" className="table-action" title="Editar" onClick={() => setModal({ tipo: "patrocinador", item: p })}><Pencil size={15} /></button>}
                  {puedeEliminar && <button type="button" className="table-action danger" title="Eliminar" onClick={() => void eliminar({ tipo: "patrocinador", item: p })}><Trash2 size={15} /></button>}
                </div></td>
              </tr>
            ))}
            {!cargando && !visiblesPatrocinadores.length && <tr><td colSpan={7}>{patrocinadores.length ? "No hay patrocinadores que coincidan con la búsqueda." : "No hay patrocinadores registrados."}</td></tr>}
          </tbody>
        </TableSection>
      ) : seccion === "rutas" ? (
        <TableSection
          title={nombreSeccion}
          exportar={<ExportMenu ruta="deportivo/rutas" archivo="skyed-deportivo-rutas" params={{ q: search, evento: eventoId || undefined }} onMensaje={notify} />}
          action={puedeEditar ? "Nueva ruta" : undefined}
          onAction={() => setModal({ tipo: "ruta" })}
          toolbar={toolbar}
        >
          <thead><tr><th>Nombre</th><th>Distancia</th><th>Desnivel</th><th>Precio</th><th>GPX</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={7}>Cargando rutas…</td></tr> : visiblesRutas.map((r) => (
              <tr key={r.id_re}>
                <td><strong>{r.nombre_re}</strong>{r.descripcion_re && <small style={{ display: "block" }}>{r.descripcion_re}</small>}</td>
                <td>{r.distancia_re ?? "—"}</td>
                <td>{r.desnivel_re ?? "—"}</td>
                <td>{r.precio_re == null ? "—" : `$${Number(r.precio_re).toLocaleString("es-CO")}`}</td>
                <td>{r.archivo_gpx_re ? (
                  /^https?:\/\//i.test(r.archivo_gpx_re)
                    ? <a href={r.archivo_gpx_re} target="_blank" rel="noreferrer">Abrir GPX</a>
                    : r.archivo_gpx_re
                ) : "—"}</td>
                <td><span className={`admin-badge ${r.estado_re ?? "activo"}`}>{humanizar(r.estado_re ?? "activo")}</span></td>
                <td><div className="row-actions">
                  {puedeEditar && <button type="button" className="table-action" title="Editar" onClick={() => setModal({ tipo: "ruta", item: r })}><Pencil size={15} /></button>}
                  {puedeEliminar && <button type="button" className="table-action danger" title="Eliminar" onClick={() => void eliminar({ tipo: "ruta", item: r })}><Trash2 size={15} /></button>}
                </div></td>
              </tr>
            ))}
            {!cargando && !visiblesRutas.length && <tr><td colSpan={7}>{rutas.length ? "No hay rutas que coincidan con la búsqueda." : "Este evento todavía no tiene rutas."}</td></tr>}
          </tbody>
        </TableSection>
      ) : (
        <TableSection
          title={nombreSeccion}
          exportar={<ExportMenu ruta="deportivo/estaciones" archivo="skyed-deportivo-estaciones" params={{ q: search, evento: eventoId || undefined }} onMensaje={notify} />}
          action={puedeEditar ? "Nueva estación" : undefined}
          onAction={() => setModal({ tipo: "estacion" })}
          toolbar={toolbar}
        >
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Kilómetro</th><th>Coordenadas</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={7}>Cargando estaciones…</td></tr> : visiblesEstaciones.map((e) => (
              <tr key={e.id_est}>
                <td><strong>{e.nombre_est ?? "—"}</strong></td>
                <td>{humanizar(e.tipo_est)}</td>
                <td>{e.kilometro_est ?? "—"}</td>
                <td>{e.latitud_est != null && e.longitud_est != null ? `${e.latitud_est}, ${e.longitud_est}` : "—"}</td>
                <td>{e.descripcion_pest ?? "—"}</td>
                <td><span className={`admin-badge ${e.estado_est ?? "activa"}`}>{humanizar(e.estado_est ?? "activa")}</span></td>
                <td><div className="row-actions">
                  {puedeEditar && <button type="button" className="table-action" title="Editar" onClick={() => setModal({ tipo: "estacion", item: e })}><Pencil size={15} /></button>}
                  {puedeEliminar && <button type="button" className="table-action danger" title="Eliminar" onClick={() => void eliminar({ tipo: "estacion", item: e })}><Trash2 size={15} /></button>}
                </div></td>
              </tr>
            ))}
            {!cargando && !visiblesEstaciones.length && <tr><td colSpan={7}>{estaciones.length ? "No hay estaciones que coincidan con la búsqueda." : "Este evento todavía no tiene estaciones."}</td></tr>}
          </tbody>
        </TableSection>
      )}

      {modal?.tipo === "patrocinador" && (
        <PatrocinadorForm item={modal.item} onClose={() => setModal(null)} onSave={guardarPatrocinador} notify={notify} />
      )}
      {modal?.tipo === "ruta" && (
        <RutaForm item={modal.item} onClose={() => setModal(null)} onSave={guardarRuta} notify={notify} />
      )}
      {modal?.tipo === "estacion" && (
        <EstacionForm item={modal.item} onClose={() => setModal(null)} onSave={guardarEstacion} notify={notify} />
      )}
      {patrocinadorEventos && (
        <AsignarPatrocinadorModal
          patrocinador={patrocinadorEventos}
          eventos={opcionesEventos}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onClose={() => setPatrocinadorEventos(null)}
          onSave={gestionarAsignaciones}
          onQuitar={quitarAsignacion}
          confirmar={confirmar}
          notify={notify}
        />
      )}
    </>
  );
}

function humanizar(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
