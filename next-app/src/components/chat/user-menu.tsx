"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EditProfileModal } from "./edit-profile-modal";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  onSignOut,
  onClose,
}: {
  onSignOut: () => void;
  onClose?: () => void;
}) {
  const { user, dbUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLElement[]>([]);

  const displayName =
    dbUser?.name || user?.name || user?.email || "User";
  const email = dbUser?.email || user?.email || "";
  const pictureUrl = dbUser?.pictureUrl || user?.image || null;
  const initials = getInitials(displayName);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, closeMenu]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeMenu]);

  // Focus first menu item when opened
  useEffect(() => {
    if (isOpen) {
      menuItemsRef.current[0]?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = menuItemsRef.current.filter(Boolean);
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
        break;
      }
      case "Home": {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case "End": {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
      case "Tab": {
        closeMenu();
        break;
      }
    }
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    setShowEditProfile(true);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onClose?.();
    onSignOut();
  };

  return (
    <div className="relative border-t border-white/10 p-4">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`User menu, ${displayName}`}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-teal-400">
          {pictureUrl ? (
            <img
              src={pictureUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-white">
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-white" aria-hidden="true">
          {displayName}
        </span>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      {/* Dropdown menu — opens upward */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User menu"
          onKeyDown={handleKeyDown}
          className="absolute bottom-full left-4 right-4 mb-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-lg"
        >
          {/* User info header */}
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-medium text-white">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-xs text-white/60">{email}</p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/profile"
              ref={(el) => {
                if (el) menuItemsRef.current[0] = el;
              }}
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              View Profile
            </Link>

            <button
              ref={(el) => {
                if (el) menuItemsRef.current[1] = el;
              }}
              role="menuitem"
              onClick={handleEditProfile}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Edit Profile
            </button>

            <button
              ref={(el) => {
                if (el) menuItemsRef.current[2] = el;
              }}
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-white/10 hover:text-red-300 focus:bg-white/10 focus:text-red-300"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          returnFocusRef={triggerRef}
        />
      )}
    </div>
  );
}
