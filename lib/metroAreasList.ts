import metroAreasData from "./metro-areas.json";

// ~200 major global metro areas — a mix of the world's largest
// population centers and recognized global business/employment hubs
// (since this is a jobs platform, not pure population ranking). Used as
// a <datalist> suggestion list for per-experience Location fields: it
// suggests options but never restricts input — typing anything not in
// this list is still accepted.
export const metroAreas: string[] = metroAreasData;
