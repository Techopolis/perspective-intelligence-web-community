// Context Summarization for Perspective Intelligence Web
// Ports the ContextSummarizationService pattern from Perspective-Chat (Swift)
// to handle Apple Foundation Models' 4096 token context window.

import { complete } from "./client";

// Token budget constants — matching Perspective-Chat exactly
const MAX_CONTEXT_TOKENS = 4096;
const CHARS_PER_TOKEN = 4;
const SAFETY_BUFFER_TOKENS = 300;
const BASE_INSTRUCTION_TOKENS = 400;
const MIN_RESPONSE_TOKENS = 400;
const MAX_SUMMARY_CHARS = 800;

// Threshold: if projected input tokens exceed this, summarize
const SUMMARIZE_THRESHOLD =
  MAX_CONTEXT_TOKENS - SAFETY_BUFFER_TOKENS - MIN_RESPONSE_TOKENS; // 3396

interface MessageRecord {
  role: string;
  content: string;
  createdAt: Date | null;
}

interface ChatContext {
  runningSummary: string | null;
  contextResetAnchor: Date | null;
}

interface BuildContextResult {
  aiMessages: Array<{ role: string; content: string }>;
  summarized: boolean;
  newSummary: string | null;
  newAnchor: Date | null;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function shouldSummarize(
  systemPrompt: string,
  messages: MessageRecord[],
  existingSummary: string | null
): boolean {
  let totalTokens = estimateTokens(systemPrompt) + BASE_INSTRUCTION_TOKENS;

  if (existingSummary) {
    totalTokens += estimateTokens(existingSummary);
  }

  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content);
  }

  return totalTokens > SUMMARIZE_THRESHOLD;
}

export async function generateSummary(
  messages: MessageRecord[],
  existingSummary: string | null
): Promise<string> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = existingSummary
    ? `You are a conversation summarizer. Below is an existing summary of earlier conversation, followed by new messages. Create an updated bullet-point summary that captures ALL key topics, facts, preferences, and decisions. Be concise but complete. Maximum 800 characters.

Existing summary:
${existingSummary}

New messages:
${conversationText}

Updated summary:`
    : `You are a conversation summarizer. Summarize the following conversation as bullet points capturing key topics, facts, preferences, and decisions. Be concise but complete. Maximum 800 characters.

${conversationText}

Summary:`;

  const result = await complete([{ role: "user", content: prompt }]);

  // Hard-truncate to MAX_SUMMARY_CHARS
  return result.slice(0, MAX_SUMMARY_CHARS).trim();
}

export async function buildContextMessages(
  systemPromptText: string,
  allMessages: MessageRecord[],
  chat: ChatContext
): Promise<BuildContextResult> {
  // Filter messages to only those after contextResetAnchor
  let recentMessages = allMessages;
  if (chat.contextResetAnchor) {
    const anchor = chat.contextResetAnchor.getTime();
    recentMessages = allMessages.filter(
      (m) => m.createdAt && m.createdAt.getTime() > anchor
    );
    // Safety fallback: if anchor filtered out everything, keep last 2
    if (recentMessages.length === 0) {
      recentMessages = allMessages.slice(-2);
    }
  }

  // Build system prompt with existing summary if present
  const systemWithSummary = chat.runningSummary
    ? `${systemPromptText}\n\nConversation summary so far:\n${chat.runningSummary}`
    : systemPromptText;

  // Check if we need to summarize
  if (!shouldSummarize(systemWithSummary, recentMessages, null)) {
    // No summarization needed — send everything
    return {
      aiMessages: [
        { role: "system", content: systemWithSummary },
        ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      summarized: false,
      newSummary: null,
      newAnchor: null,
    };
  }

  // Summarization needed — keep last 2 messages, summarize the rest
  const keepCount = Math.min(2, recentMessages.length);
  const keptMessages = recentMessages.slice(-keepCount);
  const toSummarize = recentMessages.slice(0, -keepCount);

  let newSummary: string;
  try {
    if (toSummarize.length > 0) {
      newSummary = await generateSummary(toSummarize, chat.runningSummary);
    } else {
      // Nothing to summarize beyond what we already have
      newSummary = chat.runningSummary || "";
    }
  } catch {
    // Summarization failed (AI server issue) — fall back to system + last 2
    console.error("[context] Summary generation failed, using fallback");
    const fallbackMessages = allMessages.slice(-2);
    return {
      aiMessages: [
        { role: "system", content: systemWithSummary },
        ...fallbackMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      summarized: false,
      newSummary: null,
      newAnchor: null,
    };
  }

  // The anchor is the createdAt of the last summarized message
  const newAnchor =
    toSummarize.length > 0
      ? toSummarize[toSummarize.length - 1].createdAt
      : chat.contextResetAnchor;

  const systemWithNewSummary = newSummary
    ? `${systemPromptText}\n\nConversation summary so far:\n${newSummary}`
    : systemPromptText;

  return {
    aiMessages: [
      { role: "system", content: systemWithNewSummary },
      ...keptMessages.map((m) => ({ role: m.role, content: m.content })),
    ],
    summarized: true,
    newSummary,
    newAnchor,
  };
}
