import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import TermsModal from '../../components/shared/TermsModal';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { prepararImagen } from '../../utils/prepararImagen';
import { DATOS_PAGO, referenciaDePago } from '../../config/datosPago';
import { detectarQR, leerTexto, analizarTexto, huellaArchivo } from '../../utils/comprobantePago';
import '../../styles/deportivo/participante.css';

/* =====================================================================
   Inscripción a un evento deportivo (3 pasos: datos, pago y confirmar).
   Los estilos están en participante.css, sección "INSCRIPCIÓN (.insc)".
   ===================================================================== */

interface Kit {
  nombre?: string | null;
  precio?: number;
  imagen_url?: string | null;
  tallas?: { talla: string; cantidad: number }[];
  contenido?: string | null;
  fecha_entrega?: string | null;
  lugar_entrega?: string | null;
  incluido?: boolean;
}

interface EventoInscripcion {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  distancia: string | number | null;
  desnivel: string | number | null;
  fecha: string;
  hora: string;
  ubicacion: string;
  descripcion: string;
  imagen_url: string | null;
  cupos_disponibles: number;
  estado: string;
  kit?: Kit | null;
}

interface CategoriaCompetencia {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

type MetodoPago = 'transferencia' | 'nequi' | 'efectivo';

const RH_OPCIONES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const PARENTESCOS = [
  { valor: 'madre', etiqueta: 'Madre', icono: 'ti-woman' },
  { valor: 'padre', etiqueta: 'Padre', icono: 'ti-man' },
  { valor: 'esposo_a', etiqueta: 'Esposo/a', icono: 'ti-heart' },
  { valor: 'hermano_a', etiqueta: 'Hermano/a', icono: 'ti-users' },
  { valor: 'amigo_a', etiqueta: 'Amigo/a', icono: 'ti-friends' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'ti-user' },
];

const TIPOS_DOCUMENTO: Record<string, { etiqueta: string; min: number; max: number }> = {
  CC: { etiqueta: 'Cédula de ciudadanía', min: 6, max: 10 },
  TI: { etiqueta: 'Tarjeta de identidad', min: 10, max: 11 },
  CE: { etiqueta: 'Cédula de extranjería', min: 6, max: 10 },
  PA: { etiqueta: 'Pasaporte', min: 5, max: 12 },
};

const METODOS: Array<{ valor: MetodoPago; titulo: string; detalle: string; icono: string }> = [
  { valor: 'transferencia', titulo: 'Transferencia', detalle: 'Desde tu banco', icono: 'ti-building-bank' },
  { valor: 'nequi', titulo: 'Nequi / Daviplata', detalle: 'Al instante desde el celular', icono: 'ti-device-mobile' },
  { valor: 'efectivo', titulo: 'Efectivo', detalle: 'En el punto de inscripción', icono: 'ti-cash' },
];

const MAX_MEDICO = 500;
const DRAFT_KEY_PREFIX = 'skyed_inscripcion_draft_';

/* ---------------------------------------------------------------------
   Formatos
   --------------------------------------------------------------------- */

function fmtMoney(n: number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

/** "2026-11-25T00:00:00.000000Z" -> Date local (sin desfase de zona horaria). */
function fechaLocal(iso: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** "25 de noviembre de 2026" */
function fmtFecha(iso: string | null | undefined) {
  const f = fechaLocal(iso);
  return f ? f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

/** "mar, 25 nov" para el encabezado. */
function fmtFechaCorta(iso: string | null | undefined) {
  const f = fechaLocal(iso);
  return f ? f.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
}

/** "07:00:00" -> "7:00 a. m." */
function fmtHora(hora: string | null | undefined) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? ''));
  if (!m) return hora ?? '';
  return new Date(2000, 0, 1, Number(m[1]), Number(m[2])).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}

/** Días que faltan para el evento (0 = hoy, negativo = ya pasó). */
function diasParaEvento(iso: string | null | undefined) {
  const f = fechaLocal(iso);
  if (!f) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000);
}

/* ---------------------------------------------------------------------
   Limpieza de lo que se escribe (no deja pasar caracteres especiales)
   --------------------------------------------------------------------- */

/** Solo letras (con tildes, ñ y ü) y espacios; cada palabra empieza en mayúscula. */
function soloLetras(s: string, max = 50) {
  return s
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '')
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|\s)([a-záéíóúñü])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    .slice(0, max);
}

/** Solo números, con un largo máximo. */
function soloNumeros(s: string, max = 10) {
  return s.replace(/\D/g, '').slice(0, max);
}

/** Dorsal: solo números, sin ceros a la izquierda, de 1 a 99999. */
function limpiarDorsal(s: string) {
  return s.replace(/\D/g, '').replace(/^0+/, '').slice(0, 5);
}

/** Correo: sin espacios, en minúscula y máximo 80 caracteres. */
function limpiarCorreo(s: string) {
  return s.replace(/\s/g, '').toLowerCase().slice(0, 80);
}

/** Texto libre (condiciones médicas): sin símbolos que sirvan para inyectar código. */
function limpiarTextoLibre(s: string) {
  return s
    .replace(/[<>{}[\]`$\\|^~]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, MAX_MEDICO);
}

/** ¿Al limpiar se quitó algo distinto de espacios? (para avisar qué no se permite) */
function quitoCaracteres(antes: string, despues: string) {
  return despues.replace(/\s/g, '').length < antes.replace(/\s/g, '').length;
}

const SOLO_LETRAS = 'Solo se permiten letras y espacios.';
const SOLO_NUMEROS = 'Solo se permiten números.';
const SIN_SIMBOLOS = 'No se permiten símbolos como < > { } [ ] $ \\ | " \' ; =';

/** Caracteres que el filtro global (utils/seguridadTexto.ts) quita antes de que React los vea. */
const ESPECIALES = /[<>"'`;\\|&{}[\]^~=$＜＞＂＇；＆＝｜＄]/;

/**
 * El filtro global borra los caracteres peligrosos al instante, así que el
 * campo nunca "ve" que se escribieron. Esto los detecta justo antes (al
 * teclear o pegar) para poder explicarle a la persona por qué no aparecen.
 */
function detectarEspeciales(avisar: () => void, alEscribirBien?: () => void) {
  return {
    onBeforeInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const dato = (e.nativeEvent as InputEvent).data;
      if (dato && ESPECIALES.test(dato)) avisar();
      else if (dato) alEscribirBien?.();
    },
    onPaste: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (ESPECIALES.test(e.clipboardData.getData('text'))) avisar();
    },
  };
}

/* ---------------------------------------------------------------------
   Validaciones (devuelven '' si está bien o el mensaje de error)
   --------------------------------------------------------------------- */

function errorCelular(v: string) {
  if (!v) return 'Este campo es obligatorio.';
  if (v.length < 10) {
    const faltan = 10 - v.length;
    return `Faltan ${faltan} dígito${faltan === 1 ? '' : 's'}: el celular tiene 10.`;
  }
  if (!/^3\d{9}$/.test(v)) return 'El celular debe empezar por 3 (ej. 3001234567).';
  return '';
}

function errorNombreCompleto(v: string) {
  const t = v.trim();
  if (!t) return 'Este campo es obligatorio.';
  const partes = t.split(/\s+/);
  if (partes.length < 2) return 'Escribe el nombre y el apellido.';
  if (partes.some((p) => p.length < 2)) return 'Cada nombre debe tener al menos 2 letras.';
  return '';
}

function errorNombre(v: string) {
  const t = v.trim();
  if (!t) return 'Este campo es obligatorio.';
  if (t.replace(/\s/g, '').length < 2) return 'Debe tener al menos 2 letras.';
  return '';
}

function errorDocumentoInvitado(tipo: string, v: string, documentoTitular: string) {
  const reglas = TIPOS_DOCUMENTO[tipo] ?? TIPOS_DOCUMENTO.CC;
  if (!v) return 'Este campo es obligatorio.';
  if (v.length < reglas.min || v.length > reglas.max) {
    return reglas.min === reglas.max
      ? `La ${reglas.etiqueta.toLowerCase()} debe tener ${reglas.min} dígitos.`
      : `Debe tener entre ${reglas.min} y ${reglas.max} dígitos.`;
  }
  if (documentoTitular && v === String(documentoTitular)) return 'Es tu mismo documento: el invitado debe ser otra persona.';
  return '';
}

function errorCorreo(v: string) {
  if (!v) return '';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return 'Escribe un correo válido (ej. nombre@correo.com).';
  return '';
}

