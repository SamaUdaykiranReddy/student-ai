import { Assessment } from "../../../../hooks/useStudentDashboard";

export default function AssessmentList({ assessments }: { assessments: Assessment[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Assessments</p>
      {assessments.length === 0 ? (
        <p className="text-sm text-gray-400">No assessments yet</p>
      ) : (
        <div className="space-y-2">
          {assessments.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <span className="text-xs text-gray-500">
                {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : `Week ${a.week}`}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${a.score >= 70 ? "text-green-500" : a.score >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                  {a.score}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.submitted ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {a.submitted ? "Submitted" : "Missing"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}