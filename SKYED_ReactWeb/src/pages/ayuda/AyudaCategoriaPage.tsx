import { Link, useParams } from 'react-router-dom';
import AyudaLayout from '../../components/ayuda/AyudaLayout';
import AyudaBuscador from '../../components/ayuda/AyudaBuscador';
import {
  AyudaArticuloCard,
  AyudaCargando,
  AyudaEstado,
  AyudaHero,
  AyudaMigas,
  AyudaSoporte,
} from '../../components/ayuda/AyudaPartes';
import { rutaAyuda } from '../../components/ayuda/rutas';
import { useAyudaDatos } from '../../hooks/useAyudaDatos';
import { ayudaService } from '../../services/ayudaService';
import type { ModuloAyuda } from '../../services/ayudaService';

export default function AyudaCategoriaPage({ modulo }: { modulo: ModuloAyuda }) {
  const { slug = '' } = useParams();
  const base = rutaAyuda(modulo);
  const estado = useAyudaDatos(() => ayudaService.categoria(slug), [slug]);
  const categoria = estado.datos?.categoria;
  const articulos = estado.datos?.articulos ?? [];

  return (
    <AyudaLayout modulo={modulo}>
      <AyudaHero
        compacto
        etiqueta="Centro de Ayuda"
        titulo={categoria?.nombre ?? 'Centro de Ayuda'}
        icono={categoria?.icono}
        texto={categoria?.descripcion}
      >
        <AyudaBuscador modulo={modulo} />
      </AyudaHero>

      <div className="ay-wrap">
        <AyudaMigas
          migas={[
            { texto: 'Inicio', a: `/${modulo}` },
            { texto: 'Ayuda', a: base },
            { texto: categoria?.nombre ?? 'Categoría' },
          ]}
        />

        <div className="ay-seccion ay-fin">
          {estado.cargando ? (
            <AyudaCargando />
          ) : estado.error ? (
            <AyudaEstado
              alerta={estado.error.status !== 404}
              icono={estado.error.status === 404 ? 'ti-file-off' : 'ti-wifi-off'}
              titulo={estado.error.status === 404 ? 'No encontramos esta categoría' : 'No pudimos cargar la categoría'}
              texto={estado.error.message}
            >
              <div className="ay-acciones">
                {estado.error.status !== 404 && (
                  <button type="button" className="ay-btn ay-btn--primario" onClick={estado.reintentar}>
                    Reintentar
                  </button>
                )}
                <Link className="ay-btn ay-btn--suave" to={base}>
                  Volver al Centro de Ayuda
                </Link>
              </div>
            </AyudaEstado>
          ) : (
            <>
              <h2 className="ay-sr">Artículos de {categoria?.nombre}</h2>
              <div className="ay-grid ay-grid--lista">
                {articulos.map((a) => (
                  <AyudaArticuloCard key={a.id} articulo={a} modulo={modulo} conCategoria={false} />
                ))}
              </div>
              <AyudaSoporte />
            </>
          )}
        </div>
      </div>
    </AyudaLayout>
  );
}