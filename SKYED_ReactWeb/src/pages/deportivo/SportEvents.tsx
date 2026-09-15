import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { sportEvents, eventFilters } from '../../data/sportEventsData';
import { useAuth } from '../../context/AuthContext';

const INSCRIPCIONES_KEY = 'skyed_deportivo_inscripciones';

function fmt(n: number) {
  return n.toLocaleString('es-CO');
}

function getInscripciones(): number[] {
  try {
    const raw = localStorage.getItem(INSCRIPCIONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function SportEvents() {
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('msg') === 'ya_inscrito') {
      const t = setTimeout(() => showToast('Ya estás inscrito en este evento', 'error'), 300);
      setSearchParams({}, { replace: true });
      return () => clearTimeout(t);
    }
  }, []);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3200);
  }

  const filtered = useMemo(
    () => (filter === 'all' ? sportEvents : sportEvents.filter((e) => e.category === filter)),
    [filter],
  );

  function handleInscribirme(id: number) {
    if (!user) {
      showToast('Debes iniciar sesión para inscribirte', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }
    if (getInscripciones().includes(id)) {
      showToast('Ya estás inscrito en este evento', 'error');
      setTimeout(() => navigate(`/deportivo?evento=${id}`), 1200);
      return;
    }
    navigate(`/deportivo/inscripcion/${id}`);
  }

  return (
    <SportWrapper>
      <section className="page-header">
        <h1>Nuestros eventos</h1>
        <p>Descubre las próximas competencias y rodadas de la temporada e inscríbete con un clic.</p>
      </section>

      <div className="filters" role="tablist" aria-label="Filtrar eventos">
        <div className="filters-inner">
          {eventFilters.map((f) => (
            <button
              key={f.value}
              className={`filter-btn ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="events-section">
        <div className="events-list" aria-live="polite">
          {filtered.length === 0 ? (
            <div className="empty-state">No hay eventos en esta categoría.</div>
          ) : (
            filtered.map((e) => (
              <article key={e.id} className="event-item">
                <div className="img" style={{ backgroundImage: `url('${e.image}')` }} role="img" aria-label={e.title}>
                  <span className={`badge cat-${e.category}`}>{e.categoryLabel}</span>
                </div>
                <div className="body">
                  <h2>{e.title}</h2>
                  <div className="event-meta">
                    <span aria-label="Fecha">📅 {e.date}</span>
                    <span aria-label="Lugar">📍 {e.location}</span>
                  </div>
                  <p className="desc">{e.description}</p>
                  <div className="event-stats">
                    <div><strong>{e.distance}</strong><small>Distancia</small></div>
                    <div><strong>{e.elevation}</strong><small>Desnivel</small></div>
                    <div><strong>{e.capacity}</strong><small>Cupos</small></div>
                  </div>
                  <div className="actions">
                    <span className="price-tag">${fmt(e.price)} <small>COP</small></span>
                    <button className="btn btn-primary" onClick={() => handleInscribirme(e.id)}>Inscribirme</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className={`toast ${toast.type}${toast.show ? ' show' : ''}`}>
        <span className="toast-icon">{toast.type === 'success' ? '✓' : '⚠'}</span>
        <span>{toast.msg}</span>
      </div>
    </SportWrapper>
  );
}