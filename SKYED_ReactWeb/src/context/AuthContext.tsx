import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { apiFetch, setToken } from '../services/api';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
      setUser({
        id: data.user.id_u,
        name: `${data.user.nombre_u} ${data.user.apellido_u}`,
        email: data.user.correo_u,
        role: data.user.roles[0]?.nombre_rol?.toLowerCase().includes('admin') ? 'admin' : 'participante',
      });
      return true;
    },
    
    // 3. Implementación real del registro usando tu utilidad apiFetch
    async register(userData) {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
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