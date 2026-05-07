"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import {
  GraduationCap,
  LogOut,
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  instructor_name: string;
}

interface Submission {
  id: string;
  answer: string;
  score: number | null;
  submitted_at: string;
}

export default function AssignmentsPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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
      return;
    }
    fetch(`${API}/api/assignments`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setAssignments(json.assignments || []))
      .catch(console.error);
  }, []);

  const handleSelect = (assignment: Assignment) => {
    setSelected(assignment);
    setSubmission(null);
    setAnswer("");
    setMessage("");
    fetch(`${API}/api/assignments/${assignment.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setSubmission(json.submission || null))
      .catch(console.error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !answer.trim()) return;
    setSubmitting(true);
    fetch(`${API}/api/assignments/${selected.id}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answer }),
    })
      .then((res) => res.json())
      .then((json) => {
        setSubmission(json.submission);
        setMessage("Assignment submitted successfully! ✅");
        setAnswer("");
      })
      .catch(console.error)
      .finally(() => setSubmitting(false));
  };

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Assignments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            View and submit your assignments
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No assignments yet</p>
              </div>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => handleSelect(assignment)}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 cursor-pointer transition-colors ${
                    selected?.id === assignment.id
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {assignment.title}
                    </h3>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {assignment.max_score} pts
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            {selected ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="font-medium text-gray-900 dark:text-white mb-1">
                  {selected.title}
                </h2>
                {selected.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {selected.description}
                  </p>
                )}

                {message && (
                  <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
                    {message}
                  </div>
                )}

                {submission ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Submitted</span>
                      {submission.score !== null && (
                        <span className="text-sm">
                          · Score: {submission.score}/{selected.max_score}
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {submission.answer}
                      </p>
                    </div>
                    {submission.score === null && (
                      <p className="text-xs text-gray-400">
                        Waiting for instructor to grade...
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Write your answer here..."
                      rows={6}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !answer.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 rounded-xl text-sm transition-colors"
                    >
                      {submitting ? "Submitting..." : "Submit Assignment"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  Select an assignment to view and submit
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
