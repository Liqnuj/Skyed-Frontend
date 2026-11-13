import { useCallback, useEffect, useRef, useState } from 'react';
import { EyeOff, Loader2, RotateCcw, Search } from 'lucide-react';
import { apiFetch } from '../../../services/api';
import { reservaService } from '../../../services/socialService';
import { Paginacion } from '../../shared/Paginacion';
import type {
  EstadoRese,
  EtapaGestion,
  FiltrosReservasAdmin,
  ReservaAdmin,
  ResponsableReserva,
} from '../../../services/socialService';
import {
  ESTADO_RESE_LABEL,
  ESTADO_VISUAL_LABEL,
  ETAPA_LABEL,
  fechaCorta,
} from '../../../utils/reservasAdmin';
import '../../../styles/social/reservasAdmin.css';

interface Opcion {
  id: number;
  nombre: string;
}

interface Props {
  tipos: Opcion[];
  ambientes: Opcion[];
  /** Recarga lo demás del panel (KPIs, etc.) tras un cambio. */
  onChanged: () => Promise<void> | void;
  notify: (mensaje: string) => void;
  confirmar: (o: { titulo: string; mensaje: string; confirmar: string }) => Promise<boolean>;
  /** Abre el detalle de la reserva (Fase 5). Si no se pasa, no se muestra el botón. */
  onVer?: (id: number) => void;
  /** Filtro inicial opcional (p. ej. venir desde un KPI del inicio). */
  inicial?: Partial<FiltrosReservasAdmin>;
}

const VACIO: FiltrosReservasAdmin = {
  q: '', estado: '', etapa: '', id_tipo_eves: '', id_responsable: '', id_a: '',
  lugar: '', desde: '', hasta: '', orden: 'recientes',
};

const nombreCompleto = (u?: { nombre_u?: string; apellido_u?: string }) =>
  `${u?.nombre_u ?? ''} ${u?.apellido_u ?? ''}`.trim();

