import type { SupabaseClient } from "@supabase/supabase-js";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";

/** One entry of the R3 recent list. The current page's own date is marked, never linked. */
export type RecentReadingDate = { isoDate: string; isCurrent: boolean };

/**
 * Sprint 29, R2/R3: everything the date page's navigation shows, all
 * dates. "unavailable" (R4) means at least one lookup failed; the page
 * then omits the navigation entirely and adds no notice of its own, so a
 * visitor sees Sprint 28's R6 notice at most once.
 */
export type DateNavigation =
  | {
      kind: "available";
      previous: string | null;
      next: string | null;
      recent: RecentReadingDate[];
    }
  | { kind: "unavailable" };

type AdjacentRow = { previous_date: string | null; next_date: string | null };
type RecentRow = { event_date: string };

/**
 * Sprint 32, R1: ascending by the date itself. `event_date` is a Postgres
 * `date`, which PostgREST serialises as zero-padded `YYYY-MM-DD`, so plain
 * code-unit comparison of the ISO string is chronological order. Never sort
 * on the formatted long-date label ("11 November 2012"), which would be
 * alphabetical, and never with localeCompare, whose collation is
 * locale-dependent.
 */
function byIsoDateAscending(a: RecentRow, b: RecentRow): number {
  if (a.event_date < b.event_date) return -1;
  if (a.event_date > b.event_date) return 1;
  return 0;
}

/**
 * The pure half of R2/R3, unit tested on its own: the rows the two R1
 * functions return, shaped for the page. get_adjacent_reading_dates
 * always returns one row; an empty result is treated as "no neighbours"
 * rather than an error, since nothing about it means the database is
 * down.
 *
 * Sprint 32: get_recent_reading_dates still chooses which dates appear
 * (the most recently written, capped in SQL); this only reorders that
 * already-capped set for display, oldest date first. It sorts a copy, so
 * the caller's rows are never mutated.
 */
export function shapeDateNavigation(
  isoDate: string,
  adjacent: AdjacentRow[] | null,
  recent: RecentRow[] | null
): DateNavigation {
  const neighbours = adjacent?.[0];
  return {
    kind: "available",
    previous: neighbours?.previous_date ?? null,
    next: neighbours?.next_date ?? null,
    recent: [...(recent ?? [])].sort(byIsoDateAscending).map(({ event_date }) => ({
      isoDate: event_date,
      isCurrent: event_date === isoDate,
    })),
  };
}

/**
 * R1/R4: both date-only lookups, in parallel, read-only, on the anon
 * client (R5: no insert, no set_reading_horoscope, no admin client).
 *
 * `isoDate` must already have passed parseDatePageParam, which is why both
 * calls are classified as "dateLookup", the operation that excepts no
 * error code: nothing about a validated date can make these fail, so any
 * error is an outage. Each failing call is logged in full (Sprint 25, R8)
 * under its own label, so a log shows which one failed.
 */
export async function loadDateNavigation(
  anon: SupabaseClient,
  isoDate: string,
  where: string
): Promise<DateNavigation> {
  const [adjacent, recent] = await Promise.all([
    anon.rpc("get_adjacent_reading_dates", { reading_date: isoDate }),
    anon.rpc("get_recent_reading_dates"),
  ]);

  let unavailable = false;
  if (isDatabaseUnavailable("dateLookup", adjacent)) {
    logDatabaseUnavailable(`${where} (adjacent dates)`, adjacent);
    unavailable = true;
  }
  if (isDatabaseUnavailable("dateLookup", recent)) {
    logDatabaseUnavailable(`${where} (recent dates)`, recent);
    unavailable = true;
  }
  if (unavailable) return { kind: "unavailable" };

  return shapeDateNavigation(isoDate, adjacent.data, recent.data);
}
