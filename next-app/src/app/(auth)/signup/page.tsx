"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/chat";
  const redirectTo = /^\/[a-zA-Z0-9]/.test(rawRedirect)
    ? rawRedirect
    : "/chat";
  const { signInWithApple, signUpWithEmail, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handleEmailSignUp = async (e: FormEvent) => {
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

    const { user, error } = await signUpWithEmail(email, password);

    if (error) {
      setError(getErrorMessage(error));
      setIsSubmitting(false);
      return;
    }

    if (user) {
      // Sync user to database
      const token = await user.getIdToken();
      const syncResult = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .catch(() => ({ isNew: true }));

      // New users go to onboarding
      if (syncResult.isNew) {
        router.push("/onboarding");
      } else {
        router.push(redirectTo);
      }
    }
  };

  const handleAppleSignIn = async () => {
    if (isAppleLoading) return;
    setError(null);
    setIsAppleLoading(true);
    sessionStorage.setItem("auth_redirect", redirectTo);
    const { user, error } = await signInWithApple();
    if (user || error) {
      setIsAppleLoading(false);
      sessionStorage.removeItem("auth_redirect");
    }
    if (error) {
      setError(error.message);
      return;
    }
    if (user) {
      const token = await user.getIdToken();
      const syncResult = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .catch(() => ({ isNew: true }));

      if (syncResult.isNew) {
        router.push("/onboarding");
      } else {
        router.push(redirectTo);
      }
    }
  };

  if (loading) {
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Create your account</h2>
        <p className="mt-2" style={{ color: "#9ca3af" }}>
          Start chatting with your private AI assistant
        </p>
      </div>

      {error && (
        <div
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

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isAppleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAppleLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          )}
          {isAppleLoading ? "Signing in..." : "Continue with Apple"}
        </button>
      </div>

      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span
            className="px-4"
            style={{ backgroundColor: "#0d0d0d", color: "#9ca3af" }}
          >
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignUp} className="space-y-4">
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
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-white/80"
          >
            Password
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
            Confirm password
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
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl px-6 py-3 font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
        Already have an account?{" "}
        <Link
          href={
            redirectTo !== "/chat"
              ? `/login?redirect=${encodeURIComponent(redirectTo)}`
              : "/login"
          }
          className="font-medium text-white hover:underline focus:underline focus:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function SignupLoading() {
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

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}

function getErrorMessage(error: Error): string {
  const message = error.message;

  if (message.includes("email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (message.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("weak-password")) {
    return "Password is too weak. Please use a stronger password.";
  }
  if (message.includes("popup-closed")) {
    return "Sign-up was cancelled. Please try again.";
  }

  return "An error occurred. Please try again.";
}
