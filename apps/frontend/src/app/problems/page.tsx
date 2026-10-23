"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Plus } from "lucide-react";

// ─── Navbar ───────────────────────────────────
function Navbar() {
  const { user, isAuthenticated, logout, isHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="border-b border-white/5 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg">
            T
          </div>
          <span className="text-xl font-bold gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/problems" className="text-sm font-medium text-white">Problems</Link>
          <Link href="/playground" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Playground</Link>
          <Link href="/contests" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Contests</Link>
          <Link href="/leaderboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Leaderboard</Link>
        </div>
        
        {!mounted || !isHydrated ? (
          <div className="w-28 h-9 rounded-lg bg-white/5 animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Link
                href="/admin/problems"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all shadow-sm"
              >
                <span>👑</span>
                <span>Admin Studio</span>
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm text-slate-300 font-medium">
                {user.username}
              </span>
            </div>
            <button onClick={logout} className="btn-secondary text-sm px-4 py-2">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm">
              Log In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Problem List Page ────────────────────────

export default function ProblemsPage() {
  const { user } = useAuthStore();
  const [difficulty, setDifficulty] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["problems", { difficulty, search }],
    queryFn: () => api.getProblems({ difficulty, search, limit: 50 }),
  });

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Problem Set</h1>
            <p className="text-slate-400 text-sm">
              Master your coding skills with our curated list of algorithmic challenges.
            </p>
          </div>

          {user?.role === "admin" && (
            <Link
              href="/admin/problems/new"
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Author Problem</span>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search problems..."
              className="input pl-10 bg-surface-900 border-white/10 text-sm h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input bg-surface-900 border-white/10 text-sm h-10 w-full sm:w-40 appearance-none cursor-pointer"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Problem Table */}
        <div className="glass rounded-xl overflow-hidden border-white/5">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-900/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-400 w-12">Status</th>
                <th className="px-6 py-4 font-medium text-slate-400">Title</th>
                <th className="px-6 py-4 font-medium text-slate-400 w-32">Difficulty</th>
                <th className="px-6 py-4 font-medium text-slate-400 w-32">Acceptance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-5 h-5 rounded-md bg-white/5" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-44 bg-white/10 rounded mb-2" />
                      <div className="flex gap-2">
                        <div className="h-3 w-12 bg-white/5 rounded-full" />
                        <div className="h-3 w-16 bg-white/5 rounded-full" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 bg-white/5 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-10 bg-white/5 rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    No problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                data?.data?.map((problem: any) => (
                  <tr key={problem.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      {/* Placeholder for completion status */}
                      <div className="w-5 h-5 rounded-md border border-white/10 flex items-center justify-center text-transparent group-hover:border-white/20">
                        ✓
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="text-white hover:text-emerald-400 font-medium transition-colors"
                      >
                        {problem.title}
                      </Link>
                      <div className="flex gap-2 mt-1.5">
                        {problem.tags?.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          problem.difficulty === "easy"
                            ? "badge-easy"
                            : problem.difficulty === "medium"
                            ? "badge-medium"
                            : "badge-hard"
                        }`}
                      >
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {Math.round(problem.acceptanceRate || 0)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
