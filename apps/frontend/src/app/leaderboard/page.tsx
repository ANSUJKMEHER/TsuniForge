"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

function LeaderboardNavbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="h-16 border-b border-white/5 bg-surface-950 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            T
          </div>
          <span className="font-bold text-lg gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="h-4 w-px bg-white/10 mx-2" />
        <span className="font-semibold text-white">Global Leaderboard</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/problems" className="text-slate-400 hover:text-white transition-colors">
          Problems
        </Link>
        <Link href="/contests" className="text-slate-400 hover:text-white transition-colors">
          Contests
        </Link>
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center gap-3">
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
          <Link href="/login" className="btn-secondary text-sm">Log In</Link>
          <Link href="/register" className="btn-primary text-sm">Sign Up</Link>
        </div>
      )}
    </nav>
  );
}

export default function LeaderboardPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: () => api.getGlobalLeaderboard(50),
  });

  const users = data?.data || [];

  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <LeaderboardNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Global Rankings</h1>
            <p className="text-slate-400 text-sm">
              The best competitive programmers on TsuniForge, ranked by ELO rating.
            </p>
          </div>

          <div className="relative w-full md:w-72">
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
              placeholder="Search user..."
              className="input pl-10 bg-surface-900 border-white/5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-0 overflow-hidden bg-surface-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase tracking-wider bg-surface-800/50 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rank</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold text-right">Rating</th>
                  <th className="px-6 py-4 font-semibold text-right hidden sm:table-cell">Problems Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <svg className="animate-spin w-6 h-6 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      {search ? `No users found matching "${search}"` : "No users on the leaderboard yet. Be the first to register!"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any, index: number) => {
                    const rankColor = 
                      index === 0 ? "text-amber-400 font-bold" :
                      index === 1 ? "text-slate-300 font-bold" :
                      index === 2 ? "text-amber-600 font-bold" :
                      "text-slate-500";

                    const ratingTitle =
                      user.rating >= 2400 ? "Grandmaster" :
                      user.rating >= 2100 ? "Master" :
                      user.rating >= 1900 ? "Candidate Master" :
                      user.rating >= 1600 ? "Expert" :
                      user.rating >= 1400 ? "Specialist" :
                      "Newbie";

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className={`px-6 py-4 ${rankColor}`}>
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-400/80 flex items-center justify-center font-bold text-white text-xs border border-white/10">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={`font-semibold ${index === 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                                {user.username}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                {ratingTitle}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-mono font-medium ${
                            user.rating >= 2400 ? "text-red-500" :
                            user.rating >= 2100 ? "text-orange-500" :
                            user.rating >= 1900 ? "text-purple-500" :
                            user.rating >= 1600 ? "text-emerald-500" :
                            user.rating >= 1400 ? "text-cyan-500" :
                            "text-slate-400"
                          }`}>
                            {user.rating}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right hidden sm:table-cell text-slate-300 font-mono">
                          {user.problemsSolved || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
