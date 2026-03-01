import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  return NextResponse.json({
    id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    pictureUrl: auth.user.pictureUrl,
    bio: auth.user.bio ?? null,
    createdAt: auth.user.createdAt?.toISOString() ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const { name, pictureUrl, bio } = body as {
    name?: string;
    pictureUrl?: string;
    bio?: string;
  };

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      return NextResponse.json(
        { error: "Name is required and must be 100 characters or fewer" },
        { status: 400 }
      );
    }
  }

  if (pictureUrl !== undefined && pictureUrl !== "") {
    try {
      new URL(pictureUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid picture URL" },
        { status: 400 }
      );
    }
  }

  if (bio !== undefined && bio.trim().length > 500) {
    return NextResponse.json(
      { error: "Bio must be 500 characters or fewer" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name.trim();
  if (pictureUrl !== undefined) updates.pictureUrl = pictureUrl || null;
  if (bio !== undefined) updates.bio = bio.trim() || null;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, auth.user.id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    pictureUrl: updated.pictureUrl,
    bio: updated.bio ?? null,
    createdAt: updated.createdAt?.toISOString() ?? null,
  });
}
