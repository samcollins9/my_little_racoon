import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculationInstantForDate,
  computePositions,
  type PlanetPosition,
} from "../ephemeris/adapter";
import { hasMatchedEvents } from "../events/matched";
import { fetchDayEvents, type WikipediaEventsPayload } from "../events/wikipedia";
import type { StoredReadingForGeneration } from "../llm/generate";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";

export type SavedHoroscopeLookup =
  | { kind: "found"; reading: StoredReadingForGeneration }
  | { kind: "none" }
  | { kind: "unavailable" };

/**
 * R4: the newest saved horoscope for a date, through get_reading_by_date --
 * never a table select (the table has no select policy, and
 * lib/readings-access-guardrail.ts holds that line). Read-only.
 *
 * Sprint 39, R7: a horoscope saved beside events from other years (or with
 * no events at all) is never shown, so that row is reported as "none" and
 * the caller behaves as if nothing was saved. The filter lives here, not in
 * get_reading_by_date, deliberately: the function's row is also what
 * Sprint 30's navigation judges, and navigation is out of scope. The cost
 * is one rare case. If a date's newest horoscope is unmatched and an older
 * one is matched, this reports "none" rather than the older row.
 *
 * `isoDate` must already have passed parseDatePageParam; that's why the
 * "dateLookup" classification excepts no error code at all. An unavailable
 * result is logged in full here (Sprint 25, R8) so every caller gets the
 * same log line without repeating it.
 */
export async function lookupSavedHoroscope(
  anon: SupabaseClient,
  isoDate: string,
  where: string
): Promise<SavedHoroscopeLookup> {
  const { data, error, status } = await anon.rpc("get_reading_by_date", { reading_date: isoDate });

  if (isDatabaseUnavailable("dateLookup", { error })) {
    logDatabaseUnavailable(where, { error, status });
    return { kind: "unavailable" };
  }

  if (!data || data.length === 0) return { kind: "none" };
  const reading = data[0] as StoredReadingForGeneration;
  return hasMatchedEvents(reading.events) ? { kind: "found", reading } : { kind: "none" };
}

export type DatePageData = {
  eventDate: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  saved: SavedHoroscopeLookup;
};

type LoadDeps = {
  fetchEvents: (isoDate: string) => Promise<WikipediaEventsPayload | null>;
};

/**
 * Everything the date page's GET render needs, and nothing that writes
 * (R3). The only database call is lookupSavedHoroscope's RPC; there is no
 * insert, no set_reading_horoscope and no OpenAI client anywhere on this
 * path -- writing happens only in the cast action
 * (app/date/[date]/actions.ts).
 *
 * When a horoscope is saved, the page shows that row's own stored positions
 * and events, exactly as /reading/[id] does for its row, and Wikipedia
 * isn't called: R4 forbids re-fetched events next to an old horoscope.
 * Otherwise -- no saved horoscope, or the lookup is unavailable (R6) --
 * positions are computed from the date the way /chart does it and events
 * come from fetchDayEvents, which never throws (Sprint 16). Neither needs
 * the database, so an outage can't blank the page.
 */
export async function loadDatePage(
  anon: SupabaseClient,
  isoDate: string,
  { fetchEvents }: LoadDeps = { fetchEvents: fetchDayEvents }
): Promise<DatePageData> {
  const saved = await lookupSavedHoroscope(anon, isoDate, "DatePage");

  if (saved.kind === "found") {
    return {
      eventDate: saved.reading.event_date,
      positions: saved.reading.positions,
      events: saved.reading.events,
      saved,
    };
  }

  return {
    eventDate: isoDate,
    positions: computePositions(calculationInstantForDate(isoDate)),
    events: await fetchEvents(isoDate),
    saved,
  };
}
