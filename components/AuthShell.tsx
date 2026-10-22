import Link from "next/link";

// Centered logo + card layout shared by the log-in and sign-up pages.
export default function AuthShell({
  title,
  subtitle,
  width = "sm",
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  width?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-surface px-6 py-16">
      <Link
        href="/login"
        className="mb-10 inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white"
      >
        ArmArmHire
      </Link>

      <div
        className={`w-full ${width === "sm" ? "max-w-sm" : "max-w-md"} rounded-xl border border-border bg-card p-8 shadow-card`}
      >
        <h1 className="mb-1 text-2xl font-semibold text-text">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-text-muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SubmitButton({
  busy,
  children,
  busyText,
}: {
  busy: boolean;
  children: React.ReactNode;
  busyText: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? busyText : children}
    </button>
  );
}
