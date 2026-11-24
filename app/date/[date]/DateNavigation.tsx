import Link from "next/link";
import { datePagePath } from "@/lib/date-page/params";
import type { DateNavigation as DateNavigationData } from "@/lib/date-page/navigation";
import { formatLongDateText } from "@/app/reading/[id]/format";
import readingStyles from "@/app/reading/[id]/reading.module.css";
import { NotableDatesStrip } from "./NotableDates";
import styles from "./date.module.css";

/**
 * Sprint 29, R2/R6: the navigation directly under the date picker, so
 * finding another date happens in one place. Dates only, no horoscope text.
 *
 * Previous/Next reading (Sprint 29, unchanged by Sprint 45, R7): a missing
 * side renders nothing rather than a disabled placeholder, and both go
 * when the lookup is unavailable (R4), with no notice of their own, so
 * Sprint 28's R6 notice stays the only one.
 *
 * Sprint 45: "Other notable dates" replaced the recent-readings list. On desktop
 * it's here, and it renders even when the lookup is unavailable, since it
 * needs no database (R2). On phones it's at the bottom of the page
 * instead (NotableDatesSection), so with no Previous/Next the strip has
 * nothing to show at that width.
 */
export function DateNavigation({
  navigation,
  isoDate,
}: {
  navigation: DateNavigationData;
  /** The page's own date, marked rather than linked in the notable list. */
  isoDate: string;
}) {
  const previous = navigation.kind === "available" ? navigation.previous : null;
  const next = navigation.kind === "available" ? navigation.next : null;
  const hasAdjacent = previous !== null || next !== null;

  return (
    <div className={hasAdjacent ? styles.dateNav : `${styles.dateNav} ${readingStyles.desktopOnly}`}>
      {hasAdjacent ? (
        <nav className={styles.adjacent} aria-label="Previous and next readings">
          {previous ? (
            <Link
              href={datePagePath(previous)}
              className={styles.adjacentLink}
              rel="prev"
              prefetch={false}
            >
              <span className={styles.adjacentLabel}>&larr; Previous reading</span>
              <span className={styles.adjacentDate}>{formatLongDateText(previous)}</span>
            </Link>
          ) : null}
          {next ? (
            <Link
              href={datePagePath(next)}
              className={`${styles.adjacentLink} ${styles.adjacentNext}`}
              rel="next"
              prefetch={false}
            >
              <span className={styles.adjacentLabel}>Next reading &rarr;</span>
              <span className={styles.adjacentDate}>{formatLongDateText(next)}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      <NotableDatesStrip isoDate={isoDate} />
    </div>
  );
}
