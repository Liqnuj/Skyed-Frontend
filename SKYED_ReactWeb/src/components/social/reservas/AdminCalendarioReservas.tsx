import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { reservaService } from '../../../services/socialService';
import type { EstadoVisualReserva, EventoCalendario } from '../../../services/socialService';
import {
  ESTADO_RESE_LABEL,
  ESTADO_VISUAL_COLOR,
  ESTADO_VISUAL_LABEL,
  ETAPA_LABEL,
  FECHA_TIPO_LABEL,
  aYmd,
  fechaCorta,
} from '../../../utils/reservasAdmin';
import '../../../styles/social/reservasCalendario.css';

type Vista = 'mes' | 'semana' | 'dia';

interface Props {
  /** Abre el detalle de la reserva. */
  onVer: (id: number) => void;
  /** Cambia cuando el panel recarga datos, para refrescar el calendario. */
  version?: unknown;
}

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const ESTADOS: EstadoVisualReserva[] = ['nueva', 'en_planificacion', 'confirmada', 'reprogramada', 'finalizada', 'cancelada'];

/* ---- fechas (siempre al mediodía local para que el día no se corra) ---- */
const aFecha = (ymd: string) => new Date(`${ymd}T12:00:00`);
const sumar = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunesDe = (d: Date) => sumar(d, -((d.getDay() + 6) % 7));
/** "Hoy" en Colombia, sin depender de la zona del navegador. */
const hoyColombia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const h5 = (v?: string | null) => (v ? v.slice(0, 5) : '');

function rangoDe(vista: Vista, ancla: Date): { desde: Date; hasta: Date } {
  if (vista === 'dia') return { desde: ancla, hasta: ancla };
  if (vista === 'semana') { const l = lunesDe(ancla); return { desde: l, hasta: sumar(l, 6) }; }
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1, 12);
  const l = lunesDe(primero);
  return { desde: l, hasta: sumar(l, 41) }; // 6 semanas completas (42 días < 100)
}

function tituloDe(vista: Vista, ancla: Date): string {
  if (vista === 'mes') return mayus(new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(ancla));
  if (vista === 'dia') return mayus(new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ancla));
  const { desde, hasta } = rangoDe('semana', ancla);
  const f = (d: Date, y: boolean) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}) }).format(d).replace('.', '');
  return `${f(desde, false)} – ${f(hasta, true)}`;
}

const horaTexto = (e: EventoCalendario) =>
  e.hora_inicio ? `${h5(e.hora_inicio)}${e.hora_fin ? `–${h5(e.hora_fin)}` : ''}` : '';

const porHora = (a: EventoCalendario, b: EventoCalendario) =>
  (a.hora_inicio ?? '99:99').localeCompare(b.hora_inicio ?? '99:99') || a.titulo.localeCompare(b.titulo);

