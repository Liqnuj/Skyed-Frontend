import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { apiFetch } from '../../services/api';
import {
  DESTINO_DEPORTIVO,
  ICONO_DEPORTIVO,
  haceTiempo,
  type Notif,
} from '../../components/deportivo/SportBell';
import '../../styles/deportivo/participante.css';
import '../../styles/deportivo/notificaciones.css';
import '../../styles/deportivo/headerHero.css';

/* ---- Tipos: icono, etiqueta y destino (deportivo + los que llegan de Social) ---- */
type Categoria = 'todas' | 'sin_leer' | 'inscripciones';

const ICONO = ICONO_DEPORTIVO;
const DESTINO = DESTINO_DEPORTIVO;

// Solo se muestran los tipos de Deportivo (las de Social/PQR/reservas quedan fuera por ahora).
const TIPOS_DEPORTIVO = Object.keys(ICONO_DEPORTIVO);

const ETIQUETA: Record<string, string> = {
  pago: 'Pago',
  inscripcion: 'Inscripción',
  kit: 'Kit',
  acceso: 'Acceso',
  evento: 'Evento',
  resultado: 'Resultado',
};

const CATEGORIA_DE: Record<string, Categoria> = {
  pago: 'inscripciones', inscripcion: 'inscripciones', kit: 'inscripciones',
  acceso: 'inscripciones', evento: 'inscripciones', resultado: 'inscripciones',
};

const FILTROS: { id: Categoria; label: string; icono: string }[] = [
  { id: 'todas', label: 'Todas', icono: 'ti-inbox' },
  { id: 'sin_leer', label: 'Sin leer', icono: 'ti-mail' },
  { id: 'inscripciones', label: 'Inscripciones', icono: 'ti-clipboard-check' },
];

/* ---- Agrupar por fecha: Hoy / Esta semana / Anteriores ---- */
const GRUPOS = ['Hoy', 'Esta semana', 'Anteriores'] as const;
const grupoDe = (iso: string): (typeof GRUPOS)[number] => {
  const dias = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (dias < 1) return 'Hoy';
  if (dias < 7) return 'Esta semana';
  return 'Anteriores';
};

