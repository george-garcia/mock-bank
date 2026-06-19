import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/api';

export interface Staff {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'auditor';
}

interface AuthState {
  // The staff access/refresh tokens live in httpOnly cookies and are never readable by JS.
  // We persist only the staff profile for UX; the cookie is the real source of auth.
  staff: Staff | null;
  isAuthenticated: boolean;
  setAuth: (staff: Staff) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      isAuthenticated: false,
      setAuth: (staff) => set({ staff, isAuthenticated: true }),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore — clear locally regardless
        }
        set({ staff: null, isAuthenticated: false });
      },
    }),
    { name: 'admin-auth-storage' },
  ),
);
