import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  DatabaseUnavailableError,
  isDatabaseUnavailable,
  logDatabaseUnavailable,
} from "@/lib/supabase/availability";
import { composeChart } from "@/lib/chart/model";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";
import { horoscopeParagraphs } from "./display";
import { ReadingPanel } from "./ReadingPanel";
import { DisabledReadingSection, ReadingView } from "./ReadingView";
import { datePagePath } from "@/lib/date-page/params";

type StoredReading = {
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  horoscope: string | null;
};

// Screen 2a (docs/design/HANDOFF_reading_responsive.md). Desktop only --
// the 900px breakpoint is Sprint 20.
//
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
  // `status` is taken below (the events label), hence httpStatus here.
  const {
    data,
    error,
    status: httpStatus,
  } = await anon.rpc("get_reading_by_id", { reading_id: id });

  // Sprint 25, R3 (amended round 1): every RPC error except a malformed id
  // (22P02) counts as unavailable -- including shapes nobody has recorded.
  // An outage is not a fact about any id, so reporting it reveals nothing
  // Sprint 10's uniformity protects: during one, the real reading, a
  // malformed id and a missing id all get the same 5xx (R4, amended). The
  // thrown error carries nothing from the id; error.tsx renders the state.
  if (isDatabaseUnavailable("lookup", { error })) {
    logDatabaseUnavailable("ReadingPage", { error, status: httpStatus });
    throw new DatabaseUnavailableError();
  }

  // R4: what's left is only a 22P02 or an empty result -- both the same
  // silent 404 as before this sprint.
  if (error || !data || data.length === 0) {
    notFound();
  }

  // Read back exactly as stored (R6, carried from Sprint 10) -- not
  // recomputed from the date. Sprint 28: the layout itself is ReadingView,
  // shared with the date page; this route supplies its "sealed" note and
  // its id-addressed generate form. Sprint 31, R3: no flow indicator (the
  // step flow is retired), so nothing goes below the date band here.
  const reading = data[0] as StoredReading;

  // Sprint 31, R3: the written state links to this reading's own date page.
  // event_date is the stored row's, never a request value, so the link can
  // only ever point at the date this reading is about.
  const datePageHref = datePagePath(reading.event_date);

  return (
    <ReadingView
      eventDate={reading.event_date}
      positions={reading.positions}
      events={reading.events}
      jdNote="sealed · anyone with the link"
    >
      {isHoroscopeEnabled() ? (
        <form action={generateReadingHoroscope}>
          <input type="hidden" name="readingId" value={id} />
          <ReadingPanel
            hasHoroscope={!!reading.horoscope}
            paragraphs={horoscopeParagraphs(reading.horoscope)}
            aspectCount={composeChart(reading.event_date, reading.positions).aspects.length}
            errorMessage={generateError ?? null}
            datePageHref={datePageHref}
          />
        </form>
      ) : (
        <DisabledReadingSection horoscope={reading.horoscope} />
      )}
    </ReadingView>
  );
}
