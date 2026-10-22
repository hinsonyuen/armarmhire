"use client";

import { useEffect, useRef, useState } from "react";
import { skills as staticSkills, type Skill } from "@/lib/skills";

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function staticNameFilter(query: string): Skill[] {
  const q = query.trim().toLowerCase();
  return q
    ? staticSkills.filter((s) => s.name.toLowerCase().includes(q))
    : staticSkills;
}

export default function SkillSearch({
  selectedSlugs,
  onSelectSkill,
}: {
  selectedSlugs: string[];
  onSelectSkill: (skill: Skill) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Skill[]>(staticSkills);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (!cancelled) {
          setResults(data.skills?.length ? data.skills : staticNameFilter(query));
        }
      } catch {
        if (!cancelled) setResults(staticNameFilter(query));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectSkill(skill: Skill) {
    onSelectSkill(skill);
    // Dropdown stays open so multiple skills can be picked in a row.
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[activeIndex];
      if (chosen) selectSkill(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="skill-search" className="sr-only">
        Search skills
      </label>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-3 focus-within:border-brand focus-within:bg-card focus-within:shadow-card transition-colors cursor-text"
      >
        <span className="text-text-faint">
          <SearchIcon />
        </span>
        <input
          id="skill-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="skill-listbox"
          autoComplete="off"
          placeholder="Search skills — e.g. SQL, Figma, Kubernetes…"
          className="w-full bg-transparent text-[15px] text-text placeholder:text-text-faint outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <span className="flex-none text-xs text-text-faint">…</span>
        )}
      </div>

      {open && (
        <ul
          id="skill-listbox"
          role="listbox"
          className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-border bg-card py-2 shadow-card"
        >
          {results.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-text-muted">
              No skill or keyword matches “{query}”.
            </li>
          )}
          {results.map((skill, i) => {
            const isSelected = selectedSlugs.includes(skill.slug);
            return (
              <li
                key={skill.slug}
                role="option"
                aria-selected={isSelected}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectSkill(skill)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-brand-light" : ""
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-border text-transparent"
                    }`}
                  >
                    <CheckIcon />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[15px] font-medium text-text">
                      {skill.name}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {skill.roleName} · {skill.category}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
