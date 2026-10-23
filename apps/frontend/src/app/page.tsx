"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

// ─── Navbar Component ─────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  const { user, isAuthenticated, isHydrated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-white/5 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            T
          </div>
          <span className="text-xl font-bold gradient-text-brand">
            TsuniForge
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/problems">Problems</NavLink>
          <NavLink href="/playground">Playground</NavLink>
          <NavLink href="/contests">Contests</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
          <NavLink href="/company">For Companies</NavLink>
        </div>

        {!mounted || !isHydrated ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-lg bg-white/[0.04] border border-white/5 animate-pulse" />
          </div>
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Link
                href="/admin/problems"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all shadow-sm"
              >
                <span>👑</span>
                <span>Admin Studio</span>
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm text-slate-300 font-medium">
                {user.username}
              </span>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm px-4 py-2">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm">
              Log In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Sign Up Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-zinc-400 hover:text-white transition-colors duration-200 relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

// ─── Hero Section ─────────────────────────────

function HeroSection() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-slate-300">
            Distributed Judge Engine — Live
          </span>
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-slide-up stagger-1">
          <span className="text-white">Code. Compete.</span>
          <br />
          <span className="gradient-text">Conquer.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 animate-slide-up stagger-2 leading-relaxed">
          The next-generation coding platform with{" "}
          <span className="text-emerald-400 font-medium">
            sandboxed execution
          </span>
          ,{" "}
          <span className="text-teal-400 font-medium">real-time contests</span>
          , and{" "}
          <span className="text-amber-400 font-medium">
            a distributed Go judge engine
          </span>
          .
        </p>

        {/* CTAs — Auth Aware */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up stagger-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/problems"
                className="btn-primary px-8 py-3.5 text-base rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/30 transition-all"
              >
                Go to Problems →
              </Link>
              <Link
                href="/playground"
                className="btn-secondary px-8 py-3.5 text-base rounded-xl"
              >
                Open Playground
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="btn-primary px-8 py-3.5 text-base rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/30 transition-all"
              >
                Start Coding — It&apos;s Free
              </Link>
              <Link
                href="/problems"
                className="btn-secondary px-8 py-3.5 text-base rounded-xl"
              >
                Explore Problems →
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-slide-up stagger-4">
          <StatCard number="500+" label="Problems" />
          <StatCard number="3" label="Languages" />
          <StatCard number="<100ms" label="Judge Speed" />
          <StatCard number="Go" label="Judge Engine" />
        </div>

        {/* Code Preview */}
        <div className="mt-20 animate-slide-up stagger-5">
          <CodePreview />
        </div>
      </div>
    </section>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold gradient-text-brand">
        {number}
      </div>
      <div className="text-sm text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function CodePreview() {
  return (
    <div className="glass rounded-2xl overflow-hidden max-w-4xl mx-auto glow-brand">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono">solution.cpp</span>
          <span className="badge badge-easy text-[10px]">Easy</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5">
            Run
          </button>
          <button className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md hover:bg-emerald-500/30 transition-colors font-medium">
            Submit
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-6 text-left font-mono text-sm leading-relaxed overflow-x-auto">
        <div className="text-zinc-500">
          <span className="text-purple-400">#include</span>{" "}
          <span className="text-green-400">&lt;bits/stdc++.h&gt;</span>
        </div>
        <div className="text-zinc-500">
          <span className="text-purple-400">using namespace</span>{" "}
          <span className="text-emerald-300">std</span>;
        </div>
        <div className="text-zinc-500 mt-2">
          <span className="text-emerald-400">int</span>{" "}
          <span className="text-yellow-300">main</span>() {"{"}
        </div>
        <div className="text-zinc-500 pl-6">
          <span className="text-emerald-400">vector</span>
          {"<"}
          <span className="text-emerald-400">int</span>
          {">"} nums = {"{"}1, 2, 3, 4, 5{"}"};
        </div>
        <div className="text-zinc-500 pl-6">
          <span className="text-emerald-400">int</span> target = 9;
        </div>
        <div className="text-zinc-500 pl-6 mt-2">
          <span className="text-zinc-600">
            {"// Two Sum — O(n) using hash map"}
          </span>
        </div>
        <div className="text-zinc-500 pl-6">
          <span className="text-emerald-400">unordered_map</span>
          {"<"}
          <span className="text-emerald-400">int</span>,{" "}
          <span className="text-emerald-400">int</span>
          {">"} mp;
        </div>
        <div className="text-zinc-500 pl-6">
          <span className="text-purple-400">for</span> (
          <span className="text-emerald-400">int</span> i = 0; i {"<"}{" "}
          nums.size(); i++) {"{"}
        </div>
        <div className="text-zinc-500 pl-12">
          <span className="text-purple-400">if</span> (mp.count(target -
          nums[i]))
        </div>
        <div className="text-zinc-500 pl-16">
          cout {"<<"}{" "}
          <span className="text-green-400">&quot;Found: &quot;</span> {"<<"} mp[target -
          nums[i]] {"<<"}{" "}
          <span className="text-green-400">&quot; &quot;</span> {"<<"} i;
        </div>
        <div className="text-zinc-500 pl-12">
          mp[nums[i]] = i;
        </div>
        <div className="text-zinc-500 pl-6">{"}"}</div>
        <div className="text-zinc-500">{"}"}</div>
      </div>

      {/* Result Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-emerald-500/5 border-t border-emerald-500/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">Accepted</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Runtime: <span className="text-emerald-400">4ms</span></span>
          <span>Memory: <span className="text-emerald-400">7.2 MB</span></span>
          <span>Beats <span className="text-emerald-400">95%</span></span>
        </div>
      </div>
    </div>
  );
}

// ─── Features Section ─────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: "⚡",
      title: "Lightning-Fast Judge",
      description:
        "Sub-second code execution in isolated Docker containers. Support for C++, Java, and Python with custom time/memory limits.",
      gradient: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/20",
    },
    {
      icon: "🔧",
      title: "Go-Based Engine",
      description:
        "A distributed judge engine written in Go with goroutine-based concurrency, Docker sandbox isolation, and seccomp security profiles.",
      gradient: "from-cyan-500/20 to-sky-500/20",
      borderColor: "border-cyan-500/20",
    },
    {
      icon: "🏆",
      title: "Real-Time Contests",
      description:
        "Compete live with WebSocket-powered leaderboards, ICPC/IOI-style scoring, and ELO-based rating system.",
      gradient: "from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/20",
    },
    {
      icon: "🔒",
      title: "Secure Sandbox",
      description:
        "5-layer security with seccomp, AppArmor, cgroups, network isolation, and container destruction after each run.",
      gradient: "from-rose-500/20 to-red-500/20",
      borderColor: "border-rose-500/20",
    },
    {
      icon: "🏢",
      title: "Company Assessments",
      description:
        "Create coding tests with proctoring, auto-grading, plagiarism detection, and exportable PDF reports.",
      gradient: "from-violet-500/20 to-purple-500/20",
      borderColor: "border-violet-500/20",
    },
    {
      icon: "📊",
      title: "Deep Analytics",
      description:
        "Track your progress with skill radar charts, submission heatmaps, rating history, and personalized recommendations.",
      gradient: "from-teal-500/20 to-emerald-500/20",
      borderColor: "border-teal-500/20",
    },
  ];

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Level Up</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Built with the same technologies used at top tech companies.
            Every feature is a talking point for your next interview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`card group cursor-default`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tech Stack Section ───────────────────────

function TechStackSection() {
  const stack = [
    { name: "NestJS", role: "API", color: "#E0234E" },
    { name: "Next.js", role: "Frontend", color: "#ffffff" },
    { name: "Go", role: "Judge", color: "#00ADD8" },
    { name: "PostgreSQL", role: "Database", color: "#4169E1" },
    { name: "Redis", role: "Queue", color: "#DC382D" },
    { name: "Docker", role: "Sandbox", color: "#2496ED" },
    { name: "TypeORM", role: "ORM", color: "#FE0902" },
    { name: "WebSocket", role: "Real-time", color: "#10b981" },
  ];

  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Built with{" "}
          <span className="gradient-text">Production-Grade</span> Tech
        </h2>
        <p className="text-zinc-400 mb-12">
          The same tools used by teams at Google, Meta, and Amazon.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {stack.map((tech) => (
            <div
              key={tech.name}
              className="glass rounded-xl px-5 py-3 flex items-center gap-3 hover:border-white/10 transition-all hover:-translate-y-1 cursor-default"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tech.color }}
              />
              <div className="text-left">
                <div className="text-sm font-semibold text-white">
                  {tech.name}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {tech.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────

function CTASection() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to <span className="gradient-text">Forge</span> Your Future?
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Join thousands of developers sharpening their skills on TsuniForge.
          Start solving problems today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                href="/problems"
                className="btn-primary px-10 py-4 text-base rounded-xl shadow-xl shadow-emerald-500/15"
              >
                Solve Problems →
              </Link>
              <Link
                href="/leaderboard"
                className="btn-secondary px-10 py-4 text-base rounded-xl"
              >
                View Leaderboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="btn-primary px-10 py-4 text-base rounded-xl shadow-xl shadow-emerald-500/15"
              >
                Create Free Account
              </Link>
              <Link
                href="/company"
                className="btn-secondary px-10 py-4 text-base rounded-xl"
              >
                For Companies →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm">
              T
            </div>
            <span className="font-semibold gradient-text-brand">
              TsuniForge
            </span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <Link href="/problems" className="hover:text-white transition-colors">
              Problems
            </Link>
            <Link href="/playground" className="hover:text-white transition-colors">
              Playground
            </Link>
            <Link href="/contests" className="hover:text-white transition-colors">
              Contests
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
          </div>
          <div className="text-sm text-zinc-600">
            © 2026 TsuniForge. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page Component ───────────────────────────

export default function HomePage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <TechStackSection />
      <CTASection />
      <Footer />
    </main>
  );
}
