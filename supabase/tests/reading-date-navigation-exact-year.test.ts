import { randomInt, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anon, seed } from "./clients";

// Sprint 30, R1/R2/R5: the date navigation lists only dates whose
// DISPLAYED reading (the row get_reading_by_date returns) has events from
// the exact year, `events.matchedYear` being the JSON boolean true. Asserted
// through the anon client only; fixtures are seeded with the service role
// (Sprint 28, R12).
//
// Fixture dates use years 2200-2899, which no other suite uses (the others
// use 1800-2099, 3000+, 0001 and 9999), so no other row can sit between a
// cluster's dates. Small clusters use 2200-2799; the 88-day cap fixture
// gets 2800-2899 to itself. vitest.rls.config.ts runs suite files one at a time, so
// no other file writes horoscopes while the recency tests check order.

const FIXTURE_POSITIONS = [
  { body: "Sun", eclipticLongitude: 12.34, sign: "Aries", degreeInSign: 12.34, retrograde: false },
];
const DAY_MS = 86_400_000;

// The payload fetchDayEvents stores (lib/events/wikipedia.ts), with
// matchedYear set per case. `overrides` replaces fields wholesale, which
// is how the malformed cases (missing key, string "true") are built.
function eventsPayload(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    source: "wikipedia-onthisday",
    requestedDate: "fixture",
    fetchedAt: "2026-11-22T00:00:00.000Z",
    events: [{ year: 2000, text: "a fixture event" }],
    ...overrides,
  };
}

const EXACT_YEAR = eventsPayload({ matchedYear: true });
const OTHER_YEARS = eventsPayload({ matchedYear: false });
const MATCHED_YEAR_NULL = eventsPayload({ matchedYear: null });
const MATCHED_YEAR_STRING = eventsPayload({ matchedYear: "true" });
const MATCHED_YEAR_MISSING = eventsPayload({});

type Events = Record<string, unknown> | null;

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

function randomDateInYears(fromYear: number, toYear: number): string {
  const start = Date.UTC(fromYear, 0, 1);
  const span = Math.floor((Date.UTC(toYear, 0, 1) - start) / DAY_MS);
  return new Date(start + randomInt(0, span) * DAY_MS).toISOString().slice(0, 10);
}

// Insert, then set_reading_horoscope, exactly as a real cast does. That
// stamps horoscope_generated_at = now(), so awaiting casts in sequence
// makes each one the newest-written so far.
async function castOn(eventDate: string, events: Events): Promise<void> {
  const id = randomUUID();
  const inserted = await seed
    .from("readings")
    .insert({ id, event_date: eventDate, positions: FIXTURE_POSITIONS, events });
  if (inserted.error) throw new Error(`setup insert failed: ${inserted.error.message}`);
  const { data, error } = await seed.rpc("set_reading_horoscope", {
    reading_id: id,
    horoscope: "a fixture horoscope",
    model: "test-model",
  });
  if (error || !data) throw new Error(`setup set_reading_horoscope failed: ${error?.message}`);
}

async function recentDates(): Promise<string[]> {
  const { data, error } = await anon.rpc("get_recent_reading_dates");
  expect(error).toBeNull();
  return (data as { event_date: string }[]).map((row) => row.event_date);
}

async function adjacent(readingDate: string) {
  const { data, error } = await anon.rpc("get_adjacent_reading_dates", { reading_date: readingDate });
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  return data![0] as { previous_date: string | null; next_date: string | null };
}

/**
 * Seeds `date` between two qualifying neighbours, two days either side,
 * and casts `castDate` on it. Returns whether `date` was listed and
 * whether the neighbours saw it as adjacent, so each case asserts both
 * functions at once.
 */
async function navigationSees(castDate: (date: string) => Promise<void>) {
  const date = randomDateInYears(2200, 2790);
  const before = addDays(date, -2);
  const after = addDays(date, 2);
  await castOn(before, EXACT_YEAR);
  await castOn(after, EXACT_YEAR);
  await castDate(date);
  // Cast last, so it's the newest-written date: if it qualifies, it's
  // first in the recent list.
  const recent = await recentDates();
  return {
    date,
    listed: recent.includes(date),
    first: recent[0],
    previousOfAfter: (await adjacent(after)).previous_date,
    nextOfBefore: (await adjacent(before)).next_date,
    before,
    after,
  };
}

