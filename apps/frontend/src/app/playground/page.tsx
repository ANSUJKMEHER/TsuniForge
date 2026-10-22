"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ArrowRight,
  Terminal,
  Code2,
  Clock,
} from "lucide-react";

// ─── Navbar for Playground ────────────────────
function PlaygroundNavbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="h-14 border-b border-white/5 bg-surface-950 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
            T
          </div>
          <span className="text-lg font-bold gradient-text-brand hidden sm:block">
            TsuniForge
          </span>
        </Link>
        <div className="h-4 w-px bg-white/10 hidden sm:block" />
        <span className="text-xs font-semibold text-slate-300 hidden md:flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          Interactive Code Playground
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/problems"
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
        >
          <span>Problem Arena</span>
          <ArrowRight className="w-3 h-3" />
        </Link>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            {user.role === "admin" && (
              <Link
                href="/admin/problems"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all"
              >
                <span>👑</span>
                <span className="hidden sm:inline">Admin Studio</span>
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">
              Log In
            </Link>
            <Link href="/register" className="btn-primary text-xs px-3 py-1.5">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Default Starter Templates ─────────────────
const STARTER_TEMPLATES: Record<string, string> = {
  cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    // Read from standard input
    string name;
    if (cin >> name) {
        cout << "Hello, " << name << "!" << endl;
    } else {
        cout << "Hello, TsuniForge Sandbox!" << endl;
    }
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            System.out.println("Hello, " + scanner.next() + "!");
        } else {
            System.out.println("Hello, TsuniForge Sandbox!");
        }
    }
}`,
  python: `import sys

def main():
    # Read from standard input
    input_data = sys.stdin.read().strip()
    if input_data:
        print(f"Hello, {input_data}!")
    else:
        print("Hello, TsuniForge Sandbox!")

if __name__ == '__main__':
    main()`,
};

export default function PlaygroundPage() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const editorRef = useRef<any>(null);

  const [language, setLanguage] = useState<string>("cpp");
  // Bug fix: Store code per-language so switching doesn't destroy user code
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(STARTER_TEMPLATES);
  const [customInput, setCustomInput] = useState<string>("World");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const activeCode = codeByLanguage[language] ?? STARTER_TEMPLATES[language] ?? "";

  // Clean up Monaco editor model on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.getModel()?.dispose();
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

  const handleResetTemplate = () => {
    if (confirm(`Reset ${language.toUpperCase()} code to standard starter template?`)) {
      setCodeByLanguage((prev) => ({
        ...prev,
        [language]: STARTER_TEMPLATES[language],
      }));
    }
  };

  const handleCopyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    if (!isAuthenticated || !accessToken) {
      setOutput(
        "⚠ Authentication Required\nPlease sign in or use one of the 1-click Demo Roles at /login to run code in the sandbox."
      );
      return;
    }

    setIsRunning(true);
    setOutput("⏳ Compiling and executing in isolated Go/Docker container...");
    setExecutionTime(null);
    const startTime = performance.now();

    try {
      const result = await api.runCode(
        "playground",
        language,
        activeCode,
        customInput,
        accessToken
      );
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);

      const data = result?.data;
      if (data?.output !== undefined && data?.output !== null) {
        setOutput(data.output || "(Program completed with no output)");
      } else {
        setOutput("Program executed successfully.\n(No output produced)");
      }
    } catch (err: any) {
      setOutput(`❌ Execution Error:\n${err.message || "Failed to execute code"}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <PlaygroundNavbar />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-4 gap-4">
        {/* Left Pane: Code Editor */}
        <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
          {/* Editor Header Controls */}
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-surface-800/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <select
                className="bg-surface-700 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="cpp">C++ 17 (GCC 13)</option>
                <option value="java">Java 17 (OpenJDK)</option>
                <option value="python">Python 3.11</option>
              </select>

              <button
                type="button"
                onClick={handleResetTemplate}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs flex items-center gap-1"
                title="Reset code to starter template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="btn-primary text-xs py-1.5 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-[300px] pt-2 bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme="vs-dark"
              value={activeCode}
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
                <div className="text-slate-500 text-sm text-center pt-10">
                  Booting Monaco Sandbox Editor...
                </div>
              }
            />
          </div>
        </div>

        {/* Right Pane: I/O (Custom Input & Console Output) */}
        <div className="w-full lg:w-[420px] flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0 min-h-[260px] lg:min-h-0">
          {/* Custom Input */}
          <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-surface-800/80">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-slate-400" />
                Custom Input (stdin)
              </span>
              <button
                type="button"
                onClick={() => setCustomInput("")}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                title="Clear input"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
            <textarea
              className="flex-1 bg-surface-950/60 p-3.5 text-slate-200 font-mono text-xs leading-relaxed resize-none outline-none focus:bg-white/[0.02] transition-colors"
              placeholder="Enter stdin parameters here (e.g. 5&#10;10 20 30)..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Execution Output */}
          <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-surface-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Terminal Output (stdout)
                </span>
                {isRunning && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Running
                  </span>
                )}
                {executionTime !== null && !isRunning && (
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {executionTime}ms
                  </span>
                )}
              </div>

              {output && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    title="Copy output"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutput("")}
                    className="text-[11px] text-slate-500 hover:text-slate-300"
                    title="Clear output"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300 bg-surface-950/70 select-text">
              {output ? (
                output
              ) : (
                <span className="text-slate-600 italic">
                  Press &quot;Run Code&quot; to compile and execute in the sandbox...
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
