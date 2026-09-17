import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import "./TermsModal.css";

type ModalVariant = "principal" | "deportivo" | "social";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Si se pasa, el modal exige llegar al final del texto para habilitar
   * el botón "He leído y acepto" (flujo de consentimiento, ej. registro).
   * Si se omite, el modal es de solo lectura (ej. un link del footer) y
   * el botón simplemente cierra el modal.
   */
  onAccept?: () => void;
  /**
   * Define tanto el contenido legal como los colores del modal — usa
   * la variable --accent que ya define cada Wrapper (Principal, Sport,
   * Social), así que el modal siempre queda acorde a la sección desde
   * donde se abrió sin tener que tocar esta hoja de estilos.
   */
  variant?: ModalVariant;
}

interface ModalSectionProps {
  number: string;
  title: string;
  children: ReactNode;
}

const BRAND_BY_VARIANT: Record<ModalVariant, string> = {
  principal: "SKYED · PLATAFORMA DE EVENTOS SOCIALES Y DEPORTIVOS",
  deportivo: "SKYED · PLATAFORMA DE EVENTOS DE CICLISMO DE RUTA",
  social: "SKYEDSOCIAL · EVENTOS Y CELEBRACIONES",
};

export default function TermsModal({
  isOpen,
  onClose,
  onAccept,
  variant = "principal",
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
    if (!onAccept || !currentRead) {
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

  const { TermsContent, PrivacyContent } = CONTENT_BY_VARIANT[variant];

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
        className={`skyed-modal skyed-modal--${variant}`}
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
            {BRAND_BY_VARIANT[variant]}
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

          {onAccept ? (
            <button
              type="button"
              className="btn-modal-accept"
              disabled={!currentRead}
              onClick={handleAccept}
            >
              ✓ &nbsp; He leído y acepto
            </button>
          ) : (
            <button
              type="button"
              className="btn-modal-accept"
              onClick={onClose}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   COMPONENTE DE SECCIÓN (compartido por los 3 variantes)
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

/* =====================================================
   VARIANTE: PRINCIPAL (registro, login, portada)
   Cubre la cuenta SKYED en general — no entra en las
   condiciones específicas de un evento deportivo o
   social, esas viven en sus propias variantes.
===================================================== */

function PrincipalTermsContent() {
  return (
    <div className="skyed-modal__content">
      <div className="modal-intro">
        <p>
          Al crear una cuenta en <strong>SKYED</strong> aceptas estos
          términos, que aplican a los dos universos de la plataforma:
          SKYED Deportivo (eventos de ciclismo) y SkyedSocial (eventos
          sociales). Cada universo tiene además sus propias condiciones
          específicas, visibles al inscribirte a un evento o reservar
          un ambiente.
        </p>
      </div>

      <ModalSection number="01" title="Registro y cuenta de usuario">
        <p>
          Para acceder a los servicios de SKYED debes proporcionar
          información veraz, completa y actualizada. Eres responsable
          de mantener la confidencialidad de tu contraseña y de todas
          las actividades que se realicen desde tu cuenta.
        </p>

        <ul>
          <li>Debes ser mayor de 10 años para crear una cuenta.</li>
          <li>Cada persona puede tener únicamente una cuenta activa.</li>
          <li>
            Notifica de inmediato cualquier acceso no autorizado a{" "}
            <strong>skyed@gmail.com</strong>.
          </li>
        </ul>
      </ModalSection>

      <ModalSection number="02" title="Un solo perfil, dos universos">
        <p>
          Al registrarte eliges un contexto inicial (deportivo o
          social), pero tu cuenta puede usarse en ambos módulos de
          SKYED. Las condiciones particulares de cada inscripción,
          reserva o cotización se muestran en el momento de
          realizarlas, y prevalecen sobre estos términos generales en
          caso de conflicto.
        </p>
      </ModalSection>

      <ModalSection number="03" title="Pagos y reembolsos">
        <p>
          SKYED utiliza pasarelas de pago seguras y certificadas. Los
          precios están expresados en pesos colombianos (COP) y la
          factura electrónica se genera automáticamente.
        </p>
        <p>
          Las condiciones de reembolso (plazos, penalidades por
          cancelación, etc.) dependen del tipo de servicio contratado
          y se detallan en las condiciones específicas de cada
          inscripción o reserva.
        </p>
      </ModalSection>

      <ModalSection number="04" title="Propiedad intelectual y contenido">
        <p>
          Todos los elementos de SKYED, incluyendo marca, diseño,
          código y contenidos, son propiedad de SKYED S.A.S.
        </p>
        <p>
          Al subir fotos, comentarios o contenido a la plataforma
          (por ejemplo en una PQR o inscripción), otorgas a SKYED una
          licencia no exclusiva para usarlo con fines promocionales.
        </p>
      </ModalSection>

      <ModalSection number="05" title="Modificaciones y legislación aplicable">
        <p>SKYED puede actualizar estos términos en cualquier momento.</p>
        <p>
          Estos términos se rigen por las leyes de la República de
          Colombia.
        </p>
      </ModalSection>
    </div>
  );
}

function PrincipalPrivacyContent() {
  return (
    <div className="skyed-modal__content">
      <div className="modal-intro">
        <p>
          En <strong>SKYED</strong> la protección de tus datos
          personales es una prioridad. Esta política aplica a tu
          cuenta y a ambos módulos de la plataforma.
        </p>
      </div>

      <ModalSection number="01" title="Responsable del tratamiento">
        <p>
          <strong>SKYED S.A.S.</strong> es la responsable del
          tratamiento de los datos personales recopilados a través de
          esta plataforma.
        </p>
      </ModalSection>

      <ModalSection number="02" title="Datos que recopilamos">
        <ul>
          <li>
            <strong>Identificación:</strong> nombre, apellido y
            documento.
          </li>
          <li>
            <strong>Contacto:</strong> correo, teléfono y WhatsApp.
          </li>
          <li>
            <strong>Datos de uso:</strong> inscripciones, reservas,
            PQR y actividad dentro de la plataforma.
          </li>
          <li>
            <strong>Datos de pago:</strong> procesados por pasarelas
            externas, SKYED no almacena números de tarjeta.
          </li>
        </ul>
      </ModalSection>

      <ModalSection number="03" title="Finalidad del tratamiento">
        <ul>
          <li>Gestionar tu cuenta y tus solicitudes.</li>
          <li>Procesar inscripciones, reservas y pagos.</li>
          <li>Responder tus PQR (peticiones, quejas y reclamos).</li>
          <li>Enviarte comunicaciones sobre tus eventos.</li>
          <li>Cumplir obligaciones legales.</li>
        </ul>
      </ModalSection>

      <ModalSection number="04" title="Compartición de datos">
        <p>SKYED no vende ni cede tus datos a terceros con fines comerciales.</p>
      </ModalSection>

      <ModalSection number="05" title="Tus derechos">
        <ul>
          <li>Acceder a tus datos.</li>
          <li>Actualizar o corregir información.</li>
          <li>Solicitar la supresión de datos.</li>
          <li>Revocar autorizaciones.</li>
          <li>Presentar quejas ante la SIC.</li>
        </ul>
      </ModalSection>

      <ModalSection number="06" title="Seguridad y retención de datos">
        <p>
          Implementamos medidas técnicas y organizativas para proteger
          tus datos.
        </p>
        <div className="modal-alert modal-alert--info">
          <span>ℹ️</span>
          <p>
            Puedes solicitar la eliminación de tu cuenta y datos en
            cualquier momento, desde tu perfil o escribiendo a
            soporte.
          </p>
        </div>
      </ModalSection>
    </div>
  );
}

/* =====================================================
   VARIANTE: DEPORTIVO (ciclismo de ruta)
===================================================== */

function DeportivoTermsContent() {
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

function DeportivoPrivacyContent() {
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
   VARIANTE: SOCIAL (eventos sociales — bodas, quince,
   cumpleaños, corporativos)
===================================================== */

function SocialTermsContent() {
  return (
    <div className="skyed-modal__content">
      <div className="modal-intro">
        <p>
          Al registrarte en <strong>SkyedSocial</strong> y solicitar la
          organización, cotización o reserva de un evento social a
          través de esta plataforma, aceptas plenamente los siguientes
          términos. Léelos con atención antes de continuar.
        </p>
      </div>

      <ModalSection number="01" title="Registro y cuenta de usuario">
        <p>
          Para acceder a los servicios de SkyedSocial debes
          proporcionar información veraz, completa y actualizada. Eres
          responsable de mantener la confidencialidad de tu contraseña
          y de todas las actividades que se realicen desde tu cuenta.
        </p>
        <ul>
          <li>Debes ser mayor de 10 años para crear una cuenta.</li>
          <li>Cada persona puede tener únicamente una cuenta activa.</li>
          <li>
            Notifica de inmediato cualquier acceso no autorizado a{" "}
            <strong>skyedsocial@gmail.com</strong>.
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="02"
        title="Reservas de ambientes y cotización de eventos"
      >
        <p>
          Una reserva de ambiente o la cotización de un evento social
          (boda, quinceañera, cumpleaños, evento corporativo, baby
          shower, etc.) queda sujeta a disponibilidad y confirmación
          por parte del equipo de SkyedSocial.
        </p>
        <ul>
          <li>
            La reserva queda confirmada únicamente tras el pago del
            depósito acordado con el equipo de SkyedSocial.
          </li>
          <li>
            Los cambios de fecha, número de invitados o servicios
            contratados deben solicitarse con al menos 15 días de
            anticipación al evento.
          </li>
          <li>
            SkyedSocial puede reprogramar un evento por causas de
            fuerza mayor (clima extremo, orden público, disposiciones
            de las autoridades locales).
          </li>
        </ul>
      </ModalSection>

      <ModalSection
        number="03"
        title="Responsabilidades del cliente"
      >
        <p>
          Al reservar un ambiente o contratar un servicio a través de
          SkyedSocial, aceptas que:
        </p>
        <ul>
          <li>
            Debes respetar el aforo (capacidad) informado para cada
            ambiente.
          </li>
          <li>
            Eres responsable de los daños ocasionados al lugar o al
            mobiliario por tus invitados durante el evento.
          </li>
          <li>
            Debes informar con anticipación cualquier requerimiento
            especial (accesibilidad, alergias alimentarias, montajes
            adicionales).
          </li>
        </ul>
        <div className="modal-alert">
          <span>⚠️</span>
          <p>
            Los eventos con menores de edad como anfitriones (por
            ejemplo, quinceañeras) requieren la autorización y
            presencia de un adulto responsable durante toda la
            actividad.
          </p>
        </div>
      </ModalSection>

      <ModalSection number="04" title="Pagos, facturas y reembolsos">
        <p>SkyedSocial utiliza pasarelas de pago seguras y certificadas.</p>
        <ul>
          <li>Los precios están expresados en pesos colombianos (COP).</li>
          <li>La factura electrónica se genera automáticamente.</li>
          <li>
            Las cancelaciones con más de 15 días de anticipación al
            evento tienen derecho a reembolso del depósito; las
            posteriores se evalúan caso por caso.
          </li>
        </ul>
      </ModalSection>

      <ModalSection number="05" title="PQR y atención al cliente">
        <p>
          Puedes radicar peticiones, quejas, reclamos o sugerencias
          desde la sección de PQR de SkyedSocial. Al hacerlo, también
          se te dará la opción de enviar tu solicitud por WhatsApp
          directamente al equipo encargado, para un seguimiento más
          ágil.
        </p>
      </ModalSection>

      <ModalSection number="06" title="Propiedad intelectual y contenido">
        <p>
          Todos los elementos de SkyedSocial, incluyendo marca, diseño,
          código y contenidos, son propiedad de SKYED S.A.S.
        </p>
        <p>
          Al subir fotos de tu evento o contenido a la plataforma,
          otorgas a SkyedSocial una licencia no exclusiva para usarlo
          con fines promocionales.
        </p>
      </ModalSection>

      <ModalSection
        number="07"
        title="Modificaciones y legislación aplicable"
      >
        <p>SkyedSocial puede actualizar estos términos en cualquier momento.</p>
        <p>
          Estos términos se rigen por las leyes de la República de
          Colombia.
        </p>
      </ModalSection>
    </div>
  );
}

function SocialPrivacyContent() {
  return (
    <div className="skyed-modal__content">
      <div className="modal-intro">
        <p>
          En <strong>SkyedSocial</strong> la protección de tus datos
          personales es una prioridad. Esta política describe cómo
          recopilamos, usamos, almacenamos y protegemos tu información.
        </p>
      </div>

      <ModalSection number="01" title="Responsable del tratamiento">
        <p>
          <strong>SKYED S.A.S.</strong> es la responsable del
          tratamiento de los datos personales recopilados a través de
          esta plataforma.
        </p>
      </ModalSection>

      <ModalSection number="02" title="Datos que recopilamos">
        <ul>
          <li>
            <strong>Identificación:</strong> nombre, apellido y
            documento.
          </li>
          <li>
            <strong>Contacto:</strong> correo, teléfono y WhatsApp.
          </li>
          <li>
            <strong>Datos del evento:</strong> tipo de celebración,
            fecha, número de invitados y presupuesto aproximado.
          </li>
          <li>
            <strong>Datos de pago:</strong> procesados por pasarelas
            externas.
          </li>
          <li>
            <strong>PQR:</strong> el contenido de tus peticiones,
            quejas, reclamos y sugerencias.
          </li>
        </ul>
      </ModalSection>

      <ModalSection number="03" title="Finalidad del tratamiento">
        <ul>
          <li>Gestionar tu cuenta y tus reservas.</li>
          <li>Cotizar y coordinar tu evento social.</li>
          <li>Procesar pagos y depósitos.</li>
          <li>Atender tus PQR, incluyendo el canal de WhatsApp.</li>
          <li>Enviarte comunicaciones sobre tu evento.</li>
          <li>Cumplir obligaciones legales.</li>
        </ul>
      </ModalSection>

      <ModalSection number="04" title="Compartición de datos">
        <p>
          SkyedSocial no vende ni cede tus datos a terceros con fines
          comerciales. Cuando envías una PQR por WhatsApp, esa
          conversación queda dentro del WhatsApp del equipo encargado,
          sujeta a las políticas propias de WhatsApp.
        </p>
      </ModalSection>

      <ModalSection number="05" title="Tus derechos">
        <ul>
          <li>Acceder a tus datos.</li>
          <li>Actualizar o corregir información.</li>
          <li>Solicitar la supresión de datos.</li>
          <li>Revocar autorizaciones.</li>
          <li>Presentar quejas ante la SIC.</li>
        </ul>
      </ModalSection>

      <ModalSection number="06" title="Seguridad y retención de datos">
        <p>
          Implementamos medidas técnicas y organizativas para proteger
          tus datos.
        </p>
        <div className="modal-alert modal-alert--info">
          <span>ℹ️</span>
          <p>
            Puedes solicitar la eliminación de tu cuenta y datos en
            cualquier momento.
          </p>
        </div>
      </ModalSection>
    </div>
  );
}

const CONTENT_BY_VARIANT: Record<
  ModalVariant,
  { TermsContent: () => ReactNode; PrivacyContent: () => ReactNode }
> = {
  principal: {
    TermsContent: PrincipalTermsContent,
    PrivacyContent: PrincipalPrivacyContent,
  },
  deportivo: {
    TermsContent: DeportivoTermsContent,
    PrivacyContent: DeportivoPrivacyContent,
  },
  social: {
    TermsContent: SocialTermsContent,
    PrivacyContent: SocialPrivacyContent,
  },
};
