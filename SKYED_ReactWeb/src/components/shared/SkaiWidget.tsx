import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { preguntarSkai, type SkaiContext, type SkaiTurn } from '../../services/skai';
import '../../styles/shared/skai.css';

interface ChatMessage {
  id: number;
  from: 'user' | 'bot';
  text: string;
  /** Aviso de error de la interfaz, no una respuesta real de la IA. */
  isError?: boolean;
}

/** Muestra **negritas** como <strong> (sin HTML: el texto viene de la IA). */
function conNegritas(text: string, clave: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
    i % 2 === 1 ? <strong key={`${clave}-${i}`}>{parte}</strong> : parte,
  );
}

/**
 * Texto de SKAI con sus botones: [[Texto|/ruta]] se vuelve un botón que lleva
 * a esa página. El backend ya dejó solo rutas que existen y a las que la
 * persona puede entrar; aquí además se exige que sea una ruta interna ("/...").
 */
function renderTexto(text: string, irA: (ruta: string) => void) {
  return text.split(/(\[\[[^[\]|]+\|\/[^[\]\s]*\]\])/g).map((parte, i) => {
    const boton = parte.match(/^\[\[([^[\]|]+)\|(\/[^[\]\s]*)\]\]$/);
    if (boton) {
      return (
        <button title={boton[1].trim()} key={i} type="button" className="skyed-link-btn" onClick={() => irA(boton[2])}>
          {boton[1].trim()}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      );
    }
    return <Fragment key={i}>{conNegritas(parte, String(i))}</Fragment>;
  });
}

const MENSAJE_BIENVENIDA =
  '¡Hola! Soy SKAI. Te explico paso a paso cómo inscribirte, reservar o usar tu panel, y te llevo directo a donde lo necesites. ¿En qué te ayudo?';

/**
 * Asistente virtual SKAI, migrado del prototipo original en
 * HTML/CSS/JS plano (carpeta skai/) a un componente de React
 * conectado al backend de Laravel (POST /api/asistente).
 *
 * Se monta UNA sola vez en main.tsx (fuera de <Routes>), no dentro de
 * cada Wrapper de módulo como el widget de accesibilidad: así la
 * conversación no se reinicia al navegar entre páginas, y el widget
 * aparece igual en TODO el sitio (Principal, Social y Deportivo),
 * incluidas páginas como /login o /registro que no usan nav/footer
 * de ningún módulo. El contexto (general/social/deportivo) que el
 * prototipo elegía con pestañas ahora se detecta solo, según la
 * sección del sitio en la que estés.
 */
/** Clave donde se recuerda si el usuario ocultó el botón de SKAI. */
const CLAVE_OCULTO = 'skai_oculto';

/** Duración del "despertar" de SKAI la primera vez que se abre (ms).
 *  Con "menos movimiento" se muestra igual, pero solo con fundidos (ver skai.css). */
const DURACION_DESPERTAR = 1300;

function leerOculto() {
  try {
    return localStorage.getItem(CLAVE_OCULTO) === '1';
  } catch {
    return false;
  }
}

