import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { DecodedIdToken } from "@/lib/firebase/admin";
import type { User } from "@/lib/db/schema";

export type AuthResult = {
  type: "firebase";
  user: User;
  decodedToken: DecodedIdToken;
};

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.split("Bearer ")[1];

  const decodedToken = await verifyIdToken(token);
  if (!decodedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.firebaseUid, decodedToken.uid),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return { type: "firebase", user, decodedToken };
}

export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
