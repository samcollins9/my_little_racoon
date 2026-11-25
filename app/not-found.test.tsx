import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NotFound from "./not-found";

// Sprint 49, R4: the 404 page renders Next's built-in 404 markup without
// its <title>, so every 404 keeps the root layout's plain "Retroactive
// Horoscope". That the page looks the same as Next's own is checked against
// real builds in the handoff (byte-identical screenshots).

describe("app/not-found.tsx (Sprint 49, R4)", () => {
  const html = renderToStaticMarkup(<NotFound />);

  it("sets no title of its own", () => {
    expect(html).not.toContain("<title");
  });

  it("shows Next's 404 message", () => {
    expect(html).toContain('<h1 class="next-error-h1"');
    expect(html).toContain(">404</h1>");
    expect(html).toContain(">This page could not be found.</h2>");
  });
});
