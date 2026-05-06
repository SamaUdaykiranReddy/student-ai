import { useEffect, useState } from "react";

export interface Assessment {
  id: string;
  score: number;
  submitted: boolean;
  submitted_at: string;
  week: number;
}

export interface DashboardData {
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
    shap_factors: Array<{ feature: string; impact: number }>;
    suggestion: string;
  } | null;
  engagement: {
    login_count: number;
    forum_posts: number;
    video_watch_minutes: number;
    assignment_submissions: number;
  } | null;
  assessments: Assessment[];
}

export function useStudentDashboard(token: string | null) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("student_token") || token || "";
  };

  useEffect(() => {
    fetch(`${API}/api/student-auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const logForumPost = () => {
    fetch(`${API}/api/student-auth/activity/forum`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(() => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                engagement: {
                  ...prev.engagement!,
                  forum_posts: (prev.engagement?.forum_posts ?? 0) + 1,
                },
              }
            : prev,
        );
      })
      .catch(console.error);
  };

  const logVideo = (minutes: number) => {
    fetch(`${API}/api/student-auth/activity/video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ minutes }),
    })
      .then(() => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                engagement: {
                  ...prev.engagement!,
                  video_watch_minutes:
                    (prev.engagement?.video_watch_minutes ?? 0) + minutes,
                },
              }
            : prev,
        );
      })
      .catch(console.error);
  };

  const submitAssignment = (score: number) => {
    fetch(`${API}/api/student-auth/activity/assignment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ score }),
    })
      .then(() => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                assessments: [
                  {
                    id: crypto.randomUUID(),
                    score,
                    submitted: true,
                    submitted_at: new Date().toISOString(),
                    week: 0,
                  },
                  ...prev.assessments,
                ],
              }
            : prev,
        );
      })
      .catch(console.error);
  };

  return { data, loading, setData, logForumPost, logVideo, submitAssignment };
}
