export default function AIRecommendation({ suggestion }: { suggestion: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">AI Recommendation</p>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{suggestion}</p>
    </div>
  );
}