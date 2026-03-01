"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toaster";
import { ChatProvider } from "@/components/chat/chat-provider";
import { Sidebar } from "@/components/chat/sidebar";
import { useState, useEffect, useCallback } from "react";

export function ChatLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  return (
    <AuthProvider>
      <ToastProvider>
        <ChatProvider>
          <div className="flex h-screen" style={{ backgroundColor: "#0d0d0d" }}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Sidebar */}
            <aside
              className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              style={{
                background:
                  "linear-gradient(180deg, #0a1628 0%, #0f3a4a 100%)",
              }}
              aria-label="Chat history"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>

            {/* Main content */}
            <main
              id="main-content"
              className="flex min-h-0 flex-1 flex-col"
            >
              <h1 className="sr-only">Chat</h1>
              {/* Mobile header with menu button */}
              <div
                className="flex items-center border-b border-white/10 px-4 py-3 lg:hidden"
                style={{ backgroundColor: "#0d0d0d" }}
              >
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg p-2 text-white hover:bg-white/10"
                  aria-label="Open sidebar"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <span className="ml-3 text-lg font-semibold text-white" aria-hidden="true">
                  Perspective Intelligence
                </span>
              </div>
              {children}
            </main>
          </div>
        </ChatProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
