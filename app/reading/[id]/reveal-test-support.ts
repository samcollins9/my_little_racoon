/**
 * Sprint 56: what a sighted visitor sees of a saved horoscope, folded or
 * open, modelled on reading.module.css's rules for the toggle's state.
 * Server-rendered markup holds everything in both states; CSS hides the
 * rest. Each class below is `display: none` in the state named:
 *
 * - folded: `.revealText` (the paragraphs), `.revealControls` (the date link
 *   or "Try again"), `.labelOpen` and `.whenRevealed`.
 * - open: `.labelFolded` and `.whenFolded` (the "not revealed yet" status and
 *   the IdleBlock).
 *
 * Shared by ReadingPanel.test.ts and toggle-pages.test.ts. Named without
 * `.test.` so vitest doesn't collect it as a suite.
 */

const HIDDEN: Record<"folded" | "open", string[]> = {
  folded: ["revealText", "revealControls", "labelOpen", "whenRevealed"],
  open: ["labelFolded", "whenFolded"],
};

/** Removes every element whose class list contains `className`, with its whole subtree. */
function dropElements(html: string, className: string): string {
  const opening = new RegExp(`<([a-z]+)\\b[^>]*\\sclass="[^"]*${className}[^"]*"[^>]*>`, "g");
  let out = html;
  for (;;) {
    opening.lastIndex = 0;
    const m = opening.exec(out);
    if (!m) return out;
    const tag = m[1];
    // Balance same-named tags to find this element's own closing tag.
    const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = -1;
    for (let t = tags.exec(out); t; t = tags.exec(out)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = t.index + t[0].length;
        break;
      }
    }
    if (end < 0) throw new Error(`unbalanced <${tag}> for class ${className}`);
    out = out.slice(0, m.index) + out.slice(end);
  }
}

export function visibleWhen(html: string, state: "folded" | "open"): string {
  return HIDDEN[state].reduce(dropElements, html);
}

/** Every <summary> in the markup: there must be exactly one per saved horoscope. */
export const summaries = (html: string): string[] => html.match(/<summary[\s\S]*?<\/summary>/g) ?? [];

/** The <details> element's opening tag. */
export const detailsTag = (html: string): string | null => html.match(/<details[^>]*>/)?.[0] ?? null;
