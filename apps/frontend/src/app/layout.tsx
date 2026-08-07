import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TsuniForge — AI-Powered Coding Assessment Platform",
  description:
    "Solve coding problems, compete in real-time contests, and get AI-powered feedback. The next-generation platform for developers and companies.",
  keywords: [
    "coding platform",
    "programming contests",
    "code assessment",
    "AI code review",
    "competitive programming",
  ],
  authors: [{ name: "TsuniForge" }],
  openGraph: {
    title: "TsuniForge — AI-Powered Coding Assessment Platform",
    description:
      "Solve coding problems, compete in real-time contests, and get AI-powered feedback.",
    type: "website",
  },
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-950 text-slate-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

