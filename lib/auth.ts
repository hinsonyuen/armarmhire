import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Database-backed sessions. The browser gets a random token in an
// httpOnly cookie; the database only stores its SHA-256 (see the Session
// model). middleware.ts only checks that the cookie exists, to redirect
// logged-out visitors cheaply — every page and API route that shows
// recruiter data must still call getCurrentUser()/requireRecruiter*()
// here, which actually validates the token.

export const SESSION_COOKIE = "armarmhire_session";
const SESSION_DAYS = 30;
export const VERIFICATION_HOURS = 24;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// Creates a session row and sets the cookie. Only call from a route
// handler or server action (cookies can't be set while rendering a page).
export async function startSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { recruiterProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Where a logged-in user should land: the profile form until they've
// filled it in, the candidates page after.
export function homeFor(user: { onboardedAt: Date | null }) {
  return user.onboardedAt ? "/candidates" : "/onboarding";
}

// For server-component pages that need a fully set-up recruiter.
export async function requireRecruiterPage(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

// For API routes. Returns either the user or a 401 response to return.
export async function requireRecruiterApi(): Promise<
  { user: CurrentUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user || !user.onboardedAt) {
    return {
      response: NextResponse.json({ error: "Not logged in" }, { status: 401 }),
    };
  }
  return { user };
}

// Only allows same-site relative paths, so ?next= can't send someone to
// another website after logging in.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
