import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolvePublicConfig } from "./config";

/**
 * For Server Components, Server Actions, and Route Handlers. Reads and
 * writes the session via cookies, so callers see the signed-in user
 * without holding any session state client-side.
 *
 * Server Components can't set cookies -- Next.js only allows that from a
 * Server Action or Route Handler -- so setAll below is a no-op there. That's
 * fine: middleware.ts refreshes the session on every request, which is the
 * only place a session actually needs refreshing outside of sign-in/out
 * themselves calling this client directly.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = resolvePublicConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render; not settable there.
        }
      },
    },
  });
}
