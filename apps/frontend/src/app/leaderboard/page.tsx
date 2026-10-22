"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  Trophy,
  Medal,
  Crown,
  Search,
  Flame,
  CheckCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

function LeaderboardNavbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="h-16 border-b border-white/5 bg-surface-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            T
          </div>
          <span className="font-bold text-lg gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="h-4 w-px bg-white/10 hidden sm:block" />
        <span className="font-semibold text-white text-sm hidden md:flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          Global Leaderboard
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <Link
          href="/problems"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Problems
        </Link>
        <Link
          href="/playground"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Playground
        </Link>
        <Link
          href="/contests"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Contests
        </Link>
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center gap-3">
          {user.role === "admin" && (
            <Link
              href="/admin/problems"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all shadow-sm"
            >
              <span>👑</span>
              <span className="hidden sm:inline">Admin Studio</span>
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
    </nav>
  );
}

export default function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: () => api.getGlobalLeaderboard(50),
  });

  const users: any[] = data?.data || [];

  const filteredUsers = users.filter((u: any) =>
    (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const topThree = users.slice(0, 3);
  const myRankIndex = currentUser
    ? users.findIndex((u: any) => u.id === currentUser.id || u.username === currentUser.username)
    : -1;

  const getRatingInfo = (rating: number = 1500) => {
    if (rating >= 2400) return { title: "Grandmaster", color: "text-red-400", badge: "bg-red-500/10 border-red-500/30 text-red-300" };
    if (rating >= 2100) return { title: "Master", color: "text-amber-400", badge: "bg-amber-500/10 border-amber-500/30 text-amber-300" };
    if (rating >= 1900) return { title: "Candidate Master", color: "text-purple-400", badge: "bg-purple-500/10 border-purple-500/30 text-purple-300" };
    if (rating >= 1600) return { title: "Expert", color: "text-blue-400", badge: "bg-blue-500/10 border-blue-500/30 text-blue-300" };
    if (rating >= 1400) return { title: "Specialist", color: "text-cyan-400", badge: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" };
    return { title: "Pupil", color: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" };
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <LeaderboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 fill-current" /> Competitive ELO Standings
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Championship Leaderboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Real-time competitive programmer rankings computed with ICPC rating algorithms and contested tournament submissions.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search competitors by handle..."
              className="input pl-10 text-xs h-11 bg-surface-900/80 border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Top 3 Podium Showcase */}
        {!search && topThree.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 items-end">
            {/* Rank 2 (Silver) */}
            <div className="glass rounded-2xl p-6 border border-slate-400/20 relative overflow-hidden order-2 md:order-1 text-center bg-gradient-to-b from-slate-400/5 to-transparent">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-300/10 border border-slate-300/30 flex items-center justify-center text-xl mb-3 shadow-lg">
                🥈
              </div>
              <div className="text-xs font-mono font-bold text-slate-300 mb-1">
                RANK #2
              </div>
              <h3 className="text-lg font-bold text-white truncate px-2">
                {topThree[1].username}
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                {getRatingInfo(topThree[1].rating).title}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Rating</div>
                  <div className="text-base font-bold font-mono text-slate-200">
                    {topThree[1].rating}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Solved</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {topThree[1].problemsSolved || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Rank 1 (Gold - Elevated) */}
            <div className="glass rounded-2xl p-7 border-2 border-amber-500/40 relative overflow-hidden order-1 md:order-2 text-center bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent shadow-2xl shadow-amber-500/10 -translate-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-2xl mb-3 shadow-lg shadow-amber-500/20">
                👑
              </div>
              <div className="text-xs font-mono font-extrabold text-amber-400 mb-1 flex items-center justify-center gap-1">
                <span>CHAMPION</span> &bull; <span>RANK #1</span>
              </div>
              <h3 className="text-xl font-extrabold text-white truncate px-2">
                {topThree[0].username}
              </h3>
              <div className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold mt-1">
                {getRatingInfo(topThree[0].rating).title}
              </div>
              <div className="mt-5 pt-4 border-t border-amber-500/20 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-amber-300/70 uppercase">ELO Rating</div>
                  <div className="text-lg font-black font-mono text-amber-300">
                    {topThree[0].rating}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-300/70 uppercase">Problems Solved</div>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    {topThree[0].problemsSolved || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="glass rounded-2xl p-6 border border-amber-700/30 relative overflow-hidden order-3 text-center bg-gradient-to-b from-amber-700/10 to-transparent">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-700/20 border border-amber-700/40 flex items-center justify-center text-xl mb-3 shadow-lg">
                🥉
              </div>
              <div className="text-xs font-mono font-bold text-amber-600 mb-1">
                RANK #3
              </div>
              <h3 className="text-lg font-bold text-white truncate px-2">
                {topThree[2].username}
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                {getRatingInfo(topThree[2].rating).title}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Rating</div>
                  <div className="text-base font-bold font-mono text-slate-200">
                    {topThree[2].rating}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Solved</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {topThree[2].problemsSolved || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current User Standing Bar */}
        {myRankIndex >= 0 && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300">
                #{myRankIndex + 1}
              </div>
              <div>
                <span className="font-semibold text-white">Your Global Standing:</span>{" "}
                <span className="text-emerald-300 font-mono font-bold">
                  Rank #{myRankIndex + 1}
                </span>{" "}
                of {users.length} coders
              </div>
            </div>
            <div className="font-mono text-slate-300">
              Rating: <span className="font-bold text-white">{users[myRankIndex]?.rating}</span>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="glass rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-surface-900/80 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold w-24">Rank</th>
                  <th className="px-6 py-4 font-semibold">Competitor</th>
                  <th className="px-6 py-4 font-semibold text-right">ELO Rating</th>
                  <th className="px-6 py-4 font-semibold text-right hidden sm:table-cell">
                    Solved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span>Calculating real-time ELO standings...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      {search
                        ? `No users found matching "${search}"`
                        : "No users on the leaderboard yet. Be the first to register!"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((competitor: any, index: number) => {
                    const isSelf =
                      currentUser &&
                      (competitor.id === currentUser.id ||
                        competitor.username === currentUser.username);

                    const ratingData = getRatingInfo(competitor.rating);

                    return (
                      <tr
                        key={competitor.id || index}
                        className={`hover:bg-white/[0.03] transition-colors ${
                          isSelf
                            ? "bg-emerald-500/[0.06] border-l-2 border-l-emerald-400"
                            : ""
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="px-6 py-4 font-mono font-bold">
                          {index === 0 ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              👑 #1
                            </span>
                          ) : index === 1 ? (
                            <span className="text-slate-300">🥈 #2</span>
                          ) : index === 2 ? (
                            <span className="text-amber-600">🥉 #3</span>
                          ) : (
                            <span className="text-slate-500">#{index + 1}</span>
                          )}
                        </td>

                        {/* Competitor Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-400/80 flex items-center justify-center font-bold text-white text-xs border border-white/10 shrink-0">
                              {competitor.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{competitor.username}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                                {ratingData.title}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-mono font-bold text-sm ${ratingData.color}`}
                          >
                            {competitor.rating || 1500}
                          </span>
                        </td>

                        {/* Solved Count */}
                        <td className="px-6 py-4 text-right hidden sm:table-cell text-slate-300 font-mono">
                          {competitor.problemsSolved || 0}
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
