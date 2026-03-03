import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/authenticate";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const { goals, aiFamiliarity } = body as {
    goals?: string;
    aiFamiliarity?: string;
  };

  await db
    .update(users)
    .set({
      goals: goals || null,
      aiFamiliarity: aiFamiliarity || null,
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, auth.user.id));

  return NextResponse.json({ success: true });
}
