import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'Student' | 'Author' | 'Admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailConfirmed?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  setSession: (token: string, expiresAt: string, refreshToken: string, user: AuthUser) => void;
  setAccess: (token: string, expiresAt: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      setSession: (token, expiresAt, refreshToken, user) =>
        set({ token, expiresAt, refreshToken, user }),
      setAccess: (token, expiresAt, refreshToken) =>
        set({ token, expiresAt, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, refreshToken: null, expiresAt: null, user: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token || !expiresAt) return false;
        return new Date(expiresAt).getTime() > Date.now();
      },
    }),
    { name: 'kursy-auth' },
  ),
);
