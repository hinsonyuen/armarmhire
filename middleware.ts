import { NextRequest, NextResponse } from "next/server";

// Cheap first gate: visitors without a session cookie are sent to /login
// before any recruiter page renders. This only checks that the cookie
// exists (middleware runs on the edge, without database access). The
// pages and API routes validate the session itself via lib/auth.ts.
// The name must match SESSION_COOKIE in lib/auth.ts, which can't be
// imported here because it pulls in Prisma.
const SESSION_COOKIE = "armarmhire_session";

export function middleware(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/candidates/:path*", "/profile/:path*", "/onboarding/:path*"],
};
