import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Download, Info, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { apiConfig, apiFetch, getToken, SESION_INVALIDA } from "../../services/api";
import type { OpcionesConfirmacion } from "./ConfirmDialog";
import { CargandoPanel } from "./AdminMotion";
import "../../styles/shared/copiasSeguridad.css";

/**
 * Sección "Copias de seguridad" de los paneles de administración. El servidor
 * decide qué ve cada quien: cada admin, los datos de su módulo; el super admin,
 * los dos módulos y el sistema (usuarios, roles...), en cualquiera de los paneles.
 */

interface Conjunto {
  clave: string;
  nombre: string;
  descripcion: string;
  registros: number;
}

interface Grupo {
  clave: string;
  nombre: string;
  conjuntos: Conjunto[];
}

interface Copia {
  id: number;
  fecha: string;
  alcance: string;
  conjuntos: string[];
  tamano: number;
  registros: number;
  origen: "manual" | "automatica" | "previa_restauracion";
  autor: string;
  archivo: string | null;
  disponible: boolean;
}

interface Props {
  /** Panel donde se muestra: sus datos salen primero. */
  modulo: "social" | "deportivo";
  notify: (message: string) => void;
  confirmar: (opciones: OpcionesConfirmacion) => Promise<boolean>;
}

const ORIGENES: Record<Copia["origen"], string | null> = {
  manual: null,
  automatica: "Automática",
  previa_restauracion: "Antes de restaurar",
};

const formatoFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

function formatoTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const conteo = (n: number) => n.toLocaleString("es-CO");

