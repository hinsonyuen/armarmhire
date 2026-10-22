import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RoleRow = {
  id: string;
  code: string;
  name: string;
  slug: string;
  category: string;
};

// GET /api/roles?q=python
// With no query: ALL 123 roles, ordered by code.
// With a query: matches against the role name OR any keyword under any
// skill belonging to that role, using exact substring matching PLUS moderate fuzzy (typo-tolerant)
// trigram similarity via pg_trgm's word_similarity() — tightened after
// testing showed very low thresholds matched far too broadly. The query
// is also split into individual words (each checked independently).
// Ranking, best first: exact name match, exact keyword match, fuzzy name
// match, fuzzy keyword match.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    const roles = await prisma.role.findMany({ orderBy: { code: "asc" } });
    return NextResponse.json({ roles });
  }

  const words = q.split(/\s+/).filter((w) => w.length > 0);

  try {
    const roles = await prisma.$queryRaw<RoleRow[]>`
      SELECT id, code, name, slug, category FROM (
        SELECT DISTINCT ON (r.id) r.id, r.code, r.name, r.slug, r.category,
          CASE
            WHEN r.name ILIKE '%' || ${q} || '%' THEN 0
            WHEN EXISTS (
              SELECT 1 FROM unnest(s.keywords) AS kw
              WHERE kw ILIKE '%' || ${q} || '%'
            ) THEN 1
            WHEN word_similarity(${q}, r.name) > 0.35 THEN 2
            ELSE 3
          END AS rank
        FROM "Role" r
        LEFT JOIN "Skill" s ON s."roleId" = r.id
        WHERE r.name ILIKE '%' || ${q} || '%'
           OR word_similarity(${q}, r.name) > 0.35
           OR EXISTS (
             SELECT 1 FROM unnest(${words}::text[]) AS w
             WHERE r.name ILIKE '%' || w || '%'
                OR word_similarity(w, r.name) > 0.35
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
        ORDER BY r.id
      ) sub
      ORDER BY rank ASC, code ASC;
    `;
    return NextResponse.json({ roles });
  } catch (err) {
    // If the fuzzy/trigram query fails for any reason (e.g. pg_trgm isn't
    // installed), fall back to a plain exact-substring match rather than
    // returning nothing at all.
    console.error("Fuzzy role search failed, falling back to exact match:", err);
    const roles = await prisma.$queryRaw<RoleRow[]>`
      SELECT DISTINCT ON (r.id) r.id, r.code, r.name, r.slug, r.category
      FROM "Role" r
      LEFT JOIN "Skill" s ON s."roleId" = r.id
      WHERE r.name ILIKE '%' || ${q} || '%'
         OR EXISTS (
           SELECT 1 FROM unnest(s.keywords) AS kw
           WHERE kw ILIKE '%' || ${q} || '%'
         )
      ORDER BY r.id;
    `;
    return NextResponse.json({ roles, fuzzyFailed: true });
  }
}
