import { useEffect, useMemo, useState } from 'react';
import { Medal, Trophy, X } from 'lucide-react';
import { apiFetch } from '../../services/api';
import type { Avisar } from '../shared/Avisos';
import '../../styles/deportivo/resultadosPorEvento.css';

/**
 * Resultados de todo un evento en una sola pantalla (panel admin deportivo).
 *
 * - Muestra a todos los inscritos confirmados, agrupados por su categoría
 *   (nivel de competencia).
 * - El administrador escribe los tiempos y la tabla se ordena sola: menor
 *   tiempo = mejor puesto. Los 3 primeros de cada categoría se resaltan como
 *   posibles ganadores (🥇🥈🥉), así se eligen todos a la vez.
 * - Al guardar, el backend calcula las posiciones oficiales (general y por
 *   categoría) y avisa a los participantes si se publican como oficiales.
 */
interface Participante {
  id_i: number;
  nombre: string;
  documento: number | string | null;
  dorsal: number | null;
  id_cc: number | null;
  categoria: string | null;
  resultado: {
    id_r: number;
    tiempo_final_r: string;
    estado_r: string;
    posicion_general_r: number | null;
    posicion_categoria: number | null;
  } | null;
}

interface Tablero {
  evento: { id: number; nombre: string; fecha: string | null };
  categorias: Array<{ id_cc: number; nombre: string }>;
  participantes: Participante[];
}

type Fila = { tiempo: string; descalificado: boolean };

const SIN_CATEGORIA = 'sin';
const MEDALLAS = ['🥇', '🥈', '🥉'];

