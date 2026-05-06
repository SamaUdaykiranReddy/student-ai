"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import {
  GraduationCap,
  LogOut,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Activity,
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

interface DashboardData {
  student: {
    id: string;
    name: string;
    email: string;
    cohort: string;
    enrolled_at: string;
  };
  riskScore: {
    risk_score: number;
    risk_label: string;
    top_factors: Array<{ feature: string; impact: number }>;
    suggestion: string;
  } | null;
  engagement: {
    login_count: number;
    forum_posts: number;
    video_watch_minutes: number;
    assignment_submissions: number;
  } | null;
  assessments: Array<{
    id: string;
    score: number;
    submitted: boolean;
    submitted_at: string;
    week: number;
  }>;
}

export default function StudentDashboardPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("student_token");
    if (!student && !storedToken) {
      router.push("/student/login");
      return;
    }
    const t = token || storedToken || "";

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"}/api/student-auth/me`,
      { headers: { Authorization: `Bearer ${t}` } },
    )
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

  const riskColor = (label: string) => {
    if (label === "high") return "text-red-500";
    if (label === "medium") return "text-yellow-500";
    return "text-green-500";
  };

  const riskBg = (label: string) => {
    if (label === "high")
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    if (label === "medium")
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  };

  const riskBarColor = (label: string) => {
    if (label === "high") return "#ef4444";
    if (label === "medium") return "#eab308";
    return "#22c55e";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">
          Failed to load dashboard. Please try again.
        </p>
      </div>
    );
  }

  const avgScore = data.assessments.length
    ? Math.round(
        data.assessments.reduce((a, b) => a + b.score, 0) /
          data.assessments.length,
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {data.student.name}
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
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome back, {data.student.name.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Cohort: {data.student.cohort}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Logins
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {data.engagement?.login_count ?? "—"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Forum Posts
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {data.engagement?.forum_posts ?? "—"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Avg Score
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {avgScore ?? "—"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Submissions
              </span>
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {data.engagement?.assignment_submissions ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Risk Score */}
          {data.riskScore ? (
            <div
              className={`rounded-2xl border p-6 ${riskBg(data.riskScore.risk_label)}`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Your Risk Score
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`text-5xl font-bold ${riskColor(data.riskScore.risk_label)}`}
                >
                  {Math.round(data.riskScore.risk_score * 100)}%
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${riskColor(data.riskScore.risk_label)} bg-white/50 dark:bg-black/20`}
                >
                  {data.riskScore.risk_label} risk
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Risk Factors
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={data.riskScore.top_factors.map((f) => ({
                    name: f.feature.replace(/_/g, " "),
                    value: Math.abs(f.impact),
                  }))}
                  layout="vertical"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={4}>
                    {data.riskScore.top_factors.map((_, i) => (
                      <Cell
                        key={i}
                        fill={riskBarColor(data.riskScore!.risk_label)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  No risk score available yet
                </p>
              </div>
            </div>
          )}

          {/* AI Recommendation + Assessments */}
          <div className="space-y-4">
            {data.riskScore?.suggestion && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                  AI Recommendation
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.riskScore.suggestion}
                </p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Recent Assessments
              </p>
              {data.assessments.length === 0 ? (
                <p className="text-sm text-gray-400">No assessments yet</p>
              ) : (
                <div className="space-y-2">
                  {data.assessments.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-xs text-gray-500">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleDateString()
                          : `Week ${a.week}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${a.score >= 70 ? "text-green-500" : a.score >= 50 ? "text-yellow-500" : "text-red-500"}`}
                        >
                          {a.score}%
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${a.submitted ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}
                        >
                          {a.submitted ? "Submitted" : "Missing"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
