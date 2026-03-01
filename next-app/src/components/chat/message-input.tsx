"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { AgentPicker, getFilteredAgents } from "./agent-picker";
import { useChat } from "./chat-provider";
import { AGENTS } from "@/lib/ai/client";

export function MessageInput() {
  const { sendMessage, isStreaming, selectedAgent, setSelectedAgent, activeChatId } =
    useChat();
  const [content, setContent] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Focus the textarea when a chat is selected or created,
  // or when streaming ends (textarea re-enables after being disabled)
  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [activeChatId, isStreaming]);

  // Compute active descendant for ARIA
  const filtered = getFilteredAgents(pickerFilter);
  const activeDescendantId =
    showPicker && filtered[highlightIndex]
      ? `agent-option-${filtered[highlightIndex].id}`
      : undefined;

  // Announce when picker opens or highlight changes
  useEffect(() => {
    if (!showPicker || !announceRef.current) return;
    if (filtered.length === 0) {
      announceRef.current.textContent = "No matching agents";
      return;
    }
    const agent = filtered[highlightIndex];
    if (agent) {
      announceRef.current.textContent = `${agent.name}, ${agent.desc}, ${highlightIndex + 1} of ${filtered.length}`;
    }
  }, [showPicker, highlightIndex, filtered]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    setContent("");
    setShowPicker(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(trimmed);

    // Return focus to textarea after sending
    textareaRef.current?.focus();
  }, [content, isStreaming, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPicker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleAgentSelect(filtered[highlightIndex].id);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPicker(false);
        setPickerFilter("");
        if (announceRef.current) {
          announceRef.current.textContent = "Agent picker closed";
        }
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }

    // Check for @ trigger
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      const charBefore = lastAtIndex > 0 ? value[lastAtIndex - 1] : " ";
      if (charBefore === " " || lastAtIndex === 0) {
        if (!afterAt.includes(" ")) {
          const wasOpen = showPicker;
          setShowPicker(true);
          setPickerFilter(afterAt);
          setHighlightIndex(0);

          // Announce picker opening
          if (!wasOpen && announceRef.current) {
            const matchCount = getFilteredAgents(afterAt).length;
            announceRef.current.textContent = `Agent picker open, ${matchCount} agents available. Use arrow keys to navigate, Enter to select.`;
          }
          return;
        }
      }
    }

    if (showPicker) {
      setShowPicker(false);
      setPickerFilter("");
    }
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setShowPicker(false);
    setPickerFilter("");

    // Announce selection
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent && announceRef.current) {
      announceRef.current.textContent = `Now using ${agent.name} agent. ${agent.desc}`;
    }

    // Remove @query from input
    const lastAtIndex = content.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      setContent(content.substring(0, lastAtIndex));
    }

    textareaRef.current?.focus();
  };

  const handleClearAgent = () => {
    const agentName = AGENTS.find((a) => a.id === selectedAgent)?.name;
    setSelectedAgent(null);

    if (agentName && announceRef.current) {
      announceRef.current.textContent = `Removed ${agentName} agent`;
    }

    textareaRef.current?.focus();
  };

  return (
    <div
      className="border-t border-white/10 p-4"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      {/* Live region for agent selection announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="status"
      />

      <div className="mx-auto max-w-3xl">
        {/* Agent pill */}
        {selectedAgent && (
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: "rgba(99, 102, 241, 0.3)" }}
            >
              @{selectedAgent}
              <button
                onClick={handleClearAgent}
                className="ml-1 rounded-full p-0.5 hover:bg-white/10"
                aria-label={`Remove ${selectedAgent} agent`}
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          </div>
        )}

        <div className="relative">
          {/* Agent picker dropdown */}
          {showPicker && (
            <AgentPicker
              filter={pickerFilter}
              highlightIndex={highlightIndex}
              onHighlightChange={setHighlightIndex}
              onSelect={handleAgentSelect}
              onClose={() => {
                setShowPicker(false);
                setPickerFilter("");
              }}
            />
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={
                isStreaming
                  ? "Waiting for response..."
                  : "Type a message... (@ for agents)"
              }
              rows={1}
              className="flex-1 resize-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors focus-visible:border-[#22d3ee] disabled:opacity-50"
              role="combobox"
              aria-label="Message"
              aria-expanded={showPicker}
              aria-controls="agent-picker-listbox"
              aria-activedescendant={activeDescendantId}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              style={{ maxHeight: "200px" }}
            />
            <button
              onClick={handleSend}
              disabled={!content.trim() || isStreaming}
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ backgroundColor: "#f5f0e6" }}
              aria-label="Send message"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#1a1a1a"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19V5m0 0l-7 7m7-7l7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
