import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { homeFor, normalizeEmail, safeNextPath, startSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const INVALID = "Incorrect email or password.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Accounts that started sign-up but never set a password can't log in;
    // they get the same message as a wrong password.
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    await startSession(user.id);
    const next = user.onboardedAt ? safeNextPath(body.next) : null;
    return NextResponse.json({ ok: true, redirectTo: next ?? homeFor(user) });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
