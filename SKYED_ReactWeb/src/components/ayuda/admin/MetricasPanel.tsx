import { useCallback, useEffect, useState } from 'react';
import { ayudaAdminService } from '../../../services/ayudaAdminService';
import type { Metricas } from '../../../services/ayudaAdminService';
import { mensajeDeError } from './tipos';

export default function MetricasPanel({ onRevisar }: { onRevisar: (id: number) => void }) {
  const [datos, setDatos] = useState<Metricas | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setError('');
    ayudaAdminService
      .metricas()
      .then(setDatos)
      .catch((e) => setError(mensajeDeError(e, 'No pudimos cargar las métricas.')));
  }, []);

  useEffect(cargar, [cargar]);

  if (error) {
    return (
      <div className="ay-adm-vacio" role="alert">
        <p>{error}</p>
        <button type="button" className="ay-adm-btn ay-adm-btn--primario" onClick={cargar}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!datos) return <div className="ay-adm-vacio" role="status">Cargando métricas…</div>;

  const { resumen, mas_vistos, por_mejorar, categorias } = datos;
  const votos = resumen.utiles + resumen.no_utiles;
  const maxVisitas = Math.max(1, ...categorias.map((c) => c.visitas));

  return (
    <>
      <div className="ay-adm-kpis">
        <div className="ay-adm-kpi">
          <span className="ay-adm-kpi-valor">{resumen.publicados}</span>
          <span className="ay-adm-kpi-nombre">Artículos publicados</span>
          <span className="ay-adm-kpi-nota">de {resumen.articulos} ({resumen.borradores} borradores, {resumen.desactivados} desactivados)</span>
        </div>
        <div className="ay-adm-kpi">
          <span className="ay-adm-kpi-valor">{resumen.visitas}</span>
          <span className="ay-adm-kpi-nombre">Visitas totales</span>
          <span className="ay-adm-kpi-nota">una por persona y sesión</span>
        </div>
        <div className="ay-adm-kpi">
          <span className="ay-adm-kpi-valor">{votos}</span>
          <span className="ay-adm-kpi-nombre">Opiniones recibidas</span>
          <span className="ay-adm-kpi-nota">{resumen.utiles} útiles · {resumen.no_utiles} no útiles</span>
        </div>
        <div className="ay-adm-kpi">
          <span className="ay-adm-kpi-valor">{resumen.satisfaccion === null ? '—' : `${resumen.satisfaccion} %`}</span>
          <span className="ay-adm-kpi-nombre">Satisfacción</span>
          <span className="ay-adm-kpi-nota">{resumen.satisfaccion === null ? 'Aún no hay opiniones' : 'porcentaje de «Sí me fue útil»'}</span>
        </div>
      </div>

      <div className="ay-adm-dos">
        <section className="ay-adm-tarjeta" aria-labelledby="ay-m-vistos">
          <h2 id="ay-m-vistos">Lo más visto</h2>
          {mas_vistos.length === 0 ? (
            <p className="ay-adm-nota">Aún no hay visitas registradas.</p>
          ) : (
            <ol className="ay-adm-ranking">
              {mas_vistos.map((f) => (
                <li key={f.id}>
                  <span>
                    <strong>{f.titulo}</strong>
                    <span className="ay-adm-slug">{f.categoria ?? '—'}</span>
                  </span>
                  <span className="ay-adm-cifra">{f.visitas} visitas</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="ay-adm-tarjeta" aria-labelledby="ay-m-mejorar">
          <h2 id="ay-m-mejorar">Artículos por mejorar</h2>
          {por_mejorar.length === 0 ? (
            <p className="ay-adm-nota">Ningún artículo ha recibido «No me fue útil».</p>
          ) : (
            <ol className="ay-adm-ranking">
              {por_mejorar.map((f) => (
                <li key={f.id}>
                  <span>
                    <strong>{f.titulo}</strong>
                    <span className="ay-adm-slug">
                      {f.no_utiles} de {f.utiles + f.no_utiles} opiniones dicen que no fue útil ({f.porcentaje_no_util} %)
                    </span>
                  </span>
                  <button type="button" className="ay-adm-btn ay-adm-btn--suave ay-adm-btn--chico" onClick={() => onRevisar(f.id)}>
                    Revisar
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="ay-adm-tarjeta" aria-labelledby="ay-m-cats">
        <h2 id="ay-m-cats">Categorías más consultadas</h2>
        {categorias.every((c) => c.visitas === 0) ? (
          <p className="ay-adm-nota">Aún no hay visitas registradas.</p>
        ) : (
          <ul className="ay-adm-barras">
            {categorias.map((c) => (
              <li key={c.id}>
                <span className="ay-adm-barra-nombre">
                  {c.nombre} <span className="ay-adm-slug">({c.articulos} artículo{c.articulos === 1 ? '' : 's'})</span>
                </span>
                <span className="ay-adm-barra-pista" aria-hidden="true">
                  <span className="ay-adm-barra-relleno" style={{ width: `${(c.visitas / maxVisitas) * 100}%` }} />
                </span>
                <span className="ay-adm-cifra">{c.visitas}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}