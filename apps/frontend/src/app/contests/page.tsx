"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";

// ─── Shared Navbar ────────────────────────────
function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="border-b border-white/5 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            T
          </div>
          <span className="text-xl font-bold gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/problems" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Problems</Link>
          <Link href="/playground" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Playground</Link>
          <Link href="/contests" className="text-sm font-medium text-white">Contests</Link>
          <Link href="/leaderboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Leaderboard</Link>
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

// ─── Contests Coming Soon ─────────────────────

export default function ContestsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          {/* Glow effect */}
          <div className="relative mb-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/8 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-teal-500/6 rounded-full blur-[80px]" />
          </div>

          {/* Trophy Icon */}
          <div className="relative z-10 mb-8">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
              <span className="text-5xl">🏆</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm text-amber-300 font-medium">Under Development</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Contests are{" "}
              <span className="gradient-text">Coming Soon</span>
            </h1>

            <p className="text-slate-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              We&apos;re building a world-class competitive programming arena with{" "}
              <span className="text-emerald-400 font-medium">ICPC-style scoring</span>,{" "}
              <span className="text-teal-400 font-medium">real-time leaderboards</span>, and{" "}
              <span className="text-amber-400 font-medium">ELO-based ratings</span>.
            </p>

            {/* Feature Preview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="card text-center py-6 group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">⚡</div>
                <h3 className="text-sm font-semibold text-white mb-1">Live Contests</h3>
                <p className="text-xs text-slate-500">WebSocket-powered real-time competition</p>
              </div>
              <div className="card text-center py-6 group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">📊</div>
                <h3 className="text-sm font-semibold text-white mb-1">ELO Ratings</h3>
                <p className="text-xs text-slate-500">Competitive rating system like Codeforces</p>
              </div>
              <div className="card text-center py-6 group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">🏅</div>
                <h3 className="text-sm font-semibold text-white mb-1">Weekly Rounds</h3>
                <p className="text-xs text-slate-500">Ranked rounds every weekend</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/problems"
                className="btn-primary px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/15"
              >
                Practice Problems →
              </Link>
              <Link
                href="/leaderboard"
                className="btn-secondary px-8 py-3 rounded-xl"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
