import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { anim, useInViewAnimations } from '../../hooks/useInViewAnimations';
import '../../styles/shared/nosotrosMotion.css';
import { useAuth } from '../../context/AuthContext';
import { eventoDeportivoService, type EventoDeportivo } from '../../services/deportivoService';



const CATEGORY_LABELS: Record<string, string> = {
  ruta: 'Ruta',
  mtb: 'MTB',
  gravel: 'Gravel',
  pista: 'Pista',
  bmx: 'BMX',
};

const EVENT_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'ruta', label: 'Ruta' },
  { value: 'mtb', label: 'MTB' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'pista', label: 'Pista' },
  { value: 'bmx', label: 'BMX' },
];

function fmt(n: number) {
  return n.toLocaleString('es-CO');
}



export default function SportEvents() {
  const [eventos, setEventos] = useState<EventoDeportivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; show: boolean }>({ msg: '', type: 'success', show: false });
  const mainRef = useRef<HTMLElement>(null);
  // Mismas animaciones de "Sobre nosotros": ruedas, barra de progreso y entrada al hacer scroll
  useInViewAnimations(mainRef);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    eventoDeportivoService
      .listar()
      .then((res) => setEventos(res.data))
      .catch(() => setError('No se pudieron cargar los eventos.'))
      .finally(() => setLoading(false));
  }, []);

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
    () => (filter === 'all' ? eventos : eventos.filter((e) => e.categoria === filter)),
    [filter, eventos],
  );

  function handleInscribirme(id: number) {
    if (!user) {
      showToast('Debes iniciar sesión para inscribirte', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }
    navigate(`/deportivo/inscripcion/${id}`);
  }

  return (
    <SportWrapper>
      <main id="main" className="events-page" ref={mainRef}>
      <div className="nos-progress" aria-hidden="true" />
      <section className="page-header">
        <h1>Nuestros eventos</h1>
        <p>Descubre las próximas competencias y rodadas de la temporada e inscríbete con un clic.</p>
      </section>

      <div className="filters" role="tablist" aria-label="Filtrar eventos">
        <div className="filters-inner">
          {EVENT_FILTERS.map((f) => (
            <button title={`Filtrar eventos: ${f.label}`}
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
        {loading && <p className="container">Cargando eventos...</p>}
        {error && <p className="container form-error error">{error}</p>}

        {!loading && !error && (
          <div className="events-list" aria-live="polite">
            {filtered.length === 0 ? (
              <div className="empty-state" {...anim('fade-up')}>No hay eventos en esta categoría.</div>
            ) : (
              filtered.map((e, i) => (
                <article key={`${filter}-${e.id}`} className="event-item" {...anim('zoom-in', i % 3)}>
                  <div
                    className="img"
                    style={{ backgroundImage: `url('${e.imagen_url ?? ''}')` }}
                    role="img"
                    aria-label={e.nombre}
                  >
                    <span className={`badge cat-${e.categoria}`}>{CATEGORY_LABELS[e.categoria] ?? e.categoria}</span>
                  </div>
                  <div className="body">
                    <h2>{e.nombre}</h2>
                    <div className="event-meta">
                      <span aria-label="Fecha">📅 {e.fecha.slice(0, 10)}</span>
                      <span aria-label="Lugar">📍 {e.ubicacion}</span>
                    </div>
                    <p className="desc">{e.descripcion}</p>
                    <div className="event-stats">
                      <div><strong>{e.distancia ?? '—'}</strong><small>Distancia</small></div>
                      <div><strong>{e.desnivel ?? '—'}</strong><small>Desnivel</small></div>
                      <div><strong>{e.cupos_disponibles}</strong><small>Cupos</small></div>
                    </div>
                    <div className="actions">
                      <span className="price-tag">${fmt(e.precio)} <small>COP</small></span>
                      <button title="Inscribirme a este evento" className="btn btn-primary" onClick={() => handleInscribirme(e.id)}>Inscribirme</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>
      </main>

      <div className={`toast ${toast.type}${toast.show ? ' show' : ''}`}>
        <span className="toast-icon">{toast.type === 'success' ? '✓' : '⚠'}</span>
        <span>{toast.msg}</span>
      </div>
    </SportWrapper>
  );
}
