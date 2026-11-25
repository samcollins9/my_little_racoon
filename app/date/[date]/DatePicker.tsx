import Link from "next/link";
import { MIN_SUPPORTED_DATE } from "@/lib/ephemeris/adapter";
import { datePagePath } from "@/lib/date-page/params";
import styles from "./date.module.css";

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

/**
 * R7: a plain GET form to /date, no client JavaScript needed -- the same
 * way /chart's form works. /date (app/date/page.tsx) validates the value
 * and redirects to /date/YYYY-MM-DD, or 404s like any other bad date.
 *
 * Sprint 47:
 * - R3: `max` is today (UTC), worked out per request by the page, so the
 *   browser's own picker offers nothing in the future; `min` is still the
 *   engine's first supported date. A page left open past midnight UTC
 *   keeps yesterday's max; the server's redirect (R2) is the real guard.
 * - R6: "Discover random reading" follows Go, after an "or", as a link
 *   (it navigates). It shares Go's style rules (.pickerButton) rather than
 *   copying them. With no date to offer (lookup failed, or nothing left
 *   after filtering) neither the link nor its "or" renders.
 */
export function DatePicker({
  isoDate,
  today,
  randomDate,
}: {
  isoDate: string;
  /** utcToday() for this request. */
  today: string;
  /** A recently written reading's date, or null to leave the link out. */
  randomDate: string | null;
}) {
  return (
    <form method="get" action="/date" className={styles.picker}>
      <label className={styles.pickerLabel} htmlFor="date-page-picker">
        Another date
      </label>
      <div className={styles.pickerControls}>
        <input
          id="date-page-picker"
          name="date"
          type="date"
          className={styles.pickerInput}
          defaultValue={isoDate}
          min={dateOnly(MIN_SUPPORTED_DATE)}
          max={today}
          required
        />
        <button type="submit" className={styles.pickerButton}>
          Go
        </button>
        {randomDate ? (
          <>
            <span className={styles.pickerOr}>or</span>
            <Link
              href={datePagePath(randomDate)}
              className={`${styles.pickerButton} ${styles.pickerLink}`}
              prefetch={false}
            >
              Discover random reading
            </Link>
          </>
        ) : null}
      </div>
    </form>
  );
}
