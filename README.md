# ArmArmHire — Candidates (v32)

Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL.

> Note: the project folder is still named `prohyre` internally (renaming it
> would break existing `cd prohyre` muscle memory from earlier zips) — only
> the app's displayed name, page titles, and color scheme have changed to
> ArmArmHire.

There is no standalone homepage anymore — visiting `/` redirects straight
to `/candidates`, which is now the app's landing experience.

## What's here

**Candidates page** (`/candidates`)
- Every candidate, ranked by score, in a LinkedIn-style card list.
- **Profile** button, top right, navigating to `/profile` in the same tab.
- Left sidebar:
  - **Weighting** — drag the slider between Experience (0% education) and
    Education (100% education), or type exact percentages directly into
    either number field. Both stay in sync and re-sort every candidate's
    score live, client-side, no reload.
  - **Search roles** — type-ahead over all 123 roles. Selecting one calls
    `/api/role-fit?role=<slug>`, which returns every candidate with at
    least one keyword match (from any skill under that role) in their
    experience text. Matched candidates are highlighted in a brighter
    yellow and shown in their own "N matches for {role}" group at the
    top, each group still sorted by score; everyone else appears below
    under "All other candidates." A "Clear" link removes the filter.
  - **Location** — a dropdown of every distinct location among the loaded
    candidates, plus "All locations." Filters the list live, client-side,
    combined with weighting and role-fit.
- The earlier skill-checkbox filter (`SkillFilterPanel`, reached via
  `/candidates?role=&skills=`) has been retired entirely, replaced by the
  role-fit search above. The underlying `Skill` / `CandidateSkillMatch`
  tables are still seeded (harmless, may be reused later) but nothing in
  the UI queries them anymore.

**Individual candidate page** (`/candidates/[id]`)
- Reached by clicking any candidate row (no longer a dead link).
- Shows: Name, Location, Contact info (Email, LinkedIn), Education #1–#2,
  Experience #1–#5 — pulled directly from the Candidate record.

**Profile page** (`/profile`)
- Company Name/Name, Profile Picture, Location, Email, Phone (optional),
  LinkedIn (optional), Attachments (optional). One per recruiter account,
  pre-filled at onboarding (see "Recruiter accounts" below).

## Recruiter accounts: sign-up, email confirmation, log in

The recruiter pages (`/candidates`, `/candidates/[id]`, `/profile`) and
the recruiter APIs (`/api/role-fit`, `/api/skill-fit`,
`/api/candidates/export`, `/api/profile`) now require a logged-in
recruiter. Logged-out visitors are sent to `/login` and returned to the
page they wanted afterwards. Job-seeker sign-up is unchanged and needs no
account.

**Sign-up flow**
1. `/signup` → **Recruiter** → `/signup/recruiter`: enter a work email.
2. An email with a confirmation link is sent (valid 24 hours; only the
   newest link works; a new one can be requested after 60 seconds).
3. The link opens `/signup/recruiter/verify`: choose a password (8+
   characters with at least one letter and one number). This confirms
   the email and logs the recruiter in.
