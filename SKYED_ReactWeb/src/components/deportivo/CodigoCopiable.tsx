import { useEffect, useRef, useState } from 'react';

/**
 * Muestra el código de la entrada con un botón para copiarlo al lado.
 * Reutiliza las clases .part-qr-code-text y .part-pay-copy que ya existen en participante.css.
 */
export default function CodigoCopiable({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Navegadores sin permiso de portapapeles (p. ej. páginas sin https): copia con un campo temporal.
      const campo = document.createElement('textarea');
      campo.value = codigo;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      try { document.execCommand('copy'); } catch { /* sin soporte */ }
      document.body.removeChild(campo);
    }
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
      <div className="part-qr-code-text" style={{ userSelect: 'all' }}>{codigo}</div>
      <button
        type="button"
        className="part-pay-copy"
        title="Copiar el código de la entrada"
        aria-label="Copiar el código de la entrada"
        onClick={copiar}
      >
        <i className={copiado ? 'ti ti-check' : 'ti ti-copy'} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar'}
      </button>
      <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {copiado ? 'Código copiado' : ''}
      </span>
    </div>
  );
}