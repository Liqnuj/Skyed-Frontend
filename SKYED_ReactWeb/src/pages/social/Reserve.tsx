import { useState, useEffect, type FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { useAuth } from '../../context/AuthContext'; // Importamos el contexto de autenticación
import { apiFetch } from '../../services/api';
import '../../styles/social/reservaForm.css';

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

export default function Reserve() {
  const { user } = useAuth(); // Extraemos el usuario autenticado

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
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();

    const n = capitalizeName(fname);
    const a = capitalizeName(lname);
    if (n !== fname) setFname(n);
    if (a !== lname) setLname(a);

    const phone = fphone.trim();
    const email = femail.trim();
    const guests = fguests.trim();
    const location = flocation.trim();

    if (!n || !a || !email || !ftype || !guests || !location || !fbudget || !fdate) {
      showToast('Por favor completa los campos requeridos', '⚠️');
      return;
    }
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(n) || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(a)) {
      showToast('Nombre y apellido solo pueden tener letras y máximo 20 caracteres', '⚠️');
      return;
    }
    if (phone && !/^\d+$/.test(phone)) {
      showToast('El teléfono solo puede contener números', '⚠️');
      return;
    }
    if (!/^\d+$/.test(guests) || Number(guests) < 0) {
      showToast('El número de invitados solo puede ser numérico y positivo', '⚠️');
      return;
    }
    if (!validateEmail(email)) {
      showToast('Ingresa un correo electrónico válido', '⚠️');
      return;
    }
    if (fdate < hoy) {
      showToast('La fecha del evento no puede ser anterior a hoy', '⚠️');
      return;
    }
    if (fflexible && fdateTo && fdateTo < fdate) {
      showToast('La fecha final no puede ser anterior a la fecha estimada', '⚠️');
      return;
    }
    if (fduration && (!/^\d+$/.test(fduration) || Number(fduration) < 1 || Number(fduration) > 72)) {
      showToast('La duración debe estar entre 1 y 72 horas', '⚠️');
      return;
    }

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
            ...(fflexible && fdateTo ? { fecha_hasta_rese: fdateTo } : {}),
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
              <ul className="booking-features">
                <li className="booking-feat">
                  <div className="booking-feat-icon">📍</div>
                  <div className="booking-feat-text">
                    <strong>Bogotá, Colombia</strong>
                    <span>Servicio en toda Colombia y el exterior</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">📞</div>
                  <div className="booking-feat-text">
                    <strong>+57 317 703 7517</strong>
                    <span>Lunes a sábado, 8am – 8pm</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">✉️</div>
                  <div className="booking-feat-text">
                    <strong>hola@skyedsocial.co</strong>
                    <span>Respuesta en menos de 24 horas</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">💬</div>
                  <div className="booking-feat-text">
                    <strong>WhatsApp directo</strong>
                    <span>Consultas rápidas por chat</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="booking-form reveal" id="contactForm">
              <div className="form-title">Solicita tu cotización gratuita</div>
              <form onSubmit={submitForm}>
                {/* 1 · DATOS DE CONTACTO */}
                <div className="rsv-seccion primera">
                  <span className="rsv-num">1</span>
                  <div>
                    <h4>Tus datos</h4>
                    <p>Para enviarte la propuesta</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      id="fname"
                      placeholder="Ej: María"
                      maxLength={20}
                      value={fname}
                      onChange={(e) => setFname(capitalizeName(e.target.value))}
                      onBlur={(e) => setFname(capitalizeName(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido</label>
                    <input
                      type="text"
                      id="lname"
                      placeholder="Ej: García"
                      maxLength={20}
                      value={lname}
                      onChange={(e) => setLname(capitalizeName(e.target.value))}
                      onBlur={(e) => setLname(capitalizeName(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      id="fphone"
                      placeholder="3000000000"
                      inputMode="numeric"
                      value={fphone}
                      onChange={(e) => setFphone(sanitizeNumeric(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      id="femail"
                      placeholder="tu@correo.com"
                      value={femail}
                      onChange={(e) => setFemail(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2 · EL EVENTO */}
                <div className="rsv-seccion">
                  <span className="rsv-num">2</span>
                  <div>
                    <h4>Tu evento</h4>
                    <p>Qué quieres celebrar y cuándo</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de evento</label>
                    <select id="ftype" value={ftype} onChange={(e) => setFtype(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {Array.isArray(tiposEvento) && tiposEvento.map((tipo) => (
                        <option key={tipo.id_tipo_eves} value={tipo.id_tipo_eves}>
                          {tipo.nombre_tipo_eves}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha estimada</label>
                    <input type="date" id="fdate" min={hoy} value={fdate} onChange={(e) => setFdate(e.target.value)} />
                  </div>
                </div>

                <label className="rsv-switch">
                  <input
                    type="checkbox"
                    checked={fflexible}
                    onChange={(e) => { setFflexible(e.target.checked); if (!e.target.checked) setFdateTo(''); }}
                  />
                  <span className="rsv-switch-track" aria-hidden="true" />
                  <span className="rsv-switch-texto">
                    <strong>Mi fecha es flexible</strong>
                    <small>Aún no la tengo definida; puede ser dentro de un rango de días.</small>
                  </span>
                </label>

                {fflexible && (
                  <div className="rsv-rango">
                    <div className="form-group">
                      <label>Podría ser hasta el (opcional)</label>
                      <input type="date" id="fdateTo" min={fdate || hoy} value={fdateTo} onChange={(e) => setFdateTo(e.target.value)} />
                      <span className="rsv-ayuda">Nuestro equipo te propondrá una fecha dentro de ese rango.</span>
                    </div>
                  </div>
                )}

                {/* 3 · DETALLES */}
                <div className="rsv-seccion">
                  <span className="rsv-num">3</span>
                  <div>
                    <h4>Detalles</h4>
                    <p>Para dimensionar tu propuesta</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° de invitados</label>
                    <input
                      type="text"
                      id="fguests"
                      placeholder="Ej: 150"
                      inputMode="numeric"
                      value={fguests}
                      onChange={(e) => setFguests(sanitizeNumeric(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ubicación del evento</label>
                    <input
                      type="text"
                      id="flocation"
                      placeholder="Ciudad o Salón"
                      value={flocation}
                      onChange={(e) => setFlocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Presupuesto aprox.</label>
                  {/* Se ajustan los values a formato numérico para que cuadre con DECIMAL en BD */}
                  <select id="fbudget" value={fbudget} onChange={(e) => setFbudget(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="5000000">Menos de $10M COP</option>
                    <option value="15000000">$10M – $20M COP</option>
                    <option value="30000000">$20M – $40M COP</option>
                    <option value="50000000">Más de $40M COP</option>
                  </select>
                </div>

                {/* OPCIONAL: ayuda a planificar, se puede dejar cerrado */}
                <details className="rsv-opcional">
                  <summary>
                    Más detalles que nos ayudan a planificar
                    <span className="rsv-tag">Opcional</span>
                  </summary>
                  <div className="rsv-opcional-cuerpo">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hora aproximada</label>
                        <input type="time" id="ftime" value={ftime} onChange={(e) => setFtime(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Duración en horas</label>
                        <input
                          type="text"
                          id="fduration"
                          placeholder="Ej: 6"
                          inputMode="numeric"
                          maxLength={2}
                          value={fduration}
                          onChange={(e) => setFduration(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        />
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

                {/* 4 · VISIÓN */}
                <div className="rsv-seccion">
                  <span className="rsv-num">4</span>
                  <div>
                    <h4>Tu visión</h4>
                    <p>Cuéntanos cómo lo imaginas</p>
                  </div>
                </div>

                <div className="form-group">
                  <textarea
                    id="fmessage"
                    aria-label="Cuéntanos tu visión"
                    placeholder="¿Qué imaginas para tu evento? Tema, estilo, detalles especiales..."
                    value={fmessage}
                    onChange={(e) => setFmessage(e.target.value)}
                  />
                </div>

                <button className="form-submit" type="submit">
                  ✦ Enviar solicitud
                </button>
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