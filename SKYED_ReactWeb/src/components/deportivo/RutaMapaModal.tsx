// src/components/deportivo/RutaMapaModal.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiConfig, fetchSeguro, getToken } from "../../services/api";

/**
 * Lee el GPX guardado en la ruta. Acepta:
 *  - "rutas-gpx/xxx.gpx" (lo que devuelve /deportivo/gpx)
 *  - "http://localhost:8000/storage/rutas-gpx/xxx.gpx" (se extrae el path)
 *  - cualquier otra URL externa (se pide directo; puede fallar por CORS)
 * Lo de storage se pide por la API con el token, así no hay problema de CORS.
 */
export async function leerGpx(valor: string): Promise<string> {
  const enStorage = valor.match(/(?:^|\/storage\/)(rutas-gpx\/[A-Za-z0-9._-]+\.gpx)$/);
  let res: Response;
  if (enStorage) {
    const token = getToken();
    res = await fetchSeguro(`${apiConfig.baseURL}/deportivo/gpx?path=${encodeURIComponent(enStorage[1])}`, {
      headers: { Accept: "application/gpx+xml, application/xml, */*", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } else if (/^https?:\/\//i.test(valor)) {
    res = await fetchSeguro(valor);
  } else {
    throw new Error("No se reconoce la ubicación del archivo GPX.");
  }
  if (!res.ok) throw new Error(res.status === 404 ? "No se encontró el archivo GPX en el servidor." : "No se pudo leer el archivo GPX.");
  return res.text();
}

export function extraerPuntos(texto: string): [number, number][] {
  const xml = new DOMParser().parseFromString(texto, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("El archivo GPX no es válido.");
  return Array.from(xml.querySelectorAll("trkpt, rtept"))
    .map((p) => [parseFloat(p.getAttribute("lat") ?? ""), parseFloat(p.getAttribute("lon") ?? "")] as [number, number])
    .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
}

export default function RutaMapaModal({
  gpx,
  nombre,
  onClose,
  onError,
}: {
  gpx: string;
  nombre: string;
  onClose: () => void;
  onError: (texto: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [contenido, setContenido] = useState<string | null>(null);

  useEffect(() => {
    if (!contenedor.current) return;
    const mapa = L.map(contenedor.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(mapa);
    mapa.setView([5.7, -72.9], 8); // Boyacá, mientras carga
    let activo = true;

    leerGpx(gpx)
      .then((texto) => {
        if (!activo) return;
        setContenido(texto);
        const pts = extraerPuntos(texto);
        if (!pts.length) throw new Error("El GPX no tiene puntos de ruta.");
        const linea = L.polyline(pts, { weight: 4 }).addTo(mapa);
        // circleMarker evita el problema de iconos rotos de Leaflet con Vite
        L.circleMarker(pts[0], { radius: 8, color: "#16a34a", fillOpacity: 1 }).addTo(mapa).bindTooltip("Inicio");
        L.circleMarker(pts[pts.length - 1], { radius: 8, color: "#dc2626", fillOpacity: 1 }).addTo(mapa).bindTooltip("Fin");
        mapa.invalidateSize();
        mapa.fitBounds(linea.getBounds(), { padding: [20, 20] });
      })
      .catch((err) => {
        if (!activo) return;
        onError(err instanceof Error ? err.message : "No se pudo mostrar la ruta.");
        onClose();
      })
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
      mapa.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpx]);

  function descargar() {
    if (!contenido) return;
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/gpx+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre.replace(/[^\w-]+/g, "_") || "ruta"}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const destino = document.querySelector(".deportivo-admin") ?? document.body;
  return createPortal(
    <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Ruta ${nombre}`} style={{ width: "min(900px, 95vw)" }}>
        <div className="admin-modal-head">
          <div><h2>{nombre}</h2><p>Trazado de la ruta</p></div>
          <button type="button" title="Cerrar" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </div>
        <div style={{ position: "relative" }}>
          <div ref={contenedor} style={{ height: 420, width: "100%", borderRadius: 8 }} />
          {cargando && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(255,255,255,.6)", zIndex: 1000 }}>
              <Loader2 className="spin" size={28} />
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={descargar} disabled={!contenido}>
            <Download size={15} /> Descargar GPX
          </button>
          <button type="button" className="primary-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    destino,
  );
}