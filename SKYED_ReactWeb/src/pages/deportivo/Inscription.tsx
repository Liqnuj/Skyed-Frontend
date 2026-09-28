import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import TermsModal from '../../components/shared/TermsModal';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import '../../styles/deportivo/participante.css';

interface Kit {
  precio?: number;
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

// ASUNCIÓN: no vi CategoriaCompetenciaResource.php — nombre/descripcion son
// mi mejor suposición según lo que se ve en la maqueta (ej. "Elite hombre",
// "Masculino · 18-40 años"). Confirmar nombres reales de campos.
interface CategoriaCompetencia {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

const RH_OPCIONES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

function fmtMoney(n: number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

export default function Inscription() {
  return (
    <Protected>
      <SportWrapper>
        <InscriptionWizard />
      </SportWrapper>
    </Protected>
  );
}
function soloLetras(s: string) {
  return s
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|\s)([a-záéíóúñ])/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

function soloNumeros(s: string) {
  return s.replace(/[^0-9]/g, '').slice(0, 10);
}

const DRAFT_KEY_PREFIX = 'skyed_inscripcion_draft_';

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
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'nequi' | 'efectivo'>('transferencia');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [validandoComprobante, setValidandoComprobante] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaCondicionFisica, setAceptaCondicionFisica] = useState(false);
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
  const [invFechaNacimiento, setInvFechaNacimiento] = useState('');
  const [invCorreo, setInvCorreo] = useState('');

