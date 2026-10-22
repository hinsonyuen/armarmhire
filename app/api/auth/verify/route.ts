import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, startSession } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// Step 2 of recruiter sign-up: the emailed link's token plus the chosen
// password. Marks the email verified, sets the password, logs the user
// in and sends them on to the profile form.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const record = token
      ? await prisma.emailVerificationToken.findUnique({
          where: { tokenHash: hashToken(token) },
          include: { user: true },
        })
      : null;
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This link is invalid or has expired. Please sign up again to get a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    await startSession(record.userId);
    return NextResponse.json({ ok: true, redirectTo: "/onboarding" });
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
