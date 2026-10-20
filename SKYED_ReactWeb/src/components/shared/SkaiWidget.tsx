import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { preguntarSkai, type SkaiContext, type SkaiTurn } from '../../services/skai';
import '../../styles/shared/skai.css';

interface ChatMessage {
  id: number;
  from: 'user' | 'bot';
  text: string;
}

const MENSAJE_BIENVENIDA =
  '¡Hola! Soy SKAI, el asistente virtual de Skyed. Cuéntame qué buscas y te oriento.';

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
export default function SkaiWidget() {
  const location = useLocation();

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

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  function openPanel() {
    setOpen(true);
    setTeaserVisible(false);
    setBadgeVisible(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closePanel() {
    setOpen(false);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { id: nextId.current++, from: 'user', text: trimmed };
    // El mensaje de bienvenida (id 0) es solo un saludo fijo de la
    // interfaz, no una respuesta real de la IA, así que no se manda
    // como parte del historial de la conversación.
    const historyParaEnviar: SkaiTurn[] = [
      ...messages
        .filter((m) => m.id !== 0)
        .map((m): SkaiTurn => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: trimmed },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await preguntarSkai(trimmed, context, historyParaEnviar);
      setMessages((prev) => [...prev, { id: nextId.current++, from: 'bot', text: reply }]);
    } catch (err) {
      // Mostramos el motivo real del error (viene de preguntarSkai) en
      // vez de un texto genérico, para poder diagnosticar rápido si
      // falta configurar la key de Gemini, si el modelo no existe, etc.
      // Cuando esto ya esté estable en producción, esto se puede volver
      // a cambiar por un mensaje genérico si se prefiere.
      const motivo = err instanceof Error ? err.message : 'No pude conectar con el asistente.';
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          from: 'bot',
          text: `No pude conectar con el asistente. (${motivo})`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div id="skyed-assistant-root" data-skai-theme={context}>
      <div
        className={`skyed-teaser ${teaserVisible ? 'is-visible' : ''}`}
        onClick={openPanel}
        role="button"
        tabIndex={0}
      >
        ¿Necesitas ayuda para elegir tu evento?
      </div>

      <button
        className="skyed-fab"
        aria-label={open ? 'Cerrar asistente Skyed' : 'Abrir asistente Skyed'}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <span className={`skyed-fab-badge ${badgeVisible ? 'is-visible' : ''}`} />
        <SkaiLogo />
      </button>

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
          <button className="skyed-panel-close" aria-label="Cerrar asistente" onClick={closePanel}>
            <svg viewBox="0 0 24 24">
              <path d="M18.3 5.71L12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.3 19.71 2.88 18.3 9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        <div className="skyed-messages" ref={messagesRef}>
          {messages.map((m) => (
            <div key={m.id} className={`skyed-msg from-${m.from}`}>
              {m.text}
            </div>
          ))}
          {isTyping && (
            <div className="skyed-msg from-bot is-typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div className="skyed-chips">
          <button className="skyed-chip" onClick={() => sendMessage('Quiero hablar con soporte')}>
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
function SkaiLogo() {
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
