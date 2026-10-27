import { useEffect, useRef, useState } from "react";
import { SkaiLogo } from "./SkaiWidget";
import "../../styles/shared/adminMotion.css";

/**
 * Número que "cuenta" hasta su valor (0 → 35) en vez de aparecer de golpe.
 * Si el valor cambia (p. ej. llegan los datos), cuenta desde el anterior.
 * Corre también con "menos movimiento": cambian las cifras, nada se desplaza.
 */
export function NumeroAnimado({
  valor,
  formato = (v: number) => String(v),
  duracion = 800,
}: {
  valor: number;
  formato?: (v: number) => string;
  duracion?: number;
}) {
  const [mostrado, setMostrado] = useState(0);
  // Lo que se ve en pantalla en este momento: si el valor cambia a mitad de
  // una cuenta, la nueva sigue desde ahí. (En desarrollo React ejecuta los
  // efectos dos veces; por eso no se marca como "llegado" antes de animar.)
  const actual = useRef(0);

  useEffect(() => {
    const inicio = actual.current;
    if (inicio === valor) {
      setMostrado(valor);
      return;
    }

    let frame = 0;
    const comienzo = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - comienzo) / duracion);
      const suave = 1 - Math.pow(1 - avance, 3); // rápido al inicio, frena al final
      actual.current = inicio + (valor - inicio) * suave;
      setMostrado(actual.current);
      if (avance < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor, duracion]);

  return <>{formato(Math.round(mostrado))}</>;
}

/**
 * Carga inicial del panel: esqueletos de las tarjetas con el orbe de SKAI
 * encima. Se muestra solo mientras de verdad se están pidiendo los datos.
 */
export function CargandoPanel({
  modulo,
  texto = "Preparando tu panel…",
}: {
  modulo: "social" | "deportivo";
  texto?: string;
}) {
  return (
    <div className="admin-loader" role="status" aria-live="polite">
      <div className="admin-loader-skeleton" aria-hidden="true">
        <div className="admin-loader-row">
          {Array.from({ length: 6 }, (_, i) => <span key={i} className="admin-sk admin-sk-kpi" />)}
        </div>
        <div className="admin-loader-row admin-loader-row-2">
          <span className="admin-sk admin-sk-big" />
          <span className="admin-sk admin-sk-big" />
        </div>
      </div>

      <div className="admin-loader-orb" data-skai-theme={modulo}>
        <span className="admin-loader-bubble">{texto}</span>
        <span className="admin-loader-ball">
          <SkaiLogo />
        </span>
      </div>
    </div>
  );
}
