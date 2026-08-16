"use client";

import { Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  DateInputError,
  computePositions,
  instantFromDateAndTime,
  type PlanetPosition,
} from "@/lib/ephemeris/adapter";
import { countElements, countModalities, ELEMENTS, MODALITIES } from "@/lib/ephemeris/balance";
import { computeAspects, type Aspect } from "@/lib/ephemeris/aspects";
import { julianDay } from "@/lib/ephemeris/julian-day";
import {
  ASPECT_SYMBOLS,
  STAR_FIELD,
  computeBodies,
  computeMoonPhaseGeometry,
  computeSectors,
  computeThreads,
} from "./constellation";
import styles from "./chart.module.css";
import { saveReading, type SaveReadingState } from "./actions";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function todayISODate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * The date input's `max` needs "today" from the browser's own clock, not
 * the server's -- computing it during render would make server and
 * client disagree on the very first paint and trip a hydration mismatch.
 * This is the "synchronize with an external system" (the system clock)
 * case the effect lint rule's own docs carve out, not the derived-state
 * anti-pattern it otherwise guards against.
 */
function useTodayISODate(): string | undefined {
  const [today, setToday] = useState<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(todayISODate());
  }, []);
  return today;
}

function Ornament() {
  return (
    <svg
      viewBox="0 0 200 200"
      width="168"
      height="168"
      className={styles.ornament}
      aria-hidden="true"
    >
      <circle
        cx="100"
        cy="100"
        r="94"
        fill="none"
        stroke="oklch(0.25 0.02 288)"
        strokeWidth="1"
        strokeDasharray="1 10"
      />
      <g className={styles.ornamentStars}>
        <circle cx="100" cy="32" r="1.6" fill="oklch(0.62 0.02 288)" />
        <circle cx="152" cy="118" r="1.3" fill="oklch(0.55 0.02 288)" />
        <circle cx="62" cy="140" r="1.5" fill="oklch(0.58 0.02 288)" />
        <circle cx="42" cy="72" r="1.1" fill="oklch(0.50 0.02 288)" />
        <path
          d="M100 32 L152 118 L62 140 Z"
          fill="none"
          stroke="oklch(0.32 0.03 288)"
          strokeWidth="0.7"
        />
        <path d="M42 72 L100 32" fill="none" stroke="oklch(0.30 0.03 288)" strokeWidth="0.7" />
      </g>
      <circle cx="100" cy="100" r="2.5" fill="oklch(0.40 0.03 288)" />
    </svg>
  );
}

function EmptyState({ onSubmit }: { onSubmit: (date: string) => void }) {
  const [date, setDate] = useState("");
  const today = useTodayISODate();

  const canSubmit = Boolean(today) && date !== "" && date < (today as string);

  return (
    <div className={styles.emptyCard}>
      <Ornament />
      <h1 className={styles.headline}>
        The sky keeps its
        <br />
        <span className={styles.headlineAccent}>old positions</span>
      </h1>
      <p className={styles.subhead}>
        Name a moment that has already passed. The planets will be put back where they stood.
      </p>
      <form
        className={styles.fieldGroup}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(date);
        }}
      >
        <label className={styles.fieldLabel} htmlFor="empty-date">
          Date past
        </label>
        <input
          id="empty-date"
          className={styles.dateInput}
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className={styles.submit} type="submit" disabled={!canSubmit}>
          Compute the sky
        </button>
      </form>
      <p className={styles.footnote}>
        No account. No place of birth. No houses.
        <br />
        Nothing kept but what you choose to seal.
      </p>
    </div>
  );
}

type Row = Aspect & { index: number };

