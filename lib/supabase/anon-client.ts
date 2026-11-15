import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicConfig } from "./config";

/**
 * Plain, stateless anon-key client -- no cookies, no session, no user
 * concept (Sprint 10, R2). Every *read* of readings goes through this and
 * is bound by RLS (no select policy; get_reading_by_id and
 * get_reading_by_date only). Since Sprint 28 (R12) anon can't write
 * readings at all -- writes use lib/supabase/admin.ts, server-side.
 */
export function createAnonClient(
  source: Record<string, string | undefined> = process.env
): SupabaseClient {
  const { url, anonKey } = resolvePublicConfig(source);
  return createClient(url, anonKey);
}
