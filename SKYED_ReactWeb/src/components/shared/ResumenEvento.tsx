import type { ReactNode } from "react";
import { X } from "lucide-react";
import "../../styles/shared/resumenEvento.css";

/**
 * Ventana "Resumen del evento" de los paneles de administración: tarjetas con
 * las cifras de un evento (inscritos o reservas, dinero, asistencia...).
 * Cada panel arma su contenido con <Indicador> y <BarraProgreso>.
 */
export function ResumenEventoModal({ titulo, subtitulo, onClose, children }: {
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal resumen-evento" role="dialog" aria-modal="true" aria-label={`Resumen de ${titulo}`}>
        <div className="admin-modal-head">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="icon-btn" title="Cerrar" aria-label="Cerrar" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="rev-grid">{children}</div>
      </div>
    </div>
  );
}

/** Una tarjeta: título, cifra principal y, debajo, detalle opcional. */
export function Indicador({ titulo, valor, detalle, ancho, children }: {
  titulo: string;
  valor: ReactNode;
  detalle?: ReactNode;
  /** Ocupa las dos columnas. */
  ancho?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`rev-card ${ancho ? "ancho" : ""}`}>
      <span className="rev-titulo">{titulo}</span>
      <strong className="rev-valor">{valor}</strong>
      {detalle && <p className="rev-detalle">{detalle}</p>}
      {children}
    </section>
  );
}

/** Barra de progreso con su porcentaje (no pasa de 100 %). */
export function BarraProgreso({ actual, total, etiqueta }: { actual: number; total: number; etiqueta: string }) {
  const porcentaje = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
  return (
    <div className="rev-barra" role="progressbar" aria-label={etiqueta} aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

/** Lista "concepto ........ valor" (por ejemplo, el desglose del dinero). */
export function ListaValores({ filas }: { filas: Array<{ nombre: string; valor: ReactNode; destacado?: boolean }> }) {
  return (
    <ul className="rev-lista">
      {filas.map((f) => (
        <li key={f.nombre} className={f.destacado ? "destacado" : ""}>
          <span>{f.nombre}</span>
          <strong>{f.valor}</strong>
        </li>
      ))}
    </ul>
  );
}
