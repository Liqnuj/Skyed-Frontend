import { ChevronLeft, ChevronRight } from "lucide-react";

export const POR_PAGINA = 10;

export interface DatosPagina {
  actual: number;
  totalPaginas: number;
  total: number;
  /** Filas por página; por defecto POR_PAGINA. */
  porPagina?: number;
}

/** Corta la lista en la página pedida (si te pasas de página, usa la última). */
export function paginar<T>(items: T[], pagina: number, porPagina = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  return {
    filas: items.slice((actual - 1) * porPagina, actual * porPagina),
    actual,
    totalPaginas,
    total: items.length,
    porPagina,
  };
}

/** Barra de paginación: solo aparece si hay más filas que las de una página. */
export function Paginacion({
  pag,
  onCambiar,
}: {
  pag: DatosPagina;
  onCambiar: (n: number) => void;
}) {
  const porPagina = pag.porPagina ?? POR_PAGINA;
  if (pag.total <= porPagina) return null;
  const desde = (pag.actual - 1) * porPagina + 1;
  const hasta = Math.min(pag.actual * porPagina, pag.total);
  return (
    <nav className="adm-pag" aria-label="Paginación">
      <span className="adm-pag-info">Mostrando {desde}–{hasta} de {pag.total}</span>
      <div className="adm-pag-ctrl">
        <button type="button" className="adm-pag-btn" disabled={pag.actual <= 1} onClick={() => onCambiar(pag.actual - 1)}>
          <ChevronLeft size={15} /> Anterior
        </button>
        <span className="adm-pag-actual">Página {pag.actual} de {pag.totalPaginas}</span>
        <button type="button" className="adm-pag-btn" disabled={pag.actual >= pag.totalPaginas} onClick={() => onCambiar(pag.actual + 1)}>
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}