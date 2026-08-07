"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

// ─── Navbar for Playground ────────────────────
function PlaygroundNavbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="h-14 border-b border-white/5 bg-surface-950 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-semibold text-white hidden sm:block">Code Playground</span>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/problems" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
          Solve Problems →
        </Link>
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {user.username}
              </span>
            </div>
            <button onClick={logout} className="btn-secondary text-xs px-3 py-1.5">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">Log In</Link>
            <Link href="/register" className="btn-primary text-xs px-3 py-1.5">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function PlaygroundPage() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Set default code template when language changes
  useEffect(() => {
    if (language === "cpp") {
      setCode("#include <iostream>\nusing namespace std;\n\nint main() {\n  // Read input from stdin\n  string name;\n  if (cin >> name) {\n    cout << \"Hello, \" << name << \"!\" << endl;\n  } else {\n    cout << \"Hello, World!\" << endl;\n  }\n  return 0;\n}");
    } else if (language === "java") {
      setCode("import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    if (scanner.hasNext()) {\n      System.out.println(\"Hello, \" + scanner.next() + \"!\");\n    } else {\n      System.out.println(\"Hello, World!\");\n    }\n  }\n}");
    } else if (language === "python") {
      setCode("import sys\n\ndef main():\n  # Read from stdin\n  input_data = sys.stdin.read().strip()\n  if input_data:\n    print(f\"Hello, {input_data}!\")\n  else:\n    print(\"Hello, World!\")\n\nif __name__ == '__main__':\n  main()");
    }
  }, [language]);

  const handleRun = async () => {
    if (!isAuthenticated || !accessToken) {
      setOutput("⚠ Please sign in to run code.\n\nGo to /login to create an account.");
      return;
    }
    setIsRunning(true);
    setOutput("⏳ Compiling and running...");

    try {
      const result = await api.runCode("playground", language, code, customInput, accessToken);
      const data = result?.data;
      if (data?.output) {
        setOutput(data.output);
      } else {
        setOutput("Program executed successfully.\n(No output produced)");
      }
    } catch (err: any) {
      setOutput(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <PlaygroundNavbar />

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Pane: Editor */}
        <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden">
          {/* Editor Header */}
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-surface-800">
            <select
              className="bg-surface-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-emerald-500 transition-colors"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="cpp">C++ 17</option>
              <option value="java">Java 17</option>
              <option value="python">Python 3.11</option>
            </select>
            <button
              className="btn-primary px-5 py-1.5 text-sm rounded-lg shadow-lg shadow-emerald-500/20"
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0 pt-2 bg-[#1e1e1e]">
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
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
              }}
              loading={<div className="text-slate-500 text-sm text-center pt-10">Loading Editor...</div>}
            />
          </div>
        </div>

        {/* Right Pane: I/O */}
        <div className="w-[400px] flex flex-col gap-4 shrink-0">
          {/* Custom Input */}
          <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="h-10 border-b border-white/5 px-4 flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wider bg-surface-800">
              Custom Input (stdin)
            </div>
            <textarea
              className="flex-1 bg-transparent p-4 text-slate-300 font-mono text-sm resize-none outline-none focus:bg-white/[0.02] transition-colors"
              placeholder="Enter custom input here..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-surface-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Output (stdout)
              </span>
              {isRunning && (
                <span className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Running
                </span>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-slate-300">
              {output || "Output will appear here..."}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
