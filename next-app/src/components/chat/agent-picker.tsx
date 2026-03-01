"use client";

import { useEffect, useRef } from "react";
import { AGENTS } from "@/lib/ai/client";

interface AgentPickerProps {
  filter: string;
  highlightIndex: number;
  onHighlightChange: (index: number) => void;
  onSelect: (agentId: string) => void;
  onClose: () => void;
}

export function AgentPicker({
  filter,
  highlightIndex,
  onHighlightChange,
  onSelect,
  onClose,
}: AgentPickerProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = getFilteredAgents(filter);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const highlighted = listRef.current.querySelector('[aria-selected="true"]');
    if (highlighted) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bottom-full mb-2 w-full rounded-xl border border-white/20 shadow-xl"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <div className="border-b border-white/10 px-4 py-2">
        <p
          className="text-xs font-medium"
          style={{ color: "#9ca3af" }}
          id="agent-picker-label"
        >
          Agents ({filtered.length})
        </p>
      </div>
      <ul
        ref={listRef}
        className="max-h-64 overflow-y-auto py-2"
        role="listbox"
        id="agent-picker-listbox"
        aria-labelledby="agent-picker-label"
      >
        {filtered.map((agent, index) => (
          <li
            key={agent.id}
            id={`agent-option-${agent.id}`}
            role="option"
            aria-selected={index === highlightIndex}
            className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
              index === highlightIndex ? "bg-white/10" : "hover:bg-white/5"
            }`}
            onClick={() => onSelect(agent.id)}
            onMouseEnter={() => onHighlightChange(index)}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              }}
              aria-hidden="true"
            >
              {agent.icon}
            </span>
            <div>
              <div className="text-sm font-medium text-white">
                {agent.name}
              </div>
              <div className="text-xs" style={{ color: "#9ca3af" }}>
                {agent.desc}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Filter agents by query text — shared between picker and input */
export function getFilteredAgents(filter: string) {
  return AGENTS.filter(
    (agent) =>
      agent.id.toLowerCase().includes(filter.toLowerCase()) ||
      agent.name.toLowerCase().includes(filter.toLowerCase())
  );
}
