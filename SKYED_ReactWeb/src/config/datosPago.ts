/**
 * Cuentas de SKYED a las que el participante paga la inscripción.
 *
 * Están en un solo lugar (y se pueden cambiar con variables VITE_PAGO_* del
 * archivo .env) para que la página de pago y la validación del comprobante
 * usen siempre los mismos datos. Mientras no existan las cuentas reales, se
 * pueden poner los datos de una cuenta de prueba para probar con capturas.
 */
const env = import.meta.env;
const soloDigitos = (s: string) => s.replace(/\D/g, '');

const nequi = soloDigitos(env.VITE_PAGO_NEQUI ?? '3001234567');
const cuenta = env.VITE_PAGO_CUENTA ?? '123-456789-12';

export const DATOS_PAGO = {
  banco: env.VITE_PAGO_BANCO ?? 'Bancolombia',
  tipoCuenta: env.VITE_PAGO_TIPO_CUENTA ?? 'Cuenta de ahorros',
  /** Número de cuenta tal como se muestra (con guiones). */
  cuenta,
  cuentaDigitos: soloDigitos(cuenta),
  /** Nequi / Daviplata: solo dígitos (3001234567). */
  nequi,
  /** "300 123 4567" para mostrar. */
  nequiVisible: nequi.length === 10 ? `${nequi.slice(0, 3)} ${nequi.slice(3, 6)} ${nequi.slice(6)}` : nequi,
  titular: env.VITE_PAGO_TITULAR ?? 'SKYED Eventos SAS',
  nit: env.VITE_PAGO_NIT ?? '900.123.456-7',
};

/**
 * Referencia única de cada inscripción: evento + participante.
 * Ej.: SKYED-0002-15 (evento 2, usuario 15). Así, cuando llega una
 * transferencia, el admin sabe exactamente de quién es.
 */
export function referenciaDePago(idEvento: number, idUsuario: number | string | undefined): string {
  const evento = String(idEvento).padStart(4, '0');
  return idUsuario ? `SKYED-${evento}-${idUsuario}` : `SKYED-${evento}`;
}