/** Edad permitida del invitado: de 10 a 100 años, calculada desde la fecha de hoy. */
const EDAD_MIN_INVITADO = 10;
const EDAD_MAX_INVITADO = 100;
function isoLocal(f: Date) {
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const dd = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mm}-${dd}`;
}
function rangoNacimientoInvitado() {
  const hoy = new Date();
  return {
    max: isoLocal(new Date(hoy.getFullYear() - EDAD_MIN_INVITADO, hoy.getMonth(), hoy.getDate())),
    min: isoLocal(new Date(hoy.getFullYear() - EDAD_MAX_INVITADO, hoy.getMonth(), hoy.getDate())),
  };
}
function errorNacimientoInvitado(valor: string): string {
  if (!valor) return 'Este campo es obligatorio.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Escribe una fecha válida.';
  const { min, max } = rangoNacimientoInvitado();
  if (valor > max) return `El invitado debe tener al menos ${EDAD_MIN_INVITADO} años.`;
  if (valor < min) return `El invitado no puede tener más de ${EDAD_MAX_INVITADO} años.`;
  return '';
}

/* ---------------------------------------------------------------------
   Piezas de la interfaz
   --------------------------------------------------------------------- */

/** Bloque numerado del formulario ("01 · Tu perfil de corredor"). */
function Seccion({ numero, icono, titulo, subtitulo, children }: {
  numero: number;
  icono: string;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <section className="insc-seccion" style={{ '--i': numero } as React.CSSProperties}>
      <header className="insc-seccion-cab">
        <span className="insc-seccion-num" aria-hidden="true">{String(numero).padStart(2, '0')}</span>
        <div>
          <h3><i className={`ti ${icono}`} aria-hidden="true" /> {titulo}</h3>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </header>
      <div className="insc-seccion-cuerpo">{children}</div>
    </section>
  );
}

/** Campo con etiqueta, ícono, mensaje de error y marca verde cuando está bien. */
function Campo({ id, etiqueta, icono, error, ok, ayuda, ancho, children }: {
  id: string;
  etiqueta: ReactNode;
  icono?: string;
  error?: string;
  ok?: boolean;
  ayuda?: ReactNode;
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`insc-campo${error ? ' con-error' : ok ? ' con-ok' : ''}${ancho ? ' ancho' : ''}`}>
      <label htmlFor={id} className="insc-etiqueta">{etiqueta}</label>
      <div className={`insc-control${icono ? ' con-icono' : ''}`}>
        {icono && <i className={`ti ${icono} insc-control-icono`} aria-hidden="true" />}
        {children}
        {ok && !error && <i className="ti ti-circle-check-filled insc-control-ok" aria-hidden="true" />}
      </div>
      {error
        ? <p className="insc-error" id={`${id}-error`}><i className="ti ti-alert-circle" aria-hidden="true" /> {error}</p>
        : ayuda ? <p className="insc-ayuda">{ayuda}</p> : null}
    </div>
  );
}

/** Opciones en "pastillas" (RH, parentesco...). */
function Pastillas<T extends string>({ id, opciones, valor, onCambio, error, etiqueta, columnas }: {
  id: string;
  opciones: Array<{ valor: T; etiqueta: string; icono?: string }>;
  valor: string;
  onCambio: (v: T) => void;
  error?: string;
  etiqueta: string;
  columnas?: number;
}) {
  return (
    <div
      id={id}
      tabIndex={-1}
      role="radiogroup"
      aria-label={etiqueta}
      className={`insc-pastillas${error ? ' con-error' : ''}`}
      style={columnas ? ({ '--cols': columnas } as React.CSSProperties) : undefined}
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          title={`Elegir ${o.etiqueta}`}
          className="insc-pastilla"
          onClick={() => onCambio(o.valor)}
        >
          {o.icono && <i className={`ti ${o.icono}`} aria-hidden="true" />}
          <span>{o.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}

/** Sí / No en dos botones iguales, con animación al elegir. */
function OpcionSiNo({ valor, onSi, onNo }: { valor: boolean | null; onSi: () => void; onNo: () => void }) {
  return (
    <div className="kit-sino" role="radiogroup">
      <button type="button" title="Responder Sí" role="radio" aria-checked={valor === true} onClick={onSi}>
        <i className="ti ti-check" aria-hidden="true" /> Sí
      </button>
      <button type="button" title="Responder No" role="radio" aria-checked={valor === false} onClick={onNo}>
        <i className="ti ti-x" aria-hidden="true" /> No
      </button>
    </div>
  );
}

/** Talla del kit como tarjeta animada: la talla grande y debajo cuántas quedan. */
function TallaOpcion({ talla, quedan, controlado, activa, indice, onClick }: {
  talla: string;
  quedan: number;
  controlado: boolean; // false en kits antiguos sin inventario por talla
  activa: boolean;
  indice: number; // para que las tarjetas entren una tras otra
  onClick: () => void;
}) {
  const agotada = controlado && quedan <= 0;
  const nivel = !controlado ? undefined : quedan === 1 ? 'ultima' : quedan <= 3 ? 'poca' : undefined;
  const aviso = !controlado ? null : agotada ? 'Agotada' : quedan === 1 ? '¡Última!' : `Quedan ${quedan}`;

  return (
    <button
      type="button"
      title={agotada ? `La talla ${talla} está agotada` : `Elegir la talla ${talla}`}
      role="radio"
      aria-checked={activa}
      disabled={agotada}
      data-activa={activa}
      className="kit-talla"
      style={{ '--i': indice } as React.CSSProperties}
      onClick={onClick}
    >
      {activa && <i className="ti ti-circle-check-filled kit-check" aria-hidden="true" />}
      <strong>{talla}</strong>
      {aviso && <small data-nivel={nivel}>{aviso}</small>}
    </button>
  );
}

/** Copia un texto al portapapeles (con respaldo para navegadores sin permiso). */
async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    try { document.execCommand('copy'); } catch { /* sin soporte */ }
    document.body.removeChild(campo);
  }
}

/** Un dato para pagar (cuenta, titular...) con botón de copiar que confirma "Copiado". */
function DatoPago({ etiqueta, valor, copiar, destacado }: { etiqueta: string; valor: string; copiar?: string; destacado?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const alCopiar = async () => {
    if (!copiar) return;
    await copiarTexto(copiar);
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className={`insc-dato${destacado ? ' destacado' : ''}`}>
      <span className="insc-dato-etiqueta">{etiqueta}</span>
      <strong className="insc-dato-valor">{valor}</strong>
      {copiar && (
        <button type="button" className={`insc-copiar${copiado ? ' ok' : ''}`} title={`Copiar: ${etiqueta.toLowerCase()}`} onClick={alCopiar}>
          <i className={`ti ${copiado ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar'}
        </button>
      )}
      <span className="insc-solo-lector" role="status" aria-live="polite">{copiado ? `${etiqueta} copiado` : ''}</span>
    </div>
  );
}

/* =====================================================================
   Página
   ===================================================================== */

export default function Inscription() {
  return (
    <Protected>
      <SportWrapper>
        <InscriptionWizard />
      </SportWrapper>
    </Protected>
  );
}

function InscriptionWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [evento, setEvento] = useState<EventoInscripcion | null>(null);
  const [categorias, setCategorias] = useState<CategoriaCompetencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [yaInscrito, setYaInscrito] = useState(false);

  // Datos del titular
  const [documento, setDocumento] = useState('');
  const [errorDocumento, setErrorDocumento] = useState('');
  const [rh, setRh] = useState('');
  const [errorRh, setErrorRh] = useState('');
  const [errorFechaNacimiento, setErrorFechaNacimiento] = useState('');
  const [errorParentesco, setErrorParentesco] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [errorTelefonoContacto, setErrorTelefonoContacto] = useState('');
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('');
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('');
  const [errorNombreContacto, setErrorNombreContacto] = useState('');
  const [errorTelefonoEmergencia, setErrorTelefonoEmergencia] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [deseaJersey, setDeseaJersey] = useState<boolean | null>(null);
  const [dorsalPreferido, setDorsalPreferido] = useState('');
  const [tallaKit, setTallaKit] = useState('');
  const [condicionesMedicas, setCondicionesMedicas] = useState('');
  const [avisoCondiciones, setAvisoCondiciones] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [vistaComprobante, setVistaComprobante] = useState<string | null>(null);
  const [errorComprobante, setErrorComprobante] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [validandoComprobante, setValidandoComprobante] = useState(false);
  // Avance de la lectura OCR; null mientras se valida el QR u otra fase.
  const [progresoValidacion, setProgresoValidacion] = useState<number | null>(null);
  // Lo que se leyó del comprobante: se guarda con el pago para que el admin lo vea.
  const [verificacion, setVerificacion] = useState<{
    hash: string | null;
    referenciaTransaccion: string | null;
    datos: Record<string, unknown>;
  } | null>(null);
  // Problema con el comprobante: se queda visible debajo del recuadro (no se
  // borra solo como las alertas) hasta que el usuario lo cierre o suba otro.
  const [avisoComprobante, setAvisoComprobante] = useState<{
    tipo: 'error' | 'aviso';
    titulo: string;
    detalle: string;
    /** Mostrar los datos de la cuenta de SKYED a la que debía pagar. */
    mostrarCuenta?: boolean;
  } | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaCondicionFisica, setAceptaCondicionFisica] = useState(false);
  const [errorTerminos, setErrorTerminos] = useState(false);
  const [errorCondicionFisica, setErrorCondicionFisica] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Perfil incompleto (documento/teléfono/fecha de nacimiento bloqueados sin dato)
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);

  // Invitado opcional
  const [mostrarInvitado, setMostrarInvitado] = useState(false);
  const [invTipoDocumento, setInvTipoDocumento] = useState('CC');
  const [invDocumento, setInvDocumento] = useState('');
  const [errorInvDocumento, setErrorInvDocumento] = useState('');
  const [invNombre, setInvNombre] = useState('');
  const [errorInvNombre, setErrorInvNombre] = useState('');
  const [invApellido, setInvApellido] = useState('');
  const [errorInvApellido, setErrorInvApellido] = useState('');
  const [invRh, setInvRh] = useState('O+');
  const [invTelefono, setInvTelefono] = useState('');
  const [errorInvTelefono, setErrorInvTelefono] = useState('');
  const [errorInvFechaNac, setErrorInvFechaNac] = useState('');
  const [errorInvTalla, setErrorInvTalla] = useState('');
  const [errorInvCorreo, setErrorInvCorreo] = useState('');
  const [errorInvDorsal, setErrorInvDorsal] = useState('');
  const [errorCategoria, setErrorCategoria] = useState('');
  const [errorKit, setErrorKit] = useState('');
  const [errorTalla, setErrorTalla] = useState('');
  const [invFechaNacimiento, setInvFechaNacimiento] = useState('');
  const [invCorreo, setInvCorreo] = useState('');
  const [invDeseaKit, setInvDeseaKit] = useState(false);
  const [invTallaKit, setInvTallaKit] = useState('');
  const [invDorsal, setInvDorsal] = useState('');

  const [enviando, setEnviando] = useState(false);
  // Si la inscripción se creó pero la subida del comprobante falló, aquí queda el id del pago
  // para reintentar SOLO la subida (volver a inscribirse daría 409: ya inscrito).
  const [pagoPendienteComprobante, setPagoPendienteComprobante] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string; id: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    apiFetch(`/eventos/${id}`)
      .then((data) => { if (!cancelado) setEvento(data.evento ?? null); })
      .catch(() => { if (!cancelado) setErrorCarga('No se pudo cargar la información del evento.'); })
      .finally(() => { if (!cancelado) setCargando(false); });

    apiFetch(`/eventos/${id}/categorias`)
      .then((data) => { if (!cancelado) setCategorias(data.categorias ?? []); })
      .catch(() => {});

    apiFetch('/mis-inscripciones')
      .then((data) => {
        if (cancelado) return;
        const activa = (data.inscripciones ?? []).some(
          (insc: any) =>
            insc.evento?.id === Number(id) &&
            ['pendiente', 'confirmada'].includes(insc.estado)
        );
        if (activa) {
          setYaInscrito(true);
          mostrarMsg('error', 'Ya estás inscrito en este evento. Te llevamos a tu panel de participante…');
          setTimeout(() => { if (!cancelado) nav('/deportivo/perfil'); }, 2500);
        }
      })
      .catch(() => {});

    return () => { cancelado = true; };
  }, [id]);

  // Restaurar borrador guardado (si existe) al entrar a la página
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + id);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.rh) setRh(draft.rh);
      if (draft.contactoEmergenciaNombre) setContactoEmergenciaNombre(soloLetras(String(draft.contactoEmergenciaNombre), 100));
      if (draft.contactoEmergenciaTelefono) setContactoEmergenciaTelefono(soloNumeros(String(draft.contactoEmergenciaTelefono)));
      if (draft.parentesco) setParentesco(draft.parentesco);
      if (draft.categoriaId) setCategoriaId(draft.categoriaId);
      if (draft.deseaJersey !== undefined && draft.deseaJersey !== null) setDeseaJersey(draft.deseaJersey);
      if (draft.dorsalPreferido) setDorsalPreferido(limpiarDorsal(String(draft.dorsalPreferido)));
      if (draft.tallaKit) setTallaKit(draft.tallaKit);
      if (draft.condicionesMedicas) setCondicionesMedicas(limpiarTextoLibre(String(draft.condicionesMedicas)));
      if (draft.mostrarInvitado) setMostrarInvitado(draft.mostrarInvitado);
      if (draft.invTipoDocumento && TIPOS_DOCUMENTO[draft.invTipoDocumento]) setInvTipoDocumento(draft.invTipoDocumento);
      if (draft.invDocumento) setInvDocumento(soloNumeros(String(draft.invDocumento), 12));
      if (draft.invNombre) setInvNombre(soloLetras(String(draft.invNombre)));
      if (draft.invApellido) setInvApellido(soloLetras(String(draft.invApellido)));
      if (draft.invRh) setInvRh(draft.invRh);
      if (draft.invTelefono) setInvTelefono(soloNumeros(String(draft.invTelefono)));
      if (draft.invFechaNacimiento) setInvFechaNacimiento(draft.invFechaNacimiento);
      if (draft.invCorreo) setInvCorreo(limpiarCorreo(String(draft.invCorreo)));
      if (draft.invDeseaKit) setInvDeseaKit(draft.invDeseaKit);
      if (draft.invTallaKit) setInvTallaKit(draft.invTallaKit);
      if (draft.invDorsal) setInvDorsal(limpiarDorsal(String(draft.invDorsal)));
      if (draft.metodoPago) setMetodoPago(draft.metodoPago);

      // El archivo del comprobante nunca se puede restaurar tras recargar
      // (restricción de seguridad del navegador), así que avisamos y, si ya
      // estaba en el paso de revisión, lo regresamos al de pago para que lo
      // vuelva a adjuntar en vez de dejarlo atascado sin poder confirmar.
      const necesitaComprobante = draft.metodoPago && draft.metodoPago !== 'efectivo';
      if (draft.step === 3 && necesitaComprobante) {
        setStep(2);
        mostrarMsg('error', 'Por seguridad, los archivos no se guardan al recargar la página. Vuelve a adjuntar tu comprobante de pago para continuar.');
      } else if (draft.step === 2 || draft.step === 3) {
        setStep(draft.step);
        if (draft.step === 2 && necesitaComprobante) {
          mostrarMsg('error', 'Por seguridad, los archivos no se guardan al recargar la página. Vuelve a adjuntar tu comprobante de pago.');
        }
      }
    } catch {}
  }, [id]);

  // Guardar el borrador cada vez que cambian los datos editables del paso 1 o 2
  useEffect(() => {
    if (!id) return;
    const draft = {
      step,
      rh,
      contactoEmergenciaNombre,
      contactoEmergenciaTelefono,
      parentesco,
      categoriaId,
      deseaJersey,
      dorsalPreferido,
      tallaKit,
      condicionesMedicas,
      mostrarInvitado,
      invTipoDocumento,
      invDocumento,
      invNombre,
      invApellido,
      invRh,
      invTelefono,
      invFechaNacimiento,
      invCorreo,
      invDeseaKit,
      invTallaKit,
      invDorsal,
      metodoPago,
    };
    try {
      localStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(draft));
    } catch {}
  }, [
    id, step, rh, contactoEmergenciaNombre, contactoEmergenciaTelefono, parentesco,
    categoriaId, deseaJersey, dorsalPreferido, tallaKit, condicionesMedicas,
    mostrarInvitado, invTipoDocumento, invDocumento, invNombre, invApellido,
    invRh, invTelefono, invFechaNacimiento, invCorreo, invDeseaKit, invTallaKit, invDorsal, metodoPago,
  ]);

  useEffect(() => {
    if (!user) return;
    setDocumento(user.documento || '');
    setTelefonoContacto(user.telefono || '');
    if (user.fecha_nacimiento) {
      setFechaNacimiento(user.fecha_nacimiento.slice(0, 10)); // YYYY-MM-DD
    }

    const faltaDato = !user.documento || !user.telefono || !user.fecha_nacimiento;
    setPerfilIncompleto(faltaDato);
    if (faltaDato) {
      mostrarMsg('error', 'Tu perfil tiene datos incompletos (documento, teléfono o fecha de nacimiento). Complétalos en Ajustes de tu perfil antes de continuar con la inscripción.');
    }
  }, [user]);

  // Miniatura del comprobante elegido (se libera al cambiarlo).
  useEffect(() => {
    if (!comprobante) { setVistaComprobante(null); return; }
    const url = URL.createObjectURL(comprobante);
    setVistaComprobante(url);
    return () => URL.revokeObjectURL(url);
  }, [comprobante]);

  // Al cambiar de paso se sube al inicio para empezar a leer desde arriba.
  useEffect(() => {
    document.getElementById('insc-arriba')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, done]);

  function mostrarMsg(tipo: 'ok' | 'error', texto: string) {
    setMsg({ tipo, texto, id: Date.now() });
  }

  /**
   * Revisa el comprobante antes de aceptarlo (ver utils/comprobantePago.ts):
   *  1. Que tenga el código QR del comprobante (obligatorio).
   *  2. Que el texto sea de un comprobante y el pago sea a la cuenta de SKYED.
   *  3. Que no se haya usado antes en otra inscripción.
   *  4. Si el valor no coincide con el total, se acepta pero se avisa.
   * Lo que se lee se guarda con el pago para que el admin lo vea al validar.
   */
  async function manejarComprobante(file: File | null) {
    setAvisoComprobante(null);
    if (!file) { setComprobante(null); setVerificacion(null); return; }

    const rechazar = (titulo: string, detalle: string, mostrarCuenta = false) => {
      setValidandoComprobante(false);
      setComprobante(null);
      setVerificacion(null);
      setAvisoComprobante({ tipo: 'error', titulo, detalle, mostrarCuenta });
    };

    // El admin verá esta imagen para confirmar el pago: solo se aceptan imágenes.
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      rechazar('Formato no permitido', 'El comprobante debe ser una imagen JPG, PNG o WEBP (no PDF). Toma una captura de pantalla del comprobante y súbela.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      rechazar('La imagen es demasiado pesada', 'Usa una imagen de menos de 15 MB. Una captura de pantalla normal sirve.');
      return;
    }

    setValidandoComprobante(true);
    setProgresoValidacion(null);

    try {
      // 1. Código QR.
      const qr = await detectarQR(file).catch(() => ({ hay: true, texto: null })); // error técnico: no se bloquea
      if (import.meta.env?.DEV) console.log('[comprobante] QR:', qr);
      if (!qr.hay) {
        rechazar(
          'No encontramos el código QR del comprobante',
          'Sube la captura completa del comprobante, donde se vea el código QR. No recortes la imagen ni le tomes una foto a la pantalla con otro celular.',
        );
        return;
      }

      // 2. Texto: que sea un comprobante y que el pago sea a SKYED.
      const texto = await leerTexto(file, setProgresoValidacion);
      const analisis = analizarTexto(texto, total, referenciaPago);
      if (import.meta.env?.DEV) console.log('[comprobante] texto:', texto, '\n[comprobante] análisis:', analisis);

      if (!analisis.pareceComprobante) {
        rechazar(
          'Esta imagen no parece un comprobante de pago',
          'No encontramos datos como el valor, el banco, la fecha o la referencia. Sube la captura completa de la transacción.',
        );
        return;
      }
      if (analisis.destino === false) {
        rechazar(
          'El pago no es a la cuenta de SKYED',
          'En el comprobante no aparece ninguna de nuestras cuentas. Revisa que hayas transferido a estos datos y vuelve a subir el comprobante:',
          true,
        );
        return;
      }

      // 3. Que no se haya usado antes.
      const huella = await huellaArchivo(file);
      try {
        await apiFetch('/pagos/comprobante/verificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: huella, referencia_transaccion: analisis.referenciaTransaccion }),
        });
      } catch (err: any) {
        // 409 = ya usado. Otros errores (sin conexión...) no bloquean: el servidor lo revisa otra vez al subirlo.
        if (err?.status === 409 || /ya fue usado/i.test(err?.message ?? '')) {
          rechazar(
            'Este comprobante ya fue usado',
            'Ya se usó en otra inscripción. Sube el comprobante del pago de esta inscripción; si crees que es un error, escríbenos.',
          );
          return;
        }
      }

      setComprobante(file);
      setErrorComprobante(false);
      setVerificacion({
        hash: huella,
        referenciaTransaccion: analisis.referenciaTransaccion,
        datos: {
          qr: true,
          qr_legible: qr.texto !== null,
          destino: analisis.destino,
          monto: analisis.monto,
          monto_leido: analisis.montoLeido,
          monto_esperado: total,
          incluye_referencia: analisis.incluyeReferencia,
        },
      });

      // 4. Valor distinto al total: se acepta, pero se avisa.
      if (analisis.monto === false) {
        const leido = analisis.montoLeido !== null ? `$${analisis.montoLeido.toLocaleString('es-CO')}` : 'otro valor';
        setAvisoComprobante({
          tipo: 'aviso',
          titulo: 'El valor no coincide con el total',
          detalle: `En el comprobante leímos ${leido}, pero el total de tu inscripción es $${total.toLocaleString('es-CO')}. Puedes continuar, pero si el valor pagado no es el correcto, el admin podría rechazar el pago.`,
        });
      }
    } finally {
      setValidandoComprobante(false);
      setProgresoValidacion(null);
    }
  }

  // Cuando aparece un problema con el comprobante, se lleva a la vista.
  useEffect(() => {
    if (avisoComprobante) document.getElementById('aviso-comprobante')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [avisoComprobante]);

  // Duración de la alerta según lo largo del texto (los errores se leen con calma).
  const duracionMsg = msg ? Math.min(10000, Math.max(msg.tipo === 'error' ? 6000 : 4000, msg.texto.length * 55)) : 0;
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), duracionMsg);
    return () => clearTimeout(timer);
  }, [msg, duracionMsg]);

  const precioEvento = evento?.precio || 0;
  const precioKitUnitario = evento?.kit ? Number(evento.kit.precio || 0) : 0;
  const precioKit = deseaJersey ? precioKitUnitario : 0;
  const precioInvitado = mostrarInvitado ? precioEvento : 0;
  const precioKitInvitado = mostrarInvitado && invDeseaKit ? precioKitUnitario : 0;
  const total = precioEvento + precioKit + precioInvitado + precioKitInvitado;

  // Tallas del kit con su inventario. Si el kit es antiguo y no tiene tallas
  // configuradas, se usa la lista fija de siempre sin control de cantidad.
  const tallasKit = evento?.kit?.tallas ?? [];
  const kitConTallas = tallasKit.length > 0;
  const opcionesTalla = kitConTallas ? tallasKit.map(t => t.talla) : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  // Unidades que quedan de una talla para esta persona, descontando la que ya eligió la otra
  // (titular e invitado pueden pedir la misma talla, pero solo si alcanza para los dos).
  const quedan = (t: string, quien: 'titular' | 'invitado') => {
    const hay = tallasKit.find(x => x.talla === t)?.cantidad ?? 0;
    const otra = quien === 'titular'
      ? (mostrarInvitado && invDeseaKit && invTallaKit === t ? 1 : 0)
      : (deseaJersey === true && tallaKit === t ? 1 : 0);
    return hay - otra;
  };
  // Única por inscripción (evento + participante), p. ej. SKYED-0002-15.
  const referenciaPago = evento ? referenciaDePago(evento.id, user?.id) : '';

  const errorDorsalInvitado = (v: string) =>
    v && dorsalPreferido && v === dorsalPreferido ? 'Ese dorsal ya lo pediste para ti: elige otro.' : '';

  function irAPago(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;

    // Campos que faltan o están mal: se marcan en rojo, cada uno con su mensaje.
    const faltantes: Array<{ id: string; etiqueta: string }> = [];
    const falta = (id: string, etiqueta: string) => { faltantes.push({ id, etiqueta }); };
    const revisar = (error: string, set: (e: string) => void, id: string, etiqueta: string) => {
      set(error);
      if (error) falta(id, etiqueta);
    };

    if (!documento) { setErrorDocumento('Falta en tu perfil.'); falta('documento', 'Documento'); }
    if (!rh) { setErrorRh('Selecciona tu tipo de sangre.'); falta('rh', 'Tipo de sangre'); }
    if (!telefonoContacto) { setErrorTelefonoContacto('Falta en tu perfil.'); falta('tel-contacto', 'Teléfono de contacto'); }
    if (!fechaNacimiento) { setErrorFechaNacimiento('Falta en tu perfil.'); falta('fecha-nac', 'Fecha de nacimiento'); }

    revisar(errorNombreCompleto(contactoEmergenciaNombre), setErrorNombreContacto, 'c-nombre', 'Nombre del contacto de emergencia');
    {
      let err = errorCelular(contactoEmergenciaTelefono);
      if (!err && contactoEmergenciaTelefono === telefonoContacto) err = 'Es tu propio número: pon el de otra persona.';
      revisar(err, setErrorTelefonoEmergencia, 'c-telefono', 'Teléfono del contacto de emergencia');
    }
    if (!parentesco) { setErrorParentesco('Selecciona el parentesco.'); falta('c-parentesco', 'Parentesco'); }
    if (!categoriaId && categorias.length > 0) { setErrorCategoria('Selecciona una categoría de competencia.'); falta('grupo-categoria', 'Categoría de competencia'); }
    if (evento?.kit && deseaJersey === null) { setErrorKit('Indica si deseas adquirir el kit.'); falta('grupo-kit', 'Kit'); }
    if (evento?.kit && deseaJersey === true && !tallaKit) { setErrorTalla('Selecciona la talla del kit.'); falta('grupo-talla', 'Talla del kit'); }

    if (mostrarInvitado) {
      revisar(errorDocumentoInvitado(invTipoDocumento, invDocumento, documento), setErrorInvDocumento, 'i-documento', 'Documento del invitado');
      revisar(errorNombre(invNombre), setErrorInvNombre, 'i-nombre', 'Nombre del invitado');
      revisar(errorNombre(invApellido), setErrorInvApellido, 'i-apellido', 'Apellido del invitado');
      revisar(errorCelular(invTelefono), setErrorInvTelefono, 'i-telefono', 'Teléfono del invitado');
      revisar(errorNacimientoInvitado(invFechaNacimiento), setErrorInvFechaNac, 'i-fecha-nac', 'Fecha de nacimiento del invitado');
      revisar(errorCorreo(invCorreo), setErrorInvCorreo, 'i-correo', 'Correo del invitado');
      if (evento?.kit && invDeseaKit) {
        if (!invTallaKit) { setErrorInvTalla('Selecciona la talla del kit del invitado.'); falta('grupo-inv-talla', 'Talla del kit del invitado'); }
        revisar(errorDorsalInvitado(invDorsal), setErrorInvDorsal, 'inv-dorsal', 'Dorsal del invitado');
      }
    }

    if (faltantes.length) {
      const nombres = faltantes.map(f => f.etiqueta);
      const lista = nombres.length <= 4 ? nombres.join(', ') : `${nombres.slice(0, 4).join(', ')} y ${nombres.length - 4} más`;
      mostrarMsg('error', `Revisa estos datos: ${lista}. Están marcados en rojo.`);
      // Lleva la vista al primer campo con error (sin enfocar los bloqueados del perfil).
      const el = document.getElementById(faltantes[0].id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!el.hasAttribute('readonly')) el.focus({ preventScroll: true });
      }
      return;
    }

    setStep(2);
  }

  function irARevision(e: FormEvent) {
    e.preventDefault();
    if (metodoPago !== 'efectivo' && !comprobante) {
      setErrorComprobante(true);
      mostrarMsg('error', 'Falta el campo: Comprobante de pago.');
      document.getElementById('zona-comprobante')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setStep(3);
  }

  // Sube la imagen del comprobante para que el administrador pueda verla y confirmar el pago.
  async function subirComprobante(pagoId: number) {
    if (!comprobante) return;
    // Se reduce en el navegador para no chocar con el límite de subida de PHP.
    const imagen = await prepararImagen(comprobante).catch(() => comprobante);
    const body = new FormData();
    body.append('comprobante', imagen);
    // Lo que se revisó en el navegador (el servidor vuelve a revisar si está repetido).
    if (verificacion?.hash) body.append('hash_original', verificacion.hash);
    if (verificacion?.referenciaTransaccion) body.append('referencia_transaccion', verificacion.referenciaTransaccion);
    if (verificacion) body.append('verificacion', JSON.stringify(verificacion.datos));
    await apiFetch(`/pagos/${pagoId}/comprobante`, { method: 'POST', body });
  }

  async function confirmarInscripcion() {
    if (!evento) return;

    // Reintento: la inscripción ya existe, solo falta subir la imagen del comprobante.
    if (pagoPendienteComprobante !== null) {
      if (!comprobante) {
        setErrorComprobante(true);
        mostrarMsg('error', 'Falta el campo: Comprobante de pago.');
        return;
      }
      setEnviando(true);
      try {
        await subirComprobante(pagoPendienteComprobante);
        setPagoPendienteComprobante(null);
        if (id) {
          try { localStorage.removeItem(DRAFT_KEY_PREFIX + id); } catch {}
        }
        setStep(3);
        setDone(true);
      } catch (err: any) {
        mostrarMsg('error', `No se pudo subir el comprobante: ${err?.message || 'intenta de nuevo'}. Tu inscripción ya quedó registrada; pulsa de nuevo para reintentar.`);
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (evento.estado !== 'activo') {
      mostrarMsg('error', 'Este evento no está activo actualmente.');
      return;
    }
    if (evento.cupos_disponibles <= 0) {
      mostrarMsg('error', 'No hay cupos disponibles para este evento.');
      return;
    }
    if (metodoPago !== 'efectivo' && !comprobante) {
      setErrorComprobante(true);
      mostrarMsg('error', 'Falta el campo: Comprobante de pago.');
      return;
    }
    if (!aceptaTerminos || !aceptaCondicionFisica) {
      setErrorTerminos(!aceptaTerminos);
      setErrorCondicionFisica(!aceptaCondicionFisica);
      const faltantes = [
        !aceptaTerminos ? 'Términos y condiciones' : '',
        !aceptaCondicionFisica ? 'Declaración de estado de salud' : '',
      ].filter(Boolean);
      mostrarMsg('error', `Faltan campos: ${faltantes.join(', ')}.`);
      return;
    }

    const payload: Record<string, unknown> = {
      cupo_i: 1,
      precio_pagado_i: total,
      documento,
      rh_u: rh,
      telefono_contacto: telefonoContacto,
      contacto_emergencia_nombre: contactoEmergenciaNombre.trim(),
      contacto_emergencia_telefono: contactoEmergenciaTelefono,
      contacto_emergencia_parentesco: parentesco,
      fecha_nacimiento: fechaNacimiento,
      id_categoria: categoriaId,
      desea_jersey: evento?.kit ? deseaJersey === true : false,
      numero_dorsal_preferido: evento?.kit && deseaJersey ? (dorsalPreferido || null) : null,
      talla_kit: deseaJersey ? (tallaKit || null) : null,
      condiciones_medicas: condicionesMedicas.trim() || null,
      metodo_pago_p: metodoPago,
      referencia_p: referenciaPago,
      // La imagen se sube aparte (POST /pagos/{id}/comprobante) cuando la inscripción ya existe.
      comprobante_p: null,
    };

    if (mostrarInvitado) {
      payload.invitado = {
        tipo_documento: invTipoDocumento,
        documento_inv: invDocumento,
        nombre_inv: invNombre.trim(),
        apellido_inv: invApellido.trim(),
        rh_inv: invRh,
        telefono_inv: invTelefono,
        fecha_nacimiento_inv: invFechaNacimiento,
        correo_inv: invCorreo || null,
        desea_kit: evento?.kit ? invDeseaKit : false,
        talla_kit: evento?.kit && invDeseaKit ? (invTallaKit || null) : null,
        numero_dorsal_inv: evento?.kit && invDeseaKit ? (invDorsal || null) : null,
      };
    }

    setEnviando(true);

    // Fase 1: crear la inscripción (y su pago).
    let pagoId: number | null = null;
    try {
      const res = await apiFetch(`/eventos/${evento.id}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      pagoId = res?.inscripcion?.pago?.id ?? null;
    } catch (err: any) {
      mostrarMsg('error', err?.message || 'No se pudo completar la inscripción. Verifica los datos.');
      setEnviando(false);
      return;
    }

    // Fase 2: subir la imagen del comprobante para que el admin la vea.
    if (metodoPago !== 'efectivo' && comprobante) {
      try {
        if (pagoId === null) throw new Error('el servidor no devolvió el pago');
        await subirComprobante(pagoId);
      } catch (err: any) {
        // La inscripción ya existe: se guarda el pago para reintentar solo la subida.
        if (pagoId !== null) setPagoPendienteComprobante(pagoId);
        mostrarMsg('error', `Tu inscripción quedó registrada, pero no se pudo subir el comprobante: ${err?.message || 'intenta de nuevo'}. Pulsa de nuevo para reintentar.`);
        setEnviando(false);
        return;
      }
    }

    if (id) {
      try { localStorage.removeItem(DRAFT_KEY_PREFIX + id); } catch {}
    }
    setStep(3);
    setDone(true);
    setEnviando(false);
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  if (cargando) {
    return (
      <div className="insc insc-estado">
        <div className="insc-cargando" role="status">
          <i className="ti ti-bike" aria-hidden="true" />
          <span>Preparando tu inscripción…</span>
        </div>
      </div>
    );
  }

  if (errorCarga || !evento) {
    return (
      <div className="insc insc-estado">
        <div className="insc-cargando">
          <i className="ti ti-mood-sad" aria-hidden="true" />
          <span>{errorCarga || 'Evento no encontrado.'}</span>
          <Link className="insc-btn insc-btn-secundario" to="/deportivo/eventos" title="Ver todos los eventos">Ver eventos</Link>
        </div>
      </div>
    );
  }

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const dias = diasParaEvento(evento.fecha);
  const categoriaElegida = categorias.find((c) => c.id === categoriaId);
  const nombreMetodo = METODOS.find((m) => m.valor === metodoPago)?.titulo ?? metodoPago;
  const pasos = [
    { n: 1 as const, titulo: 'Tus datos', icono: 'ti-user' },
    { n: 2 as const, titulo: 'Pago', icono: 'ti-credit-card' },
    { n: 3 as const, titulo: 'Confirmar', icono: 'ti-flag' },
  ];
  const avance = done ? 100 : ((step - 1) / 2) * 100;
  let numeroSeccion = 0;
  const siguiente = () => ++numeroSeccion;

  return (
    <div className="insc" id="insc-arriba">
      {/* ===== Encabezado del evento ===== */}
      <header className="insc-hero" style={evento.imagen_url ? ({ '--hero-img': `url("${evento.imagen_url}")` } as React.CSSProperties) : undefined}>
        <div className="insc-hero-rayas" aria-hidden="true" />
        <div className="insc-hero-contenido">
          <div className="insc-migas" role="navigation" aria-label="Ruta de navegación">
            <Link title="Ir al inicio" to="/deportivo">Inicio</Link>
            <i className="ti ti-chevron-right" aria-hidden="true" />
            <Link title="Ver todos los eventos" to="/deportivo/eventos">Eventos</Link>
            <i className="ti ti-chevron-right" aria-hidden="true" />
            <span>Inscripción</span>
          </div>

          <div className="insc-hero-chips">
            <span className="insc-chip"><i className="ti ti-bike" aria-hidden="true" /> {evento.categoria}</span>
            {dias !== null && dias >= 0 && (
              <span className="insc-chip insc-chip-alt">
                <i className="ti ti-hourglass-high" aria-hidden="true" /> {dias === 0 ? '¡Es hoy!' : dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`}
              </span>
            )}
          </div>

          <h1 className="insc-hero-titulo">{evento.nombre}</h1>

          <ul className="insc-hero-meta">
            <li><i className="ti ti-calendar-event" aria-hidden="true" /> {fmtFechaCorta(evento.fecha)}</li>
            <li><i className="ti ti-clock" aria-hidden="true" /> {fmtHora(evento.hora)}</li>
            <li><i className="ti ti-map-pin" aria-hidden="true" /> {evento.ubicacion}</li>
            {evento.distancia && <li><i className="ti ti-route" aria-hidden="true" /> {evento.distancia}</li>}
            {evento.desnivel && <li><i className="ti ti-mountain" aria-hidden="true" /> {evento.desnivel}</li>}
          </ul>
        </div>
      </header>

      {/* ===== Progreso: la "pista" con la bici avanzando ===== */}
      <div className="insc-pista" style={{ '--avance': `${avance}%` } as React.CSSProperties}>
        <div className="insc-pista-linea" aria-hidden="true">
          <div className="insc-pista-relleno" />
          <i className="ti ti-bike insc-pista-bici" />
        </div>
        <ol className="insc-pista-pasos">
          {pasos.map((p) => {
            const hecho = done || step > p.n;
            const actual = !done && step === p.n;
            const puedeVolver = !done && step > p.n && !enviando;
            return (
              <li key={p.n} className={`${hecho ? 'hecho' : ''}${actual ? ' actual' : ''}`}>
                <button
                  type="button"
                  disabled={!puedeVolver}
                  title={puedeVolver ? `Volver a: ${p.titulo}` : p.titulo}
                  aria-current={actual ? 'step' : undefined}
                  onClick={() => puedeVolver && setStep(p.n)}
                >
                  <span className="insc-pista-num">{hecho ? <i className="ti ti-check" aria-hidden="true" /> : p.n}</span>
                  <span className="insc-pista-titulo">{p.titulo}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="insc-grid">
        {/* ===================== Columna principal ===================== */}
        <div className="insc-principal">
          {/* ---------------- PASO 1: datos ---------------- */}
          {step === 1 && (
            <form onSubmit={irAPago} noValidate className="insc-form">
              {perfilIncompleto && (
                <div className="insc-banner error" role="alert">
                  <i className="ti ti-user-exclamation" aria-hidden="true" />
                  <div>
                    <strong>Completa tu perfil para inscribirte</strong>
                    <p>Te falta el documento, el teléfono o la fecha de nacimiento. Solo toma un minuto.</p>
                  </div>
                  <Link className="insc-btn insc-btn-primario" to="/deportivo/perfil" title="Ir a completar mi perfil">Completar perfil</Link>
                </div>
              )}

              <Seccion numero={siguiente()} icono="ti-id-badge-2" titulo="Tu perfil de corredor" subtitulo="Estos datos vienen de tu cuenta. Solo elige tu tipo de sangre.">
                <div className="insc-perfil">
                  <div className="insc-perfil-avatar" aria-hidden="true">{initials}</div>
                  <div className="insc-perfil-texto">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <button title="Iniciar sesión con otra cuenta" type="button" className="insc-enlace" onClick={() => nav('/login')}>
                    ¿No eres tú?
                  </button>
                </div>

                <div className="insc-fichas">
                  {[
                    { id: 'documento', icono: 'ti-id', etiqueta: 'Documento', valor: documento, error: errorDocumento },
                    { id: 'tel-contacto', icono: 'ti-phone', etiqueta: 'Teléfono', valor: telefonoContacto, error: errorTelefonoContacto },
                    { id: 'fecha-nac', icono: 'ti-cake', etiqueta: 'Nacimiento', valor: fmtFecha(fechaNacimiento), error: errorFechaNacimiento },
                  ].map((f) => (
                    <div key={f.id} id={f.id} tabIndex={-1} className={`insc-ficha${f.error ? ' con-error' : ''}`}>
                      <i className={`ti ${f.icono}`} aria-hidden="true" />
                      <div>
                        <span>{f.etiqueta}</span>
                        <strong>{f.valor || 'Sin registrar'}</strong>
                      </div>
                      <i className="ti ti-lock insc-ficha-candado" aria-hidden="true" title="Se cambia desde tu perfil" />
                    </div>
                  ))}
                </div>
                <p className="insc-ayuda">
                  <i className="ti ti-info-circle" aria-hidden="true" /> ¿Algún dato está mal? Cámbialo en <Link to="/deportivo/perfil" title="Ir a mi perfil">tu perfil</Link>.
                </p>

                <div className="insc-campo ancho">
                  <span className="insc-etiqueta" id="rh-etiqueta">Tipo de sangre (RH) *</span>
                  <Pastillas
                    id="rh"
                    etiqueta="Tipo de sangre"
                    opciones={RH_OPCIONES.map((o) => ({ valor: o, etiqueta: o, icono: 'ti-droplet' }))}
                    valor={rh}
                    columnas={8}
                    error={errorRh}
                    onCambio={(v) => { setRh(v); setErrorRh(''); }}
                  />
                  {errorRh && <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorRh}</p>}
                </div>
              </Seccion>

              <Seccion numero={siguiente()} icono="ti-phone-call" titulo="Contacto de emergencia" subtitulo="A quién llamamos si algo pasa en la carrera. Debe ser otra persona.">
                <div className="insc-campos">
                  <Campo id="c-nombre" etiqueta="Nombre completo *" icono="ti-user" error={errorNombreContacto} ok={!errorNombreCompleto(contactoEmergenciaNombre)}>
                    <input
                      id="c-nombre"
                      className="insc-input"
                      placeholder="Ej: María Gómez"
                      autoComplete="off"
                      maxLength={100}
                      aria-invalid={!!errorNombreContacto}
                      aria-describedby={errorNombreContacto ? 'c-nombre-error' : undefined}
                      value={contactoEmergenciaNombre}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const limpio = soloLetras(raw, 100);
                        setContactoEmergenciaNombre(limpio);
                        setErrorNombreContacto(quitoCaracteres(raw, limpio) ? SOLO_LETRAS : errorNombreContacto && errorNombreContacto !== SOLO_LETRAS ? errorNombreCompleto(limpio) : '');
                      }}
                      {...detectarEspeciales(() => setErrorNombreContacto(SOLO_LETRAS))}
                      onBlur={() => contactoEmergenciaNombre && setErrorNombreContacto(errorNombreCompleto(contactoEmergenciaNombre))}
                    />
                  </Campo>
                  <Campo id="c-telefono" etiqueta="Celular *" icono="ti-device-mobile" error={errorTelefonoEmergencia}
                    ok={!errorCelular(contactoEmergenciaTelefono) && contactoEmergenciaTelefono !== telefonoContacto}
                    ayuda={`${contactoEmergenciaTelefono.length}/10 dígitos`}>
                    <input
                      id="c-telefono"
                      type="tel"
                      inputMode="numeric"
                      className="insc-input"
                      placeholder="3001234567"
                      maxLength={10}
                      aria-invalid={!!errorTelefonoEmergencia}
                      aria-describedby={errorTelefonoEmergencia ? 'c-telefono-error' : undefined}
                      value={contactoEmergenciaTelefono}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const limpio = soloNumeros(raw);
                        setContactoEmergenciaTelefono(limpio);
                        setErrorTelefonoEmergencia(/[^\d\s]/.test(raw) ? SOLO_NUMEROS : errorTelefonoEmergencia && errorTelefonoEmergencia !== SOLO_NUMEROS ? errorCelular(limpio) : '');
                      }}
                      {...detectarEspeciales(() => setErrorTelefonoEmergencia(SOLO_NUMEROS))}
                      onBlur={() => {
                        if (!contactoEmergenciaTelefono) return;
                        const err = errorCelular(contactoEmergenciaTelefono)
                          || (contactoEmergenciaTelefono === telefonoContacto ? 'Es tu propio número: pon el de otra persona.' : '');
                        setErrorTelefonoEmergencia(err);
                      }}
                    />
                  </Campo>
                  <div className="insc-campo ancho">
                    <span className="insc-etiqueta">Parentesco *</span>
                    <Pastillas
                      id="c-parentesco"
                      etiqueta="Parentesco"
                      opciones={PARENTESCOS}
                      valor={parentesco}
                      columnas={3}
                      error={errorParentesco}
                      onCambio={(v) => { setParentesco(v); setErrorParentesco(''); }}
                    />
                    {errorParentesco && <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorParentesco}</p>}
                  </div>
                </div>
              </Seccion>

              <Seccion numero={siguiente()} icono="ti-trophy" titulo="Categoría de competencia" subtitulo="Elige en la que vas a correr.">
                <div id="grupo-categoria" tabIndex={-1} role="radiogroup" aria-label="Categoría de competencia" className={`insc-categorias${errorCategoria ? ' con-error' : ''}`}>
                  {categorias.length === 0 && <p className="insc-ayuda">Este evento no tiene categorías configuradas.</p>}
                  {categorias.map((cat, i) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={categoriaId === cat.id}
                      title={`Correr en la categoría ${cat.nombre}`}
                      className="insc-categoria"
                      style={{ '--i': i } as React.CSSProperties}
                      onClick={() => { setCategoriaId(cat.id); setErrorCategoria(''); }}
                    >
                      <span className="insc-categoria-icono"><i className="ti ti-medal" aria-hidden="true" /></span>
                      <span className="insc-categoria-texto">
                        <strong>{cat.nombre}</strong>
                        {cat.descripcion && <small>{cat.descripcion}</small>}
                      </span>
                      <i className="ti ti-circle-check-filled insc-categoria-check" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                {errorCategoria && <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorCategoria}</p>}
              </Seccion>

              {evento.kit && (
                <Seccion numero={siguiente()} icono="ti-shirt-sport" titulo="Kit del corredor" subtitulo="Jersey, pantaloneta y medias del evento.">
                  <div className="insc-kit">
                    {evento.kit.imagen_url && (
                      <img
                        className="insc-kit-foto"
                        src={evento.kit.imagen_url}
                        alt={evento.kit.nombre || 'Kit del evento'}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="insc-kit-info">
                      <strong>{evento.kit.nombre || 'Kit del evento'}</strong>
                      <span className="insc-kit-precio">{fmtMoney(evento.kit.precio)}</span>
                      <ul>
                        {evento.kit.contenido && <li><i className="ti ti-package" aria-hidden="true" /> {evento.kit.contenido}</li>}
                        {evento.kit.lugar_entrega && <li><i className="ti ti-map-pin" aria-hidden="true" /> Recógelo en {evento.kit.lugar_entrega}</li>}
                        {evento.kit.fecha_entrega && <li><i className="ti ti-calendar" aria-hidden="true" /> Entrega: {fmtFecha(evento.kit.fecha_entrega)}</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="insc-campo ancho">
                    <span className="insc-etiqueta">¿Quieres el kit? *</span>
                    <div id="grupo-kit" tabIndex={-1} className={errorKit ? 'insc-grupo-error' : undefined}>
                      <OpcionSiNo valor={deseaJersey} onSi={() => { setDeseaJersey(true); setErrorKit(''); }} onNo={() => { setDeseaJersey(false); setErrorKit(''); setErrorTalla(''); }} />
                    </div>
                    {errorKit
                      ? <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorKit}</p>
                      : <p className="insc-ayuda">Si lo pides, se suman {fmtMoney(evento.kit.precio)} al total.</p>}
                  </div>

                  {deseaJersey === true && (
                    <>
                      <div className="insc-campo ancho">
                        <span className="insc-etiqueta">Talla *</span>
                        <div id="grupo-talla" tabIndex={-1} role="radiogroup" aria-label="Talla del kit" className={`kit-rejilla${errorTalla ? ' insc-grupo-error' : ''}`}>
                          {opcionesTalla.map((t, idx) => (
                            <TallaOpcion
                              key={t}
                              indice={idx}
                              talla={t}
                              quedan={quedan(t, 'titular')}
                              controlado={kitConTallas}
                              activa={tallaKit === t}
                              onClick={() => { setTallaKit(t); setErrorTalla(''); }}
                            />
                          ))}
                        </div>
                        {errorTalla && <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorTalla}</p>}
                      </div>
                      <div className="insc-campos">
                        <Campo id="dorsal" etiqueta="Dorsal preferido (opcional)" icono="ti-hash" ok={!!dorsalPreferido}
                          ayuda="Del 1 al 99999. Si ya está tomado, te asignamos otro.">
                          <input
                            id="dorsal"
                            className="insc-input insc-input-dorsal"
                            placeholder="Ej: 42"
                            inputMode="numeric"
                            maxLength={5}
                            value={dorsalPreferido}
                            onChange={(e) => setDorsalPreferido(limpiarDorsal(e.target.value))}
                          />
                        </Campo>
                      </div>
                    </>
                  )}
                </Seccion>
              )}

              <Seccion numero={siguiente()} icono="ti-heartbeat" titulo="Salud" subtitulo="Opcional. Solo lo ve el equipo de primeros auxilios del evento.">
                <Campo
                  id="condiciones"
                  etiqueta="Condiciones médicas, alergias o medicamentos"
                  ancho
                  error={avisoCondiciones}
                  ayuda={<span className="insc-contador">{condicionesMedicas.length}/{MAX_MEDICO}</span>}
                >
                  <textarea
                    id="condiciones"
                    className="insc-input insc-textarea"
                    rows={3}
                    maxLength={MAX_MEDICO}
                    placeholder="Ej: Asma leve, alergia a la penicilina…"
                    value={condicionesMedicas}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const limpio = limpiarTextoLibre(raw);
                      setCondicionesMedicas(limpio);
                      if (limpio.length < raw.length && raw.length <= MAX_MEDICO) setAvisoCondiciones(SIN_SIMBOLOS);
                    }}
                    {...detectarEspeciales(() => setAvisoCondiciones(SIN_SIMBOLOS), () => setAvisoCondiciones(''))}
                  />
                </Campo>
              </Seccion>

              <Seccion numero={siguiente()} icono="ti-users-plus" titulo="¿Corres acompañado?" subtitulo="Inscribe a un invitado en la misma compra.">
                <button
                  type="button"
                  role="switch"
                  aria-checked={mostrarInvitado}
                  className={`insc-interruptor${mostrarInvitado ? ' activo' : ''}`}
                  title={mostrarInvitado ? 'Quitar el invitado' : 'Agregar un invitado'}
                  onClick={() => setMostrarInvitado((v) => !v)}
                >
                  <span className="insc-interruptor-pista" aria-hidden="true"><span /></span>
                  <span className="insc-interruptor-texto">
                    <strong>{mostrarInvitado ? 'Vas con un invitado' : 'Agregar invitado'}</strong>
                    <small>Su inscripción cuesta {fmtMoney(evento.precio)} y se suma al total.</small>
                  </span>
                </button>

                {mostrarInvitado && (
                  <div className="insc-invitado">
                    <div className="insc-campos">
                      <Campo id="i-tipo-doc" etiqueta="Tipo de documento *" icono="ti-id">
                        <select
                          id="i-tipo-doc"
                          className="insc-input"
                          value={invTipoDocumento}
                          onChange={(e) => {
                            setInvTipoDocumento(e.target.value);
                            if (invDocumento) setErrorInvDocumento(errorDocumentoInvitado(e.target.value, invDocumento, documento));
                          }}
                        >
                          {Object.entries(TIPOS_DOCUMENTO).map(([valor, t]) => <option key={valor} value={valor}>{t.etiqueta}</option>)}
                        </select>
                      </Campo>
                      <Campo id="i-documento" etiqueta="Número de documento *" icono="ti-numbers" error={errorInvDocumento}
                        ok={!errorDocumentoInvitado(invTipoDocumento, invDocumento, documento)}
                        ayuda={`${TIPOS_DOCUMENTO[invTipoDocumento]?.min}–${TIPOS_DOCUMENTO[invTipoDocumento]?.max} dígitos, sin puntos`}>
                        <input
                          id="i-documento"
                          className="insc-input"
                          inputMode="numeric"
                          maxLength={12}
                          placeholder="Solo números"
                          aria-invalid={!!errorInvDocumento}
                          value={invDocumento}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const limpio = soloNumeros(raw, 12);
                            setInvDocumento(limpio);
                            setErrorInvDocumento(/[^\d\s.]/.test(raw) ? SOLO_NUMEROS : errorInvDocumento && errorInvDocumento !== SOLO_NUMEROS ? errorDocumentoInvitado(invTipoDocumento, limpio, documento) : '');
                          }}
                          {...detectarEspeciales(() => setErrorInvDocumento(SOLO_NUMEROS))}
                          onBlur={() => invDocumento && setErrorInvDocumento(errorDocumentoInvitado(invTipoDocumento, invDocumento, documento))}
                        />
                      </Campo>
                      <Campo id="i-nombre" etiqueta="Nombre *" icono="ti-user" error={errorInvNombre} ok={!errorNombre(invNombre)}>
                        <input
                          id="i-nombre"
                          className="insc-input"
                          maxLength={50}
                          placeholder="Ej: Andrés"
                          aria-invalid={!!errorInvNombre}
                          value={invNombre}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const limpio = soloLetras(raw);
                            setInvNombre(limpio);
                            setErrorInvNombre(quitoCaracteres(raw, limpio) ? SOLO_LETRAS : errorInvNombre && errorInvNombre !== SOLO_LETRAS ? errorNombre(limpio) : '');
                          }}
                          {...detectarEspeciales(() => setErrorInvNombre(SOLO_LETRAS))}
                          onBlur={() => invNombre && setErrorInvNombre(errorNombre(invNombre))}
                        />
                      </Campo>
                      <Campo id="i-apellido" etiqueta="Apellido *" icono="ti-user" error={errorInvApellido} ok={!errorNombre(invApellido)}>
                        <input
                          id="i-apellido"
                          className="insc-input"
                          maxLength={50}
                          placeholder="Ej: Rojas"
                          aria-invalid={!!errorInvApellido}
                          value={invApellido}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const limpio = soloLetras(raw);
                            setInvApellido(limpio);
                            setErrorInvApellido(quitoCaracteres(raw, limpio) ? SOLO_LETRAS : errorInvApellido && errorInvApellido !== SOLO_LETRAS ? errorNombre(limpio) : '');
                          }}
                          {...detectarEspeciales(() => setErrorInvApellido(SOLO_LETRAS))}
                          onBlur={() => invApellido && setErrorInvApellido(errorNombre(invApellido))}
                        />
                      </Campo>
                      <Campo id="i-telefono" etiqueta="Celular *" icono="ti-device-mobile" error={errorInvTelefono} ok={!errorCelular(invTelefono)}
                        ayuda={`${invTelefono.length}/10 dígitos`}>
                        <input
                          id="i-telefono"
                          type="tel"
                          inputMode="numeric"
                          className="insc-input"
                          maxLength={10}
                          placeholder="3001234567"
                          aria-invalid={!!errorInvTelefono}
                          value={invTelefono}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const limpio = soloNumeros(raw);
                            setInvTelefono(limpio);
                            setErrorInvTelefono(/[^\d\s]/.test(raw) ? SOLO_NUMEROS : errorInvTelefono && errorInvTelefono !== SOLO_NUMEROS ? errorCelular(limpio) : '');
                          }}
                          {...detectarEspeciales(() => setErrorInvTelefono(SOLO_NUMEROS))}
                          onBlur={() => invTelefono && setErrorInvTelefono(errorCelular(invTelefono))}
                        />
                      </Campo>
                      <Campo id="i-fecha-nac" etiqueta="Fecha de nacimiento *" icono="ti-cake" error={errorInvFechaNac}
                        ok={!errorNacimientoInvitado(invFechaNacimiento)} ayuda={`Entre ${EDAD_MIN_INVITADO} y ${EDAD_MAX_INVITADO} años`}>
                        <input
                          id="i-fecha-nac"
                          type="date"
                          className="insc-input"
                          min={rangoNacimientoInvitado().min}
                          max={rangoNacimientoInvitado().max}
                          aria-invalid={!!errorInvFechaNac}
                          value={invFechaNacimiento}
                          onChange={(e) => { setInvFechaNacimiento(e.target.value); setErrorInvFechaNac(''); }}
                          onBlur={() => invFechaNacimiento && setErrorInvFechaNac(errorNacimientoInvitado(invFechaNacimiento))}
                        />
                      </Campo>
                      <Campo id="i-correo" etiqueta="Correo (opcional)" icono="ti-mail" error={errorInvCorreo} ok={!!invCorreo && !errorCorreo(invCorreo)}>
                        <input
                          id="i-correo"
                          type="email"
                          className="insc-input"
                          maxLength={80}
                          placeholder="nombre@correo.com"
                          aria-invalid={!!errorInvCorreo}
                          value={invCorreo}
                          onChange={(e) => {
                            const limpio = limpiarCorreo(e.target.value);
                            setInvCorreo(limpio);
                            if (errorInvCorreo) setErrorInvCorreo(errorCorreo(limpio));
                          }}
                          onBlur={() => setErrorInvCorreo(errorCorreo(invCorreo))}
                        />
                      </Campo>
                      <div className="insc-campo">
                        <span className="insc-etiqueta">RH del invitado *</span>
                        <Pastillas id="i-rh" etiqueta="RH del invitado" opciones={RH_OPCIONES.map((o) => ({ valor: o, etiqueta: o }))} valor={invRh} columnas={4} onCambio={setInvRh} />
                      </div>
                    </div>

                    {evento.kit && (
                      <div className="insc-campo ancho insc-invitado-kit">
                        <span className="insc-etiqueta">¿El invitado quiere el kit?</span>
                        <OpcionSiNo valor={invDeseaKit} onSi={() => setInvDeseaKit(true)} onNo={() => { setInvDeseaKit(false); setInvTallaKit(''); setInvDorsal(''); setErrorInvTalla(''); setErrorInvDorsal(''); }} />
                        <p className="insc-ayuda">Si lo pide, se suman {fmtMoney(evento.kit.precio)} al total.</p>
                        {invDeseaKit && (
                          <>
                            <div id="grupo-inv-talla" tabIndex={-1} role="radiogroup" aria-label="Talla del kit del invitado" className={`kit-rejilla${errorInvTalla ? ' insc-grupo-error' : ''}`}>
                              {opcionesTalla.map((t, idx) => (
                                <TallaOpcion
                                  key={t}
                                  indice={idx}
                                  talla={t}
                                  quedan={quedan(t, 'invitado')}
                                  controlado={kitConTallas}
                                  activa={invTallaKit === t}
                                  onClick={() => { setInvTallaKit(t); setErrorInvTalla(''); }}
                                />
                              ))}
                            </div>
                            {errorInvTalla && <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> {errorInvTalla}</p>}
                            <div className="insc-campos">
                              <Campo id="inv-dorsal" etiqueta="Dorsal preferido del invitado (opcional)" icono="ti-hash" error={errorInvDorsal}
                                ok={!!invDorsal && !errorDorsalInvitado(invDorsal)} ayuda="Si ya está tomado, le asignamos otro.">
                                <input
                                  id="inv-dorsal"
                                  className="insc-input insc-input-dorsal"
                                  placeholder="Ej: 43"
                                  inputMode="numeric"
                                  maxLength={5}
                                  value={invDorsal}
                                  onChange={(e) => {
                                    const limpio = limpiarDorsal(e.target.value);
                                    setInvDorsal(limpio);
                                    setErrorInvDorsal(errorDorsalInvitado(limpio));
                                  }}
                                />
                              </Campo>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Seccion>

              <div className="insc-acciones">
                <div className="insc-acciones-total">
                  <span>Total</span>
                  <strong>{fmtMoney(total)}</strong>
                </div>
                <button title="Continuar al paso del pago" type="submit" className="insc-btn insc-btn-primario insc-btn-grande" disabled={yaInscrito || perfilIncompleto}>
                  Continuar al pago <i className="ti ti-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {/* ---------------- PASO 2: pago ---------------- */}
          {step === 2 && (
            <div className="insc-form">
              <Seccion numero={1} icono="ti-wallet" titulo="¿Cómo quieres pagar?" subtitulo="Todos los métodos son seguros.">
                <div className="insc-metodos" role="radiogroup" aria-label="Método de pago">
                  {METODOS.map((m) => (
                    <button
                      key={m.valor}
                      type="button"
                      role="radio"
                      aria-checked={metodoPago === m.valor}
                      title={`Pagar con ${m.titulo}`}
                      className="insc-metodo"
                      onClick={() => setMetodoPago(m.valor)}
                    >
                      <i className={`ti ${m.icono}`} aria-hidden="true" />
                      <strong>{m.titulo}</strong>
                      <small>{m.detalle}</small>
                      <i className="ti ti-circle-check-filled insc-metodo-check" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </Seccion>

              {metodoPago === 'efectivo' ? (
                <Seccion numero={2} icono="ti-cash" titulo="Pago en efectivo">
                  <div className="insc-banner info">
                    <i className="ti ti-map-pin-dollar" aria-hidden="true" />
                    <div>
                      <strong>Paga el día del evento</strong>
                      <p>Acércate al punto de inscripción en {evento.ubicacion} y paga {fmtMoney(total)} en efectivo. Tu cupo queda <b>pendiente</b> hasta ese momento.</p>
                    </div>
                  </div>
                </Seccion>
              ) : (
                <>
                  <Seccion numero={2} icono={metodoPago === 'nequi' ? 'ti-device-mobile' : 'ti-building-bank'} titulo="Haz el pago a SKYED" subtitulo="Copia los datos y paga desde tu app.">
                    <div className="insc-monto">
                      <span>Valor exacto a pagar</span>
                      <strong>{fmtMoney(total)}</strong>
                    </div>

                    <div className="insc-datos-pago">
                      {metodoPago === 'nequi' ? (
                        <>
                          <DatoPago etiqueta="Número Nequi / Daviplata" valor={DATOS_PAGO.nequiVisible} copiar={DATOS_PAGO.nequi} destacado />
                          <DatoPago etiqueta="Titular" valor={DATOS_PAGO.titular} />
                        </>
                      ) : (
                        <>
                          <DatoPago etiqueta="Banco" valor={`${DATOS_PAGO.banco} · ${DATOS_PAGO.tipoCuenta}`} />
                          <DatoPago etiqueta="Número de cuenta" valor={DATOS_PAGO.cuenta} copiar={DATOS_PAGO.cuentaDigitos} destacado />
                          <DatoPago etiqueta="Titular" valor={DATOS_PAGO.titular} />
                          <DatoPago etiqueta="NIT" valor={DATOS_PAGO.nit} copiar={DATOS_PAGO.nit.replace(/\./g, '')} />
                        </>
                      )}
                      <DatoPago etiqueta={metodoPago === 'nequi' ? 'Referencia (en el mensaje)' : 'Referencia (en la descripción)'} valor={referenciaPago} copiar={referenciaPago} />
                    </div>

                    <ol className="insc-como">
                      <li><span>1</span><p>Transfiere <b>{fmtMoney(total)}</b> exactos.</p></li>
                      <li><span>2</span><p>Escribe la referencia <b>{referenciaPago}</b>.</p></li>
                      <li><span>3</span><p>Toma captura del comprobante <b>con el código QR</b>.</p></li>
                    </ol>
                  </Seccion>

                  <Seccion numero={3} icono="ti-receipt" titulo="Sube tu comprobante" subtitulo="Lo revisamos al instante: que tenga el QR y que el pago sea a SKYED.">
                    <div id="zona-comprobante" className={errorComprobante ? 'insc-grupo-error' : undefined}>
                      <label
                        htmlFor="comprobante"
                        className={`insc-subida${arrastrando ? ' arrastrando' : ''}${validandoComprobante ? ' validando' : ''}${comprobante ? ' lista' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); if (!validandoComprobante) setArrastrando(true); }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setArrastrando(false);
                          if (validandoComprobante) return;
                          if (e.dataTransfer.files?.[0]) manejarComprobante(e.dataTransfer.files[0]);
                        }}
                      >
                        {validandoComprobante ? (
                          <>
                            <span className="insc-subida-icono"><i className="ti ti-scan insc-giro" aria-hidden="true" /></span>
                            <strong role="status" aria-live="polite">
                              Revisando tu comprobante…{progresoValidacion !== null ? ` ${progresoValidacion}%` : ''}
                            </strong>
                            <span className="insc-subida-barra" aria-hidden="true">
                              <span style={{ width: `${progresoValidacion ?? 15}%` }} />
                            </span>
                            <small>Buscando el QR y leyendo los datos del pago</small>
                          </>
                        ) : comprobante ? (
                          <>
                            {vistaComprobante && <img className="insc-subida-vista" src={vistaComprobante} alt="Vista previa del comprobante" />}
                            <span className="insc-subida-ok">
                              <strong><i className="ti ti-circle-check-filled" aria-hidden="true" /> Comprobante validado</strong>
                              <small>QR detectado{verificacion?.datos.destino === true ? ' · pago a la cuenta de SKYED' : ''}</small>
                              <small className="insc-subida-nombre">{comprobante.name} · haz clic para cambiarlo</small>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="insc-subida-icono"><i className="ti ti-cloud-upload" aria-hidden="true" /></span>
                            <strong>Arrastra tu comprobante aquí o haz clic</strong>
                            <small>Captura completa con el QR · JPG, PNG o WEBP · Máximo 15 MB</small>
                          </>
                        )}
                      </label>
                      <input
                        id="comprobante"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="insc-solo-lector"
                        disabled={validandoComprobante}
                        onChange={(e) => {
                          manejarComprobante(e.target.files?.[0] ?? null);
                          // Así se puede volver a elegir la misma imagen después de corregir algo.
                          e.target.value = '';
                        }}
                      />
                      {errorComprobante && !comprobante && !avisoComprobante && (
                        <p className="insc-error"><i className="ti ti-alert-circle" aria-hidden="true" /> Sube el comprobante para continuar.</p>
                      )}

                      {avisoComprobante && !validandoComprobante && (
                        <div id="aviso-comprobante" className={`insc-aviso ${avisoComprobante.tipo}`} role="alert">
                          <i className={`ti ${avisoComprobante.tipo === 'error' ? 'ti-alert-octagon' : 'ti-alert-triangle'} insc-aviso-icono`} aria-hidden="true" />
                          <div className="insc-aviso-cuerpo">
                            <strong>{avisoComprobante.titulo}</strong>
                            <p>{avisoComprobante.detalle}</p>
                            {avisoComprobante.mostrarCuenta && (
                              <ul className="insc-aviso-cuenta">
                                {metodoPago === 'nequi' ? (
                                  <li><span>Nequi / Daviplata</span><b>{DATOS_PAGO.nequiVisible}</b></li>
                                ) : (
                                  <>
                                    <li><span>Banco</span><b>{DATOS_PAGO.banco} · {DATOS_PAGO.tipoCuenta}</b></li>
                                    <li><span>N.º de cuenta</span><b>{DATOS_PAGO.cuenta}</b></li>
                                  </>
                                )}
                                <li><span>Titular</span><b>{DATOS_PAGO.titular}</b></li>
                                <li><span>Valor a pagar</span><b>{fmtMoney(total)}</b></li>
                              </ul>
                            )}
                          </div>
                          <button type="button" className="insc-aviso-cerrar" title="Cerrar este aviso" aria-label="Cerrar este aviso" onClick={() => setAvisoComprobante(null)}>
                            <i className="ti ti-x" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Seccion>
                </>
              )}

              <div className="insc-acciones">
                <button title="Volver al paso anterior" type="button" className="insc-btn insc-btn-secundario" onClick={() => setStep(1)}>
                  <i className="ti ti-arrow-left" aria-hidden="true" /> Volver
                </button>
                <button title="Revisar los datos de tu inscripción" type="button" className="insc-btn insc-btn-primario insc-btn-grande" disabled={validandoComprobante} onClick={irARevision}>
                  Revisar inscripción <i className="ti ti-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- PASO 3: confirmar ---------------- */}
          {step === 3 && !done && (
            <div className="insc-form">
              <Seccion numero={1} icono="ti-clipboard-check" titulo="Revisa tu inscripción" subtitulo="Si algo está mal, edítalo antes de confirmar.">
                <div className="insc-resumen">
                  <div className="insc-resumen-bloque">
                    <header><span><i className="ti ti-flag" aria-hidden="true" /> Carrera</span></header>
                    <dl>
                      <div><dt>Evento</dt><dd>{evento.nombre}</dd></div>
                      <div><dt>Fecha</dt><dd>{fmtFecha(evento.fecha)} · {fmtHora(evento.hora)}</dd></div>
                      <div><dt>Lugar</dt><dd>{evento.ubicacion}</dd></div>
                      <div><dt>Categoría</dt><dd>{categoriaElegida?.nombre || '—'}</dd></div>
                    </dl>
                  </div>

                  <div className="insc-resumen-bloque">
                    <header>
                      <span><i className="ti ti-user" aria-hidden="true" /> Corredor</span>
                      <button type="button" className="insc-enlace" title="Editar tus datos" onClick={() => setStep(1)}><i className="ti ti-pencil" aria-hidden="true" /> Editar</button>
                    </header>
                    <dl>
                      <div><dt>Nombre</dt><dd>{user?.name}</dd></div>
                      <div><dt>Documento</dt><dd>{documento}</dd></div>
                      <div><dt>RH</dt><dd>{rh}</dd></div>
                      <div><dt>Emergencia</dt><dd>{contactoEmergenciaNombre} · {contactoEmergenciaTelefono}</dd></div>
                      {evento.kit && <div><dt>Kit</dt><dd>{deseaJersey ? `Talla ${tallaKit}${dorsalPreferido ? ` · dorsal ${dorsalPreferido}` : ''}` : 'Sin kit'}</dd></div>}
                      {mostrarInvitado && (
                        <div><dt>Invitado</dt><dd>{`${invNombre} ${invApellido}`.trim()}{evento.kit ? (invDeseaKit ? ` · kit talla ${invTallaKit}` : ' · sin kit') : ''}</dd></div>
                      )}
                    </dl>
                  </div>

                  <div className="insc-resumen-bloque">
                    <header>
                      <span><i className="ti ti-credit-card" aria-hidden="true" /> Pago</span>
                      <button type="button" className="insc-enlace" title="Cambiar el método de pago" onClick={() => setStep(2)}><i className="ti ti-pencil" aria-hidden="true" /> Editar</button>
                    </header>
                    <dl>
                      <div><dt>Método</dt><dd>{nombreMetodo}</dd></div>
                      {comprobante && <div><dt>Comprobante</dt><dd className="insc-ok-texto"><i className="ti ti-circle-check-filled" aria-hidden="true" /> Validado</dd></div>}
                      <div><dt>Referencia</dt><dd>{referenciaPago}</dd></div>
                    </dl>
                    <div className="insc-resumen-total"><span>Total</span><strong>{fmtMoney(total)}</strong></div>
                  </div>
                </div>
              </Seccion>

              <Seccion numero={2} icono="ti-shield-check" titulo="Antes de la salida" subtitulo="Lee y acepta para confirmar tu cupo.">
                <div className="insc-terminos">
                  <p>
                    Al confirmar aceptas que: la inscripción es <b>personal e intransferible</b>; SKYED <b>no hace reembolsos</b> una vez
                    confirmada, salvo cancelación oficial del evento; participas bajo tu propia responsabilidad; y autorizas el uso de
                    fotos y videos del evento con fines promocionales.
                  </p>
                </div>

                <label className={`insc-check${errorTerminos ? ' con-error' : ''}${aceptaTerminos ? ' marcado' : ''}`}>
                  <input type="checkbox" checked={aceptaTerminos} onChange={(e) => { setAceptaTerminos(e.target.checked); setErrorTerminos(!e.target.checked); }} />
                  <span className="insc-check-caja" aria-hidden="true"><i className="ti ti-check" /></span>
                  <span>
                    Acepto los{' '}
                    <button title="Leer los términos y condiciones" type="button" className="insc-enlace" onClick={() => setTermsOpen(true)}>términos y condiciones</button>
                    {' '}y la{' '}
                    <button title="Leer la política de privacidad" type="button" className="insc-enlace" onClick={() => setTermsOpen(true)}>política de privacidad</button> *
                  </span>
                </label>

                <label className={`insc-check${errorCondicionFisica ? ' con-error' : ''}${aceptaCondicionFisica ? ' marcado' : ''}`}>
                  <input type="checkbox" checked={aceptaCondicionFisica} onChange={(e) => { setAceptaCondicionFisica(e.target.checked); setErrorCondicionFisica(!e.target.checked); }} />
                  <span className="insc-check-caja" aria-hidden="true"><i className="ti ti-check" /></span>
                  <span>Declaro estar en condiciones físicas adecuadas para participar y no tengo contraindicaciones médicas que me lo impidan. *</span>
                </label>
              </Seccion>

              <div className="insc-acciones">
                <button title="Volver al paso del pago" type="button" className="insc-btn insc-btn-secundario" disabled={enviando} onClick={() => setStep(2)}>
                  <i className="ti ti-arrow-left" aria-hidden="true" /> Volver
                </button>
                <button
                  title={enviando ? 'Enviando…' : 'Confirmar tu inscripción'}
                  type="button"
                  className="insc-btn insc-btn-primario insc-btn-grande insc-btn-salida"
                  disabled={enviando}
                  onClick={confirmarInscripcion}
                >
                  {enviando
                    ? <><i className="ti ti-loader-2 insc-giro" aria-hidden="true" /> Enviando…</>
                    : pagoPendienteComprobante !== null
                      ? <><i className="ti ti-refresh" aria-hidden="true" /> Reintentar subida del comprobante</>
                      : <><i className="ti ti-flag" aria-hidden="true" /> Confirmar inscripción</>}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Listo ---------------- */}
          {step === 3 && done && (
            <div className="insc-meta">
              <div className="insc-meta-bandera" aria-hidden="true" />
              <div className="insc-meta-icono"><i className="ti ti-trophy" aria-hidden="true" /></div>
              <h2>¡Estás en la línea de salida!</h2>
              <p>
                Tu inscripción a <b>{evento.nombre}</b> quedó registrada.
                {metodoPago === 'efectivo'
                  ? ' Recuerda pagar en efectivo en el punto de inscripción.'
                  : ' Validaremos tu pago y te avisaremos cuando quede confirmado.'}
              </p>
              <p className="insc-meta-sub">Tu código QR de entrada estará en tu perfil y te llegará al correo.</p>
              <div className="insc-meta-acciones">
                <button title="Ver mi entrada con el código QR" type="button" className="insc-btn insc-btn-primario insc-btn-grande" onClick={() => nav(`/deportivo/perfil?entrada=${evento.id}`)}>
                  <i className="ti ti-qrcode" aria-hidden="true" /> Ver mi entrada
                </button>
                <Link className="insc-btn insc-btn-secundario" to="/deportivo/eventos" title="Ver más eventos">Más eventos</Link>
              </div>
            </div>
          )}
        </div>

        {/* ===================== Resumen (ticket) ===================== */}
        <aside className="insc-ticket" aria-label="Resumen de tu inscripción">
          <div className="insc-ticket-cab">
            <span><i className="ti ti-ticket" aria-hidden="true" /> Tu inscripción</span>
            <span className={`insc-cupos${evento.cupos_disponibles > 0 ? '' : ' agotado'}`}>
              <span className="insc-cupos-punto" aria-hidden="true" />
              {evento.cupos_disponibles > 0 ? `${evento.cupos_disponibles} cupos` : 'Sin cupos'}
            </span>
          </div>

          <div className="insc-ticket-evento">
            {evento.imagen_url && <img src={evento.imagen_url} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            <div>
              <strong>{evento.nombre}</strong>
              <span>{fmtFecha(evento.fecha)}</span>
              {categoriaElegida && <span className="insc-ticket-cat"><i className="ti ti-medal" aria-hidden="true" /> {categoriaElegida.nombre}</span>}
            </div>
          </div>

          <div className="insc-ticket-corte" aria-hidden="true" />

          <ul className="insc-ticket-lineas">
            <li><span>Inscripción</span><b>{fmtMoney(evento.precio)}</b></li>
            {evento.kit && <li><span>Kit{deseaJersey && tallaKit ? ` · ${tallaKit}` : ''}</span><b>{deseaJersey ? fmtMoney(precioKit) : '—'}</b></li>}
            {mostrarInvitado && <li><span>Invitado</span><b>{fmtMoney(precioInvitado)}</b></li>}
            {mostrarInvitado && evento.kit && <li><span>Kit invitado{invDeseaKit && invTallaKit ? ` · ${invTallaKit}` : ''}</span><b>{invDeseaKit ? fmtMoney(precioKitInvitado) : '—'}</b></li>}
          </ul>

          <div className="insc-ticket-total">
            <span>Total</span>
            <strong key={total}>{fmtMoney(total)}</strong>
          </div>

          <p className="insc-ticket-nota">
            <i className="ti ti-shield-check" aria-hidden="true" /> Tu cupo se confirma cuando validamos el pago.
          </p>
        </aside>
      </div>

      {msg && (
        <div className={`part-form-alert ${msg.tipo}`} key={msg.id} role={msg.tipo === 'error' ? 'alert' : 'status'}>
          <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
          {msg.texto}
          <div className="part-alert-timer" style={{ animationDuration: `${duracionMsg}ms` }} />
        </div>
      )}

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => setAceptaTerminos(true)}
        variant="deportivo"
      />
    </div>
  );
}
