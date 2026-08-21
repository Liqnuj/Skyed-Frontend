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

export function SocialEventCard({ event }: { event: SocialEvent }) {
  return (
    <article className="card event-card">
      <img src={event.image} alt={event.title} />
      <div className="card-body">
        <span className="eyebrow social">{event.category}</span>
        <h3>{event.title}</h3>
        <p className="muted">{event.location}</p>
        <p>{event.description}</p>
        <div className="card-row">
          <strong>{event.price}</strong>
          <Link className="button small social-btn" to="/social/reservar">Cotizar</Link>
        </div>
      </div>
    </article>
  );
}
