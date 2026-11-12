import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { pqrService } from '../../../services/socialService';
import type { Pqr } from '../../../services/socialService';
import { PqrEstadoPill, PqrPlazoChip } from '../../social/pqr/PqrTracker';
import { esFinal, fmtFechaHora, hace } from '../../../utils/pqr';
import { TIPOS_META } from './pqrMeta';
import PqrDetalleModal from './PqrDetalleModal';
import '../../../styles/deportivo/pqrDeportivoPagina.css';

type Filtro = 'todas' | 'activas' | 'resueltas';

interface Props {
  /** Cambia para volver a cargar la lista (p. ej. tras radicar una PQR nueva). */
  version?: number;
  /** Muestra el título y el botón «Nueva solicitud» (en la pestaña del perfil). */
  conEncabezado?: boolean;
}

/** «Mis solicitudes»: resumen, filtros, tarjetas y detalle con conversación. */
export default function MisPqrDeportivo({ version = 0, conEncabezado = false }: Props) {
  const [lista, setLista] = useState<Pqr[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abierta, setAbierta] = useState<Pqr | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await pqrService.misPqr(1, 'deportivo');
      setLista(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus solicitudes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  const abrir = async (id: number) => {
    try {
      setAbierta(await pqrService.obtener(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la solicitud.');
    }
  };

  const activas = useMemo(() => lista.filter((p) => !esFinal(p.estado_pqr)).length, [lista]);
  const resueltas = lista.length - activas;

  const visibles = useMemo(
    () =>
      lista.filter((p) =>
        filtro === 'todas' ? true : filtro === 'activas' ? !esFinal(p.estado_pqr) : esFinal(p.estado_pqr),
      ),
    [lista, filtro],
  );

  const chips: { id: Filtro; label: string; n: number }[] = [
    { id: 'todas', label: 'Todas', n: lista.length },
    { id: 'activas', label: 'En curso', n: activas },
    { id: 'resueltas', label: 'Resueltas', n: resueltas },
  ];

  return (
    <div className="pqd-mine">
      {conEncabezado && (
        <div className="pqd-mine-top">
          <div>
            <h3>Mis solicitudes</h3>
            <p>Peticiones, quejas, reclamos y sugerencias que has radicado en SKYED Deportivo.</p>
          </div>
          <Link to="/deportivo/pqr" className="btn btn-primary">
            <i className="ti ti-plus" aria-hidden="true" /> Nueva solicitud
          </Link>
        </div>
      )}

      {lista.length > 0 && (
        <div className="pqd-stats">
          <div className="pqd-stat">
            <b>{lista.length}</b>
            <span>Radicadas</span>
          </div>
          <div className="pqd-stat">
            <b>{activas}</b>
            <span>En curso</span>
          </div>
          <div className="pqd-stat">
            <b>{resueltas}</b>
            <span>Resueltas</span>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <div className="pqd-chips" role="group" aria-label="Filtrar solicitudes">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pqd-chip${filtro === c.id ? ' active' : ''}`}
              aria-pressed={filtro === c.id}
              onClick={() => setFiltro(c.id)}
            >
              {c.label} <span>{c.n}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="pqd-alert" role="alert">
          {error}{' '}
          <button type="button" onClick={() => void cargar()}>
            Reintentar
          </button>
        </p>
      )}

      {cargando && lista.length === 0 && !error && (
        <div className="pqd-skeletons" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pqd-skeleton" />
          ))}
        </div>
      )}

      {!cargando && !error && lista.length === 0 && (
        <div className="pqd-empty">
          <span className="pqd-empty-ico">
            <i className="ti ti-message-report" aria-hidden="true" />
          </span>
          <h4>Aún no has radicado solicitudes</h4>
          <p>Cuando tengas una duda sobre tu inscripción, pago, kit o resultados, aquí verás el seguimiento.</p>
          <Link to="/deportivo/pqr" className="btn btn-primary">
            Radicar mi primera solicitud
          </Link>
        </div>
      )}

      {lista.length > 0 && visibles.length === 0 && (
        <p className="pqd-muted">No tienes solicitudes en esta categoría.</p>
      )}

      <ul className="pqd-list">
        {visibles.map((p) => {
          const meta = TIPOS_META[p.tipo_pqr];
          return (
            <li key={p.id_pqr}>
              <button type="button" className="pqd-card" onClick={() => void abrir(p.id_pqr)}>
                <span className="pqd-card-ico">
                  <i className={`ti ${meta.icono}`} aria-hidden="true" />
                </span>
                <span className="pqd-card-main">
                  <small>
                    {p.radicado} · {meta.nombre}
                  </small>
                  <strong>{p.asunto_pqr}</strong>
                  <em title={fmtFechaHora(p.creado_en_pqr)}>
                    <i className="ti ti-clock" aria-hidden="true" /> {hace(p.creado_en_pqr)}
                  </em>
                </span>
                <span className="pqd-card-side pqrx">
                  <PqrEstadoPill estado={p.estado_pqr} />
                  <PqrPlazoChip pqr={p} />
                </span>
                <i className="ti ti-chevron-right pqd-card-go" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {abierta && (
        <PqrDetalleModal
          pqr={abierta}
          onClose={() => setAbierta(null)}
          onCambio={(p) => {
            setAbierta(p);
            void cargar();
          }}
        />
      )}
    </div>
  );
}