function Contenido() {
  const nav = useNavigate();
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
      const deportivas: Notif[] = (pag.data as Notif[]).filter((n) => TIPOS_DEPORTIVO.includes(n.tipo));
      setItems((prev) => (p === 1 ? deportivas : [...prev, ...deportivas]));
      setPagina(pag.current_page);
      setUltima(pag.last_page);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  const abrir = async (n: Notif) => {
    if (!n.leida) {
      try { await apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' }); } catch { /* ignorar */ }
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
    const destino = DESTINO[n.tipo];
    if (destino) nav(destino);
  };

  const leerTodas = async () => {
    try {
      await Promise.all(
        items.filter((n) => !n.leida).map((n) => apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' })),
      );
      setItems((l) => l.map((x) => ({ ...x, leida: true })));
    } catch { /* ignorar */ }
  };

  /* ---- Conteos para el resumen y los chips ---- */
  const sinLeer = items.filter((n) => !n.leida).length;
  const hoy = items.filter((n) => grupoDe(n.created_at) === 'Hoy').length;
  const cuenta = (c: Categoria) =>
    c === 'todas' ? items.length
    : c === 'sin_leer' ? sinLeer
    : items.filter((n) => CATEGORIA_DE[n.tipo] === c).length;

  const visibles = useMemo(
    () => items.filter((n) =>
      filtro === 'todas' ? true
      : filtro === 'sin_leer' ? !n.leida
      : CATEGORIA_DE[n.tipo] === filtro),
    [items, filtro],
  );

  const agrupadas = GRUPOS
    .map((g) => ({ titulo: g, lista: visibles.filter((n) => grupoDe(n.created_at) === g) }))
    .filter((g) => g.lista.length > 0);

  return (
    <>
      {/* ===== Encabezado (mismo estilo que el del perfil) ===== */}
      <div className="part-header part-header--hero">
        <div className="part-header-inner nt-head">
          <span className="nt-head-ico"><i className="ti ti-bell-ringing" aria-hidden="true" /></span>
          <div className="part-meta">
            <h1>Notificaciones</h1>
            <p className="part-handle">Avisos de tus inscripciones, pagos, kits y resultados.</p>
          </div>
          <div className="part-actions">
            <Link title="Configurar qué avisos recibes" to="/deportivo/perfil?tab=ajustes" className="btn btn-outline">
              <i className="ti ti-settings" aria-hidden="true" /> Preferencias
            </Link>
            <button
              title="Marcar todas las notificaciones como leídas"
              type="button"
              className="btn btn-primary"
              onClick={leerTodas}
              disabled={sinLeer === 0}
            >
              <i className="ti ti-checks" aria-hidden="true" /> Marcar todas como leídas
            </button>
          </div>
        </div>
      </div>

      <div className="part-body nt-body">
        {/* ===== Columna izquierda: resumen + accesos ===== */}
        <aside className="nt-aside">
          <div className="part-card">
            <div className="part-card-head">
              <span className="part-card-head-icon"><i className="ti ti-chart-bar" aria-hidden="true" /></span>
              <h3>Resumen</h3>
            </div>
            <div className="part-card-body">
              <div className="part-stat-row"><span className="part-label">Sin leer</span><b className="nt-accent">{sinLeer}</b></div>
              <div className="part-stat-row"><span className="part-label">Hoy</span><b>{hoy}</b></div>
              <div className="part-stat-row"><span className="part-label">Cargadas</span><b>{items.length}</b></div>
            </div>
          </div>

          <div className="part-card">
            <div className="part-card-head">
              <span className="part-card-head-icon"><i className="ti ti-bolt" aria-hidden="true" /></span>
              <h3>Accesos rápidos</h3>
            </div>
            <div className="part-card-body nt-links">
              <Link to="/deportivo/perfil?tab=inscripciones"><i className="ti ti-clipboard-check" aria-hidden="true" /> Mis inscripciones</Link>
              <Link to="/deportivo/mi-entrada"><i className="ti ti-qrcode" aria-hidden="true" /> Mi entrada</Link>
              <Link to="/deportivo/resultados"><i className="ti ti-trophy" aria-hidden="true" /> Resultados</Link>
              <Link to="/deportivo/ayuda"><i className="ti ti-help-circle" aria-hidden="true" /> Centro de ayuda</Link>
            </div>
          </div>
        </aside>

        {/* ===== Columna principal: filtros + lista ===== */}
        <main className="nt-main">
          <div className="nt-chips" role="group" aria-label="Filtrar notificaciones">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`nt-chip${filtro === f.id ? ' active' : ''}`}
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                <i className={`ti ${f.icono}`} aria-hidden="true" /> {f.label}
                <span className="nt-chip-count">{cuenta(f.id)}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="part-empty-row">
              No pudimos cargar tus notificaciones.{' '}
              <button type="button" className="nt-link-btn" onClick={() => cargar(1)}>Reintentar</button>
            </div>
          )}

          {cargando && items.length === 0 && !error && (
            <div className="nt-skeletons" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="nt-skeleton" />)}
            </div>
          )}

          {!error && !cargando && visibles.length === 0 && (
            <div className="nt-empty">
              <span className="nt-empty-ico"><i className="ti ti-bell-off" aria-hidden="true" /></span>
              <h3>{filtro === 'todas' ? 'Aún no tienes notificaciones' : 'Nada por aquí'}</h3>
              <p>
                {filtro === 'sin_leer'
                  ? '¡Estás al día! No tienes avisos pendientes por leer.'
                  : 'Cuando te inscribas a un evento, pagues o tengas novedades de tu kit y resultados, te avisaremos aquí.'}
              </p>
              {filtro === 'todas' && <Link to="/deportivo/eventos" className="btn btn-primary">Explorar eventos</Link>}
            </div>
          )}

          {agrupadas.map((g) => (
            <section key={g.titulo} className="nt-group">
              <p className="part-section-label">{g.titulo}</p>
              <ul className="nt-list">
                {g.lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`nt-item${n.leida ? '' : ' unread'}`}
                      onClick={() => abrir(n)}
                    >
                      <span className="nt-ico"><i className={`ti ${ICONO[n.tipo] ?? 'ti-bell'}`} aria-hidden="true" /></span>
                      <span className="nt-txt">
                        <span className="nt-top">
                          <b>{n.titulo}</b>
                          {!n.leida && <span className="nt-dot" aria-label="Sin leer" />}
                        </span>
                        <span className="nt-msg">{n.mensaje}</span>
                        <span className="nt-meta">
                          <span className="part-tag">{ETIQUETA[n.tipo] ?? 'Aviso'}</span>
                          <em><i className="ti ti-clock" aria-hidden="true" /> {haceTiempo(n.created_at)}</em>
                        </span>
                      </span>
                      {DESTINO[n.tipo] && <i className="ti ti-chevron-right nt-go" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!cargando && pagina < ultima && (
            <button type="button" className="btn btn-outline nt-more" onClick={() => cargar(pagina + 1)}>
              Cargar más
            </button>
          )}
          {cargando && items.length > 0 && <p className="nt-loading">Cargando…</p>}
        </main>
      </div>
    </>
  );
}

export default function Notifications() {
  return (
    <Protected>
      <SportWrapper>
        <Contenido />
      </SportWrapper>
    </Protected>
  );
}
