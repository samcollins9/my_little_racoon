"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  IdleBlock,
  REVEALING_LABEL,
  REVEAL_LABEL,
  ReadingHeader,
  SavedHoroscope,
  aspectsNoteText,
} from "./HoroscopeReveal";
import styles from "./reading.module.css";

const SKELETON_WIDTHS = ["96%", "89%", "93%", "61%", "91%", "74%"];
/** Sprint 24, R7: a retry of a failed generation, not a step in the sequence. Unchanged by Sprint 33. */
const TRY_AGAIN_LABEL = "Try again";
/** Sprint 31, R3: the written state's link to the reading's own date page. */
const DATE_PAGE_LINK_LABEL = "Go to this date";

type Props = {
  hasHoroscope: boolean;
  paragraphs: string[];
  aspectCount: number;
  errorMessage: string | null;
  /** Sprint 33, R4: the page was reached through the landing-revealed URL (./reveal.ts). */
  revealed: boolean;
} & DateLinkProps;

/**
 * Whether the written state links to a date page (Sprint 31, R3).
 *
 * - The date page passes `offerNewChart={false}`. It is already the date
 *   page, so a link there would point at itself (Sprint 28).
 * - /reading/[id] passes `datePageHref`, the path of that reading's own date
 *   page, built from the stored row's event_date. The union makes it
 *   required whenever the link is shown, so the panel can't render a link
 *   with nowhere to go.
 *
 * The prop keeps its Sprint 28 name, `offerNewChart`, even though there is
 * no longer a "new chart" to offer. Renaming it would mean editing the
 * date page's call, and Sprint 31's R6 keeps app/date/ unchanged.
 */
type DateLinkProps =
  | { offerNewChart: false; datePageHref?: never }
  | { offerNewChart?: true; datePageHref: string };

/**
 * The whole of "The reading" panel's dynamic parts (docs/design/HANDOFF_reading_responsive.md),
 * "use client" only because useFormStatus requires a component rendered
 * inside the <form> it reports on (R7) -- page.tsx renders this as the
 * form's child and stays a server component itself.
 *
 * `pending` (useFormStatus) decides idle/busy/saved -- hasHoroscope is
 * computed server-side from reading.horoscope being null, never
 * duplicated client-side. Sprint 33: a saved horoscope renders folded,
 * through SavedHoroscope (./HoroscopeReveal.tsx), whose disclosure needs
 * no client state at all. A second, small state variable (`justWrote`,
 * below) exists only to gate the rise animation; see its own comment for
 * why that isn't the one-state-variable design the handoff describes.
 */
export function ReadingPanel({
  hasHoroscope,
  paragraphs,
  aspectCount,
  errorMessage,
  revealed,
  ...dateLink
}: Props) {
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

  // Sprint 33, R2: one note for both folded states -- the error if a
  // generation just failed, otherwise the aspects note the panel has always
  // shown.
  const note = errorMessage
    ? { text: errorMessage, className: styles.errorNote }
    : { text: aspectsNoteText(aspectCount), className: `${styles.footerNote} ${styles.desktopOnly}` };
  const noteElement = <p className={note.className}>{note.text}</p>;

  // Sprint 33, R2/R3: a saved horoscope is folded on every page load, behind
  // a native disclosure (SavedHoroscope), and unfolds in place. `revealed`
  // (R4) is the landing after a successful generation; it only ever opens a
  // horoscope that is already saved. Sprint 22's rule carries over to the
  // unfolded footer: no regenerate control, a plain link instead, except that
  // a failed generation (R5) still offers "Try again".
  if (!pending && hasHoroscope) {
    return (
      <SavedHoroscope
        paragraphs={paragraphs}
        revealed={revealed}
        rise={justWrote}
        foldedNote={note}
        footer={
          <div className={styles.readingFooter}>
            {errorMessage ? (
              <button type="submit" className={styles.castButton}>
                {TRY_AGAIN_LABEL}
              </button>
            ) : (
              <DateLinks {...dateLink} />
            )}
            {noteElement}
          </div>
        }
      />
    );
  }

  // No saved horoscope, or one being generated. R1: the generate button reads
  // "Reveal the horoscope", "Revealing…" while pending, and "Try again" after
  // a failure (Sprint 24's R7, unchanged). R4: the form posts to the
  // existing server action, which is unchanged apart from where it redirects.
  return (
    <>
      <ReadingHeader status={pending ? "busy" : "idle"} />
      {pending ? <BusyBlock /> : <IdleBlock />}
      <div className={styles.readingFooter}>
        <button type="submit" disabled={pending} className={styles.castButton}>
          {pending ? REVEALING_LABEL : errorMessage ? TRY_AGAIN_LABEL : REVEAL_LABEL}
        </button>
        {noteElement}
      </div>
    </>
  );
}

/**
 * The unfolded footer's links (Sprint 31, R3). The date page passes
 * `offerNewChart={false}` and gets only the mobile copy-link control;
 * /reading/[id] gets the link to its own date page as well.
 */
function DateLinks(dateLink: DateLinkProps) {
  if (dateLink.offerNewChart === false) {
    return (
      <div className={styles.mobileOnly}>
        <CopyLinkButton />
      </div>
    );
  }
  return (
    <>
      {/* Desktop: the single link that replaced "Cast it again"
          (Sprint 22). Mobile frame 4 carries a second control beside
          it (Sprint 20, R3) -- its own region rather than this one
          restyled. Sprint 31, R3: both go to this reading's own date
          page (where its chart, events and navigation live) instead
          of /chart. The label names that destination and says nothing
          about steps or casting. */}
      <Link href={dateLink.datePageHref} className={`${styles.castButton} ${styles.desktopOnly}`}>
        {DATE_PAGE_LINK_LABEL}
      </Link>
      <div className={`${styles.mobileWrittenFooter} ${styles.mobileOnly}`}>
        <Link href={dateLink.datePageHref} className={styles.castButton}>
          {DATE_PAGE_LINK_LABEL}
        </Link>
        <CopyLinkButton />
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
          <span className={styles.busyPhrase}>The horoscope is being revealed.</span>
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
