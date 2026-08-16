import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicConfig } from "./config";

/**
 * Plain, stateless anon-key client -- no cookies, no session, no user
 * concept (Sprint 10, R2). Every read and write for readings goes through
 * this and is bound by Sprint 4's RLS policies; nothing in this feature
 * uses the service role key (R3).
 */
export function createAnonClient(
  source: Record<string, string | undefined> = process.env
): SupabaseClient {
  const { url, anonKey } = resolvePublicConfig(source);
  return createClient(url, anonKey);
}
