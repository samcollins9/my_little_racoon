import { datePagePath, parseDatePageParam } from "../../lib/date-page/params";

/**
 * Sprint 31, R1: where an old /chart link lands now that the page itself
 * is gone. Kept out of route.ts because a route file may only export HTTP
 * method handlers and segment config, and this is the part worth testing
 * on its own. Relative import, not "@/": vitest has no path alias here,
 * same reason as app/reading/[id]/display.ts.
 *
 * - Exactly one `date` value that parseDatePageParam accepts goes to that
 *   date's page. Validation is the date page's own, not a copy of it, so a
 *   date this sends to /date/<date> is a date that page renders.
 * - Anything else -- no `date`, an empty one, a malformed or out-of-range
 *   one, or the parameter repeated -- goes to `/`, which picks today per
 *   request (app/page.tsx). Today isn't computed here, so this target
 *   depends only on the query string and never goes stale at midnight.
 *
 * A repeated `date` counts as invalid rather than taking the first value,
 * matching /date?date=a&date=b, which Next hands to the date picker
 * target as an array and which parseDatePageParam rejects.
 */
export function chartRedirectTarget(searchParams: URLSearchParams): string {
  const values = searchParams.getAll("date");
  if (values.length !== 1) return "/";

  const isoDate = parseDatePageParam(values[0]);
  return isoDate ? datePagePath(isoDate) : "/";
}
