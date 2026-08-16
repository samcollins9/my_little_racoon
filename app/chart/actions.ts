"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  DateInputError,
  calculationInstantForDate,
  computePositions,
} from "@/lib/ephemeris/adapter";

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
    event_date: dateParam,
    positions,
  });

  if (error) {
    redirect(
      `/chart?date=${encodeURIComponent(dateParam)}&error=${encodeURIComponent(
        "Save failed, try again."
      )}`
    );
  }

  redirect(`/reading/${id}`);
}
