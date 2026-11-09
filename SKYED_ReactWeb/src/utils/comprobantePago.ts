/**
 * Revisión automática del comprobante de pago que sube el participante.
 *
 * Es una AYUDA, no una prueba de pago: una captura se puede editar, así que
 * el admin siempre confirma en la cuenta. Lo que sí hace es frenar errores
 * comunes (subir otra imagen, pagarle a otra cuenta, reutilizar un comprobante)
 * y dejarle al admin un resumen de lo que se leyó.
 */
import jsQR from 'jsqr';
import { DATOS_PAGO } from '../config/datosPago';

/* ------------------------------------------------------------------ */
/* 1. Código QR                                                         */
/* ------------------------------------------------------------------ */

/** Lado máximo con el que se analiza la imagen (las capturas de celular sobran). */
const LADO_MAX = 2400;

function cargarImagen(file: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const f = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * f));
        const h = Math.max(1, Math.round(img.naturalHeight * f));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('sin canvas');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(ctx.getImageData(0, 0, w, h));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen ilegible')); };
    img.src = url;
  });
}

/** El lector (zxing-cpp en WebAssembly) se carga solo cuando hace falta. */
let lectorListo: Promise<typeof import('zxing-wasm/reader')> | null = null;
function cargarLector() {
  lectorListo ??= (async () => {
    const [lector, { default: wasmUrl }] = await Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    // El .wasm se sirve desde el propio proyecto (por defecto lo bajaría de un CDN).
    lector.prepareZXingModule({
      overrides: { locateFile: (ruta: string, prefijo: string) => (ruta.endsWith('.wasm') ? wasmUrl : prefijo + ruta) },
    });
    return lector;
  })();
  return lectorListo;
}

export type ResultadoQR = {
  /** Hay un código QR real en la imagen (esquinas, guías y formato válidos). */
  hay: boolean;
  /** Su contenido, si se pudo leer. El de Nequi trae el logo encima y casi nunca se puede. */
  texto: string | null;
};

function aBlancoYNegro(imagen: ImageData): ImageData {
  const { data, width, height } = imagen;
  const salida = new Uint8ClampedArray(data.length);
  let suma = 0;
  for (let i = 0; i < data.length; i += 4) {
    suma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const umbral = (suma / (width * height)) * 0.9;
  for (let i = 0; i < data.length; i += 4) {
    const brillo = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const valor = brillo < umbral ? 0 : 255;
    salida[i] = valor;
    salida[i + 1] = valor;
    salida[i + 2] = valor;
    salida[i + 3] = 255;
  }
  return new ImageData(salida, width, height);
}

function detectarConJsQR(imagen: ImageData): string | null {
  const origen = document.createElement('canvas');
  origen.width = imagen.width;
  origen.height = imagen.height;
  const origenContexto = origen.getContext('2d');
  if (!origenContexto) return null;
  origenContexto.putImageData(imagen, 0, 0);

  for (const escala of [1, 1.5, 0.75, 2, 0.5]) {
    const width = Math.max(1, Math.round(imagen.width * escala));
    const height = Math.max(1, Math.round(imagen.height * escala));
    if (width < 50 || height < 50 || width * height > 30_000_000) continue;

    let muestra = imagen;
    if (escala !== 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const contexto = canvas.getContext('2d', { willReadFrequently: true });
      if (!contexto) continue;
      contexto.drawImage(origen, 0, 0, width, height);
      muestra = contexto.getImageData(0, 0, width, height);
    }

    let codigo = jsQR(muestra.data, width, height, { inversionAttempts: 'attemptBoth' });
    if (!codigo) {
      const blancoYNegro = aBlancoYNegro(muestra);
      codigo = jsQR(blancoYNegro.data, width, height, { inversionAttempts: 'attemptBoth' });
    }
    if (import.meta.env?.DEV) {
      console.log(`[comprobante] intento jsQR escala ${escala} (${width}x${height}):`, codigo ? 'ENCONTRADO' : 'no encontrado');
    }
    if (codigo) return codigo.data;
  }
  return null;
}

/**
 * Busca un código QR en el comprobante.
 *
 * Los comprobantes de Nequi traen un QR con el logo "N" tapando el centro, y
 * ese logo tapa más de lo que el QR puede corregir: NINGÚN lector estándar
 * logra sacar su contenido (solo la app de Nequi). Por eso se usa zxing-cpp
 * con `returnErrors`: reconoce el QR por su estructura (las tres esquinas, la
 * línea de tiempo y el formato) aunque no pueda leer lo que dice. Una captura
 * sin QR no devuelve nada.
 */
export async function detectarQR(file: Blob): Promise<ResultadoQR> {
  const imagen = await cargarImagen(file);

  try {
    const { readBarcodes } = await cargarLector();
    const encontrados = await readBarcodes(imagen, {
      formats: ['QRCode'],
      tryHarder: true,
      tryInvert: true,
      tryDownscale: true,
      returnErrors: true,
      maxNumberOfSymbols: 3,
    });
    // `version` solo viene cuando el formato del QR se pudo leer: descarta falsos positivos.
    const qr = encontrados.find((b) => b.isValid) ?? encontrados.find((b) => !!b.version);
    if (qr) return { hay: true, texto: qr.isValid ? qr.text : null };
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[comprobante] no cargó zxing, se usa jsQR', e);
  }

  // Respaldo: jsQR con varias escalas y contraste mejorado para imágenes comprimidas.
  const texto = detectarConJsQR(imagen);
  return texto ? { hay: true, texto } : { hay: false, texto: null };
}

/* ------------------------------------------------------------------ */
/* 2. Texto del comprobante (OCR)                                       */
/* ------------------------------------------------------------------ */

/** Lee el texto de la imagen. Si falla, devuelve '' (no se bloquea por un error técnico). */
export async function leerTexto(file: Blob, onProgress?: (progress: number) => void): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('spa', 1, {
      logger: (message: { status: string; progress: number }) => {
        if (message.status === 'recognizing text') onProgress?.(Math.round(message.progress * 100));
      },
    });
    try {
      const { data } = await worker.recognize(file);
      return data.text || '';
    } finally {
      try {
        await worker.terminate();
      } catch {
        // El trabajador puede haberse cerrado al fallar la lectura.
      }
    }
  } catch {
    return '';
  }
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const soloDigitos = (s: string) => s.replace(/\D/g, '');

