"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../store/studentAuthStore";
import { GraduationCap, LogOut, ArrowLeft, CheckCircle } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  duration_minutes: number;
  instructor_name: string;
  created_at: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideosPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Video | null>(null);
  const [canMarkWatched, setCanMarkWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";
  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("student_token") || token || "";
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT) {
      setYtReady(true);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
  }, []);

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

  const getYouTubeId = (url: string) => {
    if (url.includes("youtube.com/watch"))
      return url.split("v=")[1]?.split("&")[0];
    if (url.includes("youtu.be/"))
      return url.split("youtu.be/")[1]?.split("?")[0];
    return null;
  };

  const handleWatch = (video: Video) => {
    setSelected(video);
    setCanMarkWatched(false);
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (!selected || !ytReady) return;
    const ytId = getYouTubeId(selected.url);
    if (!ytId) return;

    // Small delay to ensure div is rendered
    setTimeout(() => {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: ytId,
        playerVars: { autoplay: 1, modestbranding: 1 },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              intervalRef.current = setInterval(() => {
                const duration = playerRef.current?.getDuration?.() || 0;
                const currentTime = playerRef.current?.getCurrentTime?.() || 0;
                if (duration > 0 && duration - currentTime <= 10) {
                  setCanMarkWatched(true);
                  clearInterval(intervalRef.current);
                }
              }, 1000);
            } else {
              clearInterval(intervalRef.current);
            }
          },
        },
      });
    }, 500);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [selected, ytReady]);

  const markAsWatched = (videoId: string) => {
    if (watched.has(videoId) || !canMarkWatched) return;
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
                onClick={() => {
                  setSelected(null);
                  setCanMarkWatched(false);
                  if (playerRef.current) playerRef.current.destroy();
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
            <div
              id="yt-player"
              className="w-full rounded-xl overflow-hidden"
              style={{ minHeight: "360px" }}
            />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">{selected.description}</p>
              <div className="flex items-center gap-3">
                {!canMarkWatched && !watched.has(selected.id) && (
                  <p className="text-xs text-gray-400">
                    Watch until the last 10 seconds to mark as watched
                  </p>
                )}
                <button
                  onClick={() => markAsWatched(selected.id)}
                  disabled={
                    !canMarkWatched || watched.has(selected.id) || loading
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    watched.has(selected.id)
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : canMarkWatched
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {watched.has(selected.id) ? "Watched!" : "Mark as Watched"}
                </button>
              </div>
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
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
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
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
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
