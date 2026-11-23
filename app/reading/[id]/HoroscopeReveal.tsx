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
/** Folding back (the user chose to allow it, 23 Nov 2026): the summary's label once open. */
export const FOLD_LABEL = "Fold the horoscope away";

export type ReadingStatus = "idle" | "busy";

const STATUS_TEXT: Record<ReadingStatus, string> = {
  idle: "not revealed yet",
  busy: "revealing",
};

/** "The reading" heading and its status label. */
export function ReadingHeader({ status }: { status: ReadingStatus }) {
  return (
    <div className={styles.readingHeader}>
      <h3 className={styles.sectionTitle}>The reading</h3>
      <span
        className={`${styles.readingStatus} ${status === "busy" ? styles.statusBusy : styles.statusIdle}`}
      >
        {STATUS_TEXT[status]}
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
   * Beside the reveal control while folded, where the unsaved state shows its
   * footer note. It is hidden from screen readers here because it sits inside
   * the summary and would otherwise become part of the control's name. The
   * revealed footer carries the same note, readable.
   */
  foldedNote: { text: string; className: string };
  /** The footer once unfolded: the date links, "Try again", or the disabled note. */
  footer: ReactNode;
};

const PARAGRAPH_RISE_STAGGER_S = 0.45;

/**
 * R2/R3: a saved horoscope, folded until the visitor reveals it.
 *
 * - Native <details>/<summary>: unfolding needs no request, no reload, no
 *   URL change and no JavaScript. The summary is keyboard-operable (Enter or
 *   Space) and exposes its expanded or collapsed state to assistive tech
 *   without any ARIA from us.
 * - The saved text is inside the <details>, never outside it. It is in the
 *   HTML, folded: revealing is a presentation step, not access control (the
 *   sprint's Out of Scope).
 * - Folded, the panel shows the same header, IdleBlock, button classes,
 *   label and note as the unsaved state, so a visitor can't tell whether a
 *   horoscope exists. The control is a <summary> here and a submit <button>
 *   there. That difference is unavoidable, since one unfolds and the other
 *   submits. The classes and copy are the same.
 * - Open, the summary becomes the small "fold away" control above the text.
 *   The header status and the IdleBlock follow the open state through
 *   `.revealPanel:has(> details[open])` in reading.module.css. In a browser
 *   without :has() they stay as folded, and the text still unfolds.
 */
export function SavedHoroscope({ paragraphs, revealed, rise = false, foldedNote, footer }: SavedHoroscopeProps) {
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
      <details className={styles.reveal} open={revealed}>
        <summary className={styles.revealSummary}>
          <span className={`${styles.readingFooter} ${styles.revealFolded}`}>
            <span className={styles.castButton}>{REVEAL_LABEL}</span>
            <span className={foldedNote.className} aria-hidden="true">
              {foldedNote.text}
            </span>
          </span>
          <span className={styles.revealFold}>{FOLD_LABEL}</span>
        </summary>
        <div className={styles.writtenBlock}>
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
        {footer}
      </details>
    </div>
  );
}
