import type { ReactNode } from "react";
import styles from "./reading.module.css";

/**
 * Sprint 33: the reading panel's shared, presentation-only pieces. Nothing
 * here uses state, effects or event handlers, so it renders the same on the
 * server, in the client ReadingPanel, and with JavaScript disabled.
 * DisabledReadingSection (a server component) and ReadingPanel (a client
 * component) both import it.
 */

/** R1: the one control label, in both folded states. */
export const REVEAL_LABEL = "Reveal the horoscope";
/** R1: the pending label on the generate button. */
export const REVEALING_LABEL = "Revealing…";
/** Folding back (the user chose to allow it, 23 Nov 2026): the toggle's label once open (Sprint 56). */
export const FOLD_LABEL = "Fold the horoscope away";

export type ReadingStatus = "idle" | "busy";

const STATUS_TEXT: Record<ReadingStatus, string> = {
  idle: "not revealed yet",
  busy: "revealing",
};

/**
 * "The reading" heading and its status label. `label` replaces the status's
 * own text where a state has no generation status to report (Sprint 39's
 * accuracy messages); the status still decides the label's style.
 */
export function ReadingHeader({ status, label }: { status: ReadingStatus; label?: string }) {
  return (
    <div className={styles.readingHeader}>
      <h3 className={styles.sectionTitle}>The reading</h3>
      <span
        className={`${styles.readingStatus} ${status === "busy" ? styles.statusBusy : styles.statusIdle}`}
      >
        {label ?? STATUS_TEXT[status]}
      </span>
    </div>
  );
}

/** R1/R2: the folded state's sentence, the same whether or not a horoscope is saved. */
export function IdleBlock() {
  return (
    <div className={styles.idleBlock}>
      <svg viewBox="0 0 40 40" width="34" height="34" className={styles.idleSigil}>
        <circle cx="20" cy="20" r="17" fill="none" stroke="oklch(0.30 0.02 288)" strokeWidth="1" />
        <path d="M20 3 L34 28 L6 28 Z" fill="none" stroke="oklch(0.38 0.03 288)" strokeWidth="1" />
      </svg>
      <p className={styles.idleText}>
        The chart stands as it is. Nothing has been revealed about it yet —{" "}
        <span className={styles.idleAccent}>reveal the horoscope</span> when you want the sky held
        to account for the day.
      </p>
    </div>
  );
}

/** The footer's note when nothing is wrong: the same text the panel has always shown. */
export function aspectsNoteText(aspectCount: number): string {
  return `Revealed on request from 10 positions and ${aspectCount} aspects.`;
}

type SavedHoroscopeProps = {
  paragraphs: string[];
  /** R4: start unfolded, for the landing after a successful generation. */
  revealed: boolean;
  /** The rise animation (Sprint 20, R8), only right after a generation in this tab. */
  rise?: boolean;
  /**
   * The footer row's note, in both states: the aspects note, the error after
   * a failed generation, or the disabled note. It sits beside the toggle,
   * outside the <summary>, so it's never part of the toggle's name.
   */
  note: { text: string; className: string };
  /**
   * Footer controls after the toggle, shown only while open: the date-page
   * link on /reading/[id], or "Try again" after a failed generation.
   */
  controls?: ReactNode;
};

const PARAGRAPH_RISE_STAGGER_S = 0.45;

/** Sprint 56, R2: the paragraphs' id, which the toggle names in aria-controls. One saved horoscope per page. */
export const SAVED_TEXT_ID = "saved-horoscope-text";

/**
 * R2/R3 (Sprint 33), reworked as one toggle by Sprint 56: a saved
 * horoscope, folded until the visitor reveals it.
 *
 * - One toggle, in one place (Sprint 56, R1). It's the first control in the
 *   reading's footer row in both states, styled as .castButton, and reads
 *   REVEAL_LABEL folded and FOLD_LABEL open. Only the label for the current
 *   state is rendered (the other is display: none), so the control's name
 *   always matches what's on screen.
 * - Still native <details>/<summary> (Sprint 56, R2): opening and closing
 *   needs no request, no reload, no URL change and no JavaScript. The
 *   summary is keyboard-operable (Enter or Space) and exposes its expanded
 *   or collapsed state to assistive tech without any ARIA from us.
 * - The <details> holds only the toggle. <summary> has to be its first
 *   child, so a disclosure that also held the text would put the toggle
 *   above it. Instead the paragraphs come first, as a sibling, and the
 *   footer row follows. DOM order, focus order and what's on screen then all
 *   agree when open: paragraphs, toggle, then any other footer control
 *   (Sprint 56, R3). The summary names the paragraphs in aria-controls.
 * - The saved text is in the HTML in both states. Folded, CSS hides it,
 *   keyed on the details' state: `.revealPanel:has(.reveal:not([open]))` in
 *   reading.module.css. Revealing is a presentation step, not access control
 *   (Sprint 33's Out of Scope). A browser without :has() shows the text
 *   always, rather than never.
 * - Folded, the panel shows the same header, IdleBlock, button classes,
 *   label and note as the unsaved state, so a visitor can't tell whether a
 *   horoscope exists. The control is a <summary> here and a submit <button>
 *   there. That difference is unavoidable, since one unfolds and the other
 *   submits. The classes and copy are the same.
 * - The header status and the IdleBlock follow the open state through the
 *   same :has() rules.
 */
export function SavedHoroscope({ paragraphs, revealed, rise = false, note, controls }: SavedHoroscopeProps) {
  return (
    <div className={styles.revealPanel}>
      <div className={styles.readingHeader}>
        <h3 className={styles.sectionTitle}>The reading</h3>
        <span className={`${styles.readingStatus} ${styles.statusIdle} ${styles.whenFolded}`}>
          {STATUS_TEXT.idle}
        </span>
        <span className={`${styles.readingStatus} ${styles.statusWritten} ${styles.whenRevealed}`}>
          revealed
        </span>
      </div>
      <div className={styles.whenFolded}>
        <IdleBlock />
      </div>
      <div id={SAVED_TEXT_ID} className={`${styles.writtenBlock} ${styles.revealText}`}>
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className={rise ? `${styles.paragraph} ${styles.paragraphRise}` : styles.paragraph}
            style={rise ? { animationDelay: `${i * PARAGRAPH_RISE_STAGGER_S}s` } : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>
      <div className={styles.readingFooter}>
        <details className={styles.reveal} open={revealed}>
          <summary className={styles.revealSummary} aria-controls={SAVED_TEXT_ID}>
            <span className={styles.castButton}>
              <span className={styles.labelFolded}>{REVEAL_LABEL}</span>
              <span className={styles.labelOpen}>{FOLD_LABEL}</span>
            </span>
          </summary>
        </details>
        {controls ? <div className={styles.revealControls}>{controls}</div> : null}
        <p className={note.className}>{note.text}</p>
      </div>
    </div>
  );
}
