import {
  MessageCircle,
  Clock,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  student_name: string;
  created_at: string;
  reply_count: number;
  sentiment?: string;
  sentiment_score?: number;
}

interface Props {
  posts: Post[];
  onSelect: (post: Post) => void;
  selectedId: string | null;
  onDelete: (postId: string) => void;
}

const SentimentBadge = ({ sentiment }: { sentiment?: string }) => {
  if (!sentiment || sentiment === "neutral") return null;

  const config: Record<
    string,
    { icon: React.ReactNode; color: string; label: string }
  > = {
    positive: {
      icon: <Smile className="w-3 h-3" />,
      color: "text-green-500 bg-green-50 dark:bg-green-900/20",
      label: "Positive",
    },
    frustrated: {
      icon: <Frown className="w-3 h-3" />,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
      label: "Frustrated",
    },
    confused: {
      icon: <Meh className="w-3 h-3" />,
      color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
      label: "Confused",
    },
    distressed: {
      icon: <AlertCircle className="w-3 h-3" />,
      color: "text-red-500 bg-red-50 dark:bg-red-900/20",
      label: "Distressed",
    },
  };

  const c = config[sentiment];
  if (!c) return null;

  return (
    <span
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.color}`}
    >
      {c.icon} {c.label}
    </span>
  );
};

export default function PostList({
  posts,
  onSelect,
  selectedId,
  onDelete,
}: Props) {
  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <p className="text-sm text-gray-400">
          No posts yet. Be the first to post!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
      {posts.map((post) => (
        <div
          key={post.id}
          onClick={() => onSelect(post)}
          className={`p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedId === post.id ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {post.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <SentimentBadge sentiment={post.sentiment} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(post.id);
                }}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 mb-3">
            {post.content}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{post.student_name}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {post.reply_count} replies
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
