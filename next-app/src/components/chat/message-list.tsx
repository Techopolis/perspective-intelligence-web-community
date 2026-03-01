"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  agent?: string;
}

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
  activeAgent?: string | null;
}

const AGENT_LABELS: Record<string, string> = {
  assistant: "Assistant",
  code: "Code",
  writer: "Writer",
  summarizer: "Summarizer",
  translator: "Translator",
  creative: "Creative",
  tutor: "Tutor",
  accessibility: "Accessibility",
};

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  isLoading,
  activeAgent,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const wasStreamingRef = useRef(false);
  const userScrolledUpRef = useRef(false);

  // Detect if user has scrolled away from bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 100;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom — only if user hasn't scrolled up
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || userScrolledUpRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length, streamingContent]);

  // Announce which agent is responding when streaming starts
  useEffect(() => {
    if (!announceRef.current) return;
    if (isStreaming && activeAgent && !wasStreamingRef.current) {
      const label = AGENT_LABELS[activeAgent] || activeAgent;
      announceRef.current.textContent = `${label} is responding`;
    } else if (isStreaming && !wasStreamingRef.current) {
      announceRef.current.textContent = "Thinking";
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, activeAgent]);

  // Announce assistant responses with the agent label
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      const lastNew = newMessages[newMessages.length - 1];
      if (lastNew && lastNew.role === "assistant" && announceRef.current) {
        const label = activeAgent
          ? AGENT_LABELS[activeAgent] || activeAgent
          : "Assistant";
        announceRef.current.textContent = `${label} says: ${lastNew.content}`;
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, activeAgent]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white/80" />
        <span className="sr-only">Loading messages...</span>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          }}
          aria-hidden="true"
        >
          <span className="text-2xl font-bold text-white">P</span>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          How can I help you today?
        </h2>
        <p className="max-w-md text-sm" style={{ color: "#9ca3af" }}>
          Start a conversation by typing a message below. You can also type @ to
          select a specialized agent.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Dedicated live region for new message announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
        role="log"
        aria-label="Messages"
        aria-live="off"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming message - hidden from screen reader until complete */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start" aria-hidden="true">
              <div className="bubble-assistant">
                <h3 className="message-role">
                  {activeAgent
                    ? AGENT_LABELS[activeAgent] || activeAgent
                    : "Assistant"}
                </h3>
                <MarkdownContent content={streamingContent} />
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start" aria-hidden="true">
              <div className="bubble-assistant flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "#9ca3af" }}>
                  {activeAgent
                    ? `${AGENT_LABELS[activeAgent] || activeAgent} is responding`
                    : "Thinking"}
                </span>
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-white/40"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-white/40"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-white/40"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const roleLabel = isUser
    ? "You"
    : message.agent
      ? AGENT_LABELS[message.agent] || message.agent
      : "Assistant";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "bubble-user" : "bubble-assistant"}>
        <h3 className="message-role">{roleLabel}</h3>

        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {!isUser && <CopyButton content={message.content} />}
      </div>
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const announceRef = useRef<HTMLSpanElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  return (
    <div className="mt-2 flex justify-start">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors text-white/40 hover:bg-white/10 hover:text-white/70"
      >
        {copied ? (
          <>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Copied</span>
          </>
        ) : (
          <>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Copy message</span>
          </>
        )}
      </button>
      <span ref={announceRef} className="sr-only" aria-live="polite">
        {copied ? "Message copied to clipboard" : ""}
      </span>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none text-sm text-inherit">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => {
            const sanitizedHref = DOMPurify.sanitize(href || "");
            return (
              <a
                href={sanitizedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                {children}
              </a>
            );
          },
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="rounded bg-white/10 px-1.5 py-0.5 text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
