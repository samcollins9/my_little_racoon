import { entryMatchesDateYear, fetchDayEventYears } from "../events/wikipedia";
import { linkableEventDate } from "./accuracy";

/**
 * Sprint 41: where `/` lands. Today's UTC month and day, in the latest year
 * that Wikipedia's "On this day" feed has an entry for, so the front door
 * is a date whose events come from that exact year and a horoscope can be
 * written for it (Sprint 39).
 */

/**
 * R1: the date for `today` (a YYYY-MM-DD UTC date), given the years of the
 * feed's entries for today's month and day. The largest year that is
 * - no later than today's year, and
 * - a date the date page accepts (linkableEventDate: an integer year,
 *   1700–2100, and a real date, so 29 February only in a leap year).
 *
 * R2: a candidate must also pass entryMatchesDateYear, the rule
 * fetchDayEvents uses for `matchedYear`, so the chosen date is writable by
 * construction rather than by two rules happening to agree.
 *
 * R3: `today` itself when the feed couldn't be read (null), is empty, or
 * has no qualifying year.
 */
export function frontDoorDateFromYears(years: readonly number[] | null, today: string): string {
  const todayYear = Number(today.split("-")[0]);
  let best: { year: number; date: string } | null = null;
  for (const year of years ?? []) {
    if (year > todayYear || (best && year <= best.year)) continue;
    const date = linkableEventDate(year, today);
    if (date && entryMatchesDateYear(year, date)) best = { year, date };
  }
  return best?.date ?? today;
}

/**
 * R1–R3 and R5: reads the feed through fetchDayEventYears, the Wikipedia
 * module's own cached fetch. It never throws, so neither does this.
 * `fetchYears` is a parameter for tests only.
 */
export async function frontDoorDate(
  today: string,
  fetchYears: (isoDate: string) => Promise<readonly number[] | null> = fetchDayEventYears
): Promise<string> {
  return frontDoorDateFromYears(await fetchYears(today), today);
}
