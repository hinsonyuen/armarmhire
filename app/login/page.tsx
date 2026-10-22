"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    // Not wired up yet — logging in doesn't do anything for now.
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

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold text-text">Log in</h1>
        <p className="mb-6 text-sm text-text-muted">
          Welcome back. Enter your details to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-text"
            >
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
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-text"
            >
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
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&rsquo;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-text hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
