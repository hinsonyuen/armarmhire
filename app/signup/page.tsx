"use client";

import Link from "next/link";

export default function SignupPage() {
  function handleSelect(e: React.MouseEvent) {
    // Not wired up yet — picking a role doesn't create an account for now.
    e.preventDefault();
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface px-6 py-16">
      <Link
        href="/candidates"
        className="mb-10 inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white"
      >
        ArmArmHire
      </Link>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold text-text">Sign up</h1>
        <p className="mb-6 text-sm text-text-muted">
          Tell us who you are to get started.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSelect}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center transition-colors hover:border-brand"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-ink">
              R
            </span>
            <span className="text-sm font-semibold text-text">Recruiter</span>
            <span className="text-xs text-text-faint">
              Hiring for a role
            </span>
          </button>

          <Link
            href="/signup/job-seeker"
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center transition-colors hover:border-brand"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-ink">
              J
            </span>
            <span className="text-sm font-semibold text-text">
              Job seeker
            </span>
            <span className="text-xs text-text-faint">
              Looking for work
            </span>
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-text hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
