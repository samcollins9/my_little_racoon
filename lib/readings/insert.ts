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
 * Sprint 28: the one insert into `readings`, shared by /chart's saveReading
 * (Sprint 10) and the date page's cast action (R5), so the two can't drift
 * apart. It only writes; classifying a failure (lib/supabase/availability.ts)
 * and choosing the message stay with each caller, because each one reports
 * it on its own page.
 *
 * The id is generated here, not read back from the insert -- there is no
 * SELECT policy on readings (Sprint 4), so asking the insert to return its
 * row would come back empty even on success. The id has to be chosen before
 * the write, not learned from it. crypto.randomUUID() is a CSPRNG, exactly
 * as unguessable as the gen_random_uuid() default it stands in for.
 */
export async function insertReading(
  anon: SupabaseClient,
  reading: NewReading
): Promise<InsertReadingResult> {
  const id = randomUUID();
  const { error, status } = await anon.from("readings").insert({ id, ...reading });
  return error ? { ok: false, error, status } : { ok: true, id };
}
