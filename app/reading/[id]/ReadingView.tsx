import Link from "next/link";
import type { ReactNode } from "react";
import { SiteBanner } from "@/app/components/SiteBanner";
import { composeChart } from "@/lib/chart/model";
import {
  linkableEventDate,
  unavailableMessage,
  type UnavailableHoroscope,
} from "@/lib/date-page/accuracy";
import { datePagePath } from "@/lib/date-page/params";
import { CALCULATION_HOUR_UTC, type PlanetPosition } from "@/lib/ephemeris/adapter";
import { ELEMENTS, MODALITIES } from "@/lib/ephemeris/balance";
import { hasMatchedEvents } from "@/lib/events/matched";
import { stripPictureNotes } from "@/lib/events/picture-notes";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { eventsHeading, eventsLabel, eventsPlacement, horoscopeParagraphs, isSafeExternalUrl } from "./display";
import { eventsStatusLabel, formatLongDate } from "./format";
import { AspectsPanel, PlanetsTable, SignsTable } from "./ChartKeyTables";
import { ChartTabs } from "./ChartTabs";
import {
  STAR_FIELD,
  computeBodies,
  computeMoonPhaseGeometry,
  computeSectors,
  computeThreads,
  type BodyRender,
  type SectorRender,
  type ThreadGeometry,
} from "./constellation";
import { IdleBlock, ReadingHeader, SavedHoroscope } from "./HoroscopeReveal";
import styles from "./reading.module.css";

type ReadingViewProps = {
  eventDate: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  /**
   * Sprint 43, R8: the banner's tagline, picked on the server by the page
   * (lib/banner/taglines.ts's pickTagline), so this component stays a pure
   * function of its props.
   */
  tagline: string;
  /** Second line of the JD block under the date band; omitted when absent. */
  jdNote?: string;
  /**
   * Sprint 52, R1: the strip between the banner and the date band (the date
   * page's Previous day / Next day), so "The sky over" sits directly above
   * the body. Nothing renders between the date band and the body any more.
   */
  aboveDateBand?: ReactNode;
  /**
   * Sprint 45, R4: after the body, so on phones it follows the reading
   * section and sits outside its sticky reveal (the date page's "Another
   * date" panel and "Notable dates", Sprint 52).
   */
  afterBody?: ReactNode;
  /** Contents of "The reading" section. */
  children: ReactNode;
};

/**
 * Screen 2a (docs/design/HANDOFF_reading_responsive.md): date band,
 * constellation, positions and balance, Wikipedia events, and the slot for
 * the horoscope panel. Extracted from /reading/[id]/page.tsx in Sprint 28
 * so the date page renders exactly the same layout from the same code (R1)
 * rather than a fork; each route supplies only what differs -- where the
 * data came from, the JD note, the strip below the date band, and the
 * reading section's contents.
 *
 * R4 (carried): all data from composeChart and lib/ephemeris/, nothing
 * astronomical from the design prototype. Positions are rendered as given
 * -- the caller decides whether they are a stored row's or freshly
 * computed.
 *
 * Sprint 43, R2: the "Ask Reloy" banner opens the card, above the date
 * band. Every state either page renders goes through here (written, idle,
 * disabled, unavailable, unmatched events), so mounting it once here puts
 * it on all of them.
 */
