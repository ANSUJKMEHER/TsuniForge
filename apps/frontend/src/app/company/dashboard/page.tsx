"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  Briefcase,
  FileCode2,
  TrendingUp,
  ExternalLink,
  Plus,
  LogOut,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function CompanyDashboard() {
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRole, setNewRole] = useState("Senior Full-Stack Engineer");
  const [newDuration, setNewDuration] = useState(60);

  // Mock candidates stream demonstrating proctoring telemetry intelligence
  const [candidates] = useState([
    {
      id: "c-101",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      role: "Senior Backend Engineer",
      assessment: "Systems & Algorithms Assessment",
      score: 95,
      solved: "3 / 3",
      duration: "42 min",
      integrityRating: "Clean",
      tabSwitches: 0,
      blurCount: 0,
      status: "Passed Benchmark",
      submittedAt: "25 mins ago",
    },
    {
      id: "c-102",
      name: "Sophia Zhang",
      email: "sophia.z@example.com",
      role: "Full-Stack Engineer",
      assessment: "Full-Stack React & Node Core",
      score: 88,
      solved: "2 / 3",
      duration: "55 min",
      integrityRating: "Clean",
      tabSwitches: 1,
      blurCount: 1,
      status: "Passed Benchmark",
      submittedAt: "2 hours ago",
    },
    {
      id: "c-103",
      name: "Daniel Kumar",
      email: "daniel.k@example.com",
      role: "Algorithms & Distributed Systems",
      assessment: "Systems & Algorithms Assessment",
      score: 62,
      solved: "1 / 3",
      duration: "60 min",
      integrityRating: "Flagged Suspicious",
      tabSwitches: 6,
      blurCount: 8,
      status: "Review Required",
      submittedAt: "Yesterday",
    },
    {
      id: "c-104",
      name: "Emma Watson",
      email: "emma.w@example.com",
      role: "Frontend Specialist",
      assessment: "Full-Stack React & Node Core",
      score: 92,
      solved: "3 / 3",
      duration: "38 min",
      integrityRating: "Clean",
      tabSwitches: 0,
      blurCount: 0,
      status: "Passed Benchmark",
      submittedAt: "2 days ago",
    },
  ]);

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.assessment.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    alert(`Assessment "${newTitle}" created successfully! Candidates can now be invited via link.`);
    setShowCreateModal(false);
    setNewTitle("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      {/* Recruiter Topbar */}
      <header className="border-b border-white/5 bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                T
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-white leading-none">
                  TsuniForge <span className="text-indigo-400 font-semibold">Talent</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
                  Enterprise Assessment Suite
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/company"
              className="text-xs text-slate-400 hover:text-white hidden sm:block"
            >
              Overview
            </Link>
            <Link
              href="/problems"
              target="_blank"
              className="text-xs text-slate-400 hover:text-white hidden sm:flex items-center gap-1"
            >
              <span>Problem Bank</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>

            <div className="flex items-center gap-3 pl-3 border-l border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                🏢
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200">
                  {user?.username || "Recruiter"}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Enterprise Team
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Talent Operations
              </span>
              <span className="text-xs text-slate-500">Live Telemetry & Scorecards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Technical Assessment Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Monitor candidate pipelines, review AI-graded code solutions, and analyze anti-cheat telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500/30 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Assessment</span>
            </button>
          </div>
        </div>

        {/* Intelligence Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Active Assessments</span>
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">3</div>
            <div className="text-[11px] text-slate-500 mt-1">2 Senior, 1 Mid-Level</div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Candidates</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">148</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +18% this week
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Benchmark Pass Rate</span>
              <FileCode2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">68.4%</div>
            <div className="text-[11px] text-slate-500 mt-1">Score &ge; 75% cutoff</div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Proctoring Integrity Index</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">96.8%</div>
            <div className="text-[11px] text-slate-500 mt-1">Clean browser sessions</div>
          </div>
        </div>

        {/* Candidate Activity & Telemetry Table */}
        <div className="glass rounded-xl overflow-hidden border border-white/5">
          <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-900/40">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Candidate Evaluation Stream</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time submissions, automated test-case pass rates, and anti-cheat event logs.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by candidate, email, or assessment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 text-xs h-9 bg-surface-950/70"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-900/60 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-slate-400">Candidate</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-400">Target Role</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-400 text-center">Score</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-400">Proctoring Telemetry</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-400">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCandidates.map((c) => {
                  const isClean = c.integrityRating === "Clean";
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Candidate */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{c.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {c.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Assessment */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200 font-medium">{c.role}</div>
                        <div className="text-[11px] text-slate-500">{c.assessment}</div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-sm ${
                              c.score >= 80
                                ? "text-emerald-400"
                                : c.score >= 60
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {c.score}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {c.solved} solved
                          </span>
                        </div>
                      </td>

                      {/* Proctoring */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded w-max ${
                              isClean
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/15 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {isClean ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            )}
                            {c.integrityRating}
                          </span>
                          {!isClean && (
                            <span className="text-[10px] text-red-400 font-mono">
                              ⚠ {c.tabSwitches} Tab-Switches &bull; {c.blurCount} Window Blurs
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                            c.status === "Passed Benchmark"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {c.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.submittedAt}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() =>
                            alert(`Scorecard for ${c.name}:\nScore: ${c.score}%\nCode Solutions: Verified with sandbox judge.\nProctoring: ${c.integrityRating}`)
                          }
                          className="btn-secondary text-[11px] py-1.5 px-3 rounded-lg hover:text-white"
                        >
                          View Scorecard
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Assessment */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass max-w-md w-full rounded-2xl p-6 border border-white/10 relative">
              <h3 className="text-lg font-bold text-white mb-1">
                Create Technical Assessment
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Set up an automated proctored coding evaluation for candidates.
              </p>

              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems & Concurrency"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input text-xs bg-surface-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Role
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="input text-xs bg-surface-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="input text-xs bg-surface-950"
                  />
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                  🔒 Automated anti-cheat, full-screen lock, and tab-switch logging will be automatically enabled.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary text-xs py-2 px-3.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    Generate Assessment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
