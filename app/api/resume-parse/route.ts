import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import skillsList from "@/lib/job-seeker-skills.json";
import countriesList from "@/lib/countries.json";

export const dynamic = "force-dynamic";

// ---- Heuristic, regex-based resume parsing. No LLM involved. ----
// This is intentionally conservative: fields we can't extract with real
// confidence (most notably who-worked-where-and-as-what within each
// experience entry) are left blank rather than guessed wrong, since a
// silently-incorrect autofill is worse than an empty field the person
// fills in themselves.

const MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_TOKEN = `(?:${MONTH}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|Present|Current)`,
  "gi"
);

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function extractLinkedIn(text: string): string | null {
  const m = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_/]+/i);
  if (!m) return null;
  let url = m[0].replace(/[.,)]+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function extractName(lines: string[]) {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line) continue;
    if (/@|linkedin|https?:\/\/|resume|curriculum vitae|\d/i.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (
      words.length >= 1 &&
      words.length <= 4 &&
      words.every((w) => /^[A-Za-z.'-]+$/.test(w))
    ) {
      if (words.length === 1) return { first: words[0], middle: "", last: "" };
      if (words.length === 2)
        return { first: words[0], middle: "", last: words[1] };
      return {
        first: words[0],
        middle: words.slice(1, -1).join(" "),
        last: words[words.length - 1],
      };
    }
  }
  return { first: "", middle: "", last: "" };
}

// Best-effort only — looks for a short "City, ST"/"City, Country"-shaped
// line near the top of the document. Left blank if nothing confident.
// Location is now a strict dropdown of exactly 200 country names, so a
// free-text city guess ("San Francisco, CA") would never match any
// option — only return a value here if it confidently maps to one of
// the actual dropdown entries. A few common resume shorthands are
// aliased to their real dropdown value (e.g. "USA" -> "United States").
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  "hong kong": "Hong Kong SAR",
  "south korea": "South Korea",
  uae: "United Arab Emirates",
};

function extractLocation(lines: string[]): string | null {
  const headerText = lines.slice(0, 12).join(" | ");

  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    const re = new RegExp(`\\b${alias.replace(/\./g, "\\.")}\\b`, "i");
    if (re.test(headerText)) return canonical;
  }

  for (const country of countriesList as string[]) {
    if (country === "Other") continue;
    const re = new RegExp(`\\b${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(headerText)) return country;
  }

  return null;
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return (skillsList as string[]).filter((skill) => {
    const core = skill.split("(")[0].trim().toLowerCase();
    return core.length > 1 && lower.includes(core);
  });
}

const DEGREE_RE = /\b(Bachelor'?s?|Master'?s?|PhD|Ph\.D\.?|Associate'?s?|MD|Doctor(?:ate)?)\b/i;

function normalizeDegree(match: string): string {
  const m = match.toLowerCase();
  if (m.startsWith("bachelor")) return "Bachelor's";
  if (m.startsWith("master")) return "Master's";
  if (m.startsWith("associate")) return "Associate's";
  if (m.includes("phd") || m.includes("ph.d")) return "PhD";
  if (m === "md") return "MD";
  return "Doctorate";
}

async function extractEducation(text: string) {
  const universities = await prisma.university.findMany({
    select: { lookupName: true },
  });

  const lower = text.toLowerCase();
  const found: { institution: string; degreeType: string | null }[] = [];

  for (const u of universities) {
    if (!u.lookupName || u.lookupName.length < 4) continue;
    const idx = lower.indexOf(u.lookupName.toLowerCase());
    if (idx === -1) continue;

    // Look for a degree keyword in a window of text around the mention.
    const windowStart = Math.max(0, idx - 120);
    const windowEnd = Math.min(text.length, idx + u.lookupName.length + 120);
    const window = text.slice(windowStart, windowEnd);
    const degreeMatch = window.match(DEGREE_RE);

    found.push({
      institution: u.lookupName,
      degreeType: degreeMatch ? normalizeDegree(degreeMatch[0]) : null,
    });

    if (found.length >= 2) break; // form supports at most 2 education entries
  }

  return found;
}

function splitTitleCompany(line: string): { title: string; employer: string } {
  const trimmed = line.trim();
  for (const sep of [" at ", " @ ", " - ", " – ", " — ", ", "]) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0) {
      return {
        title: trimmed.slice(0, idx).trim(),
        employer: trimmed.slice(idx + sep.length).trim(),
      };
    }
  }
  return { title: "", employer: "" };
}

function extractExperience(text: string) {
  const matches = Array.from(text.matchAll(DATE_RANGE_RE));
  const experiences: {
    employer: string;
    positionTitle: string;
    startDate: string;
    endDate: string;
    description: string;
  }[] = [];

  for (const m of matches.slice(0, 5)) {
    const matchIndex = m.index ?? 0;
    const lineStart = text.lastIndexOf("\n", matchIndex);
    const contextBefore = text.slice(
      Math.max(0, lineStart - 200),
      matchIndex
    );
    const beforeLines = contextBefore
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const titleLine = beforeLines[beforeLines.length - 1] ?? "";
    const { title, employer } = splitTitleCompany(titleLine);

    const nextMatch = matches[matches.indexOf(m) + 1];
    const descEnd = nextMatch ? nextMatch.index ?? text.length : Math.min(text.length, matchIndex + 600);
    const descLines = text
      .slice(matchIndex + m[0].length, descEnd)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Stop early at the next resume section header (e.g. "EDUCATION",
    // "SKILLS") so the description doesn't bleed into unrelated content
    // when there's no next date-match to bound it.
    const sectionHeaderIdx = descLines.findIndex((l) =>
      /^[A-Z][A-Z\s/&-]{2,30}$/.test(l)
    );
    const boundedLines =
      sectionHeaderIdx === -1 ? descLines : descLines.slice(0, sectionHeaderIdx);

    // When there's a next date-match, the last line of this slice is the
    // *next* entry's title/employer line (it's what extractExperience
    // reads back from position `nextMatch.index`) — drop it here so it
    // doesn't also get counted as this entry's description.
    const finalLines = nextMatch ? boundedLines.slice(0, -1) : boundedLines;

    const description = finalLines.slice(0, 6).join(" ").slice(0, 800);

    experiences.push({
      employer,
      positionTitle: title,
      startDate: m[1],
      endDate: m[2],
      description,
    });
  }

  return experiences;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("resume");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamic import — pdf-parse does some work at module load time that's
    // best kept out of the route's cold-start path when unused. This
    // version exposes a PDFParse class, not a plain function.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text || "";
    const lines = text.split("\n");

    const name = extractName(lines);
    const email = extractEmail(text);
    const linkedin = extractLinkedIn(text);
    const location = extractLocation(lines);
    const skills = extractSkills(text);
    const experiences = extractExperience(text);
    const educations = await extractEducation(text);

    return NextResponse.json({
      name,
      email,
      linkedin,
      location,
      skills,
      experiences,
      educations,
    });
  } catch (err) {
    console.error("resume-parse error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Couldn't parse that resume", detail: message },
      { status: 500 }
    );
  }
}
