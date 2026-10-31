import { useState } from 'react';
import type { FormEvent } from 'react';
import { ayudaAdminService } from '../../../services/ayudaAdminService';
import type { CategoriaAdmin, DatosCategoria, ModuloContenido, OpcionesAyuda } from '../../../services/ayudaAdminService';
import Modal from './Modal';
import { mensajeDeError } from './tipos';
import type { Avisar, Confirmar } from './tipos';

const MODULO: Record<ModuloContenido, string> = { general: 'General', social: 'Social', deportivo: 'Deportivo' };
const ICONOS = [
  'ti-rocket', 'ti-calendar-event', 'ti-message-report', 'ti-bike', 'ti-shield-check',
  'ti-credit-card', 'ti-user-circle', 'ti-help-circle', 'ti-ticket', 'ti-receipt', 'ti-map-pin', 'ti-bell',
];

interface Props {
  categorias: CategoriaAdmin[];
  opciones: OpcionesAyuda;
  recargar: () => Promise<void>;
  avisar: Avisar;
  confirmar: Confirmar;
}

export default function CategoriasPanel({ categorias, opciones, recargar, avisar, confirmar }: Props) {
  const [editando, setEditando] = useState<CategoriaAdmin | 'nueva' | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const ejecutar = async (id: number, accion: () => Promise<unknown>, exito: string) => {
    setOcupado(id);
    try {
      await accion();
      await recargar();
      avisar('ok', exito);
    } catch (e) {
      avisar('error', mensajeDeError(e, 'No se pudo completar la acción.'));
    } finally {
      setOcupado(null);
    }
  };

  const alternarActiva = async (c: CategoriaAdmin) => {
    if (c.activa) {
      const total = c.total_articulos ?? 0;
      const ok = await confirmar({
        titulo: 'Desactivar categoría',
        mensaje:
          total > 0
            ? `Mientras esté inactiva, sus ${total} artículo(s) dejarán de verse para los usuarios.`
            : 'La categoría dejará de mostrarse a los usuarios.',
        confirmar: 'Desactivar',
        tipo: 'peligro',
      });
      if (!ok) return;
    }
    await ejecutar(c.id, () => ayudaAdminService.actualizarCategoria(c.id, { activa: !c.activa }), c.activa ? 'Categoría desactivada.' : 'Categoría activada.');
  };

  const eliminar = async (c: CategoriaAdmin) => {
    const total = c.total_articulos ?? 0;
    if (total > 0) {
      avisar('error', `La categoría tiene ${total} artículo(s). Muévelos a otra categoría o desactívala.`);
      return;
    }
    const ok = await confirmar({
      titulo: 'Eliminar categoría',
      mensaje: `Se eliminará «${c.nombre}». Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    await ejecutar(c.id, () => ayudaAdminService.eliminarCategoria(c.id), 'Categoría eliminada.');
  };

  const mover = (c: CategoriaAdmin, delta: -1 | 1) => {
    const i = categorias.findIndex((x) => x.id === c.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= categorias.length) return;
    const ids = categorias.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void ejecutar(c.id, () => ayudaAdminService.ordenarCategorias(ids), 'Orden actualizado.');
  };

  return (
    <>
      <div className="ay-adm-barra ay-adm-barra--fin">
        <button type="button" className="ay-adm-btn ay-adm-btn--primario" onClick={() => setEditando('nueva')}>
          <i className="ti ti-plus" aria-hidden="true" /> Nueva categoría
        </button>
      </div>

      {categorias.length === 0 ? (
        <div className="ay-adm-vacio">Todavía no hay categorías.</div>
      ) : (
        <div className="ay-adm-tabla-wrap">
          <table className="ay-adm-tabla">
            <caption className="ay-sr">Categorías del Centro de Ayuda</caption>
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col">Módulo</th>
                <th scope="col">Artículos</th>
                <th scope="col">Estado</th>
                <th scope="col">Orden</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c, i) => {
                const bloqueado = ocupado === c.id;
                return (
                  <tr key={c.id} className={bloqueado ? 'ay-adm-fila--ocupada' : undefined}>
                    <td>
                      <span className="ay-adm-cat-icono" aria-hidden="true">
                        <i className={`ti ${c.icono}`} />
                      </span>{' '}
                      <button type="button" className="ay-adm-enlace" onClick={() => setEditando(c)}>
                        {c.nombre}
                      </button>
                      <span className="ay-adm-slug">/{c.slug}</span>
                    </td>
                    <td>{MODULO[c.modulo]}</td>
                    <td className="ay-adm-num">{c.total_articulos ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className={`ay-adm-estado ay-adm-estado--${c.activa ? 'publicado' : 'desactivado'} ay-adm-estado--boton`}
                        aria-pressed={c.activa}
                        title={c.activa ? 'Desactivar' : 'Activar'}
                        disabled={bloqueado}
                        onClick={() => void alternarActiva(c)}
                      >
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="ay-adm-centro">
                      <button type="button" className="ay-adm-icono" aria-label={`Subir: ${c.nombre}`} title="Subir" disabled={bloqueado || i === 0} onClick={() => mover(c, -1)}>
                        <i className="ti ti-arrow-up" aria-hidden="true" />
                      </button>
                      <button type="button" className="ay-adm-icono" aria-label={`Bajar: ${c.nombre}`} title="Bajar" disabled={bloqueado || i === categorias.length - 1} onClick={() => mover(c, 1)}>
                        <i className="ti ti-arrow-down" aria-hidden="true" />
                      </button>
                    </td>
                    <td className="ay-adm-acciones">
                      <button type="button" className="ay-adm-icono" aria-label={`Editar: ${c.nombre}`} title="Editar" onClick={() => setEditando(c)}>
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button type="button" className="ay-adm-icono ay-adm-icono--peligro" aria-label={`Eliminar: ${c.nombre}`} title="Eliminar" disabled={bloqueado} onClick={() => void eliminar(c)}>
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <CategoriaFormulario
          categoria={editando === 'nueva' ? null : editando}
          opciones={opciones}
          onCerrar={() => setEditando(null)}
          onGuardado={async (mensaje) => {
            setEditando(null);
            await recargar();
            avisar('ok', mensaje);
          }}
        />
      )}
    </>
  );
}

function CategoriaFormulario({
  categoria,
  opciones,
  onCerrar,
  onGuardado,
}: {
  categoria: CategoriaAdmin | null;
  opciones: OpcionesAyuda;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => Promise<void>;
}) {
  const [f, setF] = useState({
    nombre: categoria?.nombre ?? '',
    modulo: (categoria?.modulo ?? opciones.modulos[0] ?? 'social') as ModuloContenido,
    descripcion: categoria?.descripcion ?? '',
    icono: categoria?.icono ?? 'ti-help-circle',
    orden: categoria?.orden ?? 0,
    activa: categoria?.activa ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const tieneArticulos = (categoria?.total_articulos ?? 0) > 0;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const datos: DatosCategoria = {
      nombre: f.nombre.trim(),
      modulo: f.modulo,
      descripcion: f.descripcion.trim() || null,
      icono: f.icono.trim() || null,
      orden: Number(f.orden) || 0,
      activa: f.activa,
    };

    setGuardando(true);
    try {
      if (categoria) {
        await ayudaAdminService.actualizarCategoria(categoria.id, datos);
        await onGuardado('Categoría actualizada.');
      } else {
        await ayudaAdminService.crearCategoria(datos);
        await onGuardado('Categoría creada.');
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la categoría.'));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={categoria ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar} bloqueado={guardando} ancho={560}>
      <form onSubmit={enviar}>
        <div className="ay-adm-modal-cuerpo">
          {error && (
            <p className="ay-adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="ay-adm-form-grid">
            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-c-nombre">Nombre *</label>
              <input id="ay-c-nombre" required maxLength={100} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-c-modulo">Módulo *</label>
              <select id="ay-c-modulo" value={f.modulo} disabled={tieneArticulos} onChange={(e) => setF({ ...f, modulo: e.target.value as ModuloContenido })}>
                {opciones.modulos.map((m) => (
                  <option key={m} value={m}>{MODULO[m]}</option>
                ))}
              </select>
              {tieneArticulos && <small>No se puede cambiar: ya tiene artículos.</small>}
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-c-orden">Orden</label>
              <input id="ay-c-orden" type="number" min={0} max={9999} value={f.orden} onChange={(e) => setF({ ...f, orden: Number(e.target.value) })} />
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-c-desc">Descripción</label>
              <textarea id="ay-c-desc" rows={2} maxLength={255} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-c-icono">Ícono (Tabler Icons)</label>
              <div className="ay-adm-icono-fila">
                <span className="ay-adm-cat-icono" aria-hidden="true">
                  <i className={`ti ${f.icono}`} />
                </span>
                <input id="ay-c-icono" list="ay-iconos" maxLength={50} value={f.icono} onChange={(e) => setF({ ...f, icono: e.target.value })} placeholder="ti-rocket" />
                <datalist id="ay-iconos">
                  {ICONOS.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <small>Debe empezar con «ti-». Mira todos en tabler.io/icons.</small>
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo ay-adm-checks">
              <label>
                <input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /> Categoría activa (visible para los usuarios)
              </label>
            </div>
          </div>
        </div>

        <div className="ay-adm-modal-pie">
          <button type="button" className="ay-adm-btn ay-adm-btn--suave" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="ay-adm-btn ay-adm-btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </form>
    </Modal>
  );
}