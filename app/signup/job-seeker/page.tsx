"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { jobSeekerSkills } from "@/lib/jobSeekerSkills";
import { countries } from "@/lib/countriesList";
import { fieldsOfStudy } from "@/lib/fieldsOfStudyList";
import { institutions } from "@/lib/institutionsList";
import { metroAreas } from "@/lib/metroAreasList";

type ExperienceForm = {
  employer: string;
  positionTitle: string;
  location: string;
  hoursPerWeek: string;
  workMode: string;
  startDate: string;
  endDate: string;
  description: string;
};

type EducationForm = {
  degreeType: string;
  fieldOfStudy1: string;
  fieldOfStudy2: string;
  institution: string;
  startDate: string;
  endDate: string;
  description: string;
};

const emptyExperience = (): ExperienceForm => ({
  employer: "",
  positionTitle: "",
  location: "",
  hoursPerWeek: "",
  workMode: "",
  startDate: "",
  endDate: "",
  description: "",
});

const emptyEducation = (): EducationForm => ({
  degreeType: "",
  fieldOfStudy1: "",
  fieldOfStudy2: "",
  institution: "",
  startDate: "",
  endDate: "",
  description: "",
});

const MAX_EXPERIENCES = 5;
const MAX_EDUCATIONS = 2;

// Resume parsing only ever extracts month/year precision (e.g. "Jan
// 2021"), but the date-picker fields need a full day-precision
// YYYY-MM-DD value. This approximates to the 1st of the parsed month —
// an approximation, not a real known day, so it's worth knowing this is
// happening rather than assuming the exact day was detected.
function toISODateApprox(raw: string): string {
  if (!raw) return "";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("present") || lower.includes("current")) return "";

  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const monthYear = lower.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (monthYear) {
    const mm = monthMap[monthYear[1].slice(0, 3)];
    if (mm) return `${monthYear[2]}-${mm}-01`;
  }

  const slashDate = lower.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashDate) return `${slashDate[2]}-${slashDate[1].padStart(2, "0")}-01`;

  const yearOnly = lower.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;

  return "";
}

