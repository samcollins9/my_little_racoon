"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DateInputError,
  calculationInstantForDate,
  computePositions,
} from "@/lib/ephemeris/adapter";
import { fetchDayEvents } from "@/lib/events/wikipedia";
import { insertReading } from "@/lib/readings/insert";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "@/lib/supabase/availability";

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

  // Sprint 28: the insert itself (and why the id is chosen before it) lives
  // in lib/readings/insert.ts, shared with the date page's cast action. R12:
  // written with the server-only admin client -- anon can no longer insert.
  // Every value is server-computed from the validated date: positions above,
  // events from fetchDayEvents. The date is the only form input that reaches
  // the row.
  const inserted = await insertReading(createAdminClient(), {
    event_date: dateParam,
    positions,
    events,
  });

  if (!inserted.ok) {
    const { error, status } = inserted;
    // R6 (Sprint 18, carried from Sprint 14): the user-facing message
    // stays generic, but the underlying reason -- a constraint violation,
    // a connection failure -- is otherwise invisible outside this process.
    // Sprint 25, R5: an outage is the one failure that gets its own message
    // -- "Save failed, try again." invited an immediate retry that can't
    // work and suggested the visitor had done something wrong. Every other
    // insert failure keeps the generic message. Either way the redirect
    // carries the date back, so the cast chart is still shown with it.
    // Amended round 1: "every other" now means only SQLSTATE class 22/23
    // (the data really was rejected); any other error, including one nobody
    // has recorded, counts as unavailable and is logged in full (R8).
    const unavailable = isDatabaseUnavailable("insert", { error });
    if (unavailable) {
      logDatabaseUnavailable("saveReading", { error, status });
    } else {
      console.error("saveReading: insert failed", error);
    }
    redirect(
      `/chart?date=${encodeURIComponent(dateParam)}&error=${encodeURIComponent(
        unavailable ? SAVE_UNAVAILABLE_MESSAGE : "Save failed, try again."
      )}`
    );
  }

  redirect(`/reading/${inserted.id}`);
}
