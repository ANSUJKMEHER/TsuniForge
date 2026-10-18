"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function LeaderboardPage() {
  const params = useParams();
  const contestId = params.id as string;
  const { accessToken } = useAuthStore();
  const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { data: contestData } = useQuery({
    queryKey: ["contest", contestId],
    queryFn: () => api.getContest(contestId, accessToken || undefined),
  });

  const { data: initialLeaderboard, isLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["leaderboard", contestId],
    queryFn: () => api.getLeaderboard(contestId, accessToken || undefined),
  });

  // Initialize with server data
  useEffect(() => {
    if (initialLeaderboard?.data) {
      setLiveLeaderboard(initialLeaderboard.data);
    }
  }, [initialLeaderboard]);

  // WebSocket Connection with fallback transports and reconnect synchronization (FE-RES-05)
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000/ws";
    const newSocket = io(wsUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: { token: accessToken || undefined },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join_contest", { contestId });
      // Re-fetch latest leaderboard from REST API to eliminate stale state on reconnect
      refetchLeaderboard();
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.warn("WebSocket connection error:", error.message);
      setIsConnected(false);
    });

    newSocket.on("leaderboard_update", (data: { contestId: string; rankings: any[] }) => {
      if (data.contestId === contestId && data.rankings) {
        setLiveLeaderboard(data.rankings);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave_contest", { contestId });
      newSocket.disconnect();
    };
  }, [contestId, accessToken, refetchLeaderboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center text-slate-400">
        Loading leaderboard...
      </div>
    );
  }

  const contest = contestData?.data;

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      {/* Mini Navbar */}
      <nav className="h-14 border-b border-white/5 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/contests/${contestId}`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Contest</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              isConnected ? "text-green-400" : "text-amber-400"
            }`}
          >
            {isConnected ? "Live Updates" : "Connecting..."}
          </span>
        </div>
      </nav>

      <main className="flex-1 mx-auto max-w-6xl px-6 py-10 w-full">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Live Leaderboard</h1>
          <p className="text-slate-400 text-sm">
            {contest ? contest.title : "Loading contest name..."}
          </p>
        </div>

        <div className="glass rounded-2xl overflow-hidden border-white/5">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-900/80 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-300 w-16">Rank</th>
                <th className="px-6 py-4 font-bold text-slate-300">Participant</th>
                <th className="px-6 py-4 font-bold text-slate-300 w-24 text-center">Score</th>
                <th className="px-6 py-4 font-bold text-slate-300 w-32 text-center">Penalty (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {liveLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                    No submissions yet. The leaderboard will update automatically.
                  </td>
                </tr>
              ) : (
                liveLeaderboard.map((entry, index) => (
                  <tr key={entry.userId} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        index === 1 ? "bg-slate-300/20 text-slate-300" :
                        index === 2 ? "bg-orange-500/20 text-orange-500" :
                        "text-slate-500"
                      }`}>
                        #{index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200">{entry.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xl font-bold text-emerald-400">
                      {entry.score}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 font-mono">
                      {Math.floor(entry.penaltyMs / 60000)}
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
