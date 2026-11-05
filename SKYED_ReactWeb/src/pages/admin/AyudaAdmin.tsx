import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSiteContext } from '../../utils/siteContext';
import type { SiteContext } from '../../utils/siteContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useConfirmacion } from '../../components/shared/ConfirmDialog';
import { CargandoPanel } from '../../components/shared/AdminMotion';
import { ayudaAdminService } from '../../services/ayudaAdminService';
import type { ArticuloAdmin, CategoriaAdmin, OpcionesAyuda } from '../../services/ayudaAdminService';
import ArticulosPanel from '../../components/ayuda/admin/ArticulosPanel';
import CategoriasPanel from '../../components/ayuda/admin/CategoriasPanel';
import MetricasPanel from '../../components/ayuda/admin/MetricasPanel';
import { mensajeDeError } from '../../components/ayuda/admin/tipos';
import type { Avisar } from '../../components/ayuda/admin/tipos';
import '../../styles/shared/ayudaAdmin.css';
import { useAvisos } from '../../components/shared/Avisos';

type Pestana = 'articulos' | 'categorias' | 'metricas';

const PESTANAS: { id: Pestana; texto: string; icono: string }[] = [
  { id: 'articulos', texto: 'Artículos', icono: 'ti-article' },
  { id: 'categorias', texto: 'Categorías', icono: 'ti-folders' },
  { id: 'metricas', texto: 'Métricas', icono: 'ti-chart-bar' },
];

const MODULO: Record<string, string> = { general: 'General', social: 'Social', deportivo: 'Deportivo' };

/** /admin/ayuda: administración del contenido del Centro de Ayuda (la ruta ya exige ser administrador). */
export default function AyudaAdmin({ modulo }: { modulo?: SiteContext }) {
  const { user } = useAuth();
  const { darkMode, fontSize } = useAccessibility();
  const { confirmar, dialogo } = useConfirmacion();

  const [pestana, setPestana] = useState<Pestana>('articulos');
  const [opciones, setOpciones] = useState<OpcionesAyuda | null>(null);
  const [articulos, setArticulos] = useState<ArticuloAdmin[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [errorCarga, setErrorCarga] = useState('');
  const { avisar: avisarFlotante, avisos } = useAvisos();
  const [abrirId, setAbrirId] = useState<number | null>(null);

  // Paleta según el módulo desde el que se entra. Un superadmin tiene los dos roles,
  // así que el rol solo decide cuando la cuenta administra un único módulo; si tiene
  // ambos, manda el módulo indicado o, en su defecto, el último que visitó.
  const tieneSocial = user?.roles.includes('adminSocial') ?? false;
  const tieneDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const moduloActivo: SiteContext =
    tieneSocial && !tieneDeportivo ? 'social'
    : tieneDeportivo && !tieneSocial ? 'deportivo'
    : modulo ?? getSiteContext();
  const esSocial = moduloActivo === 'social';
  // Dentro del panel hereda su acento (--admin-accent) y su escala (el panel ya usa zoom),
  // para verse igual que Kits, Usuarios, etc. Suelta (/admin/ayuda) conserva su propia paleta.
  const variables: Record<string, string | number> = modulo
    ? {
        '--ay-adm-acento': 'var(--admin-accent)',
        '--ay-adm-claro': esSocial ? '#e3a9ee' : '#6fd0e0',
        '--fs-scale': 1,
      }
    : {
        '--ay-adm-acento': esSocial ? '#9c02ae' : '#0b6f82',
        '--ay-adm-claro': esSocial ? '#e3a9ee' : '#6fd0e0',
        '--admin-accent': esSocial ? '#9c02ae' : '#0b6f82',
        '--fs-scale': (parseInt(fontSize, 10) || 16) / 16,
      };
  const estilo = variables as CSSProperties;

  const avisar: Avisar = useCallback((tipo, texto) => avisarFlotante(texto, tipo), [avisarFlotante]);

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

  // Dentro del panel: mismo cargador que Copias de seguridad (esqueletos + orbe de SKAI).
  // Al terminar, el contenido se monta de nuevo y entra con la animación del panel.
  const cargandoInicial = !errorCarga && (!opciones || !articulos);
  if (modulo && cargandoInicial) {
    return <CargandoPanel modulo={moduloActivo} texto="Cargando centro de ayuda…" />;
  }

  return (
    <div className={`ayadm${modulo ? ' ayadm--embebido' : ''}${darkMode ? ' dark dark-mode' : ''}`} style={estilo}>
      <div className="ay-adm-wrap">
        {/* <header className="ay-adm-cab">
          <Link className="ay-adm-volver" to="/admin">
            <i className="ti ti-arrow-left" aria-hidden="true" /> Volver a mi panel
          </Link>
          <span className="ay-adm-eyebrow">ADMINISTRACIÓN</span>
          <h1>Centro de Ayuda</h1>
          <p>
            Crea y mantén las guías que ven los usuarios.
            {opciones && <> Puedes gestionar contenido de: <strong>{opciones.modulos.map((m) => MODULO[m] ?? m).join(', ')}</strong>.</>}
          </p>
        </header> */}


        {errorCarga ? (
          <div className="ay-adm-vacio" role="alert">
            <p>{errorCarga}</p>
            <button type="button" className="ay-adm-btn ay-adm-btn--primario" title="Volver a cargar el Centro de Ayuda" onClick={() => void cargar()}>
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
                  title={`Abrir la sección ${p.texto.toLowerCase()}`}
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