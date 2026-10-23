import { useEffect, useRef } from 'react';

export interface ToastMsg {
  tipo: 'ok' | 'error';
  texto: string;
  /** Cambia en cada aviso (Date.now()) para reiniciar la animación y el temporizador. */
  id: number;
}

interface ToastProps {
  msg: ToastMsg | null;
  onClose: () => void;
  /** Milisegundos antes de ocultarse. Debe coincidir con la animación partToastTimer en el CSS. */
  duracion?: number;
}

/**
 * Aviso flotante de SkyedSocial: mismo estilo que `.part-form-alert` de Deportivo
 * (tarjeta arriba a la derecha, borde de color y barra de progreso).
 * Uso: <Toast msg={msg} onClose={() => setMsg(null)} />
 */
export default function Toast({ msg, onClose, duracion = 4000 }: ToastProps) {
  // El callback se guarda en un ref para que el temporizador no se reinicie en cada render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => onCloseRef.current(), duracion);
    return () => clearTimeout(t);
  }, [msg, duracion]);

  if (!msg) return null;

  return (
    <div
      className={`pf-toast ${msg.tipo}`}
      key={msg.id}
      role={msg.tipo === 'error' ? 'alert' : 'status'}
      style={{ ['--toast-dur' as string]: `${duracion}ms` }}
    >
      <span className="pf-toast-icon" aria-hidden="true">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span>{msg.texto}</span>
      <div className="pf-toast-timer" />
    </div>
  );
}