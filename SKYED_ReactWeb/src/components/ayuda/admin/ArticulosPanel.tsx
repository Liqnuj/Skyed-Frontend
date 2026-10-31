import { useEffect, useMemo, useState } from 'react';
import { ayudaAdminService } from '../../../services/ayudaAdminService';
import type {
  ArticuloAdmin,
  AudienciaArticulo,
  EstadoArticulo,
  ModuloContenido,
  OpcionesAyuda,
} from '../../../services/ayudaAdminService';
import ArticuloFormulario from './ArticuloFormulario';
import { mensajeDeError } from './tipos';
import type { Avisar, Confirmar } from './tipos';

const ESTADO: Record<EstadoArticulo, string> = { borrador: 'Borrador', publicado: 'Publicado', desactivado: 'Desactivado' };
const MODULO: Record<ModuloContenido, string> = { general: 'General', social: 'Social', deportivo: 'Deportivo' };
const AUDIENCIA: Record<AudienciaArticulo, string> = { publico: 'Público', usuario: 'Con sesión', admin: 'Administradores' };

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface Props {
  articulos: ArticuloAdmin[];
  opciones: OpcionesAyuda;
  recargar: () => Promise<void>;
  avisar: Avisar;
  confirmar: Confirmar;
  /** Id de un artículo que debe abrirse en el editor (viene de Métricas). */
  abrirId: number | null;
  alAbrir: () => void;
}

