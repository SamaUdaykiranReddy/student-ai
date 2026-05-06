"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import {
  AlertTriangle,
  Users,
  TrendingUp,
  LogOut,
  GraduationCap,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Student {
  id: string;
  name: string;
  email: string;
  cohort: string;
}

interface Prediction {
  student_id: string;
  risk_score: number;
  risk_label: string;
  at_risk: boolean;
  top_factors: Array<{ feature: string; impact: number }>;
  suggestion: string;
  cached: boolean;
}

interface StudentWithPrediction extends Student {
  prediction?: Prediction;
  loading?: boolean;
}

export default function DashboardPage() {
  const { instructor, logout } = useAuthStore();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudentWithPrediction | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<
    string,
    number
  > | null>(null);
  const fetchStudents = () => {
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/students`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      },
    )
      .then((res) => res.json())
      .then((json) => setStudents(json.students))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!instructor) {
      router.push("/");
      return;
    }
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/students`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      },
    )
      .then((res) => res.json())
      .then((json) => setStudents(json.students))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [instructor]);

  const getPrediction = async (student: StudentWithPrediction) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, loading: true } : s)),
    );
    try {
      const res = await api.post(`/api/predict/${student.id}`);
      const updated = { ...student, prediction: res.data, loading: false };
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? updated : s)),
      );
      setSelected(updated);
    } catch (err) {
      console.error(err);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, loading: false } : s)),
      );
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const riskColor = (label: string) => {
    if (label === "high") return "text-red-500 bg-red-50 dark:bg-red-900/20";
    if (label === "medium")
      return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-green-500 bg-green-50 dark:bg-green-900/20";
  };

  const riskBarColor = (label: string) => {
    if (label === "high") return "#ef4444";
    if (label === "medium") return "#eab308";
    return "#22c55e";
  };

  const highRisk = students.filter(
    (s) => s.prediction?.risk_label === "high",
  ).length;
  const mediumRisk = students.filter(
    (s) => s.prediction?.risk_label === "medium",
  ).length;
  const analyzed = students.filter((s) => s.prediction).length;
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/api/upload/csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data.summary);
      await fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              Student AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {instructor?.name}
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Student Risk Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Monitor and predict student performance risks
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Total Students
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {students.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                High Risk
              </span>
            </div>
            <p className="text-3xl font-semibold text-red-500">{highRisk}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Analyzed
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {analyzed}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-gray-900 dark:text-white text-sm">
                Upload Student Data
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload a CSV exported from your LMS
              </p>
            </div>
            <label
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload CSV"}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
          {uploadResult && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                Upload successful!
              </p>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xl font-semibold text-green-700">
                    {uploadResult.total_rows}
                  </p>
                  <p className="text-xs text-gray-500">Rows</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-green-700">
                    {uploadResult.students_created}
                  </p>
                  <p className="text-xs text-gray-500">Students added</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-green-700">
                    {uploadResult.engagement_logged}
                  </p>
                  <p className="text-xs text-gray-500">Engagement</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-green-700">
                    {uploadResult.errors}
                  </p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Required CSV format:
            </p>
            <p className="text-xs font-mono text-gray-400">
              name, email, cohort, gender, week, login_count, forum_posts,
              video_watch_minutes, assignment_submissions, score, submitted
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-white text-sm">
                Students
              </h2>
              <button
                onClick={fetchStudents}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  Loading students...
                </div>
              ) : students.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  No students found
                </div>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                      selected?.id === student.id
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : ""
                    }`}
                    onClick={() => setSelected(student)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {student.cohort}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {student.prediction && (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${riskColor(student.prediction.risk_label)}`}
                        >
                          {Math.round(student.prediction.risk_score * 100)}%
                          risk
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getPrediction(student);
                        }}
                        disabled={student.loading}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        {student.loading
                          ? "Analyzing..."
                          : student.prediction
                            ? "Re-analyze"
                            : "Analyze"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selected?.prediction ? (
              <>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    {selected.name}
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`text-2xl font-semibold ${
                        selected.prediction.risk_label === "high"
                          ? "text-red-500"
                          : selected.prediction.risk_label === "medium"
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {Math.round(selected.prediction.risk_score * 100)}%
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${riskColor(selected.prediction.risk_label)}`}
                    >
                      {selected.prediction.risk_label} risk
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    Risk Factors
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={selected.prediction.top_factors.map((f) => ({
                        name: f.feature.replace(/_/g, " "),
                        value: Math.abs(f.impact),
                        label: selected.prediction!.risk_label,
                      }))}
                      layout="vertical"
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          background: "var(--color-background-primary)",
                          border: "0.5px solid var(--color-border-tertiary)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="value" radius={4}>
                        {selected.prediction.top_factors.map((f, i) => (
                          <Cell
                            key={i}
                            fill={riskBarColor(selected.prediction!.risk_label)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    AI Recommendation
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selected.prediction.suggestion}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  Select a student and click Analyze to see their risk
                  assessment
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
