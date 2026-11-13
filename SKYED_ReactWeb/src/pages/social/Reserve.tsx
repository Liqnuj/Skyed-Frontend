import { useState, useEffect, type FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { useAuth } from '../../context/AuthContext'; // Importamos el contexto de autenticación
import { apiFetch } from '../../services/api';
import '../../styles/social/reservaForm.css';
import { capitalizar } from '../../utils/texto';

function capitalizeName(raw: string) {
  let cleaned = raw
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 20);

  return cleaned
    .split(' ')
    .map(word => {
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(' ');
}

function sanitizeNumeric(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 15);
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Definimos la interfaz para el tipo de evento que vendrá de la API
interface TipoEvento {
  id_tipo_eves: number;
  nombre_tipo_eves: string;
}

// Pasos del formulario (el wizard).
const PASOS = [
  { titulo: 'Tus datos', sub: 'Para enviarte la propuesta' },
  { titulo: 'Tu evento', sub: 'Qué quieres celebrar y cuándo' },
  { titulo: 'Detalles', sub: 'Para dimensionar tu propuesta' },
  { titulo: 'Tu visión', sub: 'Cuéntanos cómo lo imaginas' },
];
const ULTIMO_PASO = PASOS.length - 1;

// Una falla de validación, con el paso del wizard al que pertenece el campo.
interface Falla {
  id: string;
  etiqueta: string;
  motivo: string;
  obligatorio: boolean;
  paso: number;
}

export default function Reserve() {
  const { user } = useAuth(); // Extraemos el usuario autenticado
  const [paso, setPaso] = useState(0); // Paso actual del wizard (0 a 3)

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [fphone, setFphone] = useState('');
  const [femail, setFemail] = useState('');
  
  const [ftype, setFtype] = useState('');
  const [fdate, setFdate] = useState('');
  const [fguests, setFguests] = useState('');
  const [fbudget, setFbudget] = useState('');
  const [flocation, setFlocation] = useState(''); // Nuevo estado para Ubicación
  // Datos opcionales que ayudan a planificar (el cliente puede dejarlos vacíos).
  const [fflexible, setFflexible] = useState(false);
  const [fdateTo, setFdateTo] = useState('');
  const [ftime, setFtime] = useState('');
  const [fduration, setFduration] = useState('');
  const [fservicios, setFservicios] = useState<number[]>([]);
  const [catalogo, setCatalogo] = useState<Array<{ id: number; nombre: string }>>([]);
  // Hoy en Colombia (para no permitir fechas pasadas en el calendario).
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const [fmessage, setFmessage] = useState('');

  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);

  // Errores por campo (id del campo -> mensaje). Se muestran en rojo debajo de cada campo.
  const [errores, setErrores] = useState<Record<string, string>>({});
  const limpiar = (id: string) =>
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  const grupo = (id: string, extra = '') =>
    `form-group${extra ? ` ${extra}` : ''}${errores[id] ? ' rsv-invalid' : ''}`;
  const mensaje = (id: string) =>
    errores[id] ? (
      <span className="rsv-error" role="alert">
        {errores[id]}
      </span>
    ) : null;
  const req = (
    <span className="rsv-req" aria-hidden="true">
      {' '}*
    </span>
  );

  const [toast, setToast] = useState<{ msg: string; icon: string; show: boolean }>({
    msg: '',
    icon: '✓',
    show: false,
  });

  // EFECTO 1: Autocompletar datos del usuario si está logueado
    useEffect(() => {
      if (user) {
        // Lógica inteligente para separar el nombre
        const parts = user.name ? user.name.split(' ') : [];
        let nombreCalculado = parts[0] || '';
        let apellidoCalculado = parts.slice(1).join(' ') || '';

        // Si el nombre tiene 4 palabras o más, divide 2 y 2
        if (parts.length >= 4) {
          nombreCalculado = parts.slice(0, 2).join(' ');
          apellidoCalculado = parts.slice(2).join(' ');
        }

        setFname(nombreCalculado);
        setLname(apellidoCalculado);
        setFphone(user.telefono || '');
        setFemail(user.email || '');
      }
    }, [user]);

  // EFECTO 2: Cargar Tipos de Evento desde la API
  useEffect(() => {
      const fetchTiposEvento = async () => {
        try {
          // Solo los tipos de Social (bodas, cumpleaños, ...).
          const data = await apiFetch('/tipos-evento?modulo=social');
          console.log("Lo que responde Laravel:", data); // Para revisar en consola
          
          if (Array.isArray(data)) {
            setTiposEvento(data);
          } else if (data && Array.isArray(data.data)) {
            setTiposEvento(data.data); // Por si Laravel lo envolvió en un objeto "data"
          } else {
            setTiposEvento([]); // Si no es un arreglo, lo dejamos vacío para que no falle
          }
        } catch (error) {
          console.error("Error cargando los tipos de evento:", error);
          setTiposEvento([]);
        }
      };
      fetchTiposEvento();
    }, []);

  // EFECTO 3: Servicios que el cliente puede pedir (opcional)
  useEffect(() => {
    apiFetch('/servicios?per_page=200')
      .then((r) => {
        const lista = Array.isArray(r) ? r : r?.data ?? [];
        setCatalogo(
          lista
            .map((s: any) => ({ id: Number(s.id ?? s.id_s), nombre: String(s.nombre ?? s.nombre_s ?? '') }))
            .filter((s: { id: number; nombre: string }) => s.id && s.nombre),
        );
      })
      .catch(() => setCatalogo([]));
  }, []);

  function showToast(msg: string, icon = '✓') {
    setToast({ msg, icon, show: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 6000);
  }

  // Revisa el formulario completo y devuelve las fallas, cada una con su paso.
  function validar(): Falla[] {
    const n = capitalizeName(fname);
    const a = capitalizeName(lname);
    if (n !== fname) setFname(n);
    if (a !== lname) setLname(a);

    const phone = fphone.trim();
    const email = femail.trim();
    const guests = fguests.trim();
    const location = flocation.trim();

    const fallas: Falla[] = [];
    const falta = (paso: number, id: string, etiqueta: string) =>
      fallas.push({ id, etiqueta, motivo: 'Este campo es obligatorio', obligatorio: true, paso });
    const invalido = (paso: number, id: string, etiqueta: string, motivo: string) =>
      fallas.push({ id, etiqueta, motivo, obligatorio: false, paso });

    // Paso 1 · Tus datos
    if (!n) falta(0, 'fname', 'Nombre');
    else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(n)) invalido(0, 'fname', 'Nombre', 'Solo letras, máximo 20 caracteres');

    if (!a) falta(0, 'lname', 'Apellido');
    else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(a)) invalido(0, 'lname', 'Apellido', 'Solo letras, máximo 20 caracteres');

    if (phone && !/^\d+$/.test(phone)) invalido(0, 'fphone', 'Teléfono', 'Solo puede contener números');

    if (!email) falta(0, 'femail', 'Correo electrónico');
    else if (!validateEmail(email)) invalido(0, 'femail', 'Correo electrónico', 'Ingresa un correo válido');

    // Paso 2 · Tu evento
    if (!ftype) falta(1, 'ftype', 'Tipo de evento');

    const etiquetaFecha = fflexible ? 'Fecha desde' : 'Fecha estimada';
    if (!fdate) falta(1, 'fdate', etiquetaFecha);
    else if (fdate < hoy) invalido(1, 'fdate', etiquetaFecha, 'No puede ser anterior a hoy');

    if (fflexible) {
      if (!fdateTo) falta(1, 'fdateTo', 'Fecha hasta');
      else if (fdate && fdateTo < fdate) invalido(1, 'fdateTo', 'Fecha hasta', 'No puede ser anterior a la fecha inicial');
    }

    // Paso 3 · Detalles
    if (!guests) falta(2, 'fguests', 'N° de invitados');
    else if (!/^\d+$/.test(guests) || Number(guests) < 1) invalido(2, 'fguests', 'N° de invitados', 'Debe ser un número mayor a 0');

    if (!location) falta(2, 'flocation', 'Ubicación del evento');
    if (!fbudget) falta(2, 'fbudget', 'Presupuesto aprox.');

    if (fduration && (!/^\d+$/.test(fduration) || Number(fduration) < 1 || Number(fduration) > 72)) {
      invalido(2, 'fduration', 'Duración', 'Debe estar entre 1 y 72 horas');
    }

    // Paso 4 · Tu visión: es opcional, no tiene validaciones.
    return fallas;
  }

  // Cambia de paso y, si la tarjeta quedó por encima de la pantalla, vuelve a mostrarla.
  function irAPaso(n: number) {
    setPaso(Math.max(0, Math.min(n, ULTIMO_PASO)));
    window.setTimeout(() => {
      const tarjeta = document.getElementById('contactForm');
      if (tarjeta && tarjeta.getBoundingClientRect().top < 0) {
        tarjeta.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  // Marca los errores en rojo, avisa con el toast y lleva al primer campo con problema.
  function mostrarFallas(fallas: Falla[]) {
    const mapa: Record<string, string> = {};
    fallas.forEach((f) => { mapa[f.id] = f.motivo; });
    setErrores(mapa);

    const faltantes = fallas.filter((f) => f.obligatorio).map((f) => f.etiqueta);
    let texto: string;
    if (faltantes.length === 1) texto = `Falta un campo obligatorio: ${faltantes[0]}`;
    else if (faltantes.length > 1) texto = `Faltan campos obligatorios: ${faltantes.join(', ')}`;
    else texto = `${fallas[0].etiqueta}: ${fallas[0].motivo}`;
    showToast(texto, '⚠️');

    // Pequeña espera: si cambiamos de paso, el campo tiene que estar visible antes de enfocarlo.
    window.setTimeout(() => {
      const primero = document.getElementById(fallas[0].id);
      if (primero) {
        primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => (primero as HTMLElement).focus({ preventScroll: true }), 300);
      }
    }, 100);
  }

  function siguiente() {
    const fallas = validar().filter((f) => f.paso === paso);
    if (fallas.length > 0) {
      mostrarFallas(fallas);
      return;
    }
    setErrores({});
    irAPaso(paso + 1);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();

    // Enter en un paso intermedio = "Siguiente". Solo se envía en el último paso.
    if (paso < ULTIMO_PASO) {
      siguiente();
      return;
    }

    const fallas = validar();
    if (fallas.length > 0) {
      irAPaso(fallas[0].paso); // Volvemos al paso donde está el primer problema.
      mostrarFallas(fallas);
      return;
    }
    setErrores({});

    const guests = fguests.trim();
    const location = flocation.trim();

  try {
        await apiFetch('/reservas', {
          method: 'POST',
          body: JSON.stringify({
            id_u: user?.id,
            id_tipo_eves: ftype,
            fecha_evento_rese: fdate,
            invitados_rese: guests,
            presupuesto_rese: fbudget,
            ubicacion_rese: location,
            Observaciones_rese: fmessage,
            // Opcionales: solo se envían si el cliente los llenó.
            ...(fflexible ? { fecha_hasta_rese: fdateTo } : {}),
            ...(ftime ? { hora_aprox_rese: ftime } : {}),
            ...(fduration ? { duracion_horas_rese: Number(fduration) } : {}),
            ...(fservicios.length ? { servicios_solicitados: fservicios.map((id) => ({ id_s: id })) } : {}),
          })
        });

        showToast('¡Solicitud enviada! Te contactamos en 24h 🎉', '✦');
        
        // Limpiamos los campos
        setFtype('');
        setFdate('');
        setFguests('');
        setFbudget('');
        setFlocation('');
        setFmessage('');
        setFflexible(false);
        setFdateTo('');
        setFtime('');
        setFduration('');
        setFservicios([]);
        setPaso(0);

        // Si no hay sesión, también se limpian los datos de contacto.
        if (!user) {
          setFname('');
          setLname('');
          setFphone('');
          setFemail('');
        }
      } catch (error) {
        // Se conserva lo escrito para que el cliente corrija sin volver a empezar.
        showToast(error instanceof Error && error.message ? error.message : 'Error al enviar la solicitud. Intenta de nuevo.', '⚠️');
        console.error(error);
      }
  }

  return (
    <SocialWrapper>
      <div className="page-hero" id="nsHero">
        <CanvasParticles id="nsHeroParticles" />
        <div className="hero-overlay"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="page-hero-title reveal">
            Hagamos realidad
            <br />
            <em>tu evento soñado</em>
          </h1>
          <p className="page-hero-sub reveal">
            Cuéntanos tu idea y te enviamos una propuesta personalizada en menos de 24 horas.
          </p>
        </div>
      </div>

      {/* CONTACT */}
      <section className="booking-section" id="contacto">
        <div className="container">
          <div className="booking-grid">
            <div className="booking-info reveal">
              <span className="section-label">Contáctanos</span>

              <h2 className="section-title">
                Estamos listos
                <br />
                <em className="section-title-highlight">para ayudarte</em>
              </h2>

              <p className="section-sub">
                Cuéntanos tu idea y nuestro equipo de expertos te enviará una propuesta personalizada en menos de
                24 horas.
              </p>
              <div className="booking-proceso">
                <h3 className="booking-proceso-titulo">¿Qué pasa después?</h3>
                <ol className="booking-proceso-lista">
                  <li>
                    <span aria-hidden="true">1</span>
                    <div>
                      <strong>Envías tu solicitud</strong>
                      <small>Toma menos de 2 minutos</small>
                    </div>
                  </li>
                  <li>
                    <span aria-hidden="true">2</span>
                    <div>
                      <strong>Te contactamos</strong>
                      <small>En menos de 24 horas</small>
                    </div>
                  </li>
                  <li>
                    <span aria-hidden="true">3</span>
                    <div>
                      <strong>Recibes tu propuesta</strong>
                      <small>Personalizada y sin compromiso</small>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div className="booking-form reveal" id="contactForm">
              <div className="form-title">Solicita tu cotización gratuita</div>
              <form onSubmit={submitForm} noValidate>
                <ol className="rsv-pasos" aria-label="Progreso de la solicitud">
                  {PASOS.map((p, i) => (
                    <li
                      key={p.titulo}
                      className={`rsv-paso-item${i === paso ? ' activo' : ''}${i < paso ? ' hecho' : ''}`}
                      aria-current={i === paso ? 'step' : undefined}
                    >
                      <button
                        type="button"
                        className="rsv-paso-btn"
                        disabled={i > paso}
                        onClick={() => irAPaso(i)}
                        aria-label={`Paso ${i + 1}: ${p.titulo}`}
                      >
                        <span className="rsv-paso-num">{i < paso ? '✓' : i + 1}</span>
                        <span className="rsv-paso-nombre">{p.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ol>

                <p className="rsv-leyenda">
                  Los campos con <span className="rsv-req">*</span> son obligatorios.
                </p>

                <div className="rsv-paso" hidden={paso !== 0}>
                  <div className="rsv-paso-cab">
                    <div>
                      <h4>{PASOS[0].titulo}</h4>
                      <p>{PASOS[0].sub}</p>
                    </div>
                    <span className="rsv-contador">Paso 1 de {PASOS.length}</span>
                  </div>
                  <div className="form-row">
                    <div className={grupo('fname')}>
                      <label htmlFor="fname">Nombre{req}</label>
                      <input
                        type="text"
                        id="fname"
                        placeholder="Ej: María"
                        maxLength={20}
                        value={fname}
                        onChange={(e) => { setFname(capitalizeName(e.target.value)); limpiar('fname'); }}
                        onBlur={(e) => setFname(capitalizeName(e.target.value))}
                      />
                      {mensaje('fname')}
                    </div>
                    <div className={grupo('lname')}>
                      <label htmlFor="lname">Apellido{req}</label>
                      <input
                        type="text"
                        id="lname"
                        placeholder="Ej: García"
                        maxLength={20}
                        value={lname}
                        onChange={(e) => { setLname(capitalizeName(e.target.value)); limpiar('lname'); }}
                        onBlur={(e) => setLname(capitalizeName(e.target.value))}
                      />
                      {mensaje('lname')}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className={grupo('fphone')}>
                      <label htmlFor="fphone">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        id="fphone"
                        placeholder="3000000000"
                        inputMode="numeric"
                        value={fphone}
                        onChange={(e) => { setFphone(sanitizeNumeric(e.target.value)); limpiar('fphone'); }}
                      />
                      {mensaje('fphone')}
                    </div>
                    <div className={grupo('femail')}>
                      <label htmlFor="femail">Correo electrónico{req}</label>
                      <input
                        type="email"
                        id="femail"
                        placeholder="tu@correo.com"
                        value={femail}
                        onChange={(e) => { setFemail(e.target.value); limpiar('femail'); }}
                      />
                      {mensaje('femail')}
                    </div>
                  </div>
                </div>
                <div className="rsv-paso" hidden={paso !== 1}>
                  <div className="rsv-paso-cab">
                    <div>
                      <h4>{PASOS[1].titulo}</h4>
                      <p>{PASOS[1].sub}</p>
                    </div>
                    <span className="rsv-contador">Paso 2 de {PASOS.length}</span>
                  </div>
                  <div className="form-row">
                    <div className={grupo('ftype', fflexible ? 'span-two' : '')}>
                      <label htmlFor="ftype">Tipo de evento{req}</label>
                      <select id="ftype" value={ftype} onChange={(e) => { setFtype(e.target.value); limpiar('ftype'); }}>
                        <option value="">Seleccionar...</option>
                        {Array.isArray(tiposEvento) && tiposEvento.map((tipo) => (
                          <option key={tipo.id_tipo_eves} value={tipo.id_tipo_eves}>
                            {tipo.nombre_tipo_eves}
                          </option>
                        ))}
                      </select>
                      {mensaje('ftype')}
                    </div>

                    {/* Con fecha flexible este campo se oculta: se pide un rango más abajo. */}
                    {!fflexible && (
                      <div className={grupo('fdate')}>
                        <label htmlFor="fdate">Fecha estimada{req}</label>
                        <input
                          type="date"
                          id="fdate"
                          min={hoy}
                          value={fdate}
                          onChange={(e) => { setFdate(e.target.value); limpiar('fdate'); }}
                        />
                        {mensaje('fdate')}
                      </div>
                    )}
                  </div>

                  <label className="rsv-switch">
                    <input
                      type="checkbox"
                      checked={fflexible}
                      onChange={(e) => {
                        setFflexible(e.target.checked);
                        limpiar('fdate');
                        limpiar('fdateTo');
                        if (!e.target.checked) setFdateTo('');
                      }}
                    />
                    <span className="rsv-switch-track" aria-hidden="true" />
                    <span className="rsv-switch-texto">
                      <strong>Mi fecha es flexible</strong>
                      <small>No tengo una fecha exacta: dime entre qué días podría celebrarse.</small>
                    </span>
                  </label>

                  {fflexible && (
                    <div className="rsv-rango">
                      <div className="form-row">
                        <div className={grupo('fdate')}>
                          <label htmlFor="fdate">Desde{req}</label>
                          <input
                            type="date"
                            id="fdate"
                            min={hoy}
                            value={fdate}
                            onChange={(e) => { setFdate(e.target.value); limpiar('fdate'); }}
                          />
                          {mensaje('fdate')}
                        </div>
                        <div className={grupo('fdateTo')}>
                          <label htmlFor="fdateTo">Hasta{req}</label>
                          <input
                            type="date"
                            id="fdateTo"
                            min={fdate || hoy}
                            value={fdateTo}
                            onChange={(e) => { setFdateTo(e.target.value); limpiar('fdateTo'); }}
                          />
                          {mensaje('fdateTo')}
                        </div>
                      </div>
                      <span className="rsv-ayuda">Nuestro equipo te propondrá una fecha dentro de ese rango.</span>
                    </div>
                  )}
                </div>
                <div className="rsv-paso" hidden={paso !== 2}>
                  <div className="rsv-paso-cab">
                    <div>
                      <h4>{PASOS[2].titulo}</h4>
                      <p>{PASOS[2].sub}</p>
                    </div>
                    <span className="rsv-contador">Paso 3 de {PASOS.length}</span>
                  </div>
                  <div className="form-row">
                    <div className={grupo('fguests')}>
                      <label htmlFor="fguests">N° de invitados{req}</label>
                      <input
                        type="text"
                        id="fguests"
                        placeholder="Ej: 150"
                        inputMode="numeric"
                        value={fguests}
                        onChange={(e) => { setFguests(sanitizeNumeric(e.target.value)); limpiar('fguests'); }}
                      />
                      {mensaje('fguests')}
                    </div>
                    <div className={grupo('flocation')}>
                      <label htmlFor="flocation">Ubicación del evento{req}</label>
                      <input
                        type="text"
                        id="flocation"
                        placeholder="Ciudad o Salón"
                        value={flocation}
                        onChange={(e) => setFlocation(capitalizar(e.target.value))}

                      />
                      {mensaje('flocation')}
                    </div>
                  </div>

                  <div className={grupo('fbudget')}>
                    <label htmlFor="fbudget">Presupuesto aprox.{req}</label>
                    {/* Se ajustan los values a formato numérico para que cuadre con DECIMAL en BD */}
                    <select id="fbudget" value={fbudget} onChange={(e) => { setFbudget(e.target.value); limpiar('fbudget'); }}>
                      <option value="">Seleccionar...</option>
                      <option value="5000000">Menos de $10M COP</option>
                      <option value="15000000">$10M – $20M COP</option>
                      <option value="30000000">$20M – $40M COP</option>
                      <option value="50000000">Más de $40M COP</option>
                    </select>
                    {mensaje('fbudget')}
                  </div>

                  {/* OPCIONAL: ayuda a planificar, se puede dejar cerrado */}
                  <details className="rsv-opcional" open={!!errores.fduration || undefined}>
                    <summary>
                      Más detalles que nos ayudan a planificar
                      <span className="rsv-tag">Opcional</span>
                    </summary>
                    <div className="rsv-opcional-cuerpo">
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="ftime">Hora aproximada</label>
                          <input type="time" id="ftime" value={ftime} onChange={(e) => setFtime(e.target.value)} />
                        </div>
                        <div className={grupo('fduration')}>
                          <label htmlFor="fduration">Duración en horas</label>
                          <input
                            type="text"
                            id="fduration"
                            placeholder="Ej: 6"
                            inputMode="numeric"
                            maxLength={2}
                            value={fduration}
                            onChange={(e) => { setFduration(e.target.value.replace(/\D/g, '').slice(0, 2)); limpiar('fduration'); }}
                          />
                          {mensaje('fduration')}
                        </div>
                      </div>

                      {catalogo.length > 0 && (
                        <>
                          <span className="rsv-sublabel">Servicios que te interesan</span>
                          <div className="rsv-chips" role="group" aria-label="Servicios que te interesan">
                            {catalogo.map((s) => (
                              <label key={s.id} className="rsv-chip">
                                <input
                                  type="checkbox"
                                  checked={fservicios.includes(s.id)}
                                  onChange={(e) =>
                                    setFservicios((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                                  }
                                />
                                <span>{s.nombre}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                </div>
                <div className="rsv-paso" hidden={paso !== 3}>
                  <div className="rsv-paso-cab">
                    <div>
                      <h4>{PASOS[3].titulo}</h4>
                      <p>{PASOS[3].sub}</p>
                    </div>
                    <span className="rsv-contador">Paso 4 de {PASOS.length}</span>
                  </div>
                  <div className="form-group">
                    <textarea
                      id="fmessage"
                      aria-label="Cuéntanos tu visión"
                      placeholder="¿Qué imaginas para tu evento? Tema, estilo, detalles especiales..."
                      value={fmessage}
                      onChange={(e) => setFmessage(capitalizar(e.target.value))}
                    />
                  </div>
                </div>
                <div className="rsv-nav">
                  {paso > 0 && (
                    <button type="button" className="rsv-btn-atras" onClick={() => irAPaso(paso - 1)}>
                      ← Atrás
                    </button>
                  )}
                  <button className="form-submit" type="submit">
                    {paso < ULTIMO_PASO ? 'Siguiente →' : '✦ Enviar solicitud'}
                  </button>
                </div>
                <p className="rsv-nota">Tus datos solo se usan para contactarte sobre tu evento.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Toast */}
      <div className={`toast${toast.show ? ' show' : ''}`} id="toast">
        <span className="toast-icon" id="toastIcon">
          {toast.icon}
        </span>
        <span id="toastMsg">{toast.msg}</span>
      </div>
    </SocialWrapper>
  );
}