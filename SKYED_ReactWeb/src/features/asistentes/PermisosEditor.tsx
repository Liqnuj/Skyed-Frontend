import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import {
  NIVELES,
  NIVEL_INFO,
  SECCIONES_DELEGABLES,
  type Modulo,
  type Nivel,
  type Permisos,
  type SeccionDelegable,
} from '../../types/permisos';
import '../../styles/shared/asistentes.css';

interface Props {
  modulo: Modulo;
  value: Permisos;
  onChange: (next: Permisos) => void;
  disabled?: boolean;
  /** Mensaje de error del formulario (p. ej. "Activa al menos una sección"). */
  error?: string;
}

/**
 * Lista de secciones delegables con un interruptor cada una y, en las
 * activadas, un botón "Personalizar" que abre el nivel de acción.
 *
 * Coherencia (ver < editar < eliminar): como cada sección guarda un solo
 * nivel y los niveles son acumulativos, no hay combinaciones inválidas.
 * Apagar el interruptor borra la clave, es decir, borra sus permisos.
 */
export default function PermisosEditor({ modulo, value, onChange, disabled, error }: Props) {
  const [abierta, setAbierta] = useState<SeccionDelegable | null>(null);

  const alternar = (clave: SeccionDelegable, activa: boolean) => {
    const next = { ...value };
    if (activa) next[clave] = 'ver'; // el mínimo al activar
    else { delete next[clave]; if (abierta === clave) setAbierta(null); }
    onChange(next);
  };

  const fijarNivel = (clave: SeccionDelegable, nivel: Nivel) => onChange({ ...value, [clave]: nivel });

  return (
    <div className="asist-permisos" role="group" aria-label="Secciones a las que puede entrar">
      <ul className="asist-perm-lista">
        {SECCIONES_DELEGABLES[modulo].map(({ clave, etiqueta }) => {
          const nivel = value[clave];
          const activa = !!nivel;
          const panelId = `asist-nivel-${clave}`;
          return (
            <li key={clave} className={`asist-perm-fila ${activa ? 'activa' : ''}`}>
              <div className="asist-perm-cabecera">
                <button
                  type="button"
                  role="switch"
                  aria-checked={activa}
                  aria-label={`Permitir acceso a ${etiqueta}`}
                  className="asist-switch"
                  disabled={disabled}
                  onClick={() => alternar(clave, !activa)}
                >
                  <span className="asist-switch-perilla" />
                </button>

                <span className="asist-perm-nombre">{etiqueta}</span>

                {activa ? (
                  <>
                    <span className={`asist-nivel-chip nivel-${nivel}`}>{NIVEL_INFO[nivel!].etiqueta}</span>
                    <button
                      type="button"
                      className="asist-personalizar"
                      aria-expanded={abierta === clave}
                      aria-controls={panelId}
                      disabled={disabled}
                      onClick={() => setAbierta(abierta === clave ? null : clave)}
                    >
                      <SlidersHorizontal size={14} />
                      Personalizar
                      <ChevronDown size={14} className={abierta === clave ? 'girado' : ''} />
                    </button>
                  </>
                ) : (
                  <span className="asist-perm-sin">Sin acceso</span>
                )}
              </div>

              {activa && abierta === clave && (
                <div id={panelId} className="asist-niveles" role="radiogroup" aria-label={`Nivel en ${etiqueta}`}>
                  {NIVELES.map((n) => (
                    <label key={n} className={`asist-nivel-op ${nivel === n ? 'sel' : ''}`}>
                      <input
                        type="radio"
                        name={`nivel-${clave}`}
                        checked={nivel === n}
                        disabled={disabled}
                        onChange={() => fijarNivel(clave, n)}
                      />
                      <span>
                        <strong>{NIVEL_INFO[n].etiqueta}</strong>
                        <small>{NIVEL_INFO[n].descripcion}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="asist-error" role="alert">{error}</p>}
    </div>
  );
}
