import "../../styles/shared/adminAcabados.css";

const LOGOS = {
  deportivo: "/assets/deportivo/logo_deportivo.png",
  social: "/assets/social/logo_social.png",
} as const;

/**
 * Pie de página de los paneles de administración. Va al final del área de
 * contenido (dentro de <main>), así nunca se monta sobre la información.
 * Sus estilos y los de las barras de scroll están en adminAcabados.css.
 */
export default function AdminFooter({ modulo }: { modulo: keyof typeof LOGOS }) {
  return (
    <footer className="admin-footer">
      <div className="admin-footer-marca">
        {/* Solo el logo: el nombre del módulo ya está en el encabezado */}
        <img src={LOGOS[modulo]} alt="" />
        <small>Panel administrativo</small>
      </div>

      <p className="admin-footer-meta">
        <span>Gestión interna</span>
        <i aria-hidden="true" />
        <span>© {new Date().getFullYear()} SKYED</span>
      </p>
    </footer>
  );
}
