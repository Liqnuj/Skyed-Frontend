import { useState } from "react";
import { Link } from "react-router-dom";
import TermsModal from "./TermsModal";
import "../../styles/shared/skyFooter.css";

type Enlace = { texto: string; a: string };

export type DatosFooter = {
  modulo: "social" | "deportivo";
  logo: string;
  descripcion: string;
  enlaces: Enlace[];
  /** Enlaces extra de la columna "Ayuda" (antes de Términos y Privacidad). */
  ayuda?: Enlace[];
  correo: string;
  telefono: string;
  ubicacion: string;
  redes: { nombre: string; icono: string; url: string }[];
};

const soloDigitos = (telefono: string) => telefono.replace(/\D/g, "");

/**
 * Pie de página público de Skyed Social y Skyed Deportivo: marca, enlaces
 * del módulo, contacto (con correo y teléfono que se pueden tocar) y ayuda.
 * Colores neutros con un único acento del módulo.
 * (Las columnas de enlaces son <div role="navigation"> y no <nav>: global.css
 * fija toda etiqueta <nav> arriba de la página.)
 */
export default function SkyFooter({ datos }: { datos: DatosFooter }) {
  const [termsOpen, setTermsOpen] = useState(false);
  const { modulo, logo, descripcion, enlaces, ayuda = [], correo, telefono, ubicacion, redes } = datos;

  const volverArriba = () => {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  };

  return (
    <footer className={`sf sf-${modulo}`} id="contacto">
      <div className="sf-inner">
        <div className="sf-grid">
          {/* Marca */}
          <div className="sf-marca">
            <Link to={`/${modulo}`} className="sf-logo" aria-label={`Inicio de Skyed ${modulo === "social" ? "Social" : "Deportivo"}`}>
              <img src={logo} alt="" />
              <span>
                SKYED <em>{modulo === "social" ? "Social" : "Deportivo"}</em>
              </span>
            </Link>
            <p className="sf-descripcion">{descripcion}</p>
            <div className="sf-redes">
              {redes.map((r) => (
                <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={r.nombre} title={r.nombre}>
                  <i className={`ti ${r.icono}`} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Enlaces del módulo */}
          <div className="sf-col" role="navigation" aria-label="Explorar">
            <h3>Explorar</h3>
            <ul>
              {enlaces.map((e) => (
                <li key={e.a}><Link to={e.a}>{e.texto}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div className="sf-col">
            <h3>Contacto</h3>
            <ul className="sf-contacto">
              <li>
                <a href={`mailto:${correo}`}>
                  <i className="ti ti-mail" aria-hidden="true" />
                  <span>{correo}</span>
                </a>
              </li>
              <li>
                <a href={`tel:+${soloDigitos(telefono)}`}>
                  <i className="ti ti-phone" aria-hidden="true" />
                  <span>{telefono}</span>
                </a>
              </li>
              <li>
                <span className="sf-dato">
                  <i className="ti ti-map-pin" aria-hidden="true" />
                  <span>{ubicacion}</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Ayuda */}
          <div className="sf-col" role="navigation" aria-label="Ayuda">
            <h3>Ayuda</h3>
            <ul>
              {ayuda.map((e) => (
                <li key={e.a}><Link to={e.a}>{e.texto}</Link></li>
              ))}
              <li><button type="button" onClick={() => setTermsOpen(true)}>Términos de uso</button></li>
              <li><button type="button" onClick={() => setTermsOpen(true)}>Privacidad</button></li>
              <li><Link to="/">Ir a SKYED principal</Link></li>
            </ul>
          </div>
        </div>

        <div className="sf-base">
          <p>© {new Date().getFullYear()} SKYED · Todos los derechos reservados</p>
          <button type="button" className="sf-arriba" onClick={volverArriba}>
            Volver arriba
            <i className="ti ti-arrow-up" aria-hidden="true" />
          </button>
        </div>
      </div>

      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} variant={modulo} />
    </footer>
  );
}
