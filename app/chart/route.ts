import { NextResponse, type NextRequest } from "next/server";
import { chartRedirectTarget } from "./redirect-target";

/**
 * Sprint 31, R1: /chart is retired but old bookmarks and shared
 * /chart?date= links keep working. They are redirected, not given a 404.
 * The target is in redirect-target.ts.
 *
 * Always 307, never 308 or permanentRedirect(). This is Sprint 11's caching
 * reason: browsers and CDNs cache a 308 hard enough that it couldn't be
 * changed later. The status is passed explicitly rather than relying on
 * NextResponse.redirect's default.
 *
 * Route Handlers aren't cached by default (Next 16), and reading
 * request.url makes this one run per request anyway.
 */
export function GET(request: NextRequest) {
  const target = chartRedirectTarget(request.nextUrl.searchParams);
  return NextResponse.redirect(new URL(target, request.url), 307);
}
