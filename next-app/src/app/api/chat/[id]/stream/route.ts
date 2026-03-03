import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, chats, messages } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import {
  completeStreaming,
  classify,
  systemPrompt,
} from "@/lib/ai/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const { content, agent } = body as {
    content: string;
    agent?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  // Verify chat ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, auth.user.id)),
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Save user message
  await db.insert(messages).values({
    chatId: id,
    role: "user",
    content: content.trim(),
  });

  // Auto-title on first message
  const existingMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt));

  if (existingMessages.length === 1) {
    const title = content.trim().substring(0, 50);
    await db
      .update(chats)
      .set({ title, updatedAt: new Date() })
      .where(eq(chats.id, id));
  }

  // Determine agent — classify on first message, then persist on the chat record.
  // Follow-ups reuse the stored agent so the system prompt stays consistent.
  let agentId: string;
  if (agent) {
    agentId = agent;
  } else if (chat.agent) {
    // Chat already has a classified agent — reuse it
    agentId = chat.agent;
  } else if (existingMessages.length <= 1) {
    // First message in chat — classify it
    agentId = await classify(content);
  } else {
    agentId = "assistant";
  }

  // Persist agent on chat if not already set
  if (!chat.agent && agentId) {
    await db
      .update(chats)
      .set({ agent: agentId })
      .where(eq(chats.id, id));
  }

  // Build messages for Foundation Models
  const aiMessages = [
    { role: "system", content: systemPrompt(agentId) },
    ...existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // Stream response as SSE
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send stream_start event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "stream_start", agent: agentId })}\n\n`
          )
        );

        for await (const event of completeStreaming(aiMessages, id)) {
          if (event.type === "content") {
            fullContent += event.content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "chunk", content: event.content })}\n\n`
              )
            );
          } else if (event.type === "done") {
            // Detect soft refusals — don't save them to the DB so they
            // can't pollute future conversation context.
            const lower = fullContent.toLowerCase().replace(/\u2019/g, "'");
            const isRefusal =
              lower.includes("i can't assist") ||
              lower.includes("i cannot assist") ||
              lower.includes("i'm not able to help") ||
              lower.includes("sorry, but i can't") ||
              (lower.includes("sorry") && lower.includes("can't") && fullContent.length < 150);

            if (!isRefusal && fullContent.trim()) {
              await db.insert(messages).values({
                chatId: id,
                role: "assistant",
                content: fullContent,
              });
            }

            // Update chat timestamp
            await db
              .update(chats)
              .set({ updatedAt: new Date() })
              .where(eq(chats.id, id));

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  promptTokens: event.promptTokens,
                  completionTokens: event.completionTokens,
                })}\n\n`
              )
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Streaming error";

        // If we have partial content that isn't a refusal, save it
        if (fullContent) {
          const errLower = fullContent.toLowerCase().replace(/\u2019/g, "'");
          const errRefusal =
            errLower.includes("i can't assist") ||
            errLower.includes("i cannot assist") ||
            errLower.includes("sorry, but i can't");
          if (!errRefusal) {
            await db
              .insert(messages)
              .values({
                chatId: id,
                role: "assistant",
                content: fullContent,
              })
              .catch(() => {});
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
