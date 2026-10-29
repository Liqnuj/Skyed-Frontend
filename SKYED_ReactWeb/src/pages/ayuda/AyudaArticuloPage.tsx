import { Link, useParams } from 'react-router-dom';
import AyudaLayout from '../../components/ayuda/AyudaLayout';
import AyudaBuscador from '../../components/ayuda/AyudaBuscador';
import AyudaContenido from '../../components/ayuda/AyudaContenido';
import {
  AyudaArticuloCard,
  AyudaCargando,
  AyudaEstado,
  AyudaHero,
  AyudaMigas,
  AyudaSoporte,
  fechaLarga,
} from '../../components/ayuda/AyudaPartes';
import type { Miga } from '../../components/ayuda/AyudaPartes';
import { rutaAyuda } from '../../components/ayuda/rutas';
import { useAyudaDatos } from '../../hooks/useAyudaDatos';
import { ayudaService } from '../../services/ayudaService';
import type { ModuloAyuda } from '../../services/ayudaService';

export default function AyudaArticuloPage({ modulo }: { modulo: ModuloAyuda }) {
  const { slug = '' } = useParams();
  const base = rutaAyuda(modulo);
  const estado = useAyudaDatos(() => ayudaService.articulo(slug), [slug]);
  const articulo = estado.datos?.articulo;
  const relacionados = estado.datos?.relacionados ?? [];

  const migas: Miga[] = [
    { texto: 'Inicio', a: `/${modulo}` },
    { texto: 'Ayuda', a: base },
  ];
  if (articulo?.categoria) {
    migas.push({ texto: articulo.categoria.nombre, a: `${base}/categoria/${articulo.categoria.slug}` });
  }
  migas.push({ texto: articulo?.titulo ?? 'Artículo' });

  return (
    <AyudaLayout modulo={modulo}>
      <AyudaHero compacto comoH1={false} etiqueta="Centro de Ayuda" titulo="¿En qué podemos ayudarte?">
        <AyudaBuscador modulo={modulo} />
      </AyudaHero>

      <div className="ay-articulo">
        <AyudaMigas migas={migas} />

        {estado.cargando ? (
          <AyudaCargando />
        ) : estado.error || !articulo ? (
          <div className="ay-seccion">
            <AyudaEstado
              alerta={estado.error?.status !== 404}
              icono={estado.error?.status === 404 ? 'ti-file-off' : 'ti-wifi-off'}
              titulo={estado.error?.status === 404 ? 'Este artículo no está disponible' : 'No pudimos cargar el artículo'}
              texto={estado.error?.message}
            >
              <div className="ay-acciones">
                {estado.error?.status !== 404 && (
                  <button type="button" title="Reintentar la carga" className="ay-btn ay-btn--primario" onClick={estado.reintentar}>
                    Reintentar
                  </button>
                )}
                <Link className="ay-btn ay-btn--suave" to={base} title="Ir al Centro de Ayuda">
                  Volver al Centro de Ayuda
                </Link>
              </div>
            </AyudaEstado>
          </div>
        ) : (
          <>
            <h1>{articulo.titulo}</h1>
            {articulo.resumen && <p className="ay-lead">{articulo.resumen}</p>}
            {articulo.actualizado_en && (
              <p className="ay-fecha">Última actualización: {fechaLarga(articulo.actualizado_en)}</p>
            )}

            <AyudaContenido texto={articulo.contenido} />

            {relacionados.length > 0 && (
              <div className="ay-seccion">
                <h2>Artículos relacionados</h2>
                <div className="ay-grid ay-grid--lista">
                  {relacionados.map((a) => (
                    <AyudaArticuloCard key={a.id} articulo={a} modulo={modulo} />
                  ))}
                </div>
              </div>
            )}

            <AyudaSoporte titulo="¿Necesitas más ayuda?" asunto={`Ayuda: ${articulo.titulo}`} />
          </>
        )}
      </div>
    </AyudaLayout>
  );
}