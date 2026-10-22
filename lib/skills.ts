export type Skill = {
  slug: string;
  name: string;
  roleSlug: string;
  roleName: string;
  category: string;
};

// Static list of all 3,405 skills (one per row across every role's skill
// sheet), bundled directly into the frontend for the same reason
// lib/roles.ts is: the search dropdown always has something to show, even
// if the database is briefly unavailable. Keyword lists are intentionally
// NOT included here (that would be 1MB+ of dead weight) — keyword search
// itself always goes through the database via /api/skills.
import skillsData from "./skills-data.json";

export const skills: Skill[] = skillsData;
