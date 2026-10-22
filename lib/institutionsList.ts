import institutionsData from "./institutions.json";

// The same 1,501-institution QS list already used elsewhere in the app
// (University table / unirank.json) — bundled here too since it's
// static reference data, avoiding an extra network round-trip for a
// plain form dropdown.
export const institutions: string[] = institutionsData;
