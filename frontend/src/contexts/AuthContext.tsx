/**
 * src/contexts/AuthContext.tsx
 * Provider quản lý JWT user state toàn app
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

export interface User {
  id: number;
  hcmutId: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'OPERATOR' | 'ADMIN';
  feeTier: 'STANDARD' | 'EXEMPT';
  licensePlate?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (hcmutId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('spms_user');
    const token = localStorage.getItem('spms_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (hcmutId: string, password: string) => {
    const { data } = await authApi.login(hcmutId, password);
    localStorage.setItem('spms_token', data.accessToken);
    localStorage.setItem('spms_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('spms_token');
    localStorage.removeItem('spms_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
