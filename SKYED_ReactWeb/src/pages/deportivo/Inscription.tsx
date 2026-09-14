import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
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

function InscriptionWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [evento, setEvento] = useState<EventoInscripcion | null>(null);
  const [categorias, setCategorias] = useState<CategoriaCompetencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Datos del titular
  const [documento, setDocumento] = useState('');
  const [rh, setRh] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('');
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [deseaJersey, setDeseaJersey] = useState<boolean | null>(null);
  const [dorsalPreferido, setDorsalPreferido] = useState('');
  const [condicionesMedicas, setCondicionesMedicas] = useState('');

  // Invitado opcional
  const [mostrarInvitado, setMostrarInvitado] = useState(false);
  const [invTipoDocumento, setInvTipoDocumento] = useState('CC');
  const [invDocumento, setInvDocumento] = useState('');
  const [invNombre, setInvNombre] = useState('');
  const [invApellido, setInvApellido] = useState('');
  const [invRh, setInvRh] = useState('O+');
  const [invTelefono, setInvTelefono] = useState('');
  const [invFechaNacimiento, setInvFechaNacimiento] = useState('');
  const [invCorreo, setInvCorreo] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string; id: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/eventos/${id}`)
      .then((data) => setEvento(data.evento ?? null))
      .catch(() => setErrorCarga('No se pudo cargar la información del evento.'))
      .finally(() => setCargando(false));

    apiFetch(`/eventos/${id}/categorias`)
      .then((data) => setCategorias(data.categorias ?? []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (user) setDocumento((user as any).documento || '');
  }, [user]);

  function mostrarMsg(tipo: 'ok' | 'error', texto: string) {
    setMsg({ tipo, texto, id: Date.now() });
  }

  const precioKit = deseaJersey && evento?.kit ? Number(evento.kit.precio || 0) : 0;
  const total = (evento?.precio || 0) + precioKit;

  function irAPago(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;
    if (!categoriaId) {
      mostrarMsg('error', 'Selecciona una categoría de competencia.');
      return;
    }
    if (deseaJersey === null) {
      mostrarMsg('error', 'Indica si deseas adquirir el jersey.');
      return;
    }
    setStep(2);
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
      condiciones_medicas: condicionesMedicas || null,
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
            <form onSubmit={irAPago}>
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
                      <input id="documento" required value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="rh">Tipo de sangre (RH) *</label>
                      <select id="rh" required value={rh} onChange={(e) => setRh(e.target.value)}>
                        <option value="">Seleccionar…</option>
                        {RH_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="tel-contacto">Teléfono de contacto *</label>
                      <input id="tel-contacto" required value={telefonoContacto} onChange={(e) => setTelefonoContacto(e.target.value)} />
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="fecha-nac">Fecha de nacimiento *</label>
                      <input id="fecha-nac" type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
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
                      <input id="c-nombre" required value={contactoEmergenciaNombre} onChange={(e) => setContactoEmergenciaNombre(e.target.value)} />
                    </div>
                    <div className="part-form-group">
                      <label htmlFor="c-telefono">Teléfono *</label>
                      <input id="c-telefono" required value={contactoEmergenciaTelefono} onChange={(e) => setContactoEmergenciaTelefono(e.target.value)} />
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

                  <div className="part-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="dorsal">Número de dorsal preferido (opcional, sujeto a disponibilidad)</label>
                    <input id="dorsal" placeholder="Ej: 42" inputMode="numeric" value={dorsalPreferido} onChange={(e) => setDorsalPreferido(e.target.value.replace(/\D/g, ''))} />
                    <div className="part-form-hint" style={{ marginBottom: 0 }}>Si el número ya está tomado, se asignará uno automáticamente.</div>
                  </div>
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
                          <input id="i-documento" required inputMode="numeric" value={invDocumento} onChange={(e) => setInvDocumento(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-nombre">Nombre</label>
                          <input id="i-nombre" required value={invNombre} onChange={(e) => setInvNombre(e.target.value)} />
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-apellido">Apellido</label>
                          <input id="i-apellido" required value={invApellido} onChange={(e) => setInvApellido(e.target.value)} />
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-rh">RH</label>
                          <select id="i-rh" value={invRh} onChange={(e) => setInvRh(e.target.value)}>
                            {RH_OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="part-form-group">
                          <label htmlFor="i-telefono">Teléfono</label>
                          <input id="i-telefono" required value={invTelefono} onChange={(e) => setInvTelefono(e.target.value)} />
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Continuar al pago <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="part-card">
              <div className="part-card-body">
                <h3>Pago</h3>
                <p className="part-form-hint">El pago real se conectará a Laravel en la siguiente fase. Por ahora, confirma para registrar tu inscripción como pendiente de pago.</p>
                {msg && (
                  <div className={`part-form-alert ${msg.tipo}`} key={msg.id}>
                    <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                    {msg.texto}
                    <div className="part-alert-timer" />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '.6rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Volver</button>
                  <button type="button" className="btn btn-primary" disabled={enviando} onClick={confirmarInscripcion}>
                    {enviando ? 'Enviando…' : 'Confirmar inscripción'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && done && (
            <div className="part-detail-card part-card part-detail-anim">
              <div className="part-detail-hero">
                <div className="part-detail-hero-blob a" />
                <div className="part-detail-hero-blob b" />
                <h2>¡Inscripción registrada!</h2>
                <p className="part-detail-meta">Tu participación en {evento.nombre} quedó registrada. Tu pago queda pendiente de confirmación.</p>
              </div>
              <div className="part-card-body">
                <button type="button" className="btn btn-primary" onClick={() => nav('/deportivo/mi-entrada')}>Ver mi entrada</button>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: resumen del evento */}
        <div className="part-card" style={{ position: 'sticky', top: 90 }}>
          {evento.imagen_url && (
            <img src={evento.imagen_url} alt={evento.nombre} style={{ width: '100%', height: 130, objectFit: 'cover' }} />
          )}
          <div className="part-card-body">
            <span className="part-tag">{evento.categoria}</span>
            <h3 style={{ margin: '.6rem 0 .8rem' }}>{evento.nombre}</h3>

            <div style={{ display: 'grid', gap: '.5rem', marginBottom: '1rem' }}>
              <div className="part-event-meta"><i className="ti ti-calendar" aria-hidden="true" /> {evento.fecha}</div>
              <div className="part-event-meta"><i className="ti ti-clock" aria-hidden="true" /> {evento.hora}</div>
              <div className="part-event-meta"><i className="ti ti-map-pin" aria-hidden="true" /> {evento.ubicacion}</div>
              {evento.distancia != null && <div className="part-event-meta"><i className="ti ti-route" aria-hidden="true" /> {evento.distancia} km</div>}
              {evento.desnivel != null && <div className="part-event-meta"><i className="ti ti-mountain" aria-hidden="true" /> {evento.desnivel} m desnivel</div>}
              <div className="part-event-meta"><i className="ti ti-users" aria-hidden="true" /> {evento.cupos_disponibles} cupos disponibles</div>
            </div>

            <div className="part-profile-divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: '.4rem' }}>
              <span>Inscripción</span><strong>{fmtMoney(evento.precio)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: '.4rem' }}>
              <span>Kit de bienvenida</span>
              <strong>{deseaJersey ? fmtMoney(precioKit) : 'No incluido'}</strong>
            </div>
            <div className="part-profile-divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', marginBottom: '.9rem' }}>
              <span>Total</span><span style={{ color: 'var(--accent)' }}>{fmtMoney(total)}</span>
            </div>

            <span className={`part-status-pill ${evento.cupos_disponibles > 0 ? 'ok' : 'warn'}`}>
              {evento.cupos_disponibles > 0 ? 'Cupos disponibles' : 'Sin cupos'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}