import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, "data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
}

// Simple batching helper — Postgres/Prisma createMany chokes on very large
// single calls, so we chunk everything.
async function chunked<T>(
  items: T[],
  size: number,
  fn: (chunk: T[]) => Promise<unknown>
) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

type RoleSeed = {
  code: string;
  name: string;
  slug: string;
  category: string;
};

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

type CandidateSeed = {
  idx: number;
  linkedin: string;
  email: string | null;
  name: string;
  location: string | null;
  experiences: ExperienceEntry[];
  degreeType: string | null;
  institution: string | null;
  educationTimePeriod: string | null;
  educationDescription: string | null;
  skills: string[];
  uniRank: number | null;
  mbn: number | null;
  grossEdScore: number | null;
  weightedEdScore: number | null;
  expTime: number | null;
  largeCoMatch: number | null;
  grossCaScore: number | null;
  weightedCaScore: number | null;
  totalScore: number | null;
};

type SkillSeed = {
  roleSlug: string;
  skillName: string;
  slug: string;
  keywords: string[];
};

type UniversitySeed = {
  rank: string | null;
  name: string;
  lookupName: string;
  numericRank: number | null;
};

// Output of ml/classify_candidates.py, one row per candidate.
type IndustryPredictionSeed = {
  idx: number;
  industry: string;
  probability: number;
  confident: boolean;
  top3: { industry: string; probability: number }[];
};

// [candidateIdx, skillSlug, keywordCount]
type SkillMatchSeed = [number, string, number];

// [candidateIdx, roleSlug, keywordCount]
type RoleMatchSeed = [number, string, number];

async function seedRoles() {
  const roles = readJson<RoleSeed[]>("roles.json");
  console.log(`Roles: upserting ${roles.length}...`);
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        code: role.code,
        name: role.name,
        category: role.category,
      },
      create: role,
    });
  }
}

async function seedCandidates() {
  const candidates = readJson<CandidateSeed[]>("candidates.json");
  console.log(`Candidates: replacing with ${candidates.length} rows...`);

  // Full replace, not additive — the source data for this restructuring
  // wholesale replaces the previous candidate set (different schema,
  // different row count). Cascades to CandidateSkillMatch/
  // CandidateRoleMatch via onDelete: Cascade.
  await prisma.candidate.deleteMany({});

  // Industry predictions are optional: the file only has rows once
  // ml/classify_candidates.py has been run against candidates.json.
  const predictionsFile = path.join(dataDir, "candidate-industries.json");
  const predictions = fs.existsSync(predictionsFile)
    ? readJson<IndustryPredictionSeed[]>("candidate-industries.json")
    : [];
  const predictionByIdx = new Map(predictions.map((p) => [p.idx, p]));
  console.log(`  with industry predictions for ${predictionByIdx.size} of them`);

  await chunked(candidates, 100, (chunk) =>
    prisma.candidate.createMany({
      data: chunk.map((c) => ({
        industry: predictionByIdx.get(c.idx)?.industry ?? null,
        industryProbability: predictionByIdx.get(c.idx)?.probability ?? null,
        industryConfident: predictionByIdx.get(c.idx)?.confident ?? null,
        industryTop3: predictionByIdx.get(c.idx)?.top3 ?? undefined,
        sourceIndex: c.idx,
        linkedin: c.linkedin,
        email: c.email,
        name: c.name,
        location: c.location,
        experiences: c.experiences,
        degreeType: c.degreeType,
        institution: c.institution,
        educationTimePeriod: c.educationTimePeriod,
        educationDescription: c.educationDescription,
        skills: c.skills,
        uniRank: c.uniRank,
        mbn: c.mbn,
        grossEdScore: c.grossEdScore,
        weightedEdScore: c.weightedEdScore,
        expTime: c.expTime,
        largeCoMatch: c.largeCoMatch,
        grossCaScore: c.grossCaScore,
        weightedCaScore: c.weightedCaScore,
        totalScore: c.totalScore,
      })),
      skipDuplicates: true,
    })
  );
}

