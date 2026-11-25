import Link from "next/link";
import { datePagePath } from "@/lib/date-page/params";
import readingStyles from "@/app/reading/[id]/reading.module.css";
import styles from "./date.module.css";

/**
 * Sprint 47, R6: "Discover random reading". The page picks one date per
 * request (loadRandomReadingDate) and passes that same date to both
 * copies, so they can never point at different readings:
 *
 * - desktop (>900px): on the picker row, after Go and an "or"
 *   (DatePicker, through RandomReadingLink);
 * - phones (<=900px): RandomReadingSection, at the bottom of the card,
 *   after the reading section and its sticky reveal (Sprint 38) and
 *   directly above Sprint 45's "Other notable dates".
 *
 * Either copy, and the picker row's "or", renders only when there's a date.
 */

/** The link itself: Go's own rule set (.pickerButton) plus what an <a> needs. */
export function RandomReadingLink({ date }: { date: string }) {
  return (
    <Link
      href={datePagePath(date)}
      className={`${styles.pickerButton} ${styles.pickerLink}`}
      prefetch={false}
    >
      Discover random reading
    </Link>
  );
}

/** The phone copy, the card's own section at the foot of the page. */
export function RandomReadingSection({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <div className={`${styles.randomSection} ${readingStyles.mobileOnly}`}>
      <RandomReadingLink date={date} />
    </div>
  );
}
