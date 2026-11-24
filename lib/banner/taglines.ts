/**
 * Sprint 43, R7: the banner's 19 taglines, verbatim from the sprint file and
 * docs/design/banner_variations.html's BYLINES (the two are identical,
 * including the curly apostrophes in number 16). A constant in code, not a
 * data file read at runtime.
 */
export const TAGLINES = [
  "Yesterday a fortune awaits",
  "The uncertainties of yesterday are the certainties of tomorrow, as understood today.",
  "Fortune reveals itself most clearly to those who have already experienced it.",
  "The stars foretell that which time has graciously confirmed.",
  "What fate has already bestowed, the heavens need only reveal.",
  "The wise consult the heavens before drawing conclusions about what has already occurred.",
  "The wheel of fortune turns most accurately in the direction of its previous rotation.",
  "When the celestial bodies are in agreement with yesterday, the destiny of man becomes without doubt.",
  "The future of the past is seldom concealed from the properly aligned heavens.",
  "He who understands the arrival of yesterday need not fear its approaching.",
  "Only through the backward illumination of fortune can destiny become previously apparent.",
  "The stars do not alter what has been, but provide certainty in its having become.",
  "Discover what destiny had in store for you.",
  "Ancient wisdom. Unprecedented hindsight.",
  "Unlock the mysteries of what was to be.",
  "Tomorrow’s wisdom for yesterday’s uncertainties.",
  "Revealing the inevitable, one occurrence at a time.",
  "Let the heavens confirm your suspicions.",
  "For every yesterday, a prophecy awaits.",
] as const;

export type Tagline = (typeof TAGLINES)[number];

/**
 * R8: one tagline per page load, picked on the server. `random` is the
 * random source, a function returning a number in [0, 1) the way
 * Math.random does. It's a parameter so tests can pin each index; the
 * pages pass Math.random.
 *
 * Defensive about a source that breaks its contract: a value of 1 or more
 * gives the last tagline, and a negative or non-finite value (NaN) gives the
 * first, so this always returns a member of the list and never undefined.
 */
export function pickTagline(random: () => number): Tagline {
  const value = random();
  const index = Number.isFinite(value)
    ? Math.min(TAGLINES.length - 1, Math.max(0, Math.floor(value * TAGLINES.length)))
    : 0;
  return TAGLINES[index];
}
