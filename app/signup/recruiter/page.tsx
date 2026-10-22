"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell, { FormError, SubmitButton } from "@/components/AuthShell";

// Recruiter sign-up, step 1 of 3: email → (emailed link) create password
// → recruiter profile form.
export default function RecruiterSignupPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send the email.");
        return;
      }
      setSentTo(email.trim());
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" width="md">
        <p className="text-sm text-text-muted">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-text">{sentTo}</span>. Open it to
          confirm your email and create your password. The link expires in 24
          hours.
        </p>
        <p className="mt-4 text-sm text-text-muted">
          Can&rsquo;t find it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => send()}
            disabled={busy}
            className="font-semibold text-text hover:underline disabled:opacity-60"
          >
            {busy ? "sending…" : "send it again"}
          </button>
          .
        </p>
        <div className="mt-4">
          <FormError message={error} />
        </div>
        <p className="mt-6 text-center text-sm text-text-muted">
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
            className="font-semibold text-text hover:underline"
          >
            Use a different email
          </button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create a recruiter account"
      subtitle="Start with your work email. We'll send you a link to confirm it and set your password."
      width="md"
    >
      <form onSubmit={send} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-text">
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input"
            autoComplete="email"
            required
            autoFocus
          />
        </div>
        <FormError message={error} />
        <SubmitButton busy={busy} busyText="Sending…">
          Send confirmation link
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-text hover:underline">
          Log in
        </Link>
        {" · "}
        <Link href="/signup" className="font-semibold text-text hover:underline">
          Back
        </Link>
      </p>
    </AuthShell>
  );
}
