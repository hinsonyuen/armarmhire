import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/initials";
import { requireRecruiterPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ExperienceEntry = {
  employer: string | null;
  positionTitle: string | null;
  hoursPerWeek: number | null;
  workMode: string | null;
  timePeriod: string | null;
  location: string | null;
  description: string | null;
  timeAtPositionMonths: number | null;
};

export default async function CandidateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRecruiterPage(`/candidates/${params.id}`);
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
  });

  if (!candidate) notFound();

  const experiences = Array.isArray(candidate.experiences)
    ? (candidate.experiences as unknown as ExperienceEntry[])
    : [];

  const industryTop3 = Array.isArray(candidate.industryTop3)
    ? (candidate.industryTop3 as unknown as { industry: string; probability: number }[])
    : [];

  const hasEducation =
    candidate.degreeType || candidate.institution || candidate.educationDescription;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
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

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Header card: name + location */}
        <section className="mb-6 flex items-center gap-5 rounded-xl border border-border bg-card p-6 shadow-card">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-brand-light text-xl font-semibold text-brand-ink">
            {initials(candidate.name)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-text">
              {candidate.name}
            </h1>
            <p className="text-sm text-text-muted">
              {candidate.location ?? "Location not provided"}
            </p>
          </div>
        </section>

        {/* Predicted industry (ML classifier) */}
        {industryTop3.length > 0 && (
          <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-1 text-sm font-semibold text-text">Predicted industry</h2>
            <p className="mb-3 text-xs text-text-muted">
              {candidate.industryConfident
                ? "High confidence."
                : "Lower confidence — the model is less sure about this one, so check the experience below."}
            </p>
            <ol className="space-y-2 text-sm">
              {industryTop3.map((p, i) => (
                <li key={p.industry} className="flex items-center gap-3">
                  <span className={`w-48 truncate ${i === 0 ? "font-semibold text-text" : "text-text-muted"}`}>
                    {p.industry}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-light">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.round(p.probability * 100)}%` }}
                    />
                  </span>
                  <span className="w-10 text-right tabular-nums text-text-muted">
                    {Math.round(p.probability * 100)}%
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Contact info */}
        <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text">
            Contact info
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 flex-none text-text-faint">Email</dt>
              <dd className="min-w-0 flex-1 truncate text-text">
                {candidate.email ?? "—"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 flex-none text-text-faint">LinkedIn</dt>
              <dd className="min-w-0 flex-1 truncate text-text">
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-dark hover:underline"
                >
                  {candidate.linkedin}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        {/* Self-reported skills */}
        {candidate.skills.length > 0 && (
          <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-text">
              Self-reported skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-ink"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text">Education</h2>
          {!hasEducation ? (
            <p className="text-sm text-text-faint">Not provided.</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-text">
                {candidate.institution ?? "—"}
              </p>
              <p className="text-sm text-text-muted">
                {candidate.degreeType ?? "—"}
                {candidate.educationTimePeriod
                  ? ` · ${candidate.educationTimePeriod}`
                  : ""}
              </p>
              {candidate.educationDescription && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text">
                  {candidate.educationDescription}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Experience */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text">Experience</h2>
          {experiences.length === 0 ? (
            <p className="text-sm text-text-faint">Not provided.</p>
          ) : (
            <ul className="space-y-6">
              {experiences.map((e, i) => (
                <li key={i}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-faint">
                    Experience #{i + 1}
                  </p>
                  <p className="text-sm font-semibold text-text">
                    {e.positionTitle ?? "—"}
                  </p>
                  <p className="text-sm text-text-muted">
                    {e.employer ?? "—"}
                    {e.timePeriod ? ` · ${e.timePeriod}` : ""}
                    {e.timeAtPositionMonths
                      ? ` (${e.timeAtPositionMonths} mo)`
                      : ""}
                  </p>
                  <p className="text-xs text-text-faint">
                    {[
                      e.workMode,
                      e.hoursPerWeek ? `~${e.hoursPerWeek} hrs/week` : null,
                      e.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {e.description && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text">
                      {e.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
