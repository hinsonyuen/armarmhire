import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  industriesForRole,
  industryFit,
  type IndustryPrediction,
  type RoleMatchKind,
} from "@/lib/industryFit";

export const dynamic = "force-dynamic";

// GET /api/role-fit?role=<slug>
//
// Returns every candidate who fits the role, by either signal:
//   - industry fit: the ML classifier's predicted industry for the
//     candidate matches the role's industry ("strong" or "related"), and/or
//   - keyword fit: at least one of the role's keywords appears in their
//     experience text (precomputed CandidateRoleMatch rows).
//
// `industryAvailable` is false when no candidate has an industry
// prediction yet (ml/classify_candidates.py hasn't been run) — the app
// then falls back to keyword matching alone, exactly as before.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("role");
  if (!slug) {
    return NextResponse.json({ error: "Missing role" }, { status: 400 });
  }

  try {
    const role = await prisma.role.findUnique({ where: { slug } });
    if (!role) {
      return NextResponse.json(
        { error: `Role not found for slug "${slug}"` },
        { status: 404 }
      );
    }

    const [keywordMatches, predicted] = await Promise.all([
      prisma.candidateRoleMatch.findMany({
        where: { roleId: role.id },
        select: { candidateId: true, keywordCount: true },
      }),
      prisma.candidate.findMany({
        where: { industry: { not: null } },
        select: { id: true, industryTop3: true },
      }),
    ]);

    const roleIndustries = industriesForRole(slug);
    const keywordCountById = new Map<string, number>(
      keywordMatches.map((m: { candidateId: string; keywordCount: number }) => [
        m.candidateId,
        m.keywordCount,
      ])
    );

    const fitById = new Map<string, RoleMatchKind>();
    if (roleIndustries) {
      for (const c of predicted as { id: string; industryTop3: unknown }[]) {
        const fit = industryFit(roleIndustries, c.industryTop3 as IndustryPrediction[] | null);
        if (fit) fitById.set(c.id, fit);
      }
    }

    const ids = new Set<string>([...Array.from(keywordCountById.keys()), ...Array.from(fitById.keys())]);
    const matches = Array.from(ids).map((candidateId) => ({
      candidateId,
      keywordCount: keywordCountById.get(candidateId) ?? 0,
      kind: fitById.get(candidateId) ?? ("keyword" as const),
    }));

    return NextResponse.json({
      role: { name: role.name, slug: role.slug },
      industry: roleIndustries,
      industryAvailable: predicted.length > 0,
      matches,
    });
  } catch (err) {
    console.error("role-fit route error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error fetching role fit", detail: message },
      { status: 500 }
    );
  }
}
