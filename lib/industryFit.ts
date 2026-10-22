// Industry fit: how well a candidate's ML-predicted industry lines up with
// the industry a searched role belongs to.
//
// Each of the 123 roles maps to one primary industry (and optionally a few
// related ones) in role-industries.json. Each candidate carries the model's
// top-3 predicted industries (see ml/classify_candidates.py). The two are
// compared here; the result decides which candidates appear as matches for
// a role search and in what order.
import roleIndustriesData from "./role-industries.json";
import industryModelScores from "./industry-model-scores.json";

export type RoleIndustries = { primary: string; secondary: string[] };
export type IndustryPrediction = { industry: string; probability: number };

// "strong"  — the model's single best guess is the role's industry.
// "related" — the role's industry is the model's 2nd or 3rd guess, and
//             either it has a meaningful probability or the best guess is
//             one of the role's related industries. (Requiring the role's
//             own industry somewhere in the top 3 keeps e.g. every software
//             engineer from counting as "related" to Data Engineer.)
export type IndustryFit = "strong" | "related";

// Below this, a 2nd/3rd-place prediction is too weak to count as a fit.
export const RELATED_MIN_PROBABILITY = 0.15;

const roleIndustries = roleIndustriesData as Record<string, RoleIndustries>;

export function industriesForRole(roleSlug: string): RoleIndustries | null {
  return roleIndustries[roleSlug] ?? null;
}

export function industryFit(
  role: RoleIndustries,
  top3: IndustryPrediction[] | null | undefined
): IndustryFit | null {
  if (!top3 || top3.length === 0) return null;
  const best = top3[0].industry;
  if (best === role.primary) return "strong";
  const primaryLater = top3.slice(1).find((p) => p.industry === role.primary);
  if (!primaryLater) return null;
  if (role.secondary.includes(best)) return "related";
  if (primaryLater.probability >= RELATED_MIN_PROBABILITY) return "related";
  return null;
}

// Validation accuracy of the model for one industry, from the notebook's
// scores_per_industry.csv (copied into industry-model-scores.json by
// ml/classify_candidates.py). Null when that file hasn't been generated.
type ScoresFile = {
  perIndustry: Record<string, { resumes: number; top1Accuracy: number | null; top3Accuracy: number | null }>;
};
export function modelAccuracyFor(industry: string) {
  return (industryModelScores as ScoresFile).perIndustry[industry] ?? null;
}

// Display order inside the matched group for a role search:
// strong industry fit, then related, then keyword-only matches; within
// each tier, more keyword hits first, then the live weighted score.
const FIT_RANK: Record<string, number> = { strong: 0, related: 1, keyword: 2 };

export type RoleMatchKind = IndustryFit | "keyword";

export function compareRoleMatches(
  a: { kind: RoleMatchKind; keywordCount: number; totalScore: number },
  b: { kind: RoleMatchKind; keywordCount: number; totalScore: number }
) {
  return (
    FIT_RANK[a.kind] - FIT_RANK[b.kind] ||
    b.keywordCount - a.keywordCount ||
    b.totalScore - a.totalScore
  );
}