describe("a date qualifies only when its displayed reading has matchedYear: true (Sprint 30, R1)", () => {
  it("a date whose only reading has matchedYear: true is listed and is a neighbour", async () => {
    const seen = await navigationSees((date) => castOn(date, EXACT_YEAR));
    expect(seen.listed).toBe(true);
    expect(seen.first).toBe(seen.date);
    expect(seen.nextOfBefore).toBe(seen.date);
    expect(seen.previousOfAfter).toBe(seen.date);
  });

  for (const [name, events] of [
    ["matchedYear: false", OTHER_YEARS],
    ["null events", null],
    ["a missing matchedYear key", MATCHED_YEAR_MISSING],
    ['matchedYear as the string "true"', MATCHED_YEAR_STRING],
    ["matchedYear: null", MATCHED_YEAR_NULL],
  ] as const) {
    it(`${name} is excluded from the list and skipped by its neighbours`, async () => {
      const seen = await navigationSees((date) => castOn(date, events));
      expect(seen.listed).toBe(false);
      // Skipped over: each neighbour's adjacent date is the other one.
      expect(seen.nextOfBefore).toBe(seen.after);
      expect(seen.previousOfAfter).toBe(seen.before);
    });
  }

  it("the subtlety: an older matching reading plus a newer non-matching one is excluded", async () => {
    const seen = await navigationSees(async (date) => {
      await castOn(date, EXACT_YEAR);
      await castOn(date, OTHER_YEARS);
    });
    // The page shows the newer, other-years reading...
    const { data } = await anon.rpc("get_reading_by_date", { reading_date: seen.date });
    expect(data![0].events.matchedYear).toBe(false);
    // ...so the date isn't linked, even though an older row matched.
    expect(seen.listed).toBe(false);
    expect(seen.nextOfBefore).toBe(seen.after);
    expect(seen.previousOfAfter).toBe(seen.before);
  });

  it("the subtlety: an older non-matching reading plus a newer matching one is included", async () => {
    const seen = await navigationSees(async (date) => {
      await castOn(date, OTHER_YEARS);
      await castOn(date, EXACT_YEAR);
    });
    const { data } = await anon.rpc("get_reading_by_date", { reading_date: seen.date });
    expect(data![0].events.matchedYear).toBe(true);
    expect(seen.listed).toBe(true);
    expect(seen.first).toBe(seen.date);
    expect(seen.nextOfBefore).toBe(seen.date);
    expect(seen.previousOfAfter).toBe(seen.date);
  });

  it("a non-qualifying date's own page still renders its reading (R3: only the links filter)", async () => {
    const date = randomDateInYears(2200, 2790);
    await castOn(date, OTHER_YEARS);
    const { data, error } = await anon.rpc("get_reading_by_date", { reading_date: date });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].horoscope).toBe("a fixture horoscope");
    expect(await recentDates()).not.toContain(date);
  });
});

describe("cap and adjacency apply after the filter (Sprint 30, R2)", () => {
  it("the cap holds 20 qualifying dates when more than 20 qualify and newer ones don't", async () => {
    const base = randomDateInYears(2800, 2890);
    const qualifying: string[] = [];
    const excluded: string[] = [];
    // Interleaved: each qualifying cast is followed by a newer
    // non-qualifying one, so a cap applied before the filter would return
    // about 10 qualifying dates, not 20.
    for (let i = 0; i < 22; i++) {
      const good = addDays(base, i * 4);
      const bad = addDays(base, i * 4 + 1);
      await castOn(good, EXACT_YEAR);
      await castOn(bad, OTHER_YEARS);
      qualifying.push(good);
      excluded.push(bad);
    }

    const dates = await recentDates();
    expect(dates).toEqual(qualifying.slice(2).reverse());
    for (const bad of excluded) expect(dates).not.toContain(bad);
  });

  it("adjacency skips over several non-qualifying dates to the next qualifying one", async () => {
    const start = randomDateInYears(2200, 2790);
    const end = addDays(start, 8);
    await castOn(start, EXACT_YEAR);
    await castOn(addDays(start, 2), OTHER_YEARS);
    await castOn(addDays(start, 4), null);
    await castOn(addDays(start, 6), MATCHED_YEAR_STRING);
    await castOn(end, EXACT_YEAR);

    expect((await adjacent(start)).next_date).toBe(end);
    expect((await adjacent(end)).previous_date).toBe(start);
    // From inside the gap, too: a non-qualifying date's own neighbours are
    // the qualifying dates around it.
    expect(await adjacent(addDays(start, 4))).toEqual({ previous_date: start, next_date: end });
  });
});

describe("the R1 helpers are closed to anon (Sprint 30, R2)", () => {
  for (const helper of ["displayed_readings", "navigable_reading_dates"]) {
    it(`anon cannot execute ${helper}`, async () => {
      await castOn(randomDateInYears(2200, 2790), EXACT_YEAR);
      const { data, error } = await anon.rpc(helper);
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  }
});
