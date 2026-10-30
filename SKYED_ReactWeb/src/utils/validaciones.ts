/**
 * Reglas compartidas por los formularios de cuenta. Son las mismas que
 * aplica el backend (app/Support/ReglasUsuario.php), para que la página no
 * deje enviar algo que la API va a rechazar.
 */

/** Devuelve el motivo si la contraseña no es segura, o null si cumple. */
export function errorContrasena(clave: string): string | null {
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(clave) || !/[a-z]/.test(clave) || !/[0-9]/.test(clave)) {
    return 'La contraseña debe tener al menos una mayúscula, una minúscula y un número.';
  }
  return null;
}

/** Correo como lo guarda el backend: sin espacios y en minúsculas. */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/**
 * Largo permitido del número de documento según el tipo. El backend guarda el
 * documento como número, por eso solo se aceptan dígitos (también en pasaporte).
 */
export const REGLAS_DOCUMENTO: Record<string, { min: number; max: number; nombre: string }> = {
  CC: { min: 6, max: 10, nombre: 'cédula de ciudadanía' },
  TI: { min: 10, max: 11, nombre: 'tarjeta de identidad' },
  CE: { min: 6, max: 10, nombre: 'cédula de extranjería' },
  PA: { min: 6, max: 9, nombre: 'pasaporte' },
};

/** Largo máximo permitido para el documento; sin tipo elegido se usa el mayor (10). */
export function maxDocumento(tipo: string): number {
  return REGLAS_DOCUMENTO[tipo]?.max ?? 10;
}

/** Texto de ayuda: "6 a 10 dígitos" / "10 u 11 dígitos". */
export function ayudaDocumento(tipo: string): string {
  const r = REGLAS_DOCUMENTO[tipo];
  if (!r) return 'Primero elige el tipo de documento.';
  return r.min === r.max - 1
    ? `${r.min} u ${r.max} dígitos`
    : `${r.min} a ${r.max} dígitos`;
}

/** Motivo si el número no cumple las reglas de su tipo, o null si está bien (vacío también es válido). */
export function errorDocumento(tipo: string, numero: string): string | null {
  if (!numero) return null;
  const r = REGLAS_DOCUMENTO[tipo];
  if (!r) return 'Elige el tipo de documento antes de escribir el número.';
  if (!/^\d+$/.test(numero)) return 'El número de documento solo puede tener dígitos.';
  if (numero.length < r.min || numero.length > r.max) {
    return `El número de ${r.nombre} debe tener ${ayudaDocumento(tipo)}.`;
  }
  return null;
}

export const soloLetras = (v: string, max = 50) =>
  v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').slice(0, max);

export const soloDigitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

/** Motivo si el teléfono (7 a 15 dígitos) no es válido; vacío es válido. */
export function errorTelefono(tel: string): string | null {
  if (!tel) return null;
  return tel.length < 7 || tel.length > 15 ? 'El teléfono debe tener entre 7 y 15 dígitos.' : null;
}

/** Nombre o apellido: al menos 2 letras (los espacios sueltos no cuentan). Vacío → obligatorio. */
export function errorNombrePersona(valor: string, etiqueta: 'nombre' | 'apellido'): string | null {
  const limpio = valor.trim();
  if (!limpio) return `Escribe el ${etiqueta}.`;
  if (limpio.replace(/\s/g, '').length < 2) return `El ${etiqueta} debe tener al menos 2 letras.`;
  return null;
}

/** Correo con formato válido (usuario@dominio.ext) y de hasta 80 caracteres, como en el registro. */
export function errorCorreo(correo: string): string | null {
  const c = correo.trim();
  if (!c) return 'Escribe el correo electrónico.';
  if (c.length > 80) return 'El correo no puede superar los 80 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(c) || c.includes('..')) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  return null;
}

/** Edad cumplida en años a hoy, o null si la fecha (AAAA-MM-DD) no es válida. */
export function edadEnAnios(fecha: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [y, m, d] = fecha.split('-').map(Number);
  const nac = new Date(y, m - 1, d);
  // Rechaza fechas que JS "corrige" (31 de febrero, mes 13, etc.).
  if (nac.getFullYear() !== y || nac.getMonth() !== m - 1 || nac.getDate() !== d) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() < m - 1 || (hoy.getMonth() === m - 1 && hoy.getDate() < d)) edad--;
  return edad;
}

/** Motivo si la fecha de nacimiento no sirve (vacía, inválida, futura, menor de 10 o de más de 120 años). */
export function errorFechaNacimiento(fecha: string, edadMinima = 10): string | null {
  if (!fecha) return 'Selecciona la fecha de nacimiento.';
  const edad = edadEnAnios(fecha);
  if (edad === null) return 'La fecha de nacimiento no es válida.';
  if (edad < 0) return 'La fecha de nacimiento no puede ser futura.';
  if (edad < edadMinima) return `La persona debe tener al menos ${edadMinima} años.`;
  if (edad > 120) return 'Revisa la fecha de nacimiento: la edad no puede superar los 120 años.';
  return null;
}
