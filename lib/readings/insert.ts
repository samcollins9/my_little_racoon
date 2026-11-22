import { randomUUID } from "node:crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { PlanetPosition } from "../ephemeris/adapter";
import type { WikipediaEventsPayload } from "../events/wikipedia";

export type NewReading = {
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
};

export type InsertReadingResult =
  | { ok: true; id: string }
  | { ok: false; error: PostgrestError; status: number };

/**
 * Sprint 28: the one insert into `readings`. It was shared by the /chart
 * page's save action (Sprint 10) and the date page's cast action (R5) so the
 * two couldn't drift apart. Since Sprint 31 retired /chart, the date page's
 * cast (lib/date-page/cast.ts) is the only caller. It stays its own module
 * so the write lives in one place and is tested on its own. It only writes;
 * classifying a failure (lib/supabase/availability.ts) and choosing the
 * message stay with the caller, which reports it on its own page.
 *
 * R12: `writer` is the server-only admin client -- anon has no INSERT on
 * readings. The caller (a "use server" action) creates it; this module
 * doesn't import lib/supabase/admin.ts. Every field of `reading` is
 * server-computed from a validated date; no other form input reaches it.
 *
 * The id is generated here, not read back from the insert. Originally
 * (Sprint 10) because anon has no SELECT policy, so a returned row would
 * come back empty; since R12 the writer is the service role, which could
 * read it back, but R12d keeps the service role to writes only. Either way
 * the id is chosen before the write, not learned from it. crypto.randomUUID() is a CSPRNG, exactly
 * as unguessable as the gen_random_uuid() default it stands in for.
 */
export async function insertReading(
  writer: SupabaseClient,
  reading: NewReading
): Promise<InsertReadingResult> {
  const id = randomUUID();
  const { error, status } = await writer.from("readings").insert({ id, ...reading });
  return error ? { ok: false, error, status } : { ok: true, id };
}
