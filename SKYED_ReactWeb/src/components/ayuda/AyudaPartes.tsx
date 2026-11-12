import { useContext, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AyudaArticuloResumen, AyudaCategoria, EspacioAyuda } from '../../services/ayudaService';
import CanvasParticles from '../social/CanvasParticles';
import { ModuloAyudaContext } from './ayudaContext';
import { rutaAyuda } from './rutas';
import { getSiteContext } from '../../utils/siteContext';

/* ---------- Cabecera ----------
   Usa el MISMO encabezado que Eventos / Lugares / Nosotros de cada módulo:
   - Social:    <section class="page-hero"> con partículas (CanvasParticles) y título con <em> morado.
   - Deportivo: <section class="page-header"> con degradado azul y ruedas girando.
   Así, si se cambia ese encabezado, la ayuda lo hereda. */
function conEnfasis(texto: string): ReactNode {
  const limpio = texto.trim();
  const i = limpio.lastIndexOf(' ');
  if (i < 0) return limpio;
  return (
    <>
      {limpio.slice(0, i + 1)}
      <em>{limpio.slice(i + 1)}</em>
    </>
  );
}

export function AyudaHero({
  titulo,
  texto,
  icono,
  compacto = false,
  comoH1 = true,
  children,
}: {
  titulo: string;
  texto?: string | null;
  icono?: string;
  compacto?: boolean;
  /** En la página de artículo el h1 es el título del artículo, no el de la cabecera. */
  comoH1?: boolean;
  /** Ya no se muestra: los encabezados de Eventos/Lugares/Nosotros no llevan etiqueta. */
  etiqueta?: string;
  children?: ReactNode;
}) {
  const modulo = useContext(ModuloAyudaContext);
  const Titulo = comoH1 ? 'h1' : 'p';
  const social = modulo === 'social';

  const iconoNodo = icono ? (
    <span className="ay-hero-icono" aria-hidden="true">
      <i className={`ti ${icono}`} />
    </span>
  ) : null;

  // Página principal: mismo look claro del inicio (ilustración + título Playfair con palabra en degradado).
  if (modulo === 'principal') {
    return (
      <section className={`ay-cabecera ay-cabecera--principal${compacto ? ' ay-cabecera--compacto' : ''}`}>
        <div className="ay-hero-fondo" aria-hidden="true" />
        <div className="ay-hero-inner">
          <Titulo className={comoH1 ? undefined : 'ay-titulo'}>
            {iconoNodo}
            {conEnfasis(titulo)}
          </Titulo>
          {texto && <p className="ay-hero-texto">{texto}</p>}
          {children}
        </div>
      </section>
    );
  }

  if (social) {
    return (
      <section className={`page-hero ay-cabecera ay-cabecera--social${compacto ? ' ay-cabecera--compacto' : ''}`}>
        <CanvasParticles id="pageParticles" />
        <div className="hero-overlay" />
        <div className="ay-hero-inner">
          <Titulo className="page-hero-title">
            {iconoNodo}
            {conEnfasis(titulo)}
          </Titulo>
          {texto && <p className="page-hero-sub ay-hero-texto">{texto}</p>}
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className={`page-header ay-cabecera ay-cabecera--deportivo${compacto ? ' ay-cabecera--compacto' : ''}`}>
      <div className="ay-hero-inner">
        <Titulo className={comoH1 ? undefined : 'ay-titulo'}>
          {iconoNodo}
          {titulo}
        </Titulo>
        {texto && <p className="ay-hero-texto">{texto}</p>}
        {children}
      </div>
    </section>
  );
}

/* ---------- Breadcrumbs (div, no <nav>: global.css fija toda etiqueta <nav>) ---------- */
export interface Miga {
  texto: string;
  a?: string;
}

export function AyudaMigas({ migas }: { migas: Miga[] }) {
  return (
    <div role="navigation" aria-label="Ruta de navegación">
      <ol className="ay-migas">
        {migas.map((m, i) => {
          const ultima = i === migas.length - 1;
          return (
            <li key={`${m.texto}-${i}`}>
              {m.a && !ultima ? (
                <Link to={m.a}>{m.texto}</Link>
              ) : (
                <span aria-current={ultima ? 'page' : undefined}>{m.texto}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Insignia del espacio (solo en el Centro de Ayuda de la página principal) ----------
   Indica a qué parte de SKYED pertenece cada categoría o artículo. */
export const ESPACIOS_AYUDA: Record<string, { nombre: string; icono: string }> = {
  general: { nombre: 'Cuenta y general', icono: 'ti-user-circle' },
  deportivo: { nombre: 'SKYED Deportivo', icono: 'ti-bike' },
  social: { nombre: 'SkyedSocial', icono: 'ti-confetti' },
};

export function AyudaInsignia({ modulo, esquina = false }: { modulo: string; esquina?: boolean }) {
  const espacio = ESPACIOS_AYUDA[modulo] ?? ESPACIOS_AYUDA.general;

  return (
    <span className={`ay-insignia${esquina ? ' ay-insignia--esquina' : ''}`} data-modulo={modulo}>
      <i className={`ti ${espacio.icono}`} aria-hidden="true" />
      {espacio.nombre}
    </span>
  );
}

/* ---------- Tarjetas ---------- */
export function AyudaCategoriaCard({ categoria, modulo }: { categoria: AyudaCategoria; modulo: EspacioAyuda }) {
  const total = categoria.total_articulos ?? 0;
  const enPrincipal = modulo === 'principal';

  return (
    <Link
      className="ay-card"
      data-modulo={enPrincipal ? categoria.modulo : undefined}
      to={`${rutaAyuda(modulo)}/categoria/${categoria.slug}`}
    >
      <span className="ay-card-icono" aria-hidden="true">
        <i className={`ti ${categoria.icono}`} />
      </span>
      {enPrincipal && <AyudaInsignia modulo={categoria.modulo} esquina />}
      <h3>{categoria.nombre}</h3>
      {categoria.descripcion && <p>{categoria.descripcion}</p>}
      <span className="ay-card-meta">
        {total} {total === 1 ? 'artículo' : 'artículos'}
      </span>
    </Link>
  );
}

export function AyudaArticuloCard({
  articulo,
  modulo,
  conCategoria = true,
}: {
  articulo: AyudaArticuloResumen;
  modulo: EspacioAyuda;
  conCategoria?: boolean;
}) {
  const etiqueta =
    conCategoria && articulo.categoria ? <span className="ay-etiqueta">{articulo.categoria.nombre}</span> : null;
  const enPrincipal = modulo === 'principal';

  return (
    <Link
      className="ay-card"
      data-modulo={enPrincipal ? articulo.modulo : undefined}
      to={`${rutaAyuda(modulo)}/articulo/${articulo.slug}`}
    >
      {enPrincipal ? (
        <div className="ay-card-etiquetas">
          <AyudaInsignia modulo={articulo.modulo} />
          {etiqueta}
        </div>
      ) : (
        etiqueta
      )}
      <h3>{articulo.titulo}</h3>
      {articulo.resumen && <p>{articulo.resumen}</p>}
      <span className="ay-card-meta">
        Leer guía <i className="ti ti-arrow-right" aria-hidden="true" />
      </span>
    </Link>
  );
}

/* ---------- Preguntas frecuentes (acordeón accesible) ---------- */
export function AyudaFaq({ items, modulo }: { items: AyudaArticuloResumen[]; modulo: EspacioAyuda }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const prefijo = useId();

  return (
    <div className="ay-faq">
      {items.map((a) => {
        const activo = abierto === a.id;
        const idBoton = `${prefijo}-b-${a.id}`;
        const idPanel = `${prefijo}-p-${a.id}`;

        return (
          <div className="ay-faq-item" key={a.id}>
            <h3>
              <button
                type="button"
                id={idBoton}
                title={activo ? "Ocultar la respuesta" : "Ver la respuesta"}
                className="ay-faq-btn"
                aria-expanded={activo}
                aria-controls={idPanel}
                onClick={() => setAbierto(activo ? null : a.id)}
              >
                <span>{a.titulo}</span>
                <i className="ti ti-chevron-down" aria-hidden="true" />
              </button>
            </h3>
            <div id={idPanel} role="region" aria-labelledby={idBoton} className="ay-faq-panel" hidden={!activo}>
              {a.resumen && <p>{a.resumen}</p>}
              <Link className="ay-enlace" to={`${rutaAyuda(modulo)}/articulo/${a.slug}`}>
                Ver paso a paso →
              </Link>
              {modulo === 'principal' && <AyudaInsignia modulo={a.modulo} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Estados ---------- */
export function AyudaCargando() {
  return (
    <div className="ay-seccion" aria-busy="true">
      <span className="ay-sr" role="status">
        Cargando ayuda…
      </span>
      <div className="ay-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="ay-skel" key={i} />
        ))}
      </div>
    </div>
  );
}

export function AyudaEstado({
  icono = 'ti-info-circle',
  titulo,
  texto,
  alerta = false,
  children,
}: {
  icono?: string;
  titulo: string;
  texto?: string;
  alerta?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="ay-estado" role={alerta ? 'alert' : 'status'}>
      <i className={`ti ${icono}`} aria-hidden="true" />
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

/* ---------- Contactar soporte (reutiliza la PQRS existente) ---------- */
export function AyudaSoporte({
  titulo = '¿No encontraste lo que buscabas?',
  texto = 'Cuéntanos tu caso y el equipo de SKYED te responderá.',
  asunto,
}: {
  titulo?: string;
  texto?: string;
  /** Texto con el que llegará precargada la PQRS (se conecta en la Fase 3). */
  asunto?: string;
}) {
  const { user } = useAuth();
  const idTitulo = useId();

    const moduloAyuda = useContext(ModuloAyudaContext);
  const basePqr =
    moduloAyuda === 'deportivo' ? '/deportivo/pqr'
    : moduloAyuda === 'social' ? '/social/pqr'
    : getSiteContext() === 'deportivo' ? '/deportivo/pqr' : '/social/pqr';


  // Los administradores gestionan las PQRS, no las crean.
  if (user?.role === 'admin') return null;

  // El formulario de PQRS acepta hasta 100 caracteres en el asunto.
  const rutaPqr = `${basePqr}?desde=ayuda${asunto ? `&asunto=${encodeURIComponent(asunto.slice(0, 100))}` : ''}`;
  const destino = user ? rutaPqr : `/login?redirect=${encodeURIComponent(rutaPqr)}`;

  return (
    <div className="ay-soporte" role="region" aria-labelledby={idTitulo}>
      <div>
        <h2 id={idTitulo}>{titulo}</h2>
        <p>{user ? texto : 'Inicia sesión para crear una PQRS y el equipo te responderá.'}</p>
      </div>
      <Link className="ay-btn ay-btn--primario" to={destino} title={user ? "Crear una PQRS" : "Iniciar sesión para crear una PQRS"}>
        <i className="ti ti-message-report" aria-hidden="true" />
        {user ? 'Crear PQRS' : 'Iniciar sesión y crear PQRS'}
      </Link>
    </div>
  );
}

/* ---------- Utilidad ---------- */
export function fechaLarga(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}