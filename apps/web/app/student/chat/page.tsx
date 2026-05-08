"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import {
  GraduationCap,
  LogOut,
  ArrowLeft,
  Send,
  Bot,
  User,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function ChatPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI study assistant. Ask me anything about your course materials, assignments, or how to improve your performance! 📚",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("student_token") || token || "";
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !student &&
      !localStorage.getItem("student_token")
    ) {
      router.push("/student/login");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    fetch(`${API}/api/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: userMessage }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.answer ||
              "Sorry, I couldn't process that. Please try again.",
            sources: data.sources,
          },
        ]);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      })
      .finally(() => setLoading(false));
  };

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              Student AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/student/dashboard")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {student?.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-6 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            AI Study Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Ask questions about your course materials
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 overflow-y-auto mb-4 space-y-4 min-h-96">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </div>
              <div
                className={`max-w-lg ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <p className="text-xs text-gray-400">
                    Sources: {msg.sources.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your course, assignments, or study tips..."
            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-3 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
