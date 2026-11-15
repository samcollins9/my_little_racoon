import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminConfig = {
  url: string;
  serviceRoleKey: string;
};

/**
 * Server-only credentials: the service role key bypasses RLS entirely. Not
 * wrapped in the `server-only` package here because that would break
 * importing this file from a plain Node test runner (see admin.test.ts) --
 * the guarantee instead comes from who imports it.
 *
 * Since Sprint 28 (R12) this module is imported only by:
 *   - app/api/health/db/route.ts, a Route Handler (the health check);
 *   - three "use server" files, for every write to readings:
 *     app/chart/actions.ts (saveReading's insert),
 *     app/date/[date]/actions.ts (the date page's cast: insert + horoscope),
 *     app/reading/[id]/actions.ts (the horoscope's set_reading_horoscope).
 * Neither kind is ever bundled for the client. lib/ modules that write
 * (lib/readings/insert.ts, lib/llm/generate.ts, lib/date-page/cast.ts) take
 * the client as a parameter instead of importing this, so the import list
 * above stays the whole list.
 *
 * Writes only (R12d): reads of readings stay on the anon client through
 * get_reading_by_id / get_reading_by_date, so RLS still governs what a page
 * can show. Never import this from a client component, or from a lib/
 * module a client component can reach.
 */
export function resolveAdminConfig(
  source: Record<string, string | undefined> = process.env
): AdminConfig {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return { url, serviceRoleKey };
}

export function createAdminClient(
  source: Record<string, string | undefined> = process.env
): SupabaseClient {
  const { url, serviceRoleKey } = resolveAdminConfig(source);
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
