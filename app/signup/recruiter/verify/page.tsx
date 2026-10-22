import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import CreatePasswordForm from "@/components/CreatePasswordForm";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Recruiter sign-up, step 2 of 3: the page the emailed link opens. The
// token is only checked here; it's used up when the password is saved
// (POST /api/auth/verify), so reloading this page is harmless.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const record = token
    ? await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: { select: { email: true } } },
      })
    : null;

  if (!record || record.expiresAt < new Date()) {
    return (
      <AuthShell title="Link expired" width="md">
        <p className="text-sm text-text-muted">
          This confirmation link is invalid, has already been used, or has
          expired. Links last 24 hours, and only the most recent one works.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          <Link
            href="/signup/recruiter"
            className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            Get a new link
          </Link>
          <Link href="/login" className="font-semibold text-text hover:underline">
            Already set a password? Log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your password"
      subtitle={
        <>
          Email confirmed: <span className="font-semibold text-text">{record.user.email}</span>
        </>
      }
      width="md"
    >
      <CreatePasswordForm token={token} email={record.user.email} />
    </AuthShell>
  );
}
