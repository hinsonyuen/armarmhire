"use client";

import { useEffect, useMemo, useState } from "react";
import WeightSlider from "@/components/WeightSlider";
import RoleSearch from "@/components/RoleSearch";
import SkillSearch from "@/components/SkillSearch";
import LocationFilter from "@/components/LocationFilter";
import CandidateResultsTable from "@/components/CandidateResultsTable";
import Pagination from "@/components/Pagination";
import type { Role } from "@/lib/roles";
import type { Skill } from "@/lib/skills";
import {
  compareRoleMatches,
  modelAccuracyFor,
  type RoleIndustries,
  type RoleMatchKind,
} from "@/lib/industryFit";

type CandidateInput = {
  id: string;
  name: string;
  linkedin: string;
  email: string | null;
  location: string | null;
  weightedEdScore: number | null;
  weightedCaScore: number | null;
  industry: string | null;
  industryConfident: boolean | null;
};

type RoleFitEntry = { kind: RoleMatchKind; keywordCount: number };

// Original workbook weighting (ImportanceScore(Ed) = 10%, Ca = 90%) is the
// default slider position.
const DEFAULT_EDUCATION_PCT = 10;
const PAGE_SIZE = 30;

export default function CandidatesBoard({
  candidates,
}: {
  candidates: CandidateInput[];
}) {
  const [educationPct, setEducationPct] = useState(DEFAULT_EDUCATION_PCT);
  const [location, setLocation] = useState("remote");
  const [userLocation, setUserLocation] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFit, setRoleFit] = useState<Map<string, RoleFitEntry> | null>(null);
  const [roleIndustries, setRoleIndustries] = useState<RoleIndustries | null>(null);
  const [industryAvailable, setIndustryAvailable] = useState(false);
  const [roleFitLoading, setRoleFitLoading] = useState(false);
  const [roleFitError, setRoleFitError] = useState<string | null>(null);

  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillFitMap, setSkillFitMap] = useState<Map<string, number> | null>(null);
  const [skillFitLoading, setSkillFitLoading] = useState(false);
  const [skillFitError, setSkillFitError] = useState<string | null>(null);

  async function handleSelectRole(role: Role) {
    setSelectedRole(role);
    setRoleFitLoading(true);
    setRoleFitError(null);
    try {
      const res = await fetch(`/api/role-fit?role=${encodeURIComponent(role.slug)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("role-fit request failed:", res.status, data);
        setRoleFitError(
          data?.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ""} (status ${res.status})`
            : `Request failed (status ${res.status})`
        );
        setRoleFit(new Map());
        return;
      }

      const fit = new Map<string, RoleFitEntry>(
        (data.matches ?? []).map(
          (m: { candidateId: string; keywordCount: number; kind: RoleMatchKind }) => [
            m.candidateId,
            { kind: m.kind, keywordCount: m.keywordCount },
          ]
        )
      );
      setRoleFit(fit);
      setRoleIndustries(data.industry ?? null);
      setIndustryAvailable(Boolean(data.industryAvailable));
    } catch (err) {
      console.error("role-fit request threw:", err);
      setRoleFitError("Couldn't reach the server — check your connection.");
      setRoleFit(new Map());
    } finally {
      setRoleFitLoading(false);
    }
  }

  function clearRole() {
    setSelectedRole(null);
    setRoleFit(null);
    setRoleIndustries(null);
    setRoleFitError(null);
  }

  // Selecting a skill fetches fresh AND-filtered results across every
  // currently-selected skill (not just the newly clicked one).
  async function fetchSkillFit(skills: Skill[]) {
    if (skills.length === 0) {
      setSkillFitMap(null);
      return;
    }
    setSkillFitLoading(true);
    setSkillFitError(null);
    try {
      const slugs = skills.map((s) => s.slug).join(",");
      const res = await fetch(`/api/skill-fit?skills=${encodeURIComponent(slugs)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("skill-fit request failed:", res.status, data);
        setSkillFitError(
          data?.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ""} (status ${res.status})`
            : `Request failed (status ${res.status})`
        );
        setSkillFitMap(new Map());
        return;
      }

      const map = new Map<string, number>(
        (data.matches ?? []).map((m: { candidateId: string; sumCount: number }) => [
          m.candidateId,
          m.sumCount,
        ])
      );
      setSkillFitMap(map);
    } catch (err) {
      console.error("skill-fit request threw:", err);
      setSkillFitError("Couldn't reach the server — check your connection.");
      setSkillFitMap(new Map());
    } finally {
      setSkillFitLoading(false);
    }
  }

  function handleSelectSkill(skill: Skill) {
    setSelectedSkills((prev) => {
      if (prev.some((s) => s.slug === skill.slug)) return prev;
      const next = [...prev, skill];
      fetchSkillFit(next);
      return next;
    });
  }

  function removeSkill(slug: string) {
    setSelectedSkills((prev) => {
      const next = prev.filter((s) => s.slug !== slug);
      fetchSkillFit(next);
      return next;
    });
  }

  function clearSkills() {
    setSelectedSkills([]);
    setSkillFitMap(null);
    setSkillFitError(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllMatching() {
    setSelectedIds(new Set(displayList.map((c) => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function exportSelected() {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/candidates/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("export failed:", res.status, data);
        alert(
          data?.error
            ? `Export failed: ${data.error}`
            : `Export failed (status ${res.status})`
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidates-export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("export threw:", err);
      alert("Couldn't reach the server — check your connection.");
    } finally {
      setExporting(false);
    }
  }

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) {
      if (c.location) set.add(c.location);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  // Full display order: scored + filtered, then matched candidates moved
  // to the front. Skill-fit takes precedence over role-fit when both are
  // active (skills are the more specific filter) — matched-by-skill
  // candidates are ranked by summed keyword count; everyone else (in
  // either mode) is ranked by the live weighted score. Pagination slices
  // from this final order.
  const displayList = useMemo(() => {
    const eduWeight = educationPct / 100;
    const caWeight = 1 - eduWeight;

    const matchesLocation = (c: CandidateInput) => {
      if (location === "remote") return true;
      if (location === "in-person") {
        const target = userLocation.trim().toLowerCase();
        if (!target) return true; // no location entered yet — don't filter
        return (c.location ?? "").toLowerCase().includes(target);
      }
      return c.location === location;
    };

    const scored = candidates
      .filter(matchesLocation)
      .map((c) => {
        const ed = c.weightedEdScore ?? 0;
        const ca = c.weightedCaScore ?? 0;
        const totalScore = eduWeight * ed + caWeight * ca;
        return { ...c, totalScore };
      });

    if (skillFitMap) {
      const matched = scored
        .filter((c) => skillFitMap.has(c.id))
        .map((c) => ({ ...c, matched: true, matchCount: skillFitMap.get(c.id)! }))
        .sort((a, b) => b.matchCount - a.matchCount);
      const rest = scored
        .filter((c) => !skillFitMap.has(c.id))
        .map((c) => ({ ...c, matched: false }))
        .sort((a, b) => b.totalScore - a.totalScore);
      return [...matched, ...rest];
    }

    const sorted = scored.sort((a, b) => b.totalScore - a.totalScore);
    if (!roleFit) return sorted.map((c) => ({ ...c, matched: undefined }));

    // Without industry predictions (classifier not run yet), fall back to
    // the original behaviour: every keyword match is a match, by score.
    if (!industryAvailable) {
      const matched = sorted
        .filter((c) => roleFit.has(c.id))
        .map((c) => ({ ...c, matched: true, fit: "keyword" as RoleMatchKind }));
      const rest = sorted
        .filter((c) => !roleFit.has(c.id))
        .map((c) => ({ ...c, matched: false }));
      return [...matched, ...rest];
    }

    // With predictions: industry fits (strong, then related) are the
    // matches; candidates whose industry doesn't fit but whose experience
    // mentions the role's keywords get their own group below them.
    const withFit = sorted
      .filter((c) => roleFit.has(c.id))
      .map((c) => {
        const f = roleFit.get(c.id)!;
        return { ...c, fit: f.kind, keywordCount: f.keywordCount };
      })
      .sort((a, b) =>
        compareRoleMatches(
          { kind: a.fit, keywordCount: a.keywordCount, totalScore: a.totalScore },
          { kind: b.fit, keywordCount: b.keywordCount, totalScore: b.totalScore }
        )
      );
    const matched = withFit
      .filter((c) => c.fit !== "keyword")
      .map((c) => ({ ...c, matched: true }));
    const keywordOnly = withFit
      .filter((c) => c.fit === "keyword")
      .map((c) => ({ ...c, matched: false, keywordOnly: true }));
    const rest = sorted
      .filter((c) => !roleFit.has(c.id))
      .map((c) => ({ ...c, matched: false }));
    return [...matched, ...keywordOnly, ...rest];
  }, [candidates, educationPct, location, userLocation, roleFit, industryAvailable, skillFitMap]);

  // Reset to page 1 whenever the underlying result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [educationPct, location, userLocation, roleFit, skillFitMap]);

  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = displayList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const emptyMessage =
    location !== "remote"
      ? "No candidates found in that location."
      : "No candidates found. Your database may not be seeded yet — run the seed script and refresh.";

  const rangeStart = displayList.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, displayList.length);

  const matchLabel = skillFitMap
    ? selectedSkills.map((s) => s.name).join(" + ")
    : selectedRole && !roleFitLoading
    ? selectedRole.name
    : undefined;

  const totalMatchedCount = matchLabel
    ? displayList.filter((c) => c.matched).length
    : undefined;

  // Only meaningful for a role search with industry predictions loaded.
  const keywordOnlyCount =
    !skillFitMap && roleFit && industryAvailable
      ? displayList.filter((c) => "keywordOnly" in c && c.keywordOnly).length
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <WeightSlider educationPct={educationPct} onChange={setEducationPct} />

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-1 text-sm font-semibold text-text">
            Search roles
          </p>
          <p className="mb-3 text-xs text-text-muted">
            Find candidates who fit a specific role.
          </p>
          <RoleSearch onSelectRole={handleSelectRole} />

          {selectedRole && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-brand-light px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium text-brand-ink">
                {roleFitLoading ? "Loading…" : selectedRole.name}
              </span>
              <button
                type="button"
                onClick={clearRole}
                className="flex-none text-xs font-semibold text-brand-ink hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {selectedRole && !roleFitLoading && roleIndustries && (
            <RoleIndustryNote
              industries={roleIndustries}
              industryAvailable={industryAvailable}
            />
          )}

          {roleFitError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {roleFitError}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-1 text-sm font-semibold text-text">
            Search skills
          </p>
          <p className="mb-3 text-xs text-text-muted">
            Pick one or more specific skills — candidates must match all of
            them, ranked by combined keyword count.
          </p>
          <SkillSearch
            selectedSlugs={selectedSkills.map((s) => s.slug)}
            onSelectSkill={handleSelectSkill}
          />

          {selectedSkills.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.map((s) => (
                  <span
                    key={s.slug}
                    className="flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-ink"
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={() => removeSkill(s.slug)}
                      aria-label={`Remove ${s.name}`}
                      className="text-brand-ink/70 hover:text-brand-ink"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={clearSkills}
                className="self-start text-xs font-semibold text-brand-ink hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {skillFitLoading && (
            <p className="mt-2 text-xs text-text-muted">Loading…</p>
          )}

          {skillFitError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {skillFitError}
            </p>
          )}
        </div>

        <LocationFilter
          locations={locations}
          selected={location}
          onChange={setLocation}
          userLocation={userLocation}
          onUserLocationChange={setUserLocation}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            {displayList.length === 0
              ? "0 candidates"
              : `Showing ${rangeStart}-${rangeEnd} of ${displayList.length} candidate${
                  displayList.length === 1 ? "" : "s"
                }`}
          </p>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <span className="text-sm font-medium text-text">
                {selectedIds.size} selected
              </span>
            )}
            <button
              type="button"
              onClick={selectAllMatching}
              disabled={displayList.length === 0}
              className="text-sm font-semibold text-brand-ink hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select all {displayList.length} matching
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm font-semibold text-text-muted hover:underline"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={exportSelected}
              disabled={selectedIds.size === 0 || exporting}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>

        <CandidateResultsTable
          candidates={pageItems}
          emptyMessage={emptyMessage}
          matchLabel={matchLabel}
          totalMatchedCount={totalMatchedCount}
          keywordOnlyCount={keywordOnlyCount}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// Small explainer under the selected role: which industry the role maps
// to, and how accurate the classifier was for that industry on held-out
// resumes (so recruiters know how much to trust the grouping).
function RoleIndustryNote({
  industries,
  industryAvailable,
}: {
  industries: RoleIndustries;
  industryAvailable: boolean;
}) {
  if (!industryAvailable) {
    return (
      <p className="mt-2 text-xs text-text-muted">
        Matching on keywords only — industry predictions haven&apos;t been
        generated yet (see README, &ldquo;Industry classifier&rdquo;).
      </p>
    );
  }
  const acc = modelAccuracyFor(industries.primary);
  const pct = (x: number | null | undefined) =>
    x == null ? null : `${Math.round(x * 100)}%`;
  return (
    <div className="mt-2 space-y-0.5 text-xs text-text-muted">
      <p>
        Industry: <span className="font-medium text-text">{industries.primary}</span>
        {industries.secondary.length > 0 && <> (also {industries.secondary.join(", ")})</>}
      </p>
      {acc && pct(acc.top1Accuracy) && (
        <p>
          Model accuracy for this industry: {pct(acc.top1Accuracy)} top pick
          {pct(acc.top3Accuracy) && <>, {pct(acc.top3Accuracy)} in top 3</>}
        </p>
      )}
    </div>
  );
}
