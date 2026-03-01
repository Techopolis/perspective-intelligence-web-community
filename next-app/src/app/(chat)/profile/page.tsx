"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EditProfileModal } from "@/components/chat/edit-profile-modal";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { user, dbUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const displayName = dbUser?.name || user?.displayName || "User";
  const email = dbUser?.email || user?.email || "";
  const pictureUrl = dbUser?.pictureUrl || null;
  const bio = dbUser?.bio || null;
  const memberSince = formatMemberSince(dbUser?.createdAt);
  const initials = getInitials(displayName);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ backgroundColor: "#0d0d0d" }}
      >
        <div className="border-b border-white/10 px-6 py-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-white outline-none"
          >
            Profile
          </h2>
        </div>

        <div className="mx-auto w-full max-w-lg px-4 py-8">
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-teal-400">
                {pictureUrl ? (
                  <img
                    src={pictureUrl}
                    alt={`Profile photo for ${displayName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <span
                      className="text-xl font-semibold text-white"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    <span className="sr-only">
                      No profile photo set, showing initials {initials}
                    </span>
                  </>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">
                  {displayName}
                </p>
                <p className="truncate text-sm text-white/60">{email}</p>
              </div>
            </div>

            <div className="mb-6 h-px bg-white/10" />

            <div className="mb-6">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/60">
                Bio
              </p>
              {bio ? (
                <p className="text-sm leading-relaxed text-white/80">{bio}</p>
              ) : (
                <p className="text-sm italic text-white/40">No bio yet.</p>
              )}
            </div>

            <div className="mb-6">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/60">
                Member since
              </p>
              <p className="text-sm text-white/80">{memberSince}</p>
            </div>

            <button
              ref={editButtonRef}
              onClick={() => setShowEditModal(true)}
              className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          returnFocusRef={editButtonRef}
        />
      )}
    </>
  );
}
