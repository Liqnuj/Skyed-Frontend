import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { apiFetch } from '../../services/api';
import '../../styles/deportivo/participante.css';

interface EventoInscrito {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  imagen_url: string | null;
}

interface Qr {
  codigo: string | null;
  estado: string | null;
}

interface InscripcionActiva {
  id: number;
  estado: string;
  fecha: string;
  evento: EventoInscrito | null;
  qr: Qr | null;
}

function fmtFechaLarga(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MyEntry() {
  return (
    <Protected>
      <SportWrapper>
        <MyEntryContent />
      </SportWrapper>
    </Protected>
  );
}

function MyEntryContent() {
  const { idEvento } = useParams();
  const [inscripcion, setInscripcion] = useState<InscripcionActiva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/mis-inscripciones')
      .then((data) => {
        const activas = (data.inscripciones ?? [])
          .filter((i: InscripcionActiva) => ['pendiente', 'confirmada'].includes(i.estado));

        let elegida: InscripcionActiva | undefined;

        if (idEvento) {
          // Se pidió un evento específico: solo esa inscripción sirve.
          elegida = activas.find((i: InscripcionActiva) => i.evento?.id === Number(idEvento));
        } else {
          // Sin evento específico (link genérico de menú): la más reciente.
          elegida = [...activas].sort(
            (a: InscripcionActiva, b: InscripcionActiva) =>
              new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          )[0];
        }

        setInscripcion(elegida ?? null);
      })
      .catch(() => setError('No se pudo cargar tu inscripción.'))
      .finally(() => setCargando(false));
  }, [idEvento]);

  if (cargando) {
    return (
      <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 700, margin: '0 auto' }}>
        <div className="part-card"><div className="part-card-body">Cargando tu entrada…</div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 700, margin: '0 auto' }}>
        <div className="part-card"><div className="part-card-body">{error}</div></div>
      </div>
    );
  }

  if (!inscripcion || !inscripcion.evento) {
    return (
      <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 700, margin: '0 auto' }}>
        <div className="part-card">
          <div className="part-card-body">
            <div className="part-empty-row">
              Todavía no tienes una inscripción activa. <Link to="/deportivo/eventos">Ver eventos</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { evento, qr } = inscripcion;

  return (
    <div className="part-body" style={{ gridTemplateColumns: '1fr', maxWidth: 700, margin: '0 auto' }}>
      <div className="part-card">
        <div className="part-card-head">
          <span className="part-card-head-icon"><i className="ti ti-ticket" aria-hidden="true" /></span>
          <h3>Tu entrada digital</h3>
        </div>
        <div className="part-card-body" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 .3rem' }}>{evento.nombre}</h2>
          <p className="part-form-hint" style={{ margin: '0 0 1.25rem' }}>
            {fmtFechaLarga(evento.fecha)}{evento.hora ? ` · ${evento.hora}` : ''} · {evento.ubicacion}
          </p>

          {qr?.codigo ? (
            <div className="part-qr-block">
              <div className="part-qr-glow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qr.codigo)}`}
                  alt="Código QR de tu entrada"
                  width={230}
                  height={230}
                />
              </div>
              <div className="part-qr-code-text">{qr.codigo}</div>
              <p className="part-qr-hint">Muestra este código en el punto de control el día del evento.</p>
            </div>
          ) : (
            <p className="part-form-hint">Tu código QR se está generando, vuelve a intentarlo en un momento.</p>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <span className={`part-status-pill ${inscripcion.estado === 'confirmada' ? 'ok' : 'pending'}`}>
              {inscripcion.estado === 'confirmada' ? 'Inscripción confirmada' : 'Pago pendiente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}