"use client";

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export default function WeightSlider({
  educationPct,
  onChange,
}: {
  educationPct: number;
  onChange: (pct: number) => void;
}) {
  const experiencePct = 100 - educationPct;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="mb-1 text-sm font-semibold text-text">Weighting</p>
      <p className="mb-4 text-xs text-text-muted">
        Adjust how much education vs. experience counts toward each
        candidate's score. Drag the slider or type exact percentages.
      </p>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={educationPct}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full accent-brand"
        aria-label="Education vs experience weighting"
        aria-valuetext={`${educationPct}% education, ${experiencePct}% experience`}
      />

      <div className="mt-2 flex items-center justify-between text-xs font-medium text-text-muted">
        <span className={experiencePct > educationPct ? "text-brand-dark" : undefined}>
          Experience
        </span>
        <span className={educationPct > experiencePct ? "text-brand-dark" : undefined}>
          Education
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={experiencePct}
            onChange={(e) => onChange(clamp(100 - Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-brand"
            aria-label="Experience percentage"
          />
          <span className="text-xs text-text-faint">%</span>
        </label>
        <span className="text-xs text-text-faint">/</span>
        <label className="flex flex-1 items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={educationPct}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-brand"
            aria-label="Education percentage"
          />
          <span className="text-xs text-text-faint">%</span>
        </label>
      </div>
    </div>
  );
}
