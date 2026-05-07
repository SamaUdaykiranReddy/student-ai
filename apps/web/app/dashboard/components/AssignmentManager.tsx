"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  submission_count: number;
  created_at: string;
}

interface Submission {
  id: string;
  student_name: string;
  student_email: string;
  answer: string;
  score: number | null;
  submitted_at: string;
}

export default function AssignmentManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>(
    {},
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    max_score: "100",
  });

  const fetchAssignments = () => {
    api
      .get("/api/assignments")
      .then((res) => setAssignments(res.data.assignments || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    api
      .post("/api/assignments", {
        ...form,
        max_score: parseInt(form.max_score) || 100,
      })
      .then(() => {
        fetchAssignments();
        setForm({ title: "", description: "", due_date: "", max_score: "100" });
        setShowForm(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = (id: string) => {
    api
      .delete(`/api/assignments/${id}`)
      .then(() => fetchAssignments())
      .catch(console.error);
  };

  const handleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!submissions[id]) {
      api
        .get(`/api/assignments/${id}`)
        .then((res) =>
          setSubmissions((prev) => ({
            ...prev,
            [id]: res.data.submissions || [],
          })),
        )
        .catch(console.error);
    }
  };

  const handleGrade = (
    assignmentId: string,
    submissionId: string,
    score: number,
  ) => {
    api
      .patch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}/grade`,
        { score },
      )
      .then(() => {
        setSubmissions((prev) => ({
          ...prev,
          [assignmentId]: prev[assignmentId].map((s) =>
            s.id === submissionId ? { ...s, score } : s,
          ),
        }));
      })
      .catch(console.error);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-medium text-gray-900 dark:text-white text-sm">
            Assignments
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Create and grade student assignments
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Assignment title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-3">
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Max score"
              value={form.max_score}
              onChange={(e) => setForm({ ...form, max_score: e.target.value })}
              className="w-28 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? "Creating..." : "Create Assignment"}
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

      {assignments.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No assignments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {assignment.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {assignment.submission_count} submissions · Max{" "}
                    {assignment.max_score} pts
                    {assignment.due_date &&
                      ` · Due ${new Date(assignment.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExpand(assignment.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {expanded === assignment.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {expanded === assignment.id ? "Hide" : "View"} Submissions
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded === assignment.id && (
                <div className="p-3 space-y-2">
                  {!submissions[assignment.id] ? (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Loading...
                    </p>
                  ) : submissions[assignment.id].length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No submissions yet
                    </p>
                  ) : (
                    submissions[assignment.id].map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {sub.student_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(sub.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Score"
                              defaultValue={sub.score ?? ""}
                              onBlur={(e) =>
                                handleGrade(
                                  assignment.id,
                                  sub.id,
                                  parseFloat(e.target.value),
                                )
                              }
                              className="w-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-400">
                              / {assignment.max_score}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg p-2">
                          {sub.answer}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
