import Link from "next/link";
import { initials } from "@/lib/initials";
import type { CurrentUser } from "@/lib/auth";

// Header links for a logged-in recruiter: profile (with their initials)
// and log out. Log out is a form POST so it can't be triggered by a
// link prefetch or a plain GET.
export default function UserMenu({ user }: { user: CurrentUser }) {
  const p = user.recruiterProfile;
  const name = p ? `${p.firstName} ${p.lastName}` : user.email;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-4 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-ink"
        >
          {initials(name)}
        </span>
        Profile
      </Link>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