export default function JobSeekerSignupPage() {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [location, setLocation] = useState("");

  const [experiences, setExperiences] = useState<ExperienceForm[]>([
    emptyExperience(),
  ]);
  const [educations, setEducations] = useState<EducationForm[]>([
    emptyEducation(),
  ]);

  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [skillSearch, setSkillSearch] = useState("");
  const [otherSkills, setOtherSkills] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setParseNotice(null);

    try {
      const form = new FormData();
      form.set("resume", file);
      const res = await fetch("/api/resume-parse", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setParseError(
          data?.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ""}`
            : "Couldn't parse that resume."
        );
        return;
      }

      if (data.name) {
        setFirstName(data.name.first ?? "");
        setMiddleName(data.name.middle ?? "");
        setLastName(data.name.last ?? "");
      }
      if (data.email) setEmail(data.email);
      if (data.linkedin) setLinkedin(data.linkedin);
      if (data.location) setLocation(data.location);
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        setSelectedSkills(new Set(data.skills));
      }
      if (Array.isArray(data.experiences) && data.experiences.length > 0) {
        setExperiences(
          data.experiences.slice(0, MAX_EXPERIENCES).map(
            (e: {
              employer?: string;
              positionTitle?: string;
              startDate?: string;
              endDate?: string;
              description?: string;
            }) => ({
              ...emptyExperience(),
              employer: e.employer ?? "",
              positionTitle: e.positionTitle ?? "",
              startDate: toISODateApprox(e.startDate ?? ""),
              endDate: toISODateApprox(e.endDate ?? ""),
              description: e.description ?? "",
            })
          )
        );
      }
      if (Array.isArray(data.educations) && data.educations.length > 0) {
        setEducations(
          data.educations.slice(0, MAX_EDUCATIONS).map(
            (ed: { institution?: string; degreeType?: string | null }) => ({
              ...emptyEducation(),
              institution: ed.institution ?? "",
              degreeType: ed.degreeType ?? "",
            })
          )
        );
      }

      setParseNotice(
        "Parsed from your resume — please review every field below for accuracy before submitting. Heuristic parsing can miss things or get them wrong."
      );
    } catch (err) {
      console.error("Resume parse threw:", err);
      setParseError("Couldn't reach the server — check your connection.");
    } finally {
      setParsing(false);
    }
  }

  function updateExperience(i: number, patch: Partial<ExperienceForm>) {
    setExperiences((prev) =>
      prev.map((exp, idx) => (idx === i ? { ...exp, ...patch } : exp))
    );
  }

  function updateEducation(i: number, patch: Partial<EducationForm>) {
    setEducations((prev) =>
      prev.map((ed, idx) => (idx === i ? { ...ed, ...patch } : ed))
    );
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    // Not wired up yet — submitting doesn't create an account or store
    // anything for now.
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link
            href="/candidates"
            className="inline-flex items-center bg-brand px-3 py-1 text-xl font-extrabold tracking-tight text-white"
          >
            ArmArmHire
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-text-muted hover:text-text"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-text">
            Job Seeker Application
          </h1>
          <p className="text-sm text-text-muted">
            Share your professional background so we can match you with
            relevant opportunities.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shared suggestion list for per-experience Location fields —
              suggests major metro areas but never restricts input. */}
          <datalist id="metro-areas-list">
            {metroAreas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {/* Resume upload */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="mb-1 text-sm font-semibold text-text">
              Resume (PDF)
            </p>
            <p className="mb-3 text-xs text-text-muted">
              Upload your resume and we&rsquo;ll try to fill in the fields
              below automatically.
            </p>
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={parsing}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {parsing ? "Parsing…" : "Upload resume"}
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleResumeChange}
            />
            {parseNotice && (
              <p className="mt-3 rounded-lg bg-brand-light px-3 py-2 text-xs text-brand-ink">
                {parseNotice}
              </p>
            )}
            {parseError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {parseError}
              </p>
            )}
          </section>

          {/* Identity */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="text-sm font-semibold text-text">Your details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <LabeledInput
                label="First name"
                value={firstName}
                onChange={setFirstName}
                required
              />
              <LabeledInput
                label="Middle name"
                value={middleName}
                onChange={setMiddleName}
              />
              <LabeledInput
                label="Last name"
                value={lastName}
                onChange={setLastName}
                required
              />
            </div>
            <LabeledInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <LabeledInput
              label="LinkedIn"
              type="url"
              value={linkedin}
              onChange={setLinkedin}
              placeholder="https://www.linkedin.com/in/…"
              required
            />
            <LabeledSelect
              label="Location"
              value={location}
              onChange={setLocation}
              options={countries}
              required
            />
          </section>

          {/* Experience */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text">
                Work experience
              </p>
              <span className="text-xs text-text-faint">
                {experiences.length} / {MAX_EXPERIENCES}
              </span>
            </div>

            {experiences.map((exp, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                    Experience #{i + 1}
                  </p>
                  {experiences.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExperiences((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-xs font-semibold text-brand-ink hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <LabeledInput
                    label="Employer"
                    value={exp.employer}
                    onChange={(v) => updateExperience(i, { employer: v })}
                    required
                  />
                  <LabeledInput
                    label="Title / Position"
                    value={exp.positionTitle}
                    onChange={(v) => updateExperience(i, { positionTitle: v })}
                    required
                  />
                  <LabeledInput
                    label="Location"
                    value={exp.location}
                    onChange={(v) => updateExperience(i, { location: v })}
                    placeholder="City, State/Province, Country"
                    datalistId="metro-areas-list"
                  />
                  <LabeledInput
                    label="Approx. hours/week"
                    type="number"
                    value={exp.hoursPerWeek}
                    onChange={(v) => updateExperience(i, { hoursPerWeek: v })}
                    required
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text">
                      Work mode <span className="ml-1 text-brand">*</span>
                    </label>
                    <select
                      value={exp.workMode}
                      onChange={(e) =>
                        updateExperience(i, { workMode: e.target.value })
                      }
                      className="input cursor-pointer"
                    >
                      <option value="">Select…</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput
                      label="Start date"
                      type="date"
                      value={exp.startDate}
                      onChange={(v) => updateExperience(i, { startDate: v })}
                      required
                    />
                    <LabeledInput
                      label="End date"
                      type="date"
                      value={exp.endDate}
                      onChange={(v) => updateExperience(i, { endDate: v })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-text">
                    Description <span className="ml-1 text-brand">*</span>
                  </label>
                  <textarea
                    value={exp.description}
                    onChange={(e) =>
                      updateExperience(i, { description: e.target.value })
                    }
                    rows={3}
                    className="input"
                  />
                </div>
              </div>
            ))}

            {experiences.length < MAX_EXPERIENCES && (
              <button
                type="button"
                onClick={() =>
                  setExperiences((prev) => [...prev, emptyExperience()])
                }
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface"
              >
                + Add another experience
              </button>
            )}
          </section>

          {/* Education */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text">Education</p>
              <span className="text-xs text-text-faint">
                {educations.length} / {MAX_EDUCATIONS}
              </span>
            </div>

            {educations.map((ed, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                    Education #{i + 1}
                  </p>
                  {educations.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEducations((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-xs font-semibold text-brand-ink hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <LabeledInput
                    label="Degree type"
                    value={ed.degreeType}
                    onChange={(v) => updateEducation(i, { degreeType: v })}
                    placeholder="e.g. Bachelor's"
                    required
                  />
                  <LabeledSelect
                    label="Institution"
                    value={ed.institution}
                    onChange={(v) => updateEducation(i, { institution: v })}
                    options={institutions}
                    required
                  />
                  <LabeledSelect
                    label="Field of study #1"
                    value={ed.fieldOfStudy1}
                    onChange={(v) => updateEducation(i, { fieldOfStudy1: v })}
                    options={fieldsOfStudy}
                    required
                  />
                  <LabeledSelect
                    label="Field of study #2"
                    value={ed.fieldOfStudy2}
                    onChange={(v) => updateEducation(i, { fieldOfStudy2: v })}
                    options={fieldsOfStudy}
                  />
                  <LabeledInput
                    label="Start date"
                    type="date"
                    value={ed.startDate}
                    onChange={(v) => updateEducation(i, { startDate: v })}
                    required
                  />
                  <LabeledInput
                    label="End date (expected/completed)"
                    type="date"
                    value={ed.endDate}
                    onChange={(v) => updateEducation(i, { endDate: v })}
                    required={i === 0}
                  />
                </div>

                {/* Education Description only appears on the first entry —
                    matches the source form, which doesn't repeat it on
                    the second (added) education block. */}
                {i === 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text">
                      Education description{" "}
                      <span className="ml-1 text-brand">*</span>
                    </label>
                    <textarea
                      value={ed.description}
                      onChange={(e) =>
                        updateEducation(i, { description: e.target.value })
                      }
                      rows={3}
                      className="input"
                    />
                  </div>
                )}
              </div>
            ))}

            {educations.length < MAX_EDUCATIONS && (
              <button
                type="button"
                onClick={() => setEducations((prev) => [...prev, emptyEducation()])}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface"
              >
                + Add education
              </button>
            )}
          </section>

          {/* Skills */}
          <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-card">
            <div>
              <p className="text-sm font-semibold text-text">
                Skills <span className="ml-1 text-brand">*</span>
              </p>
              <p className="text-xs text-text-muted">
                Search and check all that apply.
              </p>
            </div>

            <input
              type="text"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Search skills…"
              className="input"
            />

            <div className="grid max-h-80 grid-cols-1 gap-x-4 gap-y-1.5 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
              {jobSeekerSkills
                .filter((skill) =>
                  skill.toLowerCase().includes(skillSearch.trim().toLowerCase())
                )
                .map((skill) => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 py-0.5 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.has(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="h-4 w-4 flex-none accent-brand"
                    />
                    <span className="truncate">{skill}</span>
                  </label>
                ))}
              {jobSeekerSkills.filter((skill) =>
                skill.toLowerCase().includes(skillSearch.trim().toLowerCase())
              ).length === 0 && (
                <p className="col-span-2 py-4 text-center text-sm text-text-muted">
                  No skills match “{skillSearch}”.
                </p>
              )}
            </div>

            {selectedSkills.size > 0 && (
              <p className="text-xs text-text-muted">
                {selectedSkills.size} selected
              </p>
            )}

            <LabeledInput
              label="Other skills not listed above"
              value={otherSkills}
              onChange={setOtherSkills}
              placeholder="Separate with commas"
            />
          </section>

          {/* Consent */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <label className="flex items-start gap-3 text-sm text-text">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 flex-none accent-brand"
              />
              <span>
                I have read the information above and agree to ArmArmHire
                collecting and using the information I provide to develop and
                test its candidate database and matching system. *
              </span>
            </label>
          </section>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Submit
            </button>
            {submitted && (
              <p className="text-sm text-text-muted">
                Not wired up yet — nothing was actually submitted or saved.
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  datalistId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  datalistId?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={datalistId}
        autoComplete="off"
        className="input"
      />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer"
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
