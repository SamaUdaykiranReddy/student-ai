"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuthStore } from "../../../store/studentAuthStore";
import { GraduationCap, LogOut, ArrowLeft } from "lucide-react";
import PostList from "./components/PostList";
import NewPostForm from "./components/NewPostForm";
import PostDetail from "./components/PostDetail";

interface Post {
  id: string;
  title: string;
  content: string;
  student_name: string;
  created_at: string;
  reply_count: number;
}

interface Reply {
  id: string;
  content: string;
  student_name: string;
  created_at: string;
}

export default function ForumPage() {
  const { student, token, logout } = useStudentAuthStore();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

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
    fetchPosts();
  }, []);

  const fetchPosts = () => {
    fetch(`${API}/api/forum`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setPosts(json.posts || []))
      .catch(console.error);
  };

  const fetchReplies = (postId: string) => {
    fetch(`${API}/api/forum/${postId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((json) => setReplies(json.replies || []))
      .catch(console.error);
  };

  const handleSelectPost = (post: Post) => {
    setSelectedPost(post);
    fetchReplies(post.id);
  };

  const handleNewPost = (title: string, content: string) => {
    setPostLoading(true);
    fetch(`${API}/api/forum`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    })
      .then((res) => res.json())
      .then(() => fetchPosts())
      .catch(console.error)
      .finally(() => setPostLoading(false));
  };

  const handleReply = (content: string) => {
    if (!selectedPost) return;
    setLoading(true);
    fetch(`${API}/api/forum/${selectedPost.id}/replies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchReplies(selectedPost.id);
        fetchPosts();
      })
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
            Forum
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Discuss topics with your peers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <NewPostForm onSubmit={handleNewPost} loading={postLoading} />
            <PostList
              posts={posts}
              onSelect={handleSelectPost}
              selectedId={selectedPost?.id || null}
            />
          </div>
          <div>
            {selectedPost ? (
              <PostDetail
                post={selectedPost}
                replies={replies}
                onReply={handleReply}
                loading={loading}
              />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <p className="text-sm text-gray-400">
                  Select a post to read and reply
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