/** La descarga necesita el token, por eso no puede ser un enlace normal. */
async function descargarArchivo(copia: Copia) {
  const token = getToken();
  const res = await fetch(`${apiConfig.baseURL}/copias-seguridad/${copia.id}/descargar`, {
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (res.status === 401 && token) window.dispatchEvent(new Event(SESION_INVALIDA));
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "No se pudo descargar la copia.");
  }

  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = copia.archivo ?? "copia-seguridad-skyed.zip";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export default function CopiasSeguridad({ modulo, notify, confirmar }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [copias, setCopias] = useState<Copia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  // Copia con una acción en curso: se bloquean sus botones para no repetirla.
  const [ocupada, setOcupada] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await apiFetch("/copias-seguridad");
      const propios = (g: Grupo) => (g.clave === modulo ? 0 : 1);
      setGrupos([...data.grupos].sort((a: Grupo, b: Grupo) => propios(a) - propios(b)));
      setCopias(data.copias);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar las copias.");
    } finally {
      setCargando(false);
    }
  }, [modulo]);

  useEffect(() => { void cargar(); }, [cargar]);

  const todos = grupos.flatMap((g) => g.conjuntos);
  const todoElegido = todos.length > 0 && elegidos.length === todos.length;
  const registrosElegidos = todos
    .filter((c) => elegidos.includes(c.clave))
    .reduce((suma, c) => suma + c.registros, 0);

  const alternar = (clave: string) =>
    setElegidos((actual) => actual.includes(clave) ? actual.filter((c) => c !== clave) : [...actual, clave]);

  const alternarGrupo = (grupo: Grupo) => {
    const claves = grupo.conjuntos.map((c) => c.clave);
    const completo = claves.every((c) => elegidos.includes(c));
    setElegidos((actual) => completo
      ? actual.filter((c) => !claves.includes(c))
      : [...new Set([...actual, ...claves])]);
  };

  const crear = async () => {
    setCreando(true);
    try {
      const data = await apiFetch("/copias-seguridad", {
        method: "POST",
        body: JSON.stringify({ conjuntos: elegidos }),
      });
      await descargarArchivo(data.copia);
      setElegidos([]);
      notify("Copia creada y descargada");
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo crear la copia.");
    } finally {
      setCreando(false);
      await cargar();
    }
  };

  const descargar = async (copia: Copia) => {
    setOcupada(copia.id);
    try {
      await descargarArchivo(copia);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo descargar la copia.");
    } finally {
      setOcupada(null);
    }
  };

  const restaurar = async (copia: Copia) => {
    const ok = await confirmar({
      titulo: "Restaurar esta copia",
      mensaje: `Se recuperará ${copia.conjuntos.join(", ")} como estaba el ${formatoFecha(copia.fecha)}: `
        + "lo borrado vuelve y lo modificado regresa a ese momento; lo creado después se conserva. "
        + "Antes se guardará una copia del estado actual.",
      confirmar: "Restaurar",
      tipo: "peligro",
      
    });
    if (!ok) return;

    setOcupada(copia.id);
    try {
      const data = await apiFetch(`/copias-seguridad/${copia.id}/restaurar`, {
        method: "POST",
        body: JSON.stringify({ confirmacion: "RESTAURAR" }),
      });
      notify(data.message);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo restaurar la copia.");
    } finally {
      setOcupada(null);
      await cargar();
    }
  };

  const eliminar = async (copia: Copia) => {
    const ok = await confirmar({
      titulo: "Eliminar esta copia",
      mensaje: `La copia del ${formatoFecha(copia.fecha)} se borrará del servidor y no se podrá recuperar.`,
      confirmar: "Eliminar",
      tipo: "peligro",
    });
    if (!ok) return;

    setOcupada(copia.id);
    try {
      await apiFetch(`/copias-seguridad/${copia.id}`, { method: "DELETE" });
      notify("Copia eliminada");
      await cargar();
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo eliminar la copia.");
    } finally {
      setOcupada(null);
    }
  };

  if (cargando) return <CargandoPanel modulo={modulo} texto="Cargando copias de seguridad…" />;

  if (errorCarga) {
    return (
      <div className="cs-panel cs-vacio" role="alert">
        <p>{errorCarga}</p>
        <button title="Volver a intentar" type="button" className="cs-btn" onClick={() => { setCargando(true); void cargar(); }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="cs">
      <section className="cs-panel" aria-labelledby="cs-nueva">
        <header className="cs-cabecera">
          <div>
            <h2 id="cs-nueva">Nueva copia</h2>
            <p>Elige qué quieres respaldar. La copia se guarda en el servidor y se descarga en tu equipo.</p>
          </div>
          <button
            title={todoElegido ? "Quitar toda la selección" : "Elegir todos los datos"}
            type="button"
            className="cs-btn"
            onClick={() => setElegidos(todoElegido ? [] : todos.map((c) => c.clave))}
          >
            {todoElegido ? "Quitar todo" : "Seleccionar todo"}
          </button>
        </header>

        {grupos.map((grupo) => (
          <div className="cs-grupo" key={grupo.clave}>
            {grupos.length > 1 && (
              <div className="cs-grupo-titulo">
                <h3>{grupo.nombre}</h3>
                <button
                  title={`Elegir o quitar todo lo de ${grupo.nombre}`}
                  type="button"
                  className="cs-enlace"
                  onClick={() => alternarGrupo(grupo)}
                >
                  {grupo.conjuntos.every((c) => elegidos.includes(c.clave)) ? "Quitar grupo" : "Elegir grupo"}
                </button>
              </div>
            )}
            <div className="cs-conjuntos">
              {grupo.conjuntos.map((conjunto) => (
                <label
                  key={conjunto.clave}
                  title={conjunto.descripcion}
                  className={`cs-conjunto ${elegidos.includes(conjunto.clave) ? "activo" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={elegidos.includes(conjunto.clave)}
                    onChange={() => alternar(conjunto.clave)}
                  />
                  <span className="cs-conjunto-texto">
                    <strong>{conjunto.nombre}</strong>
                    <small>{conjunto.descripcion}</small>
                    <em>{conteo(conjunto.registros)} registros</em>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <footer className="cs-accion">
          <span aria-live="polite">
            {elegidos.length === 0
              ? "No has elegido nada todavía"
              : `${elegidos.length} ${elegidos.length === 1 ? "conjunto" : "conjuntos"} · ${conteo(registrosElegidos)} registros`}
          </span>
          <button
            title="Crear la copia y descargarla"
            type="button"
            className="cs-btn cs-btn-principal"
            disabled={elegidos.length === 0 || creando}
            onClick={() => void crear()}
          >
            {creando ? <Loader2 size={17} className="cs-girando" /> : <DatabaseBackup size={17} />}
            {creando ? "Creando copia…" : "Crear y descargar copia"}
          </button>
        </footer>

        <p className="cs-nota">
          <Info size={15} aria-hidden="true" />
          No incluye contraseñas ni archivos subidos (imágenes y comprobantes). Sí incluye datos
          personales: guarda el archivo en un lugar seguro y no lo compartas.
        </p>
      </section>

      <section className="cs-panel" aria-labelledby="cs-guardadas">
        <header className="cs-cabecera">
          <div>
            <h2 id="cs-guardadas">Copias guardadas</h2>
            <p>Puedes volver a descargarlas o recuperar sus datos.</p>
          </div>
        </header>

        {copias.length === 0 ? (
          <p className="cs-vacio">Aún no hay copias. Crea la primera arriba.</p>
        ) : (
          <div className="cs-tabla" role="table" aria-label="Copias guardadas">
            <div className="cs-fila cs-fila-titulos" role="row">
              <span role="columnheader">Fecha</span>
              <span role="columnheader">Contenido</span>
              <span role="columnheader">Creada por</span>
              <span role="columnheader">Tamaño</span>
              <span role="columnheader"><span className="cs-oculto">Acciones</span></span>
            </div>
            {copias.map((copia) => {
              const origen = ORIGENES[copia.origen];
              const bloqueada = ocupada === copia.id;
              return (
                <div className="cs-fila" role="row" key={copia.id}>
                  <span role="cell" className="cs-fecha">
                    {formatoFecha(copia.fecha)}
                    {origen && <small className="cs-origen">{origen}</small>}
                  </span>
                  <span role="cell" className="cs-contenido">
                    {copia.conjuntos.join(", ")}
                    <small>{conteo(copia.registros)} registros</small>
                  </span>
                  <span role="cell" className="cs-dato" data-etiqueta="Creada por">{copia.autor}</span>
                  <span role="cell" className="cs-dato" data-etiqueta="Tamaño">{formatoTamano(copia.tamano)}</span>
                  <span role="cell" className="cs-acciones">
                    {copia.disponible ? (
                      <>
                        <button title="Descargar esta copia" type="button" className="cs-btn" disabled={bloqueada} onClick={() => void descargar(copia)}>
                          {bloqueada ? <Loader2 size={15} className="cs-girando" /> : <Download size={15} />}
                          Descargar
                        </button>
                        <button title="Recuperar los datos de esta copia" type="button" className="cs-btn" disabled={bloqueada} onClick={() => void restaurar(copia)}>
                          <RotateCcw size={15} />
                          Restaurar
                        </button>
                      </>
                    ) : (
                      <small className="cs-perdida">El archivo ya no está en el servidor</small>
                    )}
                    <button
                      title="Eliminar esta copia"
                      aria-label="Eliminar esta copia"
                      type="button"
                      className="cs-btn cs-btn-peligro"
                      disabled={bloqueada}
                      onClick={() => void eliminar(copia)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
