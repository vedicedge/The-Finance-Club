/**
 * The database version this code needs: the file-name prefix of the newest migration in
 * supabase/migrations/. A unit test keeps the two in step. The newest migration also
 * defines public.schema_version() returning the same value.
 */
export const EXPECTED_SCHEMA = '20261115002800';

export type SchemaStatus = { ok: boolean; found: string | null; expected: string };

/** found = what the database reports (null if it predates the version check). */
export function schemaStatus(found: string | null): SchemaStatus {
  return { ok: found !== null && found >= EXPECTED_SCHEMA, found, expected: EXPECTED_SCHEMA };
}