export type Analisis = {
  /** Tiene pinta de comprobante (monto, entidad, fecha, referencia...). */
  pareceComprobante: boolean;
  /** El pago fue a la cuenta de SKYED. null = no se pudo leer el texto. */
  destino: boolean | null;
  /** El valor coincide con el total. null = no se encontró ningún valor. */
  monto: boolean | null;
  montoLeido: number | null;
  /** Número de la transacción en el banco/Nequi (para no aceptar el mismo dos veces). */
  referenciaTransaccion: string | null;
  /** El comprobante incluye la referencia SKYED-... de esta inscripción. */
  incluyeReferencia: boolean | null;
};

/** Valores en pesos que aparecen en el texto: "$ 25.000,00" -> 25000. */
export function montosEnTexto(texto: string): number[] {
  const conSigno = [...texto.matchAll(/\$\s?(\d{1,3}(?:[.,]\d{3})+|\d{3,9})(?:[.,]\d{1,2})?(?!\d)/g)].map((m) => m[1]);
  const sinSigno = [...texto.matchAll(/(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d{2})?(?![\d])/g)].map((m) => m[1]);
  return [...conSigno, ...sinSigno].map((n) => Number(n.replace(/[.,]/g, ''))).filter((n) => n > 0);
}

/** Número de la transacción: "Referencia M31647609", "Comprobante No. 0000123456"... */
export function referenciaEnTexto(texto: string): string | null {
  const patron = /(referencia|comprobante|aprobaci[oó]n|transacci[oó]n|c[oó]digo)\s*(?:no\.?|n[°º.o]|#)?\s*[:.]?\s*([A-Z0-9][A-Z0-9-]{5,24})/gi;
  for (const m of texto.matchAll(patron)) {
    const valor = m[2].toUpperCase();
    if (/\d/.test(valor) && !valor.startsWith('SKYED')) return valor;
  }
  return null;
}

/** ¿El comprobante muestra un pago a alguna cuenta de SKYED? */
export function pagoASkyed(texto: string): boolean {
  const digitos = soloDigitos(texto);
  const { nequi, cuentaDigitos, titular } = DATOS_PAGO;

  // Número completo (Nequi 3001234567 o cuenta 12345678912).
  if (nequi.length >= 7 && digitos.includes(nequi)) return true;
  if (cuentaDigitos.length >= 7 && digitos.includes(cuentaDigitos)) return true;

  // Número oculto, como lo muestran los bancos: "*****8912" o "300***4567".
  for (const m of texto.matchAll(/[*xX•·]{2,}\s*-?\s*(\d{4})(?!\d)/g)) {
    if (m[1] === nequi.slice(-4) || m[1] === cuentaDigitos.slice(-4)) return true;
  }

  // Nombre del titular ("SKYED Eventos SAS" -> "skyed eventos").
  const nombre = sinTildes(titular).replace(/\bs\.?\s?a\.?\s?s\.?$/, '').replace(/\s+/g, ' ').trim();
  return nombre.length >= 5 && sinTildes(texto).replace(/\s+/g, ' ').includes(nombre);
}

function pareceComprobanteDePago(texto: string): boolean {
  const t = sinTildes(texto);
  const indicios = [
    montosEnTexto(texto).length > 0,
    /(pago|transferencia|transaccion|comprobante|envio|movimiento|consignacion|realizado)/.test(t),
    /(banco|nequi|daviplata|bancolombia|davivienda|bbva|cuenta de ahorros|cuenta)/.test(t),
    /(referencia|fecha|hora|llave|para|destino)/.test(t),
  ].filter(Boolean).length;
  return indicios >= 1;
}

export function analizarTexto(texto: string, total: number, referenciaSkyed: string): Analisis {
  if (!texto.trim()) {
    return { pareceComprobante: true, destino: null, monto: null, montoLeido: null, referenciaTransaccion: null, incluyeReferencia: null };
  }
  // montosEnTexto devuelve primero los que llevan "$", que son los más confiables.
  const montos = montosEnTexto(texto);
  const esperado = Math.round(total);
  return {
    pareceComprobante: pareceComprobanteDePago(texto),
    destino: pagoASkyed(texto),
    monto: montos.length ? montos.includes(esperado) : null,
    montoLeido: montos.includes(esperado) ? esperado : (montos[0] ?? null),
    referenciaTransaccion: referenciaEnTexto(texto),
    incluyeReferencia: referenciaSkyed
      ? texto.toUpperCase().replace(/\s/g, '').includes(referenciaSkyed.toUpperCase())
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Huella del archivo                                                */
/* ------------------------------------------------------------------ */

/** SHA-256 del archivo original: si alguien sube la misma imagen dos veces, coincide. */
export async function huellaArchivo(file: Blob): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null; // solo en https o localhost
    const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
