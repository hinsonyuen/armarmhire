import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/skill-fit?skills=slug1,slug2,...
// Returns every candidate who has a match for EVERY listed skill (AND,
// not OR), plus the SUM of keywordCount across those skills — used to
// rank candidates when multiple skills are selected. With a single skill
// selected, the sum is just that skill's own count.
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get("skills");
  if (!slugsParam) {
    return NextResponse.json({ error: "Missing skills" }, { status: 400 });
  }

  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json({ error: "No valid skills provided" }, { status: 400 });
  }

  try {
    const skills = await prisma.skill.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true },
    });

    if (skills.length === 0) {
      return NextResponse.json(
        { error: `No skills found for: ${slugs.join(", ")}` },
        { status: 404 }
      );
    }

    const skillIds = skills.map((s) => s.id);

    // Candidate must have a match row for every requested skill (AND),
    // then rank by the sum of keywordCount across those skills.
    const rows = await prisma.candidateSkillMatch.groupBy({
      by: ["candidateId"],
      where: { skillId: { in: skillIds } },
      _count: { skillId: true },
      _sum: { keywordCount: true },
      having: {
        skillId: { _count: { equals: skillIds.length } },
      },
    });

    const matches = rows.map((r) => ({
      candidateId: r.candidateId,
      sumCount: r._sum.keywordCount ?? 0,
    }));

    return NextResponse.json({
      skills: skills.map((s) => ({ slug: s.slug, name: s.name })),
      matches,
    });
  } catch (err) {
    console.error("skill-fit route error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error fetching skill fit", detail: message },
      { status: 500 }
    );
  }
}
