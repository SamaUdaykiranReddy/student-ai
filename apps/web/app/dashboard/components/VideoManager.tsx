"use client";
import { useEffect, useState } from "react";
import { Trash2, Plus, Video } from "lucide-react";
import api from "@/lib/api";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  duration_minutes: number;
  instructor_name: string;
  created_at: string;
}

export default function VideoManager() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    duration_minutes: "",
  });

  const fetchVideos = () => {
    api
      .get("/api/videos")
      .then((res) => setVideos(res.data.videos || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    api
      .post("/api/videos", {
        ...form,
        duration_minutes: parseInt(form.duration_minutes) || 0,
      })
      .then(() => {
        fetchVideos();
        setForm({ title: "", description: "", url: "", duration_minutes: "" });
        setShowForm(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = (id: string) => {
    api
      .delete(`/api/videos/${id}`)
      .then(() => fetchVideos())
      .catch(console.error);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-medium text-gray-900 dark:text-white text-sm">
            Course Videos
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Add YouTube or Vimeo links for students
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Video
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Video title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="url"
            placeholder="YouTube or Vimeo URL"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Duration (mins)"
              value={form.duration_minutes}
              onChange={(e) =>
                setForm({ ...form, duration_minutes: e.target.value })
              }
              className="w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? "Adding..." : "Add Video"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-6">
          <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No videos yet. Add your first video!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {video.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{video.url}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400">
                  {video.duration_minutes} min
                </span>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
