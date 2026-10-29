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
