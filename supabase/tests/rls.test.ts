import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { anon, seed } from "./clients";

// Anon client against a live Supabase stack -- local in CI (see
// .github/workflows/ci.yml's rls-tests job), local-with-Docker if you're
// running this yourself (`supabase start` first, then `npm run test:rls`).
// Every assertion here runs on the anon client: using the service role key
// would bypass RLS and make the suite pass vacuously (R7), which is worse
// than no suite at all. Since Sprint 28 (R12) anon can't insert, so the
// fixture row is seeded with the service role (`seed`) -- and only seeded,
// never read back through it.

function validReading(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    event_date: "1999-08-11",
    positions: [
      { body: "Sun", eclipticLongitude: 12.34, sign: "Aries", degreeInSign: 12.34, retrograde: false },
    ],
    ...overrides,
  };
}

describe("readings RLS policies (anon client only)", () => {
  // INSERT ... RETURNING needs a SELECT policy to hand the new row back,
  // and there deliberately isn't one (see the migration's own comment).
  // So the id is generated here and inserted explicitly rather than read
  // back from the response -- which also means this is exactly how a real
  // client will eventually have to create a reading and learn its own
  // link's id in one step. Worth carrying into Sprint 10 as a known
  // consequence of this sprint's design, not rediscovering it there.
  let knownId: string;

  beforeAll(async () => {
    knownId = randomUUID();
    const { error } = await seed
      .from("readings")
      .insert(validReading({ id: knownId }));

    if (error) {
      throw new Error(`setup insert failed: ${error.message}`);
    }
  });

  it("cannot list readings", async () => {
    const { data, error } = await anon.from("readings").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("can retrieve a known id via get_reading_by_id", async () => {
    const { data, error } = await anon.rpc("get_reading_by_id", {
      reading_id: knownId,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(knownId);
  });

  it("a random unguessed id returns nothing", async () => {
    const { data, error } = await anon.rpc("get_reading_by_id", {
      reading_id: randomUUID(),
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // Sprint 28, R12: this was Sprint 4's "can insert a reading", and it is
  // deliberately inverted, not deleted. Date pages (decision a) put the
  // newest saved horoscope for a date on a public page, so an anon insert
  // became a front-page defacement path; the insert policy is dropped and
  // INSERT revoked from anon (migration 20261115212732). Every write now
  // happens server-side with the service role. 42501 is Postgres's
  // insufficient_privilege, passed through by PostgREST.
  it("cannot insert a reading (Sprint 4's insert test, inverted by Sprint 28 R12)", async () => {
    const id = randomUUID();
    const { error } = await anon.from("readings").insert(validReading({ id }));
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");

    const { data } = await anon.rpc("get_reading_by_id", { reading_id: id });
    expect(data).toEqual([]);
  });

  it("cannot update an existing reading", async () => {
    // No UPDATE policy exists for anon, so RLS filters the target row set
    // to nothing -- a successful zero-row update, not a thrown error.
    const { error } = await anon
      .from("readings")
      .update({ event_date: "2000-01-01" })
      .eq("id", knownId);
    expect(error).toBeNull();

    const { data } = await anon.rpc("get_reading_by_id", { reading_id: knownId });
    expect(data?.[0].event_date).toBe("1999-08-11");
  });

  it("cannot delete an existing reading", async () => {
    const { error } = await anon.from("readings").delete().eq("id", knownId);
    expect(error).toBeNull();

    const { data } = await anon.rpc("get_reading_by_id", { reading_id: knownId });
    expect(data).toHaveLength(1);
  });
});

describe("R12: anon has no write path to readings (Sprint 28)", () => {
  // Each test replays one of the three defacement routes from the R12
  // amendment, and checks it fails at the database -- not merely that the
  // app never makes the call.
  // Fixed dates in the 1700s: outside reading-by-date.test.ts's random
  // 1800-2099 range, so the two suites can't share a date. Nothing ever
  // successfully writes a horoscope for these, so re-runs stay clean.
  const horoscopeForDate = async (date: string) =>
    (await anon.rpc("get_reading_by_date", { reading_date: date })).data;

  it("route 1: an anon insert carrying its own horoscope and a future timestamp is denied", async () => {
    const date = "1750-03-14";
    const { error } = await anon.from("readings").insert(
      validReading({
        id: randomUUID(),
        event_date: date,
        horoscope: "DEFACED",
        horoscope_generated_at: "2999-01-01T00:00:00Z",
        horoscope_model: "attacker",
      })
    );
    expect(error?.code).toBe("42501");
    expect(await horoscopeForDate(date)).toEqual([]);
  });

  it("route 2: anon cannot call set_reading_horoscope, even on a real row's id", async () => {
    const date = "1750-03-15";
    const id = randomUUID();
    const seeded = await seed.from("readings").insert(validReading({ id, event_date: date }));
    expect(seeded.error).toBeNull();

    const { data, error } = await anon.rpc("set_reading_horoscope", {
      reading_id: id,
      horoscope: "DEFACED",
      model: "attacker",
    });
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();

    const stored = await anon.rpc("get_reading_by_id", { reading_id: id });
    expect(stored.data?.[0].horoscope).toBeNull();
    expect(await horoscopeForDate(date)).toEqual([]);
  });

  // Route 3 (fabricated events, then the app's genuine generate action)
  // needs an anon insert to plant the row first -- route 1's denial above
  // is what closes it at the database. The app side is traced statically
  // (every inserted value is server-computed; see lib/readings/insert.ts's
  // callers).
});

describe("row level security coverage (anon client only)", () => {
  // Queries the catalogue rather than a hardcoded table list, so it keeps
  // protecting tables that don't exist yet (R5) -- the whole reason this
  // test is worth more than the policies above it.
  it("every table in the public schema has RLS enabled", async () => {
    const { data, error } = await anon.rpc("tables_without_rls");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
