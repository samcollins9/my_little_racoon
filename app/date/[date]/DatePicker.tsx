import { MAX_SUPPORTED_DATE, MIN_SUPPORTED_DATE } from "@/lib/ephemeris/adapter";
import styles from "./date.module.css";

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

/**
 * R7: a plain GET form to /date, no client JavaScript needed -- the same
 * way /chart's form works. /date (app/date/page.tsx) validates the value
 * and redirects to /date/YYYY-MM-DD, or 404s like any other bad date. min
 * and max are the engine's supported range (lib/ephemeris/adapter.ts), so
 * the browser's own picker won't offer anything outside it.
 */
export function DatePicker({ isoDate }: { isoDate: string }) {
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
          max={dateOnly(MAX_SUPPORTED_DATE)}
          required
        />
        <button type="submit" className={styles.pickerButton}>
          Go
        </button>
      </div>
    </form>
  );
}
