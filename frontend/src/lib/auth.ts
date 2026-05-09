import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'Student' | 'Author' | 'Admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  setSession: (token: string, expiresAt: string, user: AuthUser) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      user: null,
      setSession: (token, expiresAt, user) => set({ token, expiresAt, user }),
      clear: () => set({ token: null, expiresAt: null, user: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token || !expiresAt) return false;
        return new Date(expiresAt).getTime() > Date.now();
      },
    }),
    { name: 'kursy-auth' },
  ),
);
