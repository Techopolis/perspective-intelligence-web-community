import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, chats, messages } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const auth = await authenticateRequest();
  if (isAuthError(auth)) return auth;

  const userChats = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
      messageCount: sql<number>`(SELECT count(*) FROM messages WHERE messages.chat_id = ${chats.id})`,
    })
    .from(chats)
    .where(eq(chats.userId, auth.user.id))
    .orderBy(desc(chats.updatedAt));

  return NextResponse.json(userChats);
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (isAuthError(auth)) return auth;

  let title = "New Chat";
  try {
    const body = await request.json();
    if (body.title) title = body.title;
  } catch {
    // No body or invalid JSON, use default title
  }

  const [newChat] = await db
    .insert(chats)
    .values({
      userId: auth.user.id,
      title,
    })
    .returning();

  return NextResponse.json(newChat, { status: 201 });
}
