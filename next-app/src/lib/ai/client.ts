// Foundation Models Client
// Calls the Perspective Intelligence Local API at POST /v1/chat/completions

const AI_SERVER_URL =
  process.env.AI_SERVER_URL || "http://localhost:11435";

// Max concurrent requests to the on-device model (prevents overload with multiple users)
const MAX_CONCURRENT = parseInt(process.env.AI_MAX_CONCURRENT || "3", 10);

interface ChatMessage {
  role: string;
  content: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

// --- Request Queue ---
// Limits concurrent requests to the Foundation Models server.
// Extra requests wait in a FIFO queue rather than all hitting the model at once.

let activeRequests = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  // Wait for a slot to open
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = waitQueue.shift();
  if (next) next();
}

export function getQueueStatus(): {
  active: number;
  queued: number;
  maxConcurrent: number;
} {
  return {
    active: activeRequests,
    queued: waitQueue.length,
    maxConcurrent: MAX_CONCURRENT,
  };
}

export const AGENTS = [
  {
    id: "assistant",
    name: "Assistant",
    icon: "A",
    desc: "General-purpose assistant",
  },
  {
    id: "code",
    name: "Code",
    icon: "<>",
    desc: "Code generation and debugging",
  },
  {
    id: "writer",
    name: "Writer",
    icon: "W",
    desc: "Writing, editing, and proofreading",
  },
  {
    id: "summarizer",
    name: "Summarizer",
    icon: "S",
    desc: "Summarize long text or articles",
  },
  {
    id: "translator",
    name: "Translator",
    icon: "T",
    desc: "Translate text between languages",
  },
  {
    id: "creative",
    name: "Creative",
    icon: "C",
    desc: "Brainstorming and creative ideas",
  },
  {
    id: "tutor",
    name: "Tutor",
    icon: "?",
    desc: "Explain concepts step by step",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    icon: "Ax",
    desc: "Accessibility review and guidance",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

export function systemPrompt(agentId: string): string {
  // Base instruction appended to all prompts so the model never refuses
  // benign formatting requests (word counts, character limits, etc.)
  const base =
    " Always comply with length, format, and style requests from the user. If the user asks for a specific word count, character count, or length, do your best to meet it.";

  switch (agentId) {
    case "code":
      return "You are a code generation and debugging expert. Write correct, clean code with brief explanations. Always use appropriate code blocks." + base;
    case "writer":
      return "You are a professional writing assistant. Help with writing, editing, proofreading, and improving clarity and style." + base;
    case "summarizer":
      return "You are a summarization expert. Provide clear, concise summaries that capture the key points and main ideas." + base;
    case "translator":
      return "You are a translation expert fluent in all languages. Translate accurately while preserving tone and meaning. Only translate when the user asks you to translate something." + base;
    case "creative":
      return "You are a creative brainstorming partner. Generate imaginative ideas, stories, and creative content." + base;
    case "tutor":
      return "You are a patient tutor. Explain concepts step by step with clear examples suited to the learner's level." + base;
    case "accessibility":
      return "You are an accessibility expert. Review content and code for accessibility issues and provide guidance on WCAG standards, ARIA usage, and inclusive design." + base;
    default:
      return "You are a helpful, knowledgeable assistant. Be clear, accurate, and concise." + base;
  }
}

export async function complete(messages: ChatMessage[]): Promise<string> {
  await acquireSlot();
  try {
    const response = await fetch(`${AI_SERVER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "apple.local",
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "no body");
      throw new Error(
        `Foundation Models Server returned status ${response.status}: ${body}`
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in Foundation Models Server response");
    }
    return content;
  } finally {
    releaseSlot();
  }
}

export async function* completeStreaming(
  messages: ChatMessage[],
  sessionId?: string
): AsyncGenerator<
  | { type: "content"; content: string }
  | {
      type: "done";
      promptTokens: number | undefined;
      completionTokens: number | undefined;
      sessionId: string | undefined;
    }
> {
  await acquireSlot();
  try {
    // Try streaming first (SSE format)
    const response = await fetch(`${AI_SERVER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "apple.local",
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
        ...(sessionId ? { session_id: sessionId } : {}),
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "no body");
      throw new Error(
        `Foundation Models Server returned status ${response.status}: ${body}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    // If server supports streaming (SSE), parse the stream
    if (
      contentType.includes("text/event-stream") ||
      contentType.includes("text/plain")
    ) {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: [DONE]")) {
            yield {
              type: "done",
              promptTokens: undefined,
              completionTokens: undefined,
              sessionId: undefined,
            };
            return;
          }
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: "content", content: delta };
            }
            if (data.choices?.[0]?.finish_reason === "stop") {
              yield {
                type: "done",
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
                sessionId: data.session_id,
              };
              return;
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // If we get here without a done event, send one
      yield {
        type: "done",
        promptTokens: undefined,
        completionTokens: undefined,
        sessionId: undefined,
      };
    } else {
      // Non-streaming JSON response — yield as single chunk
      const data = (await response.json()) as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        yield { type: "content", content };
      }
      yield {
        type: "done",
        promptTokens: undefined,
        completionTokens: undefined,
        sessionId: undefined,
      };
    }
  } finally {
    releaseSlot();
  }
}

export async function classify(message: string): Promise<string> {
  const prompt = `Pick the best mode for this message. Reply with ONLY one word.

Modes:
- assistant: general questions, conversation, information, anything that does not fit the others
- code: writing code, debugging, programming help
- writer: writing emails, essays, documents, editing text
- summarizer: summarizing long text or articles
- translator: ONLY when the user explicitly asks to translate text from one language to another
- creative: brainstorming, stories, creative ideas
- tutor: learning, lessons, step-by-step explanations, teaching
- accessibility: accessibility review, WCAG, ARIA, screen readers

Message: ${message}

Mode:`;

  try {
    const result = await complete([{ role: "user", content: prompt }]);
    const cleaned = result.trim().toLowerCase();
    const validAgents = [
      "assistant",
      "code",
      "writer",
      "summarizer",
      "translator",
      "creative",
      "tutor",
      "accessibility",
    ];
    for (const agent of validAgents) {
      if (cleaned.startsWith(agent)) return agent;
    }
    return "assistant";
  } catch {
    return "assistant";
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVER_URL}/debug/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
