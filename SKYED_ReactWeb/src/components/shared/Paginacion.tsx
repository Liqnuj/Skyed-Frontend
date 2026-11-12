import { ChevronLeft, ChevronRight } from "lucide-react";

export const POR_PAGINA = 10;

export interface DatosPaginacion {
  actual: number;
  totalPaginas: number;
  total: number;
  porPagina?: number;
}

export function paginar<T>(items: T[], pagina: number, porPagina: number = POR_PAGINA) {
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

export function Paginacion({
  pag,
  onCambiar,
}: {
  pag: DatosPaginacion;
  onCambiar: (n: number) => void;
}) {
  const porPagina = pag.porPagina ?? POR_PAGINA;
  if (pag.total <= porPagina) return null;

  const desde = (pag.actual - 1) * porPagina + 1;
  const hasta = Math.min(pag.actual * porPagina, pag.total);

  return (
    <div className="adm-pag" role="navigation" aria-label="Paginación">
      <span className="adm-pag-info">Mostrando {desde}–{hasta} de {pag.total}</span>
      <div className="adm-pag-ctrl">
        <button
          type="button"
          className="adm-pag-btn"
          disabled={pag.actual <= 1}
          onClick={() => onCambiar(pag.actual - 1)}
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        <span className="adm-pag-actual">Página {pag.actual} de {pag.totalPaginas}</span>
        <button
          type="button"
          className="adm-pag-btn"
          disabled={pag.actual >= pag.totalPaginas}
          onClick={() => onCambiar(pag.actual + 1)}
        >
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}