export default function AdminReservasLista({ tipos, ambientes, onChanged, notify, confirmar, onVer, inicial }: Props) {
  const [filtros, setFiltros] = useState<FiltrosReservasAdmin>({ ...VACIO, ...inicial });
  // El texto de búsqueda se envía con una pequeña pausa para no pedir en cada tecla.
  const [consulta, setConsulta] = useState(filtros);
  const [pagina, setPagina] = useState(1);
  const [filas, setFilas] = useState<ReservaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [responsables, setResponsables] = useState<ResponsableReserva[]>([]);
  const [verOcultas, setVerOcultas] = useState(false);
  const [trabajando, setTrabajando] = useState<number | null>(null);
  const ultimaPeticion = useRef(0);

  useEffect(() => {
    reservaService.responsables().then(setResponsables).catch(() => setResponsables([]));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setConsulta(filtros);
      setPagina(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [filtros]);

  const cargar = useCallback(async () => {
    const id = ++ultimaPeticion.current;
    setCargando(true);
    setError('');
    try {
      const res = await reservaService.listarAdmin({
        ...consulta,
        page: pagina,
        per_page: 15,
        ocultas: verOcultas,
      });
      if (id !== ultimaPeticion.current) return; // llegó una respuesta más nueva
      setFilas(res.data ?? []);
      setTotal(res.total ?? 0);
      setUltimaPagina(res.last_page ?? 1);
    } catch (e) {
      if (id !== ultimaPeticion.current) return;
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las reservas.');
    } finally {
      if (id === ultimaPeticion.current) setCargando(false);
    }
  }, [consulta, pagina, verOcultas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const set = <K extends keyof FiltrosReservasAdmin>(k: K, v: FiltrosReservasAdmin[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(VACIO);
  const rangoInvalido = !!filtros.desde && !!filtros.hasta && filtros.hasta < filtros.desde;



  const ocultar = async (r: ReservaAdmin) => {
    if (!(await confirmar({ titulo: 'Ocultar reserva', mensaje: '¿Ocultar esta reserva de tu panel? El cliente la sigue viendo.', confirmar: 'Ocultar' }))) return;
    setTrabajando(r.id_rese);
    try {
      await apiFetch(`/reservas/${r.id_rese}/ocultar`, { method: 'POST', body: JSON.stringify({ vista: 'admin' }) });
      notify('Reserva oculta');
      await cargar();
      await onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo ocultar la reserva.');
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <section className="section-view resx">
      <div className="section-header">
        <div>
          <span className="card-kicker">GESTIÓN</span>
          <h2>Gestión de reservas</h2>
        </div>
        <label className="resx-check">
          <input type="checkbox" checked={verOcultas} onChange={(e) => { setVerOcultas(e.target.checked); setPagina(1); }} />
          Ver ocultas
        </label>
      </div>

      <div className="admin-card resx-filtros">
        <div className="resx-busqueda">
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar por cliente, correo, teléfono, lugar, nombre o #número"
            value={filtros.q ?? ''}
            onChange={(e) => set('q', e.target.value)}
            maxLength={100}
          />
        </div>

        <select className="admin-select" value={filtros.estado ?? ''} onChange={(e) => set('estado', e.target.value as EstadoRese | '')} aria-label="Estado">
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_RESE_LABEL) as EstadoRese[]).map((k) => <option key={k} value={k}>{ESTADO_RESE_LABEL[k]}</option>)}
        </select>

        <select className="admin-select" value={filtros.etapa ?? ''} onChange={(e) => set('etapa', e.target.value as EtapaGestion | '')} aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {(Object.keys(ETAPA_LABEL) as EtapaGestion[]).map((k) => <option key={k} value={k}>{ETAPA_LABEL[k]}</option>)}
        </select>

        <select className="admin-select" value={filtros.id_tipo_eves ?? ''} onChange={(e) => set('id_tipo_eves', e.target.value ? Number(e.target.value) : '')} aria-label="Tipo de evento">
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>

        <select className="admin-select" value={filtros.id_a ?? ''} onChange={(e) => set('id_a', e.target.value ? Number(e.target.value) : '')} aria-label="Lugar">
          <option value="">Todos los lugares</option>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>

        <select className="admin-select" value={filtros.id_responsable ?? ''} onChange={(e) => set('id_responsable', e.target.value ? Number(e.target.value) : '')} aria-label="Responsable">
          <option value="">Todos los responsables</option>
          {responsables.map((r) => <option key={r.id_u} value={r.id_u}>{`${r.nombre_u} ${r.apellido_u}`}</option>)}
        </select>

        <label className="resx-fecha">Desde
          <input type="date" value={filtros.desde ?? ''} onChange={(e) => set('desde', e.target.value)} />
        </label>
        <label className="resx-fecha">Hasta
          <input type="date" value={filtros.hasta ?? ''} min={filtros.desde || undefined} onChange={(e) => set('hasta', e.target.value)} />
        </label>

        <select className="admin-select" value={filtros.orden ?? 'recientes'} onChange={(e) => set('orden', e.target.value as FiltrosReservasAdmin['orden'])} aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="fecha">Fecha del evento ↑</option>
          <option value="fecha_desc">Fecha del evento ↓</option>
          <option value="estado">Por estado</option>
        </select>

        {hayFiltros && (
          <button type="button" className="link-button" onClick={() => setFiltros({ ...VACIO })}>
            <RotateCcw size={14} /> Limpiar filtros
          </button>
        )}
        {rangoInvalido && <p className="resx-error">La fecha final no puede ser anterior a la inicial.</p>}
      </div>

      <div className="admin-card table-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Invit.</th><th>Estado</th><th>Responsable</th><th></th></tr>
            </thead>
            <tbody>
              {filas.map((r) => {
                const g = r.gestion;
                const fecha = g?.fecha_confirmada || g?.fecha_propuesta || r.fecha_evento_rese;
                const tipoFecha = g?.fecha_confirmada ? 'Confirmada' : g?.fecha_propuesta ? 'Propuesta' : 'Solicitada';
                const visual = (r as ReservaAdmin & { estado_visual?: keyof typeof ESTADO_VISUAL_LABEL }).estado_visual ?? 'nueva';
              const ocupado = trabajando === r.id_rese;
                return (
                  <tr key={r.id_rese}>
                    <td>#{r.id_rese}</td>
                    <td>
                      <strong>{nombreCompleto(r.usuario) || '—'}</strong>
                      <small className="resx-sub">{r.usuario?.correo_u}</small>
                    </td>
                    <td>
                      <strong>{r.nombre_rese || r.evento?.nombre_er || '—'}</strong>
                      <small className="resx-sub">{r.tipo_evento?.nombre_tipo_eves ?? r.evento?.nombre_er ?? ''}</small>
                    </td>
                    <td>
                      {fechaCorta(fecha)}
                      <small className={`resx-sub resx-tipo-${tipoFecha.toLowerCase()}`}>{tipoFecha}</small>
                    </td>
                    <td>{g?.ambiente?.nombre_a || r.ubicacion_rese || '—'}</td>
                    <td>{r.invitados_rese}</td>
                    <td>
                      <span className={`admin-badge ${visual}`}>{ESTADO_VISUAL_LABEL[visual]}</span>
                      {g?.etapa_gestion && r.estado_rese !== 'cancelada' && r.estado_rese !== 'completada' && (
                        <small className="resx-sub">{ETAPA_LABEL[g.etapa_gestion]}</small>
                      )}
                    </td>
                    <td>{g?.responsable ? nombreCompleto(g.responsable) : <span className="resx-sub">Sin asignar</span>}</td>
                    <td className="resx-acciones">
                      {onVer && <button type="button" className="table-action" onClick={() => onVer(r.id_rese)}>Ver</button>}

                      {(r.estado_rese === 'cancelada' || r.estado_rese === 'completada') && !verOcultas && (
                        <button type="button" className="table-action" title="Ocultar de mi panel" disabled={ocupado} onClick={() => void ocultar(r)}><EyeOff size={15} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!cargando && !error && !filas.length && (
                <tr><td colSpan={9}>{hayFiltros ? 'Ninguna reserva coincide con los filtros.' : 'No hay reservas.'}</td></tr>
              )}
              {error && <tr><td colSpan={9} className="resx-error">{error}</td></tr>}
            </tbody>
          </table>
        </div>

        <Paginacion
          pag={{ actual: pagina, totalPaginas: ultimaPagina, total, porPagina: 15 }}
          onCambiar={setPagina}
        />
      </div>
    </section>
  );
}