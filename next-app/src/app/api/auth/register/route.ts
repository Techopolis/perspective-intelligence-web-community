import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { getGravatarUrl } from "@/lib/gravatar";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail.split("@")[0],
        passwordHash,
        pictureUrl: getGravatarUrl(normalizedEmail),
      })
      .returning();

    // Send welcome email (fire and forget)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email/client");
      sendWelcomeEmail(normalizedEmail, newUser.name).catch((err: unknown) =>
        console.error("Failed to send welcome email:", err)
      );
    } catch {
      // Email service not configured
    }

    return NextResponse.json(
      { user: { id: newUser.id, email: newUser.email, name: newUser.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
