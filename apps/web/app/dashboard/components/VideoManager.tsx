"use client";
import { useEffect, useState } from "react";
import { Trash2, Plus, Video, Link, Upload } from "lucide-react";
import api from "@/lib/api";

interface VideoItem {
  id: string;
  title: string;
  description: string;
  url: string;
  duration_minutes: number;
  instructor_name: string;
  created_at: string;
}

export default function VideoManager() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadType, setUploadType] = useState<"url" | "file">("url");
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    duration_minutes: "",
  });
  const [file, setFile] = useState<File | null>(null);

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

    if (uploadType === "url") {
      api
        .post("/api/videos", {
          ...form,
          duration_minutes: parseInt(form.duration_minutes) || 0,
        })
        .then(() => {
          fetchVideos();
          setForm({
            title: "",
            description: "",
            url: "",
            duration_minutes: "",
          });
          setShowForm(false);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      if (!file) {
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("duration_minutes", form.duration_minutes || "0");

      api
        .post("/api/videos/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(() => {
          fetchVideos();
          setForm({
            title: "",
            description: "",
            url: "",
            duration_minutes: "",
          });
          setFile(null);
          setShowForm(false);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
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
            Add YouTube/Vimeo links or upload video files
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
          {/* Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUploadType("url")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                uploadType === "url"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <Link className="w-3 h-3" /> URL
            </button>
            <button
              type="button"
              onClick={() => setUploadType("file")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                uploadType === "file"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <Upload className="w-3 h-3" /> Upload File
            </button>
          </div>

          <input
            type="text"
            placeholder="Video title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
          />

          {uploadType === "url" ? (
            <input
              type="url"
              placeholder="YouTube or Vimeo URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          )}

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
              {loading
                ? "Adding..."
                : uploadType === "file"
                  ? "Upload & Add"
                  : "Add Video"}
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
