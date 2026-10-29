import { useMemo, useState } from "react";

/*
 * Gráficas del inicio del panel de administración deportivo.
 * SVG propio (sin librerías): datos reales de los pagos e inscripciones
 * que ya carga el panel (GET /pagos y GET /eventos).
 * Colores validados (contraste y daltonismo) en AdminExtras.css.
 */

export type PagoGrafico = {
  id_pago: number;
  monto_p?: number | string | null;
  fecha_p?: string | null;
  estado_p: "pendiente" | "confirmado" | "rechazado" | "cancelado";
  inscripcion?: {
    estado_i: string;
    fecha_i?: string | null;
    evento?: { id_e: number; nombre_e: string };
  };
};

const pesos = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

/** $1.250.000 → "$1,3 M"; $450.000 → "$450 mil" (ejes y etiquetas cortas). */
const pesosCorto = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000).toLocaleString("es-CO")} mil`;
  return `$${v.toLocaleString("es-CO")}`;
};

/** Máximo "redondo" para el eje (1, 2 o 5 × 10^n). */
const maximoRedondo = (v: number) => {
  if (v <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * base).find((m) => m >= v) ?? v;
};

const claveMes = (fecha?: string | null) => (fecha ? fecha.slice(0, 7) : "");

/** Últimos `n` meses (incluido el actual) como "YYYY-MM". */
function ultimosMeses(n: number) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

const nombreMes = (clave: string, largo = false) => {
  const [a, m] = clave.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { month: largo ? "long" : "short", ...(largo ? { year: "numeric" } : {}) })
    .format(new Date(a, m - 1, 1))
    .replace(".", "");
};

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/* =====================================================================
   1) Tendencia mensual: ingresos o inscripciones de los últimos 6 meses
===================================================================== */

type Metrica = "ingresos" | "inscripciones";

export function TendenciaMensual({ pagos }: { pagos: PagoGrafico[] }) {
  const [metrica, setMetrica] = useState<Metrica>("ingresos");
  const [activo, setActivo] = useState<number | null>(null);

  const meses = useMemo(() => {
    const claves = ultimosMeses(6);
    return claves.map((clave) => {
      const confirmados = pagos.filter((p) => p.estado_p === "confirmado" && claveMes(p.fecha_p) === clave);
      const inscritos = pagos.filter(
        (p) => p.inscripcion && p.inscripcion.estado_i !== "cancelada" && claveMes(p.inscripcion.fecha_i ?? p.fecha_p) === clave,
      );
      return {
        clave,
        ingresos: confirmados.reduce((s, p) => s + Number(p.monto_p || 0), 0),
        pagosConfirmados: confirmados.length,
        inscripciones: inscritos.length,
      };
    });
  }, [pagos]);

  const valores = meses.map((m) => m[metrica]);
  const total = valores.reduce((s, v) => s + v, 0);
  const actual = valores[valores.length - 1];
  const anterior = valores[valores.length - 2];
  const variacion = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;
  const formato = metrica === "ingresos" ? pesos : (v: number) => `${v}`;
  const formatoEje = metrica === "ingresos" ? pesosCorto : (v: number) => `${v}`;

  // Geometría del SVG (viewBox fijo; el SVG escala al ancho de la tarjeta).
  const W = 640, H = 230, izq = 64, der = 12, arriba = 24, abajo = 30;
  const altoUtil = H - arriba - abajo;
  const maximo = maximoRedondo(Math.max(...valores, metrica === "inscripciones" ? 4 : 0));
  const columna = (W - izq - der) / meses.length;
  const anchoBarra = Math.min(38, columna * 0.46);
  const y = (v: number) => arriba + altoUtil - (v / maximo) * altoUtil;
  const lineas = [0, maximo / 2, maximo];

  return (
    <section className="admin-card chart-card">
      <div className="card-head">
        <div>
          <span className="card-kicker">ÚLTIMOS 6 MESES</span>
          <h2>{metrica === "ingresos" ? "Ingresos por inscripciones" : "Inscripciones por mes"}</h2>
        </div>
        <div className="chart-toggle" role="tablist" aria-label="Dato de la gráfica">
          {(["ingresos", "inscripciones"] as Metrica[]).map((m) => (
            <button title={m === "ingresos" ? 'Ver el gráfico de ingresos' : 'Ver el gráfico de inscripciones'}
              key={m}
              type="button"
              role="tab"
              aria-selected={metrica === m}
              className={metrica === m ? "is-active" : ""}
              onClick={() => { setMetrica(m); setActivo(null); }}
            >
              {m === "ingresos" ? "Ingresos" : "Inscripciones"}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-hero">
        <div>
          <strong>{formato(actual)}</strong>
          <span>este mes ({nombreMes(meses[meses.length - 1].clave, true)})</span>
        </div>
        <div className="chart-hero-side">
          {variacion !== null && (
            <span className={`chart-delta ${variacion >= 0 ? "is-up" : "is-down"}`}>
              {variacion >= 0 ? "▲" : "▼"} {Math.abs(variacion)}% vs. mes anterior
            </span>
          )}
          <span className="chart-total">Total del periodo: <b>{formato(total)}</b></span>
        </div>
      </div>

      <div className="chart-plot" onMouseLeave={() => setActivo(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metrica === "ingresos" ? "Ingresos confirmados" : "Inscripciones"} por mes, últimos 6 meses`}>
          {lineas.map((v) => (
            <g key={v}>
              <line className="chart-grid" x1={izq} x2={W - der} y1={y(v)} y2={y(v)} />
              <text className="chart-axis" x={izq - 8} y={y(v) + 4} textAnchor="end">{formatoEje(v)}</text>
            </g>
          ))}

          {meses.map((m, i) => {
            const v = m[metrica];
            const cx = izq + columna * i + columna / 2;
            const alto = Math.max(v > 0 ? 3 : 0, y(0) - y(v));
            const radio = Math.min(4, alto / 2);
            const x0 = cx - anchoBarra / 2;
            const yTop = y(0) - alto;
            const esActual = i === meses.length - 1;
            return (
              <g key={m.clave}>
                {alto > 0 && (
                  <path
                    className={`chart-bar${activo === i ? " is-hover" : ""}${activo !== null && activo !== i ? " is-dim" : ""}`}
                    d={`M${x0},${y(0)} V${yTop + radio} Q${x0},${yTop} ${x0 + radio},${yTop} H${x0 + anchoBarra - radio} Q${x0 + anchoBarra},${yTop} ${x0 + anchoBarra},${yTop + radio} V${y(0)} Z`}
                  />
                )}
                {/* Etiqueta directa solo en el mes actual (el resto, al pasar el mouse). */}
                {esActual && v > 0 && activo === null && (
                  <text className="chart-value" x={cx} y={yTop - 7} textAnchor="middle">{formatoEje(v)}</text>
                )}
                <text className={`chart-axis${esActual ? " is-current" : ""}`} x={cx} y={H - 10} textAnchor="middle">
                  {nombreMes(m.clave)}
                </text>
                {/* Zona de hover más grande que la barra */}
                <rect
                  className="chart-hit"
                  x={izq + columna * i}
                  y={arriba}
                  width={columna}
                  height={altoUtil}
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  tabIndex={0}
                  aria-label={`${nombreMes(m.clave, true)}: ${formato(v)}`}
                />
              </g>
            );
          })}
          <line className="chart-baseline" x1={izq} x2={W - der} y1={y(0)} y2={y(0)} />
        </svg>

        {activo !== null && (
          <div
            className="chart-tooltip"
            style={{ left: `${((izq + columna * activo + columna / 2) / W) * 100}%` }}
            role="status"
          >
            <span>{mayuscula(nombreMes(meses[activo].clave, true))}</span>
            <strong>{formato(meses[activo][metrica])}</strong>
            <small>
              {metrica === "ingresos"
                ? `${meses[activo].pagosConfirmados} pago(s) confirmado(s)`
                : `${meses[activo].ingresos > 0 ? pesos(meses[activo].ingresos) + " confirmados" : "sin ingresos confirmados"}`}
            </small>
          </div>
        )}
      </div>

      {total === 0 && (
        <p className="chart-empty">
          {metrica === "ingresos"
            ? "Aún no hay pagos confirmados en los últimos 6 meses."
            : "Aún no hay inscripciones en los últimos 6 meses."}
        </p>
      )}

      {/* Vista en tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>{metrica === "ingresos" ? "Ingresos confirmados" : "Inscripciones"} por mes</caption>
        <tbody>
          {meses.map((m) => (
            <tr key={m.clave}><th>{nombreMes(m.clave, true)}</th><td>{formato(m[metrica])}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* =====================================================================
   2) Inscritos por evento (ranking)
===================================================================== */

export function InscritosPorEvento({ pagos }: { pagos: PagoGrafico[] }) {
  const ranking = useMemo(() => {
    const porEvento = new Map<number, { nombre: string; inscritos: number; ingresos: number }>();
    for (const p of pagos) {
      const ev = p.inscripcion?.evento;
      if (!ev || p.inscripcion?.estado_i === "cancelada") continue;
      const fila = porEvento.get(ev.id_e) ?? { nombre: ev.nombre_e, inscritos: 0, ingresos: 0 };
      fila.inscritos += 1;
      if (p.estado_p === "confirmado") fila.ingresos += Number(p.monto_p || 0);
      porEvento.set(ev.id_e, fila);
    }
    return [...porEvento.values()].sort((a, b) => b.inscritos - a.inscritos).slice(0, 6);
  }, [pagos]);

  const maximo = Math.max(1, ...ranking.map((r) => r.inscritos));

  return (
    <section className="admin-card chart-card">
      <div className="card-head">
        <div>
          <span className="card-kicker">PARTICIPACIÓN</span>
          <h2>Inscritos por evento</h2>
        </div>
      </div>
      {ranking.length ? (
        <ul className="hbar-list">
          {ranking.map((r) => (
            <li key={r.nombre} title={`${r.nombre}: ${r.inscritos} inscrito(s) · ${pesos(r.ingresos)} confirmados`}>
              <div className="hbar-head">
                <span className="hbar-name">{r.nombre}</span>
                <span className="hbar-value">{r.inscritos}</span>
              </div>
              <div className="hbar-track">
                <span className="hbar-fill" style={{ width: `${(r.inscritos / maximo) * 100}%` }} />
              </div>
              <small>{pesos(r.ingresos)} confirmados</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="chart-empty">Todavía no hay inscripciones activas.</p>
      )}
    </section>
  );
}

/* =====================================================================
   3) Estado de los pagos (barra apilada + leyenda con íconos y montos)
===================================================================== */

export function EstadoPagos({
  pagos,
  onVerPendientes,
}: {
  pagos: PagoGrafico[];
  onVerPendientes: () => void;
}) {
  const grupos = useMemo(() => {
    const suma = (lista: PagoGrafico[]) => lista.reduce((s, p) => s + Number(p.monto_p || 0), 0);
    const conf = pagos.filter((p) => p.estado_p === "confirmado");
    const pend = pagos.filter((p) => p.estado_p === "pendiente");
    const rech = pagos.filter((p) => p.estado_p === "rechazado" || p.estado_p === "cancelado");
    return [
      { clave: "ok", etiqueta: "Confirmados", icono: "✓", cantidad: conf.length, monto: suma(conf) },
      { clave: "pend", etiqueta: "Por validar", icono: "⏳", cantidad: pend.length, monto: suma(pend) },
      { clave: "bad", etiqueta: "Rechazados o cancelados", icono: "✕", cantidad: rech.length, monto: suma(rech) },
    ];
  }, [pagos]);

  const total = grupos.reduce((s, g) => s + g.cantidad, 0);
  const pendientes = grupos[1].cantidad;

  return (
    <section className="admin-card chart-card">
      <div className="card-head">
        <div>
          <span className="card-kicker">PAGOS</span>
          <h2>Estado de los pagos</h2>
        </div>
        <button title="Ver los pagos por validar" className="link-button" onClick={onVerPendientes}>Ver por validar →</button>
      </div>

      {total ? (
        <>
          <div className="stack-bar" role="img" aria-label={grupos.map((g) => `${g.etiqueta}: ${g.cantidad}`).join(", ")}>
            {grupos.filter((g) => g.cantidad > 0).map((g) => (
              <span
                key={g.clave}
                className={`stack-seg is-${g.clave}`}
                style={{ flexGrow: g.cantidad }}
                title={`${g.etiqueta}: ${g.cantidad} (${Math.round((g.cantidad / total) * 100)}%)`}
              />
            ))}
          </div>
          <ul className="stack-legend">
            {grupos.map((g) => (
              <li key={g.clave}>
                <span className={`stack-dot is-${g.clave}`} aria-hidden="true">{g.icono}</span>
                <span className="stack-label">{g.etiqueta}</span>
                <span className="stack-count">{g.cantidad}</span>
                <span className="stack-money">{pesos(g.monto)}</span>
              </li>
            ))}
          </ul>
          <p className={`stack-note${pendientes ? " has-pending" : ""}`}>
            {pendientes
              ? `Tienes ${pendientes} pago(s) esperando validación.`
              : "No hay pagos pendientes por validar. ✓"}
          </p>
        </>
      ) : (
        <p className="chart-empty">Aún no hay pagos registrados.</p>
      )}
    </section>
  );
}
