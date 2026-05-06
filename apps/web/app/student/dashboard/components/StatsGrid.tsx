interface Engagement {
  login_count: number;
  forum_posts: number;
  video_watch_minutes: number;
  assignment_submissions: number;
}

import { Activity, TrendingUp, BookOpen, AlertTriangle } from "lucide-react";

export default function StatsGrid({ engagement, avgScore }: { engagement: Engagement | null; avgScore: number | null }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">Logins</span>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{engagement?.login_count ?? "—"}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">Forum Posts</span>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{engagement?.forum_posts ?? "—"}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</span>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{avgScore ?? "—"}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">Submissions</span>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{engagement?.assignment_submissions ?? "—"}</p>
      </div>
    </div>
  );
}