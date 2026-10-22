"use client";

import { useEffect, useRef, useState } from "react";
import { roles as staticRoles, type Role } from "@/lib/roles";

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

function staticNameFilter(query: string): Role[] {
  const q = query.trim().toLowerCase();
  return q ? staticRoles.filter((r) => r.name.toLowerCase().includes(q)) : staticRoles;
}

export default function RoleSearch({
  onSelectRole,
}: {
  // When provided, selecting a role calls this instead of being a dead
  // link. Used by the Candidates page to filter/highlight in place.
  onSelectRole?: (role: Role) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Role[]>(staticRoles);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Searches both role names and the full keyword library (via the API,
  // backed by the database). Falls back to a plain name-only filter over
  // the static bundled list if the request fails, so the search bar
  // never comes up empty even if the database is briefly unavailable.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/roles?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (!cancelled) {
          setResults(data.roles?.length ? data.roles : staticNameFilter(query));
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

  function selectRole(role: Role) {
    setOpen(false);
    if (onSelectRole) {
      onSelectRole(role);
    }
    // Without a handler, this is a dead link — selection does nothing.
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
      if (chosen) selectRole(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="role-search" className="sr-only">
        Search roles
      </label>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-3 focus-within:border-brand focus-within:bg-card focus-within:shadow-card transition-colors cursor-text"
      >
        <span className="text-text-faint">
          <SearchIcon />
        </span>
        <input
          id="role-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="role-listbox"
          autoComplete="off"
          placeholder="Search roles or keywords — e.g. Python, Data Engineer…"
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
          id="role-listbox"
          role="listbox"
          className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-border bg-card py-2 shadow-card"
        >
          {results.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-text-muted">
              No role or keyword matches “{query}”.
            </li>
          )}
          {results.map((role, i) => (
            <li key={role.slug} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectRole(role)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? "bg-brand-light" : ""
                }`}
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-ink">
                  {role.name.charAt(0)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[15px] font-medium text-text">
                    {role.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {role.category}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
