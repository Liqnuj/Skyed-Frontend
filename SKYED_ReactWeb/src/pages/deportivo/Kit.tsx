import { useCallback, useEffect, useMemo, useState } from 'react';
import SiteHeader from '../../components/SiteHeader';
import SiteFooter from '../../components/SiteFooter';
import Protected from '../../components/Protected';
import { apiFetch } from '../../services/api';

interface EventoOpt {
  id: number;
  nombre: string;
}

interface Entrega {
  id_ek: number;
  id_i: number | null;
  id_inv: number | null;
  estado_ek: 'pendiente' | 'entregado' | 'devolucion';
  fecha_entrega_real_ek: string | null;
  persona_entrega_ek: string | null;
  kit?: { nombre_k: string | null } | null;
  usuario?: {
    nombre_u: string;
    apellido_u: string;
    documento_u: number | string;
  } | null;
  inscripcion?: { talla_camiseta_i: string | null } | null;
  invitado?: {
    nombre_inv: string;
    apellido_inv: string;
    documento_inv: number | string;
    talla_kit_inv: string | null;
  } | null;
}

interface Grupo {
  clave: string;
  titular: Entrega | null;
  invitado: Entrega | null;
}

const ESTADO_TXT: Record<string, string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  devolucion: 'Devolución',
};

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function agrupar(entregas: Entrega[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const e of entregas) {
    const clave = e.id_i != null ? `i${e.id_i}` : `e${e.id_ek}`;
    const g = mapa.get(clave) ?? { clave, titular: null, invitado: null };
    if (e.id_inv == null) g.titular = e;
    else g.invitado = e;
    mapa.set(clave, g);
  }
  return Array.from(mapa.values());
}

const pillStyle = (estado: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '.15rem .6rem',
  borderRadius: '999px',
  fontSize: '.8rem',
  fontWeight: 600,
  border: '1px solid currentColor',
  opacity: estado === 'entregado' ? 1 : 0.75,
});

const filaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '.75rem',
  padding: '.75rem 0',
  borderTop: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
};

