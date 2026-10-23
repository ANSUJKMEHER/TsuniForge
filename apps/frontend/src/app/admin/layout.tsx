"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import {
  PlusCircle,
  ListOrdered,
  LogOut,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, logout, isHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During initial mount and store hydration, render matching skeleton structure (prevent red flash)
  if (!mounted || !isHydrated) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col">
        <header className="border-b border-white/5 bg-surface-900/80 backdrop-blur-md h-[61px] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 animate-pulse" />
              <div className="w-24 h-4 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="w-32 h-8 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-8 rounded-lg bg-white/5 animate-pulse" />
            <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
          </div>
        </header>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full animate-pulse">
          <div className="h-32 rounded-2xl bg-white/[0.02] border border-white/5 mb-8" />
          <div className="h-96 rounded-xl bg-white/[0.02] border border-white/5" />
        </div>
      </div>
    );
  }

  // Access check: User must be authenticated and have role 'admin'
  if (!isAuthenticated || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="glass max-w-md w-full p-8 rounded-2xl border border-red-500/20 text-center relative z-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Administrator Access Required
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            You must be logged in as an administrator to manage problems and test
            suites on TsuniForge.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login?redirect=/admin/problems"
              className="btn-primary flex items-center justify-center gap-2 w-full py-2.5"
            >
              <span>Log in with Admin Account</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="btn-secondary flex items-center justify-center w-full py-2.5 text-sm"
            >
              Return to TsuniForge Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    {
      href: "/admin/problems",
      label: "All Problems",
      icon: ListOrdered,
      active: pathname === "/admin/problems",
    },
    {
      href: "/admin/problems/new",
      label: "Create Problem",
      icon: PlusCircle,
      active: pathname === "/admin/problems/new",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Admin Top Navigation */}
      <header className="border-b border-white/5 bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Brand + Admin Badge */}
          <div className="flex items-center gap-6">
            <Link href="/admin/problems" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
                T
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold gradient-text-brand leading-none">
                  TsuniForge
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-400 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Admin Console
                </span>
              </div>
            </Link>

            {/* Navigation Pills */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      item.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/problems"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
              title="Open public problem catalog in new tab"
            >
              <span>Public Catalog</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>

            <div className="flex items-center gap-2 pl-3 border-l border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                👑
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 leading-tight">
                  {user.username}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  admin
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
