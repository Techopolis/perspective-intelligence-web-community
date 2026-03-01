"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "./chat-provider";
import { UserMenu } from "./user-menu";

export function Sidebar({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    chats,
    activeChatId,
    isLoadingChats,
    loadChats,
    selectChat,
    createChat,
    deleteChat,
  } = useChat();

  useEffect(() => {
    if (user) loadChats();
  }, [user, loadChats]);

  const handleNewChat = async () => {
    await createChat();
    onClose();
  };

  const handleSelectChat = async (chatId: string) => {
    await selectChat(chatId);
    onClose();
  };

  const handleDeleteChat = async (
    e: React.MouseEvent,
    chatId: string
  ) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      await deleteChat(chatId);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <h2
          className="text-lg font-bold italic text-white"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Perspective Intelligence
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close sidebar"
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

      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-medium text-white transition-colors hover:bg-white/10"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Chat history">
        {isLoadingChats ? (
          <div className="flex justify-center py-8" role="status">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="sr-only">Loading chats...</span>
          </div>
        ) : chats.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">
            No chats yet. Start a new conversation.
          </p>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li
                key={chat.id}
                className={`group flex items-center justify-between rounded-lg transition-colors ${
                  activeChatId === chat.id
                    ? "bg-white/15"
                    : "hover:bg-white/10"
                }`}
              >
                <button
                  onClick={() => handleSelectChat(chat.id)}
                  className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${
                    activeChatId === chat.id
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                  aria-current={
                    activeChatId === chat.id ? "page" : undefined
                  }
                >
                  {chat.title}
                </button>
                <button
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  className="mr-1 rounded p-1 text-white/40 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                  aria-label={`Delete chat: ${chat.title}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* User menu */}
      <UserMenu onSignOut={handleSignOut} onClose={onClose} />
    </div>
  );
}
