import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SocialWrapper from '../../components/social/SocialWrapper';
import Toast from '../../components/social/Toast';
import type { ToastMsg } from '../../components/social/Toast';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { pqrService, reservaService } from '../../services/socialService';
import type { Pqr, Reserva, TipoPqr } from '../../services/socialService';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/social/perfil.css';

type TabId = 'resumen' | 'pqr' | 'reservas' | 'ajustes';
const TABS: TabId[] = ['resumen', 'pqr', 'reservas', 'ajustes'];

function tipoDocumentoLabel(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'C.C.', cedula: 'C.C.', cedula_ciudadania: 'C.C.',
    TI: 'T.I.', tarjeta_identidad: 'T.I.',
    CE: 'C.E.', cedula_extranjeria: 'C.E.',
    PA: 'Pasaporte', pasaporte: 'Pasaporte',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

/** Las fechas sin hora ("1995-03-10") se leen como UTC y en Colombia (UTC-5)
 *  se mostraban un día antes. Se arman por partes para evitarlo. */
function soloFecha(iso: string | null | undefined) {
  return iso ? String(iso).slice(0, 10) : '';
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** El backend puede devolver "CC", "cedula" o "cedula_ciudadania"; el selector
 *  usa siempre CC / TI / CE / PA (los mismos valores que Deportivo). */
function normalizarTipoDoc(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'CC', cedula: 'CC', cedula_ciudadania: 'CC',
    TI: 'TI', tarjeta_identidad: 'TI',
    CE: 'CE', cedula_extranjeria: 'CE',
    PA: 'PA', pasaporte: 'PA',
  };
  return tipo ? (map[tipo] ?? '') : '';
}

function fmtMoney(n: string | number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

const pqrTipoLabel: Record<TipoPqr, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
  felicitacion: 'Felicitación',
};

const pqrTipoIcon: Record<TipoPqr, string> = {
  peticion: 'ti-file-text',
  queja: 'ti-mood-sad',
  reclamo: 'ti-alert-triangle',
  sugerencia: 'ti-bulb',
  felicitacion: 'ti-heart',
};

function pqrEstadoPill(estado: Pqr['estado_pqr']) {
  if (estado === 'abierto') return { cls: 'pending', txt: 'Abierto' };
  if (estado === 'en_proceso') return { cls: 'pending', txt: 'En proceso' };
  if (estado === 'cerrado') return { cls: 'warn', txt: 'Cerrado' };
  return { cls: 'ok', txt: 'Resuelto' };
}

function reservaEstadoPill(estado: Reserva['estado_rese']) {
  if (estado === 'pendiente') return { cls: 'pending', txt: 'Pendiente' };
  if (estado === 'cancelada') return { cls: 'warn', txt: 'Cancelada' };
  if (estado === 'completada') return { cls: 'ok', txt: 'Completada' };
  return { cls: 'ok', txt: 'Confirmada' };
}

/* ---------- Búsqueda y filtros de las listas (Mis PQR / Mis reservas) ---------- */
type RangoFecha = 'todas' | '7d' | '30d' | 'mes' | 'anio' | 'proximas' | 'pasadas' | 'custom';

interface Filtros {
  q: string;
  rango: RangoFecha;
  desde: string;
  hasta: string;
  orden: 'recientes' | 'antiguos';
  estado: string; // 'todos' o el valor del estado (abierto, pendiente, ...)
}

const FILTROS_INICIALES: Filtros = { q: '', rango: 'todas', desde: '', hasta: '', orden: 'recientes', estado: 'todos' };

const ESTADOS_PQR: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
];

const ESTADOS_RESERVAS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
];

function contarPor<T>(items: T[] | null, get: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  (items ?? []).forEach((it) => {
    const k = get(it);
    out[k] = (out[k] ?? 0) + 1;
  });
  return out;
}

const RANGOS_PQR: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

const RANGOS_RESERVAS: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