/** "2:5:3" / "02:05:03" → "02:05:03"; si no es un tiempo válido devuelve null. */
function normalizarTiempo(valor: string): string | null {
  const partes = valor.trim().split(':');
  if (partes.length !== 3 || partes.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const [h, m, s] = partes.map(Number);
  if (m > 59 || s > 59 || (h === 0 && m === 0 && s === 0)) return null;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Deja solo dígitos y pone los ":" mientras se escribe (020530 → 02:05:30). */
function formatearMientrasEscribe(valor: string): string {
  if (valor.includes(':')) return valor.replace(/[^\d:]/g, '').slice(0, 8);
  const d = valor.replace(/\D/g, '').slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`;
}

export default function ResultadosPorEvento({ eventos, eventoInicial, notify, onClose, onGuardado }: {
  eventos: Array<{ id: number; nombre: string; fecha?: string | null }>;
  eventoInicial?: number | null;
  notify: Avisar;
  onClose: () => void;
  onGuardado: () => Promise<void> | void;
}) {
  const [eventoId, setEventoId] = useState<string>(eventoInicial ? String(eventoInicial) : '');
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filas, setFilas] = useState<Record<number, Fila>>({});
  const [guardando, setGuardando] = useState(false);

  // Eventos que ya pasaron o son de hoy primero (son los que tienen resultados).
  const opciones = useMemo(
    () => [...eventos].sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? ''))),
    [eventos],
  );

  useEffect(() => {
    if (!eventoId) { setTablero(null); return; }
    let vivo = true;
    setCargando(true);
    apiFetch(`/eventos/${eventoId}/resultados/tablero`)
      .then((data: Tablero) => {
        if (!vivo) return;
        setTablero(data);
        const inicial: Record<number, Fila> = {};
        data.participantes.forEach((p) => {
          inicial[p.id_i] = {
            tiempo: p.resultado?.tiempo_final_r?.slice(0, 8) ?? '',
            descalificado: p.resultado?.estado_r === 'descalificado',
          };
        });
        setFilas(inicial);
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'No se pudieron cargar los participantes.', 'error'))
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [eventoId]);

  const cambiar = (id: number, parcial: Partial<Fila>) =>
    setFilas((f) => ({ ...f, [id]: { ...(f[id] ?? { tiempo: '', descalificado: false }), ...parcial } }));

  // Grupos por categoría (nivel), cada uno ordenado por tiempo: así se ve el podio en vivo.
  const grupos = useMemo(() => {
    if (!tablero) return [];
    const nombres = new Map(tablero.categorias.map((c) => [String(c.id_cc), c.nombre]));
    const porGrupo = new Map<string, Participante[]>();
    tablero.participantes.forEach((p) => {
      const clave = p.id_cc ? String(p.id_cc) : SIN_CATEGORIA;
      porGrupo.set(clave, [...(porGrupo.get(clave) ?? []), p]);
    });
    return [...porGrupo.entries()].map(([clave, lista]) => {
      const conTiempo = lista
        .map((p) => ({ p, t: normalizarTiempo(filas[p.id_i]?.tiempo ?? ''), dq: !!filas[p.id_i]?.descalificado }))
        .sort((a, b) => {
          // Primero los que tienen tiempo válido y no están descalificados, del más rápido al más lento.
          const va = a.t && !a.dq ? 0 : 1;
          const vb = b.t && !b.dq ? 0 : 1;
          if (va !== vb) return va - vb;
          return (a.t ?? '99:99:99').localeCompare(b.t ?? '99:99:99');
        });
      let puesto = 0;
      const ordenados = conTiempo.map((x) => ({ ...x, puesto: x.t && !x.dq ? ++puesto : null }));
      return {
        clave,
        nombre: clave === SIN_CATEGORIA ? 'Sin categoría asignada' : (nombres.get(clave) ?? lista[0].categoria ?? 'Categoría'),
        ordenados,
        ganadores: ordenados.filter((x) => x.puesto && x.puesto <= 3),
      };
    }).sort((a, b) => (a.clave === SIN_CATEGORIA ? 1 : b.clave === SIN_CATEGORIA ? -1 : a.nombre.localeCompare(b.nombre)));
  }, [tablero, filas]);

  const listos = tablero?.participantes.filter((p) => normalizarTiempo(filas[p.id_i]?.tiempo ?? '')) ?? [];
  const invalidos = tablero?.participantes.filter((p) => {
    const v = filas[p.id_i]?.tiempo ?? '';
    return v.trim() !== '' && !normalizarTiempo(v);
  }) ?? [];

  const guardar = async (estado: 'oficial' | 'en revision') => {
    if (!tablero) return;
    if (invalidos.length) {
      notify(`Revisa el tiempo de: ${invalidos.map((p) => p.nombre).join(', ')}. Usa el formato HH:MM:SS.`, 'error');
      return;
    }
    if (!listos.length) {
      notify('Escribe el tiempo de al menos un participante.', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = await apiFetch(`/eventos/${tablero.evento.id}/resultados/lote`, {
        method: 'POST',
        body: JSON.stringify({
          estado_r: estado,
          filas: listos.map((p) => ({
            id_i: p.id_i,
            tiempo_final_r: normalizarTiempo(filas[p.id_i].tiempo),
            descalificado: !!filas[p.id_i].descalificado,
          })),
        }),
      });
      notify(data?.message ?? 'Resultados guardados.');
      await onGuardado();
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudieron guardar los resultados.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal rpe-modal" role="dialog" aria-modal="true" aria-labelledby="rpe-titulo">
        <div className="admin-modal-head">
          <div>
            <h2 id="rpe-titulo">Resultados por evento</h2>
            <p>Escribe los tiempos: las posiciones y los posibles ganadores de cada categoría se calculan solos.</p>
          </div>
          <button title="Cerrar" className="icon-btn" onClick={onClose} aria-label="Cerrar" disabled={guardando}>
            <X size={19} />
          </button>
        </div>

        <div className="rpe-cuerpo">
          <label className="admin-field rpe-evento">
            <span>Evento</span>
            <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} disabled={guardando}>
              <option value="">Selecciona un evento…</option>
              {opciones.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          </label>

          {cargando && <p className="rpe-nota">Cargando participantes…</p>}
          {!cargando && tablero && tablero.participantes.length === 0 && (
            <p className="rpe-nota">Este evento no tiene inscripciones confirmadas todavía.</p>
          )}

          {!cargando && grupos.map((g) => (
            <section key={g.clave} className="rpe-grupo" aria-label={`Categoría ${g.nombre}`}>
              <header className="rpe-grupo-head">
                <h3><Trophy size={16} /> {g.nombre}</h3>
                <span className="rpe-podio" aria-label="Posibles ganadores">
                  {g.ganadores.length
                    ? g.ganadores.map((x) => (
                      <span key={x.p.id_i} className={`rpe-medalla p${x.puesto}`}>{MEDALLAS[(x.puesto ?? 1) - 1]} {x.p.nombre}</span>
                    ))
                    : <span className="rpe-nota">Escribe los tiempos para ver el podio.</span>}
                </span>
              </header>
              <div className="table-scroll">
                <table className="admin-table rpe-tabla">
                  <thead>
                    <tr><th>Puesto</th><th>Participante</th><th>Dorsal</th><th>Tiempo (HH:MM:SS)</th><th>Descalificado</th></tr>
                  </thead>
                  <tbody>
                    {g.ordenados.map(({ p, puesto, dq }) => {
                      const valor = filas[p.id_i]?.tiempo ?? '';
                      const malo = valor.trim() !== '' && !normalizarTiempo(valor);
                      return (
                        <tr key={p.id_i} className={puesto && puesto <= 3 ? `rpe-top p${puesto}` : dq ? 'rpe-dq' : ''}>
                          <td className="rpe-puesto">
                            {puesto ? <>{puesto <= 3 ? <Medal size={15} /> : null}{puesto}.º</> : dq ? 'DQ' : '—'}
                          </td>
                          <td>
                            <strong>{p.nombre}</strong>
                            {p.documento && <small className="rpe-sub">Doc. {p.documento}</small>}
                          </td>
                          <td>{p.dorsal ?? '—'}</td>
                          <td>
                            <input
                              className={`rpe-tiempo${malo ? ' rpe-malo' : ''}`}
                              value={valor}
                              inputMode="numeric"
                              placeholder="02:15:30"
                              aria-label={`Tiempo de ${p.nombre}`}
                              aria-invalid={malo || undefined}
                              onChange={(e) => cambiar(p.id_i, { tiempo: formatearMientrasEscribe(e.target.value) })}
                              disabled={guardando}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={dq}
                              aria-label={`Descalificar a ${p.nombre}`}
                              onChange={(e) => cambiar(p.id_i, { descalificado: e.target.checked })}
                              disabled={guardando}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {tablero && tablero.participantes.length > 0 && (
          <div className="modal-actions rpe-acciones">
            <span className="rpe-nota">{listos.length} de {tablero.participantes.length} con tiempo</span>
            <button type="button" className="secondary-btn" onClick={() => guardar('en revision')} disabled={guardando}>
              Guardar en revisión
            </button>
            <button type="button" className="primary-btn" onClick={() => guardar('oficial')} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Publicar resultados oficiales'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
