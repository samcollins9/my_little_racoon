import { randomInt, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anon, seed } from "./clients";

// Sprint 29, R1/R8: get_adjacent_reading_dates and get_recent_reading_dates,
// asserted through the anon client only, the client the date page reads
// with. Fixture rows are seeded with the service role (Sprint 28, R12),
// never read back through it.
//
// Both functions read the whole table, not one date, so other suites' rows
// can affect their answers. Two things keep these assertions exact:
//   - Fixture dates live in years no other suite uses (the other suites
//     pick 1800-2099). Adjacency clusters go in 3000-3899 and the recency
//     fixtures in 4000+, so no other row can sit between them. The edge
//     cases query 0001-01-02 and 9999-12-30, where nothing exists beyond.
//     The column has no range constraint; only the app limits dates to
//     1700-2100.
//   - vitest.rls.config.ts runs suite files one at a time, so no other
//     file writes a horoscope while the recency tests check order.

const FIXTURE_POSITIONS = [
  { body: "Sun", eclipticLongitude: 12.34, sign: "Aries", degreeInSign: 12.34, retrograde: false },
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

function randomDateInYears(fromYear: number, toYear: number): string {
  const start = Date.UTC(fromYear, 0, 1);
  const span = Math.floor((Date.UTC(toYear, 0, 1) - start) / DAY_MS);
  return new Date(start + randomInt(0, span) * DAY_MS).toISOString().slice(0, 10);
}

async function insertReading(eventDate: string): Promise<string> {
  const id = randomUUID();
  const { error } = await seed
    .from("readings")
    .insert({ id, event_date: eventDate, positions: FIXTURE_POSITIONS });
  if (error) throw new Error(`setup insert failed: ${error.message}`);
  return id;
}

// set_reading_horoscope stamps horoscope_generated_at = now(), exactly as a
// real cast does, so awaiting these in sequence gives increasing times.
async function setHoroscope(id: string, text = "a fixture horoscope"): Promise<void> {
  const { data, error } = await seed.rpc("set_reading_horoscope", {
    reading_id: id,
    horoscope: text,
    model: "test-model",
  });
  if (error || !data) throw new Error(`setup set_reading_horoscope failed: ${error?.message}`);
}

async function castOn(eventDate: string): Promise<void> {
  await setHoroscope(await insertReading(eventDate));
}

async function adjacent(readingDate: string) {
  const { data, error } = await anon.rpc("get_adjacent_reading_dates", { reading_date: readingDate });
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  return data![0] as Record<string, unknown>;
}

async function recent() {
  const { data, error } = await anon.rpc("get_recent_reading_dates");
  expect(error).toBeNull();
  return data as Record<string, unknown>[];
}

describe("get_adjacent_reading_dates (Sprint 29, R1a)", () => {
  // One cluster, laid out around B:
  //   B-10 horoscope · B-5 two readings with horoscopes · B-2 no horoscope
  //   B horoscope · B+3 no horoscope · B+7 two readings with horoscopes
  async function seedCluster() {
    const b = randomDateInYears(3000, 3900);
    await castOn(addDays(b, -10));
    await castOn(addDays(b, -5));
    await castOn(addDays(b, -5));
    await insertReading(addDays(b, -2));
    await castOn(b);
    await insertReading(addDays(b, 3));
    await castOn(addDays(b, 7));
    await castOn(addDays(b, 7));
    return b;
  }

  it("returns the nearest date with a horoscope on each side, skipping rows without one, even when a neighbour has several readings", async () => {
    const b = await seedCluster();
    expect(await adjacent(b)).toEqual({ previous_date: addDays(b, -5), next_date: addDays(b, 7) });
  });

  it("excludes the given date itself when it has a horoscope", async () => {
    const b = await seedCluster();
    // B-5 has two horoscopes of its own; neither side may be B-5.
    expect(await adjacent(addDays(b, -5))).toEqual({
      previous_date: addDays(b, -10),
      next_date: b,
    });
  });

  it("excludes the given date itself when it has only a reading without a horoscope", async () => {
    const b = await seedCluster();
    expect(await adjacent(addDays(b, 3))).toEqual({ previous_date: b, next_date: addDays(b, 7) });
  });

  it("returns null on each side at the edges", async () => {
    // Nothing exists before 0001-01-02 or after 9999-12-30. Seeding one
    // horoscope just inside each edge gives each query a real neighbour on
    // the other side, so it's a single null rather than "no data at all".
    await castOn("0001-01-03");
    await castOn("9999-12-29");

    expect(await adjacent("0001-01-02")).toMatchObject({ previous_date: null });
    expect((await adjacent("0001-01-02")).next_date).toEqual("0001-01-03");

    expect(await adjacent("9999-12-30")).toMatchObject({ next_date: null });
    expect((await adjacent("9999-12-30")).previous_date).toEqual("9999-12-29");
  });

  it("the result shape is two dates and nothing else", async () => {
    const b = await seedCluster();
    const row = await adjacent(b);
    expect(Object.keys(row).sort()).toEqual(["next_date", "previous_date"]);
    for (const value of Object.values(row)) {
      expect(value === null || (typeof value === "string" && ISO_DATE.test(value))).toBe(true);
    }
  });
});

describe("get_recent_reading_dates (Sprint 29, R1b)", () => {
  it("returns at most 20 dates even when more than 20 exist, newest generation first", async () => {
    const base = randomDateInYears(4000, 4900);
    const seeded: string[] = [];
    for (let i = 0; i < 22; i++) {
      const date = addDays(base, i * 3);
      await castOn(date);
      seeded.push(date);
    }

    const dates = (await recent()).map((row) => row.event_date);
    expect(dates).toHaveLength(20);
    // The 20 most recently written, newest first: exactly the last 20
    // seeded, reversed. The first two seeded are pushed out by the cap.
    expect(dates).toEqual(seeded.slice(2).reverse());
  });

  it("lists a date with several readings once, ranked by its newest horoscope", async () => {
    const a = randomDateInYears(5000, 5900);
    const b = addDays(a, 1);
    await castOn(a);
    await castOn(b);
    // A second reading on A, written after B's: A moves back above B, and
    // still appears only once.
    await castOn(a);

    const dates = (await recent()).map((row) => row.event_date);
    expect(dates.slice(0, 2)).toEqual([a, b]);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("ignores rows without a horoscope, even the newest-created ones", async () => {
    const written = randomDateInYears(6000, 6900);
    const unwritten = addDays(written, 1);
    await castOn(written);
    await insertReading(unwritten);

    const dates = (await recent()).map((row) => row.event_date);
    expect(dates[0]).toBe(written);
    expect(dates).not.toContain(unwritten);
  });

  it("a horoscope with no generation time doesn't outrank dated ones (nulls last)", async () => {
    const undated = randomDateInYears(7000, 7900);
    const { error } = await seed.from("readings").insert({
      id: randomUUID(),
      event_date: undated,
      positions: FIXTURE_POSITIONS,
      horoscope: "set with no timestamp",
    });
    if (error) throw new Error(`setup insert failed: ${error.message}`);
    const dated = addDays(undated, 1);
    await castOn(dated);

    // By now this file has written well over 20 dated horoscopes, so a
    // full list with the undated one sorted last means it isn't in it.
    const dates = (await recent()).map((row) => row.event_date);
    expect(dates).toHaveLength(20);
    expect(dates[0]).toBe(dated);
    expect(dates).not.toContain(undated);
  });

  it("takes no limit argument, so no caller can raise the cap", async () => {
    const { data, error } = await anon.rpc("get_recent_reading_dates", { limit: 100 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("the result shape is one date per row and nothing else", async () => {
    await castOn(randomDateInYears(8000, 8900));
    const rows = await recent();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(["event_date"]);
      expect(row.event_date).toMatch(ISO_DATE);
    }
  });
});

describe("the table itself is still closed to anon (Sprint 4, Sprint 28 R12)", () => {
  it("anon still cannot select readings directly, with horoscopes in the table", async () => {
    await castOn(randomDateInYears(3000, 3900));
    const { data, error } = await anon.from("readings").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon still cannot insert a reading", async () => {
    const { error } = await anon
      .from("readings")
      .insert({ id: randomUUID(), event_date: "3500-01-01", positions: FIXTURE_POSITIONS });
    expect(error).not.toBeNull();
  });
});
