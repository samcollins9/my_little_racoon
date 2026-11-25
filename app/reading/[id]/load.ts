import { cache } from "react";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "@/lib/supabase/availability";

export type StoredReading = {
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  horoscope: string | null;
};

export type ReadingLookup =
  | { kind: "found"; reading: StoredReading }
  | { kind: "notFound" }
  | { kind: "unavailable" };

/**
 * The reading behind /reading/[id], by id only, through the same
 * get_reading_by_id RPC the RLS policies were written around (Sprint 4) --
 * never a table select.
 *
 * Sprint 49, R3: wrapped in React's cache(), so the page and its
 * generateMetadata (which needs event_date for the title) share one
 * database round trip per request: whichever calls first runs the RPC, and
 * the other gets the same promise. cache() memoizes only within one server
 * request, so nothing is shared between visitors.
 *
 * Classification, unchanged from the page's own (Sprint 25, R3, amended
 * round 1): every RPC error except a malformed id (22P02) is "unavailable",
 * logged here once, in full. A 22P02 and an empty result are both
 * "notFound" -- the same silent 404, so a missing id and garbage stay
 * indistinguishable from outside (Sprint 10).
 */
export const loadReadingById = cache(async (id: string): Promise<ReadingLookup> => {
  const anon = createAnonClient();
  const { data, error, status } = await anon.rpc("get_reading_by_id", { reading_id: id });

  if (isDatabaseUnavailable("lookup", { error })) {
    logDatabaseUnavailable("ReadingPage", { error, status });
    return { kind: "unavailable" };
  }
  if (error || !data || data.length === 0) return { kind: "notFound" };
  return { kind: "found", reading: data[0] as StoredReading };
});
