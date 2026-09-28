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
const initialUser = savedUserStr ? JSON.parse(savedUserStr) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: localStorage.getItem('token'),
  isLoading: false,
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('top3_user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('top3_user');
    set({ user: null, token: null });
  },
  setLoading: (status) => set({ isLoading: status }),
}));
