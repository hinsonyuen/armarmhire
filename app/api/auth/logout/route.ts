import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// A form POST from the header's "Log out" button.
export async function POST(req: NextRequest) {
  await endSession();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
