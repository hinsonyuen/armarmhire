"use client";

import Link from "next/link";
import { initials } from "@/lib/initials";

type CandidateRow = {
  id: string;
  name: string;
  linkedin: string;
  email: string | null;
  matched?: boolean;
  // Role search only: how the candidate fits the searched role.
  fit?: "strong" | "related" | "keyword";
  keywordOnly?: boolean;
  // ML-predicted industry (null until ml/classify_candidates.py has run).
  industry?: string | null;
  industryConfident?: boolean | null;
};

const FIT_LABEL: Record<string, string> = {
  strong: "Industry match",
  related: "Related industry",
  keyword: "Keyword match",
};

function CandidateCard({
  c,
  selected,
  onToggleSelect,
}: {
  c: CandidateRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-xl border p-4 shadow-card transition-colors ${
        c.matched ? "border-brand bg-brand-light" : "border-border bg-card"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(c.id)}
        aria-label={`Select ${c.name}`}
        className="h-4 w-4 flex-none accent-brand"
      />
      <Link
        href={`/candidates/${c.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 hover:opacity-80"
      >
        <span
          className={`flex h-12 w-12 flex-none items-center justify-center rounded-full text-base font-semibold text-brand-ink ${
            c.matched ? "bg-white/70" : "bg-brand-light"
          }`}
        >
          {initials(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-text">
            {c.name}
          </p>
          <p className="truncate text-sm text-text-muted">{c.linkedin}</p>
          <p className="truncate text-sm text-text-faint">{c.email ?? "—"}</p>
        </div>
        <div className="hidden flex-none flex-col items-end gap-1 sm:flex">
          {c.fit && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                c.fit === "strong"
                  ? "bg-brand text-white"
                  : "border border-border bg-card text-text-muted"
              }`}
            >
              {FIT_LABEL[c.fit]}
            </span>
          )}
          {c.industry && (
            <span
              className="max-w-[14rem] truncate text-xs text-text-faint"
              title={
                c.industryConfident
                  ? "Predicted industry (high confidence)"
                  : "Predicted industry (lower confidence — check the profile)"
              }
            >
              {c.industry}
              {c.industryConfident === false && " ?"}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function CandidateResultsTable({
  candidates,
  emptyMessage = "No candidates match every selected skill. Try removing one.",
  matchLabel,
  totalMatchedCount,
  keywordOnlyCount,
  selectedIds,
  onToggleSelect,
}: {
  candidates: CandidateRow[];
  emptyMessage?: string;
  matchLabel?: string;
  // True total across every page, not just the current page's slice —
  // pass this explicitly so the header count doesn't silently reflect
  // only whatever happens to be on the visible page.
  totalMatchedCount?: number;
  // Role search with industry predictions: candidates outside the role's
  // industry whose experience still mentions its keywords. Shown as their
  // own group between the matches and everyone else.
  keywordOnlyCount?: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-[15px] text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  const matched = candidates.filter((c) => c.matched);
  const keywordOnly = candidates.filter((c) => !c.matched && c.keywordOnly);
  const rest = candidates.filter((c) => !c.matched && !c.keywordOnly);
  const renderList = (list: CandidateRow[]) => (
    <ul className="flex flex-col gap-3">
      {list.map((c) => (
        <li key={c.id}>
          <CandidateCard c={c} selected={selectedIds.has(c.id)} onToggleSelect={onToggleSelect} />
        </li>
      ))}
    </ul>
  );
  const matchedTotal = totalMatchedCount ?? matched.length;

  // No filter active — plain list, no grouping.
  if (!matchLabel) {
    return (
      <ul className="flex flex-col gap-3">
        {candidates.map((c) => (
          <li key={c.id}>
            <CandidateCard
              c={c}
              selected={selectedIds.has(c.id)}
              onToggleSelect={onToggleSelect}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
          {matchedTotal} match{matchedTotal === 1 ? "" : "es"} for {matchLabel}
        </p>
        {matched.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-text-muted">
            No candidates matched.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matched.map((c) => (
              <li key={c.id}>
                <CandidateCard
                  c={c}
                  selected={selectedIds.has(c.id)}
                  onToggleSelect={onToggleSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {keywordOnlyCount !== undefined && keywordOnly.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {keywordOnlyCount} in other industries with matching keywords
          </p>
          {renderList(keywordOnly)}
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
          All other candidates
        </p>
        <ul className="flex flex-col gap-3">
          {rest.map((c) => (
            <li key={c.id}>
              <CandidateCard
                c={c}
                selected={selectedIds.has(c.id)}
                onToggleSelect={onToggleSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
