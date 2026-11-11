import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Protected from '../../components/Protected';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { apiFetch } from '../../services/api';
import { hace } from '../../utils/pqr';
import '../../styles/social/perfil.css';
import '../../styles/social/notificaciones.css';
import '../../styles/social/headerAnimado.css';

interface Notif {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
}

/* ---- Solo se muestran las notificaciones de Social ---- */
const TIPOS_SOCIAL = ['pqr', 'reserva'];

const ICONO: Record<string, string> = {
  pqr: 'ti-message-report',
  reserva: 'ti-calendar-event',
};

const DESTINO: Record<string, string> = {
  pqr: '/social/perfil?tab=pqr',
  reserva: '/social/perfil?tab=reservas',
};

const ETIQUETA: Record<string, string> = {
  pqr: 'PQR',
  reserva: 'Reserva',
};

type Categoria = 'todas' | 'sin_leer' | 'pqr' | 'reserva';

const FILTROS: { id: Categoria; label: string; icono: string }[] = [
  { id: 'todas', label: 'Todas', icono: 'ti-inbox' },
  { id: 'sin_leer', label: 'Sin leer', icono: 'ti-mail' },
  { id: 'pqr', label: 'PQR', icono: 'ti-message-report' },
  { id: 'reserva', label: 'Reservas', icono: 'ti-calendar-event' },
];

/* ---- Agrupar por fecha ---- */
const GRUPOS = ['Hoy', 'Esta semana', 'Anteriores'] as const;
const grupoDe = (iso: string): (typeof GRUPOS)[number] => {
  const dias = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (dias < 1) return 'Hoy';
  if (dias < 7) return 'Esta semana';
  return 'Anteriores';
};

