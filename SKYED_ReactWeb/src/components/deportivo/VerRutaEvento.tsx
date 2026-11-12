// src/components/deportivo/VerRutaEvento.tsx
// Botón "Ver ruta" para las páginas públicas/participante (detalle del evento e inscripción).
// Carga las rutas del evento y, con un clic, abre un modal con el trazado en el mapa.
// Usa estilos propios (verRuta.css): los de .admin-modal solo existen dentro del panel admin.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/deportivo/verRuta.css";
import { apiFetch } from "../../services/api";
import { extraerPuntos, leerGpx } from "./RutaMapaModal";

type RutaPublica = {
  id_re: number;
  nombre_re: string;
  distancia_re?: string | null;
  desnivel_re?: string | null;
  descripcion_re?: string | null;
  archivo_gpx_re?: string | null;
};

function ModalRuta({ rutas, onClose }: { rutas: RutaPublica[]; onClose: () => void }) {
  const [indice, setIndice] = useState(0);
  const ruta = rutas[indice];
  const contenedor = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [contenido, setContenido] = useState<string | null>(null);

  // Cerrar con Escape y bloquear el scroll de fondo mientras está abierto
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (!contenedor.current || !ruta?.archivo_gpx_re) return;
    setCargando(true);
    setError("");
    setContenido(null);
    const mapa = L.map(contenedor.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(mapa);
    mapa.setView([5.7, -72.9], 8);
    let activo = true;

    leerGpx(ruta.archivo_gpx_re)
      .then((texto) => {
        if (!activo) return;
        setContenido(texto);
        const pts = extraerPuntos(texto);
        if (!pts.length) throw new Error("El GPX no tiene puntos de ruta.");
        const linea = L.polyline(pts, { weight: 4 }).addTo(mapa);
        L.circleMarker(pts[0], { radius: 8, color: "#16a34a", fillOpacity: 1 }).addTo(mapa).bindTooltip("Inicio");
        L.circleMarker(pts[pts.length - 1], { radius: 8, color: "#dc2626", fillOpacity: 1 }).addTo(mapa).bindTooltip("Fin");
        mapa.invalidateSize();
        mapa.fitBounds(linea.getBounds(), { padding: [20, 20] });
      })
      .catch((err) => activo && setError(err instanceof Error ? err.message : "No se pudo mostrar la ruta."))
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
      mapa.remove();
    };
  }, [ruta?.archivo_gpx_re]);

  function descargar() {
    if (!contenido) return;
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/gpx+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ruta.nombre_re.replace(/[^\w-]+/g, "_") || "ruta"}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return createPortal(
    <div className="vr-fondo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vr-modal" role="dialog" aria-modal="true" aria-label={`Ruta ${ruta.nombre_re}`}>
        <div className="vr-cabeza">
          <div>
            <h2>{ruta.nombre_re}</h2>
            <p>
              {[ruta.distancia_re && `Distancia: ${ruta.distancia_re}`, ruta.desnivel_re && `Desnivel: ${ruta.desnivel_re}`]
                .filter(Boolean)
                .join("  ·  ") || "Trazado de la ruta"}
            </p>
          </div>
          <button type="button" className="vr-cerrar" title="Cerrar" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        {rutas.length > 1 && (
          <div className="vr-tabs" role="tablist" aria-label="Rutas del evento">
            {rutas.map((r, i) => (
              <button
                key={r.id_re}
                type="button"
                role="tab"
                aria-selected={i === indice}
                className={i === indice ? "activa" : ""}
                onClick={() => setIndice(i)}
              >
                {r.nombre_re}
              </button>
            ))}
          </div>
        )}

        <div className="vr-mapa-caja">
          <div ref={contenedor} className="vr-mapa" />
          {cargando && <div className="vr-estado">Cargando mapa…</div>}
          {error && <div className="vr-estado vr-error">{error}</div>}
        </div>

        {ruta.descripcion_re && <p className="vr-descripcion">{ruta.descripcion_re}</p>}

        <div className="vr-acciones">
          <button type="button" className="vr-btn vr-btn-sec" onClick={descargar} disabled={!contenido}>Descargar GPX</button>
          <button type="button" className="vr-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Botón que muestra las rutas del evento. Si el evento no tiene ninguna con GPX, no se muestra.
 * `className` permite adaptarlo al estilo de cada página (por ejemplo "button outline").
 */
export default function VerRutaEvento({
  eventoId,
  className = "vr-btn",
  children = "Ver ruta",
}: {
  eventoId: number | string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [rutas, setRutas] = useState<RutaPublica[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    apiFetch(`/eventos/${eventoId}/rutas?per_page=100`)
      .then((res) => {
        if (!vigente) return;
        const lista: RutaPublica[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setRutas(lista.filter((r) => !!r.archivo_gpx_re));
      })
      .catch(() => vigente && setRutas([]));
    return () => { vigente = false; };
  }, [eventoId]);

  if (!rutas.length) return null;
  return (
    <>
      <button type="button" className={className} title="Ver el recorrido en el mapa" onClick={() => setAbierto(true)}>
        {children}
      </button>
      {abierto && <ModalRuta rutas={rutas} onClose={() => setAbierto(false)} />}
    </>
  );
}