export default function SkaiWidget() {
  const location = useLocation();
  const navigate = useNavigate();

  const context: SkaiContext = location.pathname.startsWith('/social')
    ? 'social'
    : location.pathname.startsWith('/deportivo')
      ? 'deportivo'
      : 'general';

  const [open, setOpen] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, from: 'bot', text: MENSAJE_BIENVENIDA },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Oculto = solo queda una pestaña pequeña en el borde para volver a mostrarlo.
  const [oculto, setOculto] = useState(leerOculto);
  // Animación de "despertar": solo la primera vez que se abre en la página.
  // Es una presentación visual; no espera ninguna respuesta del servidor.
  const [despertando, setDespertando] = useState(false);
  const yaDesperto = useRef(false);
  const timerDespertar = useRef<number | undefined>(undefined);

  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Burbuja proactiva a los 8s, igual que el prototipo original.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen((currentOpen) => {
        if (!currentOpen) {
          setTeaserVisible(true);
          setBadgeVisible(true);
        }
        return currentOpen;
      });
    }, 8000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => window.clearTimeout(timerDespertar.current), []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  function openPanel() {
    setOpen(true);
    setTeaserVisible(false);
    setBadgeVisible(false);

    if (!yaDesperto.current) {
      yaDesperto.current = true;
      setDespertando(true);
      timerDespertar.current = window.setTimeout(() => {
        setDespertando(false);
        inputRef.current?.focus();
      }, DURACION_DESPERTAR);
      return;
    }
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closePanel() {
    setOpen(false);
  }

  /** Botón de una respuesta de SKAI: lleva a la página. En celular cierra el
   *  chat para que se vea la página; en computador queda abierto. */
  function irA(ruta: string) {
    navigate(ruta);
    if (window.innerWidth <= 480) closePanel();
  }

  function cambiarOculto(valor: boolean) {
    setOculto(valor);
    if (valor) {
      setOpen(false);
      setTeaserVisible(false);
    }
    try {
      localStorage.setItem(CLAVE_OCULTO, valor ? '1' : '0');
    } catch {
      // Sin almacenamiento (modo privado): solo dura mientras la página esté abierta.
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { id: nextId.current++, from: 'user', text: trimmed };
    // El mensaje de bienvenida (id 0) es solo un saludo fijo de la
    // interfaz, no una respuesta real de la IA, así que no se manda
    // como parte del historial de la conversación. Tampoco los avisos de
    // error: si se mandaran, la IA "creería" que ella misma dijo "No pude
    // conectar..." y lo repetiría o se confundiría en la siguiente respuesta.
    const historyParaEnviar: SkaiTurn[] = [
      ...messages
        .filter((m) => m.id !== 0 && !m.isError)
        .map((m): SkaiTurn => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: trimmed },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await preguntarSkai(trimmed, context, historyParaEnviar, location.pathname + location.search);
      setMessages((prev) => [...prev, { id: nextId.current++, from: 'bot', text: reply }]);
    } catch (err) {
      // preguntarSkai ya convierte cada fallo en un mensaje entendible
      // para el usuario (y añade el detalle técnico solo en desarrollo).
      const motivo =
        err instanceof Error ? err.message : 'SKAI no pudo responder en este momento. Intenta de nuevo.';
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, from: 'bot', text: motivo, isError: true },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div id="skyed-assistant-root" data-skai-theme={context} className={oculto ? 'is-hidden' : ''}>
      {/* Pestaña para volver a mostrar SKAI cuando está oculto */}
      <button
        type="button"
        className="skyed-restore"
        title="Mostrar a SKAI"
        aria-label="Mostrar el asistente SKAI"
        onClick={() => cambiarOculto(false)}
      >
        <SkaiLogo />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div
        className={`skyed-teaser ${teaserVisible && !oculto ? 'is-visible' : ''}`}
        onClick={openPanel}
        role="button"
        title="Abrir el asistente SKAI"
        tabIndex={0}
      >
        ¿Necesitas ayuda para elegir tu evento?
      </div>

      <div className="skyed-dock">
        <button
          className="skyed-fab"
          title={open ? 'Cerrar SKAI' : 'SKAI - Asistente virtual de SKYED'}
          aria-label={open ? 'Cerrar asistente Skyed' : 'Abrir asistente Skyed'}
          onClick={() => (open ? closePanel() : openPanel())}
        >
          <span className={`skyed-fab-badge ${badgeVisible ? 'is-visible' : ''}`} />
          <SkaiLogo />
        </button>
        {/* Aparece al pasar el mouse por SKAI: lo esconde para que no tape el contenido */}
        <button
          type="button"
          className="skyed-hide"
          title="Ocultar a SKAI"
          aria-label="Ocultar el asistente SKAI"
          onClick={() => cambiarOculto(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div
        className={`skyed-panel ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Asistente virtual Skyed"
        aria-hidden={!open}
      >
        <div className="skyed-panel-header">
          <div className="skyed-panel-avatar">
            <SkaiLogo />
          </div>
          <div className="skyed-panel-title">
            <strong>SKAI</strong>
            <div className="skyed-panel-status">
              <span />
              En línea
            </div>
          </div>
          <button className="skyed-panel-close" aria-label="Cerrar asistente" title="Cerrar el asistente SKAI" onClick={closePanel}>
            <svg viewBox="0 0 24 24">
              <path d="M18.3 5.71L12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.3 19.71 2.88 18.3 9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        {despertando && (
          <div className="skyed-boot" role="status" aria-live="polite">
            <div className="skyed-boot-orb">
              <span className="skyed-boot-ring" />
              <span className="skyed-boot-ring" />
              <SkaiLogo />
            </div>
            <p>
              Activando a SKAI
              <span className="skyed-boot-dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
            <span className="skyed-boot-bar" aria-hidden="true" />
          </div>
        )}

        {/* La key cambia al terminar el despertar para que el saludo entre animado */}
        <div className="skyed-messages" ref={messagesRef} key={despertando ? 'despertando' : 'chat'}>
          {messages.map((m) => (
            <div key={m.id} className={`skyed-msg from-${m.from}`}>
              {m.from === 'bot' ? renderTexto(m.text, irA) : m.text}
            </div>
          ))}
          {/* Solo mientras se espera la respuesta real del backend */}
          {isTyping && (
            <div className="skyed-msg from-bot is-typing" role="status" aria-label="SKAI está pensando">
              <span />
              <span />
              <span />
              <small>SKAI está pensando</small>
            </div>
          )}
        </div>

        <div className="skyed-chips">
          <button className="skyed-chip" title="Enviar el mensaje «Quiero hablar con soporte»" onClick={() => sendMessage('Quiero hablar con soporte')}>
            Hablar con soporte
          </button>
        </div>

        <div className="skyed-input-bar">
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe tu mensaje"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage(input);
            }}
          />
          <button
            className="skyed-send-btn"
            aria-label="Enviar mensaje"
            title="Enviar mensaje"
            disabled={isTyping}
            onClick={() => sendMessage(input)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Logo "nube sonriente" de SKAI, igual al del prototipo original. */
export function SkaiLogo() {
  return (
    <div className="skyed-logo">
      <div className="skyed-logo-shape">
        <span className="skyed-logo-puff-l" />
        <span className="skyed-logo-puff-r" />
        <span className="skyed-logo-body" />
      </div>
      <span className="skyed-logo-eyes">
        <span></span>
        <span></span>
      </span>
      <span className="skyed-logo-mouth" />
      <span className="skyed-logo-sparkle" />
    </div>
  );
}
