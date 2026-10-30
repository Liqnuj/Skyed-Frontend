import { useMemo, useState } from "react";
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
import { errorContrasena, normalizarCorreo, soloDigitos, soloLetras } from "../../utils/validaciones";
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
}> = [
  { nombre: "participante", etiqueta: "Participante", descripcion: "Se inscribe y compite en los eventos deportivos.", tono: "teal", icono: Bike },
  { nombre: "cliente", etiqueta: "Cliente", descripcion: "Reserva y gestiona eventos sociales.", tono: "blue", icono: User },
  { nombre: "adminDeportivo", etiqueta: "Admin deportivo", descripcion: "Administra eventos, pagos, kits y usuarios deportivos.", tono: "violet", icono: ShieldCheck },
  { nombre: "adminSocial", etiqueta: "Admin social", descripcion: "Administra el módulo de eventos sociales.", tono: "amber", icono: Shield },
];

const rolInfo = (nombre: string) =>
  ROLES.find((r) => r.nombre === nombre) ?? {
    nombre,
    etiqueta: nombre,
    descripcion: "",
    tono: "blue" as const,
    icono: User,
  };

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

  const sel = users.find((u) => u.id_u === selId) ?? null;

  const lista = useMemo(() => {
    const q = quitarTildes(busqueda.trim());
    return users.filter((u) => !q || quitarTildes(`${nombreCompleto(u)} ${u.correo_u}`).includes(q));
  }, [users, busqueda]);

  const yaLoTiene = !!sel?.roles?.some(
    (r) => r.nombre_rol === rol && (r.pivot?.contexto ?? "general") === contexto,
  );

  const asignar = async () => {
    if (!sel || yaLoTiene || ocupado) return;
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
    if (!sel || idRol == null || ocupado) return;
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
                {users.length ? "Ningún usuario coincide con la búsqueda." : "No hay usuarios cargados."}
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
                        onQuitar={() => quitar(r.id_rol, r.nombre_rol, ctx)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="usr-aviso">Este usuario aún no tiene roles asignados.</p>
              )}

              <h4 className="usr-subtitulo">Asignar un rol</h4>
              <div className="usr-roles-grid" role="radiogroup" aria-label="Rol a asignar">
                {ROLES.map((r) => {
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
                      onClick={() => setRol(r.nombre)}
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
        </section>
      </div>
    </ModalBase>
  );
}

/* ================================================================
   NUEVO USUARIO
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

export function UsuarioModal({ onClose, onCreado, notify }: {
  onClose: () => void;
  /** Se llama cuando la cuenta ya se creó (el panel cierra el modal y recarga). */
  onCreado: () => Promise<void> | void;
  notify: (mensaje: string) => void;
}) {
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
  const [rol, setRol] = useState(""); // "" = el rol por defecto que asigna el registro
  const [contexto, setContexto] = useState<Contexto>("deportivo");
  const [verClave, setVerClave] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const set = (campo: keyof typeof form, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  // El registro público exige 10 años cumplidos como mínimo.
  const fechaMaxima = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return d.toISOString().slice(0, 10);
  }, []);

  const fuerza = fuerzaClave(form.clave);

  const generar = () => {
    set("clave", generarClave());
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

    if (![form.tipo, form.documento, form.nombre.trim(), form.apellido.trim(), form.correo.trim(), form.telefono, form.fecha, form.clave].every(Boolean)) {
      notify("Completa todos los datos del usuario.");
      return;
    }
    if (form.documento.length < 5 || form.documento.length > 12) {
      notify("El número de documento debe tener entre 5 y 12 dígitos.");
      return;
    }
    if (form.telefono.length < 7 || form.telefono.length > 15) {
      notify("El teléfono debe tener entre 7 y 15 dígitos.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
      notify("Escribe un correo válido.");
      return;
    }
    if (form.fecha > fechaMaxima) {
      notify("El usuario debe tener al menos 10 años.");
      return;
    }
    const motivoClave = errorContrasena(form.clave);
    if (motivoClave) {
      notify(motivoClave);
      return;
    }

    setGuardando(true);
    try {
      const res = await userService.crear({
        tipo_documento_u: form.tipo,
        documento_u: parseInt(form.documento, 10),
        nombre_u: form.nombre.trim(),
        apellido_u: form.apellido.trim(),
        telefono_u: form.telefono,
        correo_u: normalizarCorreo(form.correo),
        fecha_nacimiento_u: form.fecha,
        contrasena_u: form.clave,
        contexto: rol && contexto === "social" ? "social" : "deportivo",
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
      notify(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const esAdmin = rol === "adminDeportivo" || rol === "adminSocial";

  return (
    <ModalBase
      titulo="Nuevo usuario"
      subtitulo="Crea una cuenta con los mismos datos que pide el registro público."
      onClose={onClose}
      cerrarFuera={false}
    >
      <form className="modal-form" onSubmit={enviar} autoComplete="off">
        <div className="form-grid">
          <label className="admin-field">
            <span>Tipo de documento</span>
            <select required value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              <option value="">Selecciona</option>
              {TIPOS_DOCUMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span>Número de documento</span>
            <input required inputMode="numeric" value={form.documento} onChange={(e) => set("documento", soloDigitos(e.target.value, 12))} placeholder="Ej. 1052345678" />
          </label>
          <label className="admin-field">
            <span>Nombres</span>
            <input required value={form.nombre} onChange={(e) => set("nombre", soloLetras(e.target.value, 50))} placeholder="Ej. Camila" />
          </label>
          <label className="admin-field">
            <span>Apellidos</span>
            <input required value={form.apellido} onChange={(e) => set("apellido", soloLetras(e.target.value, 50))} placeholder="Ej. Rojas" />
          </label>
          <label className="admin-field">
            <span>Correo electrónico</span>
            <input required type="email" maxLength={100} value={form.correo} onChange={(e) => set("correo", e.target.value.replace(/\s/g, ""))} placeholder="nombre@correo.com" />
          </label>
          <label className="admin-field">
            <span>Teléfono</span>
            <input required inputMode="tel" value={form.telefono} onChange={(e) => set("telefono", soloDigitos(e.target.value, 15))} placeholder="Ej. 3101234567" />
          </label>
          <label className="admin-field">
            <span>Fecha de nacimiento</span>
            <input required type="date" max={fechaMaxima} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </label>

          <div className="admin-field usr-clave">
            <span>Contraseña</span>
            <div className="usr-clave-fila">
              <input
                required
                type={verClave ? "text" : "password"}
                autoComplete="new-password"
                value={form.clave}
                onChange={(e) => { set("clave", e.target.value); setCopiada(false); }}
                placeholder="Mín. 8 con mayúscula, minúscula y número"
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
          </div>
        </div>

        <div className="usr-rol-inicial">
          <div className="usr-rol-inicial-head">
            <KeyRound size={16} />
            <div>
              <strong>Rol adicional (opcional)</strong>
              <small>Si no eliges ninguno, la cuenta queda con el rol que asigna el registro.</small>
            </div>
          </div>
          <div className="usr-rol-inicial-campos">
            <label className="admin-field">
              <span>Rol</span>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="">Solo el rol por defecto</option>
                {ROLES.map((r) => <option key={r.nombre} value={r.nombre}>{r.etiqueta}</option>)}
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
          {esAdmin && (
            <p className="usr-aviso alerta">Este usuario tendrá acceso de administración. Asígnalo solo a personas de confianza.</p>
          )}
        </div>

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