export default function AdminCalendarioReservas({ onVer, version }: Props) {
  const [vista, setVista] = useState<Vista>('mes');
  const [ancla, setAncla] = useState<Date>(() => aFecha(hoyColombia()));
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocultos, setOcultos] = useState<Set<EstadoVisualReserva>>(new Set());
  const [elegido, setElegido] = useState<EventoCalendario | null>(null);
  const ultima = useRef(0);

  const hoy = hoyColombia();
  const { desde, hasta } = useMemo(() => rangoDe(vista, ancla), [vista, ancla]);
  const desdeYmd = aYmd(desde);
  const hastaYmd = aYmd(hasta);

  const cargar = useCallback(async () => {
    const id = ++ultima.current;
    setCargando(true);
    setError('');
    try {
      const lista = await reservaService.calendario(desdeYmd, hastaYmd);
      if (id !== ultima.current) return;
      setEventos(lista);
    } catch (e) {
      if (id !== ultima.current) return;
      setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario.');
      setEventos([]);
    } finally {
      if (id === ultima.current) setCargando(false);
    }
  }, [desdeYmd, hastaYmd]);

  useEffect(() => { void cargar(); }, [cargar, version]);

  // Esc cierra el resumen rápido.
  useEffect(() => {
    if (!elegido) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setElegido(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [elegido]);

  const visibles = useMemo(() => eventos.filter((e) => !ocultos.has(e.estado_visual)), [eventos, ocultos]);

  const eventosDelDia = useCallback((ymd: string) =>
    visibles.filter((e) => e.fecha_inicio <= ymd && ymd <= e.fecha_fin).sort(porHora), [visibles]);

  const mover = (dir: -1 | 1) => {
    setAncla((a) => {
      if (vista === 'mes') return new Date(a.getFullYear(), a.getMonth() + dir, 1, 12);
      return sumar(a, dir * (vista === 'semana' ? 7 : 1));
    });
  };

  const irADia = (ymd: string) => { setAncla(aFecha(ymd)); setVista('dia'); };

  const alternar = (estado: EstadoVisualReserva) =>
    setOcultos((prev) => { const n = new Set(prev); if (n.has(estado)) n.delete(estado); else n.add(estado); return n; });

  const dias = useMemo(() => {
    const n = vista === 'mes' ? 42 : vista === 'semana' ? 7 : 1;
    return Array.from({ length: n }, (_, i) => aYmd(sumar(desde, i)));
  }, [vista, desde]);

  const chip = (e: EventoCalendario, ymd: string, compacto: boolean) => {
    const color = ESTADO_VISUAL_COLOR[e.estado_visual];
    const pos = e.fecha_inicio === e.fecha_fin ? 'unico' : ymd === e.fecha_inicio ? 'inicio' : ymd === e.fecha_fin ? 'fin' : 'medio';
    const muestraTitulo = pos === 'unico' || pos === 'inicio' || aFecha(ymd).getDay() === 1;
    return (
      <button
        key={`${e.id_rese}-${ymd}`}
        type="button"
        className={`cal-chip pos-${pos}${e.aproximada ? ' aprox' : ''}${compacto ? ' compacto' : ''}`}
        style={{ ['--c' as string]: color }}
        title={`${e.titulo} · ${ESTADO_VISUAL_LABEL[e.estado_visual]}`}
        aria-label={`${e.titulo}, ${ESTADO_VISUAL_LABEL[e.estado_visual]}, ${fechaCorta(e.fecha_inicio)}`}
        onClick={(ev) => { ev.stopPropagation(); setElegido(e); }}
      >
        {muestraTitulo ? (
          <>
            {pos !== 'medio' && e.hora_inicio && <b>{h5(e.hora_inicio)}</b>} {e.titulo}
          </>
        ) : <span className="cal-cont">continúa</span>}
      </button>
    );
  };

  return (
    <section className="admin-card cal">
      <div className="cal-head">
        <div>
          <span className="card-kicker">CALENDARIO</span>
          <h2><CalendarDays size={18} /> {tituloDe(vista, ancla)}</h2>
        </div>
        <div className="cal-controles">
          <div className="cal-nav" role="group" aria-label="Navegar">
            <button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <button type="button" className="secondary-btn" onClick={() => setAncla(aFecha(hoy))}>Hoy</button>
            <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label="Siguiente"><ChevronRight size={18} /></button>
          </div>
          <div className="cal-vistas" role="tablist" aria-label="Vista">
            {(['mes', 'semana', 'dia'] as Vista[]).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={vista === v} className={vista === v ? 'activo' : ''} onClick={() => setVista(v)}>
                {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
          {cargando && <Loader2 size={16} className="resx-spin" aria-label="Cargando" />}
        </div>
      </div>

      <div className="cal-leyenda">
        {ESTADOS.map((s) => (
          <button key={s} type="button" className={ocultos.has(s) ? 'off' : ''} onClick={() => alternar(s)} aria-pressed={!ocultos.has(s)} title="Mostrar u ocultar">
            <i style={{ background: ESTADO_VISUAL_COLOR[s] }} /> {ESTADO_VISUAL_LABEL[s]}
          </button>
        ))}
        <span className="cal-aprox"><i /> Fecha aproximada</span>
      </div>

      {error && <p className="resx-error">{error}</p>}

      {vista === 'mes' && (
        <div className="cal-mes">
          {DIAS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {dias.map((ymd) => {
            const lista = eventosDelDia(ymd);
            const fuera = aFecha(ymd).getMonth() !== ancla.getMonth();
            return (
              <div
                key={ymd}
                className={`cal-dia${fuera ? ' fuera' : ''}${ymd === hoy ? ' hoy' : ''}`}
                onClick={() => irADia(ymd)}
              >
                <button type="button" className="cal-num" onClick={(ev) => { ev.stopPropagation(); irADia(ymd); }} aria-label={`Ver el día ${fechaCorta(ymd)}`}>
                  {aFecha(ymd).getDate()}
                </button>
                <div className="cal-items">
                  {lista.slice(0, 3).map((e) => chip(e, ymd, true))}
                  {lista.length > 3 && (
                    <button type="button" className="cal-mas" onClick={(ev) => { ev.stopPropagation(); irADia(ymd); }}>+{lista.length - 3} más</button>
                  )}
                </div>
                {/* En pantallas pequeñas solo se ven puntos de color. */}
                {lista.length > 0 && (
                  <div className="cal-puntos" aria-hidden="true">
                    {lista.slice(0, 4).map((e) => <i key={e.id_rese} style={{ background: ESTADO_VISUAL_COLOR[e.estado_visual] }} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {vista !== 'mes' && (
        <div className={`cal-lista ${vista}`}>
          {dias.map((ymd) => {
            const lista = eventosDelDia(ymd);
            const d = aFecha(ymd);
            return (
              <div key={ymd} className={`cal-col${ymd === hoy ? ' hoy' : ''}`}>
                <header onClick={() => vista === 'semana' && irADia(ymd)} className={vista === 'semana' ? 'clic' : ''}>
                  <span>{DIAS[(d.getDay() + 6) % 7]}</span>
                  <strong>{d.getDate()}</strong>
                </header>
                {lista.map((e) => (
                  <button
                    key={e.id_rese}
                    type="button"
                    className={`cal-evento${e.aproximada ? ' aprox' : ''}`}
                    style={{ ['--c' as string]: ESTADO_VISUAL_COLOR[e.estado_visual] }}
                    onClick={() => setElegido(e)}
                  >
                    <span className="cal-hora">{horaTexto(e) || 'Hora por definir'}</span>
                    <strong>{e.titulo}</strong>
                    <small>{[e.tipo_evento?.nombre, e.lugar].filter(Boolean).join(' · ')}</small>
                    {vista === 'dia' && <small>{e.usuario}{e.invitados ? ` · ${e.invitados} invitados` : ''}</small>}
                    <em>{ESTADO_VISUAL_LABEL[e.estado_visual]}{e.aproximada ? ' · fecha aproximada' : ''}</em>
                  </button>
                ))}
                {!lista.length && <p className="cal-vacio">{vista === 'dia' ? 'No hay eventos este día.' : '—'}</p>}
              </div>
            );
          })}
        </div>
      )}

      {!cargando && !error && !eventos.length && <p className="cal-vacio">No hay eventos en este período.</p>}

      {elegido && (
        <div className="cal-fondo" onClick={() => setElegido(null)}>
          <div className="cal-modal" role="dialog" aria-modal="true" aria-label={`Resumen de ${elegido.titulo}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="icon-btn cal-cerrar" onClick={() => setElegido(null)} aria-label="Cerrar"><X size={18} /></button>
            <span className="card-kicker">RESERVA #{elegido.id_rese}</span>
            <h3>{elegido.titulo}</h3>
            <div className="det-chips">
              <span className={`admin-badge ${elegido.estado_visual}`}>{ESTADO_VISUAL_LABEL[elegido.estado_visual]}</span>
              <span className="det-chip">Estado: {ESTADO_RESE_LABEL[elegido.estado_rese]}</span>
              {elegido.etapa_gestion && elegido.estado_rese === 'pendiente' && <span className="det-chip">Etapa: {ETAPA_LABEL[elegido.etapa_gestion]}</span>}
            </div>
            <dl className="cal-datos">
              <div><dt>Fecha</dt><dd>
                {fechaCorta(elegido.fecha_inicio)}{elegido.fecha_fin !== elegido.fecha_inicio ? ` – ${fechaCorta(elegido.fecha_fin)}` : ''}
                <small> · {FECHA_TIPO_LABEL[elegido.fecha_tipo]}{elegido.aproximada ? ' (aproximada)' : ''}</small>
              </dd></div>
              <div><dt>Hora</dt><dd>{horaTexto(elegido) || 'Por definir'}</dd></div>
              <div><dt>Tipo</dt><dd>{elegido.tipo_evento?.nombre ?? '—'}</dd></div>
              <div><dt>Lugar</dt><dd>{elegido.lugar ?? '—'}</dd></div>
              <div><dt>Cliente</dt><dd>{elegido.usuario}</dd></div>
              <div><dt>Invitados</dt><dd>{elegido.invitados ?? '—'}</dd></div>
              <div><dt>Responsable</dt><dd>{elegido.responsable ?? 'Sin asignar'}</dd></div>
            </dl>
            <div className="det-botones">
              <button type="button" className="secondary-btn" onClick={() => setElegido(null)}>Cerrar</button>
              <button type="button" className="primary-btn" onClick={() => { const id = elegido.id_rese; setElegido(null); onVer(id); }}>Ver reserva</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}