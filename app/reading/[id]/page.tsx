import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { composeChart } from "@/lib/chart/model";
import { CALCULATION_HOUR_UTC, type PlanetPosition } from "@/lib/ephemeris/adapter";
import { ELEMENTS, MODALITIES } from "@/lib/ephemeris/balance";
import type { WikipediaEventsPayload } from "@/lib/events/wikipedia";
import { isHoroscopeEnabled } from "@/lib/llm/generate";
import { generateReadingHoroscope } from "./actions";
import { eventsLabel, horoscopeParagraphs, isSafeExternalUrl } from "./display";
import { eventsStatusLabel, formatLongDate } from "./format";
import {
  STAR_FIELD,
  computeBodies,
  computeMoonPhaseGeometry,
  computeSectors,
  computeThreads,
} from "./constellation";
import { ReadingPanel, IdleBlock } from "./ReadingPanel";
import styles from "./reading.module.css";

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
  const { data, error } = await anon.rpc("get_reading_by_id", { reading_id: id });

  if (error || !data || data.length === 0) {
    notFound();
  }

  // Read back exactly as stored (R6, carried from Sprint 10) -- not
  // recomputed from the date. R4: all data from composeChart and
  // lib/ephemeris/, nothing astronomical from the design prototype.
  const reading = data[0] as StoredReading;
  const chart = composeChart(reading.event_date, reading.positions);
  const paragraphs = horoscopeParagraphs(reading.horoscope);
  const longDate = formatLongDate(reading.event_date);
  const status = eventsStatusLabel(reading.events);

  const bodies = computeBodies(chart.positions);
  const threads = computeThreads(chart.aspects, bodies);
  const sectors = computeSectors(bodies);
  const dateBandMoon = computeMoonPhaseGeometry(chart.positions, 15, 15, 12);
  const calculationHour = `${String(CALCULATION_HOUR_UTC).padStart(2, "0")}:00 UT`;

  return (
    <div className={styles.page}>
      <main className={styles.card}>
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
              <br />
              sealed · anyone with the link
            </span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.leftColumn}>
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
              <text
                x="320"
                y="316"
                textAnchor="middle"
                fontSize="12"
                fill="oklch(0.54 0.015 285)"
                fontFamily="var(--font-mono), monospace"
                letterSpacing="0.24em"
              >
                {reading.event_date.split("-").join(" · ")}
              </text>
              <text
                x="320"
                y="338"
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

          <div className={styles.rightColumn}>
            <section className={styles.eventsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>What happened</h2>
                {status ? <span className={styles.eventsStatus}>{status}</span> : null}
              </div>
              {reading.events && reading.events.events.length > 0 ? (
                <div className={styles.eventsList}>
                  {reading.events.events.map((event, i) => (
                    <div key={i} className={styles.eventRow}>
                      <span className={styles.eventYear}>{event.year}</span>
                      <span className={styles.eventText}>
                        {event.text}
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
                <p className={styles.eventsEmpty}>{eventsLabel(reading.events)}</p>
              )}
            </section>

            <section className={styles.readingSection}>
              {isHoroscopeEnabled() ? (
                <form action={generateReadingHoroscope}>
                  <input type="hidden" name="readingId" value={id} />
                  <ReadingPanel
                    hasHoroscope={!!reading.horoscope}
                    paragraphs={paragraphs}
                    aspectCount={chart.aspects.length}
                    errorMessage={generateError ?? null}
                  />
                </form>
              ) : (
                <>
                  <div className={styles.readingHeader}>
                    <h3 className={styles.sectionTitle}>The reading</h3>
                    <span
                      className={`${styles.readingStatus} ${
                        reading.horoscope ? styles.statusWritten : styles.statusIdle
                      }`}
                    >
                      {reading.horoscope ? "written" : "not read yet"}
                    </span>
                  </div>
                  {reading.horoscope ? (
                    <div className={styles.writtenBlock}>
                      {paragraphs.map((paragraph, i) => (
                        <p key={i} className={styles.paragraph}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <IdleBlock />
                  )}
                  <div className={styles.readingFooter}>
                    <p className={styles.disabledNote}>Horoscope generation is currently disabled.</p>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
