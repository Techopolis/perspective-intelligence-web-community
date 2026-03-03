"use client";

import { useState, useRef, useEffect, useCallback, RefObject } from "react";
import { useAuth } from "@/hooks/use-auth";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function getGravatarUrl(email: string): Promise<string> {
  const trimmed = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `https://gravatar.com/avatar/${hashHex}?s=200&d=404`;
}

export function EditProfileModal({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const { user, dbUser } = useAuth();
  const BIO_MAX = 500;
  const [name, setName] = useState(
    dbUser?.name || user?.name || ""
  );
  const [pictureUrl, setPictureUrl] = useState(dbUser?.pictureUrl || "");
  const [bio, setBio] = useState(dbUser?.bio || "");
  const [bioAnnouncement, setBioAnnouncement] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingGravatar, setIsFetchingGravatar] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const email = dbUser?.email || user?.email || "";
  const initials = getInitials(name || "?");

  // Announce character limit thresholds for screen readers
  useEffect(() => {
    const len = bio.length;
    if (len === 450) setBioAnnouncement("50 characters remaining");
    else if (len === 475) setBioAnnouncement("25 characters remaining");
    else if (len === 490) setBioAnnouncement("10 characters remaining");
    else if (len === BIO_MAX) setBioAnnouncement("Character limit reached");
  }, [bio.length]);

  // Focus first input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      returnFocusRef?.current?.focus();
    };
  }, [returnFocusRef]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    []
  );

  const handleFetchGravatar = async () => {
    if (!email || isFetchingGravatar) return;
    setIsFetchingGravatar(true);
    setError("");
    setStatusMessage("");
    try {
      const url = await getGravatarUrl(email);
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        setPictureUrl(url.split("?")[0] + "?s=200");
        setStatusMessage("Gravatar found");
      } else {
        setError("No Gravatar found for this email");
      }
    } catch {
      setError("Could not fetch Gravatar");
    } finally {
      setIsFetchingGravatar(false);
    }
  };

  const handleApplyManualUrl = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      setPictureUrl(trimmed);
      setManualUrl("");
      setError("");
      setStatusMessage("Avatar URL applied");
    } catch {
      setError("Invalid URL");
    }
  };

  const handleRemoveAvatar = () => {
    setPictureUrl("");
    setStatusMessage("Avatar removed");
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      nameInputRef.current?.focus();
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Name must be 100 characters or fewer");
      nameInputRef.current?.focus();
      return;
    }
    setNameError("");

    setIsSaving(true);
    setError("");
    setStatusMessage("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, pictureUrl: pictureUrl || "", bio: bio.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        setIsSaving(false);
        return;
      }

      window.dispatchEvent(new Event("profile-updated"));
      onClose();
    } catch {
      setError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 id="edit-profile-title" className="text-lg font-semibold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Avatar preview */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-teal-400">
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt="Avatar preview"
                className="h-full w-full object-cover"
                onError={() => setPictureUrl("")}
              />
            ) : (
              <span className="text-xl font-semibold text-white">
                {initials}
              </span>
            )}
          </div>

          {/* Gravatar fetch */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFetchGravatar}
              aria-disabled={isFetchingGravatar || !email}
              className={`min-h-[44px] rounded-lg border border-white/10 px-3 text-xs transition-colors ${
                isFetchingGravatar || !email
                  ? "cursor-not-allowed text-white/30"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {isFetchingGravatar ? "Fetching..." : "Fetch Gravatar"}
            </button>
            {pictureUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="min-h-[44px] rounded-lg border border-white/10 px-3 text-xs text-red-400 transition-colors hover:bg-white/10 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>

          {/* Manual URL */}
          <div className="flex w-full items-center gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Paste avatar URL..."
              aria-label="Avatar URL"
              className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyManualUrl();
                }
              }}
            />
            <button
              onClick={handleApplyManualUrl}
              disabled={!manualUrl.trim()}
              className="min-h-[44px] rounded-lg border border-white/10 px-3 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label
            htmlFor="profile-name"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Display Name
          </label>
          <input
            ref={nameInputRef}
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            maxLength={100}
            required
            aria-invalid={nameError ? "true" : undefined}
            aria-describedby={nameError ? "name-error" : undefined}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          {nameError && (
            <p id="name-error" className="mt-1.5 text-xs text-red-400">
              {nameError}
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-white/70">
            Email
          </label>
          <p className="truncate rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm text-white/60">
            {email}
          </p>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label
            htmlFor="profile-bio"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Bio
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            placeholder="Tell us a little about yourself..."
            aria-describedby="bio-counter"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <p
            id="bio-counter"
            className={`mt-1 text-right text-xs ${
              bio.length >= 450 ? "font-semibold text-amber-400" : "text-white/50"
            }`}
          >
            {bio.length >= 450
              ? `${BIO_MAX - bio.length} characters remaining`
              : `${bio.length}/${BIO_MAX}`}
          </p>
          <div role="status" aria-live="polite" className="sr-only">
            {bioAnnouncement}
          </div>
        </div>

        {/* Live regions — always in DOM */}
        <div
          role="alert"
          aria-atomic="true"
          className={`mb-4 rounded-lg px-3 py-2 text-xs ${
            error ? "bg-red-500/10 text-red-400" : "sr-only"
          }`}
        >
          {error}
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 rounded-lg px-3 py-2 text-xs ${
            statusMessage ? "bg-green-500/10 text-green-400" : "sr-only"
          }`}
        >
          {statusMessage}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-lg px-4 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
