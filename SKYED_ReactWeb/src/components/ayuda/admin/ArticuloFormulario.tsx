import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import AyudaContenido from '../AyudaContenido';
import { ayudaAdminService } from '../../../services/ayudaAdminService';
import type {
  ArticuloAdmin,
  AudienciaArticulo,
  ComentarioAyuda,
  DatosArticulo,
  EstadoArticulo,
  ModuloContenido,
  OpcionesAyuda,
} from '../../../services/ayudaAdminService';
import Modal from './Modal';
import { mensajeDeError } from './tipos';
import '../../../styles/shared/ayuda.css';

const CONTEXTOS = [
  'auth.login', 'auth.registro', 'auth.recuperar', 'cuenta.ajustes',
  'social.reservar', 'social.reservas', 'social.pqr', 'deportivo.inscripcion',
];

const MODULO: Record<ModuloContenido, string> = { general: 'General', social: 'Social', deportivo: 'Deportivo' };
const ESTADO: Record<EstadoArticulo, string> = { borrador: 'Borrador', publicado: 'Publicado', desactivado: 'Desactivado' };
const AUDIENCIA: Record<AudienciaArticulo, string> = {
  publico: 'Público (incluye visitantes)',
  usuario: 'Personas con sesión',
  admin: 'Administradores',
};

interface Props {
  articulo: ArticuloAdmin | null;
  opciones: OpcionesAyuda;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => Promise<void>;
}

