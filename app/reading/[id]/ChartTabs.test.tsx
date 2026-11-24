import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { AspectsPanel, NO_ASPECTS_TEXT } from "./ChartKeyTables";
import { ChartTabs, ChartTabsView, INITIAL_TAB_INDEX, nextTabIndex, type ChartTab } from "./ChartTabs";
import { TAGLINES } from "../../../lib/banner/taglines";
import { ReadingView } from "./ReadingView";

// Sprint 37, R1/R2/R9: the chart panel's tabs.
//
// The project has no DOM test environment (no jsdom, no Testing Library), and
// adding one is a dependency this sprint doesn't need. So the tab component
// is split where it can be tested without one:
// - ChartTabsView: the markup for both renderings, rendered directly here;
// - nextTabIndex: everything the keyboard handler decides;
// - ChartTabs itself: its server render, which is exactly what a browser
//   without JavaScript keeps.
// LiveQA's keyboard and screen-reader steps cover the wiring in a real browser.

const TABS: ChartTab[] = [
  { id: "chart", label: "Chart", content: <p>chart figure</p> },
  { id: "planets", label: "Planets", content: <p>planets table</p> },
  { id: "signs", label: "Signs", content: <p>signs table</p> },
  { id: "aspects", label: "Aspects", content: <p>aspects table</p> },
];

const view = (enhanced: boolean, selected = INITIAL_TAB_INDEX) =>
  renderToStaticMarkup(
    <ChartTabsView tabs={TABS} label="Chart views" enhanced={enhanced} selected={selected} idBase="t" />
  );

/** Each <section> panel's opening tag, keyed by its data-tab. */
function panelTags(html: string): Record<string, string> {
  return Object.fromEntries(
    [...html.matchAll(/<section[^>]*data-tab="([^"]+)"[^>]*>/g)].map((m) => [m[1], m[0]])
  );
}

describe("the server render: what a browser without JavaScript keeps (R2)", () => {
  it("ChartTabs renders every section stacked, each under a visible heading, nothing hidden", () => {
    const html = renderToStaticMarkup(<ChartTabs tabs={TABS} label="Chart views" />);

    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("hidden");
    for (const tab of TABS) {
      const content = renderToStaticMarkup(<>{tab.content}</>);
      expect(html).toMatch(new RegExp(`<h2 [^>]*>${tab.label}</h2>${content}`));
    }
    expect(Object.keys(panelTags(html))).toEqual(["chart", "planets", "signs", "aspects"]);
  });

  it("each stacked section is labelled by its own heading", () => {
    const panels = panelTags(view(false));

    expect(panels.planets).toContain('aria-labelledby="t-heading-planets"');
    expect(panels.planets).not.toContain("role=");
  });
});

describe("once hydrated: the WAI-ARIA tabs pattern (R2)", () => {
  it("Chart is selected first (R1)", () => {
    expect(INITIAL_TAB_INDEX).toBe(0);
    expect(TABS[INITIAL_TAB_INDEX].id).toBe("chart");
    expect(view(true)).toMatch(/<button[^>]*id="t-tab-chart"[^>]*aria-selected="true"/);
  });

  it("a named tablist of four tabs, in order, wired to their panels", () => {
    const html = view(true);

    expect(html).toContain('<div role="tablist" aria-label="Chart views"');
    const buttons = [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)];
    expect(buttons.map((m) => m[1])).toEqual(["Chart", "Planets", "Signs", "Aspects"]);
    for (const [tag] of buttons) {
      expect(tag).toContain('role="tab"');
      expect(tag).toContain('type="button"');
    }
    expect(buttons[1][0]).toContain('aria-controls="t-panel-planets"');
    expect(buttons[1][0]).toContain('aria-selected="false"');

    const panels = panelTags(html);
    expect(panels.planets).toContain('role="tabpanel"');
    expect(panels.planets).toContain('id="t-panel-planets"');
    expect(panels.planets).toContain('aria-labelledby="t-tab-planets"');
  });

  it("only the selected panel is visible, and only the selected tab is in the tab order", () => {
    const html = view(true, 2);
    const panels = panelTags(html);

    expect(panels.signs).not.toMatch(/\shidden/);
    for (const id of ["chart", "planets", "aspects"]) expect(panels[id]).toMatch(/\shidden/);
    expect([...html.matchAll(/<button[^>]*tabindex="(-?\d)"/g)].map((m) => m[1])).toEqual(["-1", "-1", "0", "-1"]);
  });

  it("the stacked headings are hidden once the tabs name the panels", () => {
    expect(view(true).match(/<h2 [^>]*>/g)!.every((tag) => /\shidden/.test(tag))).toBe(true);
  });
});

describe("nextTabIndex: the keyboard (R2)", () => {
  it("Right and Left move one tab, wrapping at either end", () => {
    expect(nextTabIndex("ArrowRight", 0, 4)).toBe(1);
    expect(nextTabIndex("ArrowRight", 3, 4)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 2, 4)).toBe(1);
    expect(nextTabIndex("ArrowLeft", 0, 4)).toBe(3);
  });

  it("Home and End go to the first and last tab", () => {
    expect(nextTabIndex("Home", 2, 4)).toBe(0);
    expect(nextTabIndex("End", 1, 4)).toBe(3);
  });

  it("any other key leaves the selection alone", () => {
    for (const key of ["ArrowUp", "ArrowDown", "Enter", " ", "Tab", "a"]) {
      expect(nextTabIndex(key, 1, 4)).toBeNull();
    }
  });
});

describe("the reading view's chart panel (R1/R2/R5)", () => {
  const DATE = "1969-07-20";
  const html = renderToStaticMarkup(
    <ReadingView
      eventDate={DATE}
      positions={computePositions(calculationInstantForDate(DATE))}
      events={null}
      tagline={TAGLINES[0]}
    >
      {null}
    </ReadingView>
  );

  it("the server HTML holds all four sections' content: both charts and the three tables", () => {
    const panels = panelTags(html);
    const panelBody = (id: string) => html.slice(html.indexOf(panels[id]), html.indexOf("</section>", html.indexOf(panels[id])));

    expect(Object.keys(panels)).toEqual(["chart", "planets", "signs", "aspects"]);
    expect(panelBody("chart")).toContain('viewBox="0 0 640 640"');
    expect(panelBody("chart")).toContain('viewBox="110 110 420 420"');
    expect(panelBody("planets")).toContain("<caption");
    expect(panelBody("planets").match(/<tr>/g)).toHaveLength(11); // header + 10 bodies
    expect(panelBody("signs").match(/<tr[ >]/g)).toHaveLength(13); // header + 12 signs
    expect(panelBody("aspects")).toContain("Line key");
  });

  it("the balance panel sits after the tabbed panel, outside it", () => {
    const tabsEnd = html.lastIndexOf("</section>", html.indexOf("Elements"));
    const aspectsPanel = html.indexOf('data-tab="aspects"');

    expect(aspectsPanel).toBeGreaterThan(-1);
    expect(tabsEnd).toBeGreaterThan(aspectsPanel);
    expect(html.indexOf("Elements")).toBeGreaterThan(tabsEnd);
  });

  it("the aspects tab shows a plain line, not an empty table, for a chart with no aspects", () => {
    const empty = renderToStaticMarkup(<AspectsPanel aspects={[]} />);

    expect(empty).toContain(NO_ASPECTS_TEXT);
    expect(empty.match(/<table/g)).toHaveLength(1); // the line key only
  });
});
