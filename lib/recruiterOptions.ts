// Fixed choices for the recruiter onboarding form. Shared by the form and
// the API so the server can reject values the form would never send.

// The 21 industries the resume classifier predicts (see lib/role-industries.json
// and ml/classify_candidates.py), plus "Other".
export const INDUSTRIES = [
  "Agriculture",
  "Automotive & Vehicle Repair",
  "Construction & Skilled Trades",
  "Consulting",
  "Cybersecurity",
  "Data & AI/ML",
  "Design & Product",
  "Education",
  "Finance & Fintech",
  "Hardware & Engineering",
  "Healthcare",
  "Hospitality & Food Service",
  "HR & People Operations",
  "Legal",
  "Marketing & Digital Media",
  "Media & Entertainment",
  "Operations & Supply Chain",
  "Retail & Consumer Goods",
  "Sales & Business Development",
  "Software & Technology",
  "Transportation & Aviation",
  "Other",
];

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1,000",
  "1,001-5,000",
  "5,001-10,000",
  "10,000+",
];

export const RECRUITER_TYPES = [
  { value: "in_house", label: "In-house", hint: "I hire for the company I work at" },
  { value: "agency", label: "Agency / third-party", hint: "I hire on behalf of client companies" },
] as const;

export const OPEN_POSITIONS = ["1", "2-5", "6-20", "21-50", "50+"];

export const HIRING_TIMELINES = [
  "Immediately",
  "Within 1 month",
  "Within 3 months",
  "Within 6 months",
  "Just exploring",
];
