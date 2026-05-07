"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import {
  GraduationCap,
  LogOut,
  ArrowLeft,
  Play,
  CheckCircle,
} from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  duration_minutes: number;
  instructor_name: string;
  created_at: string;
}

export default function VideosPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("student_token") || token || "";
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !student &&
      !localStorage.getItem("student_token")
    ) {
      router.push("/student/login");
      return;
    }
    fetch(`${API}/api/videos`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setVideos(json.videos || []))
      .catch(console.error);
  }, []);

  const handleWatch = (video: Video) => {
    setSelected(video);
  };

  const markAsWatched = (videoId: string) => {
    if (watched.has(videoId)) return;
    setLoading(true);
    fetch(`${API}/api/videos/${videoId}/watch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(() =>
        setWatched((prev) => new Set(Array.from(prev).concat(videoId))),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com/")) {
      const videoId = url.split("vimeo.com/")[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

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
            <button
              onClick={() => router.push("/student/dashboard")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {student?.name}
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Videos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Watch course videos and track your progress
          </p>
        </div>

        {selected && (
          <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-900 dark:text-white">
                {selected.title}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
            <div
              className="relative w-full"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                src={getEmbedUrl(selected.url)}
                className="absolute inset-0 w-full h-full rounded-xl"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">{selected.description}</p>
              <button
                onClick={() => markAsWatched(selected.id)}
                disabled={watched.has(selected.id) || loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  watched.has(selected.id)
                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {watched.has(selected.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Watched!
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Mark as Watched
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-sm text-gray-400">
              No videos available yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 transition-colors ${
                  watched.has(video.id)
                    ? "border-green-200 dark:border-green-800"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {video.title}
                  </h3>
                  {watched.has(video.id) && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                {video.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {video.duration_minutes} min · {video.instructor_name}
                  </span>
                  <button
                    onClick={() => handleWatch(video)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Play className="w-3 h-3" />
                    Watch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
