import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { apiFetch, setToken } from '../services/api';

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
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    nombre_u?: string;
    apellido_u?: string;
    correo_u?: string;
    telefono_u?: string;
    ciudad_u?: string;
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
    role: nombresRoles.some((r) => r.toLowerCase().startsWith('admin')) ? 'admin' : 'participante',
    roles: nombresRoles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,

    async login(email, password) {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ correo_u: email, contrasena_u: password }),
      });

      setToken(data.token);
      setUser(buildUser(data.user));

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
      try {
        await apiFetch('/logout', { method: 'POST' });
      } catch {
        // si el token ya venció o falla la petición, igual limpiamos la sesión local
      }
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
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
