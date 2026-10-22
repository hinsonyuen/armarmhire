export type Role = {
  code: string;
  name: string;
  slug: string;
  category: string;
};

// Static list of the 123 searchable roles, one per sheet in DummyVar.xlsx
// starting from the 4th sheet. This lives in the frontend bundle directly
// (not fetched from the database) so the homepage search always works,
// independent of whether the database is set up or seeded.
import rolesData from "./roles-data.json";

export const roles: Role[] = rolesData;
