import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { pqrService } from '../../../services/socialService';
import type { Pqr } from '../../../services/socialService';
import { FASES_VISIBLES, PqrEstadoPill, PqrPlazoChip, indiceFaseVisible } from '../../social/pqr/PqrTracker';
import { ESTADO_COLOR, esFinal, fmtFechaHora, hace } from '../../../utils/pqr';
import { TIPOS_META } from './pqrMeta';
import PqrDetalleModal from './PqrDetalleModal';
import '../../../styles/deportivo/pqrDeportivoPagina.css';
import '../../../styles/deportivo/pqrPerfilDeportivo.css';

type Filtro = 'todas' | 'activas' | 'resueltas';

/** Pestaña «PQR» del perfil Deportivo, con el mismo estilo que el perfil Social. */
export default function PqrPerfilDeportivo() {
  const [lista, setLista] = useState<Pqr[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busqueda, setBusqueda] = useState('');
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
  }, [cargar]);

  const abrir = async (id: number) => {
    try {
      setAbierta(await pqrService.obtener(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la solicitud.');
    }
  };

  const activas = useMemo(() => lista.filter((p) => !esFinal(p.estado_pqr)).length, [lista]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((p) => {
      if (filtro === 'activas' && esFinal(p.estado_pqr)) return false;
      if (filtro === 'resueltas' && !esFinal(p.estado_pqr)) return false;
      if (!q) return true;
      const txt = `${p.asunto_pqr} ${TIPOS_META[p.tipo_pqr].nombre} ${p.radicado ?? ''} ${p.estado_pqr}`.toLowerCase();
      return txt.includes(q);
    });
  }, [lista, filtro, busqueda]);

  const chips: { id: Filtro; label: string; n: number }[] = [
    { id: 'todas', label: 'Todas', n: lista.length },
    { id: 'activas', label: 'En curso', n: activas },
    { id: 'resueltas', label: 'Resueltas', n: lista.length - activas },
  ];

  return (
    <div className="pqp">
      <div className="pqp-head">
        <div>
          <h2>Mis PQR</h2>
          <p>Toca una solicitud para ver su detalle y conversar con el equipo.</p>
        </div>
        <Link to="/deportivo/pqr" className="pqp-new">
          <i className="ti ti-plus" aria-hidden="true" /> Nueva solicitud
        </Link>
      </div>

      {lista.length > 0 && (
        <div className="pqp-toolbar">
          <label className="pqp-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por asunto, tipo, estado o radicado"
              aria-label="Buscar solicitudes"
            />
          </label>
          <div className="pqp-chips" role="group" aria-label="Filtrar solicitudes">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pqp-chip${filtro === c.id ? ' active' : ''}`}
                aria-pressed={filtro === c.id}
                onClick={() => setFiltro(c.id)}
              >
                {c.label} <span>{c.n}</span>
              </button>
            ))}
          </div>
          <p className="pqp-count">
            Mostrando {visibles.length} de {lista.length} {lista.length === 1 ? 'solicitud' : 'solicitudes'}
          </p>
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

      {cargando && lista.length === 0 && !error && <p className="pqp-loading">Cargando tus PQR…</p>}

      {!cargando && !error && lista.length === 0 && (
        <div className="pqp-empty">
          <span className="pqp-empty-ico" aria-hidden="true">
            <i className="ti ti-message-report" />
          </span>
          <h3>Aún no has radicado ninguna PQR</h3>
          <p>Preguntas, quejas o reclamos: te respondemos por este mismo perfil.</p>
          <Link to="/deportivo/pqr" className="pqp-new">
            <i className="ti ti-plus" aria-hidden="true" /> Radicar una PQR
          </Link>
        </div>
      )}

      {lista.length > 0 && visibles.length === 0 && (
        <div className="pqp-empty">
          <span className="pqp-empty-ico" aria-hidden="true">
            <i className="ti ti-search-off" />
          </span>
          <h3>No encontramos resultados</h3>
          <p>Prueba con otra palabra o cambia el filtro.</p>
          <button
            type="button"
            className="pqp-new"
            onClick={() => {
              setBusqueda('');
              setFiltro('todas');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="pqp-list">
        {visibles.map((p) => {
          const meta = TIPOS_META[p.tipo_pqr];
          const actual = indiceFaseVisible(p.estado_pqr);
          return (
            <button key={p.id_pqr} type="button" className="pqp-item" onClick={() => void abrir(p.id_pqr)}>
              <span className="pqp-ico" aria-hidden="true">
                <i className={`ti ${meta.icono}`} />
              </span>
              <span className="pqp-main">
                <span className="pqp-title">{p.asunto_pqr}</span>
                <span className="pqp-sub" title={fmtFechaHora(p.creado_en_pqr)}>
                  {meta.nombre} · {hace(p.creado_en_pqr)}
                </span>
                <span
                  className="pqrx pqrx-mini"
                  aria-hidden="true"
                  style={{ '--fase': ESTADO_COLOR[p.estado_pqr] } as CSSProperties}
                >
                  {FASES_VISIBLES.map((f, i) => (
                    <span key={f.key} className={i < actual ? 'on' : i === actual ? 'now' : ''} />
                  ))}
                </span>
              </span>
              <span className="pqp-code">{p.radicado}</span>
              <span className="pqrx pqp-state">
                <PqrEstadoPill estado={p.estado_pqr} />
                <PqrPlazoChip pqr={p} />
              </span>
              <i className="ti ti-chevron-right pqp-go" aria-hidden="true" />
            </button>
          );
        })}
      </div>

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