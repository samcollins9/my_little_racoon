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

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
    <main>
      <h1>Planetary positions</h1>
      <p>
        Geocentric planetary positions for a past date. No account required
        to view them — save one and anyone with the link can open it.
      </p>

      <form method="get">
        <label htmlFor="date">Date</label>
        <br />
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={dateParam}
          min={dateOnly(MIN_SUPPORTED_DATE)}
          max={dateOnly(MAX_SUPPORTED_DATE)}
          required
        />
        <button type="submit">Cast</button>
        <p>
          Supported range: {dateOnly(MIN_SUPPORTED_DATE)} to{" "}
          {dateOnly(MAX_SUPPORTED_DATE)}.
        </p>
      </form>

      {error ? <p role="alert">{error}</p> : null}

      {positions && instant ? (
        <>
          <p>
            Positions calculated for {instant.toISOString()} — every date is
            evaluated at {CALCULATION_HOUR_UTC}:00 UTC, not a specific hour
            you provide.
          </p>
          <table>
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

          <form action={saveReading}>
            <input type="hidden" name="date" value={dateParam} />
            <button type="submit">Save this reading</button>
          </form>
        </>
      ) : null}
    </main>
  );
}
