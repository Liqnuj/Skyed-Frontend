import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AyudaLayout from '../../components/ayuda/AyudaLayout';
import AyudaBuscador from '../../components/ayuda/AyudaBuscador';
import {
  AyudaArticuloCard,
  AyudaCargando,
  AyudaCategoriaCard,
  AyudaEstado,
  AyudaFaq,
  AyudaHero,
  AyudaInsignia,
  AyudaSoporte,
} from '../../components/ayuda/AyudaPartes';
import { rutaAyuda } from '../../components/ayuda/rutas';
import { useAyudaDatos } from '../../hooks/useAyudaDatos';
import { ayudaService } from '../../services/ayudaService';
import type { RespuestaBusqueda, RespuestaInicio } from '../../services/ayudaService';

/** Centro de Ayuda de la página principal: reúne la ayuda general, la de Deportivo y la de Social. */

type Filtro = 'todo' | 'general' | 'deportivo' | 'social';

const FILTROS: { id: Filtro; nombre: string; detalle: string; icono: string }[] = [
  { id: 'todo', nombre: 'Todo', detalle: 'Toda la ayuda de SKYED', icono: 'ti-layout-grid' },
  { id: 'general', nombre: 'Cuenta y general', detalle: 'Registro, ingreso y contraseña', icono: 'ti-user-circle' },
  { id: 'deportivo', nombre: 'SKYED Deportivo', detalle: 'Inscripciones, pagos y QR', icono: 'ti-bike' },
  { id: 'social', nombre: 'SkyedSocial', detalle: 'Reservas y PQRS', icono: 'ti-confetti' },
];

const PLATAFORMAS = [
  {
    modulo: 'deportivo',
    nombre: 'SKYED Deportivo',
    texto: 'Inscripciones, pagos, código QR y resultados de tus eventos.',
    icono: 'ti-bike',
    a: '/deportivo/ayuda',
  },
  {
    modulo: 'social',
    nombre: 'SkyedSocial',
    texto: 'Reservas, seguimiento de tu evento y PQRS.',
    icono: 'ti-confetti',
    a: '/social/ayuda',
  },
];

const SUGERENCIAS = ['Crear cuenta', 'Contraseña', 'Inscripción', 'Reserva'];

export default function AyudaPrincipalInicioPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const buscando = q.length >= 2;
  const base = rutaAyuda('principal');

  const inicio = useAyudaDatos(() => ayudaService.inicio('principal'), []);
  const busqueda = useAyudaDatos<RespuestaBusqueda | null>(
    () => (buscando ? ayudaService.buscar(q, 'principal') : Promise.resolve(null)),
    [q],
  );

  return (
    <AyudaLayout modulo="principal">
      <AyudaHero etiqueta="SKYED" titulo="Centro de Ayuda" texto="¿En qué podemos ayudarte?">
        <AyudaBuscador
          modulo="principal"
          valorInicial={q}
          enVivo
          placeholder="Busca: ¿Cómo me inscribo o hago una reserva?"
        />
        {!buscando && (
          <div className="ay-sugerencias">
            <span>Prueba con:</span>
            {SUGERENCIAS.map((s) => (
              <Link key={s} className="ay-chip" to={`${base}?q=${encodeURIComponent(s)}`} title={`Buscar “${s}”`}>
                {s}
              </Link>
            ))}
          </div>
        )}
      </AyudaHero>

      <div className="ay-wrap">
        {buscando ? <Resultados q={q} estado={busqueda} /> : <Portada estado={inicio} />}
      </div>
    </AyudaLayout>
  );
}

/* ---------- Resultados de búsqueda ---------- */
function Resultados({
  q,
  estado,
}: {
  q: string;
  estado: ReturnType<typeof useAyudaDatos<RespuestaBusqueda | null>>;
}) {
  const base = rutaAyuda('principal');

  if (estado.error) {
    return (
      <div className="ay-seccion ay-fin">
        <AyudaEstado alerta icono="ti-wifi-off" titulo="No pudimos buscar" texto={estado.error.message}>
          <div className="ay-acciones">
            <button type="button" title="Reintentar la carga" className="ay-btn ay-btn--primario" onClick={estado.reintentar}>
              Reintentar
            </button>
          </div>
        </AyudaEstado>
      </div>
    );
  }

  if (estado.cargando && !estado.datos) return <AyudaCargando />;

  const resultados = estado.datos?.resultados ?? [];

  if (resultados.length === 0) {
    return (
      <div className="ay-seccion ay-fin">
        <AyudaEstado
          icono="ti-search-off"
          titulo="No encontramos resultados para tu búsqueda."
          texto={`No hay artículos que coincidan con “${q}”.`}
        >
          <p>Puedes intentar:</p>
          <ul>
            <li>Usar otras palabras.</li>
            <li>Revisar las categorías.</li>
            <li>Contactar soporte.</li>
          </ul>
          <div className="ay-acciones">
            <Link className="ay-btn ay-btn--suave" to={base} title="Ir al Centro de Ayuda">
              Ver categorías
            </Link>
          </div>
        </AyudaEstado>
        <AyudaSoporte titulo="¿Prefieres que te ayudemos directamente?" asunto={`Ayuda: ${q}`} />
      </div>
    );
  }

  return (
    <div className="ay-seccion ay-fin" aria-live="polite">
      <h2>
        {resultados.length === 1 ? '1 resultado' : `${resultados.length} resultados`} para “{q}”
      </h2>
      <div className="ay-grid ay-grid--lista">
        {resultados.map((a) => (
          <AyudaArticuloCard key={a.id} articulo={a} modulo="principal" />
        ))}
      </div>
      <AyudaSoporte />
    </div>
  );
}

