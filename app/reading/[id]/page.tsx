import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";

type StoredReading = {
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  horoscope: string | null;
};

// Retrieval is by id only, through the same get_reading_by_id RPC the
// RLS policies were written around (Sprint 4) -- never a table select.
// Any error (including a malformed id -- Postgres rejects a non-uuid
// argument) or an empty result is treated identically as not-found. That
// uniformity is deliberate: a client asking for an id that doesn't exist
// and a client sending garbage should be indistinguishable from outside.
export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: generateError } = await searchParams;

  const anon = createAnonClient();
  const { data, error } = await anon.rpc("get_reading_by_id", { reading_id: id });

  if (error || !data || data.length === 0) {
    notFound();
  }

  // Read back exactly as stored (R6) -- not recomputed from the date.
  const reading = data[0] as StoredReading;

  return (
    <main>
      <h1>Reading for {reading.event_date}</h1>
      <table>
        <thead>
          <tr>
            <th>Body</th>
            <th>Sign</th>
            <th>Degree</th>
            <th>Retrograde</th>
          </tr>
        </thead>
        <tbody>
          {reading.positions.map((position) => (
            <tr key={position.body}>
              <td>{position.body}</td>
              <td>{position.sign}</td>
              <td>{position.degreeInSign.toFixed(2)}&deg;</td>
              <td>{position.retrograde ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sprint 17, R9: a minimal button sufficient to trigger and
          observe the path -- Sprint 18 replaces this with the designed
          display, including events (R9 of Sprint 16: no UI change there). */}
      {reading.horoscope ? <p>{reading.horoscope}</p> : null}

      {generateError ? <p role="alert">{generateError}</p> : null}

      {isHoroscopeEnabled() ? (
        <form action={generateReadingHoroscope}>
          <input type="hidden" name="readingId" value={id} />
          <button type="submit">
            {reading.horoscope ? "Regenerate horoscope" : "Generate horoscope"}
          </button>
        </form>
      ) : (
        <p>Horoscope generation is currently disabled.</p>
      )}
    </main>
  );
}
