"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import api from "@/lib/api";

interface Alert {
  id: string;
  student_name: string;
  student_email: string;
  alert_type: string;
  message: string;
  study_plan: string;
  is_read: boolean;
  created_at: string;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAlerts = () => {
    api
      .get("/api/alerts")
      .then((res) => setAlerts(res.data.alerts || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markAsRead = (id: string) => {
    api
      .patch(`/api/alerts/${id}/read`)
      .then(() => {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)),
        );
      })
      .catch(console.error);
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const alertColor = (type: string) => {
    if (type === "no_login")
      return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10";
    if (type === "missed_assignments")
      return "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10";
    if (type === "low_score")
      return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10";
    return "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-gray-900 dark:text-white text-sm">
            AI Agent Alerts
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <Bell className="w-4 h-4 text-gray-400" />
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No alerts — all students are on track!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-3 ${alertColor(alert.alert_type)} ${alert.is_read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.student_name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {alert.message}
                  </p>
                  <button
                    onClick={() =>
                      setExpanded(expanded === alert.id ? null : alert.id)
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {expanded === alert.id
                      ? "Hide study plan"
                      : "View AI study plan"}
                  </button>
                  {expanded === alert.id && alert.study_plan && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {alert.study_plan}
                      </p>
                    </div>
                  )}
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
