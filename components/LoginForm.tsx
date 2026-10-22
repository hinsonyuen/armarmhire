"use client";

import Link from "next/link";
import { useState } from "react";
import { FormError, SubmitButton } from "@/components/AuthShell";

export default function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't log in.");
        return;
      }
      // Full navigation so server components re-render with the new cookie.
      window.location.assign(data.redirectTo);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-text">
            Email
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
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-text">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
            autoComplete="current-password"
            required
          />
        </div>

        <FormError message={error} />
        <SubmitButton busy={busy} busyText="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-text hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
