import Link from "next/link";
import { FUTURE_DATE_MESSAGE, datePagePath } from "@/lib/date-page/params";
import type { DayNavigation } from "@/lib/date-page/navigation";
import { formatLongDateText } from "@/app/reading/[id]/format";
import styles from "./date.module.css";

/**
 * Sprint 29, R2/R6: the navigation directly under the date picker, so
 * finding another date happens in one place. Dates only, no horoscope text.
 *
 * Sprint 47, R5: Previous day / Next day, one calendar day either side.
 * They replaced Sprint 29's links between written readings, in the same
 * place and style. Pure date arithmetic (dayNavigation), so they render
 * whatever the database is doing.
 * - No "Previous day" on the engine's first supported date.
 * - On today's page "Next day" is shown disabled: not a link and not
 *   focusable, aria-disabled, with "Reloy predicts only the past." as
 *   visible text in place of a date, so phones see it too.
 *
 * Sprint 50: Sprint 45's desktop "Other notable dates" no longer follows
 * here; it's at the foot of the card (NotableDatesPanel), so this strip
 * holds only navigation.
 */
export function DateNavigation({ navigation }: { navigation: DayNavigation }) {
  const { previous, next } = navigation;

  return (
    <div className={styles.dateNav}>
      <nav className={styles.adjacent} aria-label="Previous and next day">
        {previous ? (
          <Link
            href={datePagePath(previous)}
            className={styles.adjacentLink}
            rel="prev"
            prefetch={false}
          >
            <span className={styles.adjacentLabel}>&larr; Previous day</span>
            <span className={styles.adjacentDate}>{formatLongDateText(previous)}</span>
          </Link>
        ) : null}
        {next?.kind === "link" ? (
          <Link
            href={datePagePath(next.date)}
            className={`${styles.adjacentLink} ${styles.adjacentNext}`}
            rel="next"
            prefetch={false}
          >
            <span className={styles.adjacentLabel}>Next day &rarr;</span>
            <span className={styles.adjacentDate}>{formatLongDateText(next.date)}</span>
          </Link>
        ) : next?.kind === "future" ? (
          <span
            className={`${styles.adjacentLink} ${styles.adjacentNext} ${styles.adjacentDisabled}`}
            role="link"
            aria-disabled="true"
          >
            <span className={styles.adjacentLabel}>Next day &rarr;</span>
            <span className={styles.adjacentNote}>{FUTURE_DATE_MESSAGE}</span>
          </span>
        ) : null}
      </nav>
    </div>
  );
}
