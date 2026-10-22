"use client";

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Candidate results pages"
      className="flex items-center justify-end gap-1 pt-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        ‹
      </button>

      {pageNumbers(currentPage, totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-text-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-brand text-white"
                : "text-text-muted hover:bg-brand-light"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
