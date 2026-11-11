import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api'; 
import '../../styles/deportivo/sportBell.css';

export interface Notif {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean; 
  created_at: string;
}

export const DESTINO_DEPORTIVO: Record<string, string> = {
  pago: '/deportivo/perfil?tab=inscripciones',
  inscripcion: '/deportivo/perfil?tab=inscripciones',
  kit: '/deportivo/perfil?tab=inscripciones',
  acceso: '/deportivo/mi-entrada',
  evento: '/deportivo/perfil?tab=inscripciones',
  resultado: '/deportivo/resultados',
};

export const ICONO_DEPORTIVO: Record<string, string> = {
  pago: 'ti-credit-card',
  inscripcion: 'ti-clipboard-check',
  kit: 'ti-package',
  acceso: 'ti-qrcode',
  evento: 'ti-calendar-event',
  resultado: 'ti-trophy',
};

export const haceTiempo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

export default function SportBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res: any = await apiFetch('/notificaciones?per_page=8');
      const data: Notif[] = res?.notificaciones?.data ?? [];
      setItems(data);
      setNoLeidas(res?.no_leidas ?? data.filter((n) => !n.leida).length);
    } catch {
      /* silencioso: la campana no debe romper el navbar */
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [open]);

  const abrir = async (n: Notif) => {
    setOpen(false);
    if (!n.leida) {
      try {
        await apiFetch(`/notificaciones/${n.id}/leer`, { method: 'PATCH' });
      } catch { /* ignorar */ }
      cargar();
    }
    nav(DESTINO_DEPORTIVO[n.tipo] ?? '/deportivo/notificaciones');
  };

  const leerTodas = async () => {
    try {
      await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' });
    } catch { /* ignorar */ }
    cargar();
  };

  return (
    <div className="sb-wrap" ref={ref}>
      <button
        type="button"
        className="sb-btn"
        aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="ti ti-bell" aria-hidden="true" />
        {noLeidas > 0 && <span className="sb-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {open && (
        <div className="sb-panel" role="dialog" aria-label="Notificaciones">
          <div className="sb-head">
            <strong>Notificaciones{noLeidas > 0 && <span className="sb-count">{noLeidas > 9 ? '9+' : noLeidas}</span>}</strong>
            {noLeidas > 0 && (
              <button type="button" onClick={leerTodas}>Marcar todas</button>
            )}
          </div>
          <ul className="sb-list">
            {items.length === 0 && <li className="sb-empty">No tienes notificaciones.</li>}
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
          <button type="button" className="sb-all" onClick={() => { setOpen(false); nav('/deportivo/notificaciones'); }}>
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
}