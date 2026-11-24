import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TAGLINES } from "../../lib/banner/taglines";
import { HOME_LINK_LABEL, PORTRAIT_SRC, SiteBanner } from "./SiteBanner";

// Sprint 43: the banner's markup, rendered on the server the way a visitor's
// first request receives it, and its styles. The design record and the
// portrait's bytes are checked in lib/banner/design-record.test.ts, outside
// app/, so that a grep of app/ for the design file finds nothing (R1).

const ROOT = join(__dirname, "..", "..");
/**
 * React 19 emits a preload <link> for an eager image ahead of the element;
 * on a real page it's hoisted into <head>. Dropped here so the assertions
 * read the banner itself.
 */
const render = (tagline: string | null) =>
  renderToStaticMarkup(<SiteBanner tagline={tagline} />).replace(/^<link rel="preload" as="image"[^>]*\/>/, "");

/** Every <a> to `/`, and the ones a keyboard can reach. */
function homeLinks(html: string) {
  const all = [...html.matchAll(/<a [^>]*href="\/"[^>]*>/g)].map((m) => m[0]);
  return { all, focusable: all.filter((tag) => !/tabindex="-1"/i.test(tag)) };
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("SiteBanner markup (Sprint 43)", () => {
  const tagline = TAGLINES[7]; // the longest, R9's case
  const html = render(tagline);

  it("R2: is a <header>", () => {
    expect(html.startsWith("<header")).toBe(true);
    expect(html.endsWith("</header>")).toBe(true);
  });

  it("R3: exactly one focusable link to /, and its name includes \"Ask Reloy\"", () => {
    const { all, focusable } = homeLinks(html);
    expect(all).toHaveLength(2); // the portrait and the wordmark, as in 0a
    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toContain(`aria-label="${HOME_LINK_LABEL}"`);
    expect(HOME_LINK_LABEL).toContain("Ask Reloy");
  });

  it("R3: the portrait's link is out of the tab order and hidden from assistive technology", () => {
    const portraitLink = homeLinks(html).all.find((tag) => /tabindex="-1"/.test(tag));
    expect(portraitLink).toContain('aria-hidden="true"');
  });

  it("R3: the wordmark reads \"Ask Reloy\", with Reloy in its own span", () => {
    expect(html).toMatch(/>Ask <span[^>]*>Reloy<\/span><\/a>/);
  });

  it("R4: the portrait is the public/ PNG at 133x138, unoptimized, with empty alt", () => {
    const img = html.match(/<img [^>]*>/)?.[0] ?? "";
    expect(img).toContain(`src="${PORTRAIT_SRC}"`);
    expect(img).toContain('width="133"');
    expect(img).toContain('height="138"');
    expect(img).toContain('alt=""');
    expect(img).not.toContain("srcset"); // not routed through the optimizer
    expect(img).not.toContain("/_next/image");
  });

  it("R8: renders the tagline it's given, as plain text", () => {
    expect(html).toContain(`<p class="`);
    expect(html).toContain(`>${tagline}</p>`);
  });

  it("R9: nothing in the banner is a live region", () => {
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain('role="status"');
  });

  it("R10: no nav, no buttons, no tagline counter", () => {
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<button");
    expect(html).not.toMatch(/\d+ \/ 19/);
    for (const label of ["New chart", "Readings", "About", "/chart", "/readings", "/about"]) {
      expect(html).not.toContain(label);
    }
  });

  it("a null tagline (the error boundary) renders the banner with no tagline line", () => {
    const bare = render(null);
    expect(bare).not.toContain("<p");
    expect(homeLinks(bare).focusable).toHaveLength(1);
    for (const t of TAGLINES) expect(bare).not.toContain(t);
  });
});

describe("the banner's styles (Sprint 43, R4/R6/R9)", () => {
  const css = readFileSync(join(__dirname, "site-banner.module.css"), "utf8");

  it("R4: the portrait is pixelated, at whole-number pixel sizes only", () => {
    expect(css).toContain("image-rendering: pixelated");
    expect(css).not.toMatch(/\d\.\d+px/);
    expect(css).toMatch(/\.portrait \{[^}]*width: 133px;[^}]*height: 138px;/);
  });

  it("R6: phones crop the portrait to 0e's 92px window and drop the tagline", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 900px)"));
    expect(phone).toMatch(/\.portraitLink \{[^}]*height: 92px;[^}]*overflow: hidden;[^}]*margin-left: -24px;/);
    expect(phone).toMatch(/\.portrait \{[^}]*margin-top: -46px;/);
    expect(phone).toMatch(/\.wordmark \{[^}]*font-size: 32px;/);
    expect(phone).toMatch(/\.tagline \{[^}]*display: none;/);
  });

  it("R6: the banner is never sticky or fixed", () => {
    expect(css).not.toMatch(/position:\s*(sticky|fixed)/);
  });

  it("R9: the tagline box has no fixed height and doesn't clip", () => {
    const tagline = css.match(/\n\.tagline \{[^}]*\}/)?.[0] ?? "";
    expect(tagline).toContain("min-height: 46px");
    expect(tagline).not.toMatch(/[^-]height:/);
    expect(tagline).not.toMatch(/overflow|text-overflow|line-clamp/);
  });
});

describe("no random choice on the client (Sprint 43, R8)", () => {
  it("no \"use client\" file in app/ calls Math.random or crypto randomness", () => {
    for (const file of filesUnder(join(ROOT, "app"))) {
      if (!/\.(t|j)sx?$/.test(file) || /\.test\./.test(file)) continue;
      const source = readFileSync(file, "utf8");
      if (!/^\s*["']use client["']/.test(source)) continue;
      expect(source, relative(ROOT, file)).not.toMatch(/Math\.random|getRandomValues|randomUUID/);
    }
  });

  it("the banner component itself makes no random choice and isn't a client component", () => {
    const source = readFileSync(join(__dirname, "SiteBanner.tsx"), "utf8");
    expect(source).not.toMatch(/Math\.random|getRandomValues|randomUUID/);
    expect(source).not.toMatch(/^\s*["']use client["']/);
  });
});
