"use client";
import { useState } from "react";

interface Reply {
  id: string;
  content: string;
  student_name: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  student_name: string;
  created_at: string;
  reply_count: number;
}

interface Props {
  post: Post;
  replies: Reply[];
  onReply: (content: string) => void;
  loading: boolean;
}

export default function PostDetail({ post, replies, onReply, loading }: Props) {
  const [replyContent, setReplyContent] = useState("");

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    onReply(replyContent);
    setReplyContent("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{post.title}</h2>
        <p className="text-xs text-gray-400 mb-4">{post.student_name} · {new Date(post.created_at).toLocaleDateString()}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
          {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
        </p>
        {replies.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No replies yet. Be the first to reply!</p>
        ) : (
          <div className="space-y-4 mb-4">
            {replies.map((reply) => (
              <div key={reply.id} className="border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                <p className="text-xs text-gray-400 mt-1">{reply.student_name} · {new Date(reply.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
          />
          <button type="submit" disabled={loading || !replyContent.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            {loading ? "Posting..." : "Post Reply"}
          </button>
        </form>
      </div>
    </div>
  );
}