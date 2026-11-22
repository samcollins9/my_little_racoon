import Link from "next/link";
import { datePagePath } from "@/lib/date-page/params";
import type {
  DateNavigation as DateNavigationData,
  RecentReadingDate,
} from "@/lib/date-page/navigation";
import { formatLongDate } from "@/app/reading/[id]/format";
import readingStyles from "@/app/reading/[id]/reading.module.css";
import styles from "./date.module.css";

/** "1969-07-20" -> "20 July 1969": the date band's long-date format, as one string. */
function longDateText(isoDate: string): string {
  const { day, month, year } = formatLongDate(isoDate);
  return `${day} ${month} ${year}`;
}

/**
 * Sprint 29, R2/R3/R6: links to other dates that have a saved horoscope,
 * rendered directly under the date picker so finding another date happens
 * in one place. Dates only, no horoscope text (R1).
 *
 * Renders nothing at all when the lookups are unavailable (R4) -- no
 * notice of its own, so Sprint 28's R6 notice stays the only one -- or
 * when there is nothing to show. A missing previous/next side renders
 * nothing rather than a disabled placeholder (R2), and the current page's
 * own date in the recent list is marked with aria-current, not linked
 * (R3).
 */
export function DateNavigation({ navigation }: { navigation: DateNavigationData }) {
  if (navigation.kind === "unavailable") return null;
  const { previous, next, recent } = navigation;
  if (!previous && !next && recent.length === 0) return null;

  return (
    <nav className={styles.dateNav} aria-label="Dates with readings">
      {previous || next ? (
        <div className={styles.adjacent}>
          {previous ? (
            <Link
              href={datePagePath(previous)}
              className={styles.adjacentLink}
              rel="prev"
              prefetch={false}
            >
              <span className={styles.adjacentLabel}>&larr; Previous reading</span>
              <span className={styles.adjacentDate}>{longDateText(previous)}</span>
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
              <span className={styles.adjacentDate}>{longDateText(next)}</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      {recent.length > 0 ? (
        <>
          {/* Desktop: the list in full. Mobile: the same list behind a
              native disclosure -- the mobile card is a fixed-height column
              (reading.module.css), and twenty wrapped dates in this strip
              would squeeze the chart and the reading below it. Two copies,
              one display:none at each width, the same way ReadingView
              renders its two constellations. */}
          <div className={`${styles.recent} ${readingStyles.desktopOnly}`}>
            <h2 className={styles.recentTitle}>Recently written</h2>
            <RecentList recent={recent} />
          </div>
          <details className={`${styles.recent} ${readingStyles.mobileOnly}`}>
            <summary className={`${styles.recentTitle} ${styles.recentSummary}`}>
              Recently written ({recent.length})
            </summary>
            <RecentList recent={recent} />
          </details>
        </>
      ) : null}
    </nav>
  );
}

/** R3: newest written first; the current page's own date is marked, never linked. */
function RecentList({ recent }: { recent: RecentReadingDate[] }) {
  return (
    <ol className={styles.recentList}>
      {recent.map(({ isoDate, isCurrent }) => (
        <li key={isoDate}>
          {isCurrent ? (
            <span className={styles.recentCurrent} aria-current="page">
              {longDateText(isoDate)}
            </span>
          ) : (
            <Link href={datePagePath(isoDate)} className={styles.recentLink} prefetch={false}>
              {longDateText(isoDate)}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}
