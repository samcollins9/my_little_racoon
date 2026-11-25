import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Sprint 53, R1/R2: the reading section's prose runs to the same right edge
// as the event text, so none of its text blocks carries a max-width, at any
// width. Layout itself is measured in the handoff (R5); this keeps a cap
// from creeping back into the rules that had one.

const READING_CSS = readFileSync(join(__dirname, "reading.module.css"), "utf8");
const DATE_CSS = readFileSync(join(__dirname, "..", "..", "date", "[date]", "date.module.css"), "utf8");

/** Every rule body for exactly this selector, in the file and in its media queries. */
function rulesFor(css: string, selector: string): string[] {
  const escaped = selector.replace(/\./g, "\\.");
  return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped} \\{([^}]*)\\}`, "g"))].map((m) => m[1]);
}

const PROSE: [string, string, string][] = [
  ["reading.module.css", ".paragraph", READING_CSS],
  ["reading.module.css", ".idleText", READING_CSS],
  ["reading.module.css", ".accuracyNote", READING_CSS],
  ["reading.module.css", ".disabledNote", READING_CSS],
  ["date.module.css", ".unavailableText", DATE_CSS],
];

describe("reading-section prose has no width cap (Sprint 53)", () => {
  it.each(PROSE)("%s %s: no max-width, at either width", (_, selector, css) => {
    const rules = rulesFor(css, selector);
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule).not.toMatch(/max-width/);
  });

  it("the event text it's measured against has no cap either", () => {
    for (const rule of rulesFor(READING_CSS, ".eventText")) expect(rule).not.toMatch(/max-width/);
  });

  it("R2: the type in those rules is unchanged", () => {
    expect(rulesFor(READING_CSS, ".paragraph")[0]).toMatch(/font-size: 19\.5px;\s*line-height: 1\.62;/);
    expect(rulesFor(READING_CSS, ".paragraph")[1]).toMatch(/font-size: 18px;\s*line-height: 1\.58;/);
    for (const selector of [".idleText", ".accuracyNote"]) {
      expect(rulesFor(READING_CSS, selector)[0]).toMatch(/font-size: 19px;\s*line-height: 1\.55;/);
    }
    expect(rulesFor(DATE_CSS, ".unavailableText")[0]).toMatch(/font-size: 19px;\s*line-height: 1\.55;/);
  });
});
