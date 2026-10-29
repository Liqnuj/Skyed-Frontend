import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ModuloAyuda } from '../../services/ayudaService';
import { rutaAyuda } from './rutas';

interface Props {
  modulo: ModuloAyuda;
  valorInicial?: string;
  /** Busca mientras se escribe (portada). Si no, solo al enviar. */
  enVivo?: boolean;
  placeholder?: string;
}

export default function AyudaBuscador({
  modulo,
  valorInicial = '',
  enVivo = false,
  placeholder = 'Busca: ¿cómo hago una reserva?',
}: Props) {
  const navigate = useNavigate();
  const idInput = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(valorInicial);
  const [aviso, setAviso] = useState('');
  const base = rutaAyuda(modulo);

  // Si la URL cambia desde fuera (limpiar, atrás), se refleja en la caja.
  useEffect(() => {
    setTexto((previo) => (previo.trim() === valorInicial.trim() ? previo : valorInicial));
  }, [valorInicial]);

  useEffect(() => {
    if (!enVivo) return;
    const limpio = texto.trim();
    if (limpio === valorInicial.trim()) return;
    if (limpio.length < 2 && valorInicial === '') return;

    const t = setTimeout(() => {
      navigate(limpio.length >= 2 ? `${base}?q=${encodeURIComponent(limpio)}` : base, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, enVivo]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (limpio.length < 2) {
      setAviso('Escribe al menos 2 letras para buscar.');
      entrada.current?.focus();
      return;
    }
    setAviso('');
    navigate(`${base}?q=${encodeURIComponent(limpio)}`);
  };

  const limpiar = () => {
    setTexto('');
    setAviso('');
    if (valorInicial) navigate(base);
    entrada.current?.focus();
  };

  return (
    <form className="ay-buscador" role="search" onSubmit={enviar}>
      <label htmlFor={idInput} className="ay-sr">
        Buscar en el Centro de Ayuda
      </label>
      <div className="ay-buscador-caja">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          id={idInput}
          ref={entrada}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={100}
        />
        {texto && (
          <button type="button" className="ay-limpiar" onClick={limpiar} aria-label="Limpiar búsqueda">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="ay-buscar-btn">
          Buscar
        </button>
      </div>
      {aviso && (
        <p className="ay-aviso" role="alert">
          {aviso}
        </p>
      )}
    </form>
  );
}