4. `/onboarding`: the recruiter profile form. About you (first/last name,
   job title, phone, LinkedIn); who you hire for (in-house or agency, with
   agency name, company/client name, website, industry from the
   classifier's 21 industries, company size, HQ country and city); and
   what you hire for (roles from the 123-role list, hiring locations or
   Remote, open positions, timeline). Submitting it also pre-fills the
   recruiter's employer profile on `/profile`, then opens `/candidates`.

Signing up with an email that already has an account shows the same
"check your email" screen, and that address receives a "you already have
an account, log in here" email instead, so the form can't be used to find
out who is registered.

**How it works**
- Tables: `User`, `Session`, `EmailVerificationToken`, `RecruiterProfile`;
  `EmployerProfile` now has a `userId` (one per recruiter; it was a single
  shared row before).
- Passwords are hashed with Node's built-in scrypt (`lib/password.ts`).
- Sessions: a random token in an httpOnly cookie (`armarmhire_session`,
  30 days); only its SHA-256 is stored. `middleware.ts` redirects requests
  that have no cookie; pages and APIs validate the session through
  `lib/auth.ts`.
- Email: `lib/email.ts`, sent over SMTP using `SMTP_*` in `.env`.

**Reading the emails locally.** `docker compose up -d` now also starts
**Mailpit**, a test inbox: every email the app sends is caught there
(nothing reaches real addresses). Open **http://localhost:8025** to see
it and click the confirmation link. For real delivery, put your email
provider's SMTP settings in `.env` and set `APP_URL` to the site's public
address. If `SMTP_HOST` is empty, emails are printed in the `npm run dev`
console instead.

**Not built yet:** password reset ("forgot password"), changing email or
password, editing the onboarding answers after sign-up (company details
can be changed on `/profile`), rate limiting on log-in attempts, and
accounts for job seekers.

## Industry classifier in role search (v31, setup fixes v32)

Searching a role now uses the ML industry classifier (the
`armarmhire-industry-classifier` folder from the v3 Colab notebook), not just
keyword matching.

**How it fits together**
- **Offline, like the keyword matching.** `ml/classify_candidates.py` runs the
  model (RoBERTa + TF-IDF ensemble) over `prisma/data/candidates.json` and
  writes each candidate's top-3 predicted industries to
  `prisma/data/candidate-industries.json`. The seed script loads them onto the
  `Candidate` row. The Next.js app never runs Python or loads the 740 MB model.
- **Roles → industries.** `lib/role-industries.json` maps each of the 123 roles
  to one primary industry plus optional related ones (e.g. Data Engineer →
  Data & AI/ML, related Software & Technology; Healthcare Consultant →
  Consulting, related Healthcare). Edit this file to change how roles map.
- **What a role search shows**
  1. **Matches**: candidates whose predicted industry fits the role, ranked
     *Industry match* (model's top pick is the role's industry) before
     *Related industry* (role's industry is the 2nd/3rd pick with ≥15%
     probability, or the top pick is a related industry), then by keyword
     hits, then by the weighted score.
  2. **In other industries with matching keywords**: candidates outside the
     industry whose experience still contains the role's keywords.
  3. **All other candidates.**
- The sidebar shows the role's industry and the model's validation accuracy
  for it (from `scores_per_industry.csv`), each card shows the predicted
  industry (a "?" means low confidence), the candidate page shows the top 3
  with probabilities, and the Excel export gains *Predicted Industry* and
  *Industry Confidence* columns.
- **Fallback:** until predictions exist, role search behaves exactly as
  before (keyword matching only) and says so in the sidebar.

**Running it** (from the project folder; Docker Desktop must be running)
```bash
docker compose up -d                     # start the database
npm install                              # REQUIRED first — installs prisma 5, tsx and next locally
npx prisma db push                       # adds the 4 industry columns to Candidate
pip install -r ml/requirements.txt       # once; CPU is fine
python ml/classify_candidates.py --model-dir ml/models/armarmhire-industry-classifier
npm run prisma:seed
npm run dev
```
- Skipping `npm install` is what causes `'tsx' is not recognized`,
  `'next' is not recognized`, and `npx prisma` downloading an unrelated
  Prisma 8 pre-release ("No command registered for `push`").
- `--model-dir` must point at the unzipped model folder (the one containing
  `model.safetensors`). The script also accepts a parent folder and finds it
  one or two levels down, and tells you what it found if it can't.
- With an empty `candidates.json` the script just exports the model's scores
  and says there is nothing to classify.
- If `tfidf_model.joblib` won't load (scikit-learn version differs from
  Colab's), the script warns and uses the transformer alone. To get the full
  ensemble, install the version Colab used (`!pip show scikit-learn` in Colab).

Re-run the classify and seed steps whenever `candidates.json` changes.

**Caveats**
- `candidates.json` is still empty (since v22), so there is nothing to
  classify until candidate data is added back.
- The model was trained on full resumes; candidates here are structured
  LinkedIn-style records, rebuilt into resume-like text by the script. Expect
  accuracy on them to be somewhat below the notebook's validation scores.
  Tested on the 353 candidates in `LinkedIn_Candidates_-_Expanded_Experience_5.xlsx`
  (2 minutes on CPU).
- Keep the model folder out of the project zip/repo (`ml/models/` is
  gitignored if you want to store it there).

## Refined keyword library (v3)

Swapped in a refined keyword library (37,718 keywords across the same
3,399 skills, down from 64,123 — same skill names throughout, zero
renames/removals, so slugs stayed consistent and this was a clean swap).

The refinement did most of the over-matching fix on its own, before
threshold tuning even entered the picture:

| | Old library | Refined library |
|---|---|---|
| Skill match rate (exact-only) | 31.1% | **4.8%** |
| Skill match rate (threshold 88) | 32.4% | **6.2%** |
| Role match rate (exact-only) | 80.8% | **27.3%** |
| Role match rate (threshold 88) | 81.1% | **31.8%** |

Kept threshold 88 for both (your call, after seeing this data) since it
now produces genuinely selective match rates. Recomputed for all 551
candidates: 137,011 skill-match rows (down from 851,749) and 13,951
role-match rows (down from 54,608) — both much faster to seed than
before.

## Reduced fuzziness (both search and candidate matching)

Both search-bar suggestions and candidate matching got stricter, based
on measured data rather than guesses:

- **Skill-candidate matching**: threshold raised from 82 to **88**
  (chosen from measured data — 88 sits close to the exact-only baseline
  while still adding a small amount of typo tolerance). Recomputed for
  all 551 candidates: 851,749 match rows (down from 929,909).
- **Role-candidate matching**: previously exact-only; **fuzzy matching
  added** at the same threshold (88), for consistency. Also switched
  counting from "total occurrences" to "distinct terms matched" (same
  convention as skills), since fuzzy matches don't have a natural
  repeat-count. Recomputed: 54,608 match rows.
- **Search-bar suggestions** (`/api/roles`, `/api/skills`):
  `word_similarity()` thresholds raised from 0.1/0.15 to **0.35/0.4**.
  Unlike the candidate-matching thresholds above, these weren't
  benchmarked against live data (that requires a running Postgres with
  `pg_trgm`, which isn't available in the environment these updates are
  built in) — they're a reasoned estimate based on common trigram
  similarity conventions. Flag it if search still feels too loose or
  too strict once you've tried it.

**Important finding, not a fix:** role-candidate matching stays broad
regardless of fuzziness. Benchmarking showed even the *strictest*
possible threshold only brought role match rates down to ~81% (from
~87% at loose fuzzy) — because roles aggregate keywords across every
skill under them (~500+ terms per role), so exact matching alone already
catches almost everyone. If you want roles to be more selective later,
that needs a different mechanism (e.g. requiring multiple keyword hits,
or matching against only a subset of "core" skills per role) — threshold
tuning alone won't do it.

## Profile persistence (new)

The Profile page now genuinely saves — previously "Save changes" was
local-state-only and vanished on refresh, which was flagged as a known
gap when it was first built.

- **Singleton profile**: this app still has no login/session system, so
  there's exactly one employer profile, always the same database row —
  not looked up per-user. `/api/profile` (GET to load, POST to save)
  reads/writes that one row.
- **File uploads**: profile picture and attachments are saved to
  `public/uploads/` on disk (with a generated filename to avoid
  collisions), and their URLs stored in the `EmployerProfile.attachments`
  JSON field / `profilePictureUrl` column. This works fine for local
  dev, but note it's disk-based, not cloud storage — if you ever deploy
  this somewhere with an ephemeral filesystem, uploaded files won't
  survive a restart. `public/uploads/` is gitignored (except a
  `.gitkeep` placeholder) so uploaded files don't get swept into future
  zips.
- The form loads existing saved data on mount, and distinguishes
  already-saved attachments from newly-picked-but-not-yet-uploaded ones
  in the UI ("not saved yet" label) until you actually click Save.

This required expanding the previously-stub `EmployerProfile` model
(email/companyName/logoUrl only) to cover every field the form actually
has: location, phone, linkedin, profilePictureUrl, attachments — so a
schema change is included this time:
```bash
npx prisma db push
```
(No new seed data — this only affects the empty `EmployerProfile` table,
which isn't part of the candidate/role/skill seed data at all.)

## Profile, Location, and bulk export (new)

- **Profile page**: added a "← Back to candidates" link at the top.
  Since the form was never persisted to a backend (local state only),
  navigating away already discarded any unsaved changes — the button
  just makes that explicit and easy.

- **Location filter**: replaced the old "All locations" default with
  two framed options — **Remote** (functionally identical: shows every
  candidate, unfiltered) and **In-person** (filters to candidates whose
  location contains a "Your location" value you type in). The specific
  city list still appears below both, unchanged.

  **Known limitation, flagged deliberately rather than silently
  assumed:** "In-person" needs to compare against the *employer's own*
  location, but there's no persisted employer identity anywhere in this
  app — the Profile page's Location field is local-state-only, and
  there's no login/session system to know "which employer" is even
  browsing. Rather than block on building full auth + profile
  persistence (a much bigger task than what was asked), "Your location"
  is a small session-only input directly in the Location filter card —
  not connected to the Profile page, not saved across reloads. If you
  want this properly tied to a persisted employer profile, that's a
  separate follow-up (wiring `ProfileForm` to actually save to the
  `EmployerProfile` table, then having this filter read from it).

- **Bulk selection + Excel export**: every candidate card now has a
  checkbox. "Select all N matching" selects every candidate in the
  *current filtered/ranked list* (across all pages, not just the visible
  30) — respects whatever role/skill/location filters are active.
  "Export" POSTs the selected IDs to `/api/candidates/export`, which
  builds a real `.xlsx` file server-side (via the `xlsx`/SheetJS
  library, a new dependency) with Name, LinkedIn, Email, Location,
  both Universities/Majors, and all three scores — then triggers a
  browser download.

## Black & white redesign (v23)

Dropped the soft-yellow palette entirely in favor of black, white, and
gray — closer to Autodesk's clean, technical brand language than the
earlier warm/friendly look.

- **Palette**: near-white page background (`#FAFAFA`), white cards,
  near-black accent (`#141414`) for buttons/focus states/selection,
  pure black (`#000000`) hover, light gray (`#F0F0F0`) for badge/avatar
  backgrounds. No color left in the UI at all — emphasis now comes from
  contrast and weight, not hue.
- **Shape**: search bars and action buttons (Save, Export, Add files,
  Profile link) squared off from full pills to modest rounded corners
  (`rounded-lg`) — reads more like engineering/technical software,
  less like a consumer startup. Tag-style chips (self-reported skills,
  selected-skill pills) deliberately kept as pills — that's still a
  fitting pattern for tags specifically, not everything.
- Matched/highlighted candidate cards now signal importance through a
  black border + light gray fill instead of a colored highlight — same
  idea, no color required.

## Per-experience Location: suggestion dropdown, not restrictive (new)

Each of the 5 Experience entries' Location field now suggests from
~200 major global metro areas — a mix of the world's largest population
centers (grounded in current UN/Wikipedia data, not just memory) and
recognized global business/employment hubs across every region, since
this is a jobs platform, not a pure population ranking.

**Genuinely a suggestion, not a restriction**, per instruction: this
uses HTML's native `<datalist>`, not a `<select>` — it's still a plain
text field underneath, so typing anything not in the list (a smaller
town, an unusual spelling) is accepted exactly the same as before. This
is different from the strict dropdowns added for Location/Field of
Study/Institution last update, which only accept listed values.

```bash
npm install
npm run dev
```

## Job Seeker form: dropdowns, skill search, date pickers (new)

Matched more of the form to the actual Google Form and improved the
inputs:

- **Location** — now a dropdown of the exact 200 countries from the
  source form (extracted from the PDF, ends with "Other").
- **Field of Study #1 / #2** — dropdown of the exact 129 options from
  the source form (same list for both fields, confirmed identical).
- **Institution** — dropdown of the same 1,501-entry QS university list
  already used elsewhere in the app (bundled statically, no extra
  network round-trip needed since it's static reference data either
  way).
- **Skills** — a search box now filters the 143-item checklist live.
- **Dates** — Experience and Education Start/End Date fields are now
  native `<input type="date">` (built-in browser calendar picker),
  replacing free-text fields.

**A real interaction I had to handle, not just a cosmetic change:**
resume-parsed dates only ever have month/year precision ("Jan 2021"),
but a day-precision date picker needs a full date. Parsed dates are now
approximated to the 1st of that month — genuinely an approximation, not
a detected exact day, which is worth knowing if you inspect a
resume-autofilled date and wonder why it's always the 1st.

Similarly, Location was previously a free-text guess from resume text
("San Francisco, CA") — meaningless against a strict 200-country
dropdown, since a city name would never match any option. Tightened it
to only fill the field when it can confidently map to an actual country
in the list (with a few common aliases handled — "USA" → "United
States", "UK" → "United Kingdom", "Hong Kong" → "Hong Kong SAR", etc.),
leaving it blank otherwise rather than silently failing to match.

**Verification:** ran an isolated production build (`next build`) to
confirm all of this actually compiles, not just passes the type-checker
— confirmed `✓ Compiled successfully`.

No schema/data changes:
```bash
npm install
npm run dev
```

## Job Seeker application + resume parsing (new)

Built out the Job Seeker side of `/signup`, based on the actual
ArmArmHire Job Application Google Form:

- **`/signup/job-seeker`** — a full application form: Name, Email,
  LinkedIn, Location, up to 5 structured Work Experience entries
  (Employer, Title, Location, Hours/Week, Work Mode, Start/End Date,
  Description), up to 2 Education entries (Degree Type, Field of Study
  #1/#2, Institution, Start/End Date — Education Description only on the
  first entry, matching an asymmetry in the source form), a 143-item
  hard-skill checklist plus free-text "Other skills", and a consent
  checkbox. The "Job seeker" button on `/signup` now really navigates
  here; "Recruiter" is still a dead link, unchanged.
- **Resume upload + autofill** (`/api/resume-parse`) — upload a PDF and
  it attempts to fill in the form automatically. This is **heuristic,
  regex-based parsing, not an LLM** (your choice, to avoid needing an
  API key/incurring cost): PDF text extraction via `pdf-parse`, then:
  - Email, LinkedIn, and skills (checked against the same 143-item list)
    are extracted with high confidence — these are simple, low-ambiguity
    patterns.
  - Name comes from the first plausible name-shaped line near the top of
    the document — a common convention, but a guess.
  - Education institutions are matched by cross-referencing resume text
    against the existing 1,501-entry QS university list already in the
    database — genuinely more reliable than guessing, since it's
    checking against real reference data. Degree type is inferred from
    nearby keywords (Bachelor's/Master's/PhD/etc.).
  - Work experience is the least reliable part, deliberately: dates are
    extracted directly from matched date-range text (fairly reliable),
    but Employer/Title are only filled in when a line splits cleanly on
    a common separator ("Title at Company", "Title, Company") — anything
    ambiguous is left blank rather than guessed wrong. Descriptions are
    bounded so they don't bleed into the next job or the next resume
    section.
  - A visible notice always appears after parsing: "please review every
    field below for accuracy" — this is explicitly best-effort, not a
    verified extraction.

**Submitting the form is still functionless** — no account gets created,
nothing gets saved to the database yet. This form's shape doesn't map
1:1 onto the existing `Candidate` model either (2 education entries vs.
1, a different/flatter skill list vs. the 3,399-skill taxonomy) — wiring
real submission up is a distinct follow-up.

New dependency (`pdf-parse`), no schema/data changes:
```bash
npm install
npm run dev
```

## Structure update, no data (v22)

A newer source file ("Expanded Experience") adds one new field per
experience entry: **Time at Position (months)** — a directly-provided
duration, presumably meant to eventually replace the fragile
Time Period text-parsing the recompute pipeline currently does. Per
instruction, this update is **structure only, with the candidate table
left empty**:

- `ExperienceEntry`'s shape (in both `seed.ts` and the candidate detail
  page) now includes `timeAtPositionMonths: number | null`, and the
  detail page displays it (e.g. "Nov 2023 - Oct 2025 (24 mo)") whenever
  it's present.
- `prisma/data/candidates.json`, `skill-matches.json`, and
  `role-matches.json` are now empty arrays (`[]`) — seeding will wipe
  any existing candidates and load zero rows, leaving the `Candidate`,
  `CandidateSkillMatch`, and `CandidateRoleMatch` tables empty.
- **Assumption made, flag if wrong:** "leave the data empty" was applied
  to candidate data specifically. `LargeCo` and `University` (reference
  lookup tables, unrelated to the candidate columns this update is
  about) are left populated as before — emptying them wouldn't serve any
  purpose since they're static infrastructure, not part of what changed.
- The source file's actual 353 candidate rows (with real scores) were
  **not imported** — deliberately, per instruction — even though they
  exist and are structurally ready to go whenever you want them.
- **No Postgres schema change was needed.** `experiences` is already a
  flexible `Json` column, so a new field inside it doesn't require a
  migration — only the TypeScript types needed updating. `db push` is
  still safe to run, just a no-op on this front.

```bash
npm install
npm run prisma:seed
```
(No `db push` strictly required this time, but harmless to include.)

## Full candidate restructuring (v21)

Wiped and rebuilt the candidate dataset entirely from a new, structurally
different source file — this was a big enough change to warrant its own
section.

**Data changes:**
- **551 → 198 candidates.** The 353 candidates added in an earlier update
  are gone; the database now holds only the 198 candidates present in
  this new source file (restructured versions of the same original
  people).
- **Experience is now structured**, not free text: each of up to 5
  entries has Employer, Position Title, Approx Hours/Week, Work Mode
  (On-site/Hybrid/Remote), Time Period, Location, and Description —
  stored as JSON on `Candidate.experiences` (an array of objects), since
  nothing needs to query into individual sub-fields relationally.
- **Education simplified** to a single entry (`degreeType`,
  `institution`, `educationTimePeriod`, `educationDescription`),
  replacing the old University #1/#2 pair — the source data only has one
  now.
- **New self-reported `skills` field** (string tags candidates listed
  themselves, e.g. "LLM, PEFT, Tableau...") — stored and shown on the
  candidate detail page, but **not** used for automated role/skill
  matching (that still runs against experience Description text, per
  instruction — the two are independent signals for now).
- **Scores recomputed from scratch**, not imported, using the newly
  available structured fields — genuinely more reliable than the old
  regex-based approach:
  - `ExpTime`: employment weight is now `min(hoursPerWeek / 40, 1.0)` —
    continuous, from an actual reported number — instead of guessing
    "Full-time vs Part-time" from free text. Seniority weight (intern
    → 0.8, Chief/Senior/General Manager → 1.2, else 1.0) still comes
    from Position Title, now a clean isolated field instead of embedded
    in a text blob.
  - `LargeCoMatch`: checks the isolated Employer field per experience
    entry against the LargeCo list — more precise than the old
    whole-blob substring search.
  - `UniRank`/`weightedEdScore`: same formulas as before, now against
    the single `institution`/`degreeType` fields. Degree multiplier:
    Bachelor's → 1.00; Master's/PhD/MD → 1.03; Associate's/High School
    Diploma/unclear → 0.97 (extending the existing convention to the
    new degree types this file introduced).
  - `MaxCa` recomputed fresh for this 198-candidate set: **414.7**.
- Role/skill keyword matching **re-run against the new Description
  text** (same 123 roles, 3,399 skills, threshold 88 — that library is
  untouched by this update): 32,712 skill-match rows, 4,462 role-match
  rows.

**Schema changes:** `Candidate.experience` (String[]) →
`Candidate.experiences` (Json); removed `university1/major1/university2/
major2`; added `degreeType`, `institution`, `educationTimePeriod`,
`educationDescription`, `skills` (String[]).

**This is a destructive replace, not additive** — the seed script now
wipes the entire `Candidate` table (cascading to skill/role matches)
before reinserting, rather than skipping existing rows. Re-seeding is
safe to run again, but know that it's a full replace every time now for
candidates specifically.

```bash
npm install
npx prisma db push
npm run prisma:seed
```

## Skills search (new)

A second, more specific sidebar filter alongside Search roles:

- **Search skills** — type-ahead over all 3,405 individual skills (one
  per row across every role's skill sheet), same fuzzy+exact matching
  technique as role search (`/api/skills`).
- **Fuzzy candidate matching** — unlike role-fit (which uses exact
  substring matching), skill-level matching uses real fuzzy matching
  (via `rapidfuzz`, computed offline): a candidate matches a skill if
  any of its keywords, or the skill name itself, either appears exactly
  in their experience text or scores ≥82 on `partial_ratio` similarity.
  That threshold was chosen empirically, not guessed — testing showed
  looser thresholds (60-75) caused 45-94% of all candidate/skill pairs
  to "match," which would make the filter meaningless; 82 sits right
  before that runaway effect, adding real recall over exact-only
  matching (36.6% vs 29.5% match rate in testing) without collapsing.
- **Multi-select, AND logic** — clicking multiple skills requires a
  candidate to match ALL of them (not any), same principle as the old
  retired skill-checkbox filter, but now skill-driven rather than
  role-scoped.
- **Ranking** — matched candidates are ranked by the SUM of
  `keywordCount` (distinct keywords + skill name that matched,
  regardless of repeats) across every selected skill. With one skill
  selected, this is just that skill's own count.
- **Precedence** — if both a role and one or more skills are selected,
  skills take over the matched/highlighted grouping (skills are the more
  specific filter); clearing all selected skills reverts to role-fit (if
  a role is still selected) or the plain weighted ranking.

This required reactivating `CandidateSkillMatch` (previously left
unseeded since nothing used it) with a new `keywordCount` field, and
giving `Skill` a deterministic `slug` (e.g.
`data-engineer--python-programming`) so the frontend has a stable
identifier independent of database-generated IDs — mirroring how `Role`
already worked.

**Performance note:** computing fuzzy matches for 551 candidates ×
3,405 skills (~1.9M candidate/skill pairs, each checking ~20 keywords)
was done once, offline, ahead of time — not something the app or the
seed script computes live. It produced 929,909 match rows
(`skill-matches.json`, ~45MB raw). Seeding this many rows takes longer
than everything else combined — expect `prisma:seed` to take several
minutes this time.

## Fuzzy search

Role search now uses Postgres's `pg_trgm` extension for typo-tolerant
matching (via `word_similarity()`), combined with the existing exact
substring match. Both name and keyword matching benefit — searching
"phyton" or "reactjs" will still surface roles whose name or keyword
library contains "Python" or "React". Similarity thresholds (0.25 for
role names, 0.3 for keywords) are set low deliberately: a false positive
(an occasionally irrelevant role showing up) is preferred over a false
negative (a real match getting missed).

`CREATE EXTENSION IF NOT EXISTS pg_trgm;` runs automatically at the start
of every seed, so no separate setup step is needed — just re-seed:
```bash
npm install
npm run prisma:seed
```

This is scoped to the search bar only. The underlying candidate-role
keyword matching pipeline (`role-matches.json`, powering the highlighting
on the Candidates page) still uses exact substring matching — that's a
separate, deliberate design choice, since it runs offline once at data-
prep time rather than live per keystroke. Let me know if you'd like fuzzy
matching applied there too.

## Keyword library update

The role/skill keyword library was replaced with a significantly expanded
version (3,405 skills, 64,123 keywords — up from 17,489). This powers two
things:

1. **Role search now genuinely searches keywords, not just role names.**
   Typing "Python" into "Search roles" now surfaces Data Engineer, Backend
   SWE, AI/ML Engineer, etc., via a real database query
   (`/api/roles?q=...`) that checks both the role name and every keyword
   under every skill for that role. If that request ever fails (e.g. the
   database is briefly unreachable), it falls back to a plain name-only
   filter over the static bundled role list, so search never comes up
   empty.
2. **Role-fit matching** (the highlighting/grouping on the Candidates
   page) was recomputed against all 551 candidates using the new,
   richer keyword set — 53,929 candidate-role match rows now, vs 3,248
   before.

**Note:** the skill-level match table (`CandidateSkillMatch`) is no
longer seeded by default. It's not queried by any current feature (the
skill-checkbox filter was retired earlier in favor of role-fit search),
and with the expanded keyword library it would balloon to 800,000+ rows
for zero functional benefit. The model and seed function are still in
`schema.prisma`/`seed.ts` if skill-level matching gets reactivated later
— just uncomment the `seedMatches()` call in `seed.ts`'s `main()`.

To pick this up:
```bash
npm install
npm run prisma:seed
```
(No schema changes, so no migration needed — just re-seed. Existing rows
are skipped via `skipDuplicates`.)

## Data updates

A second batch of 353 candidates (from a separate Google Form export) was
merged in on top of the original 198, bringing the total to **551**. Since
that source sheet was missing every derived scoring column, the following
was reconstructed and applied consistently with the original workbook's
formulas (confirmed by cross-checking the exact hidden formula text and
validating against the original 198 candidates' known-good values):

- **ExpTime** — the workbook's own duration-parsing formula depends on
  Google Sheets-only functions (`REGEXEXTRACT`, `TEXTBEFORE`) with no
  Excel or reliable outside-of-Sheets equivalent, so this was recomputed
  live in the original Google Sheet itself for all 551 candidates (not
  reimplemented externally) and imported directly.
- **UniRank / EdScore** — computed via the workbook's fixed-normalizer
  formula (`weightedEdScore = (7500 − UniRank) × multiplier / (7499 ×
  1.03) × 100`), which doesn't depend on the rest of the dataset.
- **Degree multiplier** — parsed from free-text major fields: Bachelor's
  → 1.00, Master's/PhD → 1.03, anything unclear (diplomas, certificates,
  non-English text, ~78 of 433 entries) → 0.97.
- **LargeCoMatch** — inferred as 2.0 if any LargeCo List company name
  appears in the candidate's experience text, else 1.0 (the original
  column had no live formula to reverse-engineer, only static values).
- **MaxCa / weightedCaScore / TotalScore** — recomputed across all 551
  together. In practice `MaxCa` stayed at 801 (no new candidate exceeded
  the existing maximum), so none of the original 198 candidates' scores
  actually changed — but the recompute did happen, per instruction.
- **Location** — left blank for all 353 new candidates; that source sheet
  didn't include one.

Skill/role keyword matching (`matches.json`, `role-matches.json`) was
re-run across the full 551-candidate set.

No schema changes were needed for this update — just re-seed:
```bash
npm run prisma:seed
```
(Existing rows are skipped via `skipDuplicates`, so this is safe to run
against an already-seeded database — it'll only insert what's missing.)

## Setup

This project now has its **own dedicated Postgres container** (via
`docker-compose.yml`), separate from any other project's database — no
more sharing a container or running manual `docker exec` commands.

**Windows PowerShell users:** the fastest path is the included setup
script, which starts the database, waits for it to be healthy, then runs
every step below in the correct order automatically:
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```
(The `-ExecutionPolicy Bypass` flag is needed because Windows blocks
running local `.ps1` scripts by default — this only affects this one
command, not your system-wide settings. Requires Docker Desktop to be
running first.)

Then run `npm run dev` to start the app.

---

Or run the steps manually:

1. Start the dedicated Postgres container:
   ```bash
   docker compose up -d
   ```
   This creates a container named `armarmhire-db-1`, listening on
   **port 5433** on your machine (not the default 5432 — deliberately
   different, so it won't conflict if you have another project's Postgres
   container also running on 5432). Data persists in a named Docker
   volume (`armarmhire_pgdata`) across restarts; `docker compose down -v`
   would wipe it if you ever want a completely clean slate. It also
   starts `armarmhire-mailpit-1`, the local test inbox for sign-up
   emails (http://localhost:8025).
2. Install dependencies:
   ```bash
   npm install
   ```
3. `.env` is already included in this zip, pointed at the container above
   (`postgresql://armarmhire_user:armarmhire_pass@localhost:5433/armarmhire`).
   No manual credential setup needed this time.
4. Sync the schema to the database, then seed the data:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```
   `db push` compares `schema.prisma` directly against your live database
   and creates/alters only what's actually different — no migration
   history required. This project doesn't ship a `prisma/migrations`
   folder (it's regenerated fresh with every update), so `db push` is the
   right tool here, not `migrate dev`/`migrate reset`. `db push` is safe
   to re-run any time — it only adds what's missing.
5. Run the dev server:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 (or whatever port it prints). You'll be
   asked to log in; choose **Sign up → Recruiter** to create an account
   and read the confirmation email at http://localhost:8025.

**If you were previously using the shared Hazard Tracker Postgres
container:** you can leave that one alone (or remove the `prohyre`
database from it later if you want to clean up) — this project no longer
touches it at all. This is a fresh, empty database, so the first
`db push` + `prisma:seed` here is effectively starting over, not
migrating old data.

## Project structure

```
app/
  page.tsx                       Redirects "/" -> "/candidates"
  layout.tsx                      Root layout, fonts
  globals.css
  candidates/page.tsx              All-candidates view
  candidates/[id]/page.tsx          Individual candidate detail page
  profile/page.tsx                  Employer profile form
  api/roles/route.ts                 (currently unused by the frontend — see lib/roles.ts)
  api/role-fit/route.ts               Returns role-fit matches + keyword counts for a role
components/
  RoleSearch.tsx                     Role search combobox (calls onSelectRole when provided)
  LocationFilter.tsx                  Location dropdown filter
  WeightSlider.tsx                    Education vs Experience slider + typed percentage inputs
  CandidatesBoard.tsx                   Owns weighting/location/role-fit state, live re-sorts
  CandidateResultsTable.tsx              Candidate card list; groups + highlights role matches
  ProfileForm.tsx                        Profile edit form (local state only)
lib/
  prisma.ts                           Prisma client singleton
  roles.ts / roles-data.json           Static 123-role list bundled into the frontend
prisma/
  schema.prisma                        Role, Candidate, Skill, CandidateSkillMatch,
                                        CandidateRoleMatch, LargeCo, University,
                                        EmployerProfile (stub)
  seed.ts                              Loads everything in prisma/data/
  data/                                 Extracted from the reference workbook, incl.
                                        role-matches.json (candidate/role keyword counts)
```

## Data model

- `Role` — one row per searchable role (123 total, from every workbook
  sheet starting at the 4th).
- `Candidate` — one row per candidate; all fields imported as-is from the
  workbook, including precomputed Ed/Career scores.
- `Skill` / `CandidateSkillMatch` — role-specific skills and precomputed
  keyword matches, used only by the role+skill-filtered view.
- `LargeCo` / `University` — reference lists, not wired into live matching
  yet (deferred, per earlier decision).
- `EmployerProfile` — stub only, unused until the profile page is
  connected to a backend.

## Design

Soft yellow + white throughout: warm off-white page background (`#FFFDF5`),
white cards, a single soft-yellow accent (`#E8B93F`) for buttons, links,
and avatars, with dark text (`#4A3B0A`) on filled yellow buttons for
readable contrast. One plain sans-serif (Inter) everywhere — no serif, no
mono, matching the earlier simplification.
