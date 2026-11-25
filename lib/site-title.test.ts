import { describe, expect, it } from "vitest";
import { SITE_TITLE, datedTitle } from "./site-title";

describe("datedTitle (Sprint 49, R1)", () => {
  it("is the site's name, one space, then the ISO date", () => {
    expect(datedTitle("1969-07-20")).toBe("Retroactive Horoscope 1969-07-20");
  });

  it("builds on the site's own name, which stays 'Retroactive Horoscope'", () => {
    expect(SITE_TITLE).toBe("Retroactive Horoscope");
    expect(datedTitle("2026-11-25")).toBe(`${SITE_TITLE} 2026-11-25`);
  });
});
