"use client";

import { useState } from "react";
import { FormError, SubmitButton } from "@/components/AuthShell";

// Same rules as validatePassword() in lib/password.ts (which can't be
// imported here because it uses node:crypto). The server re-checks.
const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /[0-9]/.test(p) },
];

export default function CreatePasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulesMet = RULES.every((r) => r.test(password));
  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rulesMet) return setError("Your password doesn't meet the requirements yet.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your password.");
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lets password managers save the login against the right email. */}
      <input type="email" value={email} autoComplete="username" readOnly hidden />

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-text">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoComplete="new-password"
          required
          autoFocus
        />
        <ul className="mt-2 space-y-0.5 text-xs">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={ok ? "text-green-700" : "text-text-faint"}>
                {ok ? "✓" : "○"} {r.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-text">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
          autoComplete="new-password"
          required
        />
        {mismatch && <p className="mt-1 text-xs text-red-700">The passwords don&rsquo;t match.</p>}
      </div>

      <FormError message={error} />
      <SubmitButton busy={busy} busyText="Saving…">
        Create password and continue
      </SubmitButton>
    </form>
  );
}
