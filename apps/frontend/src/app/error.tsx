"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for client analytics/monitoring
    console.error("Unhandled client error captured by route ErrorBoundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-2xl text-red-400">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 max-w-md mb-6 text-sm">
        {error?.message || "An unexpected error occurred while processing your request."}
      </p>

      {error?.digest && (
        <p className="text-slate-500 font-mono text-xs mb-6">
          Digest ID: {error.digest}
        </p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary px-6 py-2.5 text-sm rounded-xl font-medium"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="btn-secondary px-6 py-2.5 text-sm rounded-xl font-medium"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
