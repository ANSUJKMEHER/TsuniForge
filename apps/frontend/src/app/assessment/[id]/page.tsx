"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

// ─── Custom Hook: Anti-Cheat Tracker ──────────
function useAntiCheat() {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blurCount, setBlurCount] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlurCount((prev) => prev + 1);
        setWarnings((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Window focus lost. This has been reported.`,
        ]);
        // In a real app, fire an API request here: api.reportCheatEvent(...)
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setWarnings((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Copy/Paste is disabled during assessments.`,
      ]);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, []);

  return { warnings, blurCount };
}

// ─── Locked Candidate Environment ─────────────
export default function AssessmentWorkspace() {
  const params = useParams();
  const assessmentId = params.id as string;
  const { warnings, blurCount } = useAntiCheat();

  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("// Write your solution here\n");
  const [output, setOutput] = useState("");

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      alert("Time is up! Auto-submitting your assessment.");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    setOutput("Running hidden test cases...\nVerifying plagiarism metrics...\n\nAssessment submitted successfully. You may close this window.");
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Strict Navbar */}
      <nav className="h-14 bg-red-950/20 border-b border-red-500/20 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold text-white tracking-wide">Acme Corp Assessment</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 uppercase border border-red-500/30">
            Proctored Session
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-red-400 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
          </div>
          <button onClick={handleSubmit} className="btn-primary py-1.5 px-4 text-sm bg-red-600 hover:bg-red-500 shadow-none">
            Finish Test
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Problem Statement & Warnings */}
        <div className="w-1/2 flex flex-col border-r border-white/5 bg-surface-900/30">
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <h1 className="text-2xl font-bold text-white mb-6">1. Validate Binary Search Tree</h1>
            <div className="prose prose-invert prose-slate max-w-none text-slate-300">
              <p>
                Given the root of a binary tree, determine if it is a valid binary search tree (BST).
              </p>
              <p>
                A valid BST is defined as follows:
                <ul>
                  <li>The left subtree of a node contains only nodes with keys less than the node's key.</li>
                  <li>The right subtree of a node contains only nodes with keys greater than the node's key.</li>
                  <li>Both the left and right subtrees must also be binary search trees.</li>
                </ul>
              </p>
            </div>

            {/* Anti-Cheat Warnings Area */}
            {warnings.length > 0 && (
              <div className="mt-10 p-4 rounded-xl border border-red-500/30 bg-red-950/20">
                <h3 className="text-red-400 font-bold mb-2 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Proctoring Alerts ({blurCount} infractions)
                </h3>
                <ul className="text-xs text-red-300 space-y-1 font-mono">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
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
          </div>

          <div className="flex-1 min-h-0 pt-2">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          </div>

          {/* Console */}
          <div className="h-48 border-t border-white/5 bg-surface-950 flex flex-col shrink-0">
             <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Console Output</span>
              <button className="text-emerald-400 hover:text-emerald-300" onClick={() => setOutput("Running sample tests...\nSample 1: Passed\nSample 2: Passed")}>
                Run Code
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-slate-300">
              {output || "Run code to test your solution. Note: Some test cases are hidden during the assessment."}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