export default function Kit() {
  const [eventos, setEventos] = useState<EventoOpt[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Lista de eventos para el selector.
  useEffect(() => {
    apiFetch('/eventos?per_page=200')
      .then((data) => {
        const lista: any[] = Array.isArray(data) ? data : data?.eventos ?? data?.data ?? [];
        const opts = lista.map((e) => ({
          id: Number(e.id ?? e.id_e),
          nombre: String(e.nombre ?? e.nombre_e ?? `Evento ${e.id ?? e.id_e}`),
        }));
        setEventos(opts);
        if (opts.length) setEventoId((prev) => prev ?? opts[0].id);
      })
      .catch(() => setError('No se pudieron cargar los eventos.'));
  }, []);

  // Espera a que se deje de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(() => {
    if (eventoId == null) return;
    setCargando(true);
    setError(null);
    const params = new URLSearchParams({ per_page: '50' });
    if (q) params.set('q', q);
    if (estado !== 'todos') params.set('estado', estado);
    apiFetch(`/eventos/${eventoId}/entregas-kit?${params.toString()}`)
      .then((data) => setEntregas(data?.entregas?.data ?? []))
      .catch((err: any) => setError(err?.message || 'No se pudieron cargar las entregas.'))
      .finally(() => setCargando(false));
  }, [eventoId, q, estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => agrupar(entregas), [entregas]);

  const cambiarEstado = async (e: Entrega, nuevo: 'entregado' | 'pendiente') => {
    if (nuevo === 'pendiente' && !window.confirm('¿Deshacer la entrega de este kit?')) return;
    setGuardando(e.id_ek);
    setAviso(null);
    setError(null);
    try {
      const data = await apiFetch(`/entregas-kit/${e.id_ek}`, {
        method: 'PUT',
        body: JSON.stringify({ estado_ek: nuevo }),
      });
      const actualizada: Entrega = data?.entrega ?? { ...e, estado_ek: nuevo };
      setEntregas((prev) => prev.map((x) => (x.id_ek === e.id_ek ? { ...x, ...actualizada } : x)));
      setAviso(nuevo === 'entregado' ? 'Kit marcado como entregado.' : 'Entrega deshecha.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la entrega.');
    } finally {
      setGuardando(null);
    }
  };

  const renderFila = (e: Entrega | null, esInvitado: boolean) => {
    if (!e) return null;
    const talla = esInvitado ? e.invitado?.talla_kit_inv : e.inscripcion?.talla_camiseta_i;
    const entregado = e.estado_ek === 'entregado';
    return (
      <div style={filaStyle} key={e.id_ek}>
        <div>
          <strong>{esInvitado ? 'Invitado' : 'Participante'}</strong>
          {esInvitado && e.invitado && (
            <span>
              {' '}
              · {e.invitado.nombre_inv} {e.invitado.apellido_inv} · Doc. {e.invitado.documento_inv}
            </span>
          )}
          <div style={{ fontSize: '.9rem', opacity: 0.8 }}>
            {e.kit?.nombre_k || 'Kit'} · Talla {talla || '—'}
            {entregado && e.fecha_entrega_real_ek && (
              <> · {fmtFecha(e.fecha_entrega_real_ek)}{e.persona_entrega_ek ? ` por ${e.persona_entrega_ek}` : ''}</>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={pillStyle(e.estado_ek)}>{ESTADO_TXT[e.estado_ek] ?? e.estado_ek}</span>
          {entregado ? (
            <button
              type="button"
              className="button"
              disabled={guardando === e.id_ek}
              onClick={() => cambiarEstado(e, 'pendiente')}
              style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor' }}
            >
              Deshacer
            </button>
          ) : (
            <button
              type="button"
              className="button"
              title="Marcar este kit como entregado"
              disabled={guardando === e.id_ek}
              onClick={() => cambiarEstado(e, 'entregado')}
            >
              {guardando === e.id_ek ? 'Guardando…' : 'Entregar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Protected>
      <SiteHeader brand="sport" />
      <main className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">STAFF</span>
              <h1>Entrega de kits del corredor</h1>
              <p>Busca por documento o nombre del titular o de su invitado y marca cada kit por separado.</p>
            </div>
          </div>

          <div className="form-card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="kit-evento">Evento</label>
              <select
                id="kit-evento"
                value={eventoId ?? ''}
                onChange={(ev) => setEventoId(Number(ev.target.value))}
              >
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="kit-buscar">Buscar</label>
              <input
                id="kit-buscar"
                placeholder="Documento o nombre (titular o invitado)"
                value={busqueda}
                onChange={(ev) => setBusqueda(ev.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="kit-estado">Estado</label>
              <select id="kit-estado" value={estado} onChange={(ev) => setEstado(ev.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="entregado">Entregados</option>
              </select>
            </div>
            {aviso && <div className="form-success">{aviso}</div>}
            {error && <div className="form-error" role="alert">{error}</div>}
          </div>

          {cargando && <p>Cargando…</p>}
          {!cargando && !error && grupos.length === 0 && (
            <p>No hay entregas de kit para este filtro.</p>
          )}

          <div className="grid" style={{ gap: '1rem' }}>
            {grupos.map((g) => {
              const t = g.titular?.usuario ?? g.invitado?.usuario;
              return (
                <div className="card" key={g.clave}>
                  <div className="card-body">
                    <h2 style={{ marginTop: 0 }}>
                      {t ? `${t.nombre_u} ${t.apellido_u}` : 'Inscripción'}
                      {t && <span style={{ fontWeight: 400, fontSize: '1rem' }}> · Doc. {t.documento_u}</span>}
                    </h2>
                    {renderFila(g.titular, false)}
                    {renderFila(g.invitado, true)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter variant="sport" />
    </Protected>
  );
}