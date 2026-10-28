import type { CSSProperties } from "react";
import { useAccessibility } from "../../context/AccessibilityContext";
import "../../styles/shared/transicionSesion.css";

export type Modulo = "principal" | "social" | "deportivo";

export type EstadoTransicion = {
  tipo: "login" | "logout";
  /** cargando = esperando al servidor · listo = terminó bien · saliendo = desvaneciéndose */
  fase: "cargando" | "listo" | "saliendo";
  modulo: Modulo;
  /** Primer nombre de la persona (al iniciar sesión se conoce cuando responde el servidor). */
  nombre?: string;
  /** Nombre completo, para las iniciales del avatar. */
  nombreCompleto?: string;
  foto?: string | null;
};

const LOGOS: Record<Modulo, string> = {
  principal: "/assets/principal/logoP.png",
  social: "/assets/social/logo_social.png",
  deportivo: "/assets/deportivo/logo_deportivo.png",
};

/** Módulo según la página actual (o hacia dónde va el login con ?redirect=). */
export function moduloActual(): Modulo {
  const destino = new URLSearchParams(window.location.search).get("redirect") ?? "";
  const ruta = `${window.location.pathname} ${destino}`;
  if (/(^|\s)\/social/.test(ruta)) return "social";
  if (/(^|\s)\/deportivo/.test(ruta)) return "deportivo";
  return "principal";
}

const iniciales = (nombre?: string) =>
  (nombre ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** Cada letra en su propio span para que el saludo aparezca letra por letra.
 *  Desde `resaltarDesde` (el nombre) las letras llevan el color del módulo. */
function TextoLetraPorLetra({ texto, resaltarDesde = Infinity }: { texto: string; resaltarDesde?: number }) {
  return (
    <span className="ts-letras" aria-label={texto}>
      {Array.from(texto).map((letra, i) => (
        <span key={i} aria-hidden="true" className={i >= resaltarDesde ? "is-nombre" : undefined} style={{ "--i": i } as CSSProperties}>
          {letra === " " ? " " : letra}
        </span>
      ))}
    </span>
  );
}

/**
 * Pantalla completa al iniciar o cerrar sesión, con el estilo de la página
 * de login: fondo claro en degradado, el avatar de la persona con ondas
 * suaves y el saludo con su nombre letra por letra. Colores según el módulo
 * y modo claro u oscuro según el widget de accesibilidad.
 * La controla AuthContext y dura lo que tarda la petición real al servidor.
 */
export default function TransicionSesion({ estado }: { estado: EstadoTransicion }) {
  const { tipo, fase, modulo, nombre, nombreCompleto, foto } = estado;
  // Mismo modo (claro u oscuro) que eligió la persona en el widget de accesibilidad.
  const { darkMode } = useAccessibility();
  const listo = fase !== "cargando";
  const conocida = !!nombre; // al iniciar sesión, el nombre llega con la respuesta

  const saludo =
    tipo === "login"
      ? conocida ? `Hola, ${nombre}` : "Bienvenido"
      : conocida ? `Hasta pronto, ${nombre}` : "Hasta pronto";

  const detalle =
    tipo === "login"
      ? listo ? "Todo listo. ¡Que disfrutes tu visita!" : "Verificando tus datos"
      : listo ? "Tu sesión se cerró de forma segura" : "Cerrando tu sesión";

  return (
    <div className={`ts-overlay ts-${modulo} is-${fase}${darkMode ? " is-oscuro" : ""}`} role="status" aria-live="polite" aria-busy={!listo}>
      <span className="ts-luz ts-luz-1" aria-hidden="true" />
      <span className="ts-luz ts-luz-2" aria-hidden="true" />
      <span className="ts-luz ts-luz-3" aria-hidden="true" />

      <div className="ts-centro">
        <div className="ts-avatar-zona" aria-hidden="true">
          <span className="ts-onda" />
          <span className="ts-onda" />
          <span className="ts-onda" />
          {/* key: al conocerse la persona, el avatar cambia con una transición */}
          <span className={`ts-avatar ${conocida ? "is-persona" : ""}`} key={conocida ? "persona" : "logo"}>
            {conocida && foto ? (
              <img src={foto} alt="" />
            ) : conocida ? (
              <b>{iniciales(nombreCompleto ?? nombre)}</b>
            ) : (
              <img src={LOGOS[modulo]} alt="" className="ts-avatar-logo" />
            )}
          </span>
        </div>

        <h2 className="ts-saludo" key={saludo}>
          <TextoLetraPorLetra texto={saludo} resaltarDesde={conocida ? saludo.length - (nombre ?? "").length : Infinity} />
        </h2>

        <p className="ts-detalle" key={detalle}>
          {detalle}
          {!listo && (
            <span className="ts-puntos" aria-hidden="true"><i /><i /><i /></span>
          )}
        </p>
      </div>

      <div className="ts-marca" aria-hidden="true">
        <img src={LOGOS[modulo]} alt="" />
        <span>SKYED{modulo !== "principal" && <em>{modulo === "social" ? " Social" : " Deportivo"}</em>}</span>
      </div>
    </div>
  );
}
