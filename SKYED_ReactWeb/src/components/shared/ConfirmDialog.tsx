import { useCallback, useEffect, useRef, useState } from "react";
import "../../styles/shared/confirmDialog.css";

export type OpcionesConfirmacion = {
  titulo: string;
  mensaje: string;
  /** Texto del botón de acción (por defecto "Confirmar"). */
  confirmar?: string;
  /** "peligro" (eliminar, rechazar) se pinta en rojo; "normal" con el color del panel. */
  tipo?: "peligro" | "normal";
};

type Pendiente = OpcionesConfirmacion & { resolver: (ok: boolean) => void };

/**
 * Reemplaza window.confirm (la ventana negra y básica del navegador) por
 * una ventana con el diseño del panel. Uso:
 *
 *   const { confirmar, dialogo } = useConfirmacion();
 *   if (!(await confirmar({ titulo: "Eliminar evento", mensaje: "...", confirmar: "Eliminar", tipo: "peligro" }))) return;
 *   ...
 *   return <>{...}{dialogo}</>;
 *
 * Se renderiza dentro del panel, así toma su color (--admin-accent) y su
 * modo oscuro (.dark).
 */
export function useConfirmacion() {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const confirmar = useCallback(
    (opciones: OpcionesConfirmacion) =>
      new Promise<boolean>((resolver) => setPendiente({ ...opciones, resolver })),
    [],
  );

  const cerrar = (ok: boolean) => {
    pendiente?.resolver(ok);
    setPendiente(null);
  };

  const dialogo = pendiente ? <ConfirmDialog {...pendiente} onCerrar={cerrar} /> : null;

  return { confirmar, dialogo };
}

function ConfirmDialog({
  titulo,
  mensaje,
  confirmar = "Confirmar",
  tipo = "normal",
  onCerrar,
}: OpcionesConfirmacion & { onCerrar: (ok: boolean) => void }) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const aceptarRef = useRef<HTMLButtonElement>(null);

  // Foco inicial: en acciones peligrosas, "Cancelar" (para no borrar con un
  // Enter accidental); en las normales, el botón de acción.
  useEffect(() => {
    (tipo === "peligro" ? cancelarRef : aceptarRef).current?.focus();
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar(false);
    };
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, []);

  return (
    <div
      className="cd-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(false); }}
    >
      <div
        className={`cd-card cd-${tipo}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-titulo"
        aria-describedby="cd-mensaje"
      >
        <div className="cd-icon" aria-hidden="true">
          <i className={`ti ${tipo === "peligro" ? "ti-alert-triangle" : "ti-help-circle"}`} />
        </div>
        <h2 id="cd-titulo">{titulo}</h2>
        <p id="cd-mensaje">{mensaje}</p>
        <div className="cd-actions">
          <button title="Cancelar y cerrar esta ventana" ref={cancelarRef} type="button" className="cd-btn cd-btn-cancel" onClick={() => onCerrar(false)}>
            Cancelar
          </button>
          <button title={confirmar} ref={aceptarRef} type="button" className="cd-btn cd-btn-ok" onClick={() => onCerrar(true)}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
