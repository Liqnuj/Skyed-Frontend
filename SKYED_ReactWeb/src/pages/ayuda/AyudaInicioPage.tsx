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
  AyudaSoporte,
} from '../../components/ayuda/AyudaPartes';
import { rutaAyuda } from '../../components/ayuda/rutas';
import { useAyudaDatos } from '../../hooks/useAyudaDatos';
import { ayudaService } from '../../services/ayudaService';
import type { ModuloAyuda, RespuestaBusqueda } from '../../services/ayudaService';

const SUGERENCIAS: Record<ModuloAyuda, string[]> = {
  social: ['Reserva', 'Cancelar Reserva', 'PQRS', 'Contraseña'],
  deportivo: ['Inscripción', 'Pago', 'Código QR', 'Contraseña'],
};

const PLACEHOLDER: Record<ModuloAyuda, string> = {
  social: 'Busca: ¿Cómo hago una reserva?',
  deportivo: 'Busca: ¿Cómo me inscribo a un evento?',
};

export default function AyudaInicioPage({ modulo }: { modulo: ModuloAyuda }) {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const buscando = q.length >= 2;
  const base = rutaAyuda(modulo);

  const inicio = useAyudaDatos(() => ayudaService.inicio(modulo), [modulo]);
  const busqueda = useAyudaDatos<RespuestaBusqueda | null>(
    () => (buscando ? ayudaService.buscar(q, modulo) : Promise.resolve(null)),
    [q, modulo],
  );

  return (
    <AyudaLayout modulo={modulo}>
      <AyudaHero
        etiqueta={modulo === 'social' ? 'SkyedSocial' : 'SKYED Deportivo'}
        titulo="Centro de Ayuda"
        texto="¿En qué podemos ayudarte?"
      >
        <AyudaBuscador modulo={modulo} valorInicial={q} enVivo placeholder={PLACEHOLDER[modulo]} />
        {!buscando && (
          <div className="ay-sugerencias">
            <span>Prueba con:</span>
            {SUGERENCIAS[modulo].map((s) => (
              <Link key={s} className="ay-chip" to={`${base}?q=${encodeURIComponent(s)}`}>
                {s}
              </Link>
            ))}
          </div>
        )}
      </AyudaHero>

      <div className="ay-wrap">
        {buscando ? (
          <Resultados q={q} modulo={modulo} estado={busqueda} />
        ) : (
          <Portada modulo={modulo} estado={inicio} />
        )}
      </div>
    </AyudaLayout>
  );
}

/* ---------- Resultados de búsqueda ---------- */
function Resultados({
  q,
  modulo,
  estado,
}: {
  q: string;
  modulo: ModuloAyuda;
  estado: ReturnType<typeof useAyudaDatos<RespuestaBusqueda | null>>;
}) {
  const base = rutaAyuda(modulo);

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
          <AyudaArticuloCard key={a.id} articulo={a} modulo={modulo} />
        ))}
      </div>
      <AyudaSoporte />
    </div>
  );
}

/* ---------- Portada ---------- */
function Portada({
  modulo,
  estado,
}: {
  modulo: ModuloAyuda;
  estado: ReturnType<typeof useAyudaDatos<import('../../services/ayudaService').RespuestaInicio>>;
}) {
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

  return (
    <>
      <div className="ay-seccion">
        <h2>Explora por categoría</h2>
        <div className="ay-grid">
          {categorias.map((c) => (
            <AyudaCategoriaCard key={c.id} categoria={c} modulo={modulo} />
          ))}
        </div>
      </div>

      {faq.length > 0 && (
        <div className="ay-seccion">
          <h2>Preguntas frecuentes</h2>
          <AyudaFaq items={faq} modulo={modulo} />
        </div>
      )}

      {destacados.length > 0 && (
        <div className="ay-seccion">
          <h2>Artículos destacados</h2>
          <div className="ay-grid ay-grid--lista">
            {destacados.map((a) => (
              <AyudaArticuloCard key={a.id} articulo={a} modulo={modulo} />
            ))}
          </div>
        </div>
      )}

      {populares.length > 0 && (
        <div className="ay-seccion">
          <h2>Lo más consultado</h2>
          <ol className="ay-top">
            {populares.map((a) => (
              <li key={a.id}>
                <Link to={`${rutaAyuda(modulo)}/articulo/${a.slug}`}>{a.titulo}</Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="ay-fin">
        <AyudaSoporte />
      </div>
    </>
  );
}