import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import '../../styles/shared/captcha.css';

/**
 * Verificación "No soy un robot": muestra una imagen con caracteres
 * deformados que la persona debe escribir. La imagen la genera el backend
 * (GET /captcha) y allí se comprueba la respuesta al crear la cuenta.
 *
 * Cada imagen sirve una sola vez: si el registro falla, el formulario vuelve
 * a montar este componente con una `key` distinta para traer otra.
 */

export interface RespuestaCaptcha {
  id: string;
  respuesta: string;
}

export default function Captcha({ onCambio }: { onCambio: (valor: RespuestaCaptcha | null) => void }) {
  const [imagen, setImagen] = useState<{ id: string; src: string } | null>(null);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    setTexto('');
    onCambio(null);
    try {
      const data = await apiFetch('/captcha');
      setImagen({ id: data.id, src: data.imagen });
    } catch {
      setImagen(null);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [onCambio]);

  useEffect(() => { void cargar(); }, [cargar]);

  const escribir = (valor: string) => {
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    setTexto(limpio);
    onCambio(imagen && limpio ? { id: imagen.id, respuesta: limpio } : null);
  };

  return (
    <fieldset className="captcha">
      <legend>
        <i className="ti ti-shield-check" aria-hidden="true" /> No soy un robot <span className="req">*</span>
      </legend>
      <p className="captcha-ayuda" id="captcha-ayuda">Escribe los 5 caracteres que ves en la imagen.</p>

      <div className="captcha-fila">
        <div className="captcha-imagen" aria-busy={cargando}>
          {imagen && !cargando ? (
            <img src={imagen.src} alt="Imagen de verificación con caracteres deformados" width={220} height={70} draggable={false} />
          ) : (
            <span className="captcha-estado">{error ? 'No se pudo cargar la imagen' : 'Cargando…'}</span>
          )}
        </div>
        <button
          type="button"
          className="captcha-otra"
          onClick={() => void cargar()}
          disabled={cargando}
          title="Mostrar otra imagen"
          aria-label="Mostrar otra imagen"
        >
          <i className={`ti ti-refresh ${cargando ? 'captcha-girando' : ''}`} aria-hidden="true" />
          <span>Otra imagen</span>
        </button>
      </div>

      <input
        type="text"
        className="captcha-campo"
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        placeholder="Escribe los caracteres"
        aria-label="Caracteres de la imagen"
        aria-describedby="captcha-ayuda"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={5}
        disabled={!imagen}
        title="Escribe los caracteres de la imagen"
      />
    </fieldset>
  );
}
