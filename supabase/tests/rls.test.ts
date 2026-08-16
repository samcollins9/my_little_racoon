import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { resolvePublicConfig } from "../../lib/supabase/config";

// Plain anon client against a live Supabase stack -- local in CI (see
// .github/workflows/ci.yml's rls-tests job), local-with-Docker if you're
// running this yourself (`supabase start` first, then `npm run test:rls`).
// Every test here uses this client and only this client: using the
// service role key would bypass RLS and make the suite pass vacuously
// (R7), which is worse than no suite at all.
const { url, anonKey } = resolvePublicConfig();
const anon = createClient(url, anonKey);

function validReading(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    event_date: "1999-08-11",
    place_name: "Reykjavik, Iceland",
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: "Atlantic/Reykjavik",
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
    const { error } = await anon
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

  it("can insert a reading", async () => {
    const { error } = await anon.from("readings").insert(validReading());
    expect(error).toBeNull();
  });

  it("cannot update an existing reading", async () => {
    // No UPDATE policy exists for anon, so RLS filters the target row set
    // to nothing -- a successful zero-row update, not a thrown error.
    const { error } = await anon
      .from("readings")
      .update({ place_name: "tampered" })
      .eq("id", knownId);
    expect(error).toBeNull();

    const { data } = await anon.rpc("get_reading_by_id", { reading_id: knownId });
    expect(data?.[0].place_name).toBe("Reykjavik, Iceland");
  });

  it("cannot delete an existing reading", async () => {
    const { error } = await anon.from("readings").delete().eq("id", knownId);
    expect(error).toBeNull();

    const { data } = await anon.rpc("get_reading_by_id", { reading_id: knownId });
    expect(data).toHaveLength(1);
  });
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