function ResultsState({
  baseDate,
  onBaseDateChange,
}: {
  baseDate: string;
  onBaseDateChange: (date: string) => void;
}) {
  const [time, setTime] = useState("12:00");
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const today = useTodayISODate();

  const [saveState, formAction, saving] = useActionState<SaveReadingState, FormData>(
    saveReading,
    { error: null }
  );

  const computed = useMemo(() => {
    try {
      const base = instantFromDateAndTime(baseDate, time);
      const instant = new Date(base.getTime() + offset * ONE_DAY_MS);
      const later = new Date(instant.getTime() + ONE_DAY_MS);

      const positions: PlanetPosition[] = computePositions(instant);
      const laterPositions = computePositions(later);
      const aspects = computeAspects(positions, laterPositions);

      return { instant, positions, aspects, error: null as string | null };
    } catch (err) {
      const message =
        err instanceof DateInputError ? err.message : "Could not compute positions for that moment.";
      return { instant: null, positions: null, aspects: null, error: message };
    }
  }, [baseDate, time, offset]);

  if (computed.error || !computed.instant || !computed.positions || !computed.aspects) {
    return (
      <div className={styles.resultsCard}>
        <div className={styles.footer}>
          <p className={styles.errorText} role="alert">
            {computed.error ?? "Something went wrong computing that moment."}
          </p>
        </div>
      </div>
    );
  }

  const { instant, positions, aspects } = computed;
  const bodies = computeBodies(positions);
  const threads = computeThreads(aspects, bodies);
  const sectors = computeSectors(bodies);
  const moonPhase = computeMoonPhaseGeometry(positions);
  const bodyByKey = new Map(bodies.map((b) => [b.key, b]));
  const jd = julianDay(instant);
  const elementCounts = countElements(positions);
  const modalityCounts = countModalities(positions);

  const rows: Row[] = aspects.map((a, index) => ({ ...a, index }));

  const dateLabel = instant.toISOString().slice(0, 10).replaceAll("-", " · ");
  const timeLabel = instant.toISOString().slice(11, 16);
  const offsetLabel = offset === 0 ? "as entered" : `${offset > 0 ? "+" : ""}${offset} d`;

  function handleScrub(value: number) {
    startTransition(() => setOffset(value));
  }

  return (
    <div className={styles.resultsCard}>
      <div className={styles.resultsGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.svgWrap}>
            <svg viewBox="0 0 640 640" width="640" height="640" role="img" aria-label="Aspect constellation">
              <defs>
                <radialGradient id="omField" cx="50%" cy="46%" r="56%">
                  <stop offset="0%" stopColor="oklch(0.205 0.03 288)" />
                  <stop offset="62%" stopColor="oklch(0.145 0.016 286)" />
                  <stop offset="100%" stopColor="oklch(0.112 0.012 285)" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width="640" height="640" fill="url(#omField)" />

              {STAR_FIELD.map((s, i) => (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.radius}
                  fill="oklch(0.80 0.02 288)"
                  opacity={s.opacity}
                  className={styles.animTwinkle}
                  style={{ "--dur": `${s.duration}s`, "--delay": `${s.delay}s` } as React.CSSProperties}
                />
              ))}

              <circle cx="320" cy="320" r="288" fill="none" stroke="oklch(0.235 0.02 288)" strokeWidth="1" />
              <circle cx="320" cy="320" r="60" fill="none" stroke="oklch(0.20 0.018 288)" strokeWidth="1" />

              {sectors.map((c) => (
                <g key={c.sign}>
                  <line
                    x1={c.lineX1}
                    y1={c.lineY1}
                    x2={c.lineX2}
                    y2={c.lineY2}
                    stroke="oklch(0.22 0.018 288)"
                    strokeWidth="1"
                  />
                  <text
                    x={c.glyphX}
                    y={c.glyphY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="17"
                    fill={c.occupied ? "oklch(0.72 0.09 145)" : "oklch(0.34 0.02 288)"}
                  >
                    {c.glyph}
                  </text>
                </g>
              ))}

              {threads.map((t, i) => {
                const isHovered = hover === i;
                const isIsolated = hover !== null && hover !== i;
                const width = t.baseWidth * (0.5 + t.tightness) * (isHovered ? 2.2 : 1);
                const opacity = isIsolated ? 0.07 : isHovered ? 0.95 : 0.22 + t.tightness * 0.5;
                return (
                  <line
                    key={`${t.bodyA}-${t.bodyB}`}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.color}
                    strokeWidth={width}
                    strokeDasharray={t.dash}
                    strokeLinecap="round"
                    opacity={opacity}
                    className={hover === null ? styles.animBreathe : undefined}
                    style={
                      hover === null
                        ? ({
                            "--dur": `${7 + (i % 5) * 1.7}s`,
                            "--delay": `${i * 0.4}s`,
                          } as React.CSSProperties)
                        : undefined
                    }
                  />
                );
              })}

              {bodies.map((p) => (
                <g key={p.key}>
                  <circle cx={p.x} cy={p.y} r="18" fill={p.color} opacity="0.1" className={styles.animHalo} />
                  <circle cx={p.x} cy={p.y} r={p.dotRadius} fill={p.color} />
                  <text
                    x={p.glyphX}
                    y={p.glyphY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="15"
                    fill={p.color}
                  >
                    {p.glyph}
                  </text>
                  <text
                    x={p.labelX}
                    y={p.labelY}
                    textAnchor={p.labelAnchor}
                    dominantBaseline="central"
                    fontSize="9.5"
                    fill="oklch(0.60 0.015 285)"
                    letterSpacing="0.05em"
                  >
                    {p.label}
                  </text>
                </g>
              ))}

              <text
                x="320"
                y="304"
                textAnchor="middle"
                fontSize="12"
                fill="oklch(0.54 0.015 285)"
                letterSpacing="0.24em"
              >
                {dateLabel}
              </text>
              <text
                x="320"
                y="326"
                textAnchor="middle"
                fontSize="11"
                fill="oklch(0.40 0.015 285)"
                letterSpacing="0.24em"
              >
                {timeLabel} UT
              </text>
              <circle cx="320" cy="354" r="11" fill="none" stroke="oklch(0.36 0.02 288)" strokeWidth="1" />
              <path d={moonPhase.path} fill="oklch(0.86 0.05 85)" />
              <text
                x="320"
                y="380"
                textAnchor="middle"
                fontSize="9"
                fill="oklch(0.52 0.015 285)"
                letterSpacing="0.16em"
              >
                {moonPhase.phaseName}
              </text>
            </svg>
          </div>

          <div className={styles.scrubBlock}>
            <div className={styles.scrubHeader}>
              <span className={styles.mono9}>Scrub the moment</span>
              <span className={styles.scrubOffset}>{offsetLabel}</span>
            </div>
            <input
              className={styles.range}
              type="range"
              min={-400}
              max={400}
              step={1}
              value={offset}
              onChange={(e) => handleScrub(Number(e.currentTarget.value))}
              aria-label="Scrub the moment, in days"
            />
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.inputsRow}>
            <div className={styles.inputField}>
              <label className={styles.fieldLabel} htmlFor="results-date">
                Date past
              </label>
              <input
                id="results-date"
                className={styles.smallInput}
                type="date"
                value={baseDate}
                max={today}
                onChange={(e) => {
                  onBaseDateChange(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className={styles.inputField}>
              <label className={styles.fieldLabel} htmlFor="results-time">
                Time UT
              </label>
              <input
                id="results-time"
                className={styles.smallInput}
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <span className={styles.meta}>
              JD {jd.toFixed(4)}
              <br />
              geocentric · apparent
            </span>
          </div>

          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Aspects within orb</h2>
            <span className={styles.aspectCountLabel}>{rows.length} exact-ish</span>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <span>Body</span>
              <span />
              <span>Body</span>
              <span>Orb</span>
              <span>Aspect</span>
            </div>
            {rows.map((r) => {
              const a = bodyByKey.get(r.bodyA)!;
              const b = bodyByKey.get(r.bodyB)!;
              const color = threads[r.index]?.color ?? "oklch(0.9 0.012 85)";
              return (
                <div
                  key={`${r.bodyA}-${r.bodyB}`}
                  className={styles.tableRow}
                  style={{ background: hover === r.index ? "oklch(0.19 0.02 288)" : "transparent" }}
                  onMouseEnter={() => setHover(r.index)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className={styles.bodyCell}>
                    {a.glyph} {r.bodyA}
                  </span>
                  <span className={styles.symbolCell} style={{ color }}>
                    {ASPECT_SYMBOLS[r.aspect]}
                  </span>
                  <span className={styles.bodyCell}>
                    {b.glyph} {r.bodyB}
                  </span>
                  <span className={styles.orbCell}>{r.orb.toFixed(2)}°</span>
                  <span className={styles.aspectNameCell} style={{ color }}>
                    {r.aspect} · {r.applying ? "A" : "S"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.balanceGrid}>
            <div className={styles.balanceCellBordered}>
              <div className={styles.balanceHeader}>Elements</div>
              <div className={styles.balanceRows}>
                {ELEMENTS.map((el) => (
                  <div key={el} className={styles.balanceRowElement}>
                    <span className={styles.balanceName}>{el}</span>
                    <span className={styles.balanceTrack}>
                      <span
                        className={styles.balanceFill}
                        style={{ width: `${(elementCounts[el] / 10) * 100}%`, background: "oklch(0.70 0.13 145)" }}
                      />
                    </span>
                    <span className={styles.balanceCount}>{elementCounts[el]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.balanceCell}>
              <div className={styles.balanceHeader}>Modalities</div>
              <div className={styles.balanceRows}>
                {MODALITIES.map((mod) => (
                  <div key={mod} className={styles.balanceRowModality}>
                    <span className={styles.balanceName}>{mod}</span>
                    <span className={styles.balanceTrack}>
                      <span
                        className={styles.balanceFill}
                        style={{ width: `${(modalityCounts[mod] / 10) * 100}%`, background: "oklch(0.68 0.13 25)" }}
                      />
                    </span>
                    <span className={styles.balanceCount}>{modalityCounts[mod]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form action={formAction} className={styles.footer}>
            <input type="hidden" name="instant" value={instant.toISOString()} />
            <button className={styles.sealButton} type="submit" disabled={saving}>
              {saving ? "Sealing…" : "Seal this reading"}
            </button>
            <p className={styles.footerNote}>
              No place, no houses, no angles — see Sprint 6. Saved anonymously; the returned link is
              the only way back in.
            </p>
            {saveState.error ? (
              <p className={styles.errorText} role="alert">
                {saveState.error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChartPage() {
  const [baseDate, setBaseDate] = useState<string | null>(null);

  return (
    <main className={`${styles.root} ${displayFont.variable} ${monoFont.variable}`}>
      {baseDate === null ? (
        <EmptyState onSubmit={setBaseDate} />
      ) : (
        <ResultsState baseDate={baseDate} onBaseDateChange={setBaseDate} />
      )}
    </main>
  );
}
