import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Avisar } from '../../components/shared/Avisos';
import type { OpcionesConfirmacion } from '../../components/shared/ConfirmDialog';
import { MAX_ASISTENTES } from './constantes';
import AsistenteModal from './AsistenteModal';
import { asistentesDePrueba } from './datosPrueba';
import { asistentesService, type DatosAsistente, type NuevoAsistente } from '../../services/asistentesService';
import { limpiarPermisos, resumenPermisos, type Asistente, type Modulo, type Permisos } from '../../types/permisos';
import { normalizarCorreo } from '../../utils/validaciones';
import '../../styles/shared/asistentes.css';

type Confirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

interface Props {
  modulo: Modulo;
  search: string;
  notify: Avisar;
  correoAdmin?: string;
  confirmar: Confirmar;
}

export default function AsistentesPanel({ modulo, search, notify, correoAdmin, confirmar }: Props) {
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [limite, setLimite] = useState(MAX_ASISTENTES);
  const [cargando, setCargando] = useState(true);
  const [modoDemo, setModoDemo] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  // La ventana se dibuja en la raíz del panel y no dentro de <main>: <main> tiene
  // su propia capa (z-index 1) y el encabezado y la barra lateral la tapaban.
  const seccionRef = useRef<HTMLElement>(null);
  const [raizPanel, setRaizPanel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRaizPanel(seccionRef.current?.closest<HTMLElement>('.social-admin, .deportivo-admin') ?? null);
  }, []);
  const [editando, setEditando] = useState<Asistente | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  useEffect(() => {
    let activo = true;
    asistentesService.listar(modulo)
      .then((respuesta) => {
        if (!Array.isArray(respuesta.data)) {
          throw new Error('La respuesta de asistentes no tiene el formato esperado.');
        }
        if (!activo) return;
        setAsistentes(respuesta.data);
        setLimite(respuesta.limite ?? MAX_ASISTENTES);
      })
      .catch(() => {
        if (!activo) return;
        setAsistentes(asistentesDePrueba(modulo));
        setLimite(MAX_ASISTENTES);
        setModoDemo(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [modulo]);

  const correosExistentes = useMemo(
    () => asistentes.map((asistente) => asistente.correo),
    [asistentes],
  );
  const asistentesVisibles = useMemo(() => {
    const consulta = search.trim().toLocaleLowerCase();
    return asistentes.filter((asistente) =>
      (filtroEstado === 'todos' || (asistente.activo ? 'activo' : 'inactivo') === filtroEstado) &&
      (!consulta || `${asistente.nombre} ${asistente.apellido} ${asistente.correo} ${asistente.telefono}`
        .toLocaleLowerCase()
        .includes(consulta)),
    );
  }, [asistentes, filtroEstado, search]);

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (asistente: Asistente) => {
    setEditando(asistente);
    setModalAbierto(true);
  };

  const actualizarLista = (actualizado: Asistente) => {
    setAsistentes((lista) => {
      const existe = lista.some((asistente) => asistente.id === actualizado.id);
      return existe
        ? lista.map((asistente) => asistente.id === actualizado.id ? actualizado : asistente)
        : [actualizado, ...lista];
    });
  };

  const guardar = async (datos: {
    nombre: string;
    apellido: string;
    correo: string;
    telefono: string;
    tipoDocumento?: string;
    documento?: number;
    fechaNacimiento?: string;
    clave?: string;
    confirmacion?: string;
    permisos: Permisos;
  }) => {
    if (!editando && asistentes.length >= limite) {
      throw new Error(`Ya alcanzaste el límite de ${limite} asistentes.`);
    }

    const permisos = limpiarPermisos(modulo, datos.permisos);
    if (modoDemo) {
      const actualizado: Asistente = {
        id: editando?.id ?? Math.min(0, ...asistentes.map((asistente) => asistente.id)) - 1,
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo: normalizarCorreo(datos.correo),
        telefono: datos.telefono,
        foto_url: editando?.foto_url ?? null,
        activo: editando?.activo ?? true,
        modulo,
        permisos,
      };
      actualizarLista(actualizado);
      notify(editando ? 'Asistente actualizado en modo de demostración.' : 'Asistente creado en modo de demostración.');
    } else {
      const base: DatosAsistente = {
        nombre_u: datos.nombre,
        apellido_u: datos.apellido,
        correo_u: normalizarCorreo(datos.correo),
        telefono_u: datos.telefono,
        permisos,
      };
      try {
        let respuesta;
        if (editando) {
          respuesta = await asistentesService.actualizar(modulo, editando.id, base);
        } else {
          if (!datos.tipoDocumento || datos.documento === undefined || !datos.fechaNacimiento || !datos.clave || !datos.confirmacion) {
            throw new Error('Completa los datos de identidad y la contraseña del asistente.');
          }
          respuesta = await asistentesService.crear(modulo, {
              ...base,
              tipo_documento_u: datos.tipoDocumento,
              documento_u: datos.documento,
              fecha_nacimiento_u: datos.fechaNacimiento,
              contrasena_u: datos.clave,
              contrasena_u_confirmation: datos.confirmacion,
            } satisfies NuevoAsistente);
        }
        if (!respuesta.data) throw new Error('El servidor no devolvió el asistente guardado.');
        actualizarLista(respuesta.data);
        notify(editando ? 'Asistente actualizado correctamente.' : 'Asistente creado correctamente.');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'No se pudo guardar el asistente.', 'error');
        throw error;
      }
    }
    setModalAbierto(false);
    setEditando(null);
  };

  const cambiarEstado = async (asistente: Asistente) => {
    const activo = !asistente.activo;
    if (!activo && !(await confirmar({
      titulo: 'Desactivar asistente',
      mensaje: `¿Desactivar a ${asistente.nombre} ${asistente.apellido}? Ya no podrá acceder al panel.`,
      confirmar: 'Desactivar',
      tipo: 'peligro',
    }))) return;

    if (modoDemo) {
      actualizarLista({ ...asistente, activo });
      notify(activo ? 'Asistente activado en modo de demostración.' : 'Asistente desactivado en modo de demostración.');
      return;
    }

    try {
      const respuesta = await asistentesService.cambiarEstado(modulo, asistente.id, activo);
      if (!respuesta.data) throw new Error('El servidor no devolvió el estado actualizado.');
      actualizarLista(respuesta.data);
      notify(activo ? 'Asistente activado correctamente.' : 'Asistente desactivado correctamente.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo cambiar el estado del asistente.', 'error');
    }
  };

  const eliminar = async (asistente: Asistente) => {
    if (!(await confirmar({
      titulo: 'Dar de baja al asistente',
      mensaje: `¿Dar de baja a ${asistente.nombre} ${asistente.apellido}? Su cuenta se conservará, pero perderá los permisos de este panel.`,
      confirmar: 'Dar de baja',
      tipo: 'peligro',
    }))) return;

    if (modoDemo) {
      setAsistentes((lista) => lista.filter((actual) => actual.id !== asistente.id));
      notify('Asistente dado de baja en modo de demostración.');
      return;
    }

    try {
      await asistentesService.eliminar(modulo, asistente.id);
      setAsistentes((lista) => lista.filter((actual) => actual.id !== asistente.id));
      notify('Asistente dado de baja correctamente.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo dar de baja al asistente.', 'error');
    }
  };

  return (
    <>
      <section ref={seccionRef} className="section-view asistentes-panel" aria-label="Asistentes">
        {modoDemo && (
          <div className="asist-banner aviso" role="status">
            No se pudo cargar la API de asistentes. Estás viendo datos de demostración; los cambios no se guardan en el servidor.
          </div>
        )}

        <div className="section-header">
          <div>
            <span className="card-kicker">GESTIÓN</span>
          </div>
          <button type="button" className="primary-btn" onClick={abrirNuevo} disabled={asistentes.length >= limite}>
            <Plus size={16} /> Agregar asistente
          </button>
        </div>

        <div className="filter-row asist-filter-row">
          <select
            className="admin-select"
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value as typeof filtroEstado)}
            aria-label="Filtrar asistentes por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          {filtroEstado !== 'todos' && (
            <button type="button" className="secondary-btn filter-clear" onClick={() => setFiltroEstado('todos')}>
              Limpiar filtros
            </button>
          )}
          <span className="filter-count">
            Mostrando {asistentesVisibles.length} de {asistentes.length} · Límite {limite}
          </span>
        </div>

        <div className="admin-card table-card">
          <div className="table-scroll">
            <table className="admin-table asist-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asistente</th>
                  <th>Permisos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={5}><div className="asist-cargando" role="status"><Loader2 size={22} className="asist-spin" />Cargando asistentes...</div></td></tr>
                ) : asistentesVisibles.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="asist-vacio">
                        <strong>{asistentes.length ? 'No hay asistentes con estos filtros.' : 'Todavía no tienes asistentes.'}</strong>
                        {!asistentes.length && <span>Agrega una persona para delegar el acceso a secciones de este panel.</span>}
                      </div>
                    </td>
                  </tr>
                ) : asistentesVisibles.map((asistente) => {
                  const resumen = resumenPermisos(modulo, asistente.permisos);
                  return (
                    <tr key={asistente.id}>
                      <td><span className="usr-id">#{Math.abs(asistente.id)}</span></td>
                      <td>
                        <div className="usr-celda asist-celda">
                          <span className={`usr-avatar usr-av-${Math.abs(asistente.id) % 5}`}>
                            {asistente.foto_url
                              ? <img src={asistente.foto_url} alt="" />
                              : `${asistente.nombre[0] ?? ''}${asistente.apellido[0] ?? ''}`.toUpperCase()}
                          </span>
                          <div className="usr-celda-texto">
                            <strong>{asistente.nombre} {asistente.apellido}</strong>
                            <small>{asistente.correo}</small>
                            <small>{asistente.telefono}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="asist-chips">
                          {resumen.slice(0, 3).map((permiso) => (
                            <span className={`asist-chip nivel-${permiso.nivel}`} key={permiso.clave}>
                              {permiso.seccion} · {permiso.nivel}
                            </span>
                          ))}
                          {resumen.length > 3 && (
                            <span className="asist-chip mas" title={resumen.slice(3).map((p) => `${p.seccion} · ${p.nivel}`).join(', ')}>
                              +{resumen.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={asistente.activo}
                          aria-label={`${asistente.activo ? 'Desactivar' : 'Activar'} a ${asistente.nombre} ${asistente.apellido}`}
                          title={asistente.activo ? 'Desactivar asistente' : 'Activar asistente'}
                          className="asist-switch"
                          onClick={() => void cambiarEstado(asistente)}
                        >
                          <span className="asist-switch-perilla" />
                        </button>
                        <span className={`admin-badge ${asistente.activo ? 'activo' : 'inactivo'}`}>
                          {asistente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions asist-acciones">
                          <button type="button" className="asist-accion" title="Editar asistente" aria-label={`Editar a ${asistente.nombre}`}
                            onClick={() => abrirEdicion(asistente)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="asist-accion peligro" title="Dar de baja" aria-label={`Dar de baja a ${asistente.nombre}`}
                            onClick={() => void eliminar(asistente)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {modalAbierto && (() => {
        const ventana = (
          <AsistenteModal
            modulo={modulo}
            item={editando}
            correoAdmin={correoAdmin}
            correosExistentes={correosExistentes}
            onClose={() => { setModalAbierto(false); setEditando(null); }}
            onGuardar={guardar}
          />
        );
        return raizPanel ? createPortal(ventana, raizPanel) : ventana;
      })()}
    </>
  );
}
