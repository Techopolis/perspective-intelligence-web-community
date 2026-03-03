"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Reset your password</h2>
        <p className="mt-2" style={{ color: "#9ca3af" }}>
          Enter your email and we will send you a reset link
        </p>
      </div>

      {error && (
        <div
          id="forgot-error"
          className="flex items-start gap-3 rounded-lg p-4 text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#fca5a5",
          }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: "#86efac",
          }}
          role="status"
          aria-live="polite"
        >
          <p>
            If an account with that email exists, a password reset link has been
            sent. Please check your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/80"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors focus-visible:border-[#22d3ee]"
              aria-describedby={error ? "forgot-error" : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl px-6 py-3 font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-white hover:underline focus:underline focus:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
