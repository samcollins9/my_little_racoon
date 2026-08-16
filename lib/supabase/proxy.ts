import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePublicConfig } from "./config";

/**
 * Refreshes the auth session cookie on every matched request (see the root
 * proxy.ts matcher). getUser() is used rather than getSession()
 * deliberately: getSession() only decodes the cookie, getUser() revalidates
 * it against the Supabase Auth server, which is what actually detects an
 * expired or revoked session rather than trusting whatever the cookie says.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = resolvePublicConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