  const [enviando, setEnviando] = useState(false);
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
          mostrarMsg('error', 'Ya estás inscrito en este evento. Te llevamos a tu inscripción…');
          setTimeout(() => { if (!cancelado) nav(`/deportivo/mi-entrada/${id}`); }, 2500);
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
      if (draft.contactoEmergenciaNombre) setContactoEmergenciaNombre(draft.contactoEmergenciaNombre);
      if (draft.contactoEmergenciaTelefono) setContactoEmergenciaTelefono(draft.contactoEmergenciaTelefono);
      if (draft.parentesco) setParentesco(draft.parentesco);
      if (draft.categoriaId) setCategoriaId(draft.categoriaId);
      if (draft.deseaJersey !== undefined && draft.deseaJersey !== null) setDeseaJersey(draft.deseaJersey);
      if (draft.dorsalPreferido) setDorsalPreferido(draft.dorsalPreferido);
      if (draft.tallaKit) setTallaKit(draft.tallaKit);
      if (draft.condicionesMedicas) setCondicionesMedicas(draft.condicionesMedicas);
      if (draft.mostrarInvitado) setMostrarInvitado(draft.mostrarInvitado);
      if (draft.invTipoDocumento) setInvTipoDocumento(draft.invTipoDocumento);
      if (draft.invDocumento) setInvDocumento(draft.invDocumento);
      if (draft.invNombre) setInvNombre(draft.invNombre);
      if (draft.invApellido) setInvApellido(draft.invApellido);
      if (draft.invRh) setInvRh(draft.invRh);
      if (draft.invTelefono) setInvTelefono(draft.invTelefono);
      if (draft.invFechaNacimiento) setInvFechaNacimiento(draft.invFechaNacimiento);
      if (draft.invCorreo) setInvCorreo(draft.invCorreo);
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
      metodoPago,
    };
    try {
      localStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(draft));
    } catch {}
  }, [
    id, step, rh, contactoEmergenciaNombre, contactoEmergenciaTelefono, parentesco,
    categoriaId, deseaJersey, dorsalPreferido, tallaKit, condicionesMedicas,
    mostrarInvitado, invTipoDocumento, invDocumento, invNombre, invApellido,
    invRh, invTelefono, invFechaNacimiento, invCorreo, metodoPago,
  ]);

  useEffect(() => {
    if (!user) return;
    setDocumento(user.documento || '');
    setTelefonoContacto(user.telefono || '');
    if (user.fecha_nacimiento) {
      setFechaNacimiento(user.fecha_nacimiento.slice(0, 10)); // YYYY-MM-DD para el input type="date"
    }

    const faltaDato = !user.documento || !user.telefono || !user.fecha_nacimiento;
    setPerfilIncompleto(faltaDato);
    if (faltaDato) {
      mostrarMsg('error', 'Tu perfil tiene datos incompletos (documento, teléfono o fecha de nacimiento). Complétalos en Ajustes de tu perfil antes de continuar con la inscripción.');
    }
  }, [user]);

  function mostrarMsg(tipo: 'ok' | 'error', texto: string) {
    setMsg({ tipo, texto, id: Date.now() });
  }

  // Convierte la imagen a blanco/negro puro (umbral por brillo). El QR se lee
  // mejor así cuando la foto viene comprimida (p. ej. reenviada por WhatsApp)
  // y los bordes de los módulos quedan un poco difuminados a color.
  function aBlancoYNegro(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    const salida = new Uint8ClampedArray(data.length);
    let suma = 0;
    const totalPixeles = width * height;
    for (let i = 0; i < data.length; i += 4) {
      suma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const umbral = (suma / totalPixeles) * 0.9;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = lum < umbral ? 0 : 255;
      salida[i] = v; salida[i + 1] = v; salida[i + 2] = v; salida[i + 3] = 255;
    }
    return new ImageData(salida, width, height);
  }

  // Lee la imagen del comprobante y verifica que contenga un código QR legible.
  // Prueba varias escalas y, si falla a color, también en blanco y negro puro,
  // porque una foto comprimida (WhatsApp, etc.) puede fallar a la primera.
  // Los PDF no se pueden analizar en el navegador con jsQR, así que se dejan pasar.
  function contieneCodigoQR(file: File): Promise<boolean> {
    if (file.type === 'application/pdf') return Promise.resolve(true);

    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          const escalas = [1, 1.5, 0.75, 2, 0.5];
          let encontrado = false;

          for (const escala of escalas) {
            const w = Math.max(1, Math.round(img.naturalWidth * escala));
            const h = Math.max(1, Math.round(img.naturalHeight * escala));
            if (w < 50 || h < 50 || w * h > 30_000_000) continue;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);

            let codigo = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
            if (!codigo) {
              const byn = aBlancoYNegro(imageData);
              codigo = jsQR(byn.data, w, h, { inversionAttempts: 'attemptBoth' });
            }

            if (import.meta.env?.DEV) {
              console.log(`[comprobante] intento QR escala ${escala} (${w}x${h}):`, codigo ? 'ENCONTRADO' : 'no encontrado');
            }

            if (codigo) { encontrado = true; break; }
          }

          resolve(encontrado);
        } catch {
          // Si algo falla al analizar la imagen, no bloqueamos al usuario por un error técnico.
          resolve(true);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      img.src = url;
    });
  }

  function normalizarTexto(s: string) {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Lee el texto de la imagen con OCR. Los PDF no se procesan aquí
  // (habría que renderizar la página a imagen primero, fuera de este alcance).
  async function extraerTextoComprobante(file: File): Promise<string> {
    if (file.type === 'application/pdf') return '';
    try {
      const worker = await createWorker('spa');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      return data.text || '';
    } catch {
      return '';
    }
  }

  // Revisa si el texto leído realmente parece el de un comprobante de pago
  // (monto, banco/entidad, fecha/referencia), no solo una imagen con un QR pegado.
  function pareceComprobanteDePago(textoOriginal: string): boolean {
    if (!textoOriginal.trim()) return true; // si el OCR no devolvió nada (falla técnica, PDF, etc.), no bloqueamos por esto
    const texto = normalizarTexto(textoOriginal);

    // El símbolo "$" es de los que más falla el OCR, así que también aceptamos
    // un número con separador de miles (20.000 / 20,000) aunque no detecte el "$".
    const tieneMonto = /\$\s?\d[\d.,]*/.test(textoOriginal) || /\b\d{1,3}[.,]\d{3}(?:[.,]\d{2})?\b/.test(textoOriginal);
    const tienePalabraDePago = /(pago|transferencia|transaccion|comprobante|envio|movimiento|consignacion|realizado)/.test(texto);
    const tieneEntidad = /(banco|nequi|daviplata|bancolombia|davivienda|bbva|cuenta de ahorros|cuenta)/.test(texto);
    const tieneReferenciaOFecha = /(referencia|fecha|hora|llave|para|destino)/.test(texto);

    const indicios = [tieneMonto, tienePalabraDePago, tieneEntidad, tieneReferenciaOFecha].filter(Boolean).length;

    if (import.meta.env?.DEV) {
      console.log('[comprobante] texto OCR:', textoOriginal);
      console.log('[comprobante] indicios:', { tieneMonto, tienePalabraDePago, tieneEntidad, tieneReferenciaOFecha, total: indicios });
    }

    return indicios >= 1;
  }

  async function manejarComprobante(file: File | null) {
    if (!file) { setComprobante(null); return; }

    setValidandoComprobante(true);

    const tieneQR = await contieneCodigoQR(file);
    if (import.meta.env?.DEV) console.log('[comprobante] ¿tiene QR?', tieneQR);
    if (!tieneQR) {
      setValidandoComprobante(false);
      setComprobante(null);
      mostrarMsg('error', 'La imagen no parece contener el código QR del comprobante de pago. Sube una captura completa que incluya el QR.');
      return;
    }

    const texto = await extraerTextoComprobante(file);
    setValidandoComprobante(false);

    if (!pareceComprobanteDePago(texto)) {
      setComprobante(null);
      mostrarMsg('error', 'La imagen no parece un comprobante de pago real (no se detectaron datos como monto, banco, fecha o referencia). Sube la captura completa de la transacción.');
      return;
    }

    setComprobante(file);
  }

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [msg]);


  const precioKit = deseaJersey && evento?.kit ? Number(evento.kit.precio || 0) : 0;
  const total = (evento?.precio || 0) + precioKit;
  const referenciaPago = evento ? `SKYED-${String(evento.id).padStart(4, '0')}` : '';

  function irAPago(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;

    let faltaAlgo = false;

    if (!documento) { setErrorDocumento('Este campo es obligatorio.'); faltaAlgo = true; }
    if (!rh) { setErrorRh('Selecciona tu tipo de sangre.'); faltaAlgo = true; }
    if (!telefonoContacto) { setErrorTelefonoContacto('Este campo es obligatorio.'); faltaAlgo = true; }
    if (!fechaNacimiento) { setErrorFechaNacimiento('Este campo es obligatorio.'); faltaAlgo = true; }
    if (!contactoEmergenciaNombre) { setErrorNombreContacto('Este campo es obligatorio.'); faltaAlgo = true; }
    if (!contactoEmergenciaTelefono) { setErrorTelefonoEmergencia('Este campo es obligatorio.'); faltaAlgo = true; }
    if (!parentesco) { setErrorParentesco('Selecciona el parentesco.'); faltaAlgo = true; }
    if (!categoriaId) { faltaAlgo = true; }
    if (deseaJersey === null) { faltaAlgo = true; }
    if (deseaJersey === true && !tallaKit) {
      faltaAlgo = true;
      mostrarMsg('error', 'Selecciona la talla del kit.');
    }

    if (mostrarInvitado) {
      if (!invDocumento) { setErrorInvDocumento('Este campo es obligatorio.'); faltaAlgo = true; }
      if (!invNombre) { setErrorInvNombre('Este campo es obligatorio.'); faltaAlgo = true; }
      if (!invApellido) { setErrorInvApellido('Este campo es obligatorio.'); faltaAlgo = true; }
      if (!invTelefono) { setErrorInvTelefono('Este campo es obligatorio.'); faltaAlgo = true; }
    }

    if (faltaAlgo) {
      mostrarMsg('error', 'Completa todos los campos obligatorios antes de continuar.');
      return;
    }

    setStep(2);
  }

  function irARevision(e: FormEvent) {
    e.preventDefault();
    if (metodoPago !== 'efectivo' && !comprobante) {
      mostrarMsg('error', 'Adjunta tu comprobante de pago.');
      return;
    }
    setStep(3);
  }

  async function confirmarInscripcion() {
    if (!evento) return;

    if (evento.estado !== 'activo') {
      mostrarMsg('error', 'Este evento no está activo actualmente.');
      return;
    }
    if (evento.cupos_disponibles <= 0) {
      mostrarMsg('error', 'No hay cupos disponibles para este evento.');
      return;
    }
    if (metodoPago !== 'efectivo' && !comprobante) {
      mostrarMsg('error', 'Adjunta tu comprobante de pago.');
      return;
    }
    if (!aceptaTerminos || !aceptaCondicionFisica) {
      mostrarMsg('error', 'Debes aceptar los términos y confirmar tu estado de salud.');
      return;
    }

    // ASUNCIÓN: nombres de campo para rh/telefono_contacto/categoria/
    // jersey/dorsal/condiciones médicas del titular — pendiente de
    // confirmar contra el StoreInscripcionRequest actualizado.
    const payload: Record<string, unknown> = {
      cupo_i: 1,
      precio_pagado_i: total,
      documento,
      rh_u: rh,
      telefono_contacto: telefonoContacto,
      contacto_emergencia_nombre: contactoEmergenciaNombre,
      contacto_emergencia_telefono: contactoEmergenciaTelefono,
      contacto_emergencia_parentesco: parentesco,
      fecha_nacimiento: fechaNacimiento,
      id_categoria: categoriaId,
      desea_jersey: deseaJersey,
      numero_dorsal_preferido: dorsalPreferido || null,
      talla_kit: deseaJersey ? (tallaKit || null) : null,
      condiciones_medicas: condicionesMedicas || null,
      metodo_pago_p: metodoPago,
      referencia_p: referenciaPago,
      comprobante_p: comprobante?.name ?? null,
    };

    if (mostrarInvitado) {
      payload.invitado = {
        tipo_documento: invTipoDocumento,
        documento_inv: invDocumento,
        nombre_inv: invNombre,
        apellido_inv: invApellido,
        rh_inv: invRh,
        telefono_inv: invTelefono,
        fecha_nacimiento_inv: invFechaNacimiento,
        correo_inv: invCorreo || null,
      };
    }

    setEnviando(true);
    try {
      await apiFetch(`/eventos/${evento.id}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (id) {
        try { localStorage.removeItem(DRAFT_KEY_PREFIX + id); } catch {}
      }
      setStep(3);
      setDone(true);
    } catch (err: any) {
      mostrarMsg('error', err?.message || 'No se pudo completar la inscripción. Verifica los datos.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 1100, margin: '0 auto' }}>
        <div className="part-card"><div className="part-card-body">Cargando evento…</div></div>
      </div>
    );
  }

  if (errorCarga || !evento) {
    return (
      <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 1100, margin: '0 auto' }}>
        <div className="part-card"><div className="part-card-body">{errorCarga || 'Evento no encontrado.'}</div></div>
      </div>
    );
  }

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      {/* Breadcrumb */}
      <div className="part-form-hint" style={{ margin: '0 0 1rem' }}>
        <Link to="/deportivo" style={{ color: 'var(--muted, #6b7280)' }}>Inicio</Link>
        {' / '}
        <Link to="/deportivo/eventos" style={{ color: 'var(--muted, #6b7280)' }}>Eventos</Link>
        {' / '}
        <span>{evento.nombre}</span>
        {' / '}
        <strong style={{ color: 'inherit' }}>Inscripción</strong>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', marginBottom: '1.75rem' }}>
        {[{ n: 1, label: 'Tus datos' }, { n: 2, label: 'Pago' }, { n: 3, label: 'Confirmar' }].map((s, idx) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.3rem' }}>
              <div
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.85rem',
                  background: step >= (s.n as 1 | 2 | 3) ? 'var(--accent)' : 'var(--bg, #f8fafc)',
                  color: step >= (s.n as 1 | 2 | 3) ? '#fff' : 'var(--muted, #6b7280)',
                  border: step >= (s.n as 1 | 2 | 3) ? 'none' : '1px solid var(--border, #e5e7eb)',
                }}
              >
                {s.n}
              </div>
              <span className="part-form-hint" style={{ margin: 0, fontWeight: step === s.n ? 700 : 400 }}>{s.label}</span>
            </div>
            {idx < 2 && <div style={{ width: 60, height: 2, background: step > (s.n as 1 | 2 | 3) ? 'var(--accent)' : 'var(--border, #e5e7eb)', marginBottom: '1.2rem' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Columna izquierda: formulario */}
        <div>
          {step === 1 && (
            <form onSubmit={irAPago} noValidate>
              {/* Tarjeta 1: cuenta + documento */}
              <div className="part-card">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-user" aria-hidden="true" /></span>
                  <h3>Datos del participante</h3>
                </div>
                <div className="part-card-body">
                  <p className="part-form-hint" style={{ marginTop: 0 }}>Confirma tu información personal. Los campos marcados con * son obligatorios.</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem', background: 'var(--bg, #f8fafc)', borderRadius: 10, marginBottom: '1.25rem' }}>
                    <div className="part-avatar" style={{ width: 40, height: 40, fontSize: '.9rem' }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user?.name}</div>
                      <div className="part-form-hint" style={{ margin: 0 }}>{user?.email}</div>
                    </div>
                    <button type="button" className="part-btn-link-detail" style={{ marginLeft: 'auto' }} onClick={() => nav('/login')}>
                      ¿No eres tú? Cambiar cuenta
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                    <div className="part-form-group">
                      <label htmlFor="documento">N.º de documento *</label>
                      <input
                        id="documento"
                        required
                        readOnly
                        className="part-input-locked"
                        value={documento}
                        onFocus={(e) => {
                          e.target.blur();
                          mostrarMsg('error', 'Para modificar tu número de documento, ve a Ajustes de tu perfil.');
                        }}
                      />
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="rh">Tipo de sangre (RH) *</label>
                      <select id="rh" required value={rh} onChange={(e) => { setRh(e.target.value); setErrorRh(''); }}>
                        <option value="">Seleccionar…</option>
                        {RH_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {errorRh && <p className="part-form-error">{errorRh}</p>}
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="tel-contacto">Teléfono de contacto *</label>
                      <input
                        id="tel-contacto"
                        type="tel"
                        required
                        readOnly
                        className="part-input-locked"
                        value={telefonoContacto}
                        onFocus={(e) => {
                          e.target.blur();
                          mostrarMsg('error', 'Para modificar tu teléfono, ve a Ajustes de tu perfil.');
                        }}
                      />
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="fecha-nac">Fecha de nacimiento *</label>
                      <input
                        id="fecha-nac"
                        type="date"
                        required
                        readOnly
                        className="part-input-locked"
                        value={fechaNacimiento}
                        onFocus={(e) => {
                          e.target.blur();
                          mostrarMsg('error', 'Para modificar tu fecha de nacimiento, ve a Ajustes de tu perfil.');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: contacto de emergencia */}
              <div className="part-card">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-phone-call" aria-hidden="true" /></span>
                  <h3>Contacto de emergencia</h3>
                </div>
                <div className="part-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                    <div className="part-form-group">
                      <label htmlFor="c-nombre">Nombre completo *</label>
                      <input
                        id="c-nombre"
                        required
                        value={contactoEmergenciaNombre}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const limpio = soloLetras(raw);
                          setErrorNombreContacto(limpio.replace(/\s/g, '').length < raw.replace(/\s/g, '').length ? 'Este campo solo permite letras.' : '');
                          setContactoEmergenciaNombre(limpio);
                        }}
                      />
                      {errorNombreContacto && <p className="part-form-error">{errorNombreContacto}</p>}
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="c-telefono">Teléfono *</label>
                      <input
                        id="c-telefono"
                        type="tel"
                        required
                        value={contactoEmergenciaTelefono}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const limpio = soloNumeros(raw);
                          setErrorTelefonoEmergencia(/[^0-9]/.test(raw) ? 'Este campo solo permite números.' : '');
                          setContactoEmergenciaTelefono(limpio);
                        }}
                      />
                      {errorTelefonoEmergencia && <p className="part-form-error">{errorTelefonoEmergencia}</p>}
                    </div>
                    <div className="part-form-group" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="c-parentesco">Parentesco *</label>
                      <select id="c-parentesco" required value={parentesco} onChange={(e) => setParentesco(e.target.value)}>
                        <option value="">Seleccionar…</option>
                        <option value="madre">Madre</option>
                        <option value="padre">Padre</option>
                        <option value="esposo_a">Esposo/a</option>
                        <option value="hermano_a">Hermano/a</option>
                        <option value="amigo_a">Amigo/a</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: categoría de competencia */}
              <div className="part-card">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-medal" aria-hidden="true" /></span>
                  <h3>Categoría de competencia</h3>
                </div>
                <div className="part-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    {categorias.length === 0 && <div className="part-form-hint">Este evento no tiene categorías configuradas.</div>}
                    {categorias.map((cat) => (
                      <label
                        key={cat.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.75rem',
                          border: `1px solid ${categoriaId === cat.id ? 'var(--accent)' : 'var(--border, #e5e7eb)'}`,
                          borderRadius: 10, cursor: 'pointer',
                          background: categoriaId === cat.id ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                        }}
                      >
                        <input type="radio" name="categoria" style={{ width: 'auto' }} checked={categoriaId === cat.id} onChange={() => setCategoriaId(cat.id)} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{cat.nombre}</div>
                          {cat.descripcion && <div className="part-form-hint" style={{ margin: 0 }}>{cat.descripcion}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tarjeta 4: kit / jersey / dorsal */}
              <div className="part-card">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-shirt-sport" aria-hidden="true" /></span>
                  <h3>Kit y dorsal</h3>
                </div>
                <div className="part-card-body">
                  <div className="part-form-group">
                    <label>¿Desea adquirir su jersey? *</label>
                    <p className="part-form-hint" style={{ marginTop: '0rem' }}>
                      El kit incluye jersey, pantaloneta y medias. Al adquirirlo se sumarán {fmtMoney(evento.kit?.precio)} al valor de la inscripción.
                    </p>
                    <div style={{ display: 'flex', gap: '.6rem', marginTop: '.6rem' }}>
                      <button type="button" className={`btn ${deseaJersey === true ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDeseaJersey(true)}>Sí</button>
                      <button type="button" className={`btn ${deseaJersey === false ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDeseaJersey(false)}>No</button>
                    </div>
                  </div>

                  {deseaJersey === true && (
                    <>
                      <div className="part-form-group">
                        <label>Talla del kit (jersey, pantaloneta y medias) *</label>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
                          {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={`btn ${tallaKit === t ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setTallaKit(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="part-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="dorsal">Número de dorsal preferido (opcional, sujeto a disponibilidad)</label>
                        <input id="dorsal" placeholder="Ej: 42" inputMode="numeric" value={dorsalPreferido} onChange={(e) => setDorsalPreferido(e.target.value.replace(/\D/g, ''))} />
                        <br></br>
                        <br></br>
                        <div className="part-form-hint" style={{ marginBottom: 0 }}>Si el número ya está tomado, se asignará uno automáticamente.</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tarjeta 5: información médica */}
              <div className="part-card">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-first-aid-kit" aria-hidden="true" /></span>
                  <h3>Información médica</h3>
                </div>
                <div className="part-card-body">
                  <div className="part-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="condiciones">Condiciones médicas relevantes (opcional)</label>
                    <textarea
                      id="condiciones"
                      rows={3}
                      value={condicionesMedicas}
                      onChange={(e) => setCondicionesMedicas(e.target.value)}
                      style={{ width: '100%', padding: '.55rem .7rem', borderRadius: 8, border: '1px solid var(--accent)', fontFamily: 'inherit', fontSize: '.9rem', background: 'var(--surface, #fff)', color: 'inherit' }}
                    />
                    <br></br>
                    <br></br>
                    <div className="part-form-hint" style={{ marginBottom: 0 }}>
                      Tus datos médicos solo serán visibles para el personal de primeros auxilios del evento y nunca se compartirán con terceros.
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 6: acompañante opcional */}
              <div className="part-card">
                <div className="part-card-body">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={() => setMostrarInvitado((v) => !v)}
                  >
                    <i className="ti ti-user-plus" aria-hidden="true" /> {mostrarInvitado ? 'Quitar invitado' : 'Agregar invitado (participante adicional)'}
                  </button>

                  {mostrarInvitado && (
                    <div style={{ border: '1px dashed var(--border, #e5e7eb)', borderRadius: 10, padding: '1rem', marginTop: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                        <div className="part-form-group">
                          <label htmlFor="i-tipo-doc">Tipo de documento</label>
                          <select id="i-tipo-doc" value={invTipoDocumento} onChange={(e) => setInvTipoDocumento(e.target.value)}>
                            <option value="CC">Cédula de ciudadanía</option>
                            <option value="TI">Tarjeta de identidad</option>
                            <option value="CE">Cédula de extranjería</option>
                            <option value="PA">Pasaporte</option>
                          </select>
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-documento">Documento</label>
                          <input
                            id="i-documento"
                            required
                            inputMode="numeric"
                            value={invDocumento}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const limpio = raw.replace(/\D/g, '');
                              setErrorInvDocumento(/\D/.test(raw) ? 'Este campo solo permite números.' : '');
                              setInvDocumento(limpio);
                            }}
                          />
                          {errorInvDocumento && <p className="part-form-error">{errorInvDocumento}</p>}
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-nombre">Nombre</label>
                          <input
                            id="i-nombre"
                            required
                            value={invNombre}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const limpio = soloLetras(raw);
                              setErrorInvNombre(limpio.replace(/\s/g, '').length < raw.replace(/\s/g, '').length ? 'Este campo solo permite letras.' : '');
                              setInvNombre(limpio);
                            }}
                          />
                          {errorInvNombre && <p className="part-form-error">{errorInvNombre}</p>}
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-apellido">Apellido</label>
                          <input
                            id="i-apellido"
                            required
                            value={invApellido}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const limpio = soloLetras(raw);
                              setErrorInvApellido(limpio.replace(/\s/g, '').length < raw.replace(/\s/g, '').length ? 'Este campo solo permite letras.' : '');
                              setInvApellido(limpio);
                            }}
                          />
                          {errorInvApellido && <p className="part-form-error">{errorInvApellido}</p>}
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-rh">RH</label>
                          <select id="i-rh" value={invRh} onChange={(e) => setInvRh(e.target.value)}>
                            {RH_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-telefono">Teléfono</label>
                          <input
                            id="i-telefono"
                            type="tel"
                            required
                            value={invTelefono}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const limpio = soloNumeros(raw);
                              setErrorInvTelefono(/[^0-9]/.test(raw) ? 'Este campo solo permite números.' : '');
                              setInvTelefono(limpio);
                            }}
                          />
                          {errorInvTelefono && <p className="part-form-error">{errorInvTelefono}</p>}
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-fecha-nac">Fecha de nacimiento</label>
                          <input id="i-fecha-nac" type="date" required value={invFechaNacimiento} onChange={(e) => setInvFechaNacimiento(e.target.value)} />
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-correo">Correo (opcional)</label>
                          <input id="i-correo" type="email" value={invCorreo} onChange={(e) => setInvCorreo(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {msg && (
                <div className={`part-form-alert ${msg.tipo}`} key={msg.id}>
                  <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                  {msg.texto}
                  <div className="part-alert-timer" />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={yaInscrito || perfilIncompleto}>
                Continuar al pago <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="part-card">
              <div className="part-card-head">
                <span className="part-card-head-icon"><i className="ti ti-credit-card" aria-hidden="true" /></span>
                <h3>Método de pago</h3>
              </div>
              <div className="part-card-body">
                <p className="part-form-hint" style={{ margin: '0 0 .9rem' }}>Elige cómo quieres pagar tu inscripción. Todos los métodos son seguros.</p>

                <div className="part-pay-tabs">
                  <button type="button" className={`part-pay-tab${metodoPago === 'transferencia' ? ' active' : ''}`} onClick={() => setMetodoPago('transferencia')}>
                    <i className="ti ti-building-bank" aria-hidden="true" /> Transferencia
                  </button>
                  <button type="button" className={`part-pay-tab${metodoPago === 'nequi' ? ' active' : ''}`} onClick={() => setMetodoPago('nequi')}>
                    <i className="ti ti-device-mobile" aria-hidden="true" /> Nequi / Daviplata
                  </button>
                  <button type="button" className={`part-pay-tab${metodoPago === 'efectivo' ? ' active' : ''}`} onClick={() => setMetodoPago('efectivo')}>
                    <i className="ti ti-cash" aria-hidden="true" /> Efectivo
                  </button>
                </div>

                {metodoPago === 'transferencia' && (
                  <div className="part-pay-bank">
                    <div className="part-pay-bank-title"><i className="ti ti-building-bank" aria-hidden="true" /> Datos bancarios para transferencia</div>
                    <div className="part-pay-bank-row"><span>Banco</span><strong>Bancolombia</strong></div>
                    <div className="part-pay-bank-row"><span>Tipo de cuenta</span><strong>Cuenta de ahorros</strong></div>
                    <div className="part-pay-bank-row">
                      <span>N.º de cuenta</span>
                      <strong>123-456789-12 <button type="button" className="part-pay-copy" onClick={() => navigator.clipboard.writeText('123456789-12')}>Copiar</button></strong>
                    </div>
                    <div className="part-pay-bank-row"><span>Titular</span><strong>SKYED Eventos SAS</strong></div>
                    <div className="part-pay-bank-row">
                      <span>NIT</span>
                      <strong>900.123.456-7 <button type="button" className="part-pay-copy" onClick={() => navigator.clipboard.writeText('900123456-7')}>Copiar</button></strong>
                    </div>
                    <div className="part-pay-bank-row"><span>Referencia (poner en descripción)</span><strong className="part-pay-ref">{referenciaPago}</strong></div>
                  </div>
                )}

                {metodoPago === 'nequi' && (
                  <div className="part-pay-bank">
                    <div className="part-pay-bank-title"><i className="ti ti-device-mobile" aria-hidden="true" /> Datos para Nequi / Daviplata</div>
                    <div className="part-pay-bank-row">
                      <span>Número</span>
                      <strong>300 123 4567 <button type="button" className="part-pay-copy" onClick={() => navigator.clipboard.writeText('3001234567')}>Copiar</button></strong>
                    </div>
                    <div className="part-pay-bank-row"><span>Titular</span><strong>SKYED Eventos SAS</strong></div>
                    <div className="part-pay-bank-row"><span>Referencia (poner en el mensaje)</span><strong className="part-pay-ref">{referenciaPago}</strong></div>
                  </div>
                )}

                {metodoPago === 'efectivo' && (
                  <div className="part-pay-bank">
                    <div className="part-pay-bank-title"><i className="ti ti-cash" aria-hidden="true" /> Pago en efectivo</div>
                    <p className="part-form-hint" style={{ margin: 0 }}>Acércate al punto de inscripción del evento el día indicado y paga en efectivo. Tu cupo queda pendiente hasta ese momento.</p>
                  </div>
                )}

                {metodoPago !== 'efectivo' && (
                  <>
                    <div className="part-pay-warning">
                      <i className="ti ti-alert-triangle" aria-hidden="true" />
                      <span>Realiza la transferencia por el valor exacto y adjunta el comprobante. Tu inscripción quedará en estado <strong>pendiente</strong> hasta que validemos el pago.</span>
                    </div>

                    <div className="part-form-group">
                      <label htmlFor="comprobante">Comprobante de pago *</label>
                      <label
                        htmlFor="comprobante"
                        className={`part-pay-upload${arrastrando ? ' dragover' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); if (!validandoComprobante) setArrastrando(true); }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setArrastrando(false);
                          if (validandoComprobante) return;
                          if (e.dataTransfer.files?.[0]) manejarComprobante(e.dataTransfer.files[0]);
                        }}
                      >
                        <i className={validandoComprobante ? 'ti ti-loader-2' : 'ti ti-cloud-upload'} aria-hidden="true" />
                        {validandoComprobante ? (
                          <span>Validando comprobante (QR y datos de la transacción)…</span>
                        ) : comprobante ? (
                          <span>{comprobante.name}</span>
                        ) : (
                          <>
                            <span>Arrastra tu comprobante aquí o haz clic</span>
                            <span className="part-pay-upload-hint">Formatos aceptados: JPG, PNG, PDF · Máximo 5 MB</span>
                          </>
                        )}
                      </label>
                      <input
                        id="comprobante"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        style={{ display: 'none' }}
                        disabled={validandoComprobante}
                        onChange={(e) => manejarComprobante(e.target.files?.[0] ?? null)}
                      />
                      {!validandoComprobante && comprobante && (
                        <p className="part-form-hint" style={{ margin: '.4rem 0 0', color: '#16a34a' }}>
                          <i className="ti ti-circle-check" aria-hidden="true" /> Comprobante validado: QR y datos de la transacción detectados.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {msg && (
                  <div className={`part-form-alert ${msg.tipo}`} key={msg.id}>
                    <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                    {msg.texto}
                    <div className="part-alert-timer" />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '.6rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Volver</button>
                  <button type="button" className="btn btn-primary" disabled={validandoComprobante} onClick={irARevision}>
                    Revisar inscripción <i className="ti ti-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && !done && (
            <div className="part-card">
              <div className="part-card-head">
                <span className="part-card-head-icon"><i className="ti ti-clipboard-check" aria-hidden="true" /></span>
                <h3>Resumen de inscripción</h3>
              </div>
              <div className="part-card-body">
                <p className="part-form-hint" style={{ margin: '0 0 .9rem' }}>Revisa que todo esté correcto antes de confirmar tu lugar.</p>

                <div className="part-review-block">
                  <div className="part-review-title">Evento</div>
                  <div className="part-review-row"><span>Nombre</span><strong>{evento.nombre}</strong></div>
                  <div className="part-review-row"><span>Fecha</span><strong>{evento.fecha} · {evento.hora}</strong></div>
                  <div className="part-review-row"><span>Lugar</span><strong>{evento.ubicacion}</strong></div>
                  <div className="part-review-row">
                    <span>Categoría competencia</span>
                    <strong>{categorias.find((c) => c.id === categoriaId)?.nombre || '—'}</strong>
                  </div>
                </div>

                <div className="part-review-block">
                  <div className="part-review-title">Participante</div>
                  <div className="part-review-row"><span>Nombre</span><strong>{user?.name}</strong></div>
                  <div className="part-review-row"><span>Documento</span><strong>{documento}</strong></div>
                  <div className="part-review-row"><span>Correo</span><strong>{user?.email}</strong></div>
                  <div className="part-review-row"><span>Kit</span><strong>{deseaJersey ? 'Incluido' : 'Sin kit'}</strong></div>
                  <div className="part-review-row"><span>Dorsal preferido</span><strong>{dorsalPreferido || '—'}</strong></div>
                </div>

                <div className="part-review-block">
                  <div className="part-review-title">Pago</div>
                  <div className="part-review-row">
                    <span>Método</span>
                    <strong>{metodoPago === 'transferencia' ? 'Transferencia bancaria' : metodoPago === 'nequi' ? 'Nequi / Daviplata' : 'Efectivo'}</strong>
                  </div>
                  {comprobante && (
                    <div className="part-review-row"><span>Comprobante</span><strong>{comprobante.name}</strong></div>
                  )}
                  <div className="part-review-total"><span>Total a pagar</span><strong>{fmtMoney(total)}</strong></div>
                </div>

                <div className="part-review-terms">
                  <strong>Términos y condiciones de inscripción SKYED</strong>
                  <p style={{ margin: '.5rem 0 0' }}>
                    Al confirmar tu inscripción aceptas que: (1) la inscripción es personal e intransferible;
                    (2) SKYED no realiza reembolsos una vez confirmada la inscripción, salvo cancelación oficial
                    del evento; (3) participas bajo tu propia responsabilidad y cuentas con aptitud física adecuada
                    para la modalidad elegida; (4) autorizas a SKYED a usar fotografías y videos del evento en los
                    que aparezcas para fines promocionales.
                  </p>
                </div>

                <label className="part-review-check">
                  <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
                  <span>
                    Acepto los{' '}
                    <button type="button" className="part-link-terminos" onClick={() => setTermsOpen(true)}>
                      términos y condiciones
                    </button>
                    {' '}y la{' '}
                    <button type="button" className="part-link-terminos" onClick={() => setTermsOpen(true)}>
                      política de privacidad
                    </button>
                    {' '}*
                  </span>
                </label>
                {!aceptaTerminos && <p className="part-form-hint" style={{ margin: '0 0 .7rem' }}>Debes aceptar los términos para continuar</p>}

                <label className="part-review-check">
                  <input type="checkbox" checked={aceptaCondicionFisica} onChange={(e) => setAceptaCondicionFisica(e.target.checked)} />
                  <span>Declaro estar en condiciones físicas adecuadas para participar en el evento y no tengo contraindicaciones médicas que me impidan hacerlo.</span>
                </label>
                {!aceptaCondicionFisica && <p className="part-form-hint" style={{ margin: '0 0 .9rem' }}>Debes confirmar tu estado de salud</p>}

                {msg && (
                  <div className={`part-form-alert ${msg.tipo}`} key={msg.id}>
                    <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                    {msg.texto}
                    <div className="part-alert-timer" />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '.6rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                    <i className="ti ti-arrow-left" aria-hidden="true" /> Volver al pago
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={enviando || !aceptaTerminos || !aceptaCondicionFisica}
                    onClick={confirmarInscripcion}
                  >
                    <i className="ti ti-lock" aria-hidden="true" /> {enviando ? 'Enviando…' : 'Confirmar inscripción'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ASUNCIÓN: pantalla de éxito reconstruida — no tengo el
              contenido original que se perdió. Compárala con la que
              recuperes de la Línea de Tiempo/git si quieres el diseño
              exacto de antes (p. ej. si mostraba el QR aquí mismo). */}
          {step === 3 && done && (
            <div className="part-card">
              <div className="part-card-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ margin: '0 0 .5rem' }}>¡Inscripción confirmada!</h2>
                <p className="part-form-hint" style={{ margin: '0 0 1.5rem' }}>
                  Te enviamos un correo con tu código QR de entrada. También puedes verlo cuando quieras desde tu perfil.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => nav(`/deportivo/mi-entrada/${evento.id}`)}>
                  Ver mi entrada <i className="ti ti-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ASUNCIÓN: tarjeta lateral reconstruida — mismo problema,
            no tengo el original. Ajusta clases/estructura si difiere
            de lo que tenías. */}
        <div className="part-card" style={{ position: 'sticky', top: '1.5rem' }}>
          {evento.imagen_url && (
            <img src={evento.imagen_url} alt={evento.nombre} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '12px 12px 0 0' }} />
          )}
          <div className="part-card-body">
            <span className="part-badge" style={{ display: 'inline-block', marginBottom: '.5rem' }}>{evento.categoria}</span>
            <h3 style={{ margin: '0 0 .75rem' }}>{evento.nombre}</h3>
            <div className="part-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', margin: '0 0 .35rem' }}>
              <i className="ti ti-calendar" aria-hidden="true" /> {evento.fecha}
            </div>
            <div className="part-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', margin: '0 0 .35rem' }}>
              <i className="ti ti-clock" aria-hidden="true" /> {evento.hora}
            </div>
            <div className="part-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', margin: '0 0 .35rem' }}>
              <i className="ti ti-map-pin" aria-hidden="true" /> {evento.ubicacion}
            </div>
            <div className="part-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', margin: '0 0 .9rem' }}>
              <i className="ti ti-users" aria-hidden="true" /> {evento.cupos_disponibles} cupos disponibles
            </div>

            <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: '.75rem' }}>
              <div className="part-review-row"><span>Inscripción</span><strong>{fmtMoney(evento.precio)}</strong></div>
              <div className="part-review-row"><span>Kit de bienvenida</span><strong>{deseaJersey ? fmtMoney(evento.kit?.precio) : 'No incluido'}</strong></div>
            </div>
            <div className="part-review-total"><span>Total</span><strong>{fmtMoney(total)}</strong></div>

            <span
              className="part-badge"
              style={{
                display: 'inline-block', marginTop: '.75rem',
                background: evento.cupos_disponibles > 0 ? 'color-mix(in srgb, #16a34a 15%, transparent)' : 'color-mix(in srgb, #dc2626 15%, transparent)',
                color: evento.cupos_disponibles > 0 ? '#16a34a' : '#dc2626',
              }}
            >
              {evento.cupos_disponibles > 0 ? 'Cupos disponibles' : 'Sin cupos'}
            </span>
          </div>
        </div>
      </div>

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => setAceptaTerminos(true)}
        variant="deportivo"
      />
    </div>
  );
}