"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthProvider } from "@/hooks/use-auth";

function OnboardingContent() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [familiarity, setFamiliarity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = [
    { id: "chat", label: "Chat & Questions", desc: "Ask questions and have conversations" },
    { id: "documents", label: "Document Processing", desc: "Extract and analyze text from documents" },
    { id: "images", label: "Image Recognition", desc: "Describe and analyze images" },
    { id: "coding", label: "Coding Assistance", desc: "Get help writing and debugging code" },
    { id: "writing", label: "Writing & Editing", desc: "Improve your writing and drafts" },
  ];

  const familiarityLevels = [
    { id: "beginner", label: "Beginner", desc: "New to AI assistants" },
    { id: "intermediate", label: "Intermediate", desc: "Used ChatGPT or similar" },
    { id: "advanced", label: "Advanced", desc: "Power user, familiar with prompting" },
  ];

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: selectedGoals.join(","),
          aiFamiliarity: familiarity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Refresh session so JWT picks up onboardingCompleted=true
      await refreshUser();
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-8"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      <main id="main-content" className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-3xl font-bold italic text-white"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Perspective Intelligence
          </h1>
          <p style={{ color: "#9ca3af" }}>
            Let us personalize your experience
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex justify-center gap-2" aria-hidden="true">
          <div
            className="h-2 w-16 rounded-full"
            style={{ backgroundColor: step >= 1 ? "#3b82f6" : "#333" }}
          />
          <div
            className="h-2 w-16 rounded-full"
            style={{ backgroundColor: step >= 2 ? "#3b82f6" : "#333" }}
          />
        </div>
        <p className="sr-only" aria-live="polite">Step {step} of 2</p>

        {error && (
          <div
            className="mb-6 rounded-lg p-4 text-sm"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#fca5a5",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 id="goals-heading" className="mb-4 text-xl font-semibold text-white">
              What do you want to use Perspective Intelligence for?
            </h2>
            <p className="mb-6 text-sm" style={{ color: "#9ca3af" }}>
              Select all that apply
            </p>

            <fieldset aria-labelledby="goals-heading">
              <div className="space-y-3">
                {goals.map((goal) => (
                  <label
                    key={goal.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor: selectedGoals.includes(goal.id)
                        ? "#3b82f6"
                        : "rgba(255,255,255,0.1)",
                      backgroundColor: selectedGoals.includes(goal.id)
                        ? "rgba(59, 130, 246, 0.1)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGoals.includes(goal.id)}
                      onChange={() => toggleGoal(goal.id)}
                      className="h-5 w-5 rounded"
                    />
                    <div>
                      <div className="font-medium text-white">{goal.label}</div>
                      <div className="text-sm" style={{ color: "#9ca3af" }}>
                        {goal.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              onClick={() => setStep(2)}
              className="mt-8 w-full rounded-xl px-6 py-3 font-semibold transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 id="familiarity-heading" className="mb-4 text-xl font-semibold text-white">
              How familiar are you with AI assistants?
            </h2>

            <fieldset aria-labelledby="familiarity-heading">
              <div className="space-y-3">
                {familiarityLevels.map((level) => (
                  <label
                    key={level.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor:
                        familiarity === level.id
                          ? "#3b82f6"
                          : "rgba(255,255,255,0.1)",
                      backgroundColor:
                        familiarity === level.id
                          ? "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="familiarity"
                      value={level.id}
                      checked={familiarity === level.id}
                      onChange={() => setFamiliarity(level.id)}
                      className="h-5 w-5"
                    />
                    <div>
                      <div className="font-medium text-white">
                        {level.label}
                      </div>
                      <div className="text-sm" style={{ color: "#9ca3af" }}>
                        {level.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-xl px-6 py-3 font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#f5f0e6", color: "#1a1a1a" }}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Get started"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthProvider>
      <OnboardingContent />
    </AuthProvider>
  );
}
