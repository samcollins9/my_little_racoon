"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  DateInputError,
  calculationInstantForDate,
  computePositions,
} from "@/lib/ephemeris/adapter";
import { fetchDayEvents } from "@/lib/events/wikipedia";
import { isDatabaseUnavailable } from "@/lib/supabase/availability";

const SAVE_UNAVAILABLE_MESSAGE =
  "Readings can't be saved right now because the service is unavailable. Try again in a few minutes.";

export async function saveReading(formData: FormData) {
  const dateParam = formData.get("date");

  if (typeof dateParam !== "string" || !dateParam) {
    redirect("/chart?error=Enter a date before saving.");
  }

  let positions;
  try {
    const instant = calculationInstantForDate(dateParam);
    positions = computePositions(instant);
  } catch (err) {
    const message = err instanceof DateInputError ? err.message : "Could not save that date.";
    redirect(`/chart?date=${encodeURIComponent(dateParam)}&error=${encodeURIComponent(message)}`);
  }

  // Sprint 16: the project's first outbound network call at runtime.
  // fetchDayEvents never throws -- a Wikipedia outage resolves to null
  // rather than blocking the save (R6), so it isn't wrapped in its own
  // try/catch here.
  const events = await fetchDayEvents(dateParam);

  // Generated here, not read back from the insert -- there is no SELECT
  // policy on readings (Sprint 4), so asking the insert to return its row
  // would come back empty even on success. The id has to be chosen before
  // the write, not learned from it. crypto.randomUUID() is a CSPRNG,
  // exactly as unguessable as the gen_random_uuid() default it stands in
  // for.
  const id = randomUUID();
  const anon = createAnonClient();
  const { error, status } = await anon.from("readings").insert({
    id,
    event_date: dateParam,
    positions,
    events,
  });

  if (error) {
    // R6 (Sprint 18, carried from Sprint 14): the user-facing message
    // stays generic, but the underlying reason -- a constraint violation,
    // a connection failure -- is otherwise invisible outside this process.
    // Sprint 25, R5: an outage is the one failure that gets its own message
    // -- "Save failed, try again." invited an immediate retry that can't
    // work and suggested the visitor had done something wrong. Every other
    // insert failure keeps the generic message. Either way the redirect
    // carries the date back, so the cast chart is still shown with it.
    const unavailable = isDatabaseUnavailable({ error, status });
    console.error(
      unavailable ? "saveReading: database unavailable" : "saveReading: insert failed",
      error
    );
    redirect(
      `/chart?date=${encodeURIComponent(dateParam)}&error=${encodeURIComponent(
        unavailable ? SAVE_UNAVAILABLE_MESSAGE : "Save failed, try again."
      )}`
    );
  }

  redirect(`/reading/${id}`);
}
