import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminConfig = {
  url: string;
  serviceRoleKey: string;
};

/**
 * Server-only credentials. Not wrapped in the `server-only` package here
 * because that would break importing this file from a plain Node test
 * runner (see admin.test.ts) -- the guarantee instead comes from this
 * module only ever being imported by app/api/health/db/route.ts, a Next.js
 * Route Handler, which is never bundled for the client. Do not import this
 * from a client component.
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
