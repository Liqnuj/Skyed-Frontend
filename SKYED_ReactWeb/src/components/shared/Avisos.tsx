import { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/shared/avisos.css';

/**
 * Avisos flotantes de los paneles de administración: arriba a la derecha,
 * verde si salió bien y rojo si hubo un problema, con una barra que muestra
 * cuánto falta para que se cierren (el mismo estilo del registro). Pasar el
 * mouse o el foco por encima los deja quietos para poder leerlos.
 *
 *   const { avisar, avisos } = useAvisos();
 *   avisar('Evento creado');                 // tipo según el texto
 *   avisar('No se pudo guardar', 'error');   // tipo explícito
 *   return <div className="panel">...{avisos}</div>;
 *
 * Se dibujan dentro del panel para tomar su modo oscuro (.dark) y su tamaño de letra.
 */

export type TipoAviso = 'ok' | 'error';
export type Avisar = (texto: string, tipo?: TipoAviso) => void;

interface Aviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

const DURACION: Record<TipoAviso, number> = { ok: 3000, error: 5000 };
const MAXIMO = 3;

/**
 * Para los avisos que no dicen su tipo: los mensajes de error y de validación
 * del proyecto empiezan casi siempre así ("No se pudo…", "Selecciona…").
 */
const PATRON_ERROR = /^(no\b|error|ocurrió|selecciona|sube\b|completa|agrega|revisa|escribe|para resolver|la edad|la cantidad|el archivo debe|la imagen no|este navegador|debes|falta|demasiados|sin permiso|ya existe)/i;

export function tipoDeAviso(texto: string): TipoAviso {
  return PATRON_ERROR.test(texto.trim()) ? 'error' : 'ok';
}

export function useAvisos() {
  const [lista, setLista] = useState<Aviso[]>([]);
  const siguiente = useRef(0);

  const cerrar = useCallback((id: number) => {
    setLista((actual) => actual.filter((a) => a.id !== id));
  }, []);

  const avisar: Avisar = useCallback((texto, tipo) => {
    const nuevo = { id: ++siguiente.current, texto, tipo: tipo ?? tipoDeAviso(texto) };
    // El mismo mensaje dos veces seguidas no se apila: se reinicia.
    setLista((actual) => [nuevo, ...actual.filter((a) => a.texto !== texto)].slice(0, MAXIMO));
  }, []);

  const avisos = (
    <div className="avisos" aria-live="polite">
      {lista.map((a) => <AvisoFlotante key={a.id} aviso={a} onCerrar={cerrar} />)}
    </div>
  );

  return { avisar, avisos };
}

function AvisoFlotante({ aviso, onCerrar }: { aviso: Aviso; onCerrar: (id: number) => void }) {
  const duracion = DURACION[aviso.tipo];
  const [pausado, setPausado] = useState(false);
  const restante = useRef(duracion);
  const inicio = useRef(0);

  // El tiempo corre solo mientras no está en pausa (y la barra lo acompaña).
  useEffect(() => {
    if (pausado) return;
    inicio.current = Date.now();
    const temporizador = window.setTimeout(() => onCerrar(aviso.id), restante.current);
    return () => {
      window.clearTimeout(temporizador);
      restante.current -= Date.now() - inicio.current;
    };
  }, [pausado, aviso.id, onCerrar]);

  return (
    <div
      className={`aviso aviso-${aviso.tipo} ${pausado ? 'is-pausado' : ''}`}
      role={aviso.tipo === 'error' ? 'alert' : 'status'}
      style={{ ['--aviso-duracion' as string]: `${duracion}ms` }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span className="aviso-icono" aria-hidden="true">
        <i className={`ti ${aviso.tipo === 'ok' ? 'ti-circle-check-filled' : 'ti-alert-triangle-filled'}`} />
      </span>
      <p className="aviso-texto">{aviso.texto}</p>
      <button type="button" className="aviso-cerrar" onClick={() => onCerrar(aviso.id)} title="Cerrar aviso" aria-label="Cerrar aviso">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
      <span className="aviso-barra" aria-hidden="true" />
    </div>
  );
}
