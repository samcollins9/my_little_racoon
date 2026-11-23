"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  DatabaseUnavailableError,
  isDatabaseUnavailable,
  logDatabaseUnavailable,
} from "@/lib/supabase/availability";
import { generateAndPersistHoroscope, type StoredReadingForGeneration } from "@/lib/llm/generate";
import { withRevealed } from "./reveal";

/**
 * R7: explicit, not automatic -- this only ever runs from the button's
 * form submission, never from reading creation or from loading the page.
 *
 * Re-fetches the reading by id rather than trusting hidden form fields for
 * positions/events -- the only thing the form actually needs to carry is
 * the id, and generation always runs against the authoritative stored row.
 * Building the ReadingModel (including the prompt-accurate aspect
 * recomputation) happens inside generateAndPersistHoroscope, not here, so
 * it stays covered by lib/llm/generate.test.ts rather than living
 * untested in this "use server" file.
 */
export async function generateReadingHoroscope(formData: FormData) {
  const readingId = formData.get("readingId");
  // Sprint 31, R3: with no id there is no reading to go back to, so this
  // goes to the front door (today's date page) rather than the retired
  // /chart.
  if (typeof readingId !== "string" || !readingId) {
    redirect("/");
  }

  const anon = createAnonClient();
  const { data, error, status } = await anon.rpc("get_reading_by_id", { reading_id: readingId });

  // Sprint 25, R7: redirecting back to /reading/[id] here used to land the
  // visitor on a page that then reported the reading as missing. Throwing
  // instead renders the route's error boundary -- R3's unavailable state --
  // directly, without depending on the database still being down when a
  // redirect reloads the page.
  // Amended round 1: same lookup rule as page.tsx -- only a 22P02 or an
  // empty result falls through to the not-found redirect below.
  if (isDatabaseUnavailable("lookup", { error })) {
    logDatabaseUnavailable("generateReadingHoroscope (load)", { error, status });
    throw new DatabaseUnavailableError();
  }

  if (error || !data || data.length === 0) {
    redirect(`/reading/${readingId}?error=${encodeURIComponent("Could not load that reading.")}`);
  }

  // Sprint 28, R12: the read above stays on anon (get_reading_by_id); only
  // the write goes through the server-only admin client, because anon can no
  // longer execute set_reading_horoscope. The only form value used is the
  // id -- positions and events come from the stored row, and since R12 every
  // stored row was itself written server-side.
  const reading = data[0] as StoredReadingForGeneration;
  const result = await generateAndPersistHoroscope(createAdminClient(), readingId, reading);

  if (!result.ok) {
    redirect(`/reading/${readingId}?error=${encodeURIComponent(result.error)}`);
  }

  // Sprint 33, R4: land with the new horoscope unfolded. Only the redirect
  // target changed; see ./reveal.ts.
  redirect(withRevealed(`/reading/${readingId}`));
}
