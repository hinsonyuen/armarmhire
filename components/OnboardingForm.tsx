"use client";

import { useMemo, useState } from "react";
import { roles } from "@/lib/roles";
import { countries } from "@/lib/countriesList";
import { metroAreas } from "@/lib/metroAreasList";
import {
  COMPANY_SIZES,
  HIRING_TIMELINES,
  INDUSTRIES,
  OPEN_POSITIONS,
  RECRUITER_TYPES,
} from "@/lib/recruiterOptions";
import { FormError } from "@/components/AuthShell";

type FieldErrors = Record<string, string>;

export default function OnboardingForm({ email }: { email: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [recruiterType, setRecruiterType] = useState<string>("in_house");
  const [agencyName, setAgencyName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [companyCity, setCompanyCity] = useState("");

  const [hiringRoles, setHiringRoles] = useState<string[]>([]);
  const [roleQuery, setRoleQuery] = useState("");
  const [hiringLocations, setHiringLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [openPositions, setOpenPositions] = useState("");
  const [hiringTimeline, setHiringTimeline] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isAgency = recruiterType === "agency";

  const roleMatches = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return [];
    return roles
      .filter((r) => !hiringRoles.includes(r.name))
      .filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .slice(0, 8);
  }, [roleQuery, hiringRoles]);

  function addLocation(value: string) {
    const v = value.trim();
    if (v && !hiringLocations.includes(v) && hiringLocations.length < 20) {
      setHiringLocations([...hiringLocations, v]);
    }
    setLocationInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/recruiter/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          jobTitle,
          phone,
          linkedin,
          recruiterType,
          agencyName,
          companyName,
          companyWebsite,
          companyIndustry,
          companySize,
          companyCountry,
          companyCity,
          hiringRoles,
          hiringLocations,
          openPositions,
          hiringTimeline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your profile.");
        setFieldErrors(data.fields ?? {});
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <datalist id="onboarding-metro-areas">
        {metroAreas.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* About you */}
      <Section title="About you">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ob-first-name" label="First name" required error={fieldErrors.firstName}>
            <input id="ob-first-name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
          </Field>
          <Field id="ob-last-name" label="Last name" required error={fieldErrors.lastName}>
            <input id="ob-last-name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
          </Field>
        </div>
        <Field id="ob-job-title" label="Job title" required error={fieldErrors.jobTitle}>
          <input id="ob-job-title"
            className="input"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Technical Recruiter"
            autoComplete="organization-title"
            required
          />
        </Field>
        <Field id="ob-email" label="Email">
          <input id="ob-email" className="input cursor-not-allowed text-text-muted" value={email} readOnly />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ob-phone" label="Phone" error={fieldErrors.phone}>
            <input id="ob-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
          <Field id="ob-linkedin" label="LinkedIn" error={fieldErrors.linkedin}>
            <input id="ob-linkedin"
              className="input"
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
            />
          </Field>
        </div>
      </Section>

      {/* Company */}
      <Section title="Who you're hiring for">
        <Field label="I am a…" required error={fieldErrors.recruiterType}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {RECRUITER_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer flex-col rounded-lg border px-4 py-3 transition-colors ${
                  recruiterType === t.value ? "border-brand bg-brand-light" : "border-border hover:border-brand"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  <input
                    type="radio"
                    name="recruiterType"
                    value={t.value}
                    checked={recruiterType === t.value}
                    onChange={() => setRecruiterType(t.value)}
                  />
                  {t.label} recruiter
                </span>
                <span className="ml-5 text-xs text-text-muted">{t.hint}</span>
              </label>
            ))}
          </div>
        </Field>

        {isAgency && (
          <Field id="ob-agency" label="Agency name" required error={fieldErrors.agencyName}>
            <input id="ob-agency" className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="ob-company"
            label={isAgency ? "Client company you're hiring for" : "Company name"}
            required
            error={fieldErrors.companyName}
          >
            <input id="ob-company"
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete={isAgency ? "off" : "organization"}
              required
            />
          </Field>
          <Field id="ob-website" label="Company website" error={fieldErrors.companyWebsite}>
            <input id="ob-website"
              className="input"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="company.com"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ob-industry" label="Industry" required error={fieldErrors.companyIndustry}>
            <Select id="ob-industry" value={companyIndustry} onChange={setCompanyIndustry} options={INDUSTRIES} />
          </Field>
          <Field id="ob-size" label="Company size (employees)" required error={fieldErrors.companySize}>
            <Select id="ob-size" value={companySize} onChange={setCompanySize} options={COMPANY_SIZES} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ob-country" label="Headquarters country" required error={fieldErrors.companyCountry}>
            <Select id="ob-country" value={companyCountry} onChange={setCompanyCountry} options={countries} />
          </Field>
          <Field id="ob-city" label="Headquarters city" error={fieldErrors.companyCity}>
            <input id="ob-city" className="input" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Hiring needs */}
      <Section
        title="What you're hiring for"
        hint="We use this to tailor your candidate search."
      >
        <Field id="ob-roles" label="Roles you hire for" required error={fieldErrors.hiringRoles}>
          <ChipList items={hiringRoles} onRemove={(r) => setHiringRoles(hiringRoles.filter((x) => x !== r))} />
          <div className="relative">
            <input
              id="ob-roles"
              className="input"
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder="Search roles, e.g. Data Engineer"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (roleMatches[0]) {
                    setHiringRoles([...hiringRoles, roleMatches[0].name]);
                    setRoleQuery("");
                  }
                }
              }}
            />
            {roleMatches.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-card">
                {roleMatches.map((r) => (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setHiringRoles([...hiringRoles, r.name]);
                        setRoleQuery("");
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-light"
                    >
                      <span className="text-text">{r.name}</span>
                      <span className="text-xs text-text-faint">{r.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field id="ob-locations" label="Where you're hiring" hint="Pick cities, or add “Remote”.">
          <ChipList
            items={hiringLocations}
            onRemove={(l) => setHiringLocations(hiringLocations.filter((x) => x !== l))}
          />
          <div className="flex gap-2">
            <input
              id="ob-locations"
              className="input"
              list="onboarding-metro-areas"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLocation(locationInput);
                }
              }}
              placeholder="e.g. San Francisco Bay Area"
            />
            <button
              type="button"
              onClick={() => addLocation(locationInput)}
              className="rounded-lg border border-border px-4 text-sm font-semibold text-text hover:bg-brand-light"
            >
              Add
            </button>
            {!hiringLocations.includes("Remote") && (
              <button
                type="button"
                onClick={() => addLocation("Remote")}
                className="rounded-lg border border-border px-4 text-sm font-semibold text-text hover:bg-brand-light"
              >
                Remote
              </button>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ob-open" label="Open positions" error={fieldErrors.openPositions}>
            <Select id="ob-open" value={openPositions} onChange={setOpenPositions} options={OPEN_POSITIONS} />
          </Field>
          <Field id="ob-timeline" label="When do you need to hire?" error={fieldErrors.hiringTimeline}>
            <Select id="ob-timeline" value={hiringTimeline} onChange={setHiringTimeline} options={HIRING_TIMELINES} />
          </Field>
        </div>
      </Section>

      <FormError message={error} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Finish and start searching"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Pass `id` (matching the control's id) to link the label to a single
// input/select; leave it out for groups like the radio cards.
function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const LabelTag = id ? "label" : "p";
  return (
    <div className="space-y-1.5">
      <LabelTag htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </LabelTag>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ChipList({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-light py-1 pl-3 pr-2 text-xs font-medium text-brand-ink"
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item}`}
            className="rounded-full px-1 text-text-muted hover:text-text"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
