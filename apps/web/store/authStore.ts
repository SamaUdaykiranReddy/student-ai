import { create } from "zustand";

interface Instructor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthStore {
  instructor: Instructor | null;
  token: string | null;
  login: (instructor: Instructor, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  instructor: null,
  token: null,
  login: (instructor, token) => {
    localStorage.setItem("token", token);
    set({ instructor, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ instructor: null, token: null });
  },
}));