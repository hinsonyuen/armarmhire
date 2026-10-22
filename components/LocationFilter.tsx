"use client";

const REMOTE = "remote";
const IN_PERSON = "in-person";

export default function LocationFilter({
  locations,
  selected,
  onChange,
  userLocation,
  onUserLocationChange,
}: {
  locations: string[];
  selected: string;
  onChange: (location: string) => void;
  userLocation: string;
  onUserLocationChange: (location: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="mb-1 text-sm font-semibold text-text">Location</p>
      <p className="mb-3 text-xs text-text-muted">
        Filter candidates by where they're based.
      </p>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer"
        aria-label="Filter by location"
      >
        <option value={REMOTE}>Remote (all candidates)</option>
        <option value={IN_PERSON}>In-person (near me)</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>

      {selected === IN_PERSON && (
        <div className="mt-3">
          <label
            htmlFor="user-location"
            className="mb-1 block text-xs font-medium text-text-muted"
          >
            Your location (this session only)
          </label>
          <input
            id="user-location"
            type="text"
            value={userLocation}
            onChange={(e) => onUserLocationChange(e.target.value)}
            placeholder="e.g. Hong Kong"
            className="input"
          />
          <p className="mt-1 text-xs text-text-faint">
            Not saved yet — this isn't connected to your Profile page's
            location. Matches candidates whose location contains this text.
          </p>
        </div>
      )}
    </div>
  );
}
