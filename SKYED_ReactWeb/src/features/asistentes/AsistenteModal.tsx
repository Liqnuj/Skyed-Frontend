import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Sparkles, X } from 'lucide-react';
import PermisosEditor from './PermisosEditor';
import { formVacio, validarAsistente, type ErroresAsistente, type FormAsistente } from './validacionesAsistente';
import { MAX_CORREO, MAX_NOMBRE, MAX_TELEFONO } from './constantes';
import type { Asistente, Modulo, Permisos } from '../../types/permisos';
import { sanitizeName, soloDigitos, normalizarCorreo, maxDocumento } from '../../utils/validaciones';
import { capitalizar } from '../../utils/texto';
import '../../styles/shared/asistentes.css';

const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUS = 'abcdefghijkmnopqrstuvwxyz';
const NUMS = '23456789';

function generarClave(): string {
  const azar = (n: number) => {
    const valores = new Uint32Array(1);
    crypto.getRandomValues(valores);
    return valores[0] % n;
  };
  const tomar = (opciones: string) => opciones[azar(opciones.length)];
  const caracteres = [tomar(MAYUS), tomar(MINUS), tomar(NUMS)];
  const todos = MAYUS + MINUS + NUMS;
  while (caracteres.length < 12) caracteres.push(tomar(todos));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = azar(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

interface DatosFormulario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  tipoDocumento?: string;
  documento?: number;
  fechaNacimiento?: string;
  clave?: string;
  confirmacion?: string;
  permisos: Permisos;
}

interface Props {
  modulo: Modulo;
  item?: Asistente | null;
  correoAdmin?: string;
  correosExistentes: string[];
  onClose: () => void;
  onGuardar: (datos: DatosFormulario) => Promise<void>;
}

export default function AsistenteModal({
  modulo, item, correoAdmin, correosExistentes, onClose, onGuardar,
}: Props) {
  const editando = !!item;
  const [form, setForm] = useState<FormAsistente>(() =>
    item
      ? {
          nombre: item.nombre,
          apellido: item.apellido,
          correo: item.correo,
          telefono: item.telefono,
          tipoDocumento: '',
          documento: '',
          fechaNacimiento: '',
          clave: '',
          confirmacion: '',
          permisos: { ...item.permisos },
        }
      : formVacio(),
  );
  const [tocados, setTocados] = useState<Partial<Record<keyof FormAsistente, boolean>>>({});
  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof FormAsistente>(campo: K, valor: FormAsistente[K]) => {
    setErrorApi(null);
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const errores: ErroresAsistente = useMemo(
    () => validarAsistente(form, {
      correoAdmin,
      correosExistentes,
      editando: item ? { correo: item.correo, activo: item.activo } : undefined,
    }),
    [form, correoAdmin, correosExistentes, item],
  );
  const visible = (campo: keyof FormAsistente) => (tocados[campo] ? errores[campo] : undefined);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enviando) return;
    const camposConError = Object.keys(errores) as Array<keyof FormAsistente>;
    if (camposConError.length) {
      setTocados(Object.fromEntries(camposConError.map((campo) => [campo, true])));
      formRef.current?.querySelector<HTMLElement>('[data-invalido="true"]')?.focus();
      return;
    }

    setEnviando(true);
    setErrorApi(null);
    try {
      await onGuardar({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: normalizarCorreo(form.correo),
        telefono: form.telefono,
        tipoDocumento: editando ? undefined : form.tipoDocumento,
        documento: editando ? undefined : Number(form.documento),
        fechaNacimiento: editando ? undefined : form.fechaNacimiento,
        clave: editando ? undefined : form.clave,
        confirmacion: editando ? undefined : form.confirmacion,
        permisos: form.permisos,
      });
    } catch (error) {
      setErrorApi(error instanceof Error ? error.message : 'No se pudo guardar el asistente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => event.stopPropagation()}>
      <div className="admin-modal asist-modal" role="dialog" aria-modal="true" aria-labelledby="asist-modal-titulo">
        <div className="admin-modal-head">
          <div>
            <h2 id="asist-modal-titulo">{editando ? 'Editar asistente' : 'Agregar asistente'}</h2>
            <p>
              {editando
                ? 'Cambia los datos o los permisos. La contraseña no se modifica aquí.'
                : 'Crea una cuenta de asistente vinculada a tu panel. Debe tener al menos una sección activa.'}
            </p>
          </div>
          <button title="Cerrar" className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>

        <form ref={formRef} className="modal-form" onSubmit={enviar} autoComplete="off" noValidate>
          <div className="form-grid">
            <label className={`admin-field ${visible('nombre') ? 'asist-invalido' : ''}`}>
              <span>Nombre</span>
              <input data-invalido={visible('nombre') ? 'true' : undefined} maxLength={MAX_NOMBRE} value={form.nombre}
                onChange={(event) => set('nombre', capitalizar(sanitizeName(event.target.value, MAX_NOMBRE)))}
                onBlur={() => setTocados((actual) => ({ ...actual, nombre: true }))} />
              {visible('nombre') && <small className="asist-error" role="alert">{visible('nombre')}</small>}
            </label>
            <label className={`admin-field ${visible('apellido') ? 'asist-invalido' : ''}`}>
              <span>Apellido</span>
              <input data-invalido={visible('apellido') ? 'true' : undefined} maxLength={MAX_NOMBRE} value={form.apellido}
                onChange={(event) => set('apellido', capitalizar(sanitizeName(event.target.value, MAX_NOMBRE)))}
                onBlur={() => setTocados((actual) => ({ ...actual, apellido: true }))} />
              {visible('apellido') && <small className="asist-error" role="alert">{visible('apellido')}</small>}
            </label>
            <label className={`admin-field ${visible('correo') ? 'asist-invalido' : ''}`}>
              <span>Correo</span>
              <input data-invalido={visible('correo') ? 'true' : undefined} type="email" maxLength={MAX_CORREO} value={form.correo}
                onChange={(event) => set('correo', event.target.value.slice(0, MAX_CORREO))}
                onBlur={() => setTocados((actual) => ({ ...actual, correo: true }))} />
              {visible('correo') && <small className="asist-error" role="alert">{visible('correo')}</small>}
            </label>
            <label className={`admin-field ${visible('telefono') ? 'asist-invalido' : ''}`}>
              <span>Teléfono</span>
              <input data-invalido={visible('telefono') ? 'true' : undefined} inputMode="numeric" maxLength={MAX_TELEFONO} value={form.telefono}
                onChange={(event) => set('telefono', soloDigitos(event.target.value, MAX_TELEFONO))}
                onBlur={() => setTocados((actual) => ({ ...actual, telefono: true }))} />
              {visible('telefono') && <small className="asist-error" role="alert">{visible('telefono')}</small>}
            </label>
            {!editando && (
              <>
                <label className={`admin-field ${visible('tipoDocumento') ? 'asist-invalido' : ''}`}>
                  <span>Tipo de documento</span>
                  <select data-invalido={visible('tipoDocumento') ? 'true' : undefined} value={form.tipoDocumento}
                    onChange={(event) => set('tipoDocumento', event.target.value)}
                    onBlur={() => setTocados((actual) => ({ ...actual, tipoDocumento: true }))}>
                    <option value="">Selecciona una opción</option>
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                  {visible('tipoDocumento') && <small className="asist-error" role="alert">{visible('tipoDocumento')}</small>}
                </label>
                <label className={`admin-field ${visible('documento') ? 'asist-invalido' : ''}`}>
                  <span>Número de documento</span>
                  <input data-invalido={visible('documento') ? 'true' : undefined} inputMode="numeric"
                    maxLength={maxDocumento(form.tipoDocumento)} value={form.documento}
                    onChange={(event) => set('documento', soloDigitos(event.target.value, maxDocumento(form.tipoDocumento)))}
                    onBlur={() => setTocados((actual) => ({ ...actual, documento: true }))} />
                  {visible('documento') && <small className="asist-error" role="alert">{visible('documento')}</small>}
                </label>
                <label className={`admin-field ${visible('fechaNacimiento') ? 'asist-invalido' : ''}`}>
                  <span>Fecha de nacimiento</span>
                  <input data-invalido={visible('fechaNacimiento') ? 'true' : undefined} type="date"
                    value={form.fechaNacimiento}
                    onChange={(event) => set('fechaNacimiento', event.target.value)}
                    onBlur={() => setTocados((actual) => ({ ...actual, fechaNacimiento: true }))} />
                  {visible('fechaNacimiento') && <small className="asist-error" role="alert">{visible('fechaNacimiento')}</small>}
                </label>
              </>
            )}
          </div>

          {!editando && (
            <div className="form-grid">
              <label className={`admin-field ${visible('clave') ? 'asist-invalido' : ''}`}>
                <span>Contraseña temporal</span>
                <div className="asist-clave">
                  <input data-invalido={visible('clave') ? 'true' : undefined} type={verClave ? 'text' : 'password'}
                    value={form.clave} autoComplete="new-password"
                    onChange={(event) => set('clave', event.target.value)}
                    onBlur={() => setTocados((actual) => ({ ...actual, clave: true }))} />
                  <button type="button" className="asist-clave-btn" title={verClave ? 'Ocultar' : 'Mostrar'} onClick={() => setVerClave((actual) => !actual)}>
                    {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button type="button" className="asist-clave-btn" title="Generar contraseña" onClick={() => {
                    const clave = generarClave();
                    setForm((actual) => ({ ...actual, clave, confirmacion: clave }));
                    setVerClave(true);
                    setTocados((actual) => ({ ...actual, clave: true, confirmacion: true }));
                  }}>
                    <Sparkles size={16} />
                  </button>
                </div>
                {visible('clave') && <small className="asist-error" role="alert">{visible('clave')}</small>}
              </label>
              <label className={`admin-field ${visible('confirmacion') ? 'asist-invalido' : ''}`}>
                <span>Confirmar contraseña</span>
                <input data-invalido={visible('confirmacion') ? 'true' : undefined} type={verClave ? 'text' : 'password'}
                  value={form.confirmacion} autoComplete="new-password"
                  onChange={(event) => set('confirmacion', event.target.value)}
                  onBlur={() => setTocados((actual) => ({ ...actual, confirmacion: true }))} />
                {visible('confirmacion') && <small className="asist-error" role="alert">{visible('confirmacion')}</small>}
              </label>
            </div>
          )}

          <div className="asist-perm-bloque">
            <h3>Permisos</h3>
            <p>Activa las secciones a las que puede entrar y, si quieres, personaliza el nivel.</p>
            <PermisosEditor
              modulo={modulo}
              value={form.permisos}
              onChange={(permisos) => {
                setErrorApi(null);
                setForm((actual) => ({ ...actual, permisos }));
                setTocados((actual) => ({ ...actual, permisos: true }));
              }}
              disabled={enviando}
              error={visible('permisos')}
            />
          </div>

          {errorApi && <p className="asist-error" role="alert">{errorApi}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className="primary-btn" disabled={enviando}>
              {enviando && <Loader2 size={16} className="asist-spin" />}
              {editando ? 'Guardar cambios' : 'Crear asistente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}