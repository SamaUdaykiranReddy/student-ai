import { AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RiskScore {
  risk_score: number;
  risk_label: string;
  shap_factors: Array<{ feature: string; impact: number }>;
  suggestion: string;
}

const riskColor = (label: string) => {
  if (label === "high") return "text-red-500";
  if (label === "medium") return "text-yellow-500";
  return "text-green-500";
};

const riskBg = (label: string) => {
  if (label === "high") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  if (label === "medium") return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
};

const riskBarColor = (label: string) => {
  if (label === "high") return "#ef4444";
  if (label === "medium") return "#eab308";
  return "#22c55e";
};

export default function RiskScoreCard({ riskScore }: { riskScore: RiskScore | null }) {
  if (!riskScore) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No risk score available yet</p>
        </div>
      </div>
    );
  }

  const factors = riskScore.shap_factors ?? [];

  return (
    <div className={`rounded-2xl border p-6 ${riskBg(riskScore.risk_label)}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Your Risk Score</p>
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-5xl font-bold ${riskColor(riskScore.risk_label)}`}>
          {Math.round(riskScore.risk_score * 100)}%
        </span>
        <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${riskColor(riskScore.risk_label)} bg-white/50 dark:bg-black/20`}>
          {riskScore.risk_label} risk
        </span>
      </div>
      {factors.length > 0 && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Risk Factors</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={factors.map((f) => ({ name: f.feature.replace(/_/g, " "), value: Math.abs(f.impact) }))} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" radius={4}>
                {factors.map((_, i) => <Cell key={i} fill={riskBarColor(riskScore.risk_label)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}