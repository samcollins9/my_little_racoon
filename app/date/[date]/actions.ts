"use server";

import { redirect } from "next/navigation";
import { castHoroscopeForDate } from "@/lib/date-page/cast";
import { datePagePath, parseDatePageParam } from "@/lib/date-page/params";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { withRevealed } from "@/app/reading/[id]/reveal";

/**
 * R5: "Write the horoscope" on the date page. The only way the date page
 * writes anything -- a form submission, never a render (R3). The logic
 * (disabled check before any insert, insert, generate, failure
 * classification) is castHoroscopeForDate, unit tested in lib/; this file
 * only validates the field and turns the result into a redirect.
 *
 * Always returns the visitor to the date page, never to /reading/[id]: on
 * success that page now finds the horoscope through R4's lookup; on failure
 * it shows the message, and the form offers "Try again". Sprint 33, R4: the
 * success redirect carries the landing-revealed parameter, so the new
 * horoscope arrives unfolded. That redirect target is the only change here.
 */
export async function castHoroscope(formData: FormData) {
  const isoDate = parseDatePageParam(formData.get("date"));
  if (!isoDate) {
    // Only reachable by a hand-built POST -- the form's hidden field is the
    // page's own validated date. Nothing has been written.
    redirect("/");
  }

  // R12: reads on anon (the R4 lookup), writes on the server-only admin
  // client. The validated date is the only form value that reaches a write.
  const result = await castHoroscopeForDate(
    { reader: createAnonClient(), writer: createAdminClient() },
    isoDate
  );

  redirect(
    result.ok
      ? withRevealed(datePagePath(isoDate))
      : `${datePagePath(isoDate)}?error=${encodeURIComponent(result.message)}`
  );
}
