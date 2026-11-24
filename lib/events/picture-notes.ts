/**
 * Sprint 42: Wikipedia's "On this day" text marks which item the day's
 * picture shows -- "(pictured)", "(fragment pictured)", "(signing
 * pictured)". We never show Wikipedia's images, so the note points at
 * nothing, for the visitor or for the model writing the horoscope.
 *
 * Applied where event text is shown (ReadingView) and where it's sent to
 * the model (lib/llm/horoscope.ts), never to the stored payload: stored
 * `events` stay exactly as Wikipedia gave them, so old and new rows behave
 * the same and nothing needs migrating.
 *
 * Pure, with no imports, so the page and the prompt share one definition.
 */

/**
 * One parenthesised group, with no parentheses of its own inside, that
 * contains the whole word "pictured" in any capitals -- plus the whitespace
 * just before it. Taking that whitespace (rather than the whitespace after)
 * is what keeps "Foo (pictured), bar" from becoming "Foo , bar".
 *
 * `\b` keeps "(unpictured)" and "(picturedness)" out; `[^()]` keeps a match
 * inside one set of parentheses, so "A (b (pictured) c) d" loses only the
 * inner group and never swallows the outer one's text.
 */
const PICTURE_NOTE = /\s*\([^()]*\bpictured\b[^()]*\)/gi;

/**
 * `text` without its "(… pictured …)" notes. Text with no such note comes
 * back unchanged, the identical string; text with one is tidied: no doubled
 * spaces, and no leading or trailing whitespace.
 */
export function stripPictureNotes(text: string): string {
  const stripped = text.replace(PICTURE_NOTE, "");
  if (stripped === text) return text;
  return stripped.replace(/ {2,}/g, " ").trim();
}
