import { useState } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import Protected from '../../components/Protected';

export default function Admin() {
  const [tab, setTab] = useState('reservas');
  const tabs = ['reservas', 'eventos', 'usuarios', 'pqr', 'inscripciones'];

  return (
    <Protected>
      <SocialWrapper>
        <main className="dashboard section">
          <div className="container dashboard-grid">
            <aside className="sidebar">
              <strong>Panel Admin</strong>
              {tabs.map((t) => (
                <a
                  href="#!"
                  className={tab === t ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(t);
                  }}
                  key={t}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </a>
              ))}
            </aside>
            <section>
              <div className="section-head">
                <div>
                  <span className="eyebrow social">ADMINISTRACIÓN</span>
                  <h1>Panel de control</h1>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Elemento</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i}>
                        <td>#{100 + i}</td>
                        <td>
                          {tab === 'reservas'
                            ? 'Reserva de evento'
                            : tab === 'eventos'
                            ? 'Evento social'
                            : tab === 'usuarios'
                            ? 'Usuario SKYED'
                            : tab === 'pqr'
                            ? 'PQR recibida'
                            : 'Inscripción'}
                        </td>
                        <td>
                          <span className="eyebrow social">Pendiente</span>
                        </td>
                        <td>
                          <button className="button social-btn small">Gestionar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </SocialWrapper>
    </Protected>
  );
}