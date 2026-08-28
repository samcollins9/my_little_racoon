"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./reading.module.css";

const SKELETON_WIDTHS = ["96%", "89%", "93%", "61%", "91%", "74%"];
const PARAGRAPH_RISE_STAGGER_S = 0.45;

type Props = {
  hasHoroscope: boolean;
  paragraphs: string[];
  aspectCount: number;
  errorMessage: string | null;
};

/**
 * The whole of "The reading" panel's dynamic parts (docs/design/HANDOFF_reading_responsive.md),
 * "use client" only because useFormStatus requires a component rendered
 * inside the <form> it reports on (R7) -- page.tsx renders this as the
 * form's child and stays a server component itself.
 *
 * `pending` (useFormStatus) decides idle/busy/written -- hasHoroscope is
 * computed server-side from reading.horoscope being null, never
 * duplicated client-side. A second, small state variable (`justWrote`,
 * below) exists only to gate the rise animation; see its own comment for
 * why that isn't the one-state-variable design the handoff describes.
 */
export function ReadingPanel({ hasHoroscope, paragraphs, aspectCount, errorMessage }: Props) {
  const { pending } = useFormStatus();

  // R8: the rise animation runs only the first time paragraphs appear
  // after a generation completes in this component instance, never on a
  // page load of an already-written reading. useFormStatus's pending
  // stays true through the redirect the server action performs on
  // success, so a fresh page load always starts with pending: false and
  // justWrote at its initial value -- it can only become true by actually
  // observing a pending -> not-pending transition, and never for a failed
  // regenerate (errorMessage present), which must not replay the rise on
  // the unchanged, already-written paragraphs.
  //
  // Two extra pieces of client state, not one -- a deliberate, narrow
  // deviation from the handoff's "exactly one piece of state" (decided
  // with the user). Neither duplicates server-owned data: hasHoroscope,
  // computed server-side from reading.horoscope, remains the only source
  // of truth for idle vs written. The comparison runs during render, not
  // inside a useEffect -- this is React's own documented pattern for
  // "adjusting state when a prop changes" (comparing against a
  // previous-value state variable, conditionally calling setState during
  // render), not the anti-pattern react-hooks/set-state-in-effect exists
  // to catch (deriving state from a prop change inside an effect, which
  // costs an extra commit for no reason -- and a ref mutated during
  // render instead would trip react-hooks/refs, since a render can be
  // interrupted and replayed before it commits).
  const [prevPending, setPrevPending] = useState(pending);
  const [justWrote, setJustWrote] = useState(false);

  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending && !pending && !errorMessage) {
      setJustWrote(true);
    } else if (pending) {
      setJustWrote(false);
    }
  }

  const showWritten = !pending && hasHoroscope;

  const statusLabel = pending ? "writing" : hasHoroscope ? "written" : "not written yet";
  const statusClass = pending
    ? styles.statusBusy
    : hasHoroscope
      ? styles.statusWritten
      : styles.statusIdle;

  // Sprint 22: no regenerate control. A written reading with no error
  // shows a plain link to /chart instead of a submit button -- a visitor
  // wanting another reading is sent to cast a new one, not offered a
  // control that re-rolls the one they're looking at. R5: a failed
  // generation still offers "Try again", re-enabled, regardless of
  // hasHoroscope -- that's a retry of the failed attempt, not a
  // regeneration of a successful one. Sprint 24, R1: the idle-state
  // generate button renamed "Read the chart" -> "Write the horoscope" --
  // it names the destination (the generated text), not the jargon verb
  // for what the code does; "Try again" (R7) is unchanged, that's a retry
  // of a failed generation, not a step in the sequence.
  const showButton = pending || !!errorMessage || !hasHoroscope;
  const buttonLabel = errorMessage ? "Try again" : "Write the horoscope";

  return (
    <>
      <div className={styles.readingHeader}>
        <h3 className={styles.sectionTitle}>The reading</h3>
        <span className={`${styles.readingStatus} ${statusClass}`}>{statusLabel}</span>
      </div>

      {pending ? (
        <BusyBlock />
      ) : showWritten ? (
        <div className={styles.writtenBlock}>
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className={justWrote ? `${styles.paragraph} ${styles.paragraphRise}` : styles.paragraph}
              style={justWrote ? { animationDelay: `${i * PARAGRAPH_RISE_STAGGER_S}s` } : undefined}
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <IdleBlock />
      )}

      <div className={styles.readingFooter}>
        {showButton ? (
          <button type="submit" disabled={pending} className={styles.castButton}>
            {buttonLabel}
          </button>
        ) : (
          <>
            {/* Desktop: the single /chart link that replaced "Cast it
                again" (Sprint 22). Mobile frame 4 carries a second
                control beside it (Sprint 20, R3) -- its own region
                rather than this one restyled, so the desktop diff stays
                exactly what Sprint 22 shipped. Sprint 24, R6: relabelled
                "Cast a new reading" -> "Cast a new chart" -- this link
                goes back to /chart, i.e. step 1 ("cast the chart") in the
                now-settled vocabulary, not to another "reading" (this
                saved page's own name). */}
            <Link href="/chart" className={`${styles.castButton} ${styles.desktopOnly}`}>
              Cast a new chart
            </Link>
            <div className={`${styles.mobileWrittenFooter} ${styles.mobileOnly}`}>
              <Link href="/chart" className={styles.castButton}>
                Cast a new chart
              </Link>
              <CopyLinkButton />
            </div>
          </>
        )}
        {errorMessage ? (
          <p className={styles.errorNote}>{errorMessage}</p>
        ) : (
          <p className={`${styles.footerNote} ${styles.desktopOnly}`}>
            Written on request from 10 positions and {aspectCount} aspects.
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Mobile frame 4 only (Sprint 20, R3/R6) -- desktop has no copy-link
 * affordance, matching the prototype (the address bar is the only copy
 * path there). Own small piece of local state (copied), unrelated to and
 * not compounding ReadingPanel's own state discussion above -- a
 * separate component with a narrowly-scoped, purely cosmetic concern.
 */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={styles.castButton}
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function IdleBlock() {
  return (
    <div className={styles.idleBlock}>
      <svg viewBox="0 0 40 40" width="34" height="34" className={styles.idleSigil}>
        <circle cx="20" cy="20" r="17" fill="none" stroke="oklch(0.30 0.02 288)" strokeWidth="1" />
        <path d="M20 3 L34 28 L6 28 Z" fill="none" stroke="oklch(0.38 0.03 288)" strokeWidth="1" />
      </svg>
      <p className={styles.idleText}>
        The chart stands as it is. Nothing has been written about it yet —{" "}
        <span className={styles.idleAccent}>write the horoscope</span> when you want the sky held
        to account for the day.
      </p>
    </div>
  );
}

function BusyBlock() {
  return (
    <div className={styles.busyBlock}>
      <div className={styles.busyTop}>
        <svg viewBox="0 0 40 40" width="34" height="34" className={styles.busySigil}>
          <circle cx="20" cy="20" r="17" fill="none" stroke="oklch(0.30 0.02 288)" strokeWidth="1" />
          <path d="M20 3 L34 28 L6 28 Z" fill="none" stroke="oklch(0.70 0.13 145)" strokeWidth="1" />
          <circle cx="20" cy="20" r="3" fill="oklch(0.70 0.13 145)" className={styles.busySigilDot} />
        </svg>
        <div className={styles.busyTextCol}>
          <span className={styles.busyPhrase}>The reading is being written.</span>
          <span className={styles.busyDetail}>gpt-4o-mini · temperature 0.9</span>
        </div>
      </div>
      <div className={styles.skeletonList}>
        {SKELETON_WIDTHS.map((width, i) => (
          <span
            key={i}
            className={styles.skeletonBar}
            style={{ width, animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}
