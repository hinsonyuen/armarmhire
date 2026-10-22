// Unicode-safe initials extraction. Plain `name.charAt(0)` breaks on
// astral-plane characters (some emoji, rare CJK extensions) because it
// can grab only half of a surrogate pair, which can render inconsistently
// between server and client and trigger hydration mismatches. This
// iterates by code point and only considers actual letters.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  function firstLetter(word: string): string | undefined {
    for (const ch of Array.from(word)) {
      if (/\p{L}/u.test(ch)) return ch;
    }
    return undefined;
  }

  const first = firstLetter(parts[0]) ?? "";
  const last = parts.length > 1 ? firstLetter(parts[parts.length - 1]) ?? "" : "";
  const combined = (first + last).toUpperCase();
  return combined || "?";
}
