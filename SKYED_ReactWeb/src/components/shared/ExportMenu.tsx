import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { apiDownload } from "../../services/api";
import type { ParamsDescarga } from "../../services/api";
import "../../styles/shared/exportMenu.css";

/** Filtro extra que se elige dentro del menú (solo los que existen como columna real). */
export type ExportFiltro =
  | { clave: string; etiqueta: string; tipo: "select"; opciones: { value: string; label: string }[] }
  | { clave: string; etiqueta: string; tipo: "fecha" };

type Props = {
  /** Ruta del reporte en la API, sin "/reportes/": por ejemplo "social/reservas". */
  ruta: string;
  /** Nombre base del archivo descargado, por ejemplo "skyed-social-reservas". */
  archivo: string;
  /** Filtros que la tabla YA tiene en pantalla (búsqueda, selects…): se envían tal cual. */
  params?: ParamsDescarga;
  /** Filtros adicionales que se eligen dentro del menú. */
  filtros?: ExportFiltro[];
  /** Para mostrar avisos (el panel usa un "toast"). */
  onMensaje?: (mensaje: string) => void;
};

const sello = () => {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}`;
};

export default function ExportMenu({ ruta, archivo, params = {}, filtros = [], onMensaje }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState<"pdf" | "xlsx" | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const raiz = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const descargar = async (formato: "pdf" | "xlsx") => {
    setCargando(formato);
    try {
      const blob = await apiDownload(`/reportes/${ruta}/${formato}`, { ...params, ...extra });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${archivo}_${sello()}.${formato}`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      onMensaje?.(formato === "pdf" ? "Reporte PDF generado" : "Reporte Excel generado");
      setAbierto(false);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo generar el reporte.";
      if (onMensaje) onMensaje(mensaje);
      else window.alert(mensaje);
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="export-menu" ref={raiz}>
      <button
        type="button"
        className="secondary-btn"
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <Download size={16} /> Exportar <ChevronDown size={14} />
      </button>

      {abierto && (
        <div className="export-panel" role="menu">
          {filtros.length > 0 && (
            <div className="export-filtros">
              {filtros.map((f) => (
                <label key={f.clave}>
                  <span>{f.etiqueta}</span>
                  {f.tipo === "select" ? (
                    <select
                      value={extra[f.clave] ?? ""}
                      onChange={(e) => setExtra({ ...extra, [f.clave]: e.target.value })}
                    >
                      <option value="">Todos</option>
                      {f.opciones.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="date"
                      value={extra[f.clave] ?? ""}
                      onChange={(e) => setExtra({ ...extra, [f.clave]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          <p className="export-nota">
            Incluye todos los registros que coincidan con los filtros, no solo los de la página.
          </p>

          <div className="export-acciones">
            <button type="button" role="menuitem" disabled={cargando !== null} onClick={() => descargar("pdf")}>
              {cargando === "pdf" ? <Loader2 size={16} className="export-spin" /> : <FileText size={16} />} PDF
            </button>
            <button type="button" role="menuitem" disabled={cargando !== null} onClick={() => descargar("xlsx")}>
              {cargando === "xlsx" ? <Loader2 size={16} className="export-spin" /> : <FileSpreadsheet size={16} />} Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}