import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, chats, messages } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const chat = await db
    .select({
      id: chats.id,
      title: chats.title,
      userId: chats.userId,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
      messageCount: sql<number>`(SELECT count(*) FROM messages WHERE messages.chat_id = ${chats.id})`,
    })
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, auth.user.id)))
    .limit(1);

  if (chat.length === 0) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json(chat[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const existing = await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, auth.user.id)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(chats)
    .set({
      title: body.title ?? existing.title,
      updatedAt: new Date(),
    })
    .where(eq(chats.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const existing = await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, auth.user.id)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await db.delete(chats).where(eq(chats.id, id));

  return NextResponse.json({ success: true });
}
