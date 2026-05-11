"use client";
import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface Metric {
  auc_score: number;
  data_size: number;
  at_risk_rate: number;
  created_at: string;
}

export default function ModelHealth() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
    fetch(`${API}/api/model/drift`)
      .then((res) => res.json())
      .then((data) => setMetrics(data.metrics || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchMetrics = () => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
    setLoading(true);
    fetch(`${API}/api/model/drift`)
      .then((res) => res.json())
      .then((data) => setMetrics(data.metrics || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const latest = metrics[0];
  const previous = metrics[1];
  const drift = previous
    ? ((previous.auc_score - (latest?.auc_score || 0)) / previous.auc_score) *
      100
    : 0;
  const isDrifting = drift > 10;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-medium text-gray-900 dark:text-white text-sm">
            Model Health
          </h2>
          {latest && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${isDrifting ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"}`}
            >
              {isDrifting ? "⚠️ Drift Detected" : "✅ Healthy"}
            </span>
          )}
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {metrics.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No model metrics yet. Trigger a retrain to see health data.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Current AUC</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {latest?.auc_score.toFixed(3)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Data Size</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {latest?.data_size}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">At Risk Rate</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {((latest?.at_risk_rate || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {previous && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl ${isDrifting ? "bg-red-50 dark:bg-red-900/10" : "bg-green-50 dark:bg-green-900/10"}`}
            >
              {isDrifting ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {isDrifting
                  ? `Performance dropped ${drift.toFixed(1)}% from baseline (${previous.auc_score.toFixed(3)} → ${latest?.auc_score.toFixed(3)})`
                  : `Model performing well. ${Math.abs(drift).toFixed(1)}% change from baseline.`}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              History
            </p>
            {metrics.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <span className="text-gray-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  AUC: {m.auc_score.toFixed(4)}
                </span>
                <span className="text-gray-400">{m.data_size} students</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
