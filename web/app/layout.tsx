import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LINKS } from "@/lib/links";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Jingang: fix only the vulnerabilities your code can reach",
  description:
    "Jingang watches npm advisories, confirms with Semgrep whether your code calls the vulnerable function, opens a verified upgrade PR, and leaves guardrails so the bug cannot come back.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans text-zinc-100 antialiased">
        <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 whitespace-nowrap px-5 py-3 text-sm sm:gap-6">
            <Link href="/" className="flex items-baseline gap-2 font-semibold">
              <span className="text-amber-300">金刚</span>
              <span>Jingang</span>
            </Link>
            <Link href="/#how" className="hidden text-zinc-400 hover:text-zinc-100 sm:inline">
              How it works
            </Link>
            <Link href="/demo" className="text-zinc-400 hover:text-zinc-100">
              Live demo
            </Link>
            <a href={LINKS.repo} target="_blank" rel="noopener noreferrer" className="ml-auto text-zinc-400 hover:text-zinc-100">
              GitHub
            </a>
          </nav>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-5 py-12 text-xs text-zinc-600">
          Built at the tokens&amp; Cyberdefense Hackathon, San Francisco, October 2026, by Guoxuan Xu and V. Apache-2.0.
        </footer>
      </body>
    </html>
  );
}
