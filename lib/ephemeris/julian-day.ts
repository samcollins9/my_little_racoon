/**
 * Julian Day for a given instant. 2440587.5 is the JD of the Unix epoch
 * (1970-01-01T00:00:00Z) -- a fixed, exact constant, so this is precise
 * for any date representable by a JS Date, not an approximation.
 */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
