import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteHeader from '../../components/SiteHeader';
import SiteFooter from '../../components/SiteFooter';
import { eventoDeportivoService, type EventoDeportivo } from '../../services/deportivoService';

export default function SportEventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventoDeportivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    eventoDeportivoService
      .obtener(Number(id))
      .then((res: any) => setEvent(res.evento ?? res))
      .catch(() => setError('No se pudo cargar el evento.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <><SiteHeader brand="sport" /><main className="section"><div className="container">Cargando evento...</div></main><SiteFooter variant="sport" /></>;
  if (error || !event) return <><SiteHeader brand="sport" /><main className="section"><div className="container form-error error">{error || 'Evento no encontrado.'}</div></main><SiteFooter variant="sport" /></>;

  return (
    <>
      <SiteHeader brand="sport" />
      <main>
        <section className="page-hero deportivo-hero">
          <div className="container">
            <span className="eyebrow">{event.categoria}</span>
            <h1>{event.nombre}</h1>
            <p>{event.fecha.slice(0, 10)} · {event.ubicacion}</p>
          </div>
        </section>
        <section className="section">
          <div className="container split">
            <div className="image-panel">
              <img src={event.imagen_url ?? ''} alt={event.nombre} />
            </div>
            <div>
              <span className="eyebrow">SOBRE EL EVENTO</span>
              <h2>{event.nombre}</h2>
              <p>{event.descripcion}</p>
              <ul className="list">
                <li><strong>Fecha</strong><br />{event.fecha.slice(0, 10)}</li>
                <li><strong>Ubicación</strong><br />{event.ubicacion}</li>
                <li><strong>Cupos</strong><br />{event.cupos_disponibles} participantes</li>
                <li><strong>Inscripción</strong><br />${event.precio.toLocaleString('es-CO')}</li>
              </ul>
              <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link className="button" to={`/deportivo/inscripcion/${event.id}`}>Inscribirme</Link>
                <Link className="button outline" to="/deportivo/eventos">Volver a eventos</Link>
              </div>
            </div>
          </div>
        </section>
        <section className="section alt">
          <div className="container grid grid-3">
            <div className="feature"><h3>Requisitos</h3><p>{event.requisitos}</p></div>
            <div className="feature"><h3>Kit del evento</h3><p>Consulta tallas, entrega y disponibilidad antes de tu participación.</p></div>
            <div className="feature"><h3>Soporte</h3><p>Contaremos con puntos de hidratación y soporte durante la jornada.</p></div>
          </div>
        </section>
      </main>
      <SiteFooter variant="sport" />
    </>
  );
}