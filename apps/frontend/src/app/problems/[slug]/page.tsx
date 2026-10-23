"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

// ─── Navbar for Workspace ────────────────────
function WorkspaceNavbar() {
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="h-14 border-b border-white/5 bg-surface-950 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/problems" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-semibold text-white">Problem Workspace</span>
      </div>
      <div className="flex items-center gap-3">
        {!mounted || !isHydrated ? (
          <div className="h-8 w-28 rounded-lg bg-white/[0.04] border border-white/5 animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <Link
                href="/admin/problems"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all shadow-sm"
              >
                <span>👑</span>
                <span>Admin</span>
              </Link>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm text-slate-300 font-medium">{user.username}</span>
            </div>
          </div>
        ) : (
          <Link href="/login" className="btn-primary text-xs px-4 py-2 rounded-lg">
            Sign In to Submit
          </Link>
        )}
      </div>
    </nav>
  );
}

// ─── Workspace Skeleton to eliminate loading flicker ────────
function WorkspaceSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <WorkspaceNavbar />
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane Skeleton */}
        <div className="w-1/2 flex flex-col border-r border-white/5 bg-surface-900/30">
          <div className="flex items-center gap-6 px-6 border-b border-white/5 h-12 shrink-0">
            <span className="h-full text-sm font-medium border-b-2 border-emerald-500 text-emerald-400 flex items-center">
              Description
            </span>
            <span className="h-full text-sm font-medium border-b-2 border-transparent text-slate-500 flex items-center">
              Submissions
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-8 w-56 bg-white/10 rounded-lg" />
              <div className="h-6 w-16 bg-white/10 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-white/5 rounded-md" />
              <div className="h-6 w-20 bg-white/5 rounded-md" />
              <div className="h-6 w-14 bg-white/5 rounded-md" />
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-11/12 bg-white/5 rounded" />
              <div className="h-4 w-4/5 bg-white/5 rounded" />
              <div className="h-4 w-3/4 bg-white/5 rounded" />
            </div>
            <div className="mt-8 space-y-3 pt-6 border-t border-white/5">
              <div className="h-5 w-36 bg-white/10 rounded" />
              <div className="h-32 w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="h-3 w-16 bg-white/10 rounded" />
                <div className="h-8 w-full bg-white/[0.03] rounded" />
                <div className="h-3 w-28 bg-white/10 rounded" />
                <div className="h-8 w-full bg-white/[0.03] rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane Skeleton */}
        <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-surface-950">
            <div className="h-7 w-28 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="flex-1 p-6 space-y-3 animate-pulse opacity-40">
            <div className="h-4 w-3/4 bg-white/10 rounded font-mono" />
            <div className="h-4 w-1/2 bg-white/10 rounded font-mono" />
            <div className="h-4 w-2/3 bg-white/10 rounded font-mono" />
            <div className="h-4 w-1/3 bg-white/10 rounded font-mono" />
            <div className="h-4 w-1/2 bg-white/10 rounded font-mono" />
          </div>
          <div className="h-64 border-t border-white/5 bg-surface-950 flex flex-col shrink-0">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-surface-900/40">
              <div className="h-4 w-20 bg-white/10 rounded" />
              <div className="flex gap-2">
                <div className="h-7 w-16 bg-white/10 rounded-lg" />
                <div className="h-7 w-20 bg-emerald-500/20 rounded-lg" />
              </div>
            </div>
            <div className="p-4">
              <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Problem Detail Page ─────────────────────

