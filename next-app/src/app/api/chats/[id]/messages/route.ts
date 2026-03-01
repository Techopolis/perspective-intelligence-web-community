import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, chats, messages } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { complete, classify, systemPrompt } from "@/lib/ai/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  // Verify chat ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, auth.user.id)),
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(chatMessages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
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
  const [userMessage] = await db
    .insert(messages)
    .values({
      chatId: id,
      role: "user",
      content: content.trim(),
    })
    .returning();

  // Auto-title: if this is the first message, set chat title
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
  let agentId: string;
  if (agent) {
    agentId = agent;
  } else if (chat.agent) {
    agentId = chat.agent;
  } else if (existingMessages.length <= 1) {
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

  try {
    const response = await complete(aiMessages);

    // Save assistant message
    const [assistantMessage] = await db
      .insert(messages)
      .values({
        chatId: id,
        role: "assistant",
        content: response,
      })
      .returning();

    // Update chat timestamp
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, id));

    return NextResponse.json({
      userMessage,
      assistantMessage,
      agent: agentId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI service unavailable";
    return NextResponse.json(
      { error: message, userMessage },
      { status: 502 }
    );
  }
}
