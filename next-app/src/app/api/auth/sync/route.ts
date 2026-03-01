import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getGravatarUrl } from "@/lib/gravatar";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, uid),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({
          email,
          name: name || existingUser.name,
          pictureUrl: picture || existingUser.pictureUrl || getGravatarUrl(email),
          updatedAt: new Date(),
        })
        .where(eq(users.firebaseUid, uid));

      return NextResponse.json({
        user: existingUser,
        isNew: false,
        onboardingCompleted: existingUser.onboardingCompleted,
      });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        firebaseUid: uid,
        email,
        name: name || email.split("@")[0],
        pictureUrl: picture || getGravatarUrl(email),
      })
      .returning();

    // Send welcome email (fire and forget)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email/client");
      sendWelcomeEmail(email, name || null).catch((err: unknown) =>
        console.error("Failed to send welcome email:", err)
      );
    } catch {
      // Email service not configured, skip
    }

    return NextResponse.json({
      user: newUser,
      isNew: true,
      onboardingCompleted: false,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
