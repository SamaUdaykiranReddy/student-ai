import { MessageCircle, Clock } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  student_name: string;
  created_at: string;
  reply_count: number;
}

interface Props {
  posts: Post[];
  onSelect: (post: Post) => void;
  selectedId: string | null;
}

export default function PostList({ posts, onSelect, selectedId }: Props) {
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
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {post.title}
          </h3>
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
