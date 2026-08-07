"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Helper: Format Time ──────────────────────
function formatDuration(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ─── Navbar ───────────────────────────────────
function Navbar() {
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
          <Link href="/problems" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Problems</Link>
          <Link href="/contests" className="text-sm font-medium text-white">Contests</Link>
          <Link href="/leaderboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Leaderboard</Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-sm font-bold border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
            U
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Contest Detail Page ──────────────────────

export default function ContestDetailPage() {
  const params = useParams();
  const contestId = params.id as string;
  const [password, setPassword] = useState("");

  const { data: contestData, isLoading: isLoadingContest, refetch: refetchContest } = useQuery({
    queryKey: ["contest", contestId],
    queryFn: () => api.getContest(contestId),
  });

  const { data: problemsData, isLoading: isLoadingProblems } = useQuery({
    queryKey: ["contest_problems", contestId],
    queryFn: () => api.getContestProblems(contestId),
    enabled: !!contestData?.data && contestData.data.status === "active",
    retry: false, // Don't retry if it fails (e.g., due to 403 Forbidden)
  });

  const registerMutation = useMutation({
    mutationFn: () => api.registerForContest(contestId, "dummy_token"), // In real app, token is handled by interceptor/store
    onSuccess: () => {
      alert("Successfully registered for the contest!");
      refetchContest();
    },
    onError: (err: any) => {
      alert(`Registration failed: ${err.message}`);
    },
  });

  if (isLoadingContest) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400">
        <svg className="animate-spin w-8 h-8 mb-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
        </svg>
        Loading contest...
      </div>
    );
  }

  const contest = contestData?.data;

  if (!contest) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400">
        Contest not found.
      </div>
    );
  }

  const isLive = contest.status === "active";
  const isUpcoming = contest.status === "upcoming";

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">
        {/* Header Section */}
        <div className="glass rounded-2xl p-8 mb-8 border-white/5 relative overflow-hidden">
          {/* Background Glow */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 ${
            isLive ? "bg-green-500/10" : isUpcoming ? "bg-emerald-500/10" : "bg-slate-500/10"
          }`} />

          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  isLive 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : isUpcoming
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-white/5 text-slate-400 border-white/10"
                }`}>
                  {isLive ? "Live Now" : isUpcoming ? "Upcoming" : "Ended"}
                </span>
                <span className="text-sm font-medium text-slate-400 bg-surface-800 px-3 py-1 rounded-full border border-white/5">
                  {contest.type === "public" ? "Public" : "Private"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{contest.title}</h1>
              <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(contest.startTime)}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(contest.startTime, contest.endTime)}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {contest.participantCount} Participants
                </div>
              </div>
            </div>

            {/* Registration / Action Area */}
            <div className="flex flex-col justify-end items-start md:items-end min-w-[200px]">
              {isUpcoming && (
                <div className="w-full flex flex-col gap-3">
                  {contest.type === "private" && (
                    <input
                      type="password"
                      placeholder="Contest Password"
                      className="input w-full bg-surface-900 border-white/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                  <button
                    onClick={() => registerMutation.mutate()}
                    disabled={registerMutation.isPending}
                    className="btn-primary w-full py-2.5 text-sm shadow-lg shadow-emerald-500/20"
                  >
                    {registerMutation.isPending ? "Registering..." : "Register Now"}
                  </button>
                </div>
              )}
              {isLive && (
                <Link href={`/contests/${contest.id}/leaderboard`} className="btn-secondary w-full text-center py-2.5 text-sm mb-3">
                  View Leaderboard
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4">Overview</h3>
            <div className="prose prose-invert prose-slate max-w-none glass p-6 rounded-2xl border-white/5 text-slate-300 leading-relaxed whitespace-pre-wrap">
              {contest.descriptionMd || "No description provided."}
            </div>

            {/* Problems List (only if active) */}
            {isLive && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Problems</h3>
                {isLoadingProblems ? (
                  <div className="text-slate-500">Loading problems...</div>
                ) : problemsData?.data ? (
                  <div className="glass rounded-xl overflow-hidden border-white/5">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-surface-900/50 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-slate-400 w-16">#</th>
                          <th className="px-6 py-4 font-medium text-slate-400">Problem</th>
                          <th className="px-6 py-4 font-medium text-slate-400 w-24">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {problemsData.data.map((cp: any) => (
                          <tr key={cp.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-300">{cp.label}</td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/problems/${cp.problem.slug}?contestId=${contest.id}`}
                                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                              >
                                {cp.problem.title}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-slate-400">{cp.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="glass p-6 rounded-xl border-white/5 text-center text-slate-500">
                    <p className="mb-2">You need to register to view problems.</p>
                    <button
                      onClick={() => registerMutation.mutate()}
                      className="text-emerald-400 hover:underline"
                    >
                      Register Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border-white/5">
              <h3 className="text-lg font-bold text-white mb-4">Rules & Guidelines</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-3">
                  <span className="text-emerald-400">•</span>
                  <span><strong>ICPC Scoring:</strong> Ranked by solved problems, then penalty time.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Penalty:</strong> +20 minutes for every rejected submission on a solved problem.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">•</span>
                  <span>Code will be sandboxed and evaluated in real-time.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">•</span>
                  <span>Plagiarism checks will be run after the contest ends.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