export default function ArticuloFormulario({ articulo, opciones, onCerrar, onGuardado }: Props) {
  const [f, setF] = useState(() => ({
    categoria_id: articulo?.categoria?.id ?? 0,
    titulo: articulo?.titulo ?? '',
    slug: articulo?.slug ?? '',
    resumen: articulo?.resumen ?? '',
    contenido: articulo?.contenido ?? '',
    palabras_clave: articulo?.palabras_clave ?? '',
    modulo: (articulo?.modulo ?? opciones.modulos[0] ?? 'social') as ModuloContenido,
    audiencia: (articulo?.audiencia ?? 'publico') as AudienciaArticulo,
    estado: (articulo?.estado ?? 'borrador') as EstadoArticulo,
    destacado: articulo?.destacado ?? false,
    faq: articulo?.faq ?? false,
    orden: articulo?.orden ?? 0,
    contexto: articulo?.contexto ?? '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [verPrevia, setVerPrevia] = useState(false);
  const [opiniones, setOpiniones] = useState<{ utiles: number; noUtiles: number; comentarios: ComentarioAyuda[] } | null>(null);

  const cambiar = <K extends keyof typeof f>(campo: K, valor: (typeof f)[K]) =>
    setF((previo) => ({ ...previo, [campo]: valor }));

  // Solo categorías generales o del mismo módulo del artículo.
  const categoriasValidas = opciones.categorias.filter((c) => c.modulo === 'general' || c.modulo === f.modulo);

  useEffect(() => {
    if (f.categoria_id && !categoriasValidas.some((c) => c.id === f.categoria_id)) {
      setF((previo) => ({ ...previo, categoria_id: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.modulo]);

  useEffect(() => {
    if (!articulo) return;
    let vigente = true;
    ayudaAdminService
      .articulo(articulo.id)
      .then((r) => {
        if (vigente) {
          setOpiniones({ utiles: r.articulo.utiles ?? 0, noUtiles: r.articulo.no_utiles ?? 0, comentarios: r.comentarios });
        }
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [articulo]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!f.categoria_id) {
      setError('Elige una categoría.');
      return;
    }

    const datos: DatosArticulo = {
      categoria_id: f.categoria_id,
      titulo: f.titulo.trim(),
      resumen: f.resumen.trim() || null,
      contenido: f.contenido,
      palabras_clave: f.palabras_clave.trim() || null,
      modulo: f.modulo,
      audiencia: f.audiencia,
      estado: f.estado,
      destacado: f.destacado,
      faq: f.faq,
      orden: Number(f.orden) || 0,
      contexto: f.contexto.trim() || null,
      ...(articulo && f.slug.trim() && f.slug.trim() !== articulo.slug ? { slug: f.slug.trim() } : {}),
    };

    setGuardando(true);
    try {
      if (articulo) {
        await ayudaAdminService.actualizarArticulo(articulo.id, datos);
        await onGuardado('Artículo actualizado.');
      } else {
        await ayudaAdminService.crearArticulo(datos);
        await onGuardado('Artículo creado.');
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el artículo.'));
      setGuardando(false);
    }
  };

  // En la vista previa los botones no deben sacar al admin de la pantalla.
  const bloquearEnlaces = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) e.preventDefault();
  };

  return (
    <Modal titulo={articulo ? 'Editar artículo' : 'Nuevo artículo'} onCerrar={onCerrar} bloqueado={guardando} ancho={900}>
      <form onSubmit={enviar}>
        <div className="ay-adm-modal-cuerpo">
          {error && (
            <p className="ay-adm-error" role="alert">
              {error}
            </p>
          )}

          <div className="ay-adm-form-grid">
            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-f-titulo">Título *</label>
              <input id="ay-f-titulo" required maxLength={150} value={f.titulo} onChange={(e) => cambiar('titulo', e.target.value)} placeholder="¿Cómo realizo una reserva?" />
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-modulo">Módulo *</label>
              <select id="ay-f-modulo" value={f.modulo} onChange={(e) => cambiar('modulo', e.target.value as ModuloContenido)}>
                {opciones.modulos.map((m) => (
                  <option key={m} value={m}>{MODULO[m]}</option>
                ))}
              </select>
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-categoria">Categoría *</label>
              <select id="ay-f-categoria" required value={f.categoria_id} onChange={(e) => cambiar('categoria_id', Number(e.target.value))}>
                <option value={0}>Elige una categoría…</option>
                {categoriasValidas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {!c.activa ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-audiencia">¿Quién lo ve? *</label>
              <select id="ay-f-audiencia" value={f.audiencia} onChange={(e) => cambiar('audiencia', e.target.value as AudienciaArticulo)}>
                {opciones.audiencias.map((a) => (
                  <option key={a} value={a}>{AUDIENCIA[a]}</option>
                ))}
              </select>
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-estado">Estado *</label>
              <select id="ay-f-estado" value={f.estado} onChange={(e) => cambiar('estado', e.target.value as EstadoArticulo)}>
                {opciones.estados.map((s) => (
                  <option key={s} value={s}>{ESTADO[s]}</option>
                ))}
              </select>
              <small>Solo «Publicado» lo ven los usuarios.</small>
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-f-resumen">Resumen</label>
              <textarea id="ay-f-resumen" rows={2} maxLength={300} value={f.resumen} onChange={(e) => cambiar('resumen', e.target.value)} />
              <small>{f.resumen.length}/300. Se muestra en las tarjetas y en las preguntas frecuentes.</small>
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-f-contenido">Contenido *</label>
              <textarea id="ay-f-contenido" required rows={12} maxLength={20000} value={f.contenido} onChange={(e) => cambiar('contenido', e.target.value)} className="ay-adm-mono" />
              <details className="ay-adm-formato">
                <summary>Cómo dar formato</summary>
                <ul>
                  <li><code>1. Texto</code>: pasos numerados (una línea por paso).</li>
                  <li><code>- Texto</code>: viñetas.</li>
                  <li><code>**texto**</code>: negrita.</li>
                  <li><code>[[Texto del botón|/social/reservar]]</code>: botón que lleva a una página de SKYED (solo rutas internas que empiecen con /).</li>
                  <li>Deja una línea en blanco para separar párrafos y listas.</li>
                </ul>
              </details>
              <button type="button" className="ay-adm-btn ay-adm-btn--suave" aria-expanded={verPrevia} onClick={() => setVerPrevia((v) => !v)}>
                <i className={`ti ${verPrevia ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" /> {verPrevia ? 'Ocultar vista previa' : 'Vista previa'}
              </button>
              {verPrevia && (
                <div
                  className={`ayuda ay-preview ay-${f.modulo === 'deportivo' ? 'deportivo' : 'social'}`}
                  onClickCapture={bloquearEnlaces}
                  aria-label="Vista previa del contenido"
                >
                  <h3 className="ay-adm-previa-titulo">{f.titulo || 'Sin título'}</h3>
                  {f.resumen && <p className="ay-lead">{f.resumen}</p>}
                  <AyudaContenido texto={f.contenido || 'Aún no hay contenido.'} />
                </div>
              )}
            </div>

            <div className="ay-adm-campo ay-adm-campo--completo">
              <label htmlFor="ay-f-claves">Palabras clave</label>
              <input id="ay-f-claves" maxLength={255} value={f.palabras_clave} onChange={(e) => cambiar('palabras_clave', e.target.value)} placeholder="reserva, cotizar, cancelar" />
              <small>Separadas por comas. Ayudan al buscador y a elegir los artículos relacionados.</small>
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-contexto">Pantalla donde aparece el «?»</label>
              <input id="ay-f-contexto" list="ay-contextos" maxLength={60} value={f.contexto} onChange={(e) => cambiar('contexto', e.target.value)} placeholder="social.reservar" />
              <datalist id="ay-contextos">
                {CONTEXTOS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <small>Opcional. Solo minúsculas, números, puntos y guiones.</small>
            </div>

            <div className="ay-adm-campo">
              <label htmlFor="ay-f-orden">Orden</label>
              <input id="ay-f-orden" type="number" min={0} max={9999} value={f.orden} onChange={(e) => cambiar('orden', Number(e.target.value))} />
              <small>Menor número = aparece primero.</small>
            </div>

            {articulo && (
              <div className="ay-adm-campo ay-adm-campo--completo">
                <label htmlFor="ay-f-slug">Dirección del artículo</label>
                <input id="ay-f-slug" maxLength={160} value={f.slug} onChange={(e) => cambiar('slug', e.target.value)} />
                <small>Cámbiala solo si es necesario: los enlaces guardados con la dirección anterior dejarán de funcionar.</small>
              </div>
            )}

            <div className="ay-adm-campo ay-adm-campo--completo ay-adm-checks">
              <label>
                <input type="checkbox" checked={f.destacado} onChange={(e) => cambiar('destacado', e.target.checked)} /> Destacado en la portada
              </label>
              <label>
                <input type="checkbox" checked={f.faq} onChange={(e) => cambiar('faq', e.target.checked)} /> Mostrar en preguntas frecuentes
              </label>
            </div>
          </div>

          {articulo && (
            <div className="ay-adm-opiniones">
              <h3>Opiniones de los lectores</h3>
              {opiniones === null ? (
                <p className="ay-adm-nota">Cargando…</p>
              ) : (
                <>
                  <p>
                    <strong>{opiniones.utiles}</strong> le fue útil · <strong>{opiniones.noUtiles}</strong> no le fue útil · <strong>{articulo.visitas}</strong> visitas
                  </p>
                  {opiniones.comentarios.length === 0 ? (
                    <p className="ay-adm-nota">Todavía no hay comentarios para mejorar este artículo.</p>
                  ) : (
                    <ul>
                      {opiniones.comentarios.map((c, i) => (
                        <li key={i}>
                          «{c.comentario}»
                          {c.fecha && <span className="ay-adm-slug"> · {new Date(c.fecha).toLocaleDateString('es-CO')}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="ay-adm-modal-pie">
          <button type="button" className="ay-adm-btn ay-adm-btn--suave" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="ay-adm-btn ay-adm-btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : articulo ? 'Guardar cambios' : 'Crear artículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}