export function ReadingView({
  eventDate,
  positions,
  events,
  tagline,
  jdNote,
  aboveDateBand,
  afterBody,
  children,
}: ReadingViewProps) {
  const chart = composeChart(eventDate, positions);
  const longDate = formatLongDate(eventDate);
  const status = eventsStatusLabel(events);
  // Sprint 48: other years' events follow the reading (eventsPlacement).
  const eventsBelow = eventsPlacement(events) === "below";
  // Sprint 51, R1/R4: a "this exact date" list is all from the page's own
  // year, already in the date band, so its rows drop the year column. The
  // same rule as the status label, read from the one place it's stated.
  const matched = hasMatchedEvents(events);

  const bodies = computeBodies(chart.positions);
  const threads = computeThreads(chart.aspects, bodies);
  const sectors = computeSectors(bodies);
  const dateBandMoon = computeMoonPhaseGeometry(chart.positions, 15, 15, 12);
  const calculationHour = `${String(CALCULATION_HOUR_UTC).padStart(2, "0")}:00 UT`;

  const eventsSection = (
    <section
      className={
        eventsBelow ? `${styles.eventsSection} ${styles.eventsSectionBelow}` : styles.eventsSection
      }
    >
      <div className={styles.sectionHeader}>
        {/* Sprint 54/55, R1: "Other years with events on Month D" when that's what's listed. */}
        <h2 className={styles.sectionTitle}>{eventsHeading(events, eventDate)}</h2>
        {status ? <span className={styles.eventsStatus}>{status}</span> : null}
      </div>
      {events && events.events.length > 0 ? (
        <div className={styles.eventsList}>
          {events.events.map((event, i) => (
            <div
              key={i}
              className={matched ? `${styles.eventRow} ${styles.eventRowSingle}` : styles.eventRow}
            >
              {/* Absent, not hidden, on a matched list (R1): nothing for a
                  screen reader to announce on every row. */}
              {matched ? null : <EventYear year={event.year} eventDate={eventDate} />}
              <span className={styles.eventText}>
                {/* Sprint 42: we never show Wikipedia's picture, so its "(pictured)" note goes. */}
                {stripPictureNotes(event.text)}
                {isSafeExternalUrl(event.sourceUrl) ? (
                  <>
                    {" "}
                    (<a href={event.sourceUrl}>source</a>)
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.eventsEmpty}>{eventsLabel(events)}</p>
      )}
    </section>
  );

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <SiteBanner tagline={tagline} />
        {aboveDateBand ? <div className={styles.flowSlot}>{aboveDateBand}</div> : null}
        <div className={styles.dateBand}>
          <div className={styles.dateBandLeft}>
            <span className={styles.eyebrow}>The sky over</span>
            <h1 className={styles.dateHeading}>
              {longDate.day} {longDate.month} <span className={styles.dateYear}>{longDate.year}</span>
            </h1>
          </div>
          <div className={styles.dateBandRight}>
            <div className={styles.moonGlyph}>
              <svg viewBox="0 0 30 30" width="30" height="30">
                <circle cx="15" cy="15" r="12" fill="none" stroke="oklch(0.34 0.02 288)" strokeWidth="1" />
                <path d={dateBandMoon.path} fill="oklch(0.86 0.05 85)" />
              </svg>
              <span className={styles.moonPhaseName}>{dateBandMoon.phaseName}</span>
            </div>
            <span className={styles.jdBlock}>
              JD {chart.julianDay.toFixed(4)}
              {jdNote ? (
                <>
                  <br />
                  {jdNote}
                </>
              ) : null}
            </span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.leftColumn}>
            {/* Sprint 37, R1: the chart area is a tabbed panel. Chart (the
                figure below, unchanged) is selected on every load; the other
                three tabs are a key to it, rendered here on the server. */}
            <ChartTabs
              label="Chart views"
              tabs={[
                {
                  id: "chart",
                  label: "Chart",
                  content: (
                    <ConstellationFigure
                      eventDate={eventDate}
                      calculationHour={calculationHour}
                      bodies={bodies}
                      threads={threads}
                      sectors={sectors}
                    />
                  ),
                },
                { id: "planets", label: "Planets", content: <PlanetsTable positions={chart.positions} /> },
                { id: "signs", label: "Signs", content: <SignsTable positions={chart.positions} /> },
                { id: "aspects", label: "Aspects", content: <AspectsPanel aspects={chart.aspects} /> },
              ]}
            />

            <div className={styles.balanceGrid}>
              <div className={styles.balanceCellBordered}>
                <div className={styles.balanceLabel}>Elements</div>
                <div className={styles.balanceRows}>
                  {ELEMENTS.map((element) => (
                    <div key={element} className={styles.balanceRowElement}>
                      <span className={styles.balanceName}>{element}</span>
                      <span className={styles.balanceTrack}>
                        <span
                          className={styles.balanceFill}
                          style={{
                            width: `${(chart.elements[element] / 10) * 100}%`,
                            background: "var(--om-verdigris)",
                          }}
                        />
                      </span>
                      <span className={styles.balanceCount}>{chart.elements[element]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.balanceCell}>
                <div className={styles.balanceLabel}>Modalities</div>
                <div className={styles.balanceRows}>
                  {MODALITIES.map((modality) => (
                    <div key={modality} className={styles.balanceRowModality}>
                      <span className={styles.balanceName}>{modality}</span>
                      <span className={styles.balanceTrack}>
                        <span
                          className={styles.balanceFill}
                          style={{
                            width: `${(chart.modalities[modality] / 10) * 100}%`,
                            background: "var(--om-rust)",
                          }}
                        />
                      </span>
                      <span className={styles.balanceCount}>{chart.modalities[modality]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sprint 48, R2/R3: the order is the DOM order -- whichever section
              renders first is first, for the eye, Tab and screen readers
              alike; no CSS reordering. */}
          <div className={styles.rightColumn}>
            {eventsBelow ? null : eventsSection}
            <section
              className={
                eventsBelow ? `${styles.readingSection} ${styles.readingSectionFirst}` : styles.readingSection
              }
            >
              {children}
            </section>
            {eventsBelow ? eventsSection : null}
          </div>
        </div>

        {afterBody}
      </main>
    </div>
  );
}

/**
 * Sprint 39, R1: column 1 of an event row. Since Sprint 51 it's rendered on
 * unmatched ("other years") lists only, so each year is a link to the same
 * month and day in that year when the date page supports that date
 * (linkableEventDate); every other year stays plain text. `eventDate` is
 * the page's date, or the stored row's on /reading/[id], so the link keeps
 * that date's own month and day.
 *
 * The accessible name spells out the destination ("Go to 9 May 1976") and
 * still contains the visible year, so speech input can say what it sees.
 */
function EventYear({ year, eventDate }: { year: number; eventDate: string }) {
  const target = linkableEventDate(year, eventDate);
  if (!target) return <span className={styles.eventYear}>{year}</span>;

  const long = formatLongDate(target);
  return (
    <Link
      href={datePagePath(target)}
      className={`${styles.eventYear} ${styles.eventYearLink}`}
      aria-label={`Go to ${long.day} ${long.month} ${long.year}`}
    >
      {year}
    </Link>
  );
}

/**
 * The desktop and phone charts, exactly as ReadingView drew them before
 * Sprint 37 -- moved here unchanged to become the Chart tab's content.
 */
function ConstellationFigure({
  eventDate,
  calculationHour,
  bodies,
  threads,
  sectors,
}: {
  eventDate: string;
  calculationHour: string;
  bodies: BodyRender[];
  threads: ThreadGeometry[];
  sectors: SectorRender[];
}) {
  return (
    <>
      <svg
        viewBox="0 0 640 640"
        width="560"
        height="560"
        className={`${styles.constellationSvg} ${styles.desktopOnly}`}
      >
        <defs>
          <radialGradient id="omReadingField" cx="50%" cy="46%" r="56%">
            <stop offset="0%" stopColor="oklch(0.205 0.03 288)" />
            <stop offset="62%" stopColor="oklch(0.145 0.016 286)" />
            <stop offset="100%" stopColor="oklch(0.112 0.012 285)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="640" height="640" fill="url(#omReadingField)" />
        {STAR_FIELD.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="oklch(0.80 0.02 288)"
            opacity={star.opacity}
            className={styles.star}
            style={{ animation: `om-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }}
          />
        ))}
        <circle cx="320" cy="320" r="288" fill="none" stroke="oklch(0.235 0.02 288)" strokeWidth="1" />
        <circle cx="320" cy="320" r="60" fill="none" stroke="oklch(0.20 0.018 288)" strokeWidth="1" />
        {sectors.map((sector) => (
          <g key={sector.sign}>
            <line
              x1={sector.lineX1}
              y1={sector.lineY1}
              x2={sector.lineX2}
              y2={sector.lineY2}
              stroke="oklch(0.22 0.018 288)"
              strokeWidth="1"
            />
            <text
              x={sector.glyphX}
              y={sector.glyphY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="17"
              fill={sector.occupied ? "oklch(0.72 0.09 145)" : "oklch(0.34 0.02 288)"}
              fontFamily="var(--font-mono), monospace"
            >
              {/* Sprint 34, R2: the native tooltip, first child of the glyph it names. */}
              <title>{sector.tooltip}</title>
              {sector.glyph}
            </text>
          </g>
        ))}
        {threads.map((thread, i) => (
          <line
            key={i}
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke={thread.color}
            strokeWidth={thread.baseWidth}
            strokeDasharray={thread.dash}
            strokeLinecap="round"
            opacity={0.35 + thread.tightness * 0.5}
            className={styles.thread}
            style={{ animation: `om-breathe ${7 + thread.tightness * 6.8}s ease-in-out 0.4s infinite` }}
          />
        ))}
        {bodies.map((body) => (
          <g key={body.key}>
            {/* Sprint 34, R1: first child, so hovering the halo, dot,
                glyph or label anywhere in this group shows it. */}
            <title>{body.tooltip}</title>
            <circle
              cx={body.x}
              cy={body.y}
              r="18"
              fill={body.color}
              opacity="0.1"
              className={styles.bodyHalo}
              style={{ animation: "om-halo 8s ease-in-out infinite" }}
            />
            <circle cx={body.x} cy={body.y} r={body.dotRadius} fill={body.color} />
            <text
              x={body.glyphX}
              y={body.glyphY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="15"
              fill={body.color}
              fontFamily="var(--font-mono), monospace"
            >
              {body.glyph}
            </text>
            <text
              x={body.labelX}
              y={body.labelY}
              textAnchor={body.labelAnchor}
              dominantBaseline="central"
              fontSize="9.5"
              fill="oklch(0.60 0.015 285)"
              fontFamily="var(--font-mono), monospace"
              letterSpacing="0.05em"
            >
              {body.label}
            </text>
          </g>
        ))}
        {/* Sprint 34, LiveQA round 1: the centre date and hour labels
            are drawn last, on top of the planets, and on some dates
            (1969-07-20) the Moon's glyph lands inside the date label.
            Click-through, so the planet underneath keeps its tooltip.
            Purely a hit-testing change; nothing about how they look. */}
        <text
          x="320"
          y="316"
          pointerEvents="none"
          textAnchor="middle"
          fontSize="12"
          fill="oklch(0.54 0.015 285)"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="0.24em"
        >
          {eventDate.split("-").join(" · ")}
        </text>
        <text
          x="320"
          y="338"
          pointerEvents="none"
          textAnchor="middle"
          fontSize="11"
          fill="oklch(0.40 0.015 285)"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="0.24em"
        >
          {calculationHour}
        </text>
      </svg>

      {/* Mobile: cropped viewBox, no sign sectors, no body labels
          (frame 3/4) -- genuinely dropped, not CSS-hidden, same
          treatment as /chart's own mobile crop. */}
      <svg
        viewBox="110 110 420 420"
        width="390"
        height="300"
        className={`${styles.constellationSvg} ${styles.mobileOnly}`}
      >
        <defs>
          <radialGradient id="omReadingFieldMobile" cx="50%" cy="46%" r="56%">
            <stop offset="0%" stopColor="oklch(0.205 0.03 288)" />
            <stop offset="62%" stopColor="oklch(0.145 0.016 286)" />
            <stop offset="100%" stopColor="oklch(0.112 0.012 285)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="640" height="640" fill="url(#omReadingFieldMobile)" />
        {STAR_FIELD.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="oklch(0.80 0.02 288)"
            opacity={star.opacity}
            className={styles.star}
            style={{ animation: `om-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }}
          />
        ))}
        {threads.map((thread, i) => (
          <line
            key={i}
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke={thread.color}
            strokeWidth={thread.baseWidth}
            strokeDasharray={thread.dash}
            strokeLinecap="round"
            opacity={0.35 + thread.tightness * 0.5}
            className={styles.thread}
            style={{ animation: `om-breathe ${7 + thread.tightness * 6.8}s ease-in-out 0.4s infinite` }}
          />
        ))}
        {bodies.map((body) => (
          <g key={body.key}>
            <circle cx={body.x} cy={body.y} r={body.dotRadius} fill={body.color} />
            <text
              x={body.glyphX}
              y={body.glyphY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="18"
              fill={body.color}
              fontFamily="var(--font-mono), monospace"
            >
              {body.glyph}
            </text>
          </g>
        ))}
      </svg>
    </>
  );
}

/** Sprint 39, R6: the status label beside "The reading" for each message. */
const UNAVAILABLE_STATUS: Record<UnavailableHoroscope["kind"], string> = {
  unmatched: "no exact-date events",
  lookupFailed: "events unavailable",
};

/**
 * Sprint 39, R3-R6: "The reading" section's contents when no horoscope may
 * be written or shown for the date, shared by the date page and
 * /reading/[id]. It takes the place of every other state: the generate
 * form, a saved horoscope, the disabled panel and the saved-horoscopes
 * outage notice. No form, no reveal, and nothing here needs the database
 * or JavaScript.
 *
 * Sprint 54, R4: the next step starts on its own line after the bold lead:
 * a line break in the one paragraph, not a second paragraph.
 */
export function HoroscopeUnavailableSection({ availability }: { availability: UnavailableHoroscope }) {
  const message = unavailableMessage(availability);
  return (
    <>
      <ReadingHeader status="idle" label={UNAVAILABLE_STATUS[availability.kind]} />
      <p className={styles.accuracyNote}>
        <strong className={styles.accuracyLead}>{message.lead}</strong>
        <br />
        {message.next}
      </p>
    </>
  );
}

const DISABLED_NOTE = "Horoscope generation is currently disabled.";

/**
 * "The reading" section's contents when generation is disabled, shared by
 * /reading/[id] and the date page. No form and no generate button, ever.
 *
 * Sprint 33, R5:
 * - With a saved horoscope, the same folded reveal as the enabled panel,
 *   because revealing saved text isn't generation. The disabled note is the
 *   footer in both the folded and unfolded states.
 * - With none, the idle block and the disabled note, with no reveal control.
 */
export function DisabledReadingSection({
  horoscope,
  revealed,
}: {
  horoscope: string | null;
  /** Sprint 33, R4: honoured for a saved horoscope, ignored otherwise. */
  revealed: boolean;
}) {
  const disabledNote = (
    <div className={styles.readingFooter}>
      <p className={styles.disabledNote}>{DISABLED_NOTE}</p>
    </div>
  );

  if (horoscope) {
    // Sprint 56: SavedHoroscope builds its own footer row (the toggle, then
    // the note), so it takes the note itself rather than this footer.
    return (
      <SavedHoroscope
        paragraphs={horoscopeParagraphs(horoscope)}
        revealed={revealed}
        note={{ text: DISABLED_NOTE, className: styles.disabledNote }}
      />
    );
  }

  return (
    <>
      <ReadingHeader status="idle" />
      <IdleBlock />
      {disabledNote}
    </>
  );
}