/** Minúsculas y sin tildes, para que "felicitacion" encuentre "Felicitación". */
function normalizar(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isoLocal(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Límites (AAAA-MM-DD) del rango elegido; '' significa "sin límite". */
function limitesRango(f: Filtros): { desde: string; hasta: string } {
  const hoy = new Date();
  const hoyIso = isoLocal(hoy);
  const atras = (n: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    return isoLocal(d);
  };
  switch (f.rango) {
    case '7d': return { desde: atras(7), hasta: hoyIso };
    case '30d': return { desde: atras(30), hasta: hoyIso };
    case 'mes':
      return {
        desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
      };
    case 'anio': return { desde: `${hoy.getFullYear()}-01-01`, hasta: `${hoy.getFullYear()}-12-31` };
    case 'proximas': return { desde: hoyIso, hasta: '' };
    case 'pasadas': return { desde: '', hasta: atras(1) };
    case 'custom': return { desde: f.desde, hasta: f.hasta };
    default: return { desde: '', hasta: '' };
  }
}

function filtrarLista<T>(
  items: T[] | null,
  f: Filtros,
  getFecha: (x: T) => string | null | undefined,
  getTexto: (x: T) => string,
  getEstado: (x: T) => string,
): T[] | null {
  if (!items) return null;
  const q = normalizar(f.q.trim());
  const { desde, hasta } = limitesRango(f);

  const res = items.filter((it) => {
    if (q && !normalizar(getTexto(it)).includes(q)) return false;
    if (f.estado !== 'todos' && getEstado(it) !== f.estado) return false;
    if (desde || hasta) {
      const dia = soloFecha(getFecha(it));
      if (!dia) return false;
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
    }
    return true;
  });

    const marca = (it: T) => {
    const t = Date.parse(getFecha(it) ?? '');
    return Number.isNaN(t) ? 0 : t;
  };

  return res
    .map((it, i) => ({ it, t: marca(it), i }))
    .sort((a, b) => (f.orden === 'recientes' ? b.t - a.t : a.t - b.t) || a.i - b.i)
    .map((x) => x.it);
}

interface ListToolbarProps {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  rangos: { value: RangoFecha; label: string }[];
  estados: { value: string; label: string }[];
  conteos: Record<string, number>;
  placeholder: string;
  total: number;
  mostrando: number;
  singular: string;
  plural: string;
}

function ListToolbar({ filtros, onChange, rangos, estados, conteos, placeholder, total, mostrando, singular, plural }: ListToolbarProps) {
  const set = (parcial: Partial<Filtros>) => onChange({ ...filtros, ...parcial });
  const activo = filtros.q.trim() !== '' || filtros.rango !== 'todas' || filtros.estado !== 'todos';
  const unidad = (n: number) => (n === 1 ? singular : plural);

  return (
    <div className="pf-toolbar">
      <div className="pf-toolbar-row">
        <label className="pf-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="search"
            value={filtros.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={placeholder}
            aria-label="Buscar"
          />
        </label>
        <select
          className="pf-tool-select"
          value={filtros.rango}
          onChange={(e) => set({ rango: e.target.value as RangoFecha })}
          aria-label="Filtrar por fecha"
        >
          {rangos.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          className="pf-tool-select"
          value={filtros.orden}
          onChange={(e) => set({ orden: e.target.value as Filtros['orden'] })}
          aria-label="Ordenar"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguas primero</option>
        </select>
      </div>

      <div className="pf-chips" role="group" aria-label="Filtrar por estado">
        {estados.map((e) => {
          const n = e.value === 'todos' ? total : (conteos[e.value] ?? 0);
          const sel = filtros.estado === e.value;
          return (
            <button
              key={e.value}
              type="button"
              className={`pf-chip${sel ? ' active' : ''}`}
              aria-pressed={sel}
              onClick={() => set({ estado: e.value })}
            >
              {e.label} <span className="pf-chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      {filtros.rango === 'custom' && (
        <div className="pf-toolbar-row pf-toolbar-dates">
          <label>
            Desde
            <input
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => set({ desde: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => set({ hasta: e.target.value })}
            />
          </label>
        </div>
      )}

      <div className="pf-toolbar-foot">
        <span>
          {activo ? `Mostrando ${mostrando} de ${total}` : `${total} ${unidad(total)}`}
        </span>
        {activo && (
          <button
            type="button"
            className="pf-tool-clear"
            onClick={() => onChange({ ...FILTROS_INICIALES, orden: filtros.orden })}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

export default function Perfil() {
  return (
    <Protected>
      <SocialWrapper>
        <PerfilPanel />
      </SocialWrapper>
    </Protected>
  );
}

function PerfilPanel() {
  const { user, updateFotoUrl, updateProfile, deleteAccount } = useAuth();

  // La pestaña vive en la URL (/social/perfil?tab=reservas) para que las
  // opciones del menú de la cuenta abran directamente la sección elegida.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabUrl = searchParams.get('tab') as TabId | null;
  const tab: TabId = tabUrl && TABS.includes(tabUrl) ? tabUrl : 'resumen';
  const setTab = (nueva: TabId) =>
    setSearchParams(nueva === 'resumen' ? {} : { tab: nueva }, { replace: true });

  const esAdmin = user?.roles.includes('adminSocial') ?? false;

  const [pqrs, setPqrs] = useState<Pqr[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);

  const [detallePqr, setDetallePqr] = useState<Pqr | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [filtrosPqr, setFiltrosPqr] = useState<Filtros>(FILTROS_INICIALES);
  const [filtrosReservas, setFiltrosReservas] = useState<Filtros>(FILTROS_INICIALES);

  const pqrsFiltradas = useMemo(
    () =>
      filtrarLista(
        pqrs,
        filtrosPqr,
        (p) => p.creado_en_pqr,
        (p) => `${p.asunto_pqr} ${pqrTipoLabel[p.tipo_pqr] ?? ''} ${pqrEstadoPill(p.estado_pqr).txt} SS-PQR-${p.id_pqr}`,
        (p) => p.estado_pqr,
      ),
    [pqrs, filtrosPqr],
  );
  const conteosPqr = useMemo(() => contarPor(pqrs, (p) => p.estado_pqr), [pqrs]);

  const reservasFiltradas = useMemo(
    () =>
      filtrarLista(
        reservas,
        filtrosReservas,
        (r) => r.fecha_evento_rese,
        (r) => `${r.evento?.nombre_er ?? ''} Reserva #${r.id_rese} ${reservaEstadoPill(r.estado_rese).txt}`,
        (r) => r.estado_rese,
      ),
    [reservas, filtrosReservas],
  );
  const conteosReservas = useMemo(() => contarPor(reservas, (r) => r.estado_rese), [reservas]);

  useEffect(() => {
    pqrService.misPqr().then((res) => setPqrs(res.data)).catch(() => setToast({ tipo: 'error', texto: 'No se pudieron cargar tus PQR.', id: Date.now() }));
    reservaService.misReservas().then((res) => setReservas(res.data)).catch(() => setToast({ tipo: 'error', texto: 'No se pudieron cargar tus reservas.', id: Date.now() }));
  }, []);

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const handleFotoClick = () => fileInputRef.current?.click();
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    if (!original.type.startsWith('image/')) {
      setToast({ tipo: 'error', texto: 'El archivo debe ser una imagen (JPG, PNG o WEBP).', id: Date.now() });
      return;
    }

    setSubiendoFoto(true);
    setToast(null);
    try {
      // Se reduce antes de subir: PHP acepta solo 2 MB por defecto y una
      // foto de celular pesa 3-6 MB (antes fallaba sin avisar).
      const file = await prepararImagen(original);
      if (file.size > 3 * 1024 * 1024) {
        setToast({ tipo: 'error', texto: 'La imagen no debe superar 3 MB.', id: Date.now() });
        return;
      }
      const formData = new FormData();
      formData.append('foto', file);
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) updateFotoUrl(data.foto_url);
      setToast({ tipo: 'ok', texto: 'Foto de perfil actualizada.', id: Date.now() });
    } catch (err) {
      setToast({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo subir la foto.', id: Date.now() });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const pendientesPqr = useMemo(
    () => (pqrs ?? []).filter((p) => p.estado_pqr !== 'resuelto' && p.estado_pqr !== 'cerrado').length,
    [pqrs]
  );
  const reservasActivas = useMemo(
    () => (reservas ?? []).filter((r) => r.estado_rese === 'pendiente' || r.estado_rese === 'confirmada').length,
    [reservas]
  );

  // Qué tan completo está el perfil: solo cuenta lo que la persona puede
  // llenar ella misma (foto con la cámara; teléfono y ciudad en Ajustes).
  const perfilCampos = [
    { ok: !!user?.foto_url, label: 'foto' },
    { ok: !!user?.telefono, label: 'teléfono' },
    { ok: !!user?.ciudad, label: 'ciudad' },
  ];
  const faltantes = perfilCampos.filter((c) => !c.ok).map((c) => c.label);
  const perfilPct = Math.round(((perfilCampos.length - faltantes.length) / perfilCampos.length) * 100);
  const faltanDatos = !user?.telefono || !user?.ciudad;

  const filasInfo = [
    { label: 'Rol', value: esAdmin ? 'Administrador' : 'Cliente', editable: false },
    { label: 'Correo', value: user?.email, editable: false },
    { label: 'Teléfono', value: user?.telefono, editable: true },
    { label: 'Ciudad', value: user?.ciudad, editable: true },
    {
      label: 'Documento',
      value: user?.documento ? `${tipoDocumentoLabel(user.tipo_documento)} ${user.documento}` : null,
      editable: false,
    },
    { label: 'Nacimiento', value: user?.fecha_nacimiento ? fmtFecha(user.fecha_nacimiento) : null, editable: false },
  ];

  // Reservas futuras (la fecha viene como YYYY-MM-DD; se compara como texto
  // para que la zona horaria no mueva el día).
  const sidebar = (
    <aside className="pfx-side">
      <div className="pfx-card">
        <div className="pfx-card-head">
          <h3>Información</h3>
          <button type="button" className="pfx-link" onClick={() => setTab('ajustes')}>
            <i className="ti ti-edit" aria-hidden="true" /> Editar
          </button>
        </div>
        <div className="pfx-card-body">
          {filasInfo.map((f) => (
            <div className="pfx-row" key={f.label}>
              <span className="pfx-row-label">{f.label}</span>
              {f.value ? (
                <span className="pfx-row-value">{f.value}</span>
              ) : f.editable ? (
                <button type="button" className="pfx-link" onClick={() => setTab('ajustes')}>
                  + Agregar
                </button>
              ) : (
                <span className="pfx-row-value">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {perfilPct < 100 && (
        <div className="pfx-card">
          <div className="pfx-card-head">
            <h3>Perfil completo</h3>
            <span className="pfx-pct">{perfilPct} %</span>
          </div>
          <div className="pfx-card-body pfx-progress-body">
            <div
              className="pfx-bar"
              role="progressbar"
              aria-valuenow={perfilPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Perfil completado"
            >
              <span style={{ width: `${perfilPct}%` }} />
            </div>
            <p className="pfx-progress-hint">Te falta agregar: {faltantes.join(', ')}.</p>
            {faltanDatos && (
              <button type="button" className="pfx-btn pfx-btn-primary" onClick={() => setTab('ajustes')}>
                Completar datos
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  const reservasProximas = useMemo(() => {
    const hoy = new Date().toLocaleDateString('en-CA');
    return (reservas ?? [])
      .filter(
        (r) =>
          (r.estado_rese === 'pendiente' || r.estado_rese === 'confirmada') &&
          String(r.fecha_evento_rese).slice(0, 10) >= hoy
      )
      .sort((x, y) => String(x.fecha_evento_rese).localeCompare(String(y.fecha_evento_rese)));
  }, [reservas]);

  const pqrEnCurso = useMemo(
    () => (pqrs ?? []).filter((p) => p.estado_pqr !== 'resuelto' && p.estado_pqr !== 'cerrado'),
    [pqrs]
  );

  return (
    <>
      <div className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-avatar-wrap">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="Foto de perfil" className="pf-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="pf-avatar">{initials}</div>
            )}
            <button
              type="button"
              className="pf-avatar-edit"
              onClick={handleFotoClick}
              disabled={subiendoFoto}
              aria-label="Cambiar foto de perfil"
            >
              <i className="ti ti-camera" aria-hidden="true" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />
          </div>

          <div className="pf-meta">
            <div className="pf-badge">
              <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-user-circle'}`} aria-hidden="true" />
              {esAdmin ? 'Administrador SkyedSocial' : 'Cliente SkyedSocial'}
            </div>
            <h1>{user?.name || 'Tu perfil'}</h1>
            <p className="pf-handle">@{(user?.email || '').split('@')[0]}</p>
          </div>

          <div className="pf-actions">
            {esAdmin && (
              <Link to="/social/admin" className="btn-sm-outline pf-admin-link">
                <i className="ti ti-shield-check" aria-hidden="true" /> Panel de administración
              </Link>
            )}
            <Link to="/social/pqr" className="btn-sm-outline pfx-primary">
              <i className="ti ti-plus" aria-hidden="true" /> Nueva PQR
            </Link>
            <Link to="/social/eventos" className="btn-sm-outline">Ver eventos</Link>
          </div>
        </div>

        <div className="pf-tabs" role="tablist">
          <button className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button className={tab === 'pqr' ? 'active' : ''} onClick={() => setTab('pqr')}>
            Mis PQR{pendientesPqr > 0 && <span className="pf-tab-count">{pendientesPqr}</span>}
          </button>
          <button className={tab === 'reservas' ? 'active' : ''} onClick={() => setTab('reservas')}>
            Mis reservas{reservasActivas > 0 && <span className="pf-tab-count">{reservasActivas}</span>}
          </button>
          <button className={tab === 'ajustes' ? 'active' : ''} onClick={() => setTab('ajustes')}>Ajustes</button>
        </div>
      </div>

      <div className="pf-body">
        <Toast msg={toast} onClose={() => setToast(null)} />

        {tab === 'resumen' && (
          <div className="pfx-layout">
            {sidebar}

            <div className="pfx-main">
              <div className="pfx-strip">
                <div className="pfx-box accent">
                  <span className="pfx-num">{reservasActivas}</span>
                  <span className="pfx-lbl">Reservas activas</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{reservas?.length ?? 0}</span>
                  <span className="pfx-lbl">Reservas totales</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{pendientesPqr}</span>
                  <span className="pfx-lbl">PQR en curso</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{pqrs?.length ?? 0}</span>
                  <span className="pfx-lbl">PQR enviadas</span>
                </div>
              </div>

              <div className="pfx-section-head">
                <h3>Próximas reservas</h3>
                <button type="button" className="pfx-link" onClick={() => setTab('reservas')}>Ver todo →</button>
              </div>
              {reservasProximas.length === 0 ? (
                <div className="pfx-empty-line">
                  Sin reservas próximas. <Link to="/social/reservar">reserva tu evento →</Link>
                </div>
              ) : (
                <div className="pfx-list">
                  {reservasProximas.slice(0, 3).map((r) => {
                    const pill = reservaEstadoPill(r.estado_rese);
                    return (
                      <div className="pfx-item" key={r.id_rese}>
                        <span className="pfx-chip"><i className="ti ti-calendar-event" aria-hidden="true" /></span>
                        <div className="pfx-item-main">
                          <span className="pfx-item-title">{r.evento?.nombre_er || `Reserva #${r.id_rese}`}</span>
                          <span className="pfx-item-sub">
                            {fmtFecha(r.fecha_evento_rese)} · {r.invitados_rese} invitados · {fmtMoney(r.total_rese)}
                          </span>
                        </div>
                        <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pfx-section-head">
                <h3>PQR en curso</h3>
                <button type="button" className="pfx-link" onClick={() => setTab('pqr')}>Ver todo →</button>
              </div>
              {pqrEnCurso.length === 0 ? (
                <div className="pfx-empty-line">
                  Sin PQR en curso. <Link to="/social/pqr">radicar una PQR →</Link>
                </div>
              ) : (
                <div className="pfx-list">
                  {pqrEnCurso.slice(0, 3).map((p) => {
                    const pill = pqrEstadoPill(p.estado_pqr);
                    return (
                      <button type="button" className="pfx-item pfx-item-btn" key={p.id_pqr} onClick={() => setDetallePqr(p)}>
                        <span className="pfx-chip"><i className="ti ti-message-circle" aria-hidden="true" /></span>
                        <div className="pfx-item-main">
                          <span className="pfx-item-title">{p.asunto_pqr}</span>
                          <span className="pfx-item-sub">
                            {pqrTipoLabel[p.tipo_pqr]} · Radicado SS-PQR-{p.id_pqr} · {fmtFecha(p.creado_en_pqr)}
                          </span>
                        </div>
                        <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'pqr' && (
          <div className="pf-list">
            {pqrs === null && <p className="pf-loading">Cargando tus PQR…</p>}
            {pqrs?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-message-report" /></span>
                <h3 className="pfq-empty-title">Aún no has radicado ninguna PQR</h3>
                <p className="pfq-empty-text">Preguntas, quejas o reclamos: te respondemos por este mismo perfil.</p>
                <Link to="/social/pqr" className="pfx-btn pfx-btn-primary">
                  <i className="ti ti-plus" aria-hidden="true" /> Radicar una PQR
                </Link>
              </div>
            )}
            {!!pqrs?.length && (
              <>
                <div className="pf-list-head">
                  <h2>Mis PQR</h2>
                  <p>Toca una solicitud para ver su detalle.</p>
                </div>
                <ListToolbar
                  filtros={filtrosPqr}
                  onChange={setFiltrosPqr}
                  rangos={RANGOS_PQR}
                  estados={ESTADOS_PQR}
                  conteos={conteosPqr}
                  placeholder="Buscar por asunto, tipo, estado o radicado"
                  total={pqrs.length}
                  mostrando={pqrsFiltradas?.length ?? 0}
                  singular="solicitud"
                  plural="solicitudes"
                />
              </>
            )}
            {!!pqrs?.length && pqrsFiltradas?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-search-off" /></span>
                <h3 className="pfq-empty-title">No encontramos resultados</h3>
                <p className="pfq-empty-text">Prueba con otra palabra, otro estado o cambia el rango de fechas.</p>
                <button type="button" className="pfx-btn pfx-btn-primary" onClick={() => setFiltrosPqr(FILTROS_INICIALES)}>
                  Limpiar filtros
                </button>
              </div>
            )}
            {pqrsFiltradas?.map((p) => {
              const pill = pqrEstadoPill(p.estado_pqr);
              return (
                <button key={p.id_pqr} className="pf-list-item" onClick={() => setDetallePqr(p)}>
                  <span className="pf-item-icon" aria-hidden="true">
                    <i className={`ti ${pqrTipoIcon[p.tipo_pqr] ?? 'ti-message-report'}`} />
                  </span>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">{p.asunto_pqr}</span>
                    <span className="pf-list-item-sub">{pqrTipoLabel[p.tipo_pqr]} · {fmtFecha(p.creado_en_pqr)}</span>
                  </div>
                  <span className="pf-item-code">SS-PQR-{p.id_pqr}</span>
                  <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                  <i className="ti ti-chevron-right pf-item-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {tab === 'reservas' && (
          <div className="pf-list">
            {reservas === null && <p className="pf-loading">Cargando tus reservas…</p>}
            {reservas?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
                <h3 className="pfq-empty-title">Aún no tienes reservas</h3>
                <p className="pfq-empty-text">Explora los eventos disponibles y reserva el tuyo en pocos pasos.</p>
                <Link to="/social/eventos" className="pfx-btn pfx-btn-primary">
                  <i className="ti ti-search" aria-hidden="true" /> Ver eventos
                </Link>
              </div>
            )}
            {!!reservas?.length && (
              <>
                <div className="pf-list-head">
                  <h2>Mis reservas</h2>
                  <p>Aquí ves el estado de cada una de tus reservas.</p>
                </div>
                <ListToolbar
                  filtros={filtrosReservas}
                  onChange={setFiltrosReservas}
                  rangos={RANGOS_RESERVAS}
                  estados={ESTADOS_RESERVAS}
                  conteos={conteosReservas}
                  placeholder="Buscar por evento o estado"
                  total={reservas.length}
                  mostrando={reservasFiltradas?.length ?? 0}
                  singular="reserva"
                  plural="reservas"
                />
              </>
            )}
            {!!reservas?.length && reservasFiltradas?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-search-off" /></span>
                <h3 className="pfq-empty-title">No encontramos resultados</h3>
                <p className="pfq-empty-text">Prueba con otra palabra, otro estado o cambia el rango de fechas.</p>
                <button type="button" className="pfx-btn pfx-btn-primary" onClick={() => setFiltrosReservas(FILTROS_INICIALES)}>
                  Limpiar filtros
                </button>
              </div>
            )}
            {reservasFiltradas?.map((r) => {
              const pill = reservaEstadoPill(r.estado_rese);
              return (
                <div key={r.id_rese} className="pf-list-item" style={{ cursor: 'default' }}>
                  <span className="pf-item-icon" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">{r.evento?.nombre_er || `Reserva #${r.id_rese}`}</span>
                    <span className="pf-list-item-sub">{fmtFecha(r.fecha_evento_rese)} · {r.invitados_rese} invitados · {fmtMoney(r.total_rese)}</span>
                  </div>
                  <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ajustes' && (
          <div className="pfx-layout">
            {sidebar}
            <div className="pfx-main pfx-stack">
              <div className="pfx-me">
                <div className="pfx-me-avatar-wrap">
                  {user?.foto_url ? (
                    <img src={user.foto_url} alt="Foto de perfil" className="pfx-me-avatar" />
                  ) : (
                    <div className="pfx-me-avatar">{initials}</div>
                  )}
                  <button
                    type="button"
                    className="pfx-me-cam"
                    onClick={handleFotoClick}
                    disabled={subiendoFoto}
                    aria-label="Cambiar foto de perfil"
                  >
                    <i className="ti ti-camera" aria-hidden="true" />
                  </button>
                </div>
                <div className="pfx-me-info">
                  <strong>{user?.name || 'Tu perfil'}</strong>
                  <span className="pfx-tag">
                    <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-user-circle'}`} aria-hidden="true" />
                    {esAdmin ? 'Administrador' : 'Cliente'}
                  </span>
                </div>
              </div>
              <AjustesForm user={user} updateProfile={updateProfile} />
              <CambiarContrasena />
              <CuentaCard rol={esAdmin ? 'Administrador' : 'Cliente'} deleteAccount={deleteAccount} />
            </div>
          </div>
        )}
      </div>

      {detallePqr && (
        <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetallePqr(null); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <h3>PQR #{detallePqr.id_pqr}</h3>
              <button className="pf-modal-close" onClick={() => setDetallePqr(null)} aria-label="Cerrar">×</button>
            </div>
            <p className="pf-list-item-sub">{pqrTipoLabel[detallePqr.tipo_pqr]} · {fmtFecha(detallePqr.creado_en_pqr)}</p>
            <div className="pf-message-box"><span>Tu mensaje</span><p>{detallePqr.mensaje_pqr}</p></div>
            {detallePqr.respuesta_pqr ? (
              <div className="pf-message-box accent">
                <span>Respuesta{detallePqr.respondido_en_pqr ? ` · ${fmtFecha(detallePqr.respondido_en_pqr)}` : ''}</span>
                <p>{detallePqr.respuesta_pqr}</p>
              </div>
            ) : (
              <p className="pf-empty-hint">Aún sin respuesta. Te avisaremos aquí y por notificación cuando la tengamos.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Solo letras (con tildes y ñ) y espacios, igual que el registro. */
const soloLetras = (valor: string) => valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').slice(0, 50);
const soloNumeros = (valor: string) => valor.replace(/\D/g, '').slice(0, 15);

function AjustesForm({
  user,
  updateProfile,
}: {
  user: ReturnType<typeof useAuth>['user'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}) {
  const [nombre, setNombre] = useState(user?.name?.split(' ')[0] ?? '');
  const [apellido, setApellido] = useState(user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '');
  const [tipoDocumento, setTipoDocumento] = useState(normalizarTipoDoc(user?.tipo_documento));
  const [documento, setDocumento] = useState(user?.documento ? String(user.documento) : '');
  const [fechaNacimiento, setFechaNacimiento] = useState(soloFecha(user?.fecha_nacimiento));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (telefono && (telefono.length < 7 || telefono.length > 15)) {
      setMsg({ tipo: 'error', texto: 'El teléfono debe tener entre 7 y 15 dígitos.', id: Date.now() });
      return;
    }
    if (documento && (documento.length < 5 || documento.length > 15)) {
      setMsg({ tipo: 'error', texto: 'El número de documento debe tener entre 5 y 15 dígitos.', id: Date.now() });
      return;
    }
    if (fechaNacimiento && fechaNacimiento > new Date().toLocaleDateString('en-CA')) {
      setMsg({ tipo: 'error', texto: 'La fecha de nacimiento no puede ser futura.', id: Date.now() });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nombre_u: nombre.trim(),
        apellido_u: apellido.trim(),
        telefono_u: telefono.trim(),
        ciudad_u: ciudad.trim(),
        tipo_documento_u: tipoDocumento || undefined,
        documento_u: documento ? Number(documento) : undefined,
        fecha_nacimiento_u: fechaNacimiento || undefined,
      });
      setMsg({ tipo: 'ok', texto: 'Tus datos se actualizaron correctamente.', id: Date.now() });
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.', id: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pfx-card">
      <div className="pfx-card-head pfx-head-icon">
        <span className="pfx-chip pfx-chip-sm"><i className="ti ti-id-badge-2" aria-hidden="true" /></span>
        <h3>Datos personales</h3>
      </div>
      <form className="pfx-form" onSubmit={submit}>
        <Toast msg={msg} onClose={() => setMsg(null)} />
        <div className="pfx-form-row">
          <label className="pfx-field">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(soloLetras(e.target.value))} required maxLength={50} />
          </label>
          <label className="pfx-field">
            <span>Apellido</span>
            <input value={apellido} onChange={(e) => setApellido(soloLetras(e.target.value))} required maxLength={50} />
          </label>
        </div>
        <div className="pfx-form-row">
          <label className="pfx-field">
            <span>Tipo de documento</span>
            <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="TI">Tarjeta de identidad</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </label>
          <label className="pfx-field">
            <span>Número de documento</span>
            <input value={documento} onChange={(e) => setDocumento(soloNumeros(e.target.value))} inputMode="numeric" placeholder="1234567890" />
          </label>
        </div>
        <label className="pfx-field">
          <span>Teléfono</span>
          <input value={telefono} onChange={(e) => setTelefono(soloNumeros(e.target.value))} inputMode="numeric" placeholder="3001234567" />
        </label>
        <label className="pfx-field">
          <span>Ciudad</span>
          <input value={ciudad} onChange={(e) => setCiudad(e.target.value.slice(0, 80))} placeholder="Ej. Sogamoso, Boyacá" />
        </label>
        <label className="pfx-field">
          <span>Fecha de nacimiento</span>
          <input type="date" value={fechaNacimiento} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </label>
        <div className="pfx-form-actions">
          <button className="pfx-btn pfx-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}

/** Igual que en el perfil de SKYED Deportivo: PUT /cambiar-contrasena. */
function CambiarContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const motivo = errorContrasena(nueva);
    if (motivo) {
      setMsg({ tipo: 'error', texto: motivo, id: Date.now() });
      return;
    }
    if (nueva === actual) {
      setMsg({ tipo: 'error', texto: 'La nueva contraseña debe ser distinta a la actual.', id: Date.now() });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.', id: Date.now() });
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/cambiar-contrasena', {
        method: 'PUT',
        body: JSON.stringify({
          contrasena_actual: actual,
          nueva_contrasena: nueva,
          nueva_contrasena_confirmation: confirmar,
        }),
      });
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.', id: Date.now() });
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.', id: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  const tipo = ver ? 'text' : 'password';

  return (
    <div className="pfx-card">
      <div className="pfx-card-head pfx-head-icon">
        <span className="pfx-chip pfx-chip-sm"><i className="ti ti-lock" aria-hidden="true" /></span>
        <h3>Seguridad</h3>
      </div>
      <form className="pfx-form" onSubmit={submit}>
        <Toast msg={msg} onClose={() => setMsg(null)} />
        <label className="pfx-field">
          <span>Contraseña actual</span>
          <input type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
        </label>
        <label className="pfx-field">
          <span>Nueva contraseña</span>
          <input type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password" maxLength={72} />
          <small>Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
        </label>
        <label className="pfx-field">
          <span>Confirmar nueva contraseña</span>
          <input type={tipo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" maxLength={72} />
        </label>
        <label className="pf-check">
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
          Mostrar contraseñas
        </label>
        <div className="pfx-form-actions">
          <button className="pfx-btn pfx-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</button>
        </div>
      </form>
    </div>
  );
}

/** Igual que en SKYED Deportivo: desactiva la cuenta (deleteAccount) y cierra la sesión. */
function CuentaCard({
  rol,
  deleteAccount,
}: {
  rol: string;
  deleteAccount: ReturnType<typeof useAuth>['deleteAccount'];
}) {
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<ToastMsg | null>(null);

  const eliminar = async () => {
    setEliminando(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      setError({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo eliminar la cuenta. Intenta de nuevo.', id: Date.now() });
      setEliminando(false);
    }
  };

  const cerrar = () => {
    if (eliminando) return;
    setConfirmar(false);
    setError(null);
  };

  return (
    <>
      <div className="pfx-card pfx-card-danger">
        <div className="pfx-card-head pfx-head-icon">
          <span className="pfx-chip pfx-chip-sm"><i className="ti ti-alert-triangle" aria-hidden="true" /></span>
          <h3>Cuenta</h3>
        </div>
        <div className="pfx-form">
          <div className="pfx-row">
            <span className="pfx-row-label">Rol</span>
            <span className="pfx-row-value">{rol}</span>
          </div>
          <div className="pfx-form-actions">
            <button type="button" className="pfx-btn pfx-btn-danger" onClick={() => setConfirmar(true)} disabled={eliminando}>
              {eliminando ? 'Eliminando…' : 'Eliminar cuenta'}
            </button>
          </div>
        </div>
      </div>

      {confirmar && (
        <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <h3 className="pfx-danger-title">
                <i className="ti ti-alert-triangle" aria-hidden="true" /> Desactivar cuenta
              </h3>
              <button className="pf-modal-close" onClick={cerrar} disabled={eliminando} aria-label="Cerrar">×</button>
            </div>
            <p className="pfx-danger-text">
              Vas a desactivar tu cuenta. Se cerrará tu sesión y no podrás iniciar sesión de nuevo hasta que un administrador la reactive.
            </p>
            <Toast msg={error} onClose={() => setError(null)} />
            <div className="pfx-modal-actions">
              <button type="button" className="pfx-btn pfx-btn-outline" onClick={cerrar} disabled={eliminando}>Cancelar</button>
              <button type="button" className="pfx-btn pfx-btn-danger pfx-btn-solid" onClick={eliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando…' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}