"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { DateInputError, computePositions } from "@/lib/ephemeris/adapter";

export type SaveReadingState = {
  error: string | null;
};

/**
 * Sprint 13: the UI moved from URL-driven state (?date=, redirect-on-error)
 * to local React state (the design handoff's own model), so this takes
 * useActionState's (prevState, formData) shape and returns an error
 * instead of redirecting back to a page that no longer reads query
 * params for it. Saves are whatever instant is currently on screen
 * (including any scrub offset), not just the entered date at noon.
 *
 * R7: id generation stays server-side, deliberately deviating from the
 * handoff's client-generated-UUID proposal -- the handoff's own reasoning
 * (no SELECT policy to read a row back through) is correct, but this
 * action already satisfies it and keeps generation on the safer side of
 * the trust boundary.
 */
export async function saveReading(
  _prevState: SaveReadingState,
  formData: FormData
): Promise<SaveReadingState> {
  const instantParam = formData.get("instant");

  if (typeof instantParam !== "string" || !instantParam) {
    return { error: "Nothing to save yet." };
  }

  const instant = new Date(instantParam);
  if (Number.isNaN(instant.getTime())) {
    return { error: "Could not save that moment." };
  }

  let positions;
  try {
    positions = computePositions(instant);
  } catch (err) {
    const message = err instanceof DateInputError ? err.message : "Could not save that moment.";
    return { error: message };
  }

  // Generated here, not read back from the insert -- there is no SELECT
  // policy on readings (Sprint 4), so asking the insert to return its row
  // would come back empty even on success. The id has to be chosen before
  // the write, not learned from it. crypto.randomUUID() is a CSPRNG,
  // exactly as unguessable as the gen_random_uuid() default it stands in
  // for.
  const id = randomUUID();
  const anon = createAnonClient();
  const { error } = await anon.from("readings").insert({
    id,
    event_date: instant.toISOString().slice(0, 10),
    positions,
  });

  if (error) {
    return { error: "Save failed, try again." };
  }

  redirect(`/reading/${id}`);
}
