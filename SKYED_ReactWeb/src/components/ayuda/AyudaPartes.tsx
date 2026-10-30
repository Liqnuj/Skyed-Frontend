import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AyudaArticuloResumen, AyudaCategoria, ModuloAyuda } from '../../services/ayudaService';
import { rutaAyuda } from './rutas';

/* ---------- Cabecera ---------- */
export function AyudaHero({
  titulo,
  texto,
  icono,
  compacto = false,
  comoH1 = true,
  etiqueta,
  children,
}: {
  titulo: string;
  texto?: string | null;
  icono?: string;
  compacto?: boolean;
  /** En la página de artículo el h1 es el título del artículo, no el de la cabecera. */
  comoH1?: boolean;
  etiqueta?: string;
  children?: ReactNode;
}) {
  const Titulo = comoH1 ? 'h1' : 'p';

  return (
    <div className={`ay-hero${compacto ? ' ay-hero--compacto' : ''}`}>
      <div className="ay-wrap">
        {etiqueta && <span className="ay-eyebrow">{etiqueta}</span>}
        <Titulo className="ay-hero-titulo">
          {icono && (
            <span className="ay-hero-icono" aria-hidden="true">
              <i className={`ti ${icono}`} />
            </span>
          )}
          {titulo}
        </Titulo>
        {texto && <p className="ay-hero-texto">{texto}</p>}
        {children}
      </div>
    </div>
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

/* ---------- Tarjetas ---------- */
export function AyudaCategoriaCard({ categoria, modulo }: { categoria: AyudaCategoria; modulo: ModuloAyuda }) {
  const total = categoria.total_articulos ?? 0;

  return (
    <Link className="ay-card" to={`${rutaAyuda(modulo)}/categoria/${categoria.slug}`}>
      <span className="ay-card-icono" aria-hidden="true">
        <i className={`ti ${categoria.icono}`} />
      </span>
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
  modulo: ModuloAyuda;
  conCategoria?: boolean;
}) {
  return (
    <Link className="ay-card" to={`${rutaAyuda(modulo)}/articulo/${articulo.slug}`}>
      {conCategoria && articulo.categoria && <span className="ay-etiqueta">{articulo.categoria.nombre}</span>}
      <h3>{articulo.titulo}</h3>
      {articulo.resumen && <p>{articulo.resumen}</p>}
      <span className="ay-card-meta">
        Leer guía <i className="ti ti-arrow-right" aria-hidden="true" />
      </span>
    </Link>
  );
}

/* ---------- Preguntas frecuentes (acordeón accesible) ---------- */
export function AyudaFaq({ items, modulo }: { items: AyudaArticuloResumen[]; modulo: ModuloAyuda }) {
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

  // Los administradores gestionan las PQRS, no las crean.
  if (user?.role === 'admin') return null;

  // El formulario de PQRS acepta hasta 100 caracteres en el asunto.
  const rutaPqr = `/social/pqr?desde=ayuda${asunto ? `&asunto=${encodeURIComponent(asunto.slice(0, 100))}` : ''}`;
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