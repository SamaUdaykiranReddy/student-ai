import { Brain } from "lucide-react";

export default function StudyPlan({ plan }: { plan: string }) {
  return (
    <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
          Your AI Study Plan
        </p>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {plan}
      </p>
    </div>
  );
}
