import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { hace } from '../../utils/pqr';
import '../../styles/social/notificationBell.css';

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
}

const ICONO: Record<string, string> = {
  pqr: 'ti-message-report',
  reserva: 'ti-calendar-event',
  pago: 'ti-credit-card',
  inscripcion: 'ti-ticket',
};

// A dónde lleva cada tipo de notificación (usa el ?tab= que ya tiene el perfil).
const DESTINO: Record<string, string> = {
  pqr: '/social/perfil?tab=pqr',
  reserva: '/social/perfil?tab=reservas',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch('/notificaciones?per_page=10');
      setItems(res.notificaciones?.data ?? []);
      setNoLeidas(res.no_leidas ?? 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga al montar, cada 60 s y al volver a esta pestaña del navegador.
  useEffect(() => {
    void cargar();
    const timer = window.setInterval(() => void cargar(), 60000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void cargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  // Se cierra al hacer clic afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  const abrirNotificacion = async (n: Notificacion) => {
    setAbierto(false);
    if (!n.leida) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setNoLeidas((c) => Math.max(0, c - 1));
      try {
        await apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' });
      } catch {
        void cargar(); // si falla, se vuelve al estado real del servidor
      }
    }
    const destino = DESTINO[n.tipo];
    if (destino) navigate(destino);
  };

  const marcarTodas = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    setNoLeidas(0);
    try {
      await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' });
    } catch {
      void cargar();
    }
  };

  return (
    <div className={`nb-wrap${abierto ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="nb-btn"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        onClick={() => setAbierto((v) => !v)}
      >
        <i className="ti ti-bell" aria-hidden="true" />
        {noLeidas > 0 && <span className="nb-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      <div className="nb-panel" role="dialog" aria-label="Notificaciones">
        <div className="nb-head">
          <strong>Notificaciones</strong>
          {noLeidas > 0 && (
            <button type="button" className="nb-link" onClick={marcarTodas}>
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="nb-list">
          {cargando && <p className="nb-empty">Cargando…</p>}

          {!cargando && error && items.length === 0 && (
            <p className="nb-empty">
              No se pudieron cargar.{' '}
              <button type="button" className="nb-link" onClick={() => void cargar()}>
                Reintentar
              </button>
            </p>
          )}

          {!cargando && !error && items.length === 0 && (
            <p className="nb-empty">Aún no tienes notificaciones.</p>
          )}

          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nb-item${n.leida ? '' : ' unread'}`}
              onClick={() => abrirNotificacion(n)}
            >
              <span className="nb-icon">
                <i className={`ti ${ICONO[n.tipo] ?? 'ti-bell'}`} aria-hidden="true" />
              </span>
              <span className="nb-text">
                <strong>{n.titulo}</strong>
                <span>{n.mensaje}</span>
                <small>{hace(n.created_at)}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}