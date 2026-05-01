"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
        role: "instructor",
      });
      login(res.data.instructor, res.data.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Registration failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4">
            <GraduationCap className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Student AI
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Create your instructor account
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-5">
            Register
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Professor Smith"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="professor@university.edu"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
