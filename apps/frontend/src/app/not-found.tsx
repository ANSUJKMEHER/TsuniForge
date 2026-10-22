"use client";

import Link from "next/link";
import { Terminal, ArrowLeft, Home, Code2, Trophy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span>HTTP 404 &bull; Segment Fault</span>
        </div>

        {/* 404 Title */}
        <h1 className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 tracking-tighter mb-4">
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
          Challenge Not Found
        </h2>

        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          The algorithmic problem, contest route, or resource you are looking for does not exist in this memory address or has been moved.
        </p>

        {/* Action Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <Link
            href="/problems"
            className="p-3.5 rounded-xl glass border border-white/5 hover:border-emerald-500/30 flex flex-col items-center gap-1.5 group transition-all"
          >
            <Code2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-200">
              Solve Problems
            </span>
          </Link>

          <Link
            href="/playground"
            className="p-3.5 rounded-xl glass border border-white/5 hover:border-teal-500/30 flex flex-col items-center gap-1.5 group transition-all"
          >
            <Terminal className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-200">
              Code Playground
            </span>
          </Link>

          <Link
            href="/contests"
            className="p-3.5 rounded-xl glass border border-white/5 hover:border-amber-500/30 flex flex-col items-center gap-1.5 group transition-all col-span-2 sm:col-span-1"
          >
            <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-200">
              Contest Arena
            </span>
          </Link>
        </div>

        {/* Return Home Button */}
        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs shadow-lg shadow-emerald-500/20"
        >
          <Home className="w-4 h-4" />
          <span>Return to TsuniForge Home</span>
        </Link>
      </div>
    </div>
  );
}
