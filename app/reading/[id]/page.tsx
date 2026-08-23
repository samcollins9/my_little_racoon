import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { composeChart } from "@/lib/chart/model";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";
import { eventsLabel, horoscopeParagraphs, isSafeExternalUrl } from "./display";

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

  // R1: the chart from composeChart, not just the raw positions column --
  // this is where Sprint 12's aspect engine, sitting tested and unused
  // since Sprint 14's revert, finally gets a caller. The aspects table
  // below deliberately omits applying/separating: composeChart's own
  // aspects have that structurally false (Sprint 15's R4; see
  // lib/chart/model.ts), and this page has no reason to recompute a real
  // second snapshot the way lib/llm/generate.ts's prompt path does --
  // showing nothing is safer than showing a label that might be wrong.
  const chart = composeChart(reading.event_date, reading.positions);
  const paragraphs = horoscopeParagraphs(reading.horoscope);

  return (
    <main>
      <h1>Reading for {reading.event_date}</h1>

      <section>
        <h2>Positions</h2>
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
            {chart.positions.map((position) => (
              <tr key={position.body}>
                <td>{position.body}</td>
                <td>{position.sign}</td>
                <td>{position.degreeInSign.toFixed(2)}&deg;</td>
                <td>{position.retrograde ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Aspects</h2>
        {chart.aspects.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Body</th>
                <th>Aspect</th>
                <th>Body</th>
                <th>Orb</th>
              </tr>
            </thead>
            <tbody>
              {chart.aspects.map((aspect) => (
                <tr key={`${aspect.bodyA}-${aspect.aspect}-${aspect.bodyB}`}>
                  <td>{aspect.bodyA}</td>
                  <td>{aspect.aspect}</td>
                  <td>{aspect.bodyB}</td>
                  <td>{aspect.orb.toFixed(2)}&deg;</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No aspects within orb.</p>
        )}
      </section>

      <section>
        <h2>Balance</h2>
        <p>
          Elements — Fire {chart.elements.Fire}, Earth {chart.elements.Earth}, Air{" "}
          {chart.elements.Air}, Water {chart.elements.Water}
        </p>
        <p>
          Modalities — Cardinal {chart.modalities.Cardinal}, Fixed {chart.modalities.Fixed},
          Mutable {chart.modalities.Mutable}
        </p>
        <p>Moon phase — {chart.moonPhase.phaseName}</p>
      </section>

      <section>
        <h2>Events</h2>
        <p>{eventsLabel(reading.events)}</p>
        {reading.events && reading.events.events.length > 0 ? (
          <ul>
            {reading.events.events.map((event, i) => (
              <li key={i}>
                {event.year}: {event.text}
                {isSafeExternalUrl(event.sourceUrl) ? (
                  <>
                    {" "}
                    (<a href={event.sourceUrl}>source</a>)
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2>Horoscope</h2>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <p>No horoscope generated yet.</p>
        )}

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
      </section>
    </main>
  );
}
