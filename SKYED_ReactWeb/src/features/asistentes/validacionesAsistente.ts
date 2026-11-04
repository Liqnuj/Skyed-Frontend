import {
  errorContrasena,
  errorConfirmacion,
  errorCorreo,
  errorDocumento,
  errorFechaNacimiento,
  errorNombrePersona,
  errorTelefonoObligatorio,
  normalizarCorreo,
} from '../../utils/validaciones';
import { contarSecciones, type Permisos } from '../../types/permisos';

export interface FormAsistente {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  documento: string;
  fechaNacimiento: string;
  clave: string;
  confirmacion: string;
  permisos: Permisos;
}

export type CampoAsistente = keyof FormAsistente;
export type ErroresAsistente = Partial<Record<CampoAsistente, string>>;

export const formVacio = (): FormAsistente => ({
  nombre: '', apellido: '', correo: '', telefono: '', tipoDocumento: '', documento: '',
  fechaNacimiento: '', clave: '', confirmacion: '', permisos: {},
});

interface Contexto {
  /** Correo del administrador que está creando (no puede agregarse a sí mismo). */
  correoAdmin?: string;
  /** Asistentes ya cargados: avisa de un correo repetido antes de enviar. */
  correosExistentes?: string[];
  /** Al editar no se pide contraseña y el correo propio no cuenta como repetido. */
  editando?: { correo: string; activo: boolean };
}

/**
 * Valida el formulario completo y devuelve un mensaje por campo. Es solo una
 * ayuda para no enviar lo que la API va a rechazar: la validación real y la
 * de unicidad en todo el sistema las hace el backend.
 */
export function validarAsistente(f: FormAsistente, ctx: Contexto = {}): ErroresAsistente {
  const e: ErroresAsistente = {};
  const editando = !!ctx.editando;

  e.nombre = errorNombrePersona(f.nombre, 'nombre') ?? undefined;
  e.apellido = errorNombrePersona(f.apellido, 'apellido') ?? undefined;
  e.telefono = errorTelefonoObligatorio(f.telefono) ?? undefined;
  if (!editando) {
    if (!f.tipoDocumento) e.tipoDocumento = 'Selecciona el tipo de documento.';
    if (!f.documento) e.documento = 'Escribe el número de documento.';
    else e.documento = errorDocumento(f.tipoDocumento, f.documento) ?? undefined;
    e.fechaNacimiento = errorFechaNacimiento(f.fechaNacimiento) ?? undefined;
  }

  const errCorreo = errorCorreo(f.correo);
  if (errCorreo) e.correo = errCorreo;
  else {
    const c = normalizarCorreo(f.correo);
    if (ctx.correoAdmin && c === normalizarCorreo(ctx.correoAdmin)) {
      e.correo = 'No puedes agregarte a ti mismo como asistente.';
    } else if (
      ctx.correosExistentes?.some((x) => normalizarCorreo(x) === c) &&
      !(editando && c === normalizarCorreo(ctx.editando!.correo))
    ) {
      e.correo = 'Ya tienes un asistente con este correo.';
    }
  }

  if (!editando) {
    e.clave = errorContrasena(f.clave) ?? undefined;
    if (!e.clave) e.confirmacion = errorConfirmacion(f.clave, f.confirmacion) ?? undefined;
    else e.confirmacion = undefined;
  }

  // Alta: siempre al menos una sección. Edición: solo si sigue activo.
  if ((!editando || ctx.editando!.activo) && contarSecciones(f.permisos) === 0) {
    e.permisos = 'Activa al menos una sección para este asistente.';
  }

  (Object.keys(e) as CampoAsistente[]).forEach((k) => { if (!e[k]) delete e[k]; });
  return e;
}
