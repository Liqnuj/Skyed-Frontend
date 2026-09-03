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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'skyed_user';

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

      const nombresRoles: string[] = data.user.roles.map(
        (r: { nombre_rol: string }) => r.nombre_rol
      );

      setUser({
        name: `${data.user.nombre_u} ${data.user.apellido_u}`,
        email: data.user.correo_u,
        role: nombresRoles.some((r) => r.toLowerCase().startsWith('admin')) ? 'admin' : 'participante',
        roles: nombresRoles,
      });

      return true;
    },

    async register(name, email, password) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!name || !email || password.length < 6) {
        throw new Error('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.');
      }
      setUser({
        name,
        email,
        role: 'participante',
        roles: ['participante'],
      });

      // Si el backend hace auto-login y devuelve el token, iniciamos la sesión de una vez
      if (data.token && data.user) {
        setToken(data.token);
        setUser({
          id: data.user.id_u,
          name: `${data.user.nombre_u} ${data.user.apellido_u}`,
          email: data.user.correo_u,
          role: 'participante', // Asignación por defecto para nuevos registros
        });
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
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
