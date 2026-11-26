import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { pickTagline } from "@/lib/banner/taglines";
import { DatabaseUnavailableError } from "@/lib/supabase/availability";
import { composeChart } from "@/lib/chart/model";
import { horoscopeAvailability } from "@/lib/date-page/accuracy";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";
import { horoscopeParagraphs } from "./display";
import { isLandingRevealed } from "./reveal";
import { ReadingPanel } from "./ReadingPanel";
import { DisabledReadingSection, HoroscopeUnavailableSection, ReadingView } from "./ReadingView";
import { datePagePath } from "@/lib/date-page/params";
import { datedTitle } from "@/lib/site-title";
import { loadReadingById } from "./load";

/**
 * Sprint 49, R3: "Retroactive Horoscope YYYY-MM-DD" from the stored
 * reading's event_date. loadReadingById is cache()-wrapped, so this and the
 * page below share one get_reading_by_id call per request. An unknown or
 * malformed id, or an outage, sets nothing: the root layout's plain title
 * stands (R4), with no date and no error text. The page itself still
 * decides the 404 or the error state.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lookup = await loadReadingById((await params).id);
  return lookup.kind === "found" ? { title: datedTitle(lookup.reading.event_date) } : {};
}

// Screen 2a (docs/design/HANDOFF_reading_responsive.md). Desktop only --
// the 900px breakpoint is Sprint 20.
//
// Retrieval is by id only (loadReadingById, ./load.ts). A malformed id and
// an empty result are treated identically as not-found. That uniformity is
// deliberate: a client asking for an id that doesn't exist and a client
// sending garbage should be indistinguishable from outside.
export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; revealed?: string | string[] }>;
}) {
  // Sprint 43, R8: the banner's tagline is a random pick per request, so
  // this page must never be prerendered or served from a cached render.
  // Awaiting searchParams already makes it dynamic; connection() says so
  // explicitly, the same way the date page does.
  await connection();
  const { id } = await params;
  const { error: generateError, revealed: revealedParam } = await searchParams;
  // Sprint 33, R4: presentation only -- it opens an already-saved horoscope's
  // disclosure and nothing else. See ./reveal.ts.
  const revealed = isLandingRevealed(revealedParam);

  // Sprint 49, R3: the same cached lookup generateMetadata used, so this
  // is no second database round trip.
  const lookup = await loadReadingById(id);

  // Sprint 25, R3 (amended round 1): every RPC error except a malformed id
  // (22P02) counts as unavailable -- including shapes nobody has recorded.
  // An outage is not a fact about any id, so reporting it reveals nothing
  // Sprint 10's uniformity protects: during one, the real reading, a
  // malformed id and a missing id all get the same 5xx (R4, amended). The
  // thrown error carries nothing from the id; error.tsx renders the state.
  if (lookup.kind === "unavailable") throw new DatabaseUnavailableError();

  // R4: what's left is only a 22P02 or an empty result -- both the same
  // silent 404 as before this sprint.
  if (lookup.kind === "notFound") notFound();

  // Read back exactly as stored (R6, carried from Sprint 10) -- not
  // recomputed from the date. Sprint 28: the layout itself is ReadingView,
  // shared with the date page; this route supplies its "sealed" note and
  // its id-addressed generate form. Sprint 31, R3: no flow indicator (the
  // step flow is retired), so nothing goes below the date band here.
  const { reading } = lookup;

  // Sprint 31, R3: the written state links to this reading's own date page.
  // event_date is the stored row's, never a request value, so the link can
  // only ever point at the date this reading is about.
  const datePageHref = datePagePath(reading.event_date);
  // Sprint 39, R10: judged on the row's own stored events, exactly as the
  // date page judges its events. An unmatched or event-less row shows the
  // message in place of its saved horoscope, the generate form and the
  // disabled panel; the row itself is never touched.
  const availability = horoscopeAvailability(reading.events);

  return (
    <ReadingView
      eventDate={reading.event_date}
      positions={reading.positions}
      events={reading.events}
      tagline={pickTagline(Math.random)}
      jdNote="sealed · anyone with the link"
    >
      {availability.kind !== "writable" ? (
        <HoroscopeUnavailableSection availability={availability} />
      ) : isHoroscopeEnabled() ? (
        <form action={generateReadingHoroscope}>
          <input type="hidden" name="readingId" value={id} />
          <ReadingPanel
            hasHoroscope={!!reading.horoscope}
            paragraphs={horoscopeParagraphs(reading.horoscope)}
            aspectCount={composeChart(reading.event_date, reading.positions).aspects.length}
            errorMessage={generateError ?? null}
            revealed={revealed}
            datePageHref={datePageHref}
          />
        </form>
      ) : (
        <DisabledReadingSection horoscope={reading.horoscope} revealed={revealed} />
      )}
    </ReadingView>
  );
}
