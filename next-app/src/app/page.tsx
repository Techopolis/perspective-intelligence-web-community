import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perspective Intelligence",
  description:
    "Chat with an intelligent AI assistant that keeps your data private. Powered by on-device models.",
};

export default function HomePage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <h1
          className="text-xl font-bold italic text-white sm:text-2xl"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Perspective Intelligence
        </h1>
        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
          >
            Get started
          </Link>
        </nav>
      </header>

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8"
      >
        <div className="max-w-2xl text-center">
          <h2
            className="mb-6 text-4xl font-bold italic text-white sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Your private AI assistant
          </h2>
          <p
            className="mx-auto mb-10 max-w-lg text-lg sm:text-xl"
            style={{ color: "#9ca3af" }}
          >
            Chat naturally with an intelligent assistant powered by on-device
            models. Your data stays on your device.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl px-8 py-3.5 text-center text-lg font-semibold transition-all duration-200 hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
            >
              Start chatting
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-center text-lg font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section
          className="mt-20 grid max-w-3xl gap-6 sm:grid-cols-3"
          aria-label="Features"
        >
          <div className="rounded-2xl border border-white/10 p-6">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
              aria-hidden="true"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-white">Smart agents</h3>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              Specialized assistants for coding, writing, translation, and more.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-6">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}
              aria-hidden="true"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-white">Private by design</h3>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              Powered by on-device models. Your conversations never leave your machine.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 p-6">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#a78bfa" }}
              aria-hidden="true"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-white">Fast and local</h3>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              No cloud latency. Responses stream directly from your local AI server.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Built by Techopolis
        </p>
      </footer>
    </div>
  );
}
