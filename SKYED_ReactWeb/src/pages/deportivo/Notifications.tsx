import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { apiFetch } from '../../services/api'; 
import {
  DESTINO_DEPORTIVO,
  ICONO_DEPORTIVO,
  haceTiempo,
  type Notif,
} from '../../components/deportivo/SportBell';
import '../../styles/deportivo/sportBell.css';

function Contenido() {
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultima, setUltima] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    setError(false);
    try {
      const res: any = await apiFetch(`/notificaciones?per_page=15&page=${p}`);
      const pag = res?.notificaciones;
      setItems((prev) => (p === 1 ? pag.data : [...prev, ...pag.data]));
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
    const destino = DESTINO_DEPORTIVO[n.tipo];
    if (destino) nav(destino);
  };

  const leerTodas = async () => {
    try {
      await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' });
      setItems((l) => l.map((x) => ({ ...x, leida: true })));
    } catch { /* ignorar */ }
  };

  const hayNoLeidas = items.some((n) => !n.leida);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Notificaciones</h2>
          {hayNoLeidas && <button type="button" className="sb-all" style={{ width: 'auto' }} onClick={leerTodas}>Marcar todas como leídas</button>}
        </div>

        {error && (
          <p style={{ marginTop: '1rem' }}>
            No pudimos cargar tus notificaciones.{' '}
            <button type="button" className="sb-all" style={{ width: 'auto', display: 'inline' }} onClick={() => cargar(1)}>Reintentar</button>
          </p>
        )}

        {!error && !cargando && items.length === 0 && (
          <p style={{ marginTop: '1.5rem', opacity: .75 }}>Aún no tienes notificaciones. Aquí verás avisos de tus inscripciones, pagos y kits.</p>
        )}

        <ul className="sb-list" style={{ maxHeight: 'none', marginTop: '1.2rem', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(128,128,128,.2)' }}>
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" className={`sb-item${n.leida ? '' : ' unread'}`} onClick={() => abrir(n)}>
                <span className="sb-ico"><i className={`ti ${ICONO_DEPORTIVO[n.tipo] ?? 'ti-bell'}`} /></span>
                <span className="sb-txt">
                  <b>{n.titulo}</b>
                  <small>{n.mensaje}</small>
                  <em>{haceTiempo(n.created_at)}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {cargando && <p style={{ marginTop: '1rem', opacity: .7 }}>Cargando…</p>}
        {!cargando && pagina < ultima && (
          <button type="button" className="sb-all" onClick={() => cargar(pagina + 1)}>Cargar más</button>
        )}
      </div>
    </section>
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