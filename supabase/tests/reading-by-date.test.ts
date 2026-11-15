import { randomInt, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { resolvePublicConfig } from "../../lib/supabase/config";

// Sprint 28, R4/R10: get_reading_by_date, exercised through the anon client
// only -- the same client the date page uses. A service role key would
// bypass RLS and prove nothing about what anon can reach.
const { url, anonKey } = resolvePublicConfig();
const anon = createClient(url, anonKey);

const FIXTURE_POSITIONS = [
  { body: "Sun", eclipticLongitude: 12.34, sign: "Aries", degreeInSign: 12.34, retrograde: false },
];

// Each test gets its own date, so rows other tests (or earlier local runs
// against the same stack) wrote can't satisfy or spoil its assertions.
// 1800-2099 stays well inside the supported range and away from the
// 1999-08-11 fixture date the Sprint 4/10 suites use.
const usedDates = new Set<string>();
function freshDate(): string {
  for (;;) {
    const day = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 109_500) * 86_400_000);
    const iso = day.toISOString().slice(0, 10);
    if (iso !== "1999-08-11" && !usedDates.has(iso)) {
      usedDates.add(iso);
      return iso;
    }
  }
}

async function insertReading(eventDate: string): Promise<string> {
  const id = randomUUID();
  const { error } = await anon
    .from("readings")
    .insert({ id, event_date: eventDate, positions: FIXTURE_POSITIONS });
  if (error) throw new Error(`setup insert failed: ${error.message}`);
  return id;
}

async function setHoroscope(id: string, text: string): Promise<void> {
  const { data, error } = await anon.rpc("set_reading_horoscope", {
    reading_id: id,
    horoscope: text,
    model: "test-model",
  });
  if (error || !data) throw new Error(`setup set_reading_horoscope failed: ${error?.message}`);
}

describe("get_reading_by_date (Sprint 28, R4)", () => {
  it("returns exactly one row when several readings with a horoscope exist, and it is the newest", async () => {
    const date = freshDate();
    // Created in order first, second, third -- but horoscopes written
    // second, third, then FIRST, so the newest horoscope belongs to the
    // oldest row. Only ordering by horoscope_generated_at picks it.
    const first = await insertReading(date);
    const second = await insertReading(date);
    const third = await insertReading(date);
    await setHoroscope(second, "second's horoscope");
    await setHoroscope(third, "third's horoscope");
    await setHoroscope(first, "first's horoscope, written last");
    // A newer row with no horoscope must not be the one returned.
    await insertReading(date);

    const { data, error } = await anon.rpc("get_reading_by_date", { reading_date: date });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(first);
    expect(data![0].event_date).toBe(date);
    expect(data![0].horoscope).toBe("first's horoscope, written last");
    expect(data![0].positions).toEqual(FIXTURE_POSITIONS);
  });

  it("returns nothing for a date that only has readings without a horoscope", async () => {
    const date = freshDate();
    await insertReading(date);
    await insertReading(date);

    const { data, error } = await anon.rpc("get_reading_by_date", { reading_date: date });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns nothing for a date with no readings at all", async () => {
    const { data, error } = await anon.rpc("get_reading_by_date", { reading_date: freshDate() });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does not return a reading with a horoscope from a neighbouring date", async () => {
    const date = freshDate();
    const nextDay = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    usedDates.add(nextDay);
    await setHoroscope(await insertReading(nextDay), "the next day's horoscope");

    const { data, error } = await anon.rpc("get_reading_by_date", { reading_date: date });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon still cannot select from readings directly, even with rows that have horoscopes", async () => {
    const date = freshDate();
    await setHoroscope(await insertReading(date), "a horoscope that exists");

    const all = await anon.from("readings").select("*");
    expect(all.error).toBeNull();
    expect(all.data).toEqual([]);

    const byDate = await anon.from("readings").select("*").eq("event_date", date);
    expect(byDate.error).toBeNull();
    expect(byDate.data).toEqual([]);
  });
});
