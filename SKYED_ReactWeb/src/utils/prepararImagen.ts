/**
 * Reduce una foto antes de subirla al servidor.
 *
 * PHP trae por defecto upload_max_filesize = 2M y una foto de celular pesa
 * 3-6 MB, así que el backend la rechazaba ("The imagen failed to upload")
 * aunque la interfaz dijera "máx. 8 MB". Redimensionando a 1920 px y
 * guardando como JPEG queda en unos cientos de KB y se ve igual en la web,
 * sin que cada computador tenga que cambiar su php.ini.
 */
const LADO_MAXIMO = 1920;
const LIMITE_SIN_TOCAR = 1.5 * 1024 * 1024;

export async function prepararImagen(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // formato que el navegador no sabe leer: se envía tal cual
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && file.size <= LIMITE_SIN_TOCAR) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Fondo blanco: un PNG con transparencia no queda con fondo negro en JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) return file;

  const nombre = file.name.replace(/\.[^.]+$/, '') || 'imagen';
  return new File([blob], `${nombre}.jpg`, { type: 'image/jpeg' });
}
