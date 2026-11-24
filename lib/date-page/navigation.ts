import type { SupabaseClient } from "@supabase/supabase-js";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";

/**
 * Sprint 29, R2: the date page's Previous/Next reading links, as dates.
 * "unavailable" (R4) means the lookup failed; the page then omits
 * Previous/Next and adds no notice of its own, so a visitor sees Sprint
 * 28's R6 notice at most once.
 *
 * Sprint 45: the recent-readings list that used to travel with these is
 * gone; its replacement (notable-dates.ts) is static and needs no lookup.
 */
export type DateNavigation =
  | { kind: "available"; previous: string | null; next: string | null }
  | { kind: "unavailable" };

type AdjacentRow = { previous_date: string | null; next_date: string | null };

/**
 * The pure half of R2, unit tested on its own: the row
 * get_adjacent_reading_dates returns, shaped for the page. The function
 * always returns one row; an empty result is treated as "no neighbours"
 * rather than an error, since nothing about it means the database is down.
 */
export function shapeDateNavigation(adjacent: AdjacentRow[] | null): DateNavigation {
  const neighbours = adjacent?.[0];
  return {
    kind: "available",
    previous: neighbours?.previous_date ?? null,
    next: neighbours?.next_date ?? null,
  };
}

/**
 * R1/R4: the date-only adjacent lookup, read-only, on the anon client (R5:
 * no insert, no set_reading_horoscope, no admin client).
 *
 * `isoDate` must already have passed parseDatePageParam, which is why the
 * call is classified as "dateLookup", the operation that excepts no error
 * code: nothing about a validated date can make it fail, so any error is an
 * outage. A failure is logged in full (Sprint 25, R8).
 */
export async function loadDateNavigation(
  anon: SupabaseClient,
  isoDate: string,
  where: string
): Promise<DateNavigation> {
  const adjacent = await anon.rpc("get_adjacent_reading_dates", { reading_date: isoDate });

  if (isDatabaseUnavailable("dateLookup", adjacent)) {
    logDatabaseUnavailable(`${where} (adjacent dates)`, adjacent);
    return { kind: "unavailable" };
  }

  return shapeDateNavigation(adjacent.data);
}