/* ---------- Portada ---------- */
function Portada({ estado }: { estado: ReturnType<typeof useAyudaDatos<RespuestaInicio>> }) {
  // Filtro por espacio (en memoria: cambiarlo no recarga la página ni sube el scroll).
  const [filtro, setFiltro] = useState<Filtro>('todo');

  if (estado.cargando) return <AyudaCargando />;

  if (estado.error || !estado.datos) {
    return (
      <div className="ay-seccion ay-fin">
        <AyudaEstado
          alerta
          icono="ti-wifi-off"
          titulo="No pudimos cargar el Centro de Ayuda"
          texto={estado.error?.message ?? 'Inténtalo de nuevo en un momento.'}
        >
          <div className="ay-acciones">
            <button type="button" title="Reintentar la carga" className="ay-btn ay-btn--primario" onClick={estado.reintentar}>
              Reintentar
            </button>
          </div>
        </AyudaEstado>
      </div>
    );
  }

  const { categorias, faq, destacados, populares = [] } = estado.datos;

  if (categorias.length === 0) {
    return (
      <div className="ay-seccion ay-fin">
        <AyudaEstado
          icono="ti-books"
          titulo="Todavía no hay artículos publicados"
          texto="Estamos preparando las guías. Mientras tanto, puedes escribirnos."
        />
        <AyudaSoporte />
      </div>
    );
  }

  const dentro = (modulo: string) => filtro === 'todo' || modulo === filtro;
  const totalDe = (id: Filtro) =>
    categorias.filter((c) => id === 'todo' || c.modulo === id).reduce((n, c) => n + (c.total_articulos ?? 0), 0);

  // Solo se ofrecen los espacios que tienen ayuda publicada.
  const filtros = FILTROS.filter((f) => f.id === 'todo' || totalDe(f.id) > 0);

  const cats = categorias.filter((c) => dentro(c.modulo));
  const faqs = faq.filter((a) => dentro(a.modulo));
  const dest = destacados.filter((a) => dentro(a.modulo));
  const pops = populares.filter((a) => dentro(a.modulo));

  return (
    <>
      <div className="ay-seccion">
        <h2>¿Sobre qué necesitas ayuda?</h2>
        <div className="ay-espacios" role="group" aria-label="Filtrar la ayuda por espacio">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              className="ay-espacio"
              data-modulo={f.id}
              aria-pressed={filtro === f.id}
              title={f.id === 'todo' ? 'Ver toda la ayuda' : `Ver solo la ayuda de ${f.nombre}`}
              onClick={() => setFiltro(f.id)}
            >
              <span className="ay-espacio-icono" aria-hidden="true">
                <i className={`ti ${f.icono}`} />
              </span>
              <span className="ay-espacio-texto">
                <strong>{f.nombre}</strong>
                <small>{f.detalle}</small>
              </span>
              <span className="ay-espacio-n" aria-label={`${totalDe(f.id)} artículos`}>
                {totalDe(f.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="ay-seccion">
        <h2>Explora por categoría</h2>
        {cats.length > 0 ? (
          <div className="ay-grid">
            {cats.map((c) => (
              <AyudaCategoriaCard key={c.id} categoria={c} modulo="principal" />
            ))}
          </div>
        ) : (
          <AyudaEstado icono="ti-books" titulo="Todavía no hay guías en este espacio" texto="Prueba con otro espacio o escríbenos." />
        )}
      </div>

      {faqs.length > 0 && (
        <div className="ay-seccion">
          <h2>Preguntas frecuentes</h2>
          <AyudaFaq items={faqs} modulo="principal" />
        </div>
      )}

      {dest.length > 0 && (
        <div className="ay-seccion">
          <h2>Artículos destacados</h2>
          <div className="ay-grid ay-grid--lista">
            {dest.map((a) => (
              <AyudaArticuloCard key={a.id} articulo={a} modulo="principal" />
            ))}
          </div>
        </div>
      )}

      {pops.length > 0 && (
        <div className="ay-seccion">
          <h2>Lo más consultado</h2>
          <ol className="ay-top">
            {pops.map((a) => (
              <li key={a.id}>
                <Link to={`${rutaAyuda('principal')}/articulo/${a.slug}`} title={`Leer: ${a.titulo}`}>
                  <span className="ay-top-titulo">{a.titulo}</span>
                  <AyudaInsignia modulo={a.modulo} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="ay-seccion">
        <h2>Ayuda específica de cada plataforma</h2>
        <div className="ay-plataformas">
          {PLATAFORMAS.map((p) => (
            <Link
              key={p.modulo}
              className="ay-plataforma"
              data-modulo={p.modulo}
              to={p.a}
              title={`Ir al Centro de ayuda de ${p.nombre}`}
            >
              <span className="ay-plataforma-icono" aria-hidden="true">
                <i className={`ti ${p.icono}`} />
              </span>
              <span className="ay-plataforma-texto">
                <strong>{p.nombre}</strong>
                <small>{p.texto}</small>
              </span>
              <i className="ti ti-arrow-right ay-plataforma-go" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <div className="ay-fin">
        <AyudaSoporte />
      </div>
    </>
  );
}
