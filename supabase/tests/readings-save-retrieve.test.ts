import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anon, seed } from "./clients";

// Matches what the app itself does. Reads: the anon client, through
// get_reading_by_id (lib/supabase/anon-client.ts). Writes, since Sprint 28
// (R12): the service role, server-side (lib/supabase/admin.ts) -- anon can
// no longer insert, so the save here goes through `seed`, the same role the
// app's saveReading now uses. Nothing is ever read back through `seed`.

const FIXTURE_POSITIONS = [
  { body: "Sun", eclipticLongitude: 12.34, sign: "Aries", degreeInSign: 12.34, retrograde: false },
  { body: "Moon", eclipticLongitude: 200.5, sign: "Libra", degreeInSign: 20.5, retrograde: false },
];

describe("save and retrieve a reading (Sprint 10)", () => {
  it("round trip: retrieval reads back exactly what was saved, not a recomputation", async () => {
    const id = randomUUID();

    const { error: insertError } = await seed.from("readings").insert({
      id,
      event_date: "1999-08-11",
      positions: FIXTURE_POSITIONS,
    });
    expect(insertError).toBeNull();

    const { data, error } = await anon.rpc("get_reading_by_id", { reading_id: id });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].event_date).toBe("1999-08-11");
    // Fixture values are arbitrary, not what a real computation for this
    // date would produce -- matching exactly proves this is stored data,
    // not the ephemeris adapter running again on read.
    expect(data![0].positions).toEqual(FIXTURE_POSITIONS);
  });

  it("a random unguessed id returns not-found (empty result, not another reading)", async () => {
    const { data, error } = await anon.rpc("get_reading_by_id", {
      reading_id: randomUUID(),
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a save that violates a required column surfaces an error, not silent loss", async () => {
    const { error } = await seed.from("readings").insert({
      id: randomUUID(),
      // event_date omitted deliberately -- violates NOT NULL. The service
      // role bypasses RLS, not column constraints.
      positions: FIXTURE_POSITIONS,
    });
    expect(error).not.toBeNull();
  });
});
