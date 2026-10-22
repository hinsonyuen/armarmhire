import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell title="Sign up" subtitle="Tell us who you are to get started." width="md">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/signup/recruiter"
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center transition-colors hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-ink">
            R
          </span>
          <span className="text-sm font-semibold text-text">Recruiter</span>
          <span className="text-xs text-text-faint">Hiring for a role</span>
        </Link>

        <Link
          href="/signup/job-seeker"
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center transition-colors hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-ink">
            J
          </span>
          <span className="text-sm font-semibold text-text">Job seeker</span>
          <span className="text-xs text-text-faint">Looking for work</span>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-text hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
