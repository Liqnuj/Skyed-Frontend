import { Link } from 'react-router-dom';

const ICONOS = {
  cargando: 'ti-loader-2',
  error: 'ti-alert-circle',
  vacio: 'ti-calendar-search',
} as const;

/**
 * Lo que se muestra en una lista de Social cuando todavía no hay tarjetas:
 * cargando, error o sin datos. Estilos al final de social.css.
 */
export default function EstadoLista({
  tipo, titulo, texto, accion,
}: {
  tipo: keyof typeof ICONOS;
  titulo: string;
  texto?: string;
  accion?: { texto: string; a: string };
}) {
  return (
    <div className={`estado-lista is-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <span className="estado-lista-icono" aria-hidden="true"><i className={`ti ${ICONOS[tipo]}`} /></span>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {accion && <Link to={accion.a} className="btn-primary" title={accion.texto}>{accion.texto}</Link>}
    </div>
  );
}
