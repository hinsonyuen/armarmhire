import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  VERIFICATION_HOURS,
  hashToken,
  isValidEmail,
  newToken,
  normalizeEmail,
} from "@/lib/auth";
import { sendAlreadyRegisteredEmail, sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MS = 60 * 1000;

function appUrl(req: NextRequest) {
  return (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
}

// Step 1 of recruiter sign-up: email only. Always answers the same way
// whether or not the email is already registered, so the form can't be
// used to find out who has an account; an existing user gets a "you
// already have an account" email instead of a sign-up link.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      include: { verificationTokens: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (existing?.passwordHash) {
      await sendAlreadyRegisteredEmail(email, `${appUrl(req)}/login`);
      return NextResponse.json({ ok: true });
    }

    const lastSent = existing?.verificationTokens[0]?.createdAt;
    if (lastSent && Date.now() - lastSent.getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "We just sent a link to that address. Please wait a minute before asking for another." },
        { status: 429 }
      );
    }

    const user = existing ?? (await prisma.user.create({ data: { email } }));

    // Only the newest link works.
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    const token = newToken();
    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000),
      },
    });

    const url = `${appUrl(req)}/signup/recruiter/verify?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(email, url, VERIFICATION_HOURS);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json(
      { error: "Couldn't send the email. Please try again." },
      { status: 500 }
    );
  }
}