function Contenido() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultima, setUltima] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState<Categoria>('todas');

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    setError(false);
    try {
      const res: any = await apiFetch(`/notificaciones?per_page=15&page=${p}`);
      const pag = res?.notificaciones;
      const sociales: Notif[] = (pag.data as Notif[]).filter((n) => TIPOS_SOCIAL.includes(n.tipo));
      setItems((prev) => (p === 1 ? sociales : [...prev, ...sociales]));
      setPagina(pag.current_page);
      setUltima(pag.last_page);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(1); }, [cargar]);

  const abrir = async (n: Notif) => {
    if (!n.leida) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      try { await apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' }); } catch { /* ignorar */ }
    }
    const destino = DESTINO[n.tipo];
    if (destino) navigate(destino);
  };

  const leerTodas = async () => {
    const pendientes = items.filter((n) => !n.leida);
    setItems((l) => l.map((x) => ({ ...x, leida: true })));
    try {
      await Promise.all(pendientes.map((n) => apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' })));
    } catch {
      void cargar(1); // si falla, se vuelve al estado real del servidor
    }
  };

  /* ---- Conteos ---- */
  const sinLeer = items.filter((n) => !n.leida).length;
  const hoy = items.filter((n) => grupoDe(n.created_at) === 'Hoy').length;
  const cuenta = (c: Categoria) =>
    c === 'todas' ? items.length
    : c === 'sin_leer' ? sinLeer
    : items.filter((n) => n.tipo === c).length;

  const visibles = useMemo(
    () => items.filter((n) =>
      filtro === 'todas' ? true
      : filtro === 'sin_leer' ? !n.leida
      : n.tipo === filtro),
    [items, filtro],
  );

  const agrupadas = GRUPOS
    .map((g) => ({ titulo: g, lista: visibles.filter((n) => grupoDe(n.created_at) === g) }))
    .filter((g) => g.lista.length > 0);

  return (
    <>
      {/* ===== Encabezado (mismo estilo que el del perfil) ===== */}
      <div className="pf-header pf-header--anim">
        <div className="pf-hero-glow" aria-hidden="true" />
        <CanvasParticles id="pfParticles" />
        <div className="pf-header-inner">
          <span className="ns-head-ico"><i className="ti ti-bell-ringing" aria-hidden="true" /></span>
          <div className="pf-meta">
            <div className="pf-badge"><i className="ti ti-sparkles" aria-hidden="true" /> SkyedSocial</div>
            <h1>Notificaciones</h1>
            <p className="pf-handle">Avisos de tus reservas y del avance de tus PQR.</p>
          </div>
          <div className="pf-actions">
            <Link title="Ir a tu perfil" to="/social/perfil" className="btn-sm-outline">
              <i className="ti ti-user-circle" aria-hidden="true" /> Mi perfil
            </Link>
            <button
              title="Marcar todas las notificaciones como leídas"
              type="button"
              className="btn-sm-outline ns-primary"
              onClick={leerTodas}
              disabled={sinLeer === 0}
            >
              <i className="ti ti-checks" aria-hidden="true" /> Marcar todas como leídas
            </button>
          </div>
        </div>
      </div>

      <div className="ns-body">
        {/* ===== Columna izquierda: resumen + accesos ===== */}
        <aside className="ns-aside">
          <div className="pf-card">
            <div className="pf-card-head ns-card-head">
              <span className="ns-card-ico"><i className="ti ti-chart-bar" aria-hidden="true" /></span>
              <h3>Resumen</h3>
            </div>
            <div className="pf-card-body">
              <div className="pf-stat-row"><span className="pf-label">Sin leer</span><b className="ns-accent">{sinLeer}</b></div>
              <div className="pf-stat-row"><span className="pf-label">Hoy</span><b>{hoy}</b></div>
              <div className="pf-stat-row"><span className="pf-label">De PQR</span><b>{cuenta('pqr')}</b></div>
              <div className="pf-stat-row"><span className="pf-label">De reservas</span><b>{cuenta('reserva')}</b></div>
            </div>
          </div>

          <div className="pf-card">
            <div className="pf-card-head ns-card-head">
              <span className="ns-card-ico"><i className="ti ti-bolt" aria-hidden="true" /></span>
              <h3>Accesos rápidos</h3>
            </div>
            <div className="pf-card-body ns-links">
              <Link to="/social/perfil?tab=reservas"><i className="ti ti-calendar-event" aria-hidden="true" /> Mis reservas</Link>
              <Link to="/social/perfil?tab=pqr"><i className="ti ti-message-report" aria-hidden="true" /> Mis PQR</Link>
              <Link to="/social/pqr"><i className="ti ti-plus" aria-hidden="true" /> Nueva PQR</Link>
              <Link to="/social/reservar"><i className="ti ti-calculator" aria-hidden="true" /> Cotizar reserva</Link>
              <Link to="/social/ayuda"><i className="ti ti-help-circle" aria-hidden="true" /> Centro de ayuda</Link>
            </div>
          </div>
        </aside>

        {/* ===== Columna principal: filtros + lista ===== */}
        <main className="ns-main">
          <div className="ns-chips" role="group" aria-label="Filtrar notificaciones">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ns-chip${filtro === f.id ? ' active' : ''}`}
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                <i className={`ti ${f.icono}`} aria-hidden="true" /> {f.label}
                <span className="ns-chip-count">{cuenta(f.id)}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="ns-empty">
              <h3>No pudimos cargar tus notificaciones</h3>
              <button type="button" className="btn-sm-outline" onClick={() => void cargar(1)}>Reintentar</button>
            </div>
          )}

          {cargando && items.length === 0 && !error && (
            <div className="ns-skeletons" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="ns-skeleton" />)}
            </div>
          )}

          {!error && !cargando && visibles.length === 0 && (
            <div className="ns-empty">
              <span className="ns-empty-ico"><i className="ti ti-bell-off" aria-hidden="true" /></span>
              <h3>{filtro === 'todas' ? 'Aún no tienes notificaciones' : 'Nada por aquí'}</h3>
              <p>
                {filtro === 'sin_leer'
                  ? '¡Estás al día! No tienes avisos pendientes por leer.'
                  : 'Cuando cambie el estado de una reserva o avance una de tus PQR, te avisaremos aquí.'}
              </p>
              {filtro === 'todas' && <Link to="/social/reservar" className="btn-sm-outline ns-primary">Cotizar una reserva</Link>}
            </div>
          )}

          {agrupadas.map((g) => (
            <section key={g.titulo} className="ns-group">
              <p className="ns-group-title">{g.titulo}</p>
              <ul className="ns-list">
                {g.lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`ns-item${n.leida ? '' : ' unread'}`}
                      onClick={() => void abrir(n)}
                    >
                      <span className="ns-ico"><i className={`ti ${ICONO[n.tipo] ?? 'ti-bell'}`} aria-hidden="true" /></span>
                      <span className="ns-txt">
                        <span className="ns-top">
                          <b>{n.titulo}</b>
                          {!n.leida && <span className="ns-dot" aria-label="Sin leer" />}
                        </span>
                        <span className="ns-msg">{n.mensaje}</span>
                        <span className="ns-meta">
                          <span className="ns-tag">{ETIQUETA[n.tipo] ?? 'Aviso'}</span>
                          <em><i className="ti ti-clock" aria-hidden="true" /> {hace(n.created_at)}</em>
                        </span>
                      </span>
                      {DESTINO[n.tipo] && <i className="ti ti-chevron-right ns-go" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!cargando && pagina < ultima && (
            <button type="button" className="btn-sm-outline ns-more" onClick={() => void cargar(pagina + 1)}>
              Cargar más
            </button>
          )}
          {cargando && items.length > 0 && <p className="ns-loading">Cargando…</p>}
        </main>
      </div>
    </>
  );
}

export default function SocialNotifications() {
  return (
    <Protected>
      <SocialWrapper>
        <Contenido />
      </SocialWrapper>
    </Protected>
  );
}
