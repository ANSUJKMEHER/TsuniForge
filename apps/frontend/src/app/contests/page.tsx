"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

// Featured sample contests fallback
const SAMPLE_ROUNDS = [
  {
    id: "sample-weekly-1",
    title: "TsuniForge Biweekly Contest 42",
    description: "Compete with algorithmic coders worldwide across 4 challenging algorithmic problems.",
    status: "upcoming",
    startTime: "2026-11-01T14:00:00.000Z",
    endTime: "2026-11-01T16:00:00.000Z",
    rules: "ICPC Scoring (Penalty 20m)",
    participantsCount: 342,
  },
  {
    id: "sample-sprint-2",
    title: "Speedrunner Sprint #14",
    description: "Fast-paced algorithmic duel focusing on dynamic programming and graph structures.",
    status: "upcoming",
    startTime: "2026-11-05T18:00:00.000Z",
    endTime: "2026-11-05T19:30:00.000Z",
    rules: "Speed + Accuracy",
    participantsCount: 189,
  },
];

// ─── Shared Navbar ────────────────────────────
function Navbar() {
  const { user, isAuthenticated, isHydrated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="border-b border-white/5 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            T
          </div>
          <span className="text-xl font-bold gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/problems"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Problems
          </Link>
          <Link
            href="/playground"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Playground
          </Link>
          <Link href="/contests" className="text-sm font-medium text-white">
            Contests
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Leaderboard
          </Link>
        </div>

        {!mounted || !isHydrated ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-lg bg-white/[0.04] border border-white/5 animate-pulse" />
          </div>
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

// ─── Format Duration Helper ──────────────────
function formatDuration(startTime: string, endTime: string) {
  try {
    const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
  } catch {
    return "2 Hours";
  }
}

export default function ContestsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "past">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: () => api.getContests(),
  });

  const contests: any[] = data?.data || [];

  const filteredContests = contests.filter((c: any) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const displayList = contests.length > 0 ? filteredContests : SAMPLE_ROUNDS;

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Hero Banner */}
        <div className="relative rounded-3xl p-8 sm:p-12 mb-12 overflow-hidden glass border border-white/5 bg-gradient-to-r from-emerald-500/10 via-surface-900 to-teal-500/10">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 fill-current" /> Live ICPC Arena
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Competitive Programming Arena
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Participate in live rated rounds, climb the global ELO leaderboard, and solve algorithmic challenges under strict competition timer limits with real-time WebSocket judge telemetry.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ICPC Penalty Scoring
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automated Plagiarism Detection
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Rated Rounds
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            {(["all", "active", "upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  filter === tab
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500">
            {displayList.length} tournament{displayList.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Contests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {isLoading ? (
            <div className="col-span-2 py-16 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>Fetching active contest schedules...</span>
            </div>
          ) : (
            displayList.map((contest: any) => {
              const isActive = contest.status === "active";
              const isUpcoming = contest.status === "upcoming";

              return (
                <div
                  key={contest.id}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Status Badge & Duration */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                            : isUpcoming
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isActive ? "🔴 Live Now" : isUpcoming ? "Upcoming Round" : "Concluded"}
                      </span>

                      <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(contest.startTime, contest.endTime)}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                      {contest.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                      {contest.description || "Official rated tournament organized on TsuniForge."}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-surface-950/60 p-3 rounded-xl border border-white/5 mb-6">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">
                          {new Date(contest.startTime).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 justify-end">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{contest.participantsCount || 0} Registered</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/contests/${contest.id}/leaderboard`}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Standings</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <Link
                      href={`/contests/${contest.id}`}
                      className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/15"
                    >
                      <span>{isActive ? "Enter Arena" : "View Round Details"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="border-t border-white/5 pt-12">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Tournament Features & ICPC Architecture
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="text-sm font-semibold text-white mb-1">Live WebSocket Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Leaderboards compute out-of-order sub-second score updates via Redis sorted sets with zero reload delay.
              </p>
            </div>
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="text-sm font-semibold text-white mb-1">Cheating & Plagiarism Guard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Winnowing fingerprint tokenization and proctoring telemetry safeguard competitive integrity.
              </p>
            </div>
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="text-2xl mb-2">📈</div>
              <h3 className="text-sm font-semibold text-white mb-1">Dynamic ELO Rebalancing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Matchmaking performance calculates post-round rating deltas inspired by standard competitive programming formulas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
