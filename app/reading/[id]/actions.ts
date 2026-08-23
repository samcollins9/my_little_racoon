"use server";

import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { generateAndPersistHoroscope, type StoredReadingForGeneration } from "@/lib/llm/generate";

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
  if (typeof readingId !== "string" || !readingId) {
    redirect("/chart");
  }

  const anon = createAnonClient();
  const { data, error } = await anon.rpc("get_reading_by_id", { reading_id: readingId });

  if (error || !data || data.length === 0) {
    redirect(`/reading/${readingId}?error=${encodeURIComponent("Could not load that reading.")}`);
  }

  const reading = data[0] as StoredReadingForGeneration;
  const result = await generateAndPersistHoroscope(anon, readingId, reading);

  if (!result.ok) {
    redirect(`/reading/${readingId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/reading/${readingId}`);
}
