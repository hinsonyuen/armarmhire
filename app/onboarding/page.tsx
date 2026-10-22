import { redirect } from "next/navigation";
import Link from "next/link";
import OnboardingForm from "@/components/OnboardingForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Recruiter sign-up, step 3 of 3: the recruiter profile form.
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.onboardedAt) redirect("/candidates");

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white">
            ArmArmHire
          </span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm font-medium text-text-muted hover:text-text">
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Last step
          </p>
          <h1 className="text-2xl font-semibold text-text">Set up your recruiter profile</h1>
          <p className="text-sm text-text-muted">
            Tell us about you and who you&rsquo;re hiring for. You can change
            your company details later on your{" "}
            <Link href="/profile" className="underline">profile</Link>.
          </p>
        </div>
        <OnboardingForm email={user.email} />
      </main>
    </div>
  );
}
