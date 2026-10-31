import type { useConfirmacion } from '../../shared/ConfirmDialog';

export type Avisar = (tipo: 'ok' | 'error', texto: string) => void;
export type Confirmar = ReturnType<typeof useConfirmacion>['confirmar'];

/** apiFetch ya junta los mensajes de validación de Laravel en el Error. */
export function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}