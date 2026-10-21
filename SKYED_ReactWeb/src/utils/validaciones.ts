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
