import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  // The access/refresh tokens live in httpOnly cookies and are never readable by JS.
  // We persist only the user profile for UX; the cookie is the real source of auth.
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => set({ user, isAuthenticated: true }),
      logout: async () => {
        try {
          await authApi.logout(); // revoke the session server-side + clear cookies
        } catch {
          // ignore — clear locally regardless
        }
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
