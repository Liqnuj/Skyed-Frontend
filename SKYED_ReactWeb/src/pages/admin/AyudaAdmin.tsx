import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useConfirmacion } from '../../components/shared/ConfirmDialog';
import { ayudaAdminService } from '../../services/ayudaAdminService';
import type { ArticuloAdmin, CategoriaAdmin, OpcionesAyuda } from '../../services/ayudaAdminService';
import ArticulosPanel from '../../components/ayuda/admin/ArticulosPanel';
import CategoriasPanel from '../../components/ayuda/admin/CategoriasPanel';
import MetricasPanel from '../../components/ayuda/admin/MetricasPanel';
import { mensajeDeError } from '../../components/ayuda/admin/tipos';
import type { Avisar } from '../../components/ayuda/admin/tipos';
import '../../styles/shared/ayudaAdmin.css';

type Pestana = 'articulos' | 'categorias' | 'metricas';

const PESTANAS: { id: Pestana; texto: string; icono: string }[] = [
  { id: 'articulos', texto: 'Artículos', icono: 'ti-article' },
  { id: 'categorias', texto: 'Categorías', icono: 'ti-folders' },
  { id: 'metricas', texto: 'Métricas', icono: 'ti-chart-bar' },
];

const MODULO: Record<string, string> = { general: 'General', social: 'Social', deportivo: 'Deportivo' };

/** /admin/ayuda: administración del contenido del Centro de Ayuda (la ruta ya exige ser administrador). */
export default function AyudaAdmin() {
  const { user } = useAuth();
  const { darkMode, fontSize } = useAccessibility();
  const { confirmar, dialogo } = useConfirmacion();

  const [pestana, setPestana] = useState<Pestana>('articulos');
  const [opciones, setOpciones] = useState<OpcionesAyuda | null>(null);
  const [articulos, setArticulos] = useState<ArticuloAdmin[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [abrirId, setAbrirId] = useState<number | null>(null);
  const temporizador = useRef<number | undefined>(undefined);

  const esSocial = user?.roles.includes('adminSocial') ?? false;
  const estilo = {
    '--ay-adm-acento': esSocial ? '#9c02ae' : '#0b6f82',
    '--ay-adm-claro': esSocial ? '#e3a9ee' : '#6fd0e0',
    '--admin-accent': esSocial ? '#9c02ae' : '#0b6f82',
    '--fs-scale': (parseInt(fontSize, 10) || 16) / 16,
  } as CSSProperties;

  const avisar: Avisar = useCallback((tipo, texto) => {
    setAviso({ tipo, texto });
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAviso(null), 5000);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [op, ar, ca] = await Promise.all([
        ayudaAdminService.opciones(),
        ayudaAdminService.articulos(),
        ayudaAdminService.categorias(),
      ]);
      setOpciones(op);
      setArticulos(ar);
      setCategorias(ca);
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(mensajeDeError(e, 'No pudimos cargar la administración del Centro de Ayuda.'));
    }
  }, []);

  useEffect(() => {
    void cargar();
    return () => window.clearTimeout(temporizador.current);
  }, [cargar]);

  const limpiarAbrir = useCallback(() => setAbrirId(null), []);

  const revisar = (id: number) => {
    setPestana('articulos');
    setAbrirId(id);
  };

  // Flechas izquierda/derecha entre pestañas (patrón de tabs accesibles).
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PESTANAS.findIndex((p) => p.id === pestana);
    const siguiente = PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length];
    setPestana(siguiente.id);
    document.getElementById(`ay-adm-tab-${siguiente.id}`)?.focus();
  };

  return (
    <div className={`ayadm${darkMode ? ' dark dark-mode' : ''}`} style={estilo}>
      <div className="ay-adm-wrap">
        <header className="ay-adm-cab">
          <Link className="ay-adm-volver" to="/admin">
            <i className="ti ti-arrow-left" aria-hidden="true" /> Volver a mi panel
          </Link>
          <span className="ay-adm-eyebrow">ADMINISTRACIÓN</span>
          <h1>Centro de Ayuda</h1>
          <p>
            Crea y mantén las guías que ven los usuarios.
            {opciones && <> Puedes gestionar contenido de: <strong>{opciones.modulos.map((m) => MODULO[m] ?? m).join(', ')}</strong>.</>}
          </p>
        </header>

        {aviso && (
          <div className={`ay-adm-aviso ay-adm-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
            {aviso.texto}
          </div>
        )}

        {errorCarga ? (
          <div className="ay-adm-vacio" role="alert">
            <p>{errorCarga}</p>
            <button type="button" className="ay-adm-btn ay-adm-btn--primario" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : !opciones || !articulos ? (
          <div className="ay-adm-vacio" role="status">
            Cargando…
          </div>
        ) : (
          <>
            <div className="ay-adm-tabs" role="tablist" aria-label="Secciones de administración" onKeyDown={alTeclear}>
              {PESTANAS.map((p) => (
                <button
                  key={p.id}
                  id={`ay-adm-tab-${p.id}`}
                  type="button"
                  role="tab"
                  aria-selected={pestana === p.id}
                  aria-controls={`ay-adm-panel-${p.id}`}
                  tabIndex={pestana === p.id ? 0 : -1}
                  className={`ay-adm-tab${pestana === p.id ? ' ay-adm-tab--activa' : ''}`}
                  onClick={() => setPestana(p.id)}
                >
                  <i className={`ti ${p.icono}`} aria-hidden="true" /> {p.texto}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`ay-adm-panel-${pestana}`} aria-labelledby={`ay-adm-tab-${pestana}`}>
              {pestana === 'articulos' && (
                <ArticulosPanel
                  articulos={articulos}
                  opciones={opciones}
                  recargar={cargar}
                  avisar={avisar}
                  confirmar={confirmar}
                  abrirId={abrirId}
                  alAbrir={limpiarAbrir}
                />
              )}
              {pestana === 'categorias' && (
                <CategoriasPanel categorias={categorias} opciones={opciones} recargar={cargar} avisar={avisar} confirmar={confirmar} />
              )}
              {pestana === 'metricas' && <MetricasPanel onRevisar={revisar} />}
            </div>
          </>
        )}
      </div>
      {dialogo}
    </div>
  );
}