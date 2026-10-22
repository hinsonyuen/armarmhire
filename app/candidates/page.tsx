import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CandidatesBoard from "@/components/CandidatesBoard";
import UserMenu from "@/components/UserMenu";
import { requireRecruiterPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  linkedin: true,
  email: true,
  location: true,
  weightedEdScore: true,
  weightedCaScore: true,
  industry: true,
  industryConfident: true,
} as const;

export default async function CandidatesPage() {
  const user = await requireRecruiterPage("/candidates");
  const candidates = await prisma.candidate.findMany({
    select: CANDIDATE_SELECT,
  });

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/candidates"
            className="inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white"
          >
            ArmArmHire
          </Link>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text">All candidates</h1>
          <p className="text-sm text-text-muted">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"},
            ranked by score.
          </p>
        </div>

        <CandidatesBoard candidates={candidates} />
      </main>
    </div>
  );
}
