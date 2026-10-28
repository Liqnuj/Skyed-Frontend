import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { apiFetch, getToken, setToken, SESION_INVALIDA } from '../services/api';
import TransicionSesion, { moduloActual, type EstadoTransicion } from '../components/shared/TransicionSesion';

/* Tiempos de la animación de inicio / cierre de sesión (ms). La fase "cargando"
   dura lo que tarde el servidor, con un mínimo para que no parpadee. */
const MINIMO_CARGANDO = 700;
const DURACION_LISTO = 750;
const DURACION_SALIDA = 450;

const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const primerNombre = (nombre?: string) => nombre?.trim().split(/\s+/)[0] || undefined;
/** Lo que muestra la animación de la persona: primer nombre, iniciales y foto. */
const datosPersona = (u?: User | null) =>
  u ? { nombre: primerNombre(u.name), nombreCompleto: u.name, foto: u.foto_url } : {};

export interface RegisterData {
  tipo_documento_u: string;
  documento_u: number;
  nombre_u: string;
  apellido_u: string;
  telefono_u: string;
  correo_u: string;
  fecha_nacimiento_u: string;
  contrasena_u: string;
  contrasena_u_confirmation: string;
  contexto?: 'deportivo' | 'social';
}

interface AuthContextValue {
  user: User | null;
  /** true mientras se confirma con el servidor que la sesión guardada es real. */
  verificando: boolean;
  login: (identificacion: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
    updateProfile: (data: {
    nombre_u?: string;
    apellido_u?: string;
    correo_u?: string;
    telefono_u?: string;
    ciudad_u?: string;
    tipo_documento_u?: string;
    documento_u?: number;
    rh_u?: string;
    fecha_nacimiento_u?: string;
  }) => Promise<void>;
  updateFotoUrl: (fotoUrl: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'skyed_user';

function buildUser(apiUser: any): User {
  const nombresRoles: User['roles'] = apiUser.roles.map(
    (r: { nombre_rol: string }) => r.nombre_rol
  );
  return {
    id: apiUser.id_u,
    name: `${apiUser.nombre_u} ${apiUser.apellido_u}`,
    email: apiUser.correo_u,
    telefono: apiUser.telefono_u,
    ciudad: apiUser.ciudad_u,
    foto_url: apiUser.foto_url ?? null,
    tipo_documento: apiUser.tipo_documento_u ?? '',
    documento: apiUser.documento_u != null ? String(apiUser.documento_u) : '',
    rh: apiUser.rh_u ?? '',
    fecha_nacimiento: apiUser.fecha_nacimiento_u ?? null,
    role: nombresRoles.some((r) => r.toLowerCase().startsWith('admin')) ? 'admin' : 'participante',
    roles: nombresRoles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Animación de pantalla completa al iniciar o cerrar sesión.
  const [transicion, setTransicion] = useState<EstadoTransicion | null>(null);
  const timersTransicion = useRef<number[]>([]);

  const limpiarTimers = () => {
    timersTransicion.current.forEach((t) => window.clearTimeout(t));
    timersTransicion.current = [];
  };

  /** Muestra el saludo final y después desvanece la pantalla. */
  const terminarTransicion = (persona?: User | null) => {
    limpiarTimers();
    setTransicion((t) => (t ? { ...t, fase: 'listo', ...datosPersona(persona) } : t));
    timersTransicion.current.push(
      window.setTimeout(() => setTransicion((t) => (t ? { ...t, fase: 'saliendo' } : t)), DURACION_LISTO),
      window.setTimeout(() => setTransicion(null), DURACION_LISTO + DURACION_SALIDA),
    );
  };

  /** Si algo falla (p. ej. contraseña incorrecta) se desvanece sin el ✓. */
  const cancelarTransicion = () => {
    limpiarTimers();
    setTransicion((t) => (t ? { ...t, fase: 'saliendo' } : t));
    timersTransicion.current.push(window.setTimeout(() => setTransicion(null), DURACION_SALIDA));
  };

  useEffect(() => limpiarTimers, []);

  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  // Lo guardado en localStorage (usuario y roles) lo puede editar cualquiera
  // desde el inspector, así que al abrir la app se vuelve a pedir el usuario
  // al servidor (GET /me, validado por el token) y se reemplaza lo local.
  // Mientras tanto las rutas protegidas esperan (`verificando`).
  const [verificando, setVerificando] = useState<boolean>(() => !!getToken() || !!localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    let activo = true;
    if (!getToken()) {
      // Hay un "usuario" guardado pero ningún token: no es una sesión real.
      setUser(null);
      setVerificando(false);
      return;
    }
    apiFetch('/me')
      .then((data) => { if (activo && data?.user) setUser(buildUser(data.user)); })
      .catch(() => {
        // Un 401 ya cierra la sesión (evento SESION_INVALIDA). Otros fallos
        // (API caída, sin red) no deben sacar al usuario.
      })
      .finally(() => { if (activo) setVerificando(false); });
    return () => { activo = false; };
  }, []);

  // El servidor rechazó el token: se limpia la sesión local.
  useEffect(() => {
    const cerrar = () => { setToken(null); setUser(null); };
    window.addEventListener(SESION_INVALIDA, cerrar);
    return () => window.removeEventListener(SESION_INVALIDA, cerrar);
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    verificando,

    async login(identificacion, password) {
      limpiarTimers();
      setTransicion({ tipo: 'login', fase: 'cargando', modulo: moduloActual() });
      const minimo = esperar(MINIMO_CARGANDO);

      let data;
      try {
        data = await apiFetch('/login', {
          method: 'POST',
          // 'identificacion' = correo o número de documento (así lo pide POST /login).
          body: JSON.stringify({ identificacion, contrasena_u: password }),
        });
        await minimo;
      } catch (err) {
        await minimo;
        cancelarTransicion();
        throw err;
      }

      setToken(data.token);
      const nuevo = buildUser(data.user);
      setUser(nuevo);
      terminarTransicion(nuevo);

      return true;
    },

    async register(userData) {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (data.token && data.user) {
        setToken(data.token);
        setUser(buildUser(data.user));
      }
    },

    async logout() {
      const persona = user;
      limpiarTimers();
      // Al cerrar sesión ya se sabe quién es: el avatar y el nombre salen desde el inicio.
      setTransicion({ tipo: 'logout', fase: 'cargando', modulo: moduloActual(), ...datosPersona(persona) });

      await Promise.all([
        apiFetch('/logout', { method: 'POST' }).catch(() => {
          // si el token ya venció o falla la petición, igual limpiamos la sesión local
        }),
        esperar(MINIMO_CARGANDO),
      ]);
      setToken(null);
      setUser(null);
      terminarTransicion(persona);
    },

      async deleteAccount() {
      await apiFetch('/perfil', { method: 'DELETE' });
      setToken(null);
      setUser(null);
    },

        async updateProfile(data) {
      const res = await apiFetch('/perfil', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setUser(buildUser(res.user));
    },

    updateFotoUrl(fotoUrl) {
      setUser((prev) => (prev ? { ...prev, foto_url: fotoUrl } : prev));
    },
  }), [user, verificando]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {transicion && <TransicionSesion estado={transicion} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
