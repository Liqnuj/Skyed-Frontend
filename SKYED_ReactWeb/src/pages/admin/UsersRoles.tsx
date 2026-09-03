import { useEffect, useState } from 'react';
import { userService, type UserWithRoles } from '../../services/userRoleService';
import Protected from '../../components/Protected';

const ROLES_DISPONIBLES = ['cliente', 'participante', 'adminSocial', 'adminDeportivo'];
const CONTEXTOS_DISPONIBLES = ['social', 'deportivo', 'general'];

function UsersRolesContent() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const [rolSeleccionado, setRolSeleccionado] = useState<Record<number, string>>({});
  const [contextoSeleccionado, setContextoSeleccionado] = useState<Record<number, string>>({});

  function cargar() {
    setLoading(true);
    userService
      .listar()
      .then((res) => setUsers(res.data))
      .catch(() => setError('No se pudieron cargar los usuarios.'))
      .finally(() => setLoading(false));
  }

  useEffect(cargar, []);

  async function asignar(userId: number) {
    const nombre_rol = rolSeleccionado[userId] ?? ROLES_DISPONIBLES[0];
    const contexto = contextoSeleccionado[userId] ?? CONTEXTOS_DISPONIBLES[0];

    setBusyUserId(userId);
    setError('');

    try {
      await userService.asignarRol(userId, nombre_rol, contexto);
      cargar();
    } catch {
      setError('No se pudo asignar el rol.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function quitar(userId: number, rolId: number, contexto: string) {
    setBusyUserId(userId);
    setError('');

    try {
      await userService.quitarRol(userId, rolId, contexto);
      cargar();
    } catch {
      setError('No se pudo quitar el rol.');
    } finally {
      setBusyUserId(null);
    }
  }

  if (loading) return <p className="container section">Cargando usuarios...</p>;

  return (
    <main className="dashboard section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow social">ADMINISTRACIÓN</span>
            <h1>Usuarios y roles</h1>
          </div>
        </div>

        {error && <p className="form-error error">{error}</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Roles actuales</th>
                <th>Asignar nuevo rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id_u}>
                  <td>#{u.id_u}</td>
                  <td>
                    {u.nombre_u} {u.apellido_u}
                  </td>
                  <td>{u.correo_u}</td>
                  <td>
                    {u.roles.length === 0 && <span>— sin roles —</span>}
                    {u.roles.map((r) => (
                      <div key={`${r.id_rol}-${r.pivot.contexto}`} style={{ marginBottom: 4 }}>
                        <span className="eyebrow social">
                          {r.nombre_rol} ({r.pivot.contexto})
                        </span>{' '}
                        <button
                          className="button social-btn small"
                          disabled={busyUserId === u.id_u}
                          onClick={() => quitar(u.id_u, r.id_rol, r.pivot.contexto)}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </td>
                  <td>
                    <select
                      value={rolSeleccionado[u.id_u] ?? ROLES_DISPONIBLES[0]}
                      onChange={(e) =>
                        setRolSeleccionado((s) => ({ ...s, [u.id_u]: e.target.value }))
                      }
                    >
                      {ROLES_DISPONIBLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <select
                      value={contextoSeleccionado[u.id_u] ?? CONTEXTOS_DISPONIBLES[0]}
                      onChange={(e) =>
                        setContextoSeleccionado((s) => ({ ...s, [u.id_u]: e.target.value }))
                      }
                    >
                      {CONTEXTOS_DISPONIBLES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button social-btn small"
                      disabled={busyUserId === u.id_u}
                      onClick={() => asignar(u.id_u)}
                    >
                      Asignar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5}>No hay usuarios registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function UsersRoles() {
  return (
    <Protected requireRole={['adminSocial', 'adminDeportivo']}>
      <UsersRolesContent />
    </Protected>
  );
}
