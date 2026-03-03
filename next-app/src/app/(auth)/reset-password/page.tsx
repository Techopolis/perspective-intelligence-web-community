"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Invalid link</h2>
          <p className="mt-2" style={{ color: "#9ca3af" }}>
            This password reset link is invalid or has expired.
          </p>
        </div>
        <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
          <Link
            href="/forgot-password"
            className="font-medium text-white hover:underline focus:underline focus:outline-none"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
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
        <h2 className="text-3xl font-bold text-white">Set new password</h2>
        <p className="mt-2" style={{ color: "#9ca3af" }}>
          Enter your new password below
        </p>
      </div>

      {error && (
        <div
          id="reset-error"
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
            Your password has been reset. You can now sign in with your new
            password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/80"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors focus-visible:border-[#22d3ee]"
              aria-describedby="password-requirements"
            />
            <p
              id="password-requirements"
              className="mt-1 text-sm"
              style={{ color: "#b0b0b0" }}
            >
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-white/80"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors focus-visible:border-[#22d3ee]"
              aria-describedby={error ? "reset-error" : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl px-6 py-3 font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}

      <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
        <Link
          href="/login"
          className="font-medium text-white hover:underline focus:underline focus:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <div
      className="flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
        style={{ borderColor: "#0f3a4a", borderTopColor: "transparent" }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
