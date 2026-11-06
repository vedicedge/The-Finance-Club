import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { schemaStatus, type SchemaStatus } from '@/lib/schema-version';

/** Asks the database which updates it has. A missing function means it is older than the check. */
export async function loadSchemaStatus(): Promise<SchemaStatus> {
  try {
    const { data, error } = await serviceDb().rpc('schema_version');
    return schemaStatus(error || typeof data !== 'string' ? null : data);
  } catch {
    return schemaStatus(null);
  }
}
