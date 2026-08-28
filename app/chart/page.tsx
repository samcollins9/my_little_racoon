import {
  CALCULATION_HOUR_UTC,
  DateInputError,
  MAX_SUPPORTED_DATE,
  MIN_SUPPORTED_DATE,
  calculationInstantForDate,
  computePositions,
  type PlanetPosition,
} from "@/lib/ephemeris/adapter";
import { saveReading } from "./actions";
import { FlowIndicator } from "@/app/components/FlowIndicator";
import styles from "./chart.module.css";

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Sprint 23: a minimal restyle into Sprint 19's design language --
// tokens, fonts, spacing only. No constellation, no scrub, no hover, no
// aspect table (R5); this page still computes and shows exactly what it
// did before, unchanged (Out of Scope). Stays a server component (R6):
// nothing here needs client state.
export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const { date: dateParam, error: saveError } = await searchParams;

  let positions: PlanetPosition[] | null = null;
  let instant: Date | null = null;
  let error: string | null = saveError ?? null;

  if (dateParam) {
    try {
      instant = calculationInstantForDate(dateParam);
      positions = computePositions(instant);
    } catch (err) {
      error = err instanceof DateInputError ? err.message : "Something went wrong with that date.";
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <h1 className={styles.heading}>Planetary positions</h1>
        {/* Sprint 24, R2/R3: state comes from `positions` -- the same
            variable the results table below already depends on -- so
            casting a chart advances this indicator to step 2 on this same
            page. Nothing here is client state. */}
        <div className={styles.flowSlot}>
          <FlowIndicator completedSteps={positions ? 1 : 0} />
        </div>
        {/* R9: the sharing-model sentence dropped, 23 Aug 2026 -- noise on
            an entry page, not reassurance. Rest of the intro unchanged. */}
        <p className={styles.intro}>Geocentric planetary positions for a past date.</p>

        <form method="get" className={styles.formGroup}>
          <label className={styles.label} htmlFor="date">
            Date
          </label>
          <input
            id="date"
            name="date"
            className={styles.dateInput}
            type="date"
            defaultValue={dateParam}
            min={dateOnly(MIN_SUPPORTED_DATE)}
            max={dateOnly(MAX_SUPPORTED_DATE)}
            required
          />
          <button type="submit" className={styles.button}>
            Cast the chart
          </button>
        </form>
        <p className={styles.fineprint}>
          Supported range: {dateOnly(MIN_SUPPORTED_DATE)} to {dateOnly(MAX_SUPPORTED_DATE)}.
        </p>

        {error ? (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        ) : null}

        {positions && instant ? (
          <div className={styles.resultsSection}>
            <p className={styles.resultsIntro}>
              Positions calculated for {instant.toISOString()} — every date is evaluated at{" "}
              {CALCULATION_HOUR_UTC}:00 UTC, not a specific hour you provide.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Body</th>
                  <th>Sign</th>
                  <th>Degree</th>
                  <th>Retrograde</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.body}>
                    <td>{position.body}</td>
                    <td>{position.sign}</td>
                    <td>{position.degreeInSign.toFixed(2)}&deg;</td>
                    <td>{position.retrograde ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <form action={saveReading} className={styles.saveForm}>
              <input type="hidden" name="date" value={dateParam} />
              <button type="submit" className={styles.button}>
                See the full reading
              </button>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
