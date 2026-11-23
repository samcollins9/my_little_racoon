/**
 * Sprint 33, R4: how a visitor lands with a just-generated horoscope already
 * unfolded. Both server actions redirect to `withRevealed(path)` on success,
 * and both pages pass `isLandingRevealed(searchParams.revealed)` to the panel.
 *
 * The parameter is presentation only. A page reads it to decide whether the
 * saved horoscope's <details> starts open, and does nothing else with it.
 * Loading a URL that carries it never generates, writes or calls OpenAI, and
 * on a date or reading with no horoscope it has no effect, because there's
 * no disclosure to open.
 *
 * Kept free of imports so the actions ("use server"), the pages and the
 * tests all share one spelling of the parameter.
 */
export const REVEALED_PARAM = "revealed";

/** `path` with the landing-revealed parameter. `path` must carry no query string of its own. */
export function withRevealed(path: string): string {
  return `${path}?${REVEALED_PARAM}=1`;
}

/**
 * Exactly one value, "1". Anything else, including a repeated parameter
 * (which Next hands over as an array), is folded.
 */
export function isLandingRevealed(value: string | string[] | undefined): boolean {
  return value === "1";
}
