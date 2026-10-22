import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SkillRow = {
  id: string;
  slug: string;
  name: string;
  roleName: string;
  category: string;
};

// GET /api/skills?q=sql
// With no query: all 3,405 skills, ordered by role/name.
// With a query: matches against the skill name OR any of its keywords,
// using exact substring matching PLUS moderate fuzzy trigram similarity
// (same technique and thresholds as /api/roles, tightened after testing
// showed very low thresholds matched far too broadly).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    const skills = await prisma.skill.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        role: { select: { name: true, category: true, code: true } },
      },
      orderBy: [{ role: { code: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json({
      skills: skills.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        roleName: s.role.name,
        category: s.role.category,
      })),
    });
  }

  const words = q.split(/\s+/).filter((w) => w.length > 0);

  try {
    const skills = await prisma.$queryRaw<SkillRow[]>`
      SELECT id, slug, name, "roleName", category FROM (
        SELECT DISTINCT ON (s.id) s.id, s.slug, s.name,
          r.name AS "roleName", r.category,
          CASE
            WHEN s.name ILIKE '%' || ${q} || '%' THEN 0
            WHEN EXISTS (
              SELECT 1 FROM unnest(s.keywords) AS kw
              WHERE kw ILIKE '%' || ${q} || '%'
            ) THEN 1
            WHEN word_similarity(${q}, s.name) > 0.35 THEN 2
            ELSE 3
          END AS rank
        FROM "Skill" s
        JOIN "Role" r ON r.id = s."roleId"
        WHERE s.name ILIKE '%' || ${q} || '%'
           OR word_similarity(${q}, s.name) > 0.35
           OR EXISTS (
             SELECT 1 FROM unnest(${words}::text[]) AS w
             WHERE s.name ILIKE '%' || w || '%'
                OR word_similarity(w, s.name) > 0.35
           )
           OR EXISTS (
             SELECT 1 FROM unnest(s.keywords) AS kw
             WHERE kw ILIKE '%' || ${q} || '%'
                OR word_similarity(${q}, kw) > 0.4
                OR EXISTS (
                  SELECT 1 FROM unnest(${words}::text[]) AS w
                  WHERE kw ILIKE '%' || w || '%'
                     OR word_similarity(w, kw) > 0.4
                )
           )
      ) sub
      ORDER BY rank ASC, "roleName" ASC, name ASC;
    `;
    return NextResponse.json({ skills });
  } catch (err) {
    console.error("Fuzzy skill search failed, falling back to exact match:", err);
    const skills = await prisma.$queryRaw<SkillRow[]>`
      SELECT DISTINCT ON (s.id) s.id, s.slug, s.name,
        r.name AS "roleName", r.category
      FROM "Skill" s
      JOIN "Role" r ON r.id = s."roleId"
      WHERE s.name ILIKE '%' || ${q} || '%'
         OR EXISTS (
           SELECT 1 FROM unnest(s.keywords) AS kw
           WHERE kw ILIKE '%' || ${q} || '%'
         )
      ORDER BY s.id;
    `;
    return NextResponse.json({ skills, fuzzyFailed: true });
  }
}
