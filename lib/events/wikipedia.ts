import type { DateEvent } from "../chart/model";

/**
 * PRD v2 §3. This is the project's first outbound network call at runtime
 * (Sprint 16) -- everything else in lib/ is a pure computation. The
 * requirement that matters most is not the fetch, it's what happens when
 * the fetch fails: fetchDayEvents never throws (R6), so a Wikipedia outage
 * can never block saving a reading.
 */

export type WikipediaEventsPayload = {
  source: "wikipedia-onthisday";
  requestedDate: string; // ISO date, the reading's event_date
  matchedYear: boolean;
  fetchedAt: string; // ISO instant this was fetched
  events: DateEvent[];
};

// R7: explicit, not inherited from a default.
const FETCH_TIMEOUT_MS = 5000;

// PRD §3.2's "top 3-5" -- 5 chosen to maximise demo material, per the
// PRD's own reasoning that a fuller fallback is what makes the pipeline
// never show up empty.
const FALLBACK_EVENT_COUNT = 5;

// R1/R10: Wikimedia asks for a descriptive User-Agent identifying the
// application, not a default or absent one -- by project URL rather than a
// personal email, since the repository (and this string) is public.
const USER_AGENT = "RetroactiveHoroscope/1.0 (PoC; https://github.com/samcollins9/my_little_racoon)";

type RawSelectedEntry = {
  text: string;
  year: number;
  pages?: {
    content_urls?: {
      desktop?: {
        page?: string;
      };
    };
  }[];
};

type RawOnThisDayResponse = {
  selected?: RawSelectedEntry[];
};

// R4: cached by month/day, not by full date -- the response is identical
// for every reading of the same calendar day, across any year.
const entriesByMonthDay = new Map<string, RawSelectedEntry[]>();

async function fetchSelectedEntries(monthDay: string): Promise<RawSelectedEntry[]> {
  const cached = entriesByMonthDay.get(monthDay);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${monthDay}`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Wikipedia on-this-day returned ${response.status}`);
    }

    const body = (await response.json()) as RawOnThisDayResponse;

    // R11: an absent or non-array `selected` is an unexpected shape, not a
    // real "no events" answer -- treat it as a failure (thrown, so the
    // caller's catch returns null) and leave the cache unpopulated, rather
    // than caching an empty array that later reads as a successful lookup
    // with nothing found. A `selected` that genuinely is an array -- even
    // an empty one -- is a real answer and is cached as normal.
    if (!Array.isArray(body.selected)) {
      throw new Error("Wikipedia on-this-day response had no `selected` array");
    }

    const entries = body.selected;
    entriesByMonthDay.set(monthDay, entries);
    return entries;
  } finally {
    clearTimeout(timer);
  }
}

// R2: field access matches the shape confirmed live on 22 Aug 2026 --
// text, year, and pages[0].content_urls.desktop.page for sourceUrl. Any
// other field is invented, not confirmed.
function toDateEvent(entry: RawSelectedEntry): DateEvent {
  const sourceUrl = entry.pages?.[0]?.content_urls?.desktop?.page;
  return sourceUrl
    ? { year: entry.year, text: entry.text, sourceUrl }
    : { year: entry.year, text: entry.text };
}

/**
 * isoDate must already be a validated YYYY-MM-DD calendar date -- the same
 * precondition composeChart's date argument carries (lib/chart/model.ts).
 * Callers in this codebase only ever reach this after
 * calculationInstantForDate has already accepted the same string.
 *
 * Never throws (R6): any fetch failure, non-2xx response, timeout, or
 * unexpectedly-shaped response (R11) resolves to null rather than
 * propagating, so a Wikipedia outage can never block saving a reading.
 * Logs the reason before returning (R12).
 */
export async function fetchDayEvents(isoDate: string): Promise<WikipediaEventsPayload | null> {
  const [year, month, day] = isoDate.split("-");
  const monthDay = `${month}/${day}`;

  // The whole body is one try/catch, not just the fetch itself -- an
  // unexpected response shape should degrade the same way a network
  // failure does (R6), not throw past this function.
  try {
    const entries = await fetchSelectedEntries(monthDay);

    // R3: entries matching the reading's own year, per PRD §3.2. Falls
    // back to the top N unfiltered entries -- the common case, since any
    // given year contributes at most a couple of entries to a given day.
    const yearMatches = entries.filter((entry) => String(entry.year) === year);
    const matchedYear = yearMatches.length > 0;
    const selected = matchedYear ? yearMatches : entries.slice(0, FALLBACK_EVENT_COUNT);

    return {
      source: "wikipedia-onthisday",
      requestedDate: isoDate,
      matchedYear,
      fetchedAt: new Date().toISOString(),
      events: selected.map(toDateEvent),
    };
  } catch (err) {
    // R12: R6 still requires the swallow -- this is about leaving a trace
    // in Vercel's logs, so an outage is distinguishable from a date that
    // genuinely had no events, rather than silently indistinguishable.
    console.error("fetchDayEvents failed", err);
    return null;
  }
}
