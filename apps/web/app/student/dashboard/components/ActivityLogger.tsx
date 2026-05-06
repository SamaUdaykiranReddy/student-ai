"use client";
import { useState } from "react";

interface Props {
  onForumPost: () => void;
  onVideoLog: (minutes: number) => void;
  onAssignmentSubmit: (score: number) => void;
}

export default function ActivityLogger({ onForumPost, onVideoLog, onAssignmentSubmit }: Props) {
  const [videoMinutes, setVideoMinutes] = useState("");
  const [assignmentScore, setAssignmentScore] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState({ forum: false, video: false, assignment: false });

  const notify = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleForum = () => {
    setLoading((l) => ({ ...l, forum: true }));
    onForumPost();
    notify("Forum post logged! ✅");
    setLoading((l) => ({ ...l, forum: false }));
  };

  const handleVideo = () => {
    const mins = parseInt(videoMinutes);
    if (!mins || mins <= 0) return;
    setLoading((l) => ({ ...l, video: true }));
    onVideoLog(mins);
    notify(`${mins} minutes of video logged! ✅`);
    setVideoMinutes("");
    setLoading((l) => ({ ...l, video: false }));
  };

  const handleAssignment = () => {
    const score = parseFloat(assignmentScore);
    if (isNaN(score) || score < 0 || score > 100) return;
    setLoading((l) => ({ ...l, assignment: true }));
    onAssignmentSubmit(score);
    notify(`Assignment submitted with score ${score}! ✅`);
    setAssignmentScore("");
    setLoading((l) => ({ ...l, assignment: false }));
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Log Activity</p>
      {message && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Forum Post</p>
          <p className="text-xs text-gray-400 mb-3">Click to log a forum post</p>
          <button onClick={handleForum} disabled={loading.forum}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
            {loading.forum ? "Logging..." : "Log Post"}
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Video Watch</p>
          <p className="text-xs text-gray-400 mb-3">Enter minutes watched</p>
          <div className="flex gap-2">
            <input type="number" value={videoMinutes} onChange={(e) => setVideoMinutes(e.target.value)} placeholder="mins"
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" />
            <button onClick={handleVideo} disabled={loading.video || !videoMinutes}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              {loading.video ? "..." : "Log"}
            </button>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Assignment</p>
          <p className="text-xs text-gray-400 mb-3">Enter your score (0-100)</p>
          <div className="flex gap-2">
            <input type="number" value={assignmentScore} onChange={(e) => setAssignmentScore(e.target.value)} placeholder="score" min="0" max="100"
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" />
            <button onClick={handleAssignment} disabled={loading.assignment || !assignmentScore}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              {loading.assignment ? "..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}