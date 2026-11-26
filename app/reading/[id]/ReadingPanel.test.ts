import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IdleBlock, SAVED_TEXT_ID } from "./HoroscopeReveal";
import { ReadingPanel } from "./ReadingPanel";
import { DisabledReadingSection } from "./ReadingView";
import { summaries, visibleWhen } from "./reveal-test-support";

// Sprint 31, R3: the written state's link. Rendered on the server, the same
// way the page first reaches a visitor, with no form submission pending.
// createElement rather than JSX keeps this a plain .ts test like the rest
// of the suite.

type PanelProps = Parameters<typeof ReadingPanel>[0];

const BASE: Pick<PanelProps, "paragraphs" | "aspectCount" | "errorMessage" | "revealed"> = {
  paragraphs: ["The sky held its breath."],
  aspectCount: 7,
  errorMessage: null,
  revealed: false,
};

function render(props: PanelProps): string {
  return renderToStaticMarkup(createElement(ReadingPanel, props));
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
}

// R5's phrases, plus the label R3 retires.
const RETIRED_COPY = [/cast a new chart/i, /cast the chart/i, /save this reading/i, /see the full reading/i, /\bstep\b/i];

describe("ReadingPanel's written-state link (R3)", () => {
  it("/reading/[id]: links to the reading's own date page, one link for desktop and mobile (Sprint 56, R6)", () => {
    const html = render({ ...BASE, hasHoroscope: true, datePageHref: "/date/1969-07-20" });

    // Sprint 56 removed the mobile-only copy of this link, along with the
    // copy-link button it sat beside: one link now serves both widths.
    expect(hrefs(html)).toEqual(["/date/1969-07-20"]);
    expect(html).toContain("Go to this date");
  });

  it("/reading/[id]: carries no old-flow copy and no link to /chart", () => {
    const html = render({ ...BASE, hasHoroscope: true, datePageHref: "/date/1969-07-20" });

    expect(html).not.toContain("/chart");
    for (const phrase of RETIRED_COPY) expect(html).not.toMatch(phrase);
  });

  it("the date page (offerNewChart={false}): renders no link at all, as before", () => {
    const html = render({ ...BASE, hasHoroscope: true, offerNewChart: false });

    expect(hrefs(html)).toEqual([]);
    expect(html).not.toContain("Go to this date");
  });

  it("an unwritten reading offers the generate button and no link (R3; Sprint 33 renamed it)", () => {
    const html = render({ ...BASE, hasHoroscope: false, paragraphs: [], datePageHref: "/date/1969-07-20" });

    expect(html).toContain("Reveal the horoscope");
    expect(hrefs(html)).toEqual([]);
  });

  it("a failed generation still offers \"Try again\" in place of the link", () => {
    const html = render({
      ...BASE,
      hasHoroscope: true,
      errorMessage: "Couldn't write the horoscope.",
      datePageHref: "/date/1969-07-20",
    });

    expect(html).toContain("Try again");
    expect(hrefs(html)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Sprint 33: the reveal step. Every assertion is on the server-rendered HTML,
// which is also what a visitor with JavaScript disabled gets.

const SAVED_TEXT = "Mars leans on the door.";
const SAVED: PanelProps = {
  ...BASE,
  hasHoroscope: true,
  paragraphs: ["The sky held its breath.", SAVED_TEXT],
  offerNewChart: false,
};
const UNSAVED: PanelProps = { ...BASE, hasHoroscope: false, paragraphs: [], offerNewChart: false };

/** R1: no user-visible "write" wording survives in the panel. */
const RETIRED_WRITE_COPY = [/write the horoscope/i, /nothing has been written/i, /being written/i, /not written yet/i];
const IDLE_SENTENCE = "Nothing has been revealed about it yet";
const IDLE_HTML = renderToStaticMarkup(createElement(IdleBlock));

/**
 * The control's markup: any element whose class includes castButton, labelled
 * "Reveal the horoscope". Sprint 56: on a saved horoscope the label sits in
 * its own span inside the button-styled span (one per state), so that inner
 * span is optional here.
 */
const REVEAL_CONTROL =
  /<(button|span) [^>]*class="[^"]*castButton[^"]*"[^>]*>(?:<span [^>]*>)?Reveal the horoscope(?:<\/span>)?<\/\1>/;

/** The <details> element's opening tag, and everything inside it. */
function disclosure(html: string): { openTag: string; inner: string } | null {
  const match = html.match(/(<details[^>]*>)([\s\S]*)<\/details>/);
  return match ? { openTag: match[1], inner: match[2] } : null;
}

/** Sprint 56: what a sighted visitor sees before revealing (reveal-test-support.ts). */
const visibleWhileFolded = (html: string) => visibleWhen(html, "folded");

/** The saved paragraphs' block, by the id the toggle names in aria-controls. */
function savedTextBlock(html: string): string {
  const match = html.match(new RegExp(`<div id="${SAVED_TEXT_ID}"[^>]*>([\\s\\S]*?)</div>`));
  if (!match) throw new Error("saved text block not found");
  return match[1];
}

describe("Sprint 33: a saved horoscope opens folded (R2/R3)", () => {
  it("renders a native <details>, closed, with the reveal control as its summary", () => {
    const d = disclosure(render(SAVED));

    expect(d).not.toBeNull();
    expect(d!.openTag).not.toMatch(/\sopen/);
    expect(d!.inner).toMatch(/<summary[^>]*>[\s\S]*Reveal the horoscope[\s\S]*<\/summary>/);
  });

  it("keeps every saved paragraph in the HTML, before the toggle, hidden while folded (Sprint 56 moved it out of the details)", () => {
    const html = render(SAVED);
    const text = savedTextBlock(html);

    for (const paragraph of SAVED.paragraphs) expect(text).toContain(paragraph);
    // Before the toggle in the markup, and so in reading and focus order.
    expect(html.indexOf(SAVED_TEXT)).toBeLessThan(html.indexOf("<details"));
    // The details holds only its summary.
    expect(disclosure(html)!.inner).toMatch(/^<summary[\s\S]*<\/summary>$/);
    expect(visibleWhileFolded(html)).not.toContain(SAVED_TEXT);
  });

  it("shows R1's idle sentence and wording, and none of the old 'write' copy", () => {
    const html = render(SAVED);

    expect(html).toContain(IDLE_SENTENCE);
    expect(html).toContain("reveal the horoscope</span> when you want the sky held");
    expect(html).toContain("not revealed yet");
    for (const phrase of RETIRED_WRITE_COPY) expect(html).not.toMatch(phrase);
  });

  it("reveals in place: no submit button and no link to anywhere else on the date page", () => {
    const html = render(SAVED);

    expect(html).not.toContain('type="submit"');
    expect(hrefs(html)).toEqual([]);
  });

  it("the note sits beside the toggle, outside the summary, so it isn't part of the control's name (Sprint 56)", () => {
    const html = render(SAVED);
    const [summary] = summaries(html);

    expect(summary).not.toContain("Revealed on request");
    expect(html.slice(html.indexOf("</details>"))).toContain(
      ">Revealed on request from 10 positions and 7 aspects.</p>"
    );
    // One note element, readable: no aria-hidden duplicate any more.
    expect(html.match(/Revealed on request/g)).toHaveLength(1);
    expect(html).not.toContain("aria-hidden");
  });

  it("the same toggle carries the fold-back label, shown once open, and names the text it controls", () => {
    const [summary] = summaries(render(SAVED));

    expect(summary).toContain(">Fold the horoscope away<");
    expect(summary).toContain(`aria-controls="${SAVED_TEXT_ID}"`);
  });
});

describe("Sprint 33: the landing after a successful generation (R4)", () => {
  it("revealed: the same disclosure, already open, with the text shown", () => {
    const html = render({ ...SAVED, revealed: true });

    expect(disclosure(html)!.openTag).toMatch(/\sopen=""/);
    expect(visibleWhen(html, "open")).toContain(SAVED_TEXT);
  });

  it("revealed on a reading with no horoscope: just the folded generate state, nothing to open", () => {
    const html = render({ ...UNSAVED, revealed: true });

    expect(html).not.toContain("<details");
    expect(html).toMatch(REVEAL_CONTROL);
    expect(html).toContain(IDLE_SENTENCE);
  });
});

describe("Sprint 33: no saved horoscope, generation enabled (R1/R2/R4)", () => {
  it("shows the idle sentence and a submit button labelled \"Reveal the horoscope\"", () => {
    const html = render(UNSAVED);

    expect(html).toMatch(/<button type="submit"[^>]*>Reveal the horoscope<\/button>/);
    expect(html).toContain(IDLE_SENTENCE);
    expect(html).toContain("not revealed yet");
    expect(html).not.toContain("<details");
    for (const phrase of RETIRED_WRITE_COPY) expect(html).not.toMatch(phrase);
  });

  it("folded, it can't be told apart from a saved horoscope: same idle block, status, control label and classes, same note", () => {
    const saved = visibleWhileFolded(render(SAVED));
    const unsaved = render(UNSAVED);

    for (const html of [saved, unsaved]) {
      expect(html).toContain(IDLE_HTML);
      expect(html).toContain("not revealed yet");
      expect(html).toMatch(REVEAL_CONTROL);
      expect(html).toContain("Revealed on request from 10 positions and 7 aspects.");
    }
    // The same classes on the control, whichever element carries them.
    const controlClass = (html: string) => html.match(REVEAL_CONTROL)![0].match(/class="([^"]*)"/)![1];
    expect(controlClass(saved)).toBe(controlClass(unsaved));
  });
});

describe("Sprint 33: a failed generation (R4)", () => {
  it("no saved horoscope: the error and \"Try again\", folded idle state", () => {
    const html = render({ ...UNSAVED, errorMessage: "Horoscope generation failed, try again." });

    expect(html).toMatch(/<button type="submit"[^>]*>Try again<\/button>/);
    expect(html).toContain("Horoscope generation failed, try again.");
    expect(html).toContain(IDLE_SENTENCE);
    expect(html).not.toContain("<details");
  });

  it("with a saved horoscope: the text stays folded, and \"Try again\" sits in its unfolded footer, after the toggle", () => {
    const html = render({ ...SAVED, errorMessage: "Horoscope generation failed, try again." });
    const tryAgain = /<button type="submit"[^>]*>Try again<\/button>/;

    expect(disclosure(html)!.openTag).not.toMatch(/\sopen/);
    expect(visibleWhileFolded(html)).not.toMatch(tryAgain);
    expect(visibleWhileFolded(html)).not.toContain(SAVED_TEXT);

    const open = visibleWhen(html, "open");
    expect(open).toMatch(tryAgain);
    expect(open.search(tryAgain)).toBeGreaterThan(open.indexOf("</details>"));
    expect(open).toContain("Horoscope generation failed, try again.");
  });
});

describe("Sprint 33: generation disabled (R5)", () => {
  function renderDisabled(horoscope: string | null, revealed = false): string {
    return renderToStaticMarkup(createElement(DisabledReadingSection, { horoscope, revealed }));
  }

  it("no saved horoscope: the idle block and the disabled note, with no reveal control and no form", () => {
    const html = renderDisabled(null);

    expect(html).toContain(IDLE_SENTENCE);
    expect(html).toContain("Horoscope generation is currently disabled.");
    expect(html).not.toContain("Reveal the horoscope</");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
  });

  it("a saved horoscope: the reveal works, folded, with no generate button and no form", () => {
    const html = renderDisabled(`The sky held its breath.\n${SAVED_TEXT}`);
    const d = disclosure(html)!;

    expect(d.openTag).not.toMatch(/\sopen/);
    expect(visibleWhileFolded(html)).toMatch(REVEAL_CONTROL);
    expect(savedTextBlock(html)).toContain(SAVED_TEXT);
    expect(visibleWhileFolded(html)).not.toContain(SAVED_TEXT);
    // Sprint 56: the disabled note is the footer row's note, beside the toggle, in both states.
    expect(html.slice(html.indexOf("</details>"))).toContain("Horoscope generation is currently disabled.");
    expect(html).toContain("Horoscope generation is currently disabled.");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
  });

  it("a saved horoscope on the landing-revealed URL opens; with none it has nothing to open", () => {
    expect(disclosure(renderDisabled(SAVED_TEXT, true))!.openTag).toMatch(/\sopen=""/);
    expect(renderDisabled(null, true)).not.toContain("<details");
  });
});
