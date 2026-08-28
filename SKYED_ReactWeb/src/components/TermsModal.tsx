import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import "./TermsModal.css";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

interface ModalSectionProps {
  number: string;
  title: string;
  children: ReactNode;
}

export default function TermsModal({
  isOpen,
  onClose,
  onAccept,
}: TermsModalProps) {
  const [activeTab, setActiveTab] =
    useState<"terminos" | "privacidad">("terminos");

  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);

  const [progress, setProgress] = useState(0);

  // IMPORTANTE:
  // HTMLDivElement permite utilizar scrollTop,
  // scrollHeight y clientHeight.
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const currentRead =
    activeTab === "terminos"
      ? readTerms
      : readPrivacy;

  /*
   * Bloquear scroll de la página cuando el modal está abierto
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /*
   * Reiniciar scroll cuando cambia la pestaña
   */
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }

    setProgress(0);
  }, [activeTab, isOpen]);

  /*
   * Cerrar con tecla Escape
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

  /*
   * Calcular progreso de lectura
   */
  const handleScroll = () => {
    const element = bodyRef.current;

    if (!element) {
      return;
    }

    const {
      scrollTop,
      scrollHeight,
      clientHeight,
    } = element;

    const maxScroll =
      scrollHeight - clientHeight;

    const percentage =
      maxScroll <= 0
        ? 100
        : Math.round(
            (scrollTop / maxScroll) * 100
          );

    setProgress(percentage);

    /*
     * Cuando llega al 95% consideramos
     * que terminó de leer la pestaña.
     */
    if (percentage >= 95) {
      if (activeTab === "terminos") {
        setReadTerms(true);
      }

      if (activeTab === "privacidad") {
        setReadPrivacy(true);
      }
    }
  };

  /*
   * Cambiar de pestaña
   */
  const handleChangeTab = (
    tab: "terminos" | "privacidad"
  ) => {
    setActiveTab(tab);
  };

  /*
   * Aceptar términos
   */
  const handleAccept = () => {
    if (!currentRead) {
      return;
    }

    onAccept();
    onClose();
  };

  /*
   * Si el modal está cerrado,
   * no renderizamos nada.
   */
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="skyed-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="skyed-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* =========================
            HEADER
        ========================= */}

        <div className="skyed-modal__header">
          <button
            type="button"
            className="skyed-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>

          <div className="skyed-modal__logo">
            ◇
          </div>

          <div className="skyed-modal__brand">
            SKYED · PLATAFORMA DE EVENTOS DE
            CICLISMO DE RUTA
          </div>

          <h2 id="modal-title">
            {activeTab === "terminos"
              ? "Términos y Condiciones"
              : "Política de Privacidad"}
          </h2>

          <p>
            Última actualización: enero 2026
          </p>
        </div>

        {/* =========================
            TABS
        ========================= */}

        <div
          className="skyed-modal__tabs"
          role="tablist"
        >
          <button
            type="button"
            className={`skyed-tab ${
              activeTab === "terminos"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleChangeTab("terminos")
            }
            role="tab"
            aria-selected={
              activeTab === "terminos"
            }
          >
            📋 Términos y Condiciones
          </button>

          <button
            type="button"
            className={`skyed-tab ${
              activeTab === "privacidad"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleChangeTab("privacidad")
            }
            role="tab"
            aria-selected={
              activeTab === "privacidad"
            }
          >
            🛡️ Política de Privacidad
          </button>
        </div>

        {/* =========================
            BODY
        ========================= */}

        <div
          className="skyed-modal__body"
          ref={bodyRef}
          onScroll={handleScroll}
        >
          {activeTab === "terminos" && (
            <TermsContent />
          )}

          {activeTab === "privacidad" && (
            <PrivacyContent />
          )}
        </div>

        {/* =========================
            FOOTER
        ========================= */}

        <div className="skyed-modal__footer">
          <div className="skyed-modal__progress">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <span
              className={
                progress >= 95
                  ? "progress-label completed"
                  : "progress-label"
              }
            >
              {progress >= 95
                ? "¡Has llegado al final!"
                : `${progress}% leído`}
            </span>
          </div>

          <button
            type="button"
            className="btn-modal-accept"
            disabled={!currentRead}
            onClick={handleAccept}
          >
            ✓ &nbsp; He leído y acepto
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   TÉRMINOS Y CONDICIONES
===================================================== */

function TermsContent() {
  return (
    <div className="skyed-modal__content">

      <div className="modal-intro">
        <p>
          Al registrarte en{" "}
          <strong>SKYED</strong> y participar
          en los eventos deportivos de ciclismo
          de ruta organizados o gestionados a
          través de esta plataforma, aceptas
          plenamente los siguientes términos.
          Léelos con atención antes de continuar.
        </p>
      </div>

      <ModalSection
        number="01"
        title="Registro y cuenta de usuario"
      >
        <p>
          Para acceder a los servicios de SKYED
          debes proporcionar información veraz,
          completa y actualizada. Eres responsable
          de mantener la confidencialidad de tu
          contraseña y de todas las actividades
          que se realicen desde tu cuenta.
        </p>

        <ul>
          <li>
            Debes ser mayor de 10 años para crear
            una cuenta.
          </li>

          <li>
            Cada persona puede tener únicamente
            una cuenta activa.
          </li>

          <li>
            Notifica de inmediato cualquier
            acceso no autorizado a{" "}
            <strong>
              skyed@gmail.com
            </strong>.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="02"
        title="Inscripción a eventos de ciclismo de ruta"
      >
        <p>
          La inscripción a un evento a través de
          SKYED implica la aceptación de las
          condiciones específicas de cada prueba,
          incluyendo el reglamento técnico, los
          requisitos médicos y las normas de la{" "}
          <strong>
            Federación Colombiana de Ciclismo
            (FCC)
          </strong>.
        </p>

        <ul>
          <li>
            La inscripción queda confirmada
            únicamente tras el pago completo de
            la tarifa de participación.
          </li>

          <li>
            Las cancelaciones realizadas con
            menos de 72 horas antes del evento no
            son reembolsables.
          </li>

          <li>
            El organizador puede cancelar o
            reprogramar un evento por razones de
            fuerza mayor, orden público o
            condiciones climáticas extremas.
          </li>

          <li>
            SKYED actúa como intermediario
            tecnológico; la responsabilidad
            operativa del evento recae en el
            organizador registrado.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="03"
        title="Condiciones físicas y responsabilidad deportiva"
      >
        <p>
          El ciclismo de ruta es una actividad
          deportiva que implica riesgos
          inherentes. Al inscribirte en cualquier
          evento a través de SKYED, declaras y
          garantizas que:
        </p>

        <ul>
          <li>
            Tienes las condiciones físicas
            adecuadas para participar.
          </li>

          <li>
            Cuentas con revisión médica reciente.
          </li>

          <li>
            Usarás el equipo de protección
            obligatorio.
          </li>

          <li>
            Respetarás el reglamento de tránsito
            y las señalizaciones del evento.
          </li>

          <li>
            Liberas a SKYED de responsabilidad
            por lesiones, accidentes o daños
            derivados de tu participación.
          </li>
        </ul>

        <div className="modal-alert">
          <span>⚠️</span>

          <p>
            Los menores de 18 años deben
            presentar autorización escrita
            firmada por su padre, madre o tutor
            legal el día del evento.
          </p>
        </div>
      </ModalSection>

      <ModalSection
        number="04"
        title="Pagos, facturas y reembolsos"
      >
        <p>
          SKYED utiliza pasarelas de pago seguras
          y certificadas.
        </p>

        <ul>
          <li>
            Los precios están expresados en pesos
            colombianos (COP).
          </li>

          <li>
            La factura electrónica se genera
            automáticamente.
          </li>

          <li>
            Los reembolsos por cancelación del
            evento se procesarán en un plazo
            máximo de 15 días hábiles.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="05"
        title="Propiedad intelectual y contenido"
      >
        <p>
          Todos los elementos de SKYED, incluyendo
          marca, diseño, código y contenidos, son
          propiedad de SKYED S.A.S.
        </p>

        <p>
          Al subir fotos, resultados o contenido
          a la plataforma, otorgas a SKYED una
          licencia no exclusiva para usarlo con
          fines promocionales.
        </p>
      </ModalSection>

      <ModalSection
        number="06"
        title="Modificaciones y legislación aplicable"
      >
        <p>
          SKYED puede actualizar estos términos
          en cualquier momento.
        </p>

        <p>
          Estos términos se rigen por las leyes
          de la República de Colombia.
        </p>
      </ModalSection>

    </div>
  );
}

/* =====================================================
   POLÍTICA DE PRIVACIDAD
===================================================== */

function PrivacyContent() {
  return (
    <div className="skyed-modal__content">

      <div className="modal-intro">
        <p>
          En <strong>SKYED</strong> la protección
          de tus datos personales es una prioridad.
          Esta política describe cómo recopilamos,
          usamos, almacenamos y protegemos tu
          información.
        </p>
      </div>

      <ModalSection
        number="01"
        title="Responsable del tratamiento"
      >
        <p>
          <strong>SKYED S.A.S.</strong> es la
          responsable del tratamiento de los datos
          personales recopilados a través de esta
          plataforma.
        </p>
      </ModalSection>

      <ModalSection
        number="02"
        title="Datos que recopilamos"
      >
        <ul>
          <li>
            <strong>Identificación:</strong> nombre,
            apellido y documento.
          </li>

          <li>
            <strong>Contacto:</strong> correo y
            teléfono.
          </li>

          <li>
            <strong>Datos sensibles:</strong> fecha
            de nacimiento y grupo sanguíneo.
          </li>

          <li>
            <strong>Datos de pago:</strong>
            procesados por pasarelas externas.
          </li>

          <li>
            <strong>Datos de uso:</strong> actividad,
            inscripciones y resultados.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="03"
        title="Finalidad del tratamiento"
      >
        <ul>
          <li>
            Gestionar tu cuenta.
          </li>

          <li>
            Procesar inscripciones y pagos.
          </li>

          <li>
            Garantizar tu seguridad durante los
            eventos.
          </li>

          <li>
            Publicar resultados deportivos.
          </li>

          <li>
            Enviarte comunicaciones sobre eventos.
          </li>

          <li>
            Cumplir obligaciones legales.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="04"
        title="Compartición de datos"
      >
        <p>
          SKYED no vende ni cede tus datos a
          terceros con fines comerciales.
        </p>
      </ModalSection>

      <ModalSection
        number="05"
        title="Tus derechos"
      >
        <ul>
          <li>
            Acceder a tus datos.
          </li>

          <li>
            Actualizar o corregir información.
          </li>

          <li>
            Solicitar la supresión de datos.
          </li>

          <li>
            Revocar autorizaciones.
          </li>

          <li>
            Presentar quejas ante la SIC.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="06"
        title="Seguridad y retención de datos"
      >
        <p>
          Implementamos medidas técnicas y
          organizativas para proteger tus datos.
        </p>

        <div className="modal-alert modal-alert--info">
          <span>ℹ️</span>

          <p>
            Puedes solicitar la eliminación de tu
            cuenta y datos en cualquier momento.
          </p>
        </div>
      </ModalSection>

    </div>
  );
}

/* =====================================================
   COMPONENTE DE SECCIÓN
===================================================== */

function ModalSection({
  number,
  title,
  children,
}: ModalSectionProps) {
  return (
    <section className="modal-section">

      <div className="modal-section__num">
        {number}
      </div>

      <div className="modal-section__content">

        <h3>{title}</h3>

        {children}

      </div>

    </section>
  );
}