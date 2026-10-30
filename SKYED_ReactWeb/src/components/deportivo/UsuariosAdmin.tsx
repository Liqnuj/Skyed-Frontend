import { useMemo, useRef, useState } from "react";
import {
  Bike,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { userService } from "../../services/userRoleService";
import {
  errorContrasena,
  errorCorreo,
  errorFechaNacimiento,
  errorNombrePersona,
  normalizarCorreo,
  soloDigitos,
  soloLetras,
} from "../../utils/validaciones";
import type { useConfirmacion } from "../shared/ConfirmDialog";
import "../../styles/deportivo/AdminUsuarios.css";

type Confirmar = ReturnType<typeof useConfirmacion>["confirmar"];

/* ================================================================
   TIPOS Y DATOS BASE
================================================================ */

export type UsuarioFila = {
  id_u: number;
  nombre_u: string;
  apellido_u?: string;
  correo_u: string;
  estado_u?: string;
  roles?: Array<{
    id_rol?: number;
    nombre_rol: string;
    pivot?: { contexto: string };
  }>;
};

type Contexto = "deportivo" | "social" | "general";

const CONTEXTOS: Array<{ value: Contexto; label: string }> = [
  { value: "deportivo", label: "Deportivo" },
  { value: "social", label: "Social" },
  { value: "general", label: "General" },
];

/** Roles que maneja la API, con su texto y color para mostrarlos. */
const ROLES: Array<{
  nombre: string;
  etiqueta: string;
  descripcion: string;
  tono: "teal" | "blue" | "violet" | "amber";
  icono: typeof Bike;
  /** Contexto en el que normalmente vive el rol (así se crean las cuentas base). */
  contextoBase: Contexto;
}> = [
  { nombre: "participante", etiqueta: "Participante", descripcion: "Se inscribe y compite en los eventos deportivos.", tono: "teal", icono: Bike, contextoBase: "deportivo" },
  { nombre: "cliente", etiqueta: "Cliente", descripcion: "Reserva y gestiona eventos sociales.", tono: "blue", icono: User, contextoBase: "social" },
  { nombre: "adminDeportivo", etiqueta: "Admin deportivo", descripcion: "Administra eventos, pagos, kits y usuarios deportivos.", tono: "violet", icono: ShieldCheck, contextoBase: "deportivo" },
  { nombre: "adminSocial", etiqueta: "Admin social", descripcion: "Administra el módulo de eventos sociales.", tono: "amber", icono: Shield, contextoBase: "social" },
];

const rolInfo = (nombre: string) =>
  ROLES.find((r) => r.nombre === nombre) ?? {
    nombre,
    etiqueta: nombre,
    descripcion: "",
    tono: "blue" as const,
    icono: User,
    contextoBase: "general" as Contexto,
  };

/**
 * Jerarquía del panel deportivo:
 *  - El admin deportivo no ve a los admin sociales ni puede asignar ese rol.
 *  - Un admin no puede cambiarle los roles a otro admin (solo verlos).
 */
export const ROLES_ASIGNABLES = ROLES.filter((r) => r.nombre !== "adminSocial");
export const esAdminSocial = (u: UsuarioFila) => !!u.roles?.some((r) => r.nombre_rol === "adminSocial");
export const esAdmin = (u: UsuarioFila) => !!u.roles?.some((r) => r.nombre_rol.startsWith("admin"));

const TIPOS_DOCUMENTO = [
  { value: "cedula_ciudadania", label: "Cédula de ciudadanía" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
  { value: "pasaporte", label: "Pasaporte" },
];

const quitarTildes = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const nombreCompleto = (u: UsuarioFila) => `${u.nombre_u} ${u.apellido_u ?? ""}`.trim();

const iniciales = (u: UsuarioFila) =>
  `${u.nombre_u?.[0] ?? ""}${u.apellido_u?.[0] ?? ""}`.toUpperCase() || "?";

/* ================================================================
   PIEZAS COMPARTIDAS
================================================================ */

export function Avatar({ usuario, grande }: { usuario: UsuarioFila; grande?: boolean }) {
  return (
    <span className={`usr-avatar usr-av-${usuario.id_u % 5} ${grande ? "grande" : ""}`} aria-hidden="true">
      {iniciales(usuario)}
    </span>
  );
}

/** Etiqueta de color con el nombre del rol (y su contexto, si se indica). */
export function RolChip({ nombre, contexto, onQuitar, bloqueado, motivoBloqueo, ocupado }: {
  nombre: string;
  contexto?: string;
  onQuitar?: () => void;
  bloqueado?: boolean;
  motivoBloqueo?: string;
  ocupado?: boolean;
}) {
  const info = rolInfo(nombre);
  const Icono = info.icono;
  return (
    <span className={`usr-chip tono-${info.tono}`} title={contexto ? `${info.etiqueta} · ${contexto}` : info.etiqueta}>
      <Icono size={13} />
      <b>{info.etiqueta}</b>
      {contexto && <em>{contexto}</em>}
      {onQuitar && (
        bloqueado ? (
          <span className="usr-chip-lock" title={motivoBloqueo}><Lock size={12} /></span>
        ) : (
          <button
            type="button"
            className="usr-chip-x"
            title={`Quitar el rol ${info.etiqueta}`}
            aria-label={`Quitar el rol ${info.etiqueta}`}
            disabled={ocupado}
            onClick={onQuitar}
          >
            <X size={12} />
          </button>
        )
      )}
    </span>
  );
}

/** Roles de un usuario en la tabla: hasta 3 etiquetas y un "+N". */
export function RolesDeUsuario({ usuario }: { usuario: UsuarioFila }) {
  const roles = usuario.roles ?? [];
  if (!roles.length) return <span className="usr-sin-roles">Sin roles</span>;
  const vistos = roles.slice(0, 3);
  return (
    <div className="usr-chips">
      {vistos.map((r, i) => (
        <RolChip key={`${r.nombre_rol}-${r.pivot?.contexto ?? i}`} nombre={r.nombre_rol} contexto={r.pivot?.contexto} />
      ))}
      {roles.length > vistos.length && <span className="usr-mas">+{roles.length - vistos.length}</span>}
    </div>
  );
}

function ModalBase({ titulo, subtitulo, ancho, onClose, cerrarFuera = true, children }: {
  titulo: string;
  subtitulo?: string;
  ancho?: boolean;
  onClose: () => void;
  cerrarFuera?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(e) => {
        if (cerrarFuera && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`admin-modal ${ancho ? "usr-modal-ancho" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="admin-modal-head">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button title="Cerrar" className="icon-btn" onClick={onClose} aria-label="Cerrar" type="button">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   GESTIONAR ROLES
================================================================ */

export function RolesModal({ users, inicialId, yoId, onClose, onCambio, notify, confirmar }: {
  users: UsuarioFila[];
  /** Usuario que se abre ya seleccionado (desde el botón de su fila). */
  inicialId: number | null;
  /** Id del administrador que está usando el panel (no puede quitarse su propio rol). */
  yoId?: number;
  onClose: () => void;
  /** Se llama tras asignar o quitar un rol para que el panel recargue la lista. */
  onCambio: () => Promise<void>;
  notify: (mensaje: string) => void;
  confirmar: Confirmar;
}) {
  const [selId, setSelId] = useState<number | null>(inicialId);
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState("participante");
  const [contexto, setContexto] = useState<Contexto>("deportivo");
  const [ocupado, setOcupado] = useState(false);

  // Un admin deportivo nunca ve a los admin sociales.
  const visibles = useMemo(() => users.filter((u) => !esAdminSocial(u)), [users]);
  const sel = visibles.find((u) => u.id_u === selId) ?? null;
  // Otro administrador: se pueden ver sus roles, no cambiarlos.
  const soloLectura = !!sel && esAdmin(sel) && sel.id_u !== yoId;

  const lista = useMemo(() => {
    const q = quitarTildes(busqueda.trim());
    return visibles.filter((u) => !q || quitarTildes(`${nombreCompleto(u)} ${u.correo_u}`).includes(q));
  }, [visibles, busqueda]);

  const yaLoTiene = !!sel?.roles?.some(
    (r) => r.nombre_rol === rol && (r.pivot?.contexto ?? "general") === contexto,
  );

  const asignar = async () => {
    if (!sel || soloLectura || yaLoTiene || ocupado) return;
    setOcupado(true);
    try {
      await userService.asignarRol(sel.id_u, rol, contexto);
      notify(`Rol ${rolInfo(rol).etiqueta} asignado a ${nombreCompleto(sel)}`);
      await onCambio();
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo asignar el rol.");
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async (idRol: number | undefined, nombreRol: string, ctx: string) => {
    if (!sel || soloLectura || idRol == null || ocupado) return;
    const ok = await confirmar({
      titulo: "Quitar rol",
      mensaje: `¿Quitar el rol ${rolInfo(nombreRol).etiqueta} (${ctx}) a ${nombreCompleto(sel)}?`,
      confirmar: "Quitar rol",
      tipo: "peligro",
    });
    if (!ok) return;
    setOcupado(true);
    try {
      await userService.quitarRol(sel.id_u, idRol, ctx);
      notify(`Rol ${rolInfo(nombreRol).etiqueta} quitado`);
      await onCambio();
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo quitar el rol.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ModalBase
      titulo="Gestionar roles"
      subtitulo="Elige un usuario para ver sus roles, asignarle uno nuevo o quitarle uno."
      ancho
      onClose={onClose}
    >
      <div className="usr-roles">
        {/* ---------- Lista de usuarios ---------- */}
        <aside className="usr-lista">
          <label className="usr-buscar">
            <Search size={15} />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo"
              aria-label="Buscar usuario"
            />
          </label>
          <ul>
            {lista.map((u) => (
              <li key={u.id_u}>
                <button
                  type="button"
                  className={`usr-item ${u.id_u === selId ? "activo" : ""}`}
                  title={`Gestionar los roles de ${nombreCompleto(u)}`}
                  onClick={() => setSelId(u.id_u)}
                >
                  <Avatar usuario={u} />
                  <span className="usr-item-texto">
                    <strong>{nombreCompleto(u)}</strong>
                    <small>{u.correo_u}</small>
                  </span>
                  <span className="usr-item-n" title="Cantidad de roles">{u.roles?.length ?? 0}</span>
                </button>
              </li>
            ))}
            {!lista.length && (
              <li className="usr-vacio-lista">
                {visibles.length ? "Ningún usuario coincide con la búsqueda." : "No hay usuarios cargados."}
              </li>
            )}
          </ul>
        </aside>

        {/* ---------- Detalle del usuario ---------- */}
        <section className="usr-detalle">
          {!sel ? (
            <div className="usr-vacio">
              <Users size={34} />
              <strong>Selecciona un usuario</strong>
              <span>Verás aquí sus roles actuales y podrás cambiarlos.</span>
            </div>
          ) : (
            <>
              <div className="usr-perfil">
                <Avatar usuario={sel} grande />
                <div>
                  <h3>{nombreCompleto(sel)}</h3>
                  <p>{sel.correo_u}</p>
                </div>
                <span className={`admin-badge ${sel.estado_u ?? "activo"}`}>{sel.estado_u ?? "activo"}</span>
              </div>

              <h4 className="usr-subtitulo">Roles actuales</h4>
              {sel.roles?.length ? (
                <div className="usr-chips grandes">
                  {sel.roles.map((r, i) => {
                    const ctx = r.pivot?.contexto ?? "general";
                    const propio = sel.id_u === yoId && r.nombre_rol === "adminDeportivo";
                    return (
                      <RolChip
                        key={`${r.nombre_rol}-${ctx}-${i}`}
                        nombre={r.nombre_rol}
                        contexto={ctx}
                        ocupado={ocupado}
                        bloqueado={propio || r.id_rol == null}
                        motivoBloqueo={propio ? "No puedes quitarte tu propio rol de administrador." : "Este rol no se puede quitar desde aquí."}
                        onQuitar={soloLectura ? undefined : () => quitar(r.id_rol, r.nombre_rol, ctx)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="usr-aviso">Este usuario aún no tiene roles asignados.</p>
              )}

              {soloLectura ? (
                <p className="usr-aviso bloqueado">
                  <Lock size={14} /> Esta persona es administradora: puedes ver sus roles, pero solo ella misma o el sistema pueden cambiarlos.
                </p>
              ) : (
                <>
                <h4 className="usr-subtitulo">Asignar un rol</h4>
                <div className="usr-roles-grid" role="radiogroup" aria-label="Rol a asignar">
                  {ROLES_ASIGNABLES.map((r) => {
                    const Icono = r.icono;
                    const activo = rol === r.nombre;
                    return (
                      <button
                        key={r.nombre}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        title={`Elegir el rol ${r.etiqueta}`}
                        className={`usr-rol-card tono-${r.tono} ${activo ? "activo" : ""}`}
                        onClick={() => { setRol(r.nombre); setContexto(r.contextoBase); }}
                      >
                        <span className="usr-rol-icono"><Icono size={18} /></span>
                        <span className="usr-rol-texto">
                          <strong>{r.etiqueta}</strong>
                          <small>{r.descripcion}</small>
                        </span>
                        {activo && <Check size={16} className="usr-rol-check" />}
                      </button>
                    );
                  })}
                </div>

                <div className="usr-asignar-fila">
                  <div className="usr-contexto" role="radiogroup" aria-label="Contexto del rol">
                    <span>Contexto</span>
                    <div className="usr-segmentos">
                      {CONTEXTOS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={contexto === c.value}
                          title={`Aplicar el rol en el contexto ${c.label.toLowerCase()}`}
                          className={contexto === c.value ? "activo" : ""}
                          onClick={() => setContexto(c.value)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    title={yaLoTiene ? "El usuario ya tiene este rol en este contexto" : "Asignar el rol seleccionado al usuario"}
                    disabled={ocupado || yaLoTiene}
                    onClick={asignar}
                  >
                    {ocupado ? <Loader2 size={16} className="usr-girar" /> : <ShieldCheck size={16} />}
                    {yaLoTiene ? "Ya lo tiene" : "Asignar rol"}
                  </button>
                </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </ModalBase>
  );
}


/* ================================================================
   NUEVO USUARIO
   Lo usan el panel deportivo y el panel social. Mismas reglas que el
   registro público (y que el backend), con el error bajo cada campo.
================================================================ */

const MAYUS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUS = "abcdefghijkmnopqrstuvwxyz";
const NUMS = "23456789";

/** Contraseña aleatoria de 12 caracteres que cumple las reglas (mayúscula, minúscula y número). */
function generarClave(): string {
  const azar = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const tomar = (s: string) => s[azar(s.length)];
  const todo = MAYUS + MINUS + NUMS;
  const chars = [tomar(MAYUS), tomar(MINUS), tomar(NUMS)];
  while (chars.length < 12) chars.push(tomar(todo));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = azar(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function fuerzaClave(clave: string) {
  const puntos =
    (clave.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(clave) ? 1 : 0) +
    (/[a-z]/.test(clave) ? 1 : 0) +
    (/[0-9]/.test(clave) ? 1 : 0);
  const texto = !clave ? "" : puntos <= 2 ? "Débil" : puntos === 3 ? "Media" : "Segura";
  return { puntos, texto };
}

type CampoUsuario = "tipo" | "documento" | "nombre" | "apellido" | "correo" | "telefono" | "fecha" | "clave";
const ORDEN_CAMPOS: CampoUsuario[] = ["tipo", "documento", "nombre", "apellido", "correo", "telefono", "fecha", "clave"];

/** Mensaje de error bajo un campo (solo se pinta cuando hay error). */
function ErrorCampo({ id, texto }: { id: string; texto?: string | null }) {
  if (!texto) return null;
  return <small id={id} className="usr-error" role="alert">{texto}</small>;
}

export function UsuarioModal({ modulo = "deportivo", existentes = [], onClose, onCreado, notify }: {
  /** Panel desde el que se crea: define el rol por defecto y los roles extra que se pueden dar. */
  modulo?: "deportivo" | "social";
  /** Usuarios ya cargados en el panel: sirven para avisar de un correo repetido antes de enviar. */
  existentes?: Array<{ correo_u: string }>;
  onClose: () => void;
  /** Se llama cuando la cuenta ya se creó (el panel cierra el modal y recarga). */
  onCreado: () => Promise<void> | void;
  notify: (mensaje: string) => void;
}) {
  const esSocial = modulo === "social";
  const contextoBase: Contexto = esSocial ? "social" : "deportivo";
  // El admin social solo puede dar el rol de su módulo; el deportivo, los de ROLES_ASIGNABLES.
  const rolesExtra = esSocial ? ROLES.filter((r) => r.nombre === "adminSocial") : ROLES_ASIGNABLES;
  const rolPorDefecto = esSocial ? "Cliente" : "Participante";

  const [form, setForm] = useState({
    tipo: "",
    documento: "",
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    fecha: "",
    clave: "",
  });
  const [tocados, setTocados] = useState<Partial<Record<CampoUsuario, boolean>>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [rol, setRol] = useState(""); // "" = el rol por defecto que asigna el registro
  const [contexto, setContexto] = useState<Contexto>(contextoBase);
  const [verClave, setVerClave] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (campo: CampoUsuario, valor: string) => {
    setErrorApi(null);
    setForm((f) => ({ ...f, [campo]: valor }));
  };
  const tocar = (campo: CampoUsuario) => setTocados((t) => (t[campo] ? t : { ...t, [campo]: true }));

  // Fecha más reciente permitida (10 años cumplidos) y más antigua razonable (120 años).
  const { fechaMaxima, fechaMinima } = useMemo(() => {
    const d = new Date();
    const max = new Date(d.getFullYear() - 10, d.getMonth(), d.getDate());
    const min = new Date(d.getFullYear() - 120, d.getMonth(), d.getDate());
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { fechaMaxima: iso(max), fechaMinima: iso(min) };
  }, []);

  const correosUsados = useMemo(
    () => new Set(existentes.map((u) => normalizarCorreo(u.correo_u ?? ""))),
    [existentes],
  );

  // Todas las reglas en un solo lugar: el mismo resultado sirve para pintar y para bloquear el envío.
  const errores: Record<CampoUsuario, string | null> = useMemo(() => {
    const doc = form.documento;
    const correo = form.correo.trim();
    return {
      tipo: form.tipo ? null : "Selecciona el tipo de documento.",
      documento: !doc
        ? "Escribe el número de documento."
        : doc.length < 5 || doc.length > 12
          ? "El número de documento debe tener entre 5 y 12 dígitos."
          : /^0+$/.test(doc)
            ? "El número de documento no es válido."
            : null,
      nombre: errorNombrePersona(form.nombre, "nombre"),
      apellido: errorNombrePersona(form.apellido, "apellido"),
      correo: errorCorreo(correo) ?? (correosUsados.has(normalizarCorreo(correo)) ? "Ya existe un usuario con este correo." : null),
      telefono: !form.telefono
        ? "Escribe el teléfono."
        : form.telefono.length < 7 || form.telefono.length > 15
          ? "El teléfono debe tener entre 7 y 15 dígitos."
          : null,
      fecha: errorFechaNacimiento(form.fecha, 10),
      clave: form.clave ? errorContrasena(form.clave) : "Escribe o genera una contraseña.",
    };
  }, [form, correosUsados]);

  const visible = (c: CampoUsuario) => (tocados[c] ? errores[c] : null);
  const claseCampo = (c: CampoUsuario) => (visible(c) ? "usr-invalido" : "");
  const ariaCampo = (c: CampoUsuario) => ({
    "aria-invalid": visible(c) ? true : undefined,
    "aria-describedby": visible(c) ? `usr-err-${c}` : undefined,
  });

  const fuerza = fuerzaClave(form.clave);

  const generar = () => {
    set("clave", generarClave());
    tocar("clave");
    setVerClave(true);
    setCopiada(false);
  };

  const copiar = async () => {
    if (!form.clave) return;
    try {
      await navigator.clipboard.writeText(form.clave);
      setCopiada(true);
      window.setTimeout(() => setCopiada(false), 1800);
    } catch {
      notify("No se pudo copiar. Selecciona la contraseña y cópiala a mano.");
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    const primerError = ORDEN_CAMPOS.find((c) => errores[c]);
    if (primerError) {
      // Se marcan todos los campos para que se vea qué falta, y se lleva el foco al primero.
      setTocados(Object.fromEntries(ORDEN_CAMPOS.map((c) => [c, true])));
      notify("Revisa los campos marcados en rojo.");
      const el = formRef.current?.querySelector<HTMLElement>(`[data-campo="${primerError}"]`);
      el?.focus();
      return;
    }

    setGuardando(true);
    setErrorApi(null);
    try {
      const res = await userService.crear({
        tipo_documento_u: form.tipo,
        documento_u: parseInt(form.documento, 10),
        nombre_u: form.nombre.trim().replace(/\s{2,}/g, " "),
        apellido_u: form.apellido.trim().replace(/\s{2,}/g, " "),
        telefono_u: form.telefono,
        correo_u: normalizarCorreo(form.correo),
        fecha_nacimiento_u: form.fecha,
        contrasena_u: form.clave,
        // El registro asigna el rol base según el contexto: cliente en social, participante en deportivo.
        contexto: esSocial ? "social" : rol && contexto === "social" ? "social" : "deportivo",
      });

      // Rol adicional elegido por el administrador (si no, queda el que da el registro).
      let aviso = "";
      const nuevoId = res.user?.id_u;
      if (rol && nuevoId) {
        try {
          await userService.asignarRol(nuevoId, rol, contexto);
        } catch {
          aviso = " Pero no se pudo asignar el rol extra: hazlo desde “Gestionar roles”.";
        }
      }
      notify(`Usuario ${form.nombre.trim()} creado.${aviso}`);
      await onCreado();
    } catch (err) {
      // El backend también valida (correo o documento repetidos, etc.): se deja el motivo dentro del formulario.
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el usuario.";
      setErrorApi(mensaje);
      notify(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eligioAdmin = rol === "adminDeportivo" || rol === "adminSocial";

  return (
    <ModalBase
      titulo="Nuevo usuario"
      subtitulo="Crea una cuenta con los mismos datos que pide el registro público."
      onClose={onClose}
      cerrarFuera={false}
    >
      <form ref={formRef} className="modal-form" onSubmit={enviar} autoComplete="off" noValidate>
        <div className="form-grid">
          <label className={`admin-field ${claseCampo("tipo")}`}>
            <span>Tipo de documento</span>
            <select
              required
              data-campo="tipo"
              value={form.tipo}
              onChange={(e) => { set("tipo", e.target.value); tocar("tipo"); }}
              onBlur={() => tocar("tipo")}
              {...ariaCampo("tipo")}
            >
              <option value="">Selecciona</option>
              {TIPOS_DOCUMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ErrorCampo id="usr-err-tipo" texto={visible("tipo")} />
          </label>
          <label className={`admin-field ${claseCampo("documento")}`}>
            <span>Número de documento</span>
            <input
              required
              data-campo="documento"
              inputMode="numeric"
              maxLength={12}
              value={form.documento}
              onChange={(e) => set("documento", soloDigitos(e.target.value, 12))}
              onBlur={() => tocar("documento")}
              placeholder="Ej. 1052345678"
              {...ariaCampo("documento")}
            />
            <ErrorCampo id="usr-err-documento" texto={visible("documento")} />
          </label>
          <label className={`admin-field ${claseCampo("nombre")}`}>
            <span>Nombres</span>
            <input
              required
              data-campo="nombre"
              maxLength={50}
              autoComplete="off"
              value={form.nombre}
              onChange={(e) => set("nombre", soloLetras(e.target.value, 50).replace(/^\s+/, "").replace(/\s{2,}/g, " "))}
              onBlur={() => tocar("nombre")}
              placeholder="Ej. Camila"
              {...ariaCampo("nombre")}
            />
            <ErrorCampo id="usr-err-nombre" texto={visible("nombre")} />
          </label>
          <label className={`admin-field ${claseCampo("apellido")}`}>
            <span>Apellidos</span>
            <input
              required
              data-campo="apellido"
              maxLength={50}
              autoComplete="off"
              value={form.apellido}
              onChange={(e) => set("apellido", soloLetras(e.target.value, 50).replace(/^\s+/, "").replace(/\s{2,}/g, " "))}
              onBlur={() => tocar("apellido")}
              placeholder="Ej. Rojas"
              {...ariaCampo("apellido")}
            />
            <ErrorCampo id="usr-err-apellido" texto={visible("apellido")} />
          </label>
          <label className={`admin-field ${claseCampo("correo")}`}>
            <span>Correo electrónico</span>
            <input
              required
              data-campo="correo"
              type="email"
              maxLength={80}
              value={form.correo}
              onChange={(e) => set("correo", e.target.value.replace(/\s/g, ""))}
              onBlur={() => tocar("correo")}
              placeholder="nombre@correo.com"
              {...ariaCampo("correo")}
            />
            <ErrorCampo id="usr-err-correo" texto={visible("correo")} />
          </label>
          <label className={`admin-field ${claseCampo("telefono")}`}>
            <span>Teléfono</span>
            <input
              required
              data-campo="telefono"
              inputMode="tel"
              maxLength={15}
              value={form.telefono}
              onChange={(e) => set("telefono", soloDigitos(e.target.value, 15))}
              onBlur={() => tocar("telefono")}
              placeholder="Ej. 3101234567"
              {...ariaCampo("telefono")}
            />
            <ErrorCampo id="usr-err-telefono" texto={visible("telefono")} />
          </label>
          <label className={`admin-field ${claseCampo("fecha")}`}>
            <span>Fecha de nacimiento</span>
            <input
              required
              data-campo="fecha"
              type="date"
              min={fechaMinima}
              max={fechaMaxima}
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
              onBlur={() => tocar("fecha")}
              {...ariaCampo("fecha")}
            />
            {visible("fecha")
              ? <ErrorCampo id="usr-err-fecha" texto={visible("fecha")} />
              : <small className="usr-ayuda">Debe tener al menos 10 años.</small>}
          </label>

          <div className={`admin-field usr-clave ${claseCampo("clave")}`}>
            <span>Contraseña</span>
            <div className="usr-clave-fila">
              <input
                required
                data-campo="clave"
                type={verClave ? "text" : "password"}
                autoComplete="new-password"
                maxLength={50}
                value={form.clave}
                onChange={(e) => { set("clave", e.target.value); setCopiada(false); }}
                onBlur={() => tocar("clave")}
                placeholder="Mín. 8 con mayúscula, minúscula y número"
                {...ariaCampo("clave")}
              />
              <button type="button" className="usr-mini" title={verClave ? "Ocultar la contraseña" : "Mostrar la contraseña"} aria-label={verClave ? "Ocultar la contraseña" : "Mostrar la contraseña"} onClick={() => setVerClave((v) => !v)}>
                {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button type="button" className="usr-mini" title="Generar una contraseña segura" aria-label="Generar una contraseña segura" onClick={generar}>
                <Sparkles size={16} />
              </button>
              <button type="button" className="usr-mini" title="Copiar la contraseña" aria-label="Copiar la contraseña" disabled={!form.clave} onClick={copiar}>
                {copiada ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className="usr-fuerza" data-nivel={fuerza.puntos} aria-hidden="true">
              <i /><i /><i /><i />
              <small>{fuerza.texto}</small>
            </div>
            <ErrorCampo id="usr-err-clave" texto={visible("clave")} />
          </div>
        </div>

        <div className="usr-rol-inicial">
          <div className="usr-rol-inicial-head">
            <KeyRound size={16} />
            <div>
              <strong>Rol adicional (opcional)</strong>
              <small>Si no eliges ninguno, la cuenta queda como {rolPorDefecto}, el rol que asigna el registro.</small>
            </div>
          </div>
          <div className="usr-rol-inicial-campos">
            <label className="admin-field">
              <span>Rol</span>
              <select
                value={rol}
                onChange={(e) => {
                  setRol(e.target.value);
                  const base = rolesExtra.find((r) => r.nombre === e.target.value)?.contextoBase;
                  setContexto(base ?? contextoBase);
                }}
              >
                <option value="">Solo el rol por defecto ({rolPorDefecto})</option>
                {rolesExtra.map((r) => <option key={r.nombre} value={r.nombre}>{r.etiqueta}</option>)}
              </select>
            </label>
            <div className={`usr-contexto ${rol ? "" : "apagado"}`} role="radiogroup" aria-label="Contexto del rol">
              <span>Contexto</span>
              <div className="usr-segmentos">
                {CONTEXTOS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={contexto === c.value}
                    title={`Contexto ${c.label.toLowerCase()}`}
                    className={contexto === c.value ? "activo" : ""}
                    onClick={() => setContexto(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {eligioAdmin && (
            <p className="usr-aviso alerta">Este usuario tendrá acceso de administración. Asígnalo solo a personas de confianza.</p>
          )}
        </div>

        {errorApi && <p className="usr-aviso alerta usr-error-api" role="alert">{errorApi}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-btn" title="Cerrar sin crear el usuario" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-btn" title="Crear la cuenta del usuario" disabled={guardando}>
            {guardando ? <Loader2 size={16} className="usr-girar" /> : <UserPlus size={16} />}
            {guardando ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
