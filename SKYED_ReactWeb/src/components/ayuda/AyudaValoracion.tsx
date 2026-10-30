import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ayudaService } from '../../services/ayudaService';
import type { MiValoracion } from '../../services/ayudaService';

type Fase = 'pregunta' | 'comentario' | 'enviando' | 'listo';

const MAX_COMENTARIO = 500;

/** "¿Te fue útil esta información?" al final de cada artículo. */
export default function AyudaValoracion({ slug, inicial }: { slug: string; inicial: MiValoracion | null }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const idTitulo = useId();
  const idComentario = useId();

  const [fase, setFase] = useState<Fase>(inicial ? 'listo' : 'pregunta');
  const [util, setUtil] = useState<boolean | null>(inicial ? inicial.util : null);
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');
  const [error, setError] = useState('');

  // Sin sesión no se puede votar: se invita a iniciar sesión.
  if (!user) {
    return (
      <div className="ay-valoracion" role="group" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>¿Te fue útil esta información?</h2>
        <p>Inicia sesión para dejarnos tu opinión y ayudarnos a mejorar esta guía.</p>
        <Link
          className="ay-btn ay-btn--suave"
          to={`/login?redirect=${encodeURIComponent(pathname)}`}
          title="Iniciar sesión para valorar esta guía"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const enviar = async (valor: boolean, texto?: string) => {
    setError('');
    setFase('enviando');
    try {
      await ayudaService.valorar(slug, valor, texto);
      setUtil(valor);
      setFase('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu respuesta.');
      setFase(valor ? 'pregunta' : 'comentario');
    }
  };

  const enviarComentario = (e: FormEvent) => {
    e.preventDefault();
    void enviar(false, comentario);
  };

  if (fase === 'listo') {
    return (
      <div className="ay-valoracion" role="group" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>¿Te fue útil esta información?</h2>
        <p className="ay-gracias" role="status">
          <i className={`ti ${util ? 'ti-mood-smile' : 'ti-heart-handshake'}`} aria-hidden="true" />
          {util ? '¡Gracias por tu opinión! Nos alegra haberte ayudado.' : 'Gracias, revisaremos este artículo para mejorarlo.'}
        </p>
        <button
          type="button"
          className="ay-btn ay-btn--suave"
          title="Cambiar mi respuesta sobre esta guía"
          onClick={() => setFase('pregunta')}
        >
          Cambiar mi respuesta
        </button>
      </div>
    );
  }

  if (fase === 'comentario' || (fase === 'enviando' && util === false)) {
    const enviando = fase === 'enviando';

    return (
      <form className="ay-valoracion" onSubmit={enviarComentario} aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>¿Qué podríamos mejorar?</h2>
        <label htmlFor={idComentario}>Cuéntanos qué faltó o qué no se entendió (opcional)</label>
        <textarea
          id={idComentario}
          value={comentario}
          maxLength={MAX_COMENTARIO}
          onChange={(e) => setComentario(e.target.value)}
          disabled={enviando}
        />
        <p className="ay-contador" aria-hidden="true">
          {comentario.length}/{MAX_COMENTARIO}
        </p>
        {error && (
          <p className="ay-error" role="alert">
            {error}
          </p>
        )}
        <div className="ay-voto">
          <button
            type="submit"
            className="ay-btn ay-btn--primario"
            title={enviando ? 'Enviando tu respuesta' : 'Enviar tu respuesta'}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
          <button
            type="button"
            className="ay-btn ay-btn--suave"
            title="Volver a la pregunta"
            disabled={enviando}
            onClick={() => setFase('pregunta')}
          >
            Volver
          </button>
        </div>
      </form>
    );
  }

  const ocupado = fase === 'enviando';

  return (
    <div className="ay-valoracion" role="group" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>¿Te fue útil esta información?</h2>
      {error && (
        <p className="ay-error" role="alert">
          {error}
        </p>
      )}
      <div className="ay-voto">
        <button
          type="button"
          className="ay-btn ay-btn--suave"
          title="Indicar que esta guía fue útil"
          aria-pressed={util === true}
          disabled={ocupado}
          onClick={() => void enviar(true)}
        >
          <i className="ti ti-thumb-up" aria-hidden="true" /> Sí
        </button>
        <button
          type="button"
          className="ay-btn ay-btn--suave"
          title="Indicar que esta guía no fue útil"
          aria-pressed={util === false}
          disabled={ocupado}
          onClick={() => {
            setUtil(false);
            setError('');
            setFase('comentario');
          }}
        >
          <i className="ti ti-thumb-down" aria-hidden="true" /> No
        </button>
      </div>
    </div>
  );
}