export default function ProblemWorkspace() {
  const params = useParams();
  const slug = params.slug as string;
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const editorRef = useRef<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const STARTER_TEMPLATES: Record<string, string> = {
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Your code here\n  return 0;\n}",
    java: "import java.util.*;\n\npublic class Solution {\n  public static void main(String[] args) {\n    // Your code here\n  }\n}",
    python: "def solve():\n  # Your code here\n  pass\n\nif __name__ == '__main__':\n  solve()",
  };

  const [language, setLanguage] = useState("cpp");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(STARTER_TEMPLATES);
  const code = codeByLanguage[language] ?? STARTER_TEMPLATES[language] ?? "";

  const [output, setOutput] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [consoleTab, setConsoleTab] = useState<"output" | "customInput">("output");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Clean up Monaco editor text models on unmount (FE-RES-02)
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.getModel()?.dispose();
      }
    };
  }, []);

  // Clean up polling interval on unmount (FE-RES-03)
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const handleCodeChange = (val?: string) => {
    const updated = val ?? "";
    setCodeByLanguage((prev) => ({
      ...prev,
      [language]: updated,
    }));
  };

  // Fetch problem details
  const { data, isLoading } = useQuery({
    queryKey: ["problem", slug],
    queryFn: () => api.getProblem(slug),
  });

  const problem = data?.data;

  // Fetch user submissions
  const { data: submissionsData, refetch: refetchSubmissions } = useQuery({
    queryKey: ["submissions", problem?.id, user?.id],
    queryFn: () => api.getSubmissions({ problemId: problem.id, userId: user?.id }, accessToken!),
    enabled: !!problem?.id && !!accessToken && !!user?.id,
  });

  const submissions = submissionsData?.data || [];

  const handleSelectSubmission = async (subId: string) => {
    try {
      const res = await api.getSubmission(subId, accessToken!);
      setSelectedSubmission(res.data);
    } catch (err) {
      console.error("Failed to load submission details:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "submissions" && isAuthenticated) {
      refetchSubmissions();
    }
  }, [activeTab, isAuthenticated, refetchSubmissions]);

  useEffect(() => {
    if (problem?.testCases?.length > 0 && !customInput) {
      setCustomInput(problem.testCases[0].input || "");
    }
  }, [problem, customInput]);

  const handleRun = async () => {
    if (!problem) return;
    if (!isAuthenticated || !accessToken) {
      setOutput("⚠ Please sign in or use a 1-click Demo Role at /login to run code.");
      setConsoleTab("output");
      return;
    }
    setIsSubmitting(true);
    setConsoleTab("output");
    setOutput("⏳ Executing code against testcase in sandbox...");

    try {
      const inputToUse = customInput || problem.testCases?.[0]?.input || "";
      const result = await api.runCode(problem.id, language, code, inputToUse, accessToken);
      setOutput(result?.data?.output || "Program executed successfully.\n(No output produced)");
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;
    if (!isAuthenticated || !accessToken) {
      setOutput("⚠ Please sign in to submit code.");
      return;
    }
    setIsSubmitting(true);
    setOutput("⏳ Submitting code to judge engine...\n");

    try {
      const result = await api.submitCode(problem.id, language, code, accessToken);
      const submissionId = result?.data?.id;

      if (!submissionId) {
        setOutput("Error: No submission ID returned.");
        setIsSubmitting(false);
        return;
      }

      setOutput(`⏳ Submission ${submissionId.slice(0, 8)}... queued for judging\n`);

      // Clear any prior polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll for results with ref-managed interval (FE-RES-03)
      let attempts = 0;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const sub = await api.getSubmission(submissionId, accessToken);
          const submission = sub?.data;

          if (submission && submission.verdict !== "PENDING") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            const verdictEmoji =
              submission.verdict === "AC" ? "✅" :
              submission.verdict === "WA" ? "❌" :
              submission.verdict === "TLE" ? "⏰" :
              submission.verdict === "MLE" ? "💾" :
              submission.verdict === "CE" ? "🔧" : "💥";

            setOutput(
              `${verdictEmoji} Verdict: ${submission.verdict}\n` +
              `⏱ Runtime: ${submission.runtimeMs}ms\n` +
              `💾 Memory: ${Math.round((submission.memoryKb || 0) / 1024 * 10) / 10} MB\n` +
              `📋 Test Cases: ${submission.testCasesPassed}/${submission.totalTestCases} passed\n` +
              `📊 Score: ${Math.round(submission.score || 0)}%`
            );
            setIsSubmitting(false);
            setActiveTab("submissions");
            refetchSubmissions();
          }
        } catch {
          // Ignore polling errors
        }

        if (attempts > 30) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setOutput("⏳ Judging is taking longer than expected. Check submissions tab.");
          setIsSubmitting(false);
        }
      }, 2000);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <WorkspaceSkeleton />;
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div>Problem not found.</div>
        <Link href="/problems" className="text-emerald-400 hover:underline">
          Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <WorkspaceNavbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Problem Description */}
        <div className="w-1/2 flex flex-col border-r border-white/5 bg-surface-900/30">
          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 border-b border-white/5 h-12 shrink-0">
            <button
              className={`h-full text-sm font-medium border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("description")}
            >
              Description
            </button>
            <button
              className={`h-full text-sm font-medium border-b-2 transition-colors ${
                activeTab === "submissions"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("submissions")}
            >
              Submissions
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {activeTab === "description" ? (
              <div className="prose prose-invert prose-slate max-w-none">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-2xl font-bold text-white m-0">{problem.title}</h1>
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
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {problem.tags?.map((tag: string) => (
                    <span key={tag} className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Render Markdown-like description text */}
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {problem.descriptionMd}
                </div>

                {/* Sample Test Cases */}
                {problem.testCases?.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-white mb-4">Sample Test Cases</h3>
                    {problem.testCases.map((tc: any) => (
                      <div key={tc.id} className="mb-6 bg-surface-950 rounded-xl border border-white/5 p-4">
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Input</div>
                          <pre className="font-mono text-sm text-slate-300 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expected Output</div>
                          <pre className="font-mono text-sm text-green-400 bg-green-500/[0.02] p-3 rounded-lg border border-green-500/10">
                            {tc.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-slate-300">
                {selectedSubmission ? (
                  <div className="flex flex-col gap-6">
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 self-start"
                    >
                      &larr; Back to list
                    </button>

                    <div className="glass rounded-xl p-5 border border-white/5 bg-surface-900/50">
                      <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Submission Stats</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 block text-xs">Verdict</span>
                          <span className={`font-semibold ${selectedSubmission.verdict === 'AC' ? 'text-green-400' : 'text-red-400'}`}>
                            {selectedSubmission.verdict}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Submitted At</span>
                          <span className="font-mono text-xs text-slate-400">
                            {new Date(selectedSubmission.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Runtime</span>
                          <span className="font-mono text-slate-300">{selectedSubmission.runtimeMs} ms</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Memory</span>
                          <span className="font-mono text-slate-300">
                            {Math.round((selectedSubmission.memoryKb || 0) / 1024 * 10) / 10} MB
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedSubmission.aiReview && (
                      <div className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/[0.02]">
                        <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                          <span className="animate-pulse">🤖</span> Gemini AI Code Review
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                            <span className="text-xs text-slate-500 block">Time Complexity</span>
                            <span className="text-sm text-slate-200 font-mono font-bold">{selectedSubmission.aiReview.timeComplexity}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                            <span className="text-xs text-slate-500 block">Space Complexity</span>
                            <span className="text-sm text-slate-200 font-mono font-bold">{selectedSubmission.aiReview.spaceComplexity}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="text-xs text-slate-500 block mb-1">Feedback</span>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {selectedSubmission.aiReview.feedback}
                          </p>
                        </div>

                        {selectedSubmission.aiReview.suggestions?.length > 0 && (
                          <div>
                            <span className="text-xs text-slate-500 block mb-2">Suggestions</span>
                            <ul className="list-disc pl-5 text-sm text-slate-300 flex flex-col gap-1.5">
                              {selectedSubmission.aiReview.suggestions.map((sug: string, i: number) => (
                                <li key={i}>{sug}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="glass rounded-xl p-5 border border-white/5">
                      <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Submitted Source Code</h4>
                      <pre className="font-mono text-sm bg-surface-950 p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre text-slate-300 max-h-96">
                        {selectedSubmission.code || '/* No code returned */'}
                      </pre>
                    </div>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No submissions found for this problem.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {submissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        onClick={() => handleSelectSubmission(sub.id)}
                        className="glass rounded-xl p-4 flex items-center justify-between border border-white/5 cursor-pointer hover:bg-white/[0.02] hover:border-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${sub.verdict === 'AC' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className={`font-semibold ${sub.verdict === 'AC' ? 'text-green-400' : 'text-red-400'}`}>
                            {sub.verdict}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs font-mono items-center">
                          <span className="text-slate-300">{sub.runtimeMs} ms</span>
                          <span className="text-slate-300">
                            {Math.round((sub.memoryKb || 0) / 1024 * 10) / 10} MB
                          </span>
                          <span className="text-slate-500 uppercase">{sub.language}</span>
                          <span className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">&rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor */}
        <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
          {/* Editor Header */}
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-surface-950">
            <select
              className="bg-surface-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none hover:border-white/20 transition-colors"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="cpp">C++ 17</option>
              <option value="java">Java 17</option>
              <option value="python">Python 3.11</option>
            </select>
            <div className="flex items-center gap-2">
              <button className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0 pt-2">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme="vs-dark"
              value={code}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
              }}
              loading={
                <div className="p-6 space-y-3 animate-pulse opacity-40">
                  <div className="h-4 w-3/4 bg-white/10 rounded font-mono" />
                  <div className="h-4 w-1/2 bg-white/10 rounded font-mono" />
                  <div className="h-4 w-2/3 bg-white/10 rounded font-mono" />
                </div>
              }
            />
          </div>

          {/* Console / Output Area */}
          <div className="h-64 border-t border-white/5 bg-surface-950 flex flex-col shrink-0">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-surface-900/40">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConsoleTab("output")}
                  className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    consoleTab === "output"
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Execution Output
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleTab("customInput")}
                  className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    consoleTab === "customInput"
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Custom Testcase (stdin)
                </button>
              </div>

              {consoleTab === "output" && output && (
                <button
                  onClick={() => setOutput("")}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Clear Console
                </button>
              )}
            </div>

            {consoleTab === "output" ? (
              <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300 select-text">
                {output || "Run code against your custom testcase or submit for full test-suite evaluation."}
              </div>
            ) : (
              <div className="flex-1 p-2 flex flex-col">
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom input (stdin) parameters here..."
                  className="flex-1 bg-surface-900/60 p-2.5 rounded-lg border border-white/5 font-mono text-xs leading-relaxed text-slate-200 outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Action Bar */}
            <div className="h-14 border-t border-white/5 px-4 flex items-center justify-between shrink-0 bg-surface-900/50">
              <div className="text-[11px] text-slate-500 hidden sm:block">
                Time limit: {problem?.timeLimitMs || 2000}ms &bull; Memory: {problem?.memoryLimitMb || 256}MB
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn-secondary px-5 py-2 text-xs font-semibold rounded-lg"
                  onClick={handleRun}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Running..." : "Run Code"}
                </button>
                <button
                  className="btn-primary px-6 py-2 text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Solution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
