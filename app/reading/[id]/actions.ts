"use server";

import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { composeChart, type ReadingModel } from "@/lib/chart/model";
import { generateAndPersistHoroscope } from "@/lib/llm/generate";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";

type StoredReading = {
  id: string;
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  horoscope: string | null;
};

/**
 * R7: explicit, not automatic -- this only ever runs from the button's
 * form submission, never from reading creation or from loading the page.
 *
 * Re-fetches the reading by id rather than trusting hidden form fields for
 * positions/events -- the only thing the form actually needs to carry is
 * the id, and generation always runs against the authoritative stored row.
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

  const reading = data[0] as StoredReading;
  const chart = composeChart(reading.event_date, reading.positions);
  const readingModel: ReadingModel = {
    id: reading.id,
    chart,
    events: reading.events?.events ?? [],
    horoscope: reading.horoscope,
  };

  const result = await generateAndPersistHoroscope(anon, readingId, readingModel);

  if (!result.ok) {
    redirect(`/reading/${readingId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/reading/${readingId}`);
}