async function seedSkills() {
  const skills = readJson<SkillSeed[]>("skills.json");
  console.log(`Skills: replacing with ${skills.length} rows...`);

  const roles = await prisma.role.findMany({
    select: { id: true, slug: true },
  });
  const roleIdBySlug = new Map(roles.map((r) => [r.slug, r.id]));

  const rows = skills
    .map((s) => {
      const roleId = roleIdBySlug.get(s.roleSlug);
      if (!roleId) return null;
      return {
        name: s.skillName,
        slug: s.slug,
        keywords: s.keywords,
        roleId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Skill rows are keyed on (roleId, name), and that key doesn't change
  // even when a keyword library update only changes the *keywords* list
  // for an existing skill. createMany+skipDuplicates would silently skip
  // those rows, leaving stale keyword arrays in place. Wiping and
  // reinserting fresh guarantees the DB always matches skills.json
  // exactly. (CandidateSkillMatch rows, if any exist from an older seed,
  // cascade-delete along with their skill — that table isn't used by any
  // current feature.)
  await prisma.skill.deleteMany({});
  await chunked(rows, 500, (chunk) =>
    prisma.skill.createMany({ data: chunk, skipDuplicates: true })
  );
}

async function seedLargeCo() {
  const names = readJson<string[]>("largeco.json");
  console.log(`LargeCo: inserting ${names.length}...`);
  await chunked(names, 500, (chunk) =>
    prisma.largeCo.createMany({
      data: chunk.map((name) => ({ name })),
      skipDuplicates: true,
    })
  );
}

async function seedUniversities() {
  const unis = readJson<UniversitySeed[]>("unirank.json");
  console.log(`Universities: inserting ${unis.length}...`);
  await chunked(unis, 500, (chunk) =>
    prisma.university.createMany({
      data: chunk.map((u) => ({
        rank: u.rank,
        name: u.name,
        lookupName: u.lookupName,
        numericRank: u.numericRank,
      })),
      skipDuplicates: true,
    })
  );
}

async function seedSkillMatches() {
  const skillMatches = readJson<SkillMatchSeed[]>("skill-matches.json");
  console.log(`Candidate-skill matches: replacing with ${skillMatches.length} rows...`);

  const candidates = await prisma.candidate.findMany({
    select: { id: true, sourceIndex: true },
  });
  const candidateIdByIdx = new Map(candidates.map((c) => [c.sourceIndex, c.id]));

  const skills = await prisma.skill.findMany({
    select: { id: true, slug: true },
  });
  const skillIdBySlug = new Map(skills.map((s) => [s.slug, s.id]));

  const rows = skillMatches
    .map(([idx, skillSlug, keywordCount]) => {
      const candidateId = candidateIdByIdx.get(idx);
      const skillId = skillIdBySlug.get(skillSlug);
      if (!candidateId || !skillId) return null;
      return { candidateId, skillId, keywordCount };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Same staleness issue as Skill/CandidateRoleMatch above — wipe and
  // reinsert fresh rather than relying on skipDuplicates alone.
  await prisma.candidateSkillMatch.deleteMany({});
  await chunked(rows, 2000, (chunk) =>
    prisma.candidateSkillMatch.createMany({
      data: chunk,
      skipDuplicates: true,
    })
  );
}

async function seedRoleMatches() {
  const roleMatches = readJson<RoleMatchSeed[]>("role-matches.json");
  console.log(`Candidate-role matches: replacing with ${roleMatches.length} rows...`);

  const candidates = await prisma.candidate.findMany({
    select: { id: true, sourceIndex: true },
  });
  const candidateIdByIdx = new Map(candidates.map((c) => [c.sourceIndex, c.id]));

  const roles = await prisma.role.findMany({
    select: { id: true, slug: true },
  });
  const roleIdBySlug = new Map(roles.map((r) => [r.slug, r.id]));

  const rows = roleMatches
    .map(([idx, roleSlug, keywordCount]) => {
      const candidateId = candidateIdByIdx.get(idx);
      const roleId = roleIdBySlug.get(roleSlug);
      if (!candidateId || !roleId) return null;
      return { candidateId, roleId, keywordCount };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Same staleness issue as Skill above: (candidateId, roleId) pairs that
  // already existed from a prior keyword library would keep their old
  // keywordCount under skipDuplicates alone. Wipe and reinsert fresh.
  await prisma.candidateRoleMatch.deleteMany({});
  await chunked(rows, 2000, (chunk) =>
    prisma.candidateRoleMatch.createMany({
      data: chunk,
      skipDuplicates: true,
    })
  );
}

async function main() {
  // Enables fuzzy (typo-tolerant) matching in the role/skill search APIs
  // via word_similarity() (moderate thresholds, tuned after testing
  // showed very low ones matched far too broadly).
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  await seedRoles();
  await seedCandidates();
  await seedSkills();
  await seedLargeCo();
  await seedUniversities();
  await seedSkillMatches();
  await seedRoleMatches();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
