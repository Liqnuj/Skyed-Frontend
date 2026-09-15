import { useEffect, useState } from 'react';
import SiteHeader from '../../components/SiteHeader';
import SiteFooter from '../../components/SiteFooter';
import { resultadoService, type Resultado } from '../../services/deportivoService';

export default function Results() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    resultadoService
      .listar()
      .then((res) => setResultados(res.resultados.data))
      .catch(() => setError('No se pudieron cargar los resultados.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SiteHeader brand="sport" />
      <main>
        <section className="page-hero deportivo-hero">
          <div className="container">
            <span className="eyebrow">SKYED DEPORTIVO</span>
            <h1>Resultados por evento</h1>
            <p>Resultados oficiales de las competencias ya realizadas.</p>
          </div>
        </section>
        <section className="section">
          <div className="container table-wrap">
            {loading && <p>Cargando resultados...</p>}
            {error && <p className="form-error error">{error}</p>}
            {!loading && !error && (
              resultados.length === 0 ? (
                <p>Todavía no hay resultados publicados.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Participante</th>
                      <th>Categoría</th>
                      <th>Tiempo</th>
                      <th>Posición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r) => (
                      <tr key={r.id_r}>
                        <td>{r.inscripcion?.evento?.nombre_e ?? '—'}</td>
                        <td>
                          {r.inscripcion?.usuario
                            ? `${r.inscripcion.usuario.nombre_u} ${r.inscripcion.usuario.apellido_u}`
                            : '—'}
                        </td>
                        <td>{r.inscripcion?.evento?.categoria_e ?? '—'}</td>
                        <td>{r.tiempo_final_r}</td>
                        <td>{r.posicion_general_r ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>
      </main>
      <SiteFooter variant="sport" />
    </>
  );
}