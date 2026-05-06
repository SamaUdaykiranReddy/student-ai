 import { create } from "zustand";

interface Student {
  id: string;
  name: string;
  email: string;
  cohort: string;
}

interface StudentAuthStore {
  student: Student | null;
  token: string | null;
  login: (student: Student, token: string) => void;
  logout: () => void;
}

export const useStudentAuthStore = create<StudentAuthStore>((set) => ({
  student: null,
  token: null,
  login: (student, token) => {
    localStorage.setItem("student_token", token);
    set({ student, token });
  },
  logout: () => {
    localStorage.removeItem("student_token");
    set({ student: null, token: null });
  },
}));