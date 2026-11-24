import { notFound } from "next/navigation";
import { connection } from "next/server";
import { pickTagline } from "@/lib/banner/taglines";
import { composeChart } from "@/lib/chart/model";
import { horoscopeAvailability } from "@/lib/date-page/accuracy";
import { loadDatePage } from "@/lib/date-page/load";
import { loadDateNavigation } from "@/lib/date-page/navigation";
import { parseDatePageParam } from "@/lib/date-page/params";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { horoscopeParagraphs } from "@/app/reading/[id]/display";
import { ReadingPanel } from "@/app/reading/[id]/ReadingPanel";
import {
  DisabledReadingSection,
  HoroscopeUnavailableSection,
  ReadingView,
} from "@/app/reading/[id]/ReadingView";
import { isLandingRevealed } from "@/app/reading/[id]/reveal";
import readingStyles from "@/app/reading/[id]/reading.module.css";
import { castHoroscope } from "./actions";
import { DateNavigation } from "./DateNavigation";
import { DatePicker } from "./DatePicker";
import styles from "./date.module.css";

/**
 * Sprint 28: the date page, /date/YYYY-MM-DD. The same layout as
 * /reading/[id] (R1, through the shared ReadingView), addressed by date.
 *
 * Rendering writes nothing (R3): loadDatePage's only database call is the
 * read-only get_reading_by_date lookup, loadDateNavigation's (Sprint 29)
 * are the two read-only date-only lookups, and the horoscope is written
 * only by the castHoroscope action, on a form submission.
 *
 * Dynamic per request (R2's risk, applied here too): `connection()` opts
 * out of prerendering explicitly, so a just-cast horoscope is never hidden
 * behind a cached render.
 *
 * Differences from /reading/[id], deliberately (R8): no step indicator (the
 * chart -> save -> reading flow it described doesn't happen here, and Sprint
 * 31 retired it everywhere; the date picker takes its strip), and no
 * "sealed · anyone with the link" note.
 */
export default async function DatePage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ error?: string | string[]; revealed?: string | string[] }>;
}) {
  await connection();
  const { date } = await params;
  const { error, revealed: revealedParam } = await searchParams;

  // R1: a malformed or out-of-range date gets the same bare 404 an unknown
  // reading id gets.
  const isoDate = parseDatePageParam(date);
  if (!isoDate) notFound();

  // Sprint 29, R4: the navigation is loaded alongside the page, not inside
  // loadDatePage, so its failure can only ever remove the navigation --
  // the chart, events and Sprint 28's own R6 notice don't depend on it.
  const anon = createAnonClient();
  const [page, navigation] = await Promise.all([
    loadDatePage(anon, isoDate),
    loadDateNavigation(anon, isoDate, "DatePage"),
  ]);
  const horoscope = page.saved.kind === "found" ? page.saved.reading.horoscope : null;
  const castError = typeof error === "string" && error ? error : null;
  // Sprint 33, R4: presentation only -- it opens an already-saved horoscope's
  // disclosure and nothing else. Nothing on this render path writes (R3).
  const revealed = isLandingRevealed(revealedParam);
  // Sprint 39, R6: decided from the events shown beside the reading, which
  // never needs the database. A saved horoscope only reaches here with
  // matched events (lookupSavedHoroscope, R7), so a non-writable result
  // means a fresh lookup that was unmatched or failed.
  const availability = horoscopeAvailability(page.events, page.eventDate);

  return (
    <ReadingView
      eventDate={page.eventDate}
      positions={page.positions}
      events={page.events}
      // Sprint 43, R8: after connection(), so a fresh pick per request.
      tagline={pickTagline(Math.random)}
      belowDateBand={
        <>
          <DatePicker isoDate={isoDate} />
          <DateNavigation navigation={navigation} />
        </>
      }
    >
      {availability.kind !== "writable" ? (
        <HoroscopeUnavailableSection availability={availability} />
      ) : page.saved.kind === "unavailable" ? (
        <SavedHoroscopesUnavailable />
      ) : isHoroscopeEnabled() ? (
        <form action={castHoroscope}>
          <input type="hidden" name="date" value={isoDate} />
          <ReadingPanel
            hasHoroscope={!!horoscope}
            paragraphs={horoscopeParagraphs(horoscope)}
            aspectCount={composeChart(page.eventDate, page.positions).aspects.length}
            errorMessage={castError}
            revealed={revealed}
            offerNewChart={false}
          />
        </form>
      ) : (
        <DisabledReadingSection horoscope={horoscope} revealed={revealed} />
      )}
    </ReadingView>
  );
}

/**
 * R6: the lookup is unavailable (a paused or unreachable database). The
 * chart and events above don't need the database and still render; this
 * takes the reading panel's place, with no cast action -- a cast would only
 * fail against the same outage. The outage itself was already logged in
 * full by lookupSavedHoroscope.
 */
function SavedHoroscopesUnavailable() {
  return (
    <>
      <div className={readingStyles.readingHeader}>
        <h3 className={readingStyles.sectionTitle}>The reading</h3>
        <span className={`${readingStyles.readingStatus} ${readingStyles.statusIdle}`}>
          unavailable
        </span>
      </div>
      <p className={styles.unavailableText} role="status">
        Saved horoscopes can&rsquo;t be loaded right now. The chart and events for this date are
        still here; try again in a few minutes for the reading.
      </p>
    </>
  );
}