export default function ArticulosPanel({ articulos, opciones, recargar, avisar, confirmar, abrirId, alAbrir }: Props) {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [modulo, setModulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editando, setEditando] = useState<ArticuloAdmin | 'nuevo' | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  useEffect(() => {
    if (abrirId === null) return;
    const objetivo = articulos.find((a) => a.id === abrirId);
    if (objetivo) setEditando(objetivo);
    alAbrir();
  }, [abrirId, articulos, alAbrir]);

  const termino = normalizar(q.trim());
  const lista = useMemo(
    () =>
      articulos.filter(
        (a) =>
          (!estado || a.estado === estado) &&
          (!modulo || a.modulo === modulo) &&
          (!categoria || a.categoria?.id === Number(categoria)) &&
          (!termino || normalizar(`${a.titulo} ${a.slug}`).includes(termino)),
      ),
    [articulos, estado, modulo, categoria, termino],
  );

  // Ordenar solo tiene sentido sin filtros que dejen la lista a medias (la categoría sí sirve).
  const puedeOrdenar = !termino && !estado && !modulo;

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

  const alternarPublicacion = async (a: ArticuloAdmin) => {
    if (a.estado === 'publicado') {
      const ok = await confirmar({
        titulo: 'Desactivar artículo',
        mensaje: `«${a.titulo}» dejará de verse para los usuarios. Podrás publicarlo de nuevo cuando quieras.`,
        confirmar: 'Desactivar',
        tipo: 'peligro',
      });
      if (!ok) return;
      await ejecutar(a.id, () => ayudaAdminService.actualizarArticulo(a.id, { estado: 'desactivado' }), 'Artículo desactivado.');
    } else {
      await ejecutar(a.id, () => ayudaAdminService.actualizarArticulo(a.id, { estado: 'publicado' }), 'Artículo publicado.');
    }
  };

  const eliminar = async (a: ArticuloAdmin) => {
    if (a.estado === 'publicado') {
      avisar('error', 'Un artículo publicado no se puede eliminar: desactívalo primero.');
      return;
    }
    const ok = await confirmar({
      titulo: 'Eliminar artículo',
      mensaje: `Se eliminará «${a.titulo}» junto con las opiniones de los lectores. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    await ejecutar(a.id, () => ayudaAdminService.eliminarArticulo(a.id), 'Artículo eliminado.');
  };

  const mover = (a: ArticuloAdmin, delta: -1 | 1) => {
    const i = lista.findIndex((x) => x.id === a.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return;
    const ids = lista.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void ejecutar(a.id, () => ayudaAdminService.ordenarArticulos(ids), 'Orden actualizado.');
  };

  return (
    <>
      <div className="ay-adm-barra">
        <div className="ay-adm-campo ay-adm-campo--ancho">
          <label htmlFor="ay-adm-q">Buscar</label>
          <input id="ay-adm-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o dirección…" />
        </div>
        <div className="ay-adm-campo">
          <label htmlFor="ay-adm-f-estado">Estado</label>
          <select id="ay-adm-f-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {opciones.estados.map((e) => (
              <option key={e} value={e}>{ESTADO[e]}</option>
            ))}
          </select>
        </div>
        <div className="ay-adm-campo">
          <label htmlFor="ay-adm-f-modulo">Módulo</label>
          <select id="ay-adm-f-modulo" value={modulo} onChange={(e) => setModulo(e.target.value)}>
            <option value="">Todos</option>
            {opciones.modulos.map((m) => (
              <option key={m} value={m}>{MODULO[m]}</option>
            ))}
          </select>
        </div>
        <div className="ay-adm-campo">
          <label htmlFor="ay-adm-f-cat">Categoría</label>
          <select id="ay-adm-f-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {opciones.categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <button type="button" className="ay-adm-btn ay-adm-btn--primario" onClick={() => setEditando('nuevo')}>
          <i className="ti ti-plus" aria-hidden="true" /> Nuevo artículo
        </button>
      </div>

      <p className="ay-adm-nota">
        {puedeOrdenar
          ? 'Tip: filtra por categoría y usa las flechas para ordenar sus artículos.'
          : 'Para ordenar con las flechas quita los filtros de búsqueda, estado y módulo.'}
      </p>

      {articulos.length === 0 ? (
        <div className="ay-adm-vacio">Todavía no hay artículos. Crea el primero con «Nuevo artículo».</div>
      ) : lista.length === 0 ? (
        <div className="ay-adm-vacio">Ningún artículo coincide con los filtros.</div>
      ) : (
        <div className="ay-adm-tabla-wrap">
          <table className="ay-adm-tabla">
            <caption className="ay-sr">Artículos del Centro de Ayuda</caption>
            <thead>
              <tr>
                <th scope="col">Artículo</th>
                <th scope="col">Categoría</th>
                <th scope="col">Módulo</th>
                <th scope="col">Audiencia</th>
                <th scope="col">Estado</th>
                <th scope="col">Dest.</th>
                <th scope="col">FAQ</th>
                <th scope="col">Visitas</th>
                <th scope="col">Opiniones</th>
                <th scope="col">Orden</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a, i) => {
                const bloqueado = ocupado === a.id;
                return (
                  <tr key={a.id} className={bloqueado ? 'ay-adm-fila--ocupada' : undefined}>
                    <td>
                      <button type="button" className="ay-adm-enlace" onClick={() => setEditando(a)}>
                        {a.titulo}
                      </button>
                      <span className="ay-adm-slug">/{a.slug}</span>
                    </td>
                    <td>{a.categoria?.nombre ?? '—'}</td>
                    <td>{MODULO[a.modulo]}</td>
                    <td>{AUDIENCIA[a.audiencia]}</td>
                    <td>
                      <span className={`ay-adm-estado ay-adm-estado--${a.estado}`}>{ESTADO[a.estado]}</span>
                    </td>
                    <td className="ay-adm-centro">
                      <button
                        type="button"
                        className="ay-adm-icono"
                        aria-pressed={a.destacado}
                        aria-label={`${a.destacado ? 'Quitar de destacados' : 'Destacar'}: ${a.titulo}`}
                        title={a.destacado ? 'Quitar de destacados' : 'Destacar'}
                        disabled={bloqueado}
                        onClick={() =>
                          void ejecutar(
                            a.id,
                            () => ayudaAdminService.actualizarArticulo(a.id, { destacado: !a.destacado }),
                            a.destacado ? 'Ya no es destacado.' : 'Artículo destacado.',
                          )
                        }
                      >
                        <i className={`ti ${a.destacado ? 'ti-star-filled' : 'ti-star'}`} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="ay-adm-centro">
                      <button
                        type="button"
                        className="ay-adm-icono"
                        aria-pressed={a.faq}
                        aria-label={`${a.faq ? 'Quitar de preguntas frecuentes' : 'Mostrar en preguntas frecuentes'}: ${a.titulo}`}
                        title={a.faq ? 'Quitar de preguntas frecuentes' : 'Mostrar en preguntas frecuentes'}
                        disabled={bloqueado}
                        onClick={() =>
                          void ejecutar(
                            a.id,
                            () => ayudaAdminService.actualizarArticulo(a.id, { faq: !a.faq }),
                            a.faq ? 'Quitado de preguntas frecuentes.' : 'Agregado a preguntas frecuentes.',
                          )
                        }
                      >
                        <i className="ti ti-messages" aria-hidden="true" />
                      </button>
                    </td>
                    <td className="ay-adm-num">{a.visitas}</td>
                    <td className="ay-adm-num">
                      <span title="Le fue útil">
                        <i className="ti ti-thumb-up" aria-hidden="true" /> {a.utiles ?? 0}
                        <span className="ay-sr"> le fue útil</span>
                      </span>{' '}
                      <span title="No le fue útil">
                        <i className="ti ti-thumb-down" aria-hidden="true" /> {a.no_utiles ?? 0}
                        <span className="ay-sr"> no le fue útil</span>
                      </span>
                    </td>
                    <td className="ay-adm-centro">
                      <button
                        type="button"
                        className="ay-adm-icono"
                        aria-label={`Subir: ${a.titulo}`}
                        title="Subir"
                        disabled={!puedeOrdenar || bloqueado || i === 0}
                        onClick={() => mover(a, -1)}
                      >
                        <i className="ti ti-arrow-up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ay-adm-icono"
                        aria-label={`Bajar: ${a.titulo}`}
                        title="Bajar"
                        disabled={!puedeOrdenar || bloqueado || i === lista.length - 1}
                        onClick={() => mover(a, 1)}
                      >
                        <i className="ti ti-arrow-down" aria-hidden="true" />
                      </button>
                    </td>
                    <td className="ay-adm-acciones">
                      <button type="button" className="ay-adm-icono" aria-label={`Editar: ${a.titulo}`} title="Editar" onClick={() => setEditando(a)}>
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ay-adm-icono"
                        aria-label={`${a.estado === 'publicado' ? 'Desactivar' : 'Publicar'}: ${a.titulo}`}
                        title={a.estado === 'publicado' ? 'Desactivar' : 'Publicar'}
                        disabled={bloqueado}
                        onClick={() => void alternarPublicacion(a)}
                      >
                        <i className={`ti ${a.estado === 'publicado' ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ay-adm-icono ay-adm-icono--peligro"
                        aria-label={`Eliminar: ${a.titulo}`}
                        title="Eliminar"
                        disabled={bloqueado}
                        onClick={() => void eliminar(a)}
                      >
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
        <ArticuloFormulario
          articulo={editando === 'nuevo' ? null : editando}
          opciones={opciones}
          onCerrar={() => setEditando(null)}
          onGuardado={async (mensaje: string) => {
            setEditando(null);
            await recargar();
            avisar('ok', mensaje);
          }}
        />
      )}
    </>
  );
}