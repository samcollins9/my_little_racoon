export type PublicConfig = {
  url: string;
  anonKey: string;
};

/**
 * The anon key is public by design -- safe in a client bundle, RLS is what
 * actually protects data, not this key being secret. Shared by the
 * cookie-based server client and the middleware session refresh so both
 * fail the same way on missing configuration.
 */
export function resolvePublicConfig(
  source: Record<string, string | undefined> = process.env
): PublicConfig {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { url, anonKey };
}
