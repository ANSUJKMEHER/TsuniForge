"use client";

import Link from "next/link";

export default function CompanyDashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <nav className="border-b border-white/5 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center font-bold text-white shadow-lg">
              T
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              TsuniForge <span className="text-indigo-400 font-normal">Business</span>
            </span>
          </Link>
          <Link href="/company" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            ← Back to Company
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Dashboard Coming Soon
          </h1>
          <p className="text-slate-400 mb-8">
            The company dashboard with assessment management, candidate tracking, and analytics is currently under development.
          </p>
          <Link href="/" className="btn-primary px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
