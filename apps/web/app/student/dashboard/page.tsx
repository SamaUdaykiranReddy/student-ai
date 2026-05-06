"use client";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import { GraduationCap, LogOut } from "lucide-react";
import { useStudentDashboard } from "../../../hooks/useStudentDashboard";
import StatsGrid from "./components/StatsGrid";
import RiskScoreCard from "./components/RiskScoreCard";
import AssessmentList from "./components/AssessmentList";
import AIRecommendation from "./components/AIRecommendation";
import ActivityLogger from "./components/ActivityLogger";

export default function StudentDashboardPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const { data, loading, logForumPost, logVideo, submitAssignment } =
    useStudentDashboard(token);

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

  if (
    typeof window !== "undefined" &&
    !student &&
    !localStorage.getItem("student_token")
  ) {
    router.push("/student/login");
    return null;
  }

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

        <StatsGrid engagement={data.engagement} avgScore={avgScore} />

        <div className="grid grid-cols-2 gap-6">
          <RiskScoreCard riskScore={data.riskScore} />
          <div className="space-y-4">
            {data.riskScore?.suggestion && (
              <AIRecommendation suggestion={data.riskScore.suggestion} />
            )}
            <AssessmentList assessments={data.assessments} />
          </div>
        </div>

        <ActivityLogger
          onForumPost={logForumPost}
          onVideoLog={logVideo}
          onAssignmentSubmit={submitAssignment}
        />
      </main>
    </div>
  );
}
