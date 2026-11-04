import { resumenPermisos, NIVEL_INFO, type Modulo, type Permisos } from '../../types/permisos';
import '../../styles/shared/asistentes.css';

/** Chips tipo "Eventos · editar" para ver de un vistazo qué puede hacer el asistente. */
export default function ResumenPermisos({ modulo, permisos, max = 4 }: { modulo: Modulo; permisos: Permisos; max?: number }) {
  const items = resumenPermisos(modulo, permisos);
  if (!items.length) return <span className="asist-perm-sin">Sin permisos</span>;
  const visibles = items.slice(0, max);
  const resto = items.slice(max);
  return (
    <div className="asist-chips">
      {visibles.map((i) => (
        <span key={i.clave} className={`asist-chip nivel-${i.nivel}`}>
          {i.seccion} · {NIVEL_INFO[i.nivel].corta}
        </span>
      ))}
      {resto.length > 0 && (
        <span className="asist-chip mas" title={resto.map((i) => `${i.seccion} · ${NIVEL_INFO[i.nivel].corta}`).join('\n')}>
          +{resto.length} más
        </span>
      )}
    </div>
  );
}
