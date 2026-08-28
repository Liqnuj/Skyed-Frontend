import { Link } from 'react-router-dom';
import type { SocialEvent, SportEvent } from '../types';



export function SportEventCard({ event }: { event: SportEvent }) {
  return (
    <article className="card event-card">
      <img src={event.image} alt={event.title} />
      <div className="card-body">
        <span className="eyebrow">{event.category}</span>
        <h3>{event.title}</h3>
        <p className="muted">{event.date} · {event.location}</p>
        <p>{event.description}</p>
        <div className="card-row">
          <strong>${event.price.toLocaleString('es-CO')}</strong>
          <Link className="button small" to={`/deportivo/eventos/${event.id}`}>Ver evento</Link>
        </div>
      </div>
    </article>
  );
}

export function SocialEventCard({ event, onViewDetails }: { event: SocialEvent; onViewDetails: (id: number) => void }) {
  return (
    <article className="event-card reveal">
      <div className="event-card-img">
        <img src={event.image} alt={event.title} />
        <div className="event-price">{event.price}</div>
        <div className="event-tag">{event.category}</div>
      </div>
      <div className="event-card-body">
        <div className="event-card-title">{event.title}</div>
        <div className="event-card-meta">
          <span className="event-meta-item">📍 {event.location}</span>
        </div>
        <p className="event-card-desc">{event.description}</p>
        <div className="event-card-footer">
          <button className="btn-sm-primary" onClick={() => onViewDetails(event.id)}>Ver detalles</button>
          <Link className="btn-sm-outline" to="/social/reservar">
            Cotizar
          </Link>
        </div>
      </div>
    </article>
  );
}