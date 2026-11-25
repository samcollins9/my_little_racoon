import type { SupabaseClient } from "@supabase/supabase-js";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";
import { addDays, isAfterToday, parseDatePageParam } from "./params";

/**
 * Sprint 47, R5: the date page's Previous day / Next day, one calendar day
 * either side. Pure date arithmetic, so it never needs the database and
 * always renders. It replaced Sprint 29's links between written readings,
 * which needed a database lookup per page; that SQL function stays in the
 * database, unused (Sprint 47, R7).
 *
 * - `previous` is null when the day before is outside the engine's range
 *   (on 1700-01-01, the first supported date).
 * - `next` is "future" when the day after is after today (on today's
 *   page): shown disabled, never linked (R1's rule). It's null only past
 *   the engine's last supported date, which today never reaches.
 */
export type DayNavigation = {
  previous: string | null;
  next: { kind: "link"; date: string } | { kind: "future" } | null;
};

export function dayNavigation(isoDate: string, now: Date = new Date()): DayNavigation {
  const dayAfter = addDays(isoDate, 1);
  return {
    previous: parseDatePageParam(addDays(isoDate, -1)),
    next: isAfterToday(dayAfter, now)
      ? { kind: "future" }
      : parseDatePageParam(dayAfter) === null
        ? null
        : { kind: "link", date: dayAfter },
  };
}

type RecentRow = { event_date: string };

/**
 * Sprint 47, R6, the pure half: one date for "Discover random reading",
 * from the recently written readings' dates, leaving out the page's own
 * date and anything after today. null when nothing is left. `random` is
 * injected (as pickTagline's is) so tests choose the pick.
 */
export function pickRandomReadingDate(
  rows: RecentRow[] | null,
  isoDate: string,
  random: () => number,
  now: Date = new Date()
): string | null {
  const pool = (rows ?? [])
    .map((row) => row.event_date)
    .filter((date) => date !== isoDate && !isAfterToday(date, now));
  if (pool.length === 0) return null;
  const value = random();
  const index = Number.isFinite(value)
    ? Math.min(pool.length - 1, Math.max(0, Math.floor(value * pool.length)))
    : 0;
  return pool[index];
}

/**
 * Sprint 47, R6: the random link's date, read-only, on the anon client.
 * get_recent_reading_dates returns up to 20 dates with a saved, displayed
 * horoscope (Sprint 29's SQL, kept in the database by Sprint 45).
 *
 * Classified as "dateLookup": the call takes no input, so nothing about a
 * request can make it fail, and any error is an outage. A failure is
 * logged in full (Sprint 25, R8) and gives null -- the page then leaves
 * the link out, with no notice of its own.
 */
export async function loadRandomReadingDate(
  anon: SupabaseClient,
  isoDate: string,
  where: string,
  random: () => number,
  now: Date = new Date()
): Promise<string | null> {
  const recent = await anon.rpc("get_recent_reading_dates");

  if (isDatabaseUnavailable("dateLookup", recent)) {
    logDatabaseUnavailable(`${where} (recent dates)`, recent);
    return null;
  }

  return pickRandomReadingDate(recent.data as RecentRow[] | null, isoDate, random, now);
}
