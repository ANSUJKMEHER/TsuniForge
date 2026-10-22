"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertCircle,
  Layers,
  RefreshCw,
} from "lucide-react";

export default function AdminProblemsPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch problems
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-problems", { search, difficulty }],
    queryFn: () =>
      api.getProblems(
        {
          search: search || undefined,
          difficulty: difficulty || undefined,
          limit: 100,
          all: true,
        },
        accessToken || undefined
      ),
  });

  const problems: any[] = data?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (problemId: string) => {
      if (!accessToken) throw new Error("Authentication token required");
      return api.deleteProblem(problemId, accessToken);
    },
    onSuccess: () => {
      setFeedbackMessage({
        type: "success",
        text: "Problem deleted successfully from the platform.",
      });
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-problems"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
    },
    onError: (err: any) => {
      setFeedbackMessage({
        type: "error",
        text: err?.message || "Failed to delete problem.",
      });
      setDeleteConfirmId(null);
    },
  });

  // Calculate statistics
  const totalCount = problems.length;
  const easyCount = problems.filter((p) => p.difficulty === "easy").length;
  const mediumCount = problems.filter((p) => p.difficulty === "medium").length;
  const hardCount = problems.filter((p) => p.difficulty === "hard").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Admin Portal
            </span>
            <span className="text-xs text-slate-500">
              Problem Management & Test Suites
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Algorithmic Problem Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, configure test cases, and manage algorithmic problems across the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary flex items-center gap-2 text-xs py-2.5 px-3.5"
            title="Refresh problems list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/problems/new"
            className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Problem</span>
          </Link>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-3 text-sm">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Problems</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "—" : totalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active in platform</div>
        </div>

        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
            <span>Easy</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "—" : easyCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Beginner friendly</div>
        </div>

        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium mb-1">
            <span>Medium</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "—" : mediumCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Intermediate level</div>
        </div>

        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium mb-1">
            <span>Hard</span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "—" : hardCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Advanced challenges</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass rounded-xl p-4 border border-white/5 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems by title, slug, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs h-10 bg-surface-950/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input text-xs h-10 bg-surface-950/60 w-36 cursor-pointer"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {(search || difficulty) && (
            <button
              onClick={() => {
                setSearch("");
                setDifficulty("");
              }}
              className="btn-secondary text-xs h-10 px-3 whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Problems Table */}
      <div className="glass rounded-xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-surface-900/60 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5 font-semibold text-slate-400">Problem</th>
                <th className="px-4 py-3.5 font-semibold text-slate-400 w-28">Difficulty</th>
                <th className="px-4 py-3.5 font-semibold text-slate-400">Tags</th>
                <th className="px-4 py-3.5 font-semibold text-slate-400 w-28">Acceptance</th>
                <th className="px-4 py-3.5 font-semibold text-slate-400 w-28">Submissions</th>
                <th className="px-5 py-3.5 font-semibold text-slate-400 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading problem inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <Code2 className="w-10 h-10 text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-300 mb-1">
                        No problems found
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        {search || difficulty
                          ? "Try adjusting your search criteria or clear the filters."
                          : "Get started by publishing your first problem challenge."}
                      </p>
                      <Link
                        href="/admin/problems/new"
                        className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Problem</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                problems.map((problem) => (
                  <tr
                    key={problem.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Title & Slug */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <Link
                          href={`/problems/${problem.slug}`}
                          target="_blank"
                          className="font-medium text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{problem.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="font-mono text-[11px] text-slate-500 mt-0.5">
                          /{problem.slug}
                        </span>
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`badge ${
                          problem.difficulty === "easy"
                            ? "badge-easy"
                            : problem.difficulty === "medium"
                            ? "badge-medium"
                            : "badge-hard"
                        }`}
                      >
                        {problem.difficulty
                          ? problem.difficulty.charAt(0).toUpperCase() +
                            problem.difficulty.slice(1)
                          : "Medium"}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {problem.tags && problem.tags.length > 0 ? (
                          problem.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600">None</span>
                        )}
                        {problem.tags && problem.tags.length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{problem.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acceptance */}
                    <td className="px-4 py-3.5 text-slate-300 font-mono">
                      {Math.round(problem.acceptanceRate || 0)}%
                    </td>

                    {/* Submissions */}
                    <td className="px-4 py-3.5 text-slate-400 font-mono">
                      {problem.totalSubmissions || 0}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {deleteConfirmId === problem.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => deleteMutation.mutate(problem.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 text-[11px] font-medium disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-white text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/problems/${problem.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Open Problem Workspace"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmId(problem.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete problem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
