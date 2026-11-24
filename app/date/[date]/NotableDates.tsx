import Link from "next/link";
import { NOTABLE_DATES } from "@/lib/date-page/notable-dates";
import { datePagePath } from "@/lib/date-page/params";
import { formatLongDateText } from "@/app/reading/[id]/format";
import readingStyles from "@/app/reading/[id]/reading.module.css";
import styles from "./date.module.css";

/**
 * Sprint 45: "Other notable dates", the fixed list from
 * lib/date-page/notable-dates.ts. Two copies, one display:none at each
 * width, the same way ReadingView renders its two constellations:
 *
 * - NotableDatesStrip (R3), desktop only: in the strip under the date
 *   picker, where Sprint 29's recent-readings list was, each description a
 *   tooltip on hover and on keyboard focus.
 * - NotableDatesSection (R4), phones only: at the bottom of the page,
 *   after the reading section, each description a visible line.
 *
 * Neither needs the database (R2). On either, the page's own date is
 * marked with aria-current and not linked (R5), and keeps its description.
 */

const HEADING = "Other notable dates";

export function NotableDatesStrip({ isoDate }: { isoDate: string }) {
  const headingId = "notable-dates-strip-heading";
  return (
    <nav
      className={`${styles.notableStrip} ${readingStyles.desktopOnly}`}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className={styles.navTitle}>
        {HEADING}
      </h2>
      <ol className={styles.notableList}>
        {NOTABLE_DATES.map(({ isoDate: date, description }) => {
          // R3: the tooltip is the link's accessible description, so a screen
          // reader announces it with the link. It's visibility:hidden until
          // hover or focus (date.module.css), which aria-describedby still reads.
          const tooltipId = `notable-tooltip-${date}`;
          const label = formatLongDateText(date);
          return (
            <li key={date} className={styles.notableItem}>
              {date === isoDate ? (
                <span
                  className={styles.notableCurrent}
                  aria-current="page"
                  aria-describedby={tooltipId}
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={datePagePath(date)}
                  className={styles.notableLink}
                  aria-describedby={tooltipId}
                  prefetch={false}
                >
                  {label}
                </Link>
              )}
              <span id={tooltipId} role="tooltip" className={styles.notableTooltip}>
                {description}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function NotableDatesSection({ isoDate }: { isoDate: string }) {
  const headingId = "notable-dates-section-heading";
  return (
    <nav
      className={`${styles.notableSection} ${readingStyles.mobileOnly}`}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className={readingStyles.sectionTitle}>
        {HEADING}
      </h2>
      <ol className={styles.notableSectionList}>
        {NOTABLE_DATES.map(({ isoDate: date, description }) => {
          // R4: date and description both inside the link, so the whole
          // two-line row is the tap target and the description is part of
          // the link's accessible name.
          const content = (
            <>
              <span className={styles.notableSectionDate}>{formatLongDateText(date)}</span>
              <span className={styles.notableSectionDescription}>{description}</span>
            </>
          );
          return (
            <li key={date}>
              {date === isoDate ? (
                <span
                  className={`${styles.notableSectionRow} ${styles.notableSectionCurrent}`}
                  aria-current="page"
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={datePagePath(date)}
                  className={`${styles.notableSectionRow} ${styles.notableSectionLink}`}
                  prefetch={false}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
