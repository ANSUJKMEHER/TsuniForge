"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Eye,
  Edit3,
  Cpu,
  Clock,
  Tag,
  FileText,
  Sliders,
  Check,
  X,
} from "lucide-react";

interface TestCaseFormItem {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  scoreWeight: number;
}

const POPULAR_TAGS = [
  "array",
  "hash-map",
  "string",
  "two-pointers",
  "dynamic-programming",
  "binary-search",
  "tree",
  "graph",
  "greedy",
  "sorting",
  "math",
  "stack",
  "queue",
  "heap",
  "recursion",
  "sliding-window",
];

const TEMPLATE_DESCRIPTION = `Given an integer array \`nums\` and an integer \`target\`, find the required solution.

### Input Format
- First line contains integer \`n\` (size of the array).
- Second line contains \`n\` space-separated integers representing \`nums\`.
- Third line contains integer \`target\`.

### Output Format
- Return the required result formatted as specified.

### Constraints
- \`1 <= n <= 10^5\`
- \`-10^9 <= nums[i] <= 10^9\`
- Time Limit: 2.0s
- Memory Limit: 256 MB`;

export default function CreateProblemPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  // Form Fields
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [tags, setTags] = useState<string[]>(["array"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState<number>(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [descriptionMd, setDescriptionMd] = useState<string>(TEMPLATE_DESCRIPTION);
  const [descTab, setDescTab] = useState<"edit" | "preview">("edit");

  // Test Cases
  const [testCases, setTestCases] = useState<TestCaseFormItem[]>([
    {
      id: "tc-1",
      input: "4\n2 7 11 15\n9",
      expectedOutput: "0 1",
      isSample: true,
      scoreWeight: 20,
    },
    {
      id: "tc-2",
      input: "3\n3 2 4\n6",
      expectedOutput: "1 2",
      isSample: false,
      scoreWeight: 30,
    },
    {
      id: "tc-3",
      input: "2\n3 3\n6",
      expectedOutput: "0 1",
      isSample: false,
      scoreWeight: 50,
    },
  ]);

  // Errors / Status
  const [formError, setFormError] = useState<string | null>(null);

  // Auto slug generation
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Tag Management
  const handleAddTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().toLowerCase().replace(/\s+/g, "-");
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setCustomTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Test Case Management
  const handleAddTestCase = (isSample = false) => {
    const newId = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setTestCases([
      ...testCases,
      {
        id: newId,
        input: "",
        expectedOutput: "",
        isSample,
        scoreWeight: 10,
      },
    ]);
  };

  const handleDuplicateTestCase = (index: number) => {
    const source = testCases[index];
    const newId = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cloned: TestCaseFormItem = {
      ...source,
      id: newId,
    };
    const updated = [...testCases];
    updated.splice(index + 1, 0, cloned);
    setTestCases(updated);
  };

  const handleUpdateTestCase = (
    index: number,
    field: keyof TestCaseFormItem,
    value: any
  ) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleDeleteTestCase = (index: number) => {
    if (testCases.length <= 1) {
      setFormError("At least one test case is required for the judge.");
      return;
    }
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("You must be logged in as an admin to publish problems.");
      }

      // Validations
      if (!title || title.trim().length < 3) {
        throw new Error("Problem title must be at least 3 characters long.");
      }
      if (!descriptionMd || descriptionMd.trim().length < 10) {
        throw new Error("Problem description must be at least 10 characters long.");
      }
      if (testCases.length === 0) {
        throw new Error("You must provide at least 1 test case.");
      }
      for (let i = 0; i < testCases.length; i++) {
        if (!testCases[i].input && !testCases[i].expectedOutput) {
          throw new Error(`Test Case #${i + 1} has empty input and output.`);
        }
      }

      const payload = {
        title: title.trim(),
        descriptionMd: descriptionMd.trim(),
        difficulty,
        tags,
        timeLimitMs: Number(timeLimitMs) || 2000,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        isPublished,
        testCases: testCases.map((tc, idx) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
          orderIndex: idx,
          scoreWeight: Number(tc.scoreWeight) || 1,
        })),
      };

      return api.createProblem(payload, accessToken);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-problems"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      const createdSlug = res?.data?.slug || slug;
      router.push(`/problems/${createdSlug}`);
    },
    onError: (err: any) => {
      setFormError(err?.message || "Failed to create problem. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/problems"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Problem Inventory</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Author New Problem</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Studio
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define problem statements, constraints, and test cases for automated sandbox evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/problems"
            className="btn-secondary text-xs py-2 px-3.5"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="btn-primary text-xs py-2 px-4 shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing to Judge...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Publish Problem</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{formError}</span>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Details */}
        <div className="glass rounded-xl p-5 sm:p-6 border border-white/5 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. General Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Problem Title *</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {title.length}/255
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Longest Substring Without Repeating Characters"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
                className="input text-sm bg-surface-950/70"
              />
              {slug && (
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  Preview URL: <span className="text-emerald-400">/problems/{slug}</span>
                </div>
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Difficulty Level *
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {(["easy", "medium", "hard"] as const).map((diff) => {
                  const isSelected = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                        isSelected
                          ? diff === "easy"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                            : diff === "medium"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/10"
                          : "bg-surface-950/50 text-slate-400 border-white/5 hover:border-white/15"
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Algorithm & Topic Tags
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {tags.length} selected
              </span>
            </label>

            {/* Selected Tags */}
            <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 bg-surface-950/60 rounded-lg border border-white/5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Tag Input */}
              <input
                type="text"
                placeholder="Type tag & press Enter..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(customTagInput);
                  }
                }}
                className="bg-transparent text-xs text-white placeholder-slate-500 outline-none px-2 py-0.5 min-w-[150px]"
              />
            </div>

            {/* Popular Tag suggestions */}
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[11px] text-slate-500 mr-1 self-center">
                Quick add:
              </span>
              {POPULAR_TAGS.filter((t) => !tags.includes(t))
                .slice(0, 8)
                .map((popTag) => (
                  <button
                    key={popTag}
                    type="button"
                    onClick={() => handleAddTag(popTag)}
                    className="text-[10px] text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] px-2 py-0.5 rounded border border-white/5 transition-colors"
                  >
                    + {popTag}
                  </button>
                ))}
            </div>
          </div>

          {/* Limits & Publish State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time Limit (ms)
              </label>
              <input
                type="number"
                min={100}
                max={10000}
                step={100}
                value={timeLimitMs}
                onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                className="input text-xs bg-surface-950/70"
              />
              <span className="text-[10px] text-slate-500">Default: 2000 ms</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Memory Limit (MB)
              </label>
              <input
                type="number"
                min={16}
                max={1024}
                step={16}
                value={memoryLimitMb}
                onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                className="input text-xs bg-surface-950/70"
              />
              <span className="text-[10px] text-slate-500">Default: 256 MB</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Publish Status
              </label>
              <div className="pt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/10 focus:ring-emerald-500 focus:ring-offset-surface-950 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    Publish immediately to platform
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1">
                  Students and candidates can immediately view and solve this problem.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Problem Description (Markdown Studio) */}
        <div className="glass rounded-xl p-5 sm:p-6 border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Problem Statement & Markdown Specification
              </h2>
            </div>

            {/* Tab toggles */}
            <div className="flex items-center gap-1 bg-surface-950/80 p-1 rounded-lg border border-white/5 self-start">
              <button
                type="button"
                onClick={() => setDescTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  descTab === "edit"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setDescTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  descTab === "preview"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Live Preview</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Markdown supported: \`\`\`code\`\`\`, **bold**, *italic*, lists, headings.</span>
            <button
              type="button"
              onClick={() => setDescriptionMd(TEMPLATE_DESCRIPTION)}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              Reset to Standard Template
            </button>
          </div>

          {descTab === "edit" ? (
            <textarea
              value={descriptionMd}
              onChange={(e) => setDescriptionMd(e.target.value)}
              rows={14}
              placeholder="Provide a comprehensive problem description, format specifications, and constraints..."
              required
              className="input font-mono text-xs leading-relaxed bg-surface-950/80 resize-y"
            />
          ) : (
            <div className="min-h-[300px] p-5 rounded-lg bg-surface-950/70 border border-white/5 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {descriptionMd || (
                <span className="text-slate-500 italic">No description provided yet.</span>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Test Cases Suite */}
        <div className="glass rounded-xl p-5 sm:p-6 border border-white/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. Test Cases & Automated Judge Suite
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sample test cases are exposed in the problem description. Non-sample test cases are hidden judge checks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddTestCase(true)}
                className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>+ Sample Case</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddTestCase(false)}
                className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>+ Hidden Judge Case</span>
              </button>
            </div>
          </div>

          {/* Test Case Cards */}
          <div className="space-y-4">
            {testCases.map((tc, index) => (
              <div
                key={tc.id}
                className="p-4 rounded-xl bg-surface-950/60 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-300">
                      Test Case #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateTestCase(index, "isSample", !tc.isSample)
                      }
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded transition-all cursor-pointer ${
                        tc.isSample
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                    >
                      {tc.isSample ? "Sample (Visible to Solvers)" : "Hidden (Judge Only)"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Weight:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tc.scoreWeight}
                        onChange={(e) =>
                          handleUpdateTestCase(
                            index,
                            "scoreWeight",
                            Number(e.target.value)
                          )
                        }
                        className="w-14 text-center text-xs bg-surface-900 border border-white/10 rounded px-1.5 py-0.5 text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDuplicateTestCase(index)}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                      title="Duplicate testcase"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTestCase(index)}
                      disabled={testCases.length <= 1}
                      className="p-1 rounded text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Delete testcase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Standard Input (stdin)
                    </label>
                    <textarea
                      value={tc.input}
                      onChange={(e) =>
                        handleUpdateTestCase(index, "input", e.target.value)
                      }
                      rows={4}
                      placeholder="e.g. 4&#10;2 7 11 15&#10;9"
                      required
                      className="input font-mono text-xs bg-surface-900 border-white/5 leading-tight resize-y"
                    />
                  </div>

                  {/* Expected Output */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Expected Output (stdout)
                    </label>
                    <textarea
                      value={tc.expectedOutput}
                      onChange={(e) =>
                        handleUpdateTestCase(index, "expectedOutput", e.target.value)
                      }
                      rows={4}
                      placeholder="e.g. 0 1"
                      required
                      className="input font-mono text-xs bg-surface-900 border-white/5 text-emerald-400 leading-tight resize-y"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between p-4 rounded-xl glass border border-white/5">
          <div className="text-xs text-slate-400">
            <span>Ready to ship? The problem will be immediately stored in PostgreSQL and synced to the Go Sandbox Judge.</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/problems"
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary text-xs py-2 px-5 shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Problem...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Publish Problem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
