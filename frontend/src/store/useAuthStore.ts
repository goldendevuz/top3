import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (status: boolean) => void;
  isLoading: boolean;
}

const savedUserStr = localStorage.getItem('top3_user');
let initialUser: User | null = null;
if (savedUserStr) {
  try {
    const parsed = JSON.parse(savedUserStr);
    initialUser = parsed?.user || parsed;
  } catch (e) {
    initialUser = null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: localStorage.getItem('token'),
  isLoading: false,
  login: (user, token) => {
    const normalizedUser = (user as any)?.user || user;
    const normalizedToken = token || (user as any)?.token || localStorage.getItem('token');
    if (normalizedToken) localStorage.setItem('token', normalizedToken);
    localStorage.setItem('top3_user', JSON.stringify(normalizedUser));
    set({ user: normalizedUser, token: normalizedToken });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('top3_user');
    set({ user: null, token: null });
  },
  setLoading: (status) => set({ isLoading: status }),
}));
