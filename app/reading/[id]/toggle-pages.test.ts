import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { FOLD_LABEL, REVEAL_LABEL, SAVED_TEXT_ID } from "./HoroscopeReveal";
import { NAVIGATION_RPCS, ok, renderDatePage, renderReadingPage, useAnon } from "./page-test-support";
import { detailsTag, summaries, visibleWhen } from "./reveal-test-support";

// Sprint 56, R1-R6/R8: one toggle for a saved horoscope, through the real
// page components on both routes, rendered on the server -- which is also
// what a visitor with JavaScript disabled gets. What's visible in each state
// is modelled from reading.module.css (reveal-test-support.ts).

vi.mock("@/lib/supabase/anon-client", () => ({ createAnonClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin client created during a render");
  }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const DATE = "1969-07-20";
const READING_ID = "56565656-5656-4656-8656-565656565656";
const FIRST = "The sky held its breath.";
const LAST = "Mars leans on the door.";
const DATE_LINK = /<a [^>]*href="\/date\/1969-07-20"[^>]*>Go to this date<\/a>/;

const storedRow = {
  id: READING_ID,
  event_date: DATE,
  positions: computePositions(calculationInstantForDate(DATE)),
  events: { matchedYear: true, events: [{ year: 1969, text: "Apollo 11 lands on the Moon." }] },
  horoscope: `${FIRST}\n\n${LAST}`,
};

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unexpected fetch", { status: 500 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The visible text of an element's markup, tags stripped. */
const text = (html: string) => html.replace(/<[^>]+>/g, "");

/** "The reading" section only: from its heading to the section's end (the date page has more controls after it). */
function readingSection(html: string): string {
  const start = html.indexOf(">The reading</h3>");
  return html.slice(start, html.indexOf("</section>", start));
}

/** Every focusable element in the markup, in order, as a short label. */
function focusOrder(html: string): string[] {
  return [...html.matchAll(/<(summary|a|button)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(
    (m) => `${m[1]}:${text(m[2])}`
  );
}

const ROUTES: [string, (revealed: boolean) => Promise<string>, boolean][] = [
  [
    "/date/[date]",
    (revealed) => {
      useAnon({ get_reading_by_date: ok([storedRow]), ...NAVIGATION_RPCS });
      return renderDatePage(DATE, revealed ? { revealed: "1" } : {});
    },
    false,
  ],
  [
    "/reading/[id]",
    (revealed) => {
      useAnon({ get_reading_by_id: ok([storedRow]) });
      return renderReadingPage(READING_ID, revealed ? { revealed: "1" } : {});
    },
    true,
  ],
];

describe.each(ROUTES)("%s: one toggle (Sprint 56)", (_, render, hasDateLink) => {
  it("R1: folded, one toggle reading \"Reveal the horoscope\", the first control in the footer row", async () => {
    const html = await render(false);
    const folded = visibleWhen(html, "folded");

    expect(detailsTag(html)).not.toMatch(/\sopen/);
    expect(summaries(html)).toHaveLength(1);
    expect(text(summaries(folded)[0])).toBe(REVEAL_LABEL);
    // The footer row starts with the details: nothing comes before the toggle in it.
    expect(html).toMatch(/<div class="[^"]*readingFooter[^"]*"><details\b/);
    expect(folded).not.toContain(LAST);
  });

  it("R1/R3: open, the same toggle reads \"Fold the horoscope away\", after the paragraphs, and nothing else folds", async () => {
    const html = await render(true);
    const open = visibleWhen(html, "open");

    expect(detailsTag(html)).toMatch(/\sopen=""/);
    expect(summaries(html)).toHaveLength(1);
    expect(text(summaries(open)[0])).toBe(FOLD_LABEL);
    // One toggle element: the fold label appears inside the summary and nowhere else.
    expect(html.match(new RegExp(FOLD_LABEL, "g"))).toHaveLength(1);
    // After the text, in the markup and so in reading and focus order.
    expect(open.indexOf(LAST)).toBeGreaterThan(-1);
    expect(open.indexOf("<summary")).toBeGreaterThan(open.indexOf(LAST));
    expect(summaries(html)[0]).toContain(`aria-controls="${SAVED_TEXT_ID}"`);
  });

  it("R3: open, Tab order in the reading section matches the screen: the toggle, then the footer's other controls", async () => {
    const section = readingSection(visibleWhen(await render(true), "open"));

    expect(focusOrder(section)).toEqual(
      hasDateLink ? [`summary:${FOLD_LABEL}`, "a:Go to this date"] : [`summary:${FOLD_LABEL}`]
    );
  });

  it("R4: the footer note is there in both states", async () => {
    for (const [state, revealed] of [["folded", false], ["open", true]] as const) {
      const html = visibleWhen(await render(revealed), state);
      expect(html.slice(html.indexOf("</details>"))).toContain("Revealed on request from 10 positions and");
    }
  });

  it(
    hasDateLink
      ? "R4: /reading/[id] keeps its date-page link in the open footer, after the toggle, and hides it while folded"
      : "R6: the date page's open footer holds only the toggle and the note",
    async () => {
      const section = readingSection(visibleWhen(await render(true), "open"));
      const footer = section.slice(section.indexOf("<details"));

      if (hasDateLink) {
        expect(footer).toMatch(DATE_LINK);
        expect(visibleWhen(await render(false), "folded")).not.toMatch(DATE_LINK);
      } else {
        expect(focusOrder(footer)).toEqual([`summary:${FOLD_LABEL}`]);
      }
    }
  );

  it("R6: no copy-link control in either state", async () => {
    for (const revealed of [false, true]) {
      const html = await render(revealed);
      // A pattern rather than the literal label, so R6's grep of app/ for
      // the old label finds nothing, this test included.
      expect(html).not.toMatch(/copy[\s-]?link/i);
      expect(html).not.toMatch(/>copied</i);
    }
  });
});

describe("Sprint 56: the toggle's CSS", () => {
  const css = readFileSync(join(__dirname, "reading.module.css"), "utf8");
  const phone = css.slice(css.indexOf("@media (max-width: 900px)"));

  it("R1: one label at a time, by the details' own state", () => {
    expect(css).toMatch(/\.reveal\[open\] \.labelFolded,\s*\.reveal:not\(\[open\]\) \.labelOpen \{\s*display: none;/);
  });

  it("R2: folded hides the text and the open-only controls, keyed on the closed state", () => {
    expect(css).toMatch(
      /\.revealPanel:has\(\.reveal:not\(\[open\]\)\) \.revealText,\s*\.revealPanel:has\(\.reveal:not\(\[open\]\)\) \.revealControls \{\s*display: none;/
    );
  });

  it("R5: the footer row is what sticks on phones, in both states; nothing sticks the details any more", () => {
    expect(phone).toMatch(/\.readingFooter \{[^}]*position: sticky;[^}]*bottom: 0;/);
    expect(css).not.toMatch(/\.reveal[^{]*\{[^}]*position: sticky/);
  });

  it("R1: the button-styled span is a flex item of the summary, so it sizes like the unsaved <button>", () => {
    expect(css).toMatch(/\.revealSummary \{\s*display: flex;/);
  });

  it("R5: the toggle fills its share of the phone footer row, at .castButton's 44px minimum height", () => {
    expect(phone).toMatch(/\.castButton \{[^}]*min-height: 44px;/);
    expect(phone).toMatch(/\.castButton \{[^}]*flex: 1;/);
    expect(css).toMatch(/\.reveal \{\s*flex: 1;\s*min-width: 0;/);
  });

  it("R10: the form gets the section's own gap after the header, so open text and the idle block sit where they do outside a form", () => {
    expect(css).toMatch(/\.readingSection \{[^}]*--reading-gap: 20px;[^}]*gap: var\(--reading-gap\);/);
    expect(phone).toMatch(/\.readingSection \{[^}]*--reading-gap: 14px;/);
    expect(css).toMatch(
      /\.readingSection form \.idleBlock,\s*\.readingSection form \.revealText \{\s*margin-top: var\(--reading-gap\);\s*\}/
    );
  });

  it("R10: the idle block and the accuracy note no longer add top padding on top of that gap", () => {
    expect(css).toMatch(/\.idleBlock \{[^}]*padding: 0 0 4px;/);
    expect(css).toMatch(/\.accuracyNote \{[^}]*padding: 0 0 4px;/);
  });

  it("R6: the copy-link button's CSS is gone", () => {
    expect(css).not.toContain("mobileWrittenFooter");
    expect(css).not.toMatch(/revealFold\b|revealFolded/);
  });
});
