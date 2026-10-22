import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/candidates/export
// Body: { candidateIds: string[] }
// Returns an .xlsx file of the requested candidates.
export async function POST(req: NextRequest) {
  let body: { candidateIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidateIds = Array.isArray(body.candidateIds)
    ? body.candidateIds.filter((id): id is string => typeof id === "string")
    : [];

  if (candidateIds.length === 0) {
    return NextResponse.json(
      { error: "No candidate IDs provided" },
      { status: 400 }
    );
  }

  try {
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: {
        name: true,
        linkedin: true,
        email: true,
        location: true,
        degreeType: true,
        institution: true,
        weightedEdScore: true,
        weightedCaScore: true,
        totalScore: true,
        industry: true,
        industryProbability: true,
      },
      orderBy: { totalScore: "desc" },
    });

    const rows = candidates.map((c) => ({
      Name: c.name,
      LinkedIn: c.linkedin,
      Email: c.email ?? "",
      Location: c.location ?? "",
      "Degree": c.degreeType ?? "",
      "Institution": c.institution ?? "",
      "Education Score": c.weightedEdScore ?? "",
      "Career Score": c.weightedCaScore ?? "",
      "Total Score": c.totalScore ?? "",
      "Predicted Industry": c.industry ?? "",
      "Industry Confidence": c.industryProbability ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="candidates-export.xlsx"`,
      },
    });
  } catch (err) {
    console.error("candidates export error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error exporting candidates", detail: message },
      { status: 500 }
    );
  }
}
