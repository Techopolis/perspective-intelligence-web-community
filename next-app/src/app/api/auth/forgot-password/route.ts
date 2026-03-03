import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, users, passwordResetTokens } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) return successResponse;

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Build reset link from incoming request origin (no hardcoded URLs)
    const origin = new URL(request.url).origin;
    const resetLink = `${origin}/reset-password?token=${token}`;

    // Send email
    try {
      const { sendEmail } = await import("@/lib/email/client");
      const { passwordResetEmail } = await import("@/lib/email/templates");
      const emailContent = passwordResetEmail(user.name, resetLink);
      await sendEmail(
        user.email,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );
    } catch {
      console.warn("Email service not configured, reset link:", resetLink);
    }

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
