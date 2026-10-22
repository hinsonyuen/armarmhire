import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link
            href="/candidates"
            className="inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white"
          >
            ArmArmHire
          </Link>
          <Link
            href="/candidates"
            className="text-sm font-medium text-text-muted hover:text-text"
          >
            ← Back to candidates
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-text">Employer profile</h1>
          <p className="text-sm text-text-muted">
            This is how candidates and the platform will see your company.
          </p>
        </div>

        <ProfileForm />
      </main>
    </div>
